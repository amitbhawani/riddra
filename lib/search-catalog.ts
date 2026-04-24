import { courses } from "@/lib/courses";
import {
  getCanonicalFundCompareHref,
  getCanonicalStockCompareHref,
  getPreferredFundComparePairs,
  getPreferredStockComparePairs,
  getRankedFundCompareCandidates,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import { getFundCategorySearchAliases } from "@/lib/fund-search-aliases";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";
import { tools } from "@/lib/tools";
import { wealthFamilyMeta, wealthProducts, type WealthFamily, type WealthProduct } from "@/lib/wealth-products";

export type SearchCatalogEntry = {
  title: string;
  href: string;
  category: string;
  query: string;
  reasonBase: string;
};

type LearnLikeArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
};

type LearnLikePath = {
  slug: string;
  title: string;
  audience: string;
  summary: string;
  promise: string;
};

type MarketEventLike = {
  slug: string;
  title: string;
  eventType: string;
  status: string;
  summary: string;
  assetRef: string;
};

type MentorshipLikeTrack = {
  slug: string;
  title: string;
  audience: string;
  summary: string;
  goal: string;
};

type CommunityLikeProgram = {
  slug: string;
  title: string;
  participationMode: string;
  summary: string;
  goal: string;
};

type WebinarLikeItem = {
  slug: string;
  title: string;
  format: string;
  audience: string;
  summary: string;
  access: string;
  replayPlan: string;
  registrationMode: string;
};

function getWealthSearchCategory(family: WealthFamily) {
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFundCategoryTitle(category: string) {
  return /funds?$/i.test(category) ? category : `${category} funds`;
}

function serializeStockResearch(stock: StockSnapshot) {
  const stats = stock.stats.map((item) => `${item.label} ${item.value}`).join(" ");
  const fundamentals = stock.fundamentals.map((item) => `${item.label} ${item.value} ${item.note}`).join(" ");
  const ownership = stock.shareholding.map((item) => `${item.label} ${item.value} ${item.note}`).join(" ");
  const keyPoints = stock.keyPoints.join(" ");

  return `${stats} ${fundamentals} ${ownership} ${keyPoints}`.trim();
}

function serializeFundResearch(fund: FundSnapshot) {
  const returns = fund.returnsTable.map((item) => `${item.label} ${item.value}`).join(" ");
  const holdings = fund.holdings.map((item) => `${item.name} ${item.sector} ${item.weight}`).join(" ");
  const sectorAllocation = fund.sectorAllocation.map((item) => `${item.name} ${item.weight}`).join(" ");
  const manager = `${fund.fundManager.name} ${fund.fundManager.since} ${fund.fundManager.experience} ${fund.fundManager.style}`;
  const factsheet = fund.factsheetMeta
    ? `${fund.factsheetMeta.amcName} ${fund.factsheetMeta.documentLabel} ${fund.factsheetMeta.source} ${fund.factsheetMeta.sourceDate}`
    : "factsheet pending amc evidence";
  const keyPoints = fund.keyPoints.join(" ");

  return `${returns} ${holdings} ${sectorAllocation} ${manager} ${factsheet} ${keyPoints}`.trim();
}

function buildWealthProductEntries(products: WealthProduct[]): SearchCatalogEntry[] {
  return products.map((product) => {
    const familyLabel = wealthFamilyMeta[product.family].label;
    const dueDiligence = product.dueDiligence.join(" ");
    const researchStats = product.researchStats.map((item) => `${item.label} ${item.value}`).join(" ");
    const compareLanes = product.compareLanes.join(" ");
    const portfolioRole = product.portfolioRole.join(" ");
    const fit = product.fitFor.join(" ");
    const avoid = product.avoidIf.join(" ");

    return {
      title: product.name,
      href: `${wealthFamilyMeta[product.family].href}/${product.slug}`,
      category: getWealthSearchCategory(product.family),
      query: `${product.name} ${familyLabel} ${product.category} ${product.summary} ${product.angle} ${product.benchmark} ${product.structure} ${product.minimumTicket} ${product.riskLabel} ${product.manager} ${product.status} ${product.liquidity} ${product.taxation} ${product.costNote} ${product.thesis} ${researchStats} ${compareLanes} ${portfolioRole} ${fit} ${avoid} ${dueDiligence}`,
      reasonBase: `${familyLabel.toLowerCase()} identity, structure, and investor-fit research`,
    };
  });
}

function buildWealthFamilyEntries(products: WealthProduct[]): SearchCatalogEntry[] {
  const families = Array.from(new Set(products.map((product) => product.family))) as WealthFamily[];

  return families.map((family) => {
    const meta = wealthFamilyMeta[family];
    const familyProducts = products.filter((product) => product.family === family);
    const categories = Array.from(new Set(familyProducts.map((product) => product.category))).join(" ");
    const benchmarks = Array.from(new Set(familyProducts.map((product) => product.benchmark))).join(" ");
    const compareLanes = Array.from(new Set(familyProducts.flatMap((product) => product.compareLanes))).join(" ");

    return {
      title: meta.label,
      href: meta.href,
      category: "Hub",
      query: `${meta.label} wealth ${meta.description} ${meta.status} ${categories} ${benchmarks} ${compareLanes}`,
      reasonBase: "wealth-family discovery and grouped product navigation",
    };
  });
}

function buildStockEntries(stocks: StockSnapshot[]): SearchCatalogEntry[] {
  return stocks.flatMap((item) => {
    const topCompareCandidate = getRankedStockCompareCandidates(stocks, item.slug, { limit: 1 })[0] ?? null;
    const researchQuery = serializeStockResearch(item);

    return [
      {
        title: item.name,
        href: `/stocks/${item.slug}`,
        category: "Stock",
        query: `${item.name} ${item.symbol} ${item.sector} ${item.summary} ${item.momentumLabel} ${researchQuery}`,
        reasonBase: "stock identity, sector, or research summary",
      },
      {
        title: `${item.name} chart`,
        href: `/stocks/${item.slug}/chart`,
        category: "Chart",
        query: `${item.name} chart ${item.symbol} ${item.sector} price technical candles support resistance ohlcv range momentum`,
        reasonBase: "chart-first intent tied to the stock route",
      },
      ...(topCompareCandidate
        ? [
            {
              title: `${item.name} compare`,
              href:
                getCanonicalStockCompareHref(stocks, item.slug, topCompareCandidate.slug) ??
                `/compare/stocks/${item.slug}/${topCompareCandidate.slug}`,
              category: "Compare",
              query: `${item.name} compare versus peer ${topCompareCandidate.name} ${item.sector} quality leverage price ownership promoter fii dii shareholding roe debt equity`,
              reasonBase: "compare-first shortcut from a direct stock route",
            },
          ]
        : []),
    ];
  });
}

function buildIpoEntries(ipos: IpoSnapshot[]): SearchCatalogEntry[] {
  return ipos.map((item) => ({
    title: item.name,
    href: `/ipo/${item.slug}`,
    category: "IPO",
    query: `${item.name} ${item.ipoType} ${item.status} ${item.summary} ${item.gmp} ${item.allotmentDate}`,
    reasonBase: "IPO lifecycle, status, or company context",
  }));
}

function buildFundEntries(funds: FundSnapshot[]): SearchCatalogEntry[] {
  return funds.flatMap((item) => {
    const topCompareCandidate = getRankedFundCompareCandidates(funds, item.slug, { limit: 1 })[0] ?? null;
    const researchQuery = serializeFundResearch(item);
    const categoryAliases = getFundCategorySearchAliases(item.category).join(" ");

    return [
      {
        title: item.name,
        href: `/mutual-funds/${item.slug}`,
        category: "Mutual Fund",
        query: `${item.name} ${item.category} ${categoryAliases} ${item.summary} ${item.benchmark} ${item.riskLabel} ${item.expenseRatio} ${researchQuery}`,
        reasonBase: "fund category, benchmark, or compare-ready summary",
      },
      ...(topCompareCandidate
        ? [
            {
              title: `${item.name} compare`,
              href:
                getCanonicalFundCompareHref(funds, item.slug, topCompareCandidate.slug) ??
                `/compare/mutual-funds/${item.slug}/${topCompareCandidate.slug}`,
              category: "Fund Compare",
              query: `${item.name} compare versus peer ${topCompareCandidate.name} ${item.category} ${categoryAliases} benchmark risk expense ratio holdings overlap allocation returns factsheet`,
              reasonBase: "compare-first shortcut from a direct mutual-fund route",
            },
          ]
        : []),
    ];
  });
}

function buildSectorEntries(stocks: StockSnapshot[]): SearchCatalogEntry[] {
  const sectors = Array.from(new Set(stocks.map((item) => item.sector))).sort((left, right) => left.localeCompare(right));

  return sectors.map((sector) => ({
    title: `${sector} sector`,
    href: `/sectors/${slugify(sector)}`,
    category: "Sector",
    query: `${sector} sector stocks compare leaders laggards thematic research`,
    reasonBase: "sector-level discovery and grouped stock research",
  }));
}

function buildFundCategoryEntries(funds: FundSnapshot[]): SearchCatalogEntry[] {
  const categories = Array.from(new Set(funds.map((item) => item.category))).sort((left, right) => left.localeCompare(right));

  return categories.map((category) => ({
    title: formatFundCategoryTitle(category),
    href: `/fund-categories/${slugify(category)}`,
    category: "Fund Category",
    query: `${category} ${getFundCategorySearchAliases(category).join(" ")} category compare benchmark risk allocation`,
    reasonBase: "category-level fund discovery and shortlist workflows",
  }));
}

function buildStockCompareEntries(stocks: StockSnapshot[]): SearchCatalogEntry[] {
  return getPreferredStockComparePairs(stocks, 1).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href: getCanonicalStockCompareHref(stocks, left.slug, right.slug) ?? `/compare/stocks/${left.slug}/${right.slug}`,
    category: "Compare",
    query: `${left.name} versus ${right.name} compare stock vs ${left.sector} quality leverage price chart ownership promoter fii dii shareholding roe debt equity`,
    reasonBase: "side-by-side stock comparison and demo workflow",
  }));
}

function buildFundCompareEntries(funds: FundSnapshot[]): SearchCatalogEntry[] {
  return getPreferredFundComparePairs(funds, 1).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href:
      getCanonicalFundCompareHref(funds, left.slug, right.slug) ?? `/compare/mutual-funds/${left.slug}/${right.slug}`,
    category: "Fund Compare",
    query: `${left.name} versus ${right.name} compare mutual fund vs ${left.category} expense ratio benchmark holdings overlap allocation returns factsheet risk`,
    reasonBase: "side-by-side fund comparison and allocator workflow",
  }));
}

function buildWorkflowEntries(): SearchCatalogEntry[] {
  return [
    {
      title: "Screener workspace",
      href: "/screener",
      category: "Workflow",
      query: "stock screener filters quality debt growth ownership compare shortlist workflow",
      reasonBase: "workflow intent for screening and shortlist building",
    },
    {
      title: "Charts workspace",
      href: "/charts",
      category: "Workflow",
      query: "charts workspace stock chart compare technical analysis candles layouts",
      reasonBase: "workflow intent for chart-first market review",
    },
    {
      title: "Indian stocks hub",
      href: "/stocks",
      category: "Hub",
      query: "stocks hub indian stocks browse quote sectors compare routes",
      reasonBase: "stock hub and discovery navigation",
    },
    {
      title: "Mutual fund hub",
      href: "/mutual-funds",
      category: "Hub",
      query: "mutual fund hub browse categories compare returns holdings",
      reasonBase: "fund hub and discovery navigation",
    },
    {
      title: "Wealth product hub",
      href: "/wealth",
      category: "Hub",
      query: "wealth products hub etfs pms aif sif compare benchmark risk ticket liquidity taxation",
      reasonBase: "wealth hub and investor-product discovery navigation",
    },
    {
      title: "Tools hub",
      href: "/tools",
      category: "Hub",
      query: "tools hub calculators planning workflows position size breakout fire gold silver pdf utility",
      reasonBase: "tool hub and workflow discovery navigation",
    },
    {
      title: "Sectors hub",
      href: "/sectors",
      category: "Hub",
      query: "stock sectors hub grouped research compare thematic discovery",
      reasonBase: "sector hub and grouped discovery navigation",
    },
    {
      title: "Fund categories hub",
      href: "/fund-categories",
      category: "Hub",
      query: "fund categories hub category discovery compare benchmark risk",
      reasonBase: "fund-category hub and grouped discovery navigation",
    },
    {
      title: "Learn hub",
      href: "/learn",
      category: "Learn",
      query: "learn hub market basics compare funds open interest ipo gmp",
      reasonBase: "learning hub and educational discovery",
    },
    {
      title: "Results calendar",
      href: "/reports/results-calendar",
      category: "Workflow",
      query: "results calendar earnings dates event watch stocks quarterly results",
      reasonBase: "event-driven workflow and earnings discovery",
    },
    {
      title: "Reports hub",
      href: "/reports",
      category: "Hub",
      query: "reports hub fii dii results calendar market activity earnings event intelligence",
      reasonBase: "report hub and structured market-report discovery",
    },
    {
      title: "FII and DII activity",
      href: "/reports/fii-dii",
      category: "Workflow",
      query: "fii dii activity foreign institutional investor domestic institutional investor flow report",
      reasonBase: "institutional-flow report and market-activity workflow",
    },
    {
      title: "Market copilot",
      href: "/market-copilot",
      category: "Workflow",
      query: "market copilot ai workflow guided market questions",
      reasonBase: "guided workflow and AI-assisted navigation",
    },
  ];
}

function buildToolEntries(): SearchCatalogEntry[] {
  return tools.map((item) => ({
    title: item.title,
    href: `/tools/${item.slug}`,
    category: "Tool",
    query: `${item.title} ${item.category} ${item.summary} ${item.samplePrompt}`,
    reasonBase: "tool intent or calculator-style workflow",
  }));
}

function buildCourseEntries(): SearchCatalogEntry[] {
  return courses.map((item) => ({
    title: item.title,
    href: `/courses/${item.slug}`,
    category: "Course",
    query: `${item.title} ${item.category} ${item.summary}`,
    reasonBase: "learning or course intent",
  }));
}

function buildLearnEntries(learnArticles: LearnLikeArticle[]): SearchCatalogEntry[] {
  return learnArticles.map((item) => ({
    title: item.title,
    href: `/learn/${item.slug}`,
    category: "Learn",
    query: `${item.title} ${item.category} ${item.summary}`,
    reasonBase: "explanatory or educational intent",
  }));
}

function buildLearningPathEntries(learningPaths: LearnLikePath[]): SearchCatalogEntry[] {
  return learningPaths.map((item) => ({
    title: item.title,
    href: `/learn/tracks/${item.slug}`,
    category: "Learn",
    query: `${item.title} ${item.audience} ${item.summary} ${item.promise}`,
    reasonBase: "structured learner track and guided education intent",
  }));
}

function buildMarketEventEntries(marketEvents: MarketEventLike[]): SearchCatalogEntry[] {
  return marketEvents.map((item) => ({
    title: item.title,
    href: `/learn/events/${item.slug}`,
    category: "Workflow",
    query: `${item.title} ${item.eventType} ${item.status} ${item.summary} ${item.assetRef}`,
    reasonBase: "event archive, lifecycle tracking, and report-led discovery",
  }));
}

function buildMentorshipEntries(mentorshipTracks: MentorshipLikeTrack[]): SearchCatalogEntry[] {
  return mentorshipTracks.map((item) => ({
    title: item.title,
    href: `/mentorship/${item.slug}`,
    category: "Learn",
    query: `${item.title} mentorship ${item.audience} ${item.summary} ${item.goal}`,
    reasonBase: "guided learning, cohort, and mentorship intent",
  }));
}

function buildCommunityEntries(communityPrograms: CommunityLikeProgram[]): SearchCatalogEntry[] {
  return communityPrograms.map((item) => ({
    title: item.title,
    href: `/community/${item.slug}`,
    category: "Learn",
    query: `${item.title} community ${item.participationMode} ${item.summary} ${item.goal}`,
    reasonBase: "community participation and guided-program continuity intent",
  }));
}

function buildWebinarEntries(webinars: WebinarLikeItem[]): SearchCatalogEntry[] {
  return webinars.flatMap((item) => [
    {
      title: item.title,
      href: `/webinars/${item.slug}`,
      category: "Learn",
      query: `${item.title} webinar ${item.format} ${item.audience} ${item.summary}`,
      reasonBase: "webinar detail, archive, and guided learning intent",
    },
    {
      title: `${item.title} registration`,
      href: `/webinars/${item.slug}/register`,
      category: "Workflow",
      query: `${item.title} webinar register signup ${item.registrationMode} ${item.access}`,
      reasonBase: "event registration, signup, and attendance intent",
    },
    {
      title: `${item.title} replay`,
      href: `/webinars/${item.slug}/replay`,
      category: "Learn",
      query: `${item.title} webinar replay ${item.replayPlan} archive recap`,
      reasonBase: "event replay, recap, and archive intent",
    },
  ]);
}

function buildIndexEntries(): SearchCatalogEntry[] {
  return [
    {
      title: "Nifty 50",
      href: "/nifty50",
      category: "Index",
      query:
        "nifty 50 nifty fifty nse nifty index benchmark tracker breadth market mood heatmap pullers draggers",
      reasonBase: "index tracker and market breadth intent",
    },
    {
      title: "Sensex",
      href: "/sensex",
      category: "Index",
      query:
        "sensex bse sensex sensex 30 index benchmark tracker breadth market mood heatmap pullers draggers",
      reasonBase: "index tracker and market breadth intent",
    },
    {
      title: "Bank Nifty",
      href: "/banknifty",
      category: "Index",
      query:
        "bank nifty nifty bank banknifty banking index banking benchmark tracker breadth market mood heatmap leaders laggards pullers draggers",
      reasonBase: "index tracker and market breadth intent",
    },
    {
      title: "Fin Nifty",
      href: "/finnifty",
      category: "Index",
      query:
        "fin nifty finnifty financial index financial services index financial benchmark tracker breadth market mood heatmap leaders laggards pullers draggers",
      reasonBase: "index tracker and market breadth intent",
    },
  ];
}

export function buildSearchCatalog({
  stocks,
  ipos,
  funds,
  learnArticles = [],
  learningPaths = [],
  marketEvents = [],
  mentorshipTracks = [],
  communityPrograms = [],
  webinars = [],
}: {
  stocks: StockSnapshot[];
  ipos: IpoSnapshot[];
  funds: FundSnapshot[];
  learnArticles?: LearnLikeArticle[];
  learningPaths?: LearnLikePath[];
  marketEvents?: MarketEventLike[];
  mentorshipTracks?: MentorshipLikeTrack[];
  communityPrograms?: CommunityLikeProgram[];
  webinars?: WebinarLikeItem[];
}) {
  return [
    ...buildStockEntries(stocks),
    ...buildIpoEntries(ipos),
    ...buildFundEntries(funds),
    ...buildWealthProductEntries(wealthProducts),
    ...buildStockCompareEntries(stocks),
    ...buildFundCompareEntries(funds),
    ...buildSectorEntries(stocks),
    ...buildFundCategoryEntries(funds),
    ...buildWealthFamilyEntries(wealthProducts),
    ...buildWorkflowEntries(),
    ...buildToolEntries(),
    ...buildCourseEntries(),
    ...buildLearnEntries(learnArticles),
    ...buildLearningPathEntries(learningPaths),
    ...buildMarketEventEntries(marketEvents),
    ...buildMentorshipEntries(mentorshipTracks),
    ...buildCommunityEntries(communityPrograms),
    ...buildWebinarEntries(webinars),
    ...buildIndexEntries(),
  ];
}
