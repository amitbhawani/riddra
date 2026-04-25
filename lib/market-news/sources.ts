import type {
  MarketNewsSourceContentCategory,
  MarketNewsSourceRecord,
} from "@/lib/market-news/types";
import {
  listEnabledMarketNewsSources,
  seedMarketNewsSources,
  syncMissingMarketNewsSources,
  type MarketNewsSourceSeed,
} from "@/lib/market-news/queries";

type MarketNewsRuntimeSourceSeed = MarketNewsSourceSeed & {
  content_category: MarketNewsSourceContentCategory;
  disabledReason?: string | null;
  requiresEnv?: "FINNHUB_API_KEY" | "NEWSAPI_KEY";
};

const BLOCKED_MONEYCONTROL_REASON =
  "Blocked at the server fetch layer with HTTP 403, so this feed stays disabled to protect ingestion reliability.";

function buildGdeltApiUrl(query: string, maxRecords = 25) {
  const searchParams = new URLSearchParams({
    format: "json",
    maxrecords: String(maxRecords),
    mode: "artlist",
    query,
  });

  return `https://api.gdeltproject.org/api/v2/doc/doc?${searchParams.toString()}`;
}

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
      source_type: "rss",
      feed_url: "https://www.moneycontrol.com/rss/marketreports.xml",
      api_url: null,
      homepage_url: "https://www.moneycontrol.com/",
      reliability_score: 78,
      is_enabled: false,
      fetch_interval_minutes: 30,
      content_category: "market_news",
      disabledReason: BLOCKED_MONEYCONTROL_REASON,
    },
    {
      name: "Moneycontrol Business RSS",
      slug: "moneycontrol-business-rss",
      source_type: "rss",
      feed_url: "https://www.moneycontrol.com/rss/business.xml",
      api_url: null,
      homepage_url: "https://www.moneycontrol.com/",
      reliability_score: 76,
      is_enabled: false,
      fetch_interval_minutes: 30,
      content_category: "company_news",
      disabledReason: BLOCKED_MONEYCONTROL_REASON,
    },
    {
      name: "SEBI Press Releases RSS",
      slug: "sebi-press-releases-rss",
      source_type: "rss",
      feed_url: "https://www.sebi.gov.in/sebirss.xml",
      api_url: null,
      homepage_url: "https://www.sebi.gov.in/",
      reliability_score: 92,
      is_enabled: true,
      fetch_interval_minutes: 60,
      content_category: "regulatory",
    },
    {
      name: "Economic Times Markets RSS",
      slug: "economic-times-markets-rss",
      source_type: "rss",
      feed_url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
      api_url: null,
      homepage_url: "https://economictimes.indiatimes.com/markets",
      reliability_score: 84,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "market_news",
    },
    {
      name: "LiveMint Markets RSS",
      slug: "livemint-markets-rss",
      source_type: "rss",
      feed_url: "https://www.livemint.com/rss/markets",
      api_url: null,
      homepage_url: "https://www.livemint.com/market",
      reliability_score: 81,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "market_news",
    },
    {
      name: "BusinessLine Markets RSS",
      slug: "businessline-markets-rss",
      source_type: "rss",
      feed_url: "https://www.thehindubusinessline.com/markets/feeder/default.rss",
      api_url: null,
      homepage_url: "https://www.thehindubusinessline.com/markets/",
      reliability_score: 83,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "market_news",
    },
    {
      name: "BusinessLine Companies RSS",
      slug: "businessline-companies-rss",
      source_type: "rss",
      feed_url: "https://www.thehindubusinessline.com/companies/feeder/default.rss",
      api_url: null,
      homepage_url: "https://www.thehindubusinessline.com/companies/",
      reliability_score: 85,
      is_enabled: true,
      fetch_interval_minutes: 20,
      content_category: "company_news",
    },
    {
      name: "GDELT India Company News API",
      slug: "gdelt-india-company-news-api",
      source_type: "api",
      feed_url: null,
      api_url: buildGdeltApiUrl(
        "(india OR nse OR bse) AND (company OR shares OR stock OR results OR acquisition OR stake OR order win)",
      ),
      homepage_url: "https://www.gdeltproject.org/",
      reliability_score: 68,
      is_enabled: false,
      fetch_interval_minutes: 30,
      content_category: "company_news",
      disabledReason:
        "Supported in code, but disabled because the Node server fetch path is currently failing against GDELT in local ingestion runs.",
    },
    {
      name: "GDELT India Macro and Markets API",
      slug: "gdelt-india-macro-markets-api",
      source_type: "api",
      feed_url: null,
      api_url: buildGdeltApiUrl(
        "(india) AND (\"stock market\" OR nifty OR sensex OR rupee OR inflation OR rbi OR gdp)",
      ),
      homepage_url: "https://www.gdeltproject.org/",
      reliability_score: 66,
      is_enabled: false,
      fetch_interval_minutes: 45,
      content_category: "macro",
      disabledReason:
        "Supported in code, but disabled because the Node server fetch path is currently failing against GDELT in local ingestion runs.",
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
    reliability_score: 80,
    is_enabled: Boolean(finnhubGeneralUrl),
    fetch_interval_minutes: 20,
    content_category: "market_news",
    requiresEnv: "FINNHUB_API_KEY",
    disabledReason: finnhubGeneralUrl
      ? null
      : "Requires FINNHUB_API_KEY before the source can be enabled.",
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
    reliability_score: 72,
    is_enabled: Boolean(newsApiBusinessUrl),
    fetch_interval_minutes: 30,
    content_category: "company_news",
    requiresEnv: "NEWSAPI_KEY",
    disabledReason: newsApiBusinessUrl
      ? null
      : "Requires NEWSAPI_KEY before the source can be enabled.",
  });

  return fallbackSources;
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

function dedupeSkippedSources(
  skippedSources: MarketNewsSourceRegistry["skippedSources"],
) {
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
    contentCategory: metadata?.content_category ?? "market_news",
    disabledReason: metadata?.disabledReason ?? null,
  };
}

function getRuntimeDisableReason(
  source: MarketNewsSourceRecord,
  metadata: MarketNewsRuntimeSourceSeed | undefined,
) {
  if (metadata && !metadata.is_enabled) {
    return metadata.disabledReason ?? "Disabled in the Market News runtime registry.";
  }

  if (metadata?.requiresEnv && !process.env[metadata.requiresEnv]?.trim()) {
    return metadata.disabledReason ?? `Requires ${metadata.requiresEnv} before this source can run.`;
  }

  if (!source.is_enabled) {
    return "Disabled in the Market News source registry.";
  }

  return null;
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
    for (const source of fallbackSources) {
      if (source.is_enabled) {
        continue;
      }

      skippedSources.push({
        name: source.name,
        slug: source.slug,
        reason: source.disabledReason ?? "Disabled in the Market News runtime registry.",
      });
    }

    return {
      mode: "database",
      sources: allowedSources,
      skippedSources: dedupeSkippedSources(skippedSources),
    };
  }

  const seededRows = await seedMarketNewsSources(fallbackSources.filter((source) => source.is_enabled));

  return {
    mode: "fallback_seed",
    sources: seededRows
      .map((source) =>
        toConfiguredSource(source, true, runtimeMetadataBySlug.get(source.slug)),
      )
      .filter((source) => !source.disabledReason),
    skippedSources: dedupeSkippedSources(
      fallbackSources
        .filter((source) => !source.is_enabled)
        .map((source) => ({
          name: source.name,
          slug: source.slug,
          reason: source.disabledReason ?? "Disabled in the Market News runtime registry.",
        })),
    ),
  };
}
