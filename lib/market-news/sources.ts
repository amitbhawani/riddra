import type {
  MarketNewsSourceContentCategory,
  MarketNewsSourceRecord,
} from "@/lib/market-news/types";
import {
  importMissingMarketNewsSources,
  listEnabledMarketNewsSources,
  seedMarketNewsSources,
  syncMissingMarketNewsSources,
  type MarketNewsSourceSeed,
} from "@/lib/market-news/queries";

type MarketNewsRuntimeSourceSeed = MarketNewsSourceSeed & {
  content_category: MarketNewsSourceContentCategory;
  requiresEnv?: "FINNHUB_API_KEY" | "NEWSAPI_KEY";
};

const BLOCKED_MONEYCONTROL_REASON =
  "Blocked at the server fetch layer with HTTP 403, so this source remains disabled to protect ingestion reliability.";

const CANDIDATE_SOURCE_IMPORT_NOTE =
  "Candidate publisher source seeded for safe feed discovery and manual review from the Market News admin dashboard.";

function buildNewsApiUrl(query: string, pageSize = 30) {
  const apiKey = process.env.NEWSAPI_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const searchParams = new URLSearchParams({
    apiKey,
    language: "en",
    pageSize: String(pageSize),
    q: query,
    sortBy: "publishedAt",
  });

  return `https://newsapi.org/v2/everything?${searchParams.toString()}`;
}

function buildFinnhubGeneralUrl(category: string) {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const searchParams = new URLSearchParams({
    category,
    token: apiKey,
  });

  return `https://finnhub.io/api/v1/news?${searchParams.toString()}`;
}

function buildFallbackMarketNewsSources(): readonly MarketNewsRuntimeSourceSeed[] {
  const fallbackSources: MarketNewsRuntimeSourceSeed[] = [
    {
      name: "Moneycontrol Markets RSS",
      slug: "moneycontrol-markets-rss",
      source_type: "blocked",
      feed_url: "https://www.moneycontrol.com/rss/marketreports.xml",
      api_url: null,
      homepage_url: "https://www.moneycontrol.com/stocksmarketsindia/",
      category: "market_news",
      region: "India",
      reliability_score: 78,
      is_enabled: false,
      fetch_interval_minutes: 30,
      content_category: "market_news",
      last_status: "blocked",
      last_error: BLOCKED_MONEYCONTROL_REASON,
      notes: BLOCKED_MONEYCONTROL_REASON,
    },
    {
      name: "Moneycontrol Business RSS",
      slug: "moneycontrol-business-rss",
      source_type: "blocked",
      feed_url: "https://www.moneycontrol.com/rss/business.xml",
      api_url: null,
      homepage_url: "https://www.moneycontrol.com/",
      category: "company_news",
      region: "India",
      reliability_score: 76,
      is_enabled: false,
      fetch_interval_minutes: 30,
      content_category: "company_news",
      last_status: "blocked",
      last_error: BLOCKED_MONEYCONTROL_REASON,
      notes: BLOCKED_MONEYCONTROL_REASON,
    },
    {
      name: "SEBI Press Releases RSS",
      slug: "sebi-press-releases-rss",
      source_type: "rss",
      feed_url: "https://www.sebi.gov.in/sebirss.xml",
      api_url: null,
      homepage_url: "https://www.sebi.gov.in/",
      category: "regulatory",
      region: "India",
      reliability_score: 92,
      is_enabled: true,
      fetch_interval_minutes: 60,
      content_category: "regulatory",
      notes: "Official regulatory feed.",
    },
    {
      name: "Economic Times Markets RSS",
      slug: "economic-times-markets-rss",
      source_type: "rss",
      feed_url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
      api_url: null,
      homepage_url: "https://economictimes.indiatimes.com/markets",
      category: "market_news",
      region: "India",
      reliability_score: 84,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "market_news",
      notes: "Established Indian market feed.",
    },
    {
      name: "LiveMint Markets RSS",
      slug: "livemint-markets-rss",
      source_type: "rss",
      feed_url: "https://www.livemint.com/rss/markets",
      api_url: null,
      homepage_url: "https://www.livemint.com/market",
      category: "market_news",
      region: "India",
      reliability_score: 81,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "market_news",
      notes: "Mint markets RSS feed.",
    },
    {
      name: "BusinessLine Markets RSS",
      slug: "businessline-markets-rss",
      source_type: "rss",
      feed_url: "https://www.thehindubusinessline.com/markets/feeder/default.rss",
      api_url: null,
      homepage_url: "https://www.thehindubusinessline.com/markets/",
      category: "market_news",
      region: "India",
      reliability_score: 83,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "market_news",
      notes: "BusinessLine markets RSS feed.",
    },
    {
      name: "BusinessLine Companies RSS",
      slug: "businessline-companies-rss",
      source_type: "rss",
      feed_url: "https://www.thehindubusinessline.com/companies/feeder/default.rss",
      api_url: null,
      homepage_url: "https://www.thehindubusinessline.com/companies/",
      category: "company_news",
      region: "India",
      reliability_score: 85,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "company_news",
      notes: "BusinessLine companies RSS feed.",
    },
  ];

  const finnhubGeneralUrl = buildFinnhubGeneralUrl("general");

  fallbackSources.push({
    name: "Finnhub General Market News",
    slug: "finnhub-general-market-news",
    source_type: "api",
    feed_url: null,
    api_url: finnhubGeneralUrl,
    homepage_url: "https://finnhub.io/",
    category: "market_news",
    region: "Global",
    reliability_score: 80,
    is_enabled: Boolean(finnhubGeneralUrl),
    fetch_interval_minutes: 20,
    content_category: "market_news",
    requiresEnv: "FINNHUB_API_KEY",
    last_status: finnhubGeneralUrl ? "working" : "candidate",
    last_error: finnhubGeneralUrl ? null : "Requires FINNHUB_API_KEY before the source can be enabled.",
    notes: "API-backed market news source.",
  });

  const newsApiBusinessUrl = buildNewsApiUrl(
    '(india OR nse OR bse) AND (company OR stocks OR earnings OR ipo OR markets)',
  );

  fallbackSources.push({
    name: "NewsAPI India Business News",
    slug: "newsapi-india-business-news",
    source_type: "api",
    feed_url: null,
    api_url: newsApiBusinessUrl,
    homepage_url: "https://newsapi.org/",
    category: "company_news",
    region: "India",
    reliability_score: 72,
    is_enabled: Boolean(newsApiBusinessUrl),
    fetch_interval_minutes: 30,
    content_category: "company_news",
    requiresEnv: "NEWSAPI_KEY",
    last_status: newsApiBusinessUrl ? "working" : "candidate",
    last_error: newsApiBusinessUrl ? null : "Requires NEWSAPI_KEY before the source can be enabled.",
    notes: "API-backed news source for broader company coverage.",
  });

  return fallbackSources;
}

function candidateSource(
  name: string,
  homepageUrl: string,
  category: MarketNewsSourceContentCategory,
  region: "Global" | "India",
  reliabilityScore: number,
) {
  return {
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    source_type: "candidate" as const,
    feed_url: null,
    api_url: null,
    homepage_url: homepageUrl,
    category,
    region,
    reliability_score: reliabilityScore,
    is_enabled: false,
    fetch_interval_minutes: 30,
    content_category: category,
    last_status: "candidate",
    last_error: null,
    notes: CANDIDATE_SOURCE_IMPORT_NOTE,
  } satisfies MarketNewsRuntimeSourceSeed;
}

export function getMarketNewsCandidateSourceSeeds(): readonly MarketNewsRuntimeSourceSeed[] {
  return [
    candidateSource("Reuters Markets", "https://www.reuters.com/markets/", "market_news", "Global", 88),
    candidateSource("Reuters Business", "https://www.reuters.com/business/", "company_news", "Global", 88),
    candidateSource("Reuters Finance", "https://www.reuters.com/business/finance/", "market_news", "Global", 88),
    candidateSource("Bloomberg Markets", "https://www.bloomberg.com/markets", "market_news", "Global", 87),
    candidateSource("Bloomberg Businessweek", "https://www.bloomberg.com/businessweek", "company_news", "Global", 86),
    candidateSource("CNBC Markets", "https://www.cnbc.com/markets/", "market_news", "Global", 82),
    candidateSource("CNBC Business", "https://www.cnbc.com/business/", "company_news", "Global", 82),
    candidateSource("CNBC Investing", "https://www.cnbc.com/investing/", "market_news", "Global", 82),
    candidateSource("WSJ Business", "https://www.wsj.com/business", "company_news", "Global", 86),
    candidateSource("WSJ Finance", "https://www.wsj.com/finance", "market_news", "Global", 86),
    candidateSource("FT Financials", "https://www.ft.com/financials", "company_news", "Global", 85),
    candidateSource("FT Markets", "https://www.ft.com/markets", "market_news", "Global", 85),
    candidateSource("MarketWatch Investing", "https://www.marketwatch.com/investing", "market_news", "Global", 80),
    candidateSource("Fortune Finance", "https://fortune.com/section/finance/", "market_news", "Global", 76),
    candidateSource("Forbes Business", "https://www.forbes.com/business/", "company_news", "Global", 74),
    candidateSource("TheStreet Markets", "https://www.thestreet.com/markets", "market_news", "Global", 72),
    candidateSource("TheStreet Investing", "https://www.thestreet.com/investing", "market_news", "Global", 72),
    candidateSource("Investopedia Investing", "https://www.investopedia.com/investing-4427685", "market_news", "Global", 75),
    candidateSource("Economic Times Markets", "https://economictimes.indiatimes.com/markets", "market_news", "India", 84),
    candidateSource("Economic Times Live Coverage", "https://economictimes.indiatimes.com/markets/live-coverage", "market_news", "India", 82),
    candidateSource("LiveMint Market", "https://www.livemint.com/market", "market_news", "India", 81),
    candidateSource("LiveMint IPO", "https://www.livemint.com/market/ipo", "ipo", "India", 80),
    candidateSource("LiveMint Money", "https://www.livemint.com/money", "macro", "India", 79),
    candidateSource("Business Standard Markets", "https://www.business-standard.com/markets", "market_news", "India", 81),
    candidateSource("Business Standard IPO", "https://www.business-standard.com/markets/ipo", "ipo", "India", 80),
    candidateSource("Business Standard Smart Investor", "https://www.business-standard.com/markets/the-smart-investor", "company_news", "India", 80),
    candidateSource("Financial Express Market", "https://www.financialexpress.com/market/", "market_news", "India", 77),
    candidateSource("Hindu BusinessLine Markets", "https://www.thehindubusinessline.com/markets/", "market_news", "India", 83),
    candidateSource("NDTV Profit Markets", "https://www.ndtvprofit.com/markets", "market_news", "India", 76),
    candidateSource("NDTV Profit Business", "https://www.ndtvprofit.com/business", "company_news", "India", 76),
    candidateSource("NDTV Profit Personal Finance", "https://www.ndtvprofit.com/personal-finance", "macro", "India", 75),
    candidateSource("Business Today Markets", "https://www.businesstoday.in/markets", "market_news", "India", 76),
    candidateSource("Moneycontrol Markets", "https://www.moneycontrol.com/stocksmarketsindia/", "market_news", "India", 78),
  ];
}

export type MarketNewsConfiguredSource = MarketNewsSourceRecord & {
  fallbackSeeded: boolean;
  contentCategory: MarketNewsSourceContentCategory;
  disabledReason: string | null;
};

export type MarketNewsSourceRegistry = {
  mode: "database" | "fallback_seed";
  sources: MarketNewsConfiguredSource[];
  skippedSources: Array<{
    name: string;
    slug: string;
    reason: string;
  }>;
};

function buildRuntimeMetadataMap(seeds: readonly MarketNewsRuntimeSourceSeed[]) {
  return new Map(seeds.map((seed) => [seed.slug, seed]));
}

function normalizeSourceContentCategory(
  source: Pick<MarketNewsSourceRecord, "category">,
  metadata?: MarketNewsRuntimeSourceSeed,
): MarketNewsSourceContentCategory {
  const candidate = String(source.category ?? metadata?.category ?? "market_news").trim();

  if (
    candidate === "company_news" ||
    candidate === "market_news" ||
    candidate === "regulatory" ||
    candidate === "macro" ||
    candidate === "ipo"
  ) {
    return candidate;
  }

  return metadata?.content_category ?? "market_news";
}

function dedupeSkippedSources(skippedSources: MarketNewsSourceRegistry["skippedSources"]) {
  const seen = new Set<string>();

  return skippedSources.filter((source) => {
    const key = `${source.slug}::${source.reason}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toConfiguredSource(
  source: MarketNewsSourceRecord,
  fallbackSeeded: boolean,
  metadata: MarketNewsRuntimeSourceSeed | undefined,
): MarketNewsConfiguredSource {
  return {
    ...source,
    fallbackSeeded,
    contentCategory: normalizeSourceContentCategory(source, metadata),
    disabledReason: source.last_error ?? metadata?.last_error ?? null,
  };
}

function getRuntimeDisableReason(
  source: MarketNewsSourceRecord,
  metadata: MarketNewsRuntimeSourceSeed | undefined,
) {
  if (!source.is_enabled) {
    return source.last_error ?? "Disabled in the Market News source registry.";
  }

  if (source.source_type === "blocked") {
    return source.last_error ?? "Marked as blocked in the Market News source registry.";
  }

  if (source.source_type === "candidate") {
    return source.last_error ?? "Candidate source is not enabled for ingestion yet.";
  }

  if (metadata?.requiresEnv && !process.env[metadata.requiresEnv]?.trim()) {
    return metadata.last_error ?? `Requires ${metadata.requiresEnv} before this source can run.`;
  }

  return null;
}

export async function importMarketNewsCandidateSources() {
  return importMissingMarketNewsSources(getMarketNewsCandidateSourceSeeds());
}

export async function loadMarketNewsSourceRegistry(): Promise<MarketNewsSourceRegistry> {
  const fallbackSources = buildFallbackMarketNewsSources();
  const runtimeMetadataBySlug = buildRuntimeMetadataMap(fallbackSources);

  await syncMissingMarketNewsSources(fallbackSources);

  const databaseSources = await listEnabledMarketNewsSources();
  const allowedSources: MarketNewsConfiguredSource[] = [];
  const skippedSources: MarketNewsSourceRegistry["skippedSources"] = [];

  for (const source of databaseSources) {
    const metadata = runtimeMetadataBySlug.get(source.slug);
    const runtimeDisableReason = getRuntimeDisableReason(source, metadata);

    if (runtimeDisableReason) {
      skippedSources.push({
        name: source.name,
        slug: source.slug,
        reason: runtimeDisableReason,
      });
      continue;
    }

    allowedSources.push(toConfiguredSource(source, Boolean(metadata), metadata));
  }

  if (allowedSources.length > 0) {
    return {
      mode: "database",
      sources: allowedSources,
      skippedSources: dedupeSkippedSources(skippedSources),
    };
  }

  const seededRows = await seedMarketNewsSources(fallbackSources.filter((source) => source.is_enabled));

  return {
    mode: "fallback_seed",
    sources: seededRows.map((source) => toConfiguredSource(source, true, runtimeMetadataBySlug.get(source.slug))),
    skippedSources: dedupeSkippedSources(
      fallbackSources
        .filter((source) => !source.is_enabled)
        .map((source) => ({
          name: source.name,
          slug: source.slug,
          reason: source.last_error ?? source.notes ?? "Disabled in the Market News runtime registry.",
        })),
    ),
  };
}
