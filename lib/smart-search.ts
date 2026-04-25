import { getFundCompareCandidates, getStockCompareCandidates } from "@/lib/asset-insights";
import {
  getCanonicalFundCompareHref,
  getCanonicalStockCompareHref,
  getPreferredFundShowcaseRoutes,
  getPreferredStockShowcaseRoutes,
  getRankedFundCompareCandidates,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import { getFunds, getIpos, getStocks } from "@/lib/content";
import { getIndexSnapshot } from "@/lib/index-content";
import { getFundTruthLabel, getStockTruthLabel } from "@/lib/market-truth";
import { filterEntriesToPublishableCms } from "@/lib/publishable-content";
import { buildSearchEntryPresentation } from "@/lib/search-entry-presentation";
import {
  getSearchEnginePublicState,
  getSearchEngineStatus,
  searchCatalogIndex,
} from "@/lib/search-engine/meilisearch";
import { searchCatalogLocally } from "@/lib/search-engine/local-catalog-search";
import { getCompareIntentEntry, getDirectIntentEntries } from "@/lib/search-intent";
import { buildScreenerQueryPrefill } from "@/lib/screener-search";
import { wealthFamilyMeta, wealthProducts } from "@/lib/wealth-products";

export type SmartSearchResult = {
  title: string;
  href: string;
  category: string;
  reason: string;
  context: string;
  truthLabel?: string;
};

export type SmartSearchResultGroup = {
  title: string;
  description: string;
  items: SmartSearchResult[];
};

export type SmartSearchAction = {
  title: string;
  summary: string;
  href: string;
  label: string;
  tag?: string;
};

export type SmartSearchFocusCard = {
  eyebrow: string;
  title: string;
  summary: string;
  href: string;
  hrefLabel: string;
  highlights: Array<{ label: string; value: string }>;
};

export type SmartSearchExperience = {
  results: SmartSearchResult[];
  groups: SmartSearchResultGroup[];
  actions: SmartSearchAction[];
  focusCard: SmartSearchFocusCard | null;
  engine: {
    available: boolean;
    degraded?: boolean;
    statusLabel: string;
    detail: string;
  };
};

export const suggestedQueries = [
  "tata motors chart and fundamentals",
  "best mid cap fund to compare",
  "hero fincorp ipo allotment and gmp",
  "position size calculator for ₹2 lakh capital",
  "what is open interest",
];

export function sanitizeSearchQuery(query: string) {
  return query
    .replace(/[<>]/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFundCategoryTitle(category: string) {
  return /funds?$/i.test(category) ? category : `${category} funds`;
}

function uniqueByHref<T extends { href: string }>(entries: readonly T[]) {
  return entries.filter((entry, index, allEntries) => allEntries.findIndex((item) => item.href === entry.href) === index);
}

function buildGroups(results: SmartSearchResult[]) {
  const groupedEntries: SmartSearchResultGroup[] = [
    {
      title: "Decision routes",
      description: "The fastest ways to move from query to action when chart or compare intent is already clear.",
      items: results.filter((item) => ["Chart", "Compare", "Fund Compare"].includes(item.category)).slice(0, 4),
    },
    {
      title: "Matched assets",
      description: "Canonical stock, fund, IPO, wealth-product, sector, and index routes that best match the asset or theme in your query.",
      items: results
        .filter((item) => ["Stock", "Mutual Fund", "IPO", "ETF", "PMS", "AIF", "SIF", "Sector", "Fund Category", "Index"].includes(item.category))
        .slice(0, 6),
    },
    {
      title: "Workflows and learning",
      description: "Tools, workflow pages, hubs, and explainers that support the next step after the first asset click.",
      items: results
        .filter((item) => ["Workflow", "Tool", "Hub", "Learn", "Course"].includes(item.category))
        .slice(0, 6),
    },
  ];

  return groupedEntries.filter((group) => group.items.length > 0);
}

function buildScreenerHref(prefill: ReturnType<typeof buildScreenerQueryPrefill>) {
  const params = new URLSearchParams();

  if (prefill.searchTerm) {
    params.set("query", prefill.searchTerm);
  }

  if (prefill.sectorFilter) {
    params.set("sector", prefill.sectorFilter);
  }

  if (prefill.truthFilter) {
    params.set("truth", prefill.truthFilter);
  }

  if (prefill.compareOnly) {
    params.set("compare", "1");
  }

  if (prefill.suggestedStack) {
    params.set("stack", prefill.suggestedStack);
  }

  if (prefill.metricGroup !== "route-backed-fundamentals") {
    params.set("metric", prefill.metricGroup);
  }

  if (prefill.sortBy !== "Market cap") {
    params.set("sort", prefill.sortBy);
  }

  const serialized = params.toString();
  return serialized ? `/screener?${serialized}` : "/screener";
}

export async function getSmartSearchResults(query: string): Promise<SmartSearchExperience> {
  const normalized = sanitizeSearchQuery(query).toLowerCase();

  try {
    const searchEngineStatus = await getSearchEngineStatus();
    const liveEngine = getSearchEnginePublicState(searchEngineStatus);
    let engine = liveEngine.available
      ? {
          ...liveEngine,
          degraded: false,
        }
      : {
          available: true,
          degraded: true,
          statusLabel: "Local search fallback",
          detail: "Search is using the route-backed local catalog while the live engine recovers.",
        };

    if (!normalized) {
      return {
        results: [],
        groups: [],
        actions: [],
        focusCard: null,
        engine,
      };
    }

    const [stocks, ipos, funds] = await Promise.all([getStocks(), getIpos(), getFunds()]);

    const rawDirectIntentEntries = getDirectIntentEntries(normalized, { stocks, funds, ipos });
    const rawCompareIntentEntry = getCompareIntentEntry(normalized, { stocks, funds });
    const screenerPrefill = buildScreenerQueryPrefill(normalized);
    let indexedEntries = liveEngine.available
      ? await searchCatalogIndex(normalized, 12)
      : {
          configured: searchEngineStatus.configured,
          available: true,
          reason: null,
          hits: await searchCatalogLocally(normalized, 12),
        };

    if (liveEngine.available && !indexedEntries.available) {
      indexedEntries = {
        configured: searchEngineStatus.configured,
        available: true,
        reason: indexedEntries.reason,
        hits: await searchCatalogLocally(normalized, 12),
      };
      engine = {
        available: true,
        degraded: true,
        statusLabel: "Local search fallback",
        detail: "Search is using the route-backed local catalog while the live engine recovers.",
      };
    }
  const [directIntentEntries, compareIntentEntries, publishableIndexedEntries] =
    await Promise.all([
      filterEntriesToPublishableCms(rawDirectIntentEntries),
      rawCompareIntentEntry
        ? filterEntriesToPublishableCms([rawCompareIntentEntry])
        : Promise.resolve([]),
      indexedEntries.available
        ? filterEntriesToPublishableCms(indexedEntries.hits)
        : Promise.resolve([]),
    ]);
  const compareIntentEntry = compareIntentEntries[0] ?? null;
  const rankedEntries = indexedEntries.available
    ? publishableIndexedEntries.map((entry) => ({
        entry,
        score: 0,
        matchedTerms: [] as string[],
      }))
    : [];
  const combinedEntries = [
    ...directIntentEntries,
    ...(compareIntentEntry ? [compareIntentEntry] : []),
    ...rankedEntries.map((item) => item.entry),
  ].filter((entry, index, allEntries) => allEntries.findIndex((item) => item.href === entry.href) === index);

  const results = combinedEntries.slice(0, 12).map<SmartSearchResult>((entry, index) => {
    const rankedMatch = rankedEntries.find((item) => item.entry.href === entry.href);
    const matchedTerms = rankedMatch?.matchedTerms ?? [];
    const isDirectIntent = directIntentEntries.some((item) => item.href === entry.href);

    return {
      ...buildSearchEntryPresentation(entry, {
        stocks,
        funds,
        ipos,
      }),
      title: entry.title,
      href: entry.href,
      category: entry.category,
      reason:
        isDirectIntent
          ? `Matched ${entry.reasonBase} before the broader ranked catalog.`
          : index === 0 && compareIntentEntry?.href === entry.href
          ? `Matched ${entry.reasonBase} from your compare-style query.`
          : matchedTerms.length
          ? `Matched ${entry.reasonBase} via ${matchedTerms.join(", ")}.`
          : indexedEntries.available
          ? `Matched ${entry.reasonBase} through the Meilisearch-backed index.`
          : `Matched ${entry.reasonBase} for "${query}".`,
    };
  });

  const directStockEntry = directIntentEntries.find(
    (entry) => entry.category === "Stock" && entry.href.startsWith("/stocks/") && !entry.href.endsWith("/chart"),
  );
  const directFundEntry = directIntentEntries.find((entry) => entry.category === "Mutual Fund");
  const directWealthEntry = directIntentEntries.find((entry) => ["ETF", "PMS", "AIF", "SIF"].includes(entry.category));
  const directSectorEntry = directIntentEntries.find((entry) => entry.category === "Sector");
  const directFundCategoryEntry = directIntentEntries.find((entry) => entry.category === "Fund Category");
  const directWealthFamilyEntry = directIntentEntries.find((entry) => entry.category === "Hub" && ["/etfs", "/pms", "/aif", "/sif"].includes(entry.href));
  const directIndexEntry = directIntentEntries.find((entry) => entry.category === "Index");
  const matchedStock = directStockEntry
    ? stocks.find((stock) => directStockEntry.href === `/stocks/${stock.slug}`) ?? null
    : null;
  const matchedFund = directFundEntry ? funds.find((fund) => directFundEntry.href === `/mutual-funds/${fund.slug}`) ?? null : null;
  const matchedWealthProduct = directWealthEntry
    ? wealthProducts.find((product) => `${wealthFamilyMeta[product.family].href}/${product.slug}` === directWealthEntry.href) ?? null
    : null;
  const matchedSectorName = directSectorEntry?.title.replace(/\s+sector$/i, "") ?? null;
  const matchedSectorStocks = matchedSectorName ? stocks.filter((stock) => stock.sector === matchedSectorName) : [];
  const matchedFundCategoryName = directFundCategoryEntry?.title.replace(/\s+funds$/i, "") ?? null;
  const matchedCategoryFunds = matchedFundCategoryName
    ? funds.filter((fund) => fund.category === matchedFundCategoryName)
    : [];
  const matchedWealthFamily = directWealthFamilyEntry
    ? (Object.keys(wealthFamilyMeta).find((family) => wealthFamilyMeta[family as keyof typeof wealthFamilyMeta].href === directWealthFamilyEntry.href) as
        | keyof typeof wealthFamilyMeta
        | undefined)
    : undefined;
  const matchedWealthFamilyProducts = matchedWealthFamily
    ? wealthProducts.filter((product) => product.family === matchedWealthFamily)
    : [];
  const matchedIndexSlug = directIndexEntry?.href.replace(/^\//, "") as
    | "nifty50"
    | "banknifty"
    | "finnifty"
    | "sensex"
    | undefined;

  const [stockCompareCandidates, fundCompareCandidates, matchedIndexSnapshot] = await Promise.all([
    matchedStock ? getStockCompareCandidates(matchedStock.slug, { limit: 1 }) : Promise.resolve([]),
    matchedFund ? getFundCompareCandidates(matchedFund.slug, { limit: 1 }) : Promise.resolve([]),
    matchedIndexSlug ? getIndexSnapshot(matchedIndexSlug) : Promise.resolve(null),
  ]);
  const stockCompareCandidate = stockCompareCandidates[0] ?? null;
  const fundCompareCandidate = fundCompareCandidates[0] ?? null;
  const sectorLeadStock = getPreferredStockShowcaseRoutes(matchedSectorStocks, 1)[0] ?? null;
  const sectorComparePair =
    sectorLeadStock && matchedSectorStocks.length > 1
      ? getRankedStockCompareCandidates(matchedSectorStocks, sectorLeadStock.slug, { limit: 1 })[0] ?? null
      : null;
  const categoryLeadFund = getPreferredFundShowcaseRoutes(matchedCategoryFunds, 1)[0] ?? null;
  const categoryComparePair =
    categoryLeadFund && matchedCategoryFunds.length > 1
      ? getRankedFundCompareCandidates(matchedCategoryFunds, categoryLeadFund.slug, { limit: 1 })[0] ?? null
      : null;
  const screenerFocusEligible =
    screenerPrefill.intents.some((intent) =>
      intent.kind === "metric" || intent.kind === "truth" || intent.kind === "workflow" || intent.kind === "pending",
    ) &&
    !matchedStock &&
    !matchedFund &&
    !matchedWealthProduct &&
    !matchedWealthFamily &&
    !matchedIndexSnapshot &&
    !compareIntentEntry;
  const screenerHref = buildScreenerHref(screenerPrefill);

  const focusCard = compareIntentEntry
    ? {
        eyebrow: "Matched compare route",
        title: compareIntentEntry.title,
        summary:
          "The query already reads like a side-by-side decision request, so the compare route should lead before single-asset or hub handoffs.",
        href: compareIntentEntry.href,
        hrefLabel: "Open compare route",
        highlights: [
          { label: "Route type", value: compareIntentEntry.category },
          { label: "Search mode", value: "Explicit compare intent" },
          { label: "Decision posture", value: "Head-to-head route first" },
          {
            label: "Next move",
            value:
              compareIntentEntry.category === "Fund Compare"
                ? "Cost, risk, and overlap review"
                : "Quality, leverage, and quote review",
          },
        ],
      }
    : matchedStock
    ? {
        eyebrow: "Matched stock",
        title: matchedStock.name,
        summary:
          "This query clearly maps to a stock route, so the strongest next step is usually the detail page, chart page, or a compare route with the closest peer.",
        href: `/stocks/${matchedStock.slug}`,
        hrefLabel: "Open stock route",
        highlights: [
          { label: "Symbol", value: matchedStock.symbol },
          { label: "Sector", value: matchedStock.sector },
          { label: "Snapshot", value: `${matchedStock.price} • ${matchedStock.change}` },
          {
            label: "Truth state",
            value: getStockTruthLabel(matchedStock),
          },
        ],
      }
    : matchedFund
      ? {
          eyebrow: "Matched mutual fund",
          title: matchedFund.name,
          summary:
            "This query maps cleanly to a fund route, so the best follow-up is usually the main fund page plus a compare route or category lens.",
          href: `/mutual-funds/${matchedFund.slug}`,
          hrefLabel: "Open fund route",
        highlights: [
          { label: "Category", value: matchedFund.category },
          { label: "NAV", value: matchedFund.nav },
          { label: "1Y return", value: matchedFund.returns1Y },
          {
            label: "Truth state",
            value: getFundTruthLabel(matchedFund),
          },
        ],
      }
      : matchedWealthProduct
        ? {
            eyebrow: "Matched wealth product",
            title: matchedWealthProduct.name,
            summary:
              "This query maps to a specific wealth-product route, so the best next move is the detail page before broader family browsing or adjacent compare lanes.",
            href: `${wealthFamilyMeta[matchedWealthProduct.family].href}/${matchedWealthProduct.slug}`,
            hrefLabel: "Open product route",
            highlights: [
              { label: "Family", value: wealthFamilyMeta[matchedWealthProduct.family].label },
              { label: "Category", value: matchedWealthProduct.category },
              { label: "Benchmark", value: matchedWealthProduct.benchmark },
              { label: "Ticket", value: matchedWealthProduct.minimumTicket },
            ],
          }
      : screenerFocusEligible
        ? {
            eyebrow: "Matched screener workflow",
            title: "Route-backed stock screener",
            summary: screenerPrefill.summary,
            href: screenerHref,
            hrefLabel: "Open screener",
            highlights: [
              { label: "Intent count", value: `${screenerPrefill.intents.length} detected` },
              { label: "Sector filter", value: screenerPrefill.sectorFilter ?? "All sectors" },
              { label: "Truth filter", value: screenerPrefill.truthFilter ?? "All truth states" },
              { label: "Compare mode", value: screenerPrefill.compareOnly ? "Compare-ready only" : "All routed names" },
            ],
          }
        : matchedWealthFamily
          ? {
              eyebrow: "Matched wealth family",
              title: wealthFamilyMeta[matchedWealthFamily].label,
              summary:
                "This query reads more like a product-family exploration, so the family hub should lead before one isolated product route takes over the session.",
              href: wealthFamilyMeta[matchedWealthFamily].href,
              hrefLabel: "Open family hub",
              highlights: [
                { label: "Coverage", value: `${matchedWealthFamilyProducts.length} product routes` },
                { label: "Family role", value: wealthFamilyMeta[matchedWealthFamily].status },
                { label: "Lead route", value: matchedWealthFamilyProducts[0]?.name ?? "Family hub first" },
                { label: "Search posture", value: "Wealth discovery mode" },
              ],
            }
        : matchedSectorName
        ? {
            eyebrow: "Matched sector",
            title: `${matchedSectorName} sector`,
            summary:
              "This query reads like a thematic stock search, so the sector hub should lead before individual detail routes, compare work, or broader screener loops.",
            href: directSectorEntry?.href ?? `/sectors/${slugify(matchedSectorName)}`,
            hrefLabel: "Open sector hub",
            highlights: [
              { label: "Coverage", value: `${matchedSectorStocks.length} stock routes` },
              { label: "Lead route", value: sectorLeadStock?.name ?? "Sector hub first" },
              { label: "First compare", value: sectorComparePair ? `${sectorLeadStock?.name} vs ${sectorComparePair.name}` : "Pending second peer" },
              { label: "Search posture", value: "Theme-first stock discovery" },
            ],
          }
        : matchedFundCategoryName
          ? {
            eyebrow: "Matched fund category",
              title: formatFundCategoryTitle(matchedFundCategoryName),
              summary:
                "This query maps more cleanly to a fund-category shortlist than to one product, so the category hub should stay ahead of single-fund clicks.",
              href: directFundCategoryEntry?.href ?? `/fund-categories/${slugify(matchedFundCategoryName)}`,
              hrefLabel: "Open category hub",
              highlights: [
                { label: "Coverage", value: `${matchedCategoryFunds.length} fund routes` },
                { label: "Lead route", value: categoryLeadFund?.name ?? "Category hub first" },
                { label: "First compare", value: categoryComparePair ? `${categoryLeadFund?.name} vs ${categoryComparePair.name}` : "Pending second peer" },
                { label: "Search posture", value: "Allocator shortlist mode" },
              ],
            }
          : matchedIndexSnapshot
            ? {
                eyebrow: "Matched index",
                title: matchedIndexSnapshot.title,
                summary:
                  "This query points to an index tracker, so breadth, market mood, and leadership context should surface before broader market navigation.",
                href: directIndexEntry?.href ?? `/${matchedIndexSnapshot.slug}`,
                hrefLabel: "Open index tracker",
                highlights: [
                  { label: "Market mood", value: matchedIndexSnapshot.marketMood },
                  { label: "Breadth", value: matchedIndexSnapshot.breadthLabel },
                  { label: "Trend", value: matchedIndexSnapshot.trendLabel },
                  { label: "Last updated", value: matchedIndexSnapshot.lastUpdated },
                ],
              }
        : null;

  const actionCandidates: Array<SmartSearchAction | null> = [];
  const workflowResult = results.find((item) => item.category === "Workflow");

  if (matchedStock) {
    actionCandidates.push({
      title: `${matchedStock.name} detail`,
      summary: "Use the canonical stock page when you want the fastest route into quote, summary, and route-backed fundamentals.",
      href: `/stocks/${matchedStock.slug}`,
      label: "Open stock route",
      tag: "Direct match",
    });
    actionCandidates.push({
      title: `${matchedStock.name} chart`,
      summary: "Shift into the chart-first route when the query sounds closer to timing, structure, or price behavior than broad research.",
      href: `/stocks/${matchedStock.slug}/chart`,
      label: "Open chart",
      tag: "Chart handoff",
    });
    actionCandidates.push({
      title: `${matchedStock.sector} sector`,
      summary: "Broaden the view from one company into the sector cluster when you need peers, leaders, and grouped stock discovery.",
      href: `/sectors/${slugify(matchedStock.sector)}`,
      label: "Open sector",
      tag: "Peer expansion",
    });

    if (screenerPrefill.intents.length > 0) {
      actionCandidates.push({
        title: `Screen ${matchedStock.sector} peers`,
        summary: "Keep the direct stock match, but open the route-backed screener when the same query also sounds like a shortlist or factor-screen request.",
        href: screenerHref,
        label: "Open screener",
        tag: screenerPrefill.compareOnly ? "Compare screen" : "Screen handoff",
      });
    }
  }

  if (matchedStock && stockCompareCandidate) {
    actionCandidates.push({
      title: `${matchedStock.name} vs ${stockCompareCandidate.targetName}`,
      summary: stockCompareCandidate.rationale,
      href: stockCompareCandidate.href,
      label: "Open compare",
      tag: stockCompareCandidate.highlight,
    });
  }

  if (matchedFund) {
    actionCandidates.push({
      title: `${matchedFund.name} detail`,
      summary: "Open the main fund route for the fastest read on NAV, returns, category fit, holdings, and benchmark framing.",
      href: `/mutual-funds/${matchedFund.slug}`,
      label: "Open fund route",
      tag: "Direct match",
    });
    actionCandidates.push({
      title: formatFundCategoryTitle(matchedFund.category),
      summary: "Expand from one product into the broader category shortlist before locking onto a single trailing-return number.",
      href: `/fund-categories/${slugify(matchedFund.category)}`,
      label: "Open category",
      tag: "Category lens",
    });
  }

  if (matchedFund && fundCompareCandidate) {
    actionCandidates.push({
      title: `${matchedFund.name} vs ${fundCompareCandidate.targetName}`,
      summary: fundCompareCandidate.rationale,
      href: fundCompareCandidate.href,
      label: "Open compare",
      tag: fundCompareCandidate.highlight,
    });
  }

  if (matchedWealthProduct) {
    const familyMeta = wealthFamilyMeta[matchedWealthProduct.family];

    actionCandidates.push({
      title: matchedWealthProduct.name,
      summary: "Open the canonical wealth-product route when you want benchmark, structure, ticket size, and suitability context in one place.",
      href: `${familyMeta.href}/${matchedWealthProduct.slug}`,
      label: "Open product route",
      tag: directWealthEntry?.category ?? familyMeta.label,
    });
    actionCandidates.push({
      title: familyMeta.label,
      summary: "Broaden from one product into the family hub when the next step is discovery across similar ETF, PMS, AIF, or SIF routes.",
      href: familyMeta.href,
      label: "Open family hub",
      tag: "Family lens",
    });
  }

  if (matchedWealthFamily) {
    const familyMeta = wealthFamilyMeta[matchedWealthFamily];
    const leadProduct = matchedWealthFamilyProducts[0] ?? null;

    actionCandidates.push({
      title: `${familyMeta.label} hub`,
      summary: "Keep the family hub near the top so product-family queries start with grouped discovery instead of one arbitrary detail page.",
      href: familyMeta.href,
      label: "Open family hub",
      tag: "Family match",
    });

    if (leadProduct) {
      actionCandidates.push({
        title: leadProduct.name,
        summary: "Open the lead product route once you are ready to move from the family view into a concrete benchmark and suitability read.",
        href: `${familyMeta.href}/${leadProduct.slug}`,
        label: "Open product route",
        tag: leadProduct.category,
      });
    }
  }

  if (matchedSectorName) {
    actionCandidates.push({
      title: `${matchedSectorName} sector hub`,
      summary: "Use the sector route first when the query is really about grouped stock discovery instead of one isolated company page.",
      href: directSectorEntry?.href ?? `/sectors/${slugify(matchedSectorName)}`,
      label: "Open sector hub",
      tag: "Theme match",
    });
  }

  if (sectorLeadStock) {
    actionCandidates.push({
      title: sectorLeadStock.name,
      summary: "Open the first stock route from this theme when you want to turn the sector query into a concrete company read.",
      href: `/stocks/${sectorLeadStock.slug}`,
      label: "Open stock route",
      tag: sectorLeadStock.symbol,
    });
  }

  if (matchedSectorName && sectorLeadStock && sectorComparePair) {
    actionCandidates.push({
      title: `${sectorLeadStock.name} vs ${sectorComparePair.name}`,
      summary: "Move from the theme view into a same-sector compare route so the query stays in a decision workflow instead of flattening into browsing.",
      href:
        getCanonicalStockCompareHref(stocks, sectorLeadStock.slug, sectorComparePair.slug) ??
        `/compare/stocks/${sectorLeadStock.slug}/${sectorComparePair.slug}`,
      label: "Open compare",
      tag: "Sector compare",
    });
  }

  if (matchedFundCategoryName) {
    actionCandidates.push({
      title: formatFundCategoryTitle(matchedFundCategoryName),
      summary: "Keep the category hub near the top so allocator-style queries begin with a shortlist instead of an arbitrary single fund.",
      href: directFundCategoryEntry?.href ?? `/fund-categories/${slugify(matchedFundCategoryName)}`,
      label: "Open category",
      tag: "Allocator match",
    });
  }

  if (categoryLeadFund) {
    actionCandidates.push({
      title: categoryLeadFund.name,
      summary: "Open the lead fund route once you are ready to leave the shortlist and inspect benchmark, cost, and holdings detail.",
      href: `/mutual-funds/${categoryLeadFund.slug}`,
      label: "Open fund route",
      tag: categoryLeadFund.riskLabel,
    });
  }

  if (matchedFundCategoryName && categoryLeadFund && categoryComparePair) {
    actionCandidates.push({
      title: `${categoryLeadFund.name} vs ${categoryComparePair.name}`,
      summary: "Use the first in-category compare route to keep a fund-category search anchored to real allocation tradeoffs.",
      href:
        getCanonicalFundCompareHref(funds, categoryLeadFund.slug, categoryComparePair.slug) ??
        `/compare/mutual-funds/${categoryLeadFund.slug}/${categoryComparePair.slug}`,
      label: "Open compare",
      tag: "Category compare",
    });
  }

  if (matchedIndexSnapshot) {
    actionCandidates.push({
      title: `${matchedIndexSnapshot.title} tracker`,
      summary: "Open the index route when the query sounds like breadth, mood, or constituent leadership rather than single-stock research.",
      href: directIndexEntry?.href ?? `/${matchedIndexSnapshot.slug}`,
      label: "Open tracker",
      tag: matchedIndexSnapshot.marketMood,
    });
    actionCandidates.push({
      title: "Markets overview",
      summary: "Step back to the broader market board when the first index read needs context from metals, sectors, and benchmark rotation.",
      href: "/markets",
      label: "Open markets",
      tag: "Context",
    });
    actionCandidates.push({
      title: "Charts workspace",
      summary: "Shift into the chart workspace if the next move is a more visual index or stock timing review.",
      href: "/charts",
      label: "Open charts",
      tag: "Chart handoff",
    });
  }

  if (compareIntentEntry) {
    actionCandidates.push({
      title: compareIntentEntry.title,
      summary: "This query already includes compare language, so the compare route should stay near the top instead of being buried in the wider result stack.",
      href: compareIntentEntry.href,
      label: "Open compare route",
      tag: compareIntentEntry.category,
    });
  }

  if (workflowResult) {
    actionCandidates.push({
      title: "Keep the workflow open",
      summary: "After the first click, continue with the strongest workflow route so the session does not collapse back into generic navigation.",
      href: workflowResult.href,
      label: "Open workflow",
      tag: "Follow-through",
    });
  }

  if (
    screenerPrefill.intents.length > 0 &&
    !matchedFund &&
    !matchedWealthProduct &&
    !matchedWealthFamily &&
    !matchedFundCategoryName &&
    !matchedIndexSnapshot &&
    !compareIntentEntry
  ) {
    actionCandidates.unshift({
      title: "Open screener with this query",
      summary: screenerPrefill.summary,
      href: screenerHref,
      label: "Open screener",
      tag: screenerPrefill.compareOnly ? "Screener compare" : "Screener handoff",
    });
  }

  const actions = uniqueByHref(
    actionCandidates.filter((item): item is SmartSearchAction => item !== null),
  ).slice(0, 4);

  return {
    results,
    groups: buildGroups(results),
    actions,
    focusCard,
    engine,
  };
  } catch {
    return {
      results: [],
      groups: [],
      actions: [],
      focusCard: null,
      engine: {
        available: true,
        degraded: true,
        statusLabel: "Local search fallback",
        detail: "Search is temporarily using a safe fallback while the full index catches up.",
      },
    };
  }
}
