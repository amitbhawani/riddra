import {
  getCanonicalFundCompareHref,
  getCanonicalStockCompareHref,
  getRankedFundCompareCandidates,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import { getFundCategorySearchAliases } from "@/lib/fund-search-aliases";
import type { SearchCatalogEntry } from "@/lib/search-catalog";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";
import { wealthFamilyMeta, wealthProducts, type WealthProduct } from "@/lib/wealth-products";

const compareKeywords = ["compare", "comparison", "vs", "versus", "peer", "against", "better", "between"];
const chartKeywords = ["chart", "charts", "price", "candles", "technical", "support", "resistance", "ohlcv"];
const fundKeywords = ["fund", "funds", "mutual", "nav", "sip", "benchmark"];

type MatchedAsset<T> = {
  asset: T;
  index: number;
  score: number;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function containsPhrase(haystack: string, needle: string) {
  return ` ${haystack} `.includes(` ${needle} `);
}

function uniqueAliases(values: string[]) {
  return values.filter((value, index, allValues) => Boolean(value) && allValues.indexOf(value) === index);
}

function buildTextVariants(value: string) {
  return uniqueAliases([
    normalizeText(value),
    normalizeText(value.replace(/&/g, " and ")),
    normalizeText(value.replace(/\band\b/gi, " ")),
  ]);
}

function buildInitialismAlias(value: string) {
  const tokens = value
    .replace(/&/g, " ")
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 2) {
    return null;
  }

  return normalizeText(tokens.map((token) => token[0]).join(""));
}

function buildStockAliases(stock: StockSnapshot) {
  const normalizedSymbol = normalizeText(stock.symbol);

  return uniqueAliases([
    ...buildTextVariants(stock.name),
    ...buildTextVariants(stock.slug.replace(/-/g, " ")),
    normalizedSymbol,
    buildInitialismAlias(stock.name) ?? "",
  ]).filter((item) => item.length >= 3 || item === normalizedSymbol);
}

function buildFundAliases(fund: FundSnapshot) {
  return uniqueAliases([
    ...buildTextVariants(fund.name),
    ...buildTextVariants(fund.slug.replace(/-/g, " ")),
    buildInitialismAlias(fund.name) ?? "",
  ]).filter((item) => item.length >= 4);
}

function buildIpoAliases(ipo: IpoSnapshot) {
  return uniqueAliases([
    ...buildTextVariants(ipo.name),
    ...buildTextVariants(ipo.slug.replace(/-/g, " ")),
    ...buildTextVariants(ipo.name.replace(/\s+ipo$/i, "")),
  ]).filter((item) => item.length >= 4);
}

function buildWealthProductAliases(product: WealthProduct) {
  const familyLabel = wealthFamilyMeta[product.family].label;

  return [
    product.name,
    product.slug.replace(/-/g, " "),
    product.category,
    product.benchmark,
    product.manager,
    `${product.name} ${familyLabel}`,
    `${product.name} ${product.family}`,
    `${product.category} ${product.family}`,
  ]
    .map(normalizeText)
    .filter((item) => item.length >= 4);
}

function buildSectorAliases(sector: string) {
  return uniqueAliases(
    buildTextVariants(sector).flatMap((variant) => [
      variant,
      `${variant} sector`,
      `${variant} stocks`,
      `${variant} companies`,
    ]),
  ).filter((item) => item.length >= 4);
}

function buildFundCategoryAliases(category: string) {
  return uniqueAliases(
    getFundCategorySearchAliases(category).flatMap((item) => buildTextVariants(item)),
  ).filter((item) => item.length >= 4);
}

function buildWealthFamilyAliases(family: WealthProduct["family"]) {
  const meta = wealthFamilyMeta[family];
  const normalizedLabel = normalizeText(meta.label);
  const familyText = normalizeText(family);

  return [
    normalizedLabel,
    familyText,
    `${normalizedLabel} wealth`,
    `${familyText} wealth`,
    `${normalizedLabel} products`,
  ].filter((item) => item.length >= 3);
}

function getWealthSearchCategory(family: WealthProduct["family"]) {
  switch (family) {
    case "etf":
      return "ETF";
    case "pms":
      return "PMS";
    case "aif":
      return "AIF";
    case "sif":
      return "SIF";
  }
}

function formatFundCategoryTitle(category: string) {
  return /funds?$/i.test(category) ? category : `${category} funds`;
}

function buildCanonicalStockCompareEntry(
  stocks: StockSnapshot[],
  left: StockSnapshot,
  right: StockSnapshot,
  reasonBase: string,
): SearchCatalogEntry {
  const href =
    getCanonicalStockCompareHref(stocks, left.slug, right.slug) ?? `/compare/stocks/${left.slug}/${right.slug}`;

  return {
    title: `${left.name} vs ${right.name}`,
    href,
    category: "Compare",
    query: `${left.name} versus ${right.name} compare stock ${left.sector} ${right.sector} quality leverage chart`,
    reasonBase,
  };
}

function buildCanonicalFundCompareEntry(
  funds: FundSnapshot[],
  left: FundSnapshot,
  right: FundSnapshot,
  reasonBase: string,
): SearchCatalogEntry {
  const href =
    getCanonicalFundCompareHref(funds, left.slug, right.slug) ?? `/compare/mutual-funds/${left.slug}/${right.slug}`;

  return {
    title: `${left.name} vs ${right.name}`,
    href,
    category: "Fund Compare",
    query: `${left.name} versus ${right.name} compare mutual fund ${left.category} ${right.category} benchmark risk expense ratio`,
    reasonBase,
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type IndexIntentEntry = {
  title: string;
  href: string;
  category: "Index";
  query: string;
  reasonBase: string;
  aliases: string[];
};

const indexIntentEntries: IndexIntentEntry[] = [
  {
    title: "Nifty 50",
    href: "/nifty50",
    category: "Index",
    query: "nifty 50 nifty fifty nse nifty benchmark index breadth market mood heatmap constituents tracker pullers draggers",
    reasonBase: "direct index match from benchmark or breadth query",
    aliases: ["nifty 50", "nifty50", "nifty fifty", "nifty index", "nse nifty", "nse nifty 50", "nifty tracker", "nifty"],
  },
  {
    title: "Sensex",
    href: "/sensex",
    category: "Index",
    query: "sensex bse sensex sensex 30 benchmark index breadth market mood heatmap constituents tracker pullers draggers",
    reasonBase: "direct index match from benchmark or breadth query",
    aliases: ["sensex", "bse sensex", "sensex 30", "sensex tracker", "bse benchmark"],
  },
  {
    title: "Bank Nifty",
    href: "/banknifty",
    category: "Index",
    query: "bank nifty nifty bank banknifty banking index banking benchmark breadth market mood heatmap leaders laggards tracker pullers draggers",
    reasonBase: "direct index match from benchmark or breadth query",
    aliases: ["bank nifty", "banknifty", "nifty bank", "banking index", "bank index", "banking benchmark", "bank nifty tracker"],
  },
  {
    title: "Fin Nifty",
    href: "/finnifty",
    category: "Index",
    query: "fin nifty finnifty financial index financial services index financial benchmark breadth market mood heatmap leaders laggards tracker pullers draggers",
    reasonBase: "direct index match from benchmark or breadth query",
    aliases: [
      "fin nifty",
      "finnifty",
      "nifty financial services",
      "financial index",
      "financial services index",
      "financial benchmark",
      "fin nifty tracker",
    ],
  },
];

function collectMatches<T>(
  query: string,
  assets: T[],
  buildAliases: (asset: T) => string[],
) {
  const normalizedQuery = normalizeText(query);
  const matches: MatchedAsset<T>[] = [];

  for (const asset of assets) {
    let bestMatch: MatchedAsset<T> | null = null;

    for (const alias of buildAliases(asset)) {
      if (!containsPhrase(normalizedQuery, alias)) {
        continue;
      }

      const index = normalizedQuery.indexOf(alias);
      const score = alias.length * 10;

      if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && score > bestMatch.score)) {
        bestMatch = { asset, index, score };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
    }
  }

  return matches
    .sort((left, right) => {
      if (left.index !== right.index) {
        return left.index - right.index;
      }

      return right.score - left.score;
    })
    .slice(0, 2);
}

function hasKeyword(query: string, keywords: string[]) {
  const normalizedQuery = normalizeText(query);
  return keywords.some((keyword) => containsPhrase(normalizedQuery, normalizeText(keyword)));
}

function hasHeadToHeadIntent(query: string) {
  const normalizedQuery = normalizeText(query);

  if (hasKeyword(normalizedQuery, compareKeywords)) {
    return true;
  }

  return containsPhrase(normalizedQuery, "or");
}

export function getDirectIntentEntries(
  query: string,
  options: {
    stocks: StockSnapshot[];
    funds: FundSnapshot[];
    ipos: IpoSnapshot[];
  },
): SearchCatalogEntry[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const stockMatch = collectMatches(normalizedQuery, options.stocks, buildStockAliases)[0];
  const fundMatch = collectMatches(normalizedQuery, options.funds, buildFundAliases)[0];
  const ipoMatch = collectMatches(normalizedQuery, options.ipos, buildIpoAliases)[0];
  const sectorMatch = collectMatches(
    normalizedQuery,
    Array.from(new Set(options.stocks.map((stock) => stock.sector))),
    buildSectorAliases,
  )[0];
  const fundCategoryMatch = collectMatches(
    normalizedQuery,
    Array.from(new Set(options.funds.map((fund) => fund.category))),
    buildFundCategoryAliases,
  )[0];
  const indexMatch = collectMatches(normalizedQuery, indexIntentEntries, (entry) =>
    entry.aliases.map(normalizeText),
  )[0];
  const wealthProductMatch = collectMatches(normalizedQuery, wealthProducts, buildWealthProductAliases)[0];
  const wealthFamilyMatch = collectMatches(
    normalizedQuery,
    Object.keys(wealthFamilyMeta) as Array<keyof typeof wealthFamilyMeta>,
    buildWealthFamilyAliases,
  )[0];
  const entries: SearchCatalogEntry[] = [];
  const wantsChart = hasKeyword(normalizedQuery, chartKeywords);
  const wantsFund = hasKeyword(normalizedQuery, fundKeywords);

  if (stockMatch) {
    if (wantsChart) {
      entries.push({
        title: `${stockMatch.asset.name} chart`,
        href: `/stocks/${stockMatch.asset.slug}/chart`,
        category: "Chart",
        query: `${stockMatch.asset.name} chart ${stockMatch.asset.symbol} ${stockMatch.asset.sector} price technical candles`,
        reasonBase: "direct stock match with chart intent",
      });
    }

    entries.push({
      title: stockMatch.asset.name,
      href: `/stocks/${stockMatch.asset.slug}`,
      category: "Stock",
      query: `${stockMatch.asset.name} ${stockMatch.asset.symbol} ${stockMatch.asset.sector} ${stockMatch.asset.summary}`,
      reasonBase: "direct stock match from company or ticker query",
    });
  }

  if (fundMatch && (!stockMatch || wantsFund)) {
    entries.push({
      title: fundMatch.asset.name,
      href: `/mutual-funds/${fundMatch.asset.slug}`,
      category: "Mutual Fund",
      query: `${fundMatch.asset.name} ${fundMatch.asset.category} ${fundMatch.asset.benchmark} ${fundMatch.asset.riskLabel}`,
      reasonBase: "direct mutual-fund match from fund-name query",
    });
  }

  if (ipoMatch && !stockMatch && !fundMatch) {
    entries.push({
      title: ipoMatch.asset.name,
      href: `/ipo/${ipoMatch.asset.slug}`,
      category: "IPO",
      query: `${ipoMatch.asset.name} ${ipoMatch.asset.status} ${ipoMatch.asset.gmp} ${ipoMatch.asset.allotmentDate}`,
      reasonBase: "direct IPO match from company or issue query",
    });
  }

  if (wealthProductMatch && !stockMatch && !fundMatch && !ipoMatch) {
    const familyMeta = wealthFamilyMeta[wealthProductMatch.asset.family];

    entries.push({
      title: wealthProductMatch.asset.name,
      href: `${familyMeta.href}/${wealthProductMatch.asset.slug}`,
      category: getWealthSearchCategory(wealthProductMatch.asset.family),
      query: `${wealthProductMatch.asset.name} ${wealthProductMatch.asset.category} ${wealthProductMatch.asset.benchmark} ${wealthProductMatch.asset.structure} ${wealthProductMatch.asset.minimumTicket} ${wealthProductMatch.asset.riskLabel}`,
      reasonBase: "direct wealth-product match from product, benchmark, or manager query",
    });
  }

  if (sectorMatch) {
    entries.push({
      title: `${sectorMatch.asset} sector`,
      href: `/sectors/${slugify(sectorMatch.asset)}`,
      category: "Sector",
      query: `${sectorMatch.asset} sector stocks compare leaders laggards thematic research`,
      reasonBase: "direct sector match from thematic stock query",
    });
  }

  if (fundCategoryMatch) {
    entries.push({
      title: formatFundCategoryTitle(fundCategoryMatch.asset),
      href: `/fund-categories/${slugify(fundCategoryMatch.asset)}`,
      category: "Fund Category",
      query: `${fundCategoryMatch.asset} mutual funds category compare benchmark risk allocation`,
      reasonBase: "direct fund-category match from allocator query",
    });
  }

  if (indexMatch) {
    entries.push({
      title: indexMatch.asset.title,
      href: indexMatch.asset.href,
      category: "Index",
      query: indexMatch.asset.query,
      reasonBase: indexMatch.asset.reasonBase,
    });
  }

  if (wealthFamilyMatch) {
    const meta = wealthFamilyMeta[wealthFamilyMatch.asset];

    entries.push({
      title: meta.label,
      href: meta.href,
      category: "Hub",
      query: `${meta.label} wealth products ${meta.description} ${meta.status}`,
      reasonBase: "direct wealth-family match from product-family query",
    });
  }

  return entries.filter(
    (entry, index, allEntries) => allEntries.findIndex((item) => item.href === entry.href) === index,
  );
}

export function getCompareIntentEntry(
  query: string,
  options: {
    stocks: StockSnapshot[];
    funds: FundSnapshot[];
  },
): SearchCatalogEntry | null {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery || !hasHeadToHeadIntent(normalizedQuery)) {
    return null;
  }

  const stockMatches = collectMatches(normalizedQuery, options.stocks, buildStockAliases);
  const fundMatches = collectMatches(normalizedQuery, options.funds, buildFundAliases);
  const sectorMatch = collectMatches(
    normalizedQuery,
    Array.from(new Set(options.stocks.map((stock) => stock.sector))),
    buildSectorAliases,
  )[0];
  const fundCategoryMatch = collectMatches(
    normalizedQuery,
    Array.from(new Set(options.funds.map((fund) => fund.category))),
    buildFundCategoryAliases,
  )[0];
  const prefersFunds = hasKeyword(normalizedQuery, fundKeywords);

  if (prefersFunds && fundMatches.length >= 2) {
    const [left, right] = fundMatches;

    return buildCanonicalFundCompareEntry(
      options.funds,
      left.asset,
      right.asset,
      "explicit compare intent across two matched mutual-fund routes",
    );
  }

  if (stockMatches.length >= 2) {
    const [left, right] = stockMatches;

    return buildCanonicalStockCompareEntry(
      options.stocks,
      left.asset,
      right.asset,
      "explicit compare intent across two matched stock routes",
    );
  }

  if (fundMatches.length >= 2) {
    const [left, right] = fundMatches;

    return buildCanonicalFundCompareEntry(
      options.funds,
      left.asset,
      right.asset,
      "explicit compare intent across two matched mutual-fund routes",
    );
  }

  if (!prefersFunds && stockMatches.length === 1) {
    const [baseMatch] = stockMatches;
    const candidate = getRankedStockCompareCandidates(options.stocks, baseMatch.asset.slug, { limit: 1 })[0];

    if (candidate) {
      return buildCanonicalStockCompareEntry(
        options.stocks,
        baseMatch.asset,
        candidate,
        "single stock compare intent expanded into the strongest peer route",
      );
    }
  }

  if (prefersFunds && fundMatches.length === 1) {
    const [baseMatch] = fundMatches;
    const candidate = getRankedFundCompareCandidates(options.funds, baseMatch.asset.slug, { limit: 1 })[0];

    if (candidate) {
      return buildCanonicalFundCompareEntry(
        options.funds,
        baseMatch.asset,
        candidate,
        "single mutual-fund compare intent expanded into the strongest peer route",
      );
    }
  }

  if (!prefersFunds && sectorMatch) {
    const sectorStocks = options.stocks.filter((stock) => stock.sector === sectorMatch.asset);
    const [lead] = sectorStocks;
    const candidate = lead
      ? getRankedStockCompareCandidates(sectorStocks, lead.slug, { limit: 1 })[0]
      : null;

    if (lead && candidate) {
      return buildCanonicalStockCompareEntry(
        options.stocks,
        lead,
        candidate,
        "sector compare intent expanded into the strongest same-theme stock route",
      );
    }
  }

  if (fundCategoryMatch) {
    const categoryFunds = options.funds.filter((fund) => fund.category === fundCategoryMatch.asset);
    const [lead] = categoryFunds;
    const candidate = lead
      ? getRankedFundCompareCandidates(categoryFunds, lead.slug, { limit: 1 })[0]
      : null;

    if (lead && candidate) {
      return buildCanonicalFundCompareEntry(
        options.funds,
        lead,
        candidate,
        "fund-category compare intent expanded into the strongest in-category route",
      );
    }
  }

  return null;
}
