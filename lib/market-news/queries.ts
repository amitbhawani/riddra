import { getNewsImageForArticle } from "@/lib/market-news/images";
import { sanitizeMarketNewsEditorialCopy } from "@/lib/market-news/formatting";
import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import type {
  MarketNewsAdminArticleRecord,
  MarketNewsAdminDashboardState,
  MarketNewsAdminFailedRewriteItem,
  MarketNewsAdminIngestionRun,
  MarketNewsAdminSourceRecord,
  MarketNewsArticleFilters,
  MarketNewsArticleEntityRecord,
  MarketNewsArticleImageRecord,
  MarketNewsArticleRecord,
  MarketNewsArticleStatus,
  MarketNewsFilterOptions,
  MarketNewsSourceDraftInput,
  MarketNewsNormalizedCategory,
  MarketNewsArticleWithRelations,
  MarketNewsIngestionRunRecord,
  MarketNewsRewriteLogRecord,
  MarketNewsRawItemRecord,
  MarketNewsSourceRecord,
  MarketNewsSourceTestResult,
  MarketNewsSourceType,
  MarketNewsJsonValue,
} from "@/lib/market-news/types";

export type MarketNewsSourceSeed = {
  name: string;
  slug: string;
  source_type: MarketNewsSourceType;
  feed_url: string | null;
  api_url: string | null;
  homepage_url: string | null;
  category?: string | null;
  region?: string | null;
  reliability_score: number;
  is_enabled: boolean;
  fetch_interval_minutes: number;
  last_checked_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  detected_feed_url?: string | null;
  notes?: string | null;
  disabledReason?: string | null;
};

export type InsertMarketNewsRawItemInput = {
  source_id: string;
  source_name: string;
  original_title: string;
  original_excerpt: string | null;
  source_url: string;
  canonical_url: string | null;
  source_published_at: string | null;
  fetched_at: string;
  raw_payload: MarketNewsJsonValue;
  image_url: string | null;
  content_hash: string;
  duplicate_group_id?: string | null;
  status?: MarketNewsRawItemRecord["status"];
};

export type UpdateMarketNewsIngestionRunInput = {
  finished_at: string;
  status: string;
  fetched_count: number;
  inserted_count: number;
  duplicate_count: number;
  failed_count: number;
  error_message: string | null;
};

export type InsertMarketNewsArticleInput = {
  raw_item_id?: string | null;
  slug: string;
  original_title: string;
  rewritten_title: string | null;
  short_summary: string | null;
  summary: string | null;
  impact_note: string | null;
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  fetched_at: string | null;
  published_at?: string | null;
  status: MarketNewsArticleRecord["status"];
  category: MarketNewsNormalizedCategory | null;
  impact_label: MarketNewsArticleRecord["impact_label"];
  sentiment: string | null;
  language?: string | null;
  image_url: string | null;
  fallback_image_url: string | null;
  image_alt_text: string | null;
  canonical_url: string | null;
  duplicate_group_id?: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string[];
  author_name: string | null;
  author_slug: string | null;
};

export type InsertMarketNewsArticleEntityInput = {
  article_id: string;
  entity_type: MarketNewsArticleEntityRecord["entity_type"];
  entity_slug: string;
  symbol: string | null;
  display_name: string;
  sector_slug: string | null;
  relevance_score: number;
};

export type InsertMarketNewsArticleImageInput = {
  article_id?: string | null;
  raw_item_id?: string | null;
  source_image_url: string | null;
  local_image_url?: string | null;
  fallback_image_url: string | null;
  image_alt_text: string | null;
  image_credit: string | null;
  image_status: string;
};

export type InsertMarketNewsRewriteLogInput = {
  raw_item_id: string;
  article_id?: string | null;
  model: string | null;
  status: string;
  input_tokens?: number;
  output_tokens?: number;
  error_message: string | null;
};

export type InsertMarketNewsAnalyticsEventInput = {
  article_id: string;
  event_type: string;
  entity_type?: MarketNewsArticleEntityRecord["entity_type"] | null;
  entity_slug?: string | null;
  referrer?: string | null;
};

export type MarketNewsPublishedSitemapEntry = {
  slug: string;
  published_at: string;
  updated_at: string;
};

export type MarketNewsGoogleNewsSitemapEntry = {
  slug: string;
  title: string;
  published_at: string;
  updated_at: string;
  image_url: string | null;
  keywords: string[];
  entity_names: string[];
  entity_symbols: string[];
};

export type MarketNewsEntityArticleLookup = {
  articles: MarketNewsArticleWithRelations[];
  matchedEntityType:
    | "stock"
    | "sector"
    | "mutual_fund"
    | "etf"
    | "ipo"
    | "index"
    | "market"
    | null;
  usedSectorFallback: boolean;
  usedEntityFallback: boolean;
  usedKeywordFallback: boolean;
  usedIpoFallback: boolean;
  usedLatestFallback: boolean;
};

function requireMarketNewsAdminClient() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are required for market news ingestion.");
  }

  return createSupabaseAdminClient();
}

function getMarketNewsReadClient() {
  if (!hasRuntimeSupabaseEnv()) {
    return null;
  }

  return createSupabaseReadClient();
}

const PUBLIC_MARKET_NEWS_STATUSES: MarketNewsArticleStatus[] = ["ready", "published"];
const PUBLIC_MARKET_NEWS_READ_CACHE_TTL_MS = 60_000;

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const marketNewsArticlesCache = new Map<string, TimedCacheEntry<MarketNewsArticleWithRelations[]>>();
const dailyMarketBriefArticlesCache = new Map<string, TimedCacheEntry<MarketNewsArticleWithRelations[]>>();
const marketNewsFilterOptionsCache = new Map<number, TimedCacheEntry<MarketNewsFilterOptions>>();

function readTimedCache<T>(cache: Map<string | number, TimedCacheEntry<T>>, key: string | number) {
  const cached = cache.get(key);

  if (!cached) {
    return { hit: false as const, value: null };
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return { hit: false as const, value: null };
  }

  return { hit: true as const, value: cached.value };
}

function writeTimedCache<T>(cache: Map<string | number, TimedCacheEntry<T>>, key: string | number, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + PUBLIC_MARKET_NEWS_READ_CACHE_TTL_MS,
  });
}

type MarketNewsCandidateEntity = Pick<
  MarketNewsArticleEntityRecord,
  | "id"
  | "article_id"
  | "entity_type"
  | "entity_slug"
  | "symbol"
  | "display_name"
  | "sector_slug"
  | "relevance_score"
  | "created_at"
>;

type MarketNewsArticleCandidateRow = Pick<
  MarketNewsArticleRecord,
  | "id"
  | "slug"
  | "original_title"
  | "rewritten_title"
  | "short_summary"
  | "summary"
  | "source_name"
  | "source_url"
  | "source_published_at"
  | "published_at"
  | "category"
  | "impact_label"
  | "image_url"
  | "fallback_image_url"
  | "image_alt_text"
  | "canonical_url"
  | "duplicate_group_id"
  | "created_at"
  | "updated_at"
> & {
  entities: MarketNewsCandidateEntity[];
  source_reliability_score: number | null;
  importance_score: number;
  uses_fallback_image: boolean;
};

const MARKET_NEWS_ARTICLE_CANDIDATE_SELECT = [
  "id",
  "slug",
  "original_title",
  "rewritten_title",
  "short_summary",
  "summary",
  "source_name",
  "source_url",
  "source_published_at",
  "published_at",
  "category",
  "impact_label",
  "image_url",
  "fallback_image_url",
  "image_alt_text",
  "canonical_url",
  "duplicate_group_id",
  "created_at",
  "updated_at",
].join(", ");

function getArticleTimestampValue(
  article: Pick<
    MarketNewsArticleRecord,
    "published_at" | "source_published_at" | "created_at"
  >,
) {
  return article.published_at ?? article.source_published_at ?? article.created_at;
}

function getArticleRecencyTimestamp(
  article: Pick<
    MarketNewsArticleRecord,
    "published_at" | "source_published_at" | "created_at"
  >,
) {
  return Date.parse(getArticleTimestampValue(article) ?? "");
}

function normalizeSourceReliabilityScore(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  const numericValue = Number(value);

  if (numericValue > 1) {
    return Math.min(Math.max(numericValue / 100, 0), 1);
  }

  return Math.min(Math.max(numericValue, 0), 1);
}

const LOW_VALUE_MARKET_NEWS_PATTERNS = [
  /\b(sponsored|sponsor(ed)? content|advertorial|partner content|paid post|paid content|promotion|promoted)\b/i,
  /\b(opinion|op-ed|editorial|guest column|column)\b/i,
  /\btop\s+\d+\b/i,
  /\b\d+\s+(stocks?|things|reasons|ways)\b/i,
  /\b(best|top)\s+(stocks?|mutual funds?|etfs?)\s+to\s+(buy|watch)\b/i,
];

const LOW_VALUE_MARKET_NEWS_SOURCE_PATTERNS = [
  /\/blog(s)?\//i,
  /\/opinion(s)?\//i,
  /\/editorial\//i,
  /\bblog\b/i,
];

const MINOR_UPDATE_MARKET_NEWS_PATTERNS = [
  /\b(live update|live coverage|minute[- ]by[- ]minute|live blog|liveblog)\b/i,
  /\b(opening bell|closing bell|pre[- ]open|post[- ]market|market wrap|mid[- ]session|midday update)\b/i,
  /\b(top gainers|top losers|stocks to watch|buzzing stocks|opening trade|closing trade|watchlist)\b/i,
];

const REPETITIVE_MARKET_NEWS_PATTERNS = [
  /\b(update|updates|outlook|highlights|recap|roundup)\b/i,
  /\b(week ahead|morning briefing|market check|market live)\b/i,
];

const MAJOR_MACRO_MARKET_NEWS_PATTERNS = [
  /\b(rbi|repo rate|inflation|gdp|fiscal deficit|budget|policy|fomc|tariff|crude oil|bond yields?)\b/i,
];

const MARKET_NEWS_TOPIC_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "amid",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "its",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "after",
  "before",
  "despite",
  "over",
  "under",
  "says",
  "say",
  "said",
  "report",
  "reports",
  "reported",
  "update",
  "updates",
  "market",
  "markets",
  "news",
]);

const MARKET_NEWS_EVENT_TOKEN_GROUPS = [
  ["profit", "earning", "result", "ebita", "ebitda", "margin"],
  ["revenue", "sale", "growth"],
  ["ipo", "listing", "issue"],
  ["regulatory", "order", "circular", "appeal", "compliance"],
  ["acquisition", "merger", "deal", "buyout"],
  ["funding", "fundraise", "investment"],
];

function buildMarketNewsQualityText(
  article: Pick<
    MarketNewsArticleRecord,
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
  > & {
    entities?: readonly unknown[];
  },
) {
  return [
    article.rewritten_title,
    article.original_title,
    article.short_summary,
    article.summary,
    article.source_name,
    article.source_url,
    article.canonical_url,
    article.category,
    article.impact_label,
    ...(article.entities ?? []).flatMap((entity) => {
      if (!entity || typeof entity !== "object") {
        return [] as string[];
      }

      const record = entity as Record<string, unknown>;
      const displayName =
        typeof record.display_name === "string" ? record.display_name : "";
      const symbol = typeof record.symbol === "string" ? record.symbol : "";

      return [displayName, symbol];
    }),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

function normalizeMarketNewsCategoryForRanking(
  article: Pick<
    MarketNewsArticleRecord,
    "category" | "impact_label" | "rewritten_title" | "original_title" | "short_summary" | "summary"
  >,
) {
  const contextText = buildMarketNewsQualityText({
    ...article,
    source_name: "",
    source_url: "",
    canonical_url: "",
  });

  if (/\b(earnings|results|quarterly results|q1|q2|q3|q4|fy\d{2})\b/.test(contextText)) {
    return "earnings" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(ipo|listing|public issue)\b/.test(contextText)) {
    return "ipo" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(sebi|regulatory|order|circular|tribunal|court|appeal|compliance)\b/.test(contextText)) {
    return "regulatory" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(economy|inflation|gdp|rbi|policy|macro)\b/.test(contextText)) {
    return "macro" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(company news|company_news|companies|corporate action|corporate update|board|dividend)\b/.test(contextText)) {
    return "corporate_action" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(merger|acquisition|acquire|deal|buyout)\b/.test(contextText)) {
    return "acquisition" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(funding|fundraise|investment round|raised capital)\b/.test(contextText)) {
    return "funding" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(mutual fund|amc|scheme|fund house)\b/.test(contextText)) {
    return "mutual_fund" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(bitcoin|ethereum|crypto|cryptocurrency)\b/.test(contextText)) {
    return "crypto" satisfies MarketNewsNormalizedCategory;
  }

  if (/\b(markets|market update|market_news|nifty|sensex|bank nifty|fii|dii)\b/.test(contextText)) {
    return "markets" satisfies MarketNewsNormalizedCategory;
  }

  return "general_business" satisfies MarketNewsNormalizedCategory;
}

function getMarketNewsImportanceScore(
  article: Pick<
    MarketNewsArticleRecord,
    "category" | "impact_label" | "rewritten_title" | "original_title" | "short_summary" | "summary"
  > & {
    entities: readonly Pick<MarketNewsArticleEntityRecord, "entity_type" | "symbol">[];
  },
) {
  let score = 10;
  const normalizedCategory = normalizeMarketNewsCategoryForRanking(article);
  const impactLabel = String(article.impact_label ?? "").trim().toLowerCase();
  const hasStockEntity = article.entities.some((entity) => entity.entity_type === "stock");

  if (hasStockEntity) {
    score += 100;
  }

  if (normalizedCategory === "earnings" || impactLabel === "results") {
    score += 80;
  }

  if (normalizedCategory === "ipo" || impactLabel === "ipo") {
    score += 70;
  }

  if (normalizedCategory === "regulatory" || impactLabel === "regulatory") {
    score += 50;
  }

  if (
    normalizedCategory === "macro" ||
    impactLabel === "macro" ||
    MAJOR_MACRO_MARKET_NEWS_PATTERNS.some((pattern) =>
      pattern.test(buildMarketNewsQualityText({ ...article, source_name: "", source_url: "", canonical_url: "" })),
    )
  ) {
    score += 40;
  }

  return score;
}

function isLowValueMarketNewsArticle(
  article: Pick<
    MarketNewsArticleRecord,
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
  > & {
    entities: readonly Pick<MarketNewsArticleEntityRecord, "entity_type" | "display_name" | "symbol">[];
  },
) {
  const qualityText = buildMarketNewsQualityText(article);
  const normalizedCategory = normalizeMarketNewsCategoryForRanking(article);
  const hasStockEntity = article.entities.some((entity) => entity.entity_type === "stock");
  const hasHighPriorityCategory =
    normalizedCategory === "earnings" ||
    normalizedCategory === "ipo" ||
    normalizedCategory === "regulatory" ||
    normalizedCategory === "macro";

  if (LOW_VALUE_MARKET_NEWS_PATTERNS.some((pattern) => pattern.test(qualityText))) {
    return !hasStockEntity && !hasHighPriorityCategory;
  }

  if (LOW_VALUE_MARKET_NEWS_SOURCE_PATTERNS.some((pattern) => pattern.test(qualityText))) {
    return !hasStockEntity && normalizedCategory === "general_business";
  }

  return false;
}

function getMarketNewsMinorUpdatePenaltyScore(
  article: Pick<
    MarketNewsArticleRecord,
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
  > & {
    entities: readonly Pick<MarketNewsArticleEntityRecord, "entity_type">[];
  },
) {
  const qualityText = buildMarketNewsQualityText(article);
  let penalty = 0;

  if (MINOR_UPDATE_MARKET_NEWS_PATTERNS.some((pattern) => pattern.test(qualityText))) {
    penalty += 28;
  }

  if (REPETITIVE_MARKET_NEWS_PATTERNS.some((pattern) => pattern.test(qualityText))) {
    penalty += 14;
  }

  const normalizedCategory = normalizeMarketNewsCategoryForRanking(article);
  const hasStockEntity = article.entities.some((entity) => entity.entity_type === "stock");

  if (!hasStockEntity && normalizedCategory === "markets") {
    penalty += 10;
  }

  return penalty;
}

function getArticleReliabilityBoostMs(article: Pick<MarketNewsArticleWithRelations, "source_reliability_score">) {
  return normalizeSourceReliabilityScore(article.source_reliability_score) * 45 * 60 * 1000;
}

function getArticleImportanceBoostMs(article: Pick<MarketNewsArticleWithRelations, "importance_score">) {
  return Math.min(Math.max(article.importance_score, 0), 240) * 18 * 60 * 1000;
}

function getArticleMinorUpdatePenaltyMs(
  article: Pick<
    MarketNewsArticleWithRelations,
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
    | "entities"
  >,
) {
  return getMarketNewsMinorUpdatePenaltyScore(article) * 30 * 60 * 1000;
}

function getPublicListingScore(
  article: Pick<
    MarketNewsArticleWithRelations,
    | "published_at"
    | "source_published_at"
    | "created_at"
    | "source_reliability_score"
    | "importance_score"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
    | "entities"
  >,
) {
  const recencyTimestamp = getArticleRecencyTimestamp(article);

  if (!Number.isFinite(recencyTimestamp)) {
    return (
      getArticleReliabilityBoostMs(article) +
      getArticleImportanceBoostMs(article) -
      getArticleMinorUpdatePenaltyMs(article)
    );
  }

  return (
    recencyTimestamp +
    getArticleReliabilityBoostMs(article) +
    getArticleImportanceBoostMs(article) -
    getArticleMinorUpdatePenaltyMs(article)
  );
}

function comparePublicListingArticles(
  left: Pick<
    MarketNewsArticleWithRelations,
    | "published_at"
    | "source_published_at"
    | "created_at"
    | "source_reliability_score"
    | "importance_score"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
    | "entities"
  >,
  right: Pick<
    MarketNewsArticleWithRelations,
    | "published_at"
    | "source_published_at"
    | "created_at"
    | "source_reliability_score"
    | "importance_score"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
    | "entities"
  >,
) {
  const scoreDelta = getPublicListingScore(right) - getPublicListingScore(left);

  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return String(getArticleTimestampValue(right)).localeCompare(String(getArticleTimestampValue(left)));
}

function dedupeMarketNewsArticlesByDuplicateGroup<
  T extends Pick<
    MarketNewsArticleWithRelations,
    | "duplicate_group_id"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "entities"
  >,
>(
  articles: readonly T[],
  limit?: number,
) {
  const deduped: T[] = [];
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(Math.trunc(limit), 0)
      : null;

  for (const article of articles) {
    const isDuplicate = deduped.some((existing) =>
      areMarketNewsArticlesNearDuplicates(existing, article),
    );

    if (!isDuplicate) {
      deduped.push(article);

      if (safeLimit !== null && deduped.length >= safeLimit) {
        break;
      }
    }
  }

  if (safeLimit !== null) {
    return deduped.slice(0, safeLimit);
  }

  return deduped;
}

export function excludeNearDuplicateMarketNewsArticles<
  T extends Pick<
    MarketNewsArticleWithRelations,
    | "duplicate_group_id"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "entities"
  >,
>(
  articles: readonly T[],
  existingArticles: readonly Pick<
    MarketNewsArticleWithRelations,
    | "duplicate_group_id"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "entities"
  >[],
) {
  if (!existingArticles.length) {
    return [...articles];
  }

  return articles.filter(
    (article) => !existingArticles.some((existingArticle) => areMarketNewsArticlesNearDuplicates(existingArticle, article)),
  );
}

function normalizeLooseFilterValue(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeMarketNewsTopicToken(token: string) {
  let normalized = token.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  normalized = normalized.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");

  if (!normalized) {
    return "";
  }

  if (/^q[1-4]$/.test(normalized) || /^fy\d{2,4}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d+(\.\d+)?%?$/.test(normalized)) {
    return "";
  }

  if (normalized.endsWith("ies") && normalized.length > 5) {
    normalized = `${normalized.slice(0, -3)}y`;
  } else if (normalized.endsWith("ing") && normalized.length > 5) {
    normalized = normalized.slice(0, -3);
  } else if (normalized.endsWith("ed") && normalized.length > 4) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("es") && normalized.length > 4) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("s") && normalized.length > 4) {
    normalized = normalized.slice(0, -1);
  }

  if (normalized.length < 3) {
    return "";
  }

  if (MARKET_NEWS_TOPIC_STOPWORDS.has(normalized)) {
    return "";
  }

  return normalized;
}

function getMarketNewsTopicTokens(
  article: Pick<
    MarketNewsArticleWithRelations,
    "rewritten_title" | "original_title" | "short_summary" | "summary" | "entities"
  >,
) {
  const titleText = [article.rewritten_title, article.original_title]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const entityText = article.entities
    .map((entity) => `${entity.display_name} ${entity.symbol ?? ""} ${entity.entity_slug}`)
    .join(" ");

  const tokens = `${titleText} ${entityText}`
    .split(/[^a-zA-Z0-9%]+/)
    .map(normalizeMarketNewsTopicToken)
    .filter(Boolean);

  return Array.from(new Set(tokens)).slice(0, 12);
}

function getMarketNewsPrimaryEntityKey(
  article: Pick<MarketNewsArticleWithRelations, "entities">,
) {
  const preferredEntity =
    article.entities.find((entity) => entity.entity_type === "stock") ??
    article.entities.find((entity) => entity.entity_type === "ipo") ??
    article.entities.find((entity) => entity.entity_type === "sector") ??
    article.entities[0] ??
    null;

  if (!preferredEntity) {
    return "";
  }

  return `${preferredEntity.entity_type}:${preferredEntity.entity_slug}`.trim();
}

function getMarketNewsTopicOverlap(
  leftTokens: readonly string[],
  rightTokens: readonly string[],
) {
  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const rightSet = new Set(rightTokens);
  let shared = 0;

  for (const token of leftTokens) {
    if (rightSet.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.min(leftTokens.length, rightTokens.length);
}

function getMarketNewsSharedTokenCount(
  leftTokens: readonly string[],
  rightTokens: readonly string[],
) {
  const rightSet = new Set(rightTokens);
  return leftTokens.reduce((count, token) => count + (rightSet.has(token) ? 1 : 0), 0);
}

function hasMatchingMarketNewsEventTokens(
  leftTokens: readonly string[],
  rightTokens: readonly string[],
) {
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);

  return MARKET_NEWS_EVENT_TOKEN_GROUPS.some((group) => {
    const leftMatch = group.some((token) => leftSet.has(token));
    const rightMatch = group.some((token) => rightSet.has(token));
    return leftMatch && rightMatch;
  });
}

function hasMatchingQuarterToken(
  leftTokens: readonly string[],
  rightTokens: readonly string[],
) {
  const quarterTokenPattern = /^(q[1-4]|fy\d{2,4})$/;
  const leftQuarterTokens = leftTokens.filter((token) => quarterTokenPattern.test(token));

  if (!leftQuarterTokens.length) {
    return false;
  }

  const rightSet = new Set(rightTokens);
  return leftQuarterTokens.some((token) => rightSet.has(token));
}

function areMarketNewsArticlesNearDuplicates(
  left: Pick<
    MarketNewsArticleWithRelations,
    | "duplicate_group_id"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "entities"
  >,
  right: Pick<
    MarketNewsArticleWithRelations,
    | "duplicate_group_id"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "entities"
  >,
) {
  const leftDuplicateGroupId = normalizeLooseFilterValue(left.duplicate_group_id);
  const rightDuplicateGroupId = normalizeLooseFilterValue(right.duplicate_group_id);

  if (leftDuplicateGroupId && rightDuplicateGroupId && leftDuplicateGroupId === rightDuplicateGroupId) {
    return true;
  }

  const leftPrimaryEntityKey = getMarketNewsPrimaryEntityKey(left);
  const rightPrimaryEntityKey = getMarketNewsPrimaryEntityKey(right);
  const samePrimaryEntity =
    leftPrimaryEntityKey.length > 0 && leftPrimaryEntityKey === rightPrimaryEntityKey;

  const leftTokens = getMarketNewsTopicTokens(left);
  const rightTokens = getMarketNewsTopicTokens(right);
  const overlap = getMarketNewsTopicOverlap(leftTokens, rightTokens);
  const sharedTokenCount = getMarketNewsSharedTokenCount(leftTokens, rightTokens);

  if (samePrimaryEntity && overlap >= 0.55 && sharedTokenCount >= 3) {
    return true;
  }

  if (
    samePrimaryEntity &&
    sharedTokenCount >= 2 &&
    hasMatchingQuarterToken(leftTokens, rightTokens) &&
    hasMatchingMarketNewsEventTokens(leftTokens, rightTokens)
  ) {
    return true;
  }

  return overlap >= 0.72 && sharedTokenCount >= 4;
}

function titleCaseFromSlug(value: string) {
  return value
    .split("-")
    .map((part) => (part ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : ""))
    .join(" ")
    .trim();
}

function normalizeMarketNewsArticleFilters(
  input?: number | MarketNewsArticleFilters,
): Required<MarketNewsArticleFilters> {
  if (typeof input === "number") {
    const safeLimit = Number.isFinite(input) ? Math.min(Math.max(Math.trunc(input), 1), 60) : 24;

    return {
      limit: safeLimit,
      company: "",
      sector: "",
      category: "",
      impactLabel: "",
    };
  }

  return {
    limit:
      typeof input?.limit === "number" && Number.isFinite(input.limit)
        ? Math.min(Math.max(Math.trunc(input.limit), 1), 60)
        : 24,
    company: normalizeLooseFilterValue(input?.company),
    sector: normalizeLooseFilterValue(input?.sector),
    category: normalizeLooseFilterValue(input?.category),
    impactLabel: normalizeLooseFilterValue(input?.impactLabel),
  };
}

function buildMarketNewsArticleCacheKey(filters: Required<MarketNewsArticleFilters>) {
  return JSON.stringify(filters);
}

export async function listEnabledMarketNewsSources() {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_sources")
    .select("*")
    .eq("is_enabled", true)
    .order("reliability_score", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load market news sources: ${error.message}`);
  }

  return (data ?? []) as MarketNewsSourceRecord[];
}

export async function listMarketNewsSources() {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_sources")
    .select("*")
    .order("is_enabled", { ascending: false })
    .order("reliability_score", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load market news sources: ${error.message}`);
  }

  return (data ?? []) as MarketNewsSourceRecord[];
}

export async function findMarketNewsSourceById(sourceId: string) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load market news source: ${error.message}`);
  }

  return (data as MarketNewsSourceRecord | null) ?? null;
}

function slugifyMarketNewsSource(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalSourceText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function sanitizeMarketNewsSourcePayload(
  input: MarketNewsSourceDraftInput & {
    slug?: string | null;
    source_type?: MarketNewsSourceType;
    fetch_interval_minutes?: number | null;
    last_checked_at?: string | null;
    last_status?: string | null;
    last_error?: string | null;
    detected_feed_url?: string | null;
  },
) {
  const derivedSlug = slugifyMarketNewsSource(
    input.slug ||
      input.name ||
      normalizeOptionalSourceText(input.homepage_url)?.replace(/^https?:\/\//, "") ||
      "market-news-source",
  );
  const safeFeedUrl = normalizeOptionalSourceText(input.feed_url);
  const safeApiUrl = normalizeOptionalSourceText(input.api_url);
  const safeHomepageUrl = normalizeOptionalSourceText(input.homepage_url);
  const derivedSourceType = input.source_type
    ? input.source_type
    : safeApiUrl
      ? "api"
      : safeFeedUrl
        ? "rss"
        : "candidate";
  const reliabilityScore = Number.isFinite(input.reliability_score)
    ? Math.min(Math.max(Math.round(input.reliability_score), 0), 100)
    : 70;
  const fetchIntervalMinutes =
    typeof input.fetch_interval_minutes === "number" && Number.isFinite(input.fetch_interval_minutes)
      ? Math.min(Math.max(Math.trunc(input.fetch_interval_minutes), 5), 1440)
      : 30;

  return {
    name: String(input.name ?? "").trim().slice(0, 160),
    slug: derivedSlug,
    source_type: derivedSourceType,
    feed_url: safeFeedUrl,
    api_url: safeApiUrl,
    homepage_url: safeHomepageUrl,
    category: normalizeOptionalSourceText(input.category)?.slice(0, 80) ?? null,
    region: normalizeOptionalSourceText(input.region)?.slice(0, 80) ?? null,
    reliability_score: reliabilityScore,
    is_enabled: Boolean(input.is_enabled),
    fetch_interval_minutes: fetchIntervalMinutes,
    last_checked_at: normalizeOptionalSourceText(input.last_checked_at),
    last_status: normalizeOptionalSourceText(input.last_status)?.slice(0, 80) ?? null,
    last_error: normalizeOptionalSourceText(input.last_error)?.slice(0, 500) ?? null,
    detected_feed_url: normalizeOptionalSourceText(input.detected_feed_url),
    notes: normalizeOptionalSourceText(input.notes)?.slice(0, 1000) ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function saveMarketNewsSource(
  input: MarketNewsSourceDraftInput & {
    slug?: string | null;
    source_type?: MarketNewsSourceType;
    fetch_interval_minutes?: number | null;
    last_checked_at?: string | null;
    last_status?: string | null;
    last_error?: string | null;
    detected_feed_url?: string | null;
  },
) {
  const supabase = requireMarketNewsAdminClient();
  const payload = sanitizeMarketNewsSourcePayload(input);

  if (!payload.name) {
    throw new Error("Source name is required.");
  }

  if (!payload.slug) {
    throw new Error("Source slug could not be derived.");
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("market_news_sources")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Unable to update market news source: ${error.message}`);
    }

    return data as MarketNewsSourceRecord;
  }

  const { data, error } = await supabase
    .from("market_news_sources")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create market news source: ${error.message}`);
  }

  return data as MarketNewsSourceRecord;
}

export async function setMarketNewsSourceEnabled(sourceId: string, isEnabled: boolean) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_sources")
    .update({
      is_enabled: isEnabled,
      last_status: isEnabled ? "enabled" : "disabled",
      last_error: isEnabled ? null : "Disabled from the admin source console.",
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update market news source state: ${error.message}`);
  }

  return data as MarketNewsSourceRecord;
}

export async function softDisableMarketNewsSource(
  sourceId: string,
  reason = "Disabled from the admin source console.",
) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_sources")
    .update({
      is_enabled: false,
      last_checked_at: new Date().toISOString(),
      last_status: "disabled",
      last_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to disable market news source: ${error.message}`);
  }

  return data as MarketNewsSourceRecord;
}

export async function updateMarketNewsSourceHealth(
  sourceId: string,
  payload: Partial<
    Pick<
      MarketNewsSourceRecord,
      | "feed_url"
      | "detected_feed_url"
      | "is_enabled"
      | "last_checked_at"
      | "last_error"
      | "last_status"
      | "notes"
      | "source_type"
    >
  >,
) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_sources")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update market news source health: ${error.message}`);
  }

  return data as MarketNewsSourceRecord;
}

export async function applyMarketNewsSourceTestResult(
  sourceId: string,
  result: MarketNewsSourceTestResult,
) {
  const nextStatus = result.classification;
  const nextSourceType =
    result.classification === "blocked"
      ? "blocked"
      : result.feedUrl || result.detectedFeedUrl
        ? "rss"
        : result.sourceType;

  return updateMarketNewsSourceHealth(sourceId, {
    source_type: nextSourceType,
    feed_url: result.feedUrl || result.detectedFeedUrl || null,
    detected_feed_url: result.detectedFeedUrl,
    last_checked_at: new Date().toISOString(),
    last_status: nextStatus,
    last_error: result.errorMessage,
    is_enabled:
      result.classification === "working" && Boolean(result.feedUrl || result.detectedFeedUrl),
  });
}

export async function seedMarketNewsSources(sources: readonly MarketNewsSourceSeed[]) {
  const supabase = requireMarketNewsAdminClient();
  const payload = sources.map((source) => ({
    name: source.name,
    slug: source.slug,
    source_type: source.source_type,
    feed_url: source.feed_url,
    api_url: source.api_url,
    homepage_url: source.homepage_url,
    category: source.category ?? null,
    region: source.region ?? null,
    reliability_score: source.reliability_score,
    is_enabled: source.is_enabled,
    fetch_interval_minutes: source.fetch_interval_minutes,
    last_checked_at: source.last_checked_at ?? null,
    last_status: source.last_status ?? null,
    last_error: source.last_error ?? null,
    detected_feed_url: source.detected_feed_url ?? null,
    notes: source.notes ?? source.disabledReason ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("market_news_sources")
    .upsert(payload, { onConflict: "slug" })
    .select("*");

  if (error) {
    throw new Error(`Unable to seed market news fallback sources: ${error.message}`);
  }

  return (data ?? []) as MarketNewsSourceRecord[];
}

export async function syncMissingMarketNewsSources(sources: readonly MarketNewsSourceSeed[]) {
  if (!sources.length) {
    return [] as MarketNewsSourceRecord[];
  }

  const supabase = requireMarketNewsAdminClient();
  const slugs = Array.from(new Set(sources.map((source) => source.slug)));
  const payload = sources.map((source) => ({
    name: source.name,
    slug: source.slug,
    source_type: source.source_type,
    feed_url: source.feed_url,
    api_url: source.api_url,
    homepage_url: source.homepage_url,
    category: source.category ?? null,
    region: source.region ?? null,
    reliability_score: source.reliability_score,
    is_enabled: source.is_enabled,
    fetch_interval_minutes: source.fetch_interval_minutes,
    last_checked_at: source.last_checked_at ?? null,
    last_status: source.last_status ?? null,
    last_error: source.last_error ?? null,
    detected_feed_url: source.detected_feed_url ?? null,
    notes: source.notes ?? source.disabledReason ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from("market_news_sources")
    .upsert(payload, { onConflict: "slug" });

  if (upsertError) {
    throw new Error(`Unable to sync market news source registry: ${upsertError.message}`);
  }

  const { data, error } = await supabase
    .from("market_news_sources")
    .select("*")
    .in("slug", slugs)
    .order("reliability_score", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load synced market news sources: ${error.message}`);
  }

  return (data ?? []) as MarketNewsSourceRecord[];
}

export async function importMissingMarketNewsSources(sources: readonly MarketNewsSourceSeed[]) {
  if (!sources.length) {
    return {
      inserted: [] as MarketNewsSourceRecord[],
      skipped: [] as MarketNewsSourceRecord[],
    };
  }

  const supabase = requireMarketNewsAdminClient();
  const candidateSlugs = Array.from(new Set(sources.map((source) => source.slug)));
  const { data: existingData, error: existingError } = await supabase
    .from("market_news_sources")
    .select("*")
    .in("slug", candidateSlugs);

  if (existingError) {
    throw new Error(`Unable to inspect existing market news sources: ${existingError.message}`);
  }

  const existingBySlug = new Map(
    ((existingData ?? []) as MarketNewsSourceRecord[]).map((source) => [source.slug, source]),
  );
  const missingSources = sources.filter((source) => !existingBySlug.has(source.slug));

  if (!missingSources.length) {
    return {
      inserted: [] as MarketNewsSourceRecord[],
      skipped: Array.from(existingBySlug.values()),
    };
  }

  const payload = missingSources.map((source) => ({
    name: source.name,
    slug: source.slug,
    source_type: source.source_type,
    feed_url: source.feed_url,
    api_url: source.api_url,
    homepage_url: source.homepage_url,
    category: source.category ?? null,
    region: source.region ?? null,
    reliability_score: source.reliability_score,
    is_enabled: source.is_enabled,
    fetch_interval_minutes: source.fetch_interval_minutes,
    last_checked_at: source.last_checked_at ?? null,
    last_status: source.last_status ?? null,
    last_error: source.last_error ?? null,
    detected_feed_url: source.detected_feed_url ?? null,
    notes: source.notes ?? source.disabledReason ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("market_news_sources")
    .insert(payload)
    .select("*");

  if (error) {
    throw new Error(`Unable to import missing market news sources: ${error.message}`);
  }

  return {
    inserted: (data ?? []) as MarketNewsSourceRecord[],
    skipped: Array.from(existingBySlug.values()),
  };
}

export async function createMarketNewsIngestionRun(sourceId: string, status = "running") {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_ingestion_runs")
    .insert({
      source_id: sourceId,
      started_at: new Date().toISOString(),
      status,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create market news ingestion run: ${error.message}`);
  }

  return data as MarketNewsIngestionRunRecord;
}

export async function findRecentInProgressMarketNewsIngestionRun(windowMinutes = 10) {
  const supabase = requireMarketNewsAdminClient();
  const safeWindowMinutes = Number.isFinite(windowMinutes)
    ? Math.min(Math.max(Math.trunc(windowMinutes), 1), 120)
    : 10;
  const cutoffIso = new Date(Date.now() - safeWindowMinutes * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("market_news_ingestion_runs")
    .select("*")
    .in("status", ["running", "pipeline_running"])
    .gte("started_at", cutoffIso)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Unable to load in-progress market news ingestion runs: ${error.message}`);
  }

  return ((data ?? [])[0] as MarketNewsIngestionRunRecord | undefined) ?? null;
}

export async function logSkippedMarketNewsIngestionRun(sourceId: string, reason: string) {
  const supabase = requireMarketNewsAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("market_news_ingestion_runs")
    .insert({
      source_id: sourceId,
      started_at: now,
      finished_at: now,
      status: "skipped",
      fetched_count: 0,
      inserted_count: 0,
      duplicate_count: 0,
      failed_count: 0,
      error_message: reason,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to log skipped market news ingestion run: ${error.message}`);
  }

  return data as MarketNewsIngestionRunRecord;
}

export async function finalizeMarketNewsIngestionRun(
  runId: string,
  payload: UpdateMarketNewsIngestionRunInput,
) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_ingestion_runs")
    .update(payload)
    .eq("id", runId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to finalize market news ingestion run: ${error.message}`);
  }

  return data as MarketNewsIngestionRunRecord;
}

async function findExistingRawItemByField(
  field: "source_url" | "canonical_url" | "content_hash",
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_raw_items")
    .select("id, duplicate_group_id, source_url, canonical_url, content_hash")
    .eq(field, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check existing market news raw items: ${error.message}`);
  }

  return data as Pick<
    MarketNewsRawItemRecord,
    "id" | "duplicate_group_id" | "source_url" | "canonical_url" | "content_hash"
  > | null;
}

export async function findExistingMarketNewsRawItem(input: {
  sourceUrl: string;
  canonicalUrl: string | null;
  contentHash: string;
}) {
  return (
    (await findExistingRawItemByField("content_hash", input.contentHash)) ??
    (await findExistingRawItemByField("source_url", input.sourceUrl)) ??
    (await findExistingRawItemByField("canonical_url", input.canonicalUrl))
  );
}

export async function insertMarketNewsRawItem(input: InsertMarketNewsRawItemInput) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_raw_items")
    .insert({
      ...input,
      duplicate_group_id: input.duplicate_group_id ?? null,
      status: input.status ?? "new",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to insert market news raw item: ${error.message}`);
  }

  return data as MarketNewsRawItemRecord;
}

export async function listMarketNewsRawItemsForRewrite(
  limit: number,
  options?: { retryFailed?: boolean },
) {
  const supabase = requireMarketNewsAdminClient();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 10;
  const statuses = options?.retryFailed ? ["new", "failed"] : ["new"];
  const { data, error } = await supabase
    .from("market_news_raw_items")
    .select("*")
    .in("status", statuses)
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Unable to list market news raw items for rewrite: ${error.message}`);
  }

  return (data ?? []) as MarketNewsRawItemRecord[];
}

export async function findMarketNewsArticleBySlug(slug: string) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_articles")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check market news article slug: ${error.message}`);
  }

  return (data as Pick<MarketNewsArticleRecord, "id" | "slug"> | null) ?? null;
}

export async function insertMarketNewsArticle(input: InsertMarketNewsArticleInput) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_articles")
    .insert({
      ...input,
      raw_item_id: input.raw_item_id ?? null,
      published_at: input.published_at ?? null,
      language: input.language ?? "en",
      duplicate_group_id: input.duplicate_group_id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to insert market news article: ${error.message}`);
  }

  return data as MarketNewsArticleRecord;
}

export async function insertMarketNewsArticleEntities(
  inputs: readonly InsertMarketNewsArticleEntityInput[],
) {
  if (!inputs.length) {
    return [] as MarketNewsArticleEntityRecord[];
  }

  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_article_entities")
    .insert(inputs)
    .select("*");

  if (error) {
    throw new Error(`Unable to insert market news article entities: ${error.message}`);
  }

  return (data ?? []) as MarketNewsArticleEntityRecord[];
}

export async function insertMarketNewsArticleImage(input: InsertMarketNewsArticleImageInput) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_article_images")
    .insert({
      article_id: input.article_id ?? null,
      raw_item_id: input.raw_item_id ?? null,
      source_image_url: input.source_image_url,
      local_image_url: input.local_image_url ?? null,
      fallback_image_url: input.fallback_image_url,
      image_alt_text: input.image_alt_text,
      image_credit: input.image_credit,
      image_status: input.image_status,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to insert market news article image: ${error.message}`);
  }

  return data as MarketNewsArticleImageRecord;
}

export async function insertMarketNewsRewriteLog(input: InsertMarketNewsRewriteLogInput) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_rewrite_logs")
    .insert({
      raw_item_id: input.raw_item_id,
      article_id: input.article_id ?? null,
      model: input.model,
      status: input.status,
      input_tokens: input.input_tokens ?? 0,
      output_tokens: input.output_tokens ?? 0,
      error_message: input.error_message,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to insert market news rewrite log: ${error.message}`);
  }

  return data as MarketNewsRewriteLogRecord;
}

export async function insertMarketNewsAnalyticsEvent(input: InsertMarketNewsAnalyticsEventInput) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_analytics_events")
    .insert({
      article_id: input.article_id,
      event_type: input.event_type,
      entity_type: input.entity_type ?? null,
      entity_slug: input.entity_slug ?? null,
      referrer: input.referrer ?? null,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to insert market news analytics event: ${error.message}`);
  }

  return data;
}

export async function updateMarketNewsRawItemStatus(
  rawItemId: string,
  status: MarketNewsRawItemRecord["status"],
) {
  const supabase = requireMarketNewsAdminClient();
  const { data, error } = await supabase
    .from("market_news_raw_items")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rawItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update market news raw item status: ${error.message}`);
  }

  return data as MarketNewsRawItemRecord;
}

async function hydrateMarketNewsArticles(
  articles: readonly MarketNewsArticleRecord[],
  client?: ReturnType<typeof createSupabaseAdminClient> | ReturnType<typeof createSupabaseReadClient> | null,
) {
  if (!articles.length) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const supabase = client ?? getMarketNewsReadClient();

  if (!supabase) {
    return articles.map((article) => {
      const sanitizedArticle = {
        ...article,
        short_summary: sanitizeMarketNewsEditorialCopy(article.short_summary),
        summary: sanitizeMarketNewsEditorialCopy(article.summary),
        impact_note: sanitizeMarketNewsEditorialCopy(article.impact_note),
      };
      const resolvedImage = getNewsImageForArticle(article, null);

      return {
        ...sanitizedArticle,
        entities: [],
        image: null,
        display_image_url: resolvedImage.displayImageUrl,
        image_display_alt_text: resolvedImage.altText,
        uses_fallback_image: resolvedImage.usesFallback,
        source_reliability_score: null,
        importance_score: getMarketNewsImportanceScore({
          ...sanitizedArticle,
          entities: [],
        }),
      };
    });
  }

  const articleIds = articles.map((article) => article.id);
  const sourceNames = Array.from(
    new Set(
      articles
        .map((article) => normalizeLooseFilterValue(article.source_name))
        .filter(Boolean),
    ),
  );
  const [{ data: entitiesData, error: entitiesError }, { data: imagesData, error: imagesError }] =
    await Promise.all([
      supabase
        .from("market_news_article_entities")
        .select("*")
        .in("article_id", articleIds)
        .order("relevance_score", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("market_news_article_images")
        .select("*")
        .in("article_id", articleIds)
        .order("created_at", { ascending: true }),
    ]);

  if (entitiesError) {
    throw new Error(`Unable to load market news article entities: ${entitiesError.message}`);
  }

  if (imagesError) {
    throw new Error(`Unable to load market news article images: ${imagesError.message}`);
  }

  const entityMap = new Map<string, MarketNewsArticleEntityRecord[]>();
  const imageMap = new Map<string, MarketNewsArticleImageRecord>();
  const sourceReliabilityMap = new Map<string, number | null>();

  if (sourceNames.length) {
    const { data: sourceData, error: sourceError } = await supabase
      .from("market_news_sources")
      .select("name, reliability_score")
      .in("name", sourceNames);

    if (sourceError) {
      throw new Error(`Unable to load market news source reliability scores: ${sourceError.message}`);
    }

    for (const source of (sourceData ?? []) as Array<{ name: string; reliability_score: number | null }>) {
      sourceReliabilityMap.set(String(source.name).trim(), source.reliability_score ?? null);
    }
  }

  for (const entity of (entitiesData ?? []) as MarketNewsArticleEntityRecord[]) {
    const existing = entityMap.get(entity.article_id) ?? [];
    existing.push(entity);
    entityMap.set(entity.article_id, existing);
  }

  for (const image of (imagesData ?? []) as MarketNewsArticleImageRecord[]) {
    if (image.article_id && !imageMap.has(image.article_id)) {
      imageMap.set(image.article_id, image);
    }
  }

  return articles.map((article) => {
    const sanitizedArticle = {
      ...article,
      short_summary: sanitizeMarketNewsEditorialCopy(article.short_summary),
      summary: sanitizeMarketNewsEditorialCopy(article.summary),
      impact_note: sanitizeMarketNewsEditorialCopy(article.impact_note),
    };
    const image = imageMap.get(article.id) ?? null;
    const resolvedImage = getNewsImageForArticle(article, image);
    const normalizedSourceName = normalizeLooseFilterValue(article.source_name);
    const sourceReliabilityScore = normalizedSourceName
      ? sourceReliabilityMap.get(normalizedSourceName) ?? null
      : null;

    return {
      ...sanitizedArticle,
      entities: entityMap.get(article.id) ?? [],
      image,
      display_image_url: resolvedImage.displayImageUrl,
      image_display_alt_text: resolvedImage.altText,
      uses_fallback_image: resolvedImage.usesFallback,
      source_reliability_score: sourceReliabilityScore,
      importance_score: getMarketNewsImportanceScore({
        ...sanitizedArticle,
        entities: entityMap.get(article.id) ?? [],
      }),
    };
  });
}

function decorateAdminArticles(
  articles: readonly MarketNewsArticleWithRelations[],
): MarketNewsAdminArticleRecord[] {
  return articles.map((article) => ({
    ...article,
    internal_url: `/markets/news/${article.slug}`,
  }));
}

function sortArticlesByRecency<
  T extends Pick<
    MarketNewsArticleWithRelations,
    | "published_at"
    | "source_published_at"
    | "created_at"
    | "source_reliability_score"
    | "importance_score"
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "category"
    | "impact_label"
    | "entities"
    | "uses_fallback_image"
  >,
>(
  articles: readonly T[],
) {
  return [...articles].sort((left, right) => {
    const leftTimestamp = getArticleRecencyTimestamp(left);
    const rightTimestamp = getArticleRecencyTimestamp(right);

    if (Number.isFinite(leftTimestamp) || Number.isFinite(rightTimestamp)) {
      if (rightTimestamp !== leftTimestamp) {
        return rightTimestamp - leftTimestamp;
      }
    }

    if (right.importance_score !== left.importance_score) {
      return right.importance_score - left.importance_score;
    }

    const reliabilityDelta =
      normalizeSourceReliabilityScore(right.source_reliability_score) -
      normalizeSourceReliabilityScore(left.source_reliability_score);

    if (reliabilityDelta !== 0) {
      return reliabilityDelta;
    }

    if (left.uses_fallback_image !== right.uses_fallback_image) {
      return left.uses_fallback_image ? 1 : -1;
    }

    return comparePublicListingArticles(left, right);
  });
}

async function listMarketNewsArticleIdsByEntityMatch(input: {
  entityType: "stock" | "sector" | "mutual_fund" | "etf" | "ipo" | "index" | "market";
  entitySlug: string;
  symbol?: string | null;
}) {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as string[];
  }

  const normalizedSlug = input.entitySlug.trim();
  const normalizedSymbol = input.symbol?.trim().toUpperCase() ?? "";

  const queries = [
    supabase
      .from("market_news_article_entities")
      .select("article_id")
      .eq("entity_type", input.entityType)
      .eq("entity_slug", normalizedSlug),
  ];

  if (input.entityType === "stock" && normalizedSymbol) {
    queries.push(
      supabase
        .from("market_news_article_entities")
        .select("article_id")
        .eq("entity_type", input.entityType)
        .eq("symbol", normalizedSymbol),
    );
  }

  const results = await Promise.all(queries);
  const articleIds = new Set<string>();

  for (const result of results) {
    if (result.error) {
      throw new Error(`Unable to load market news entity matches: ${result.error.message}`);
    }

    for (const row of result.data ?? []) {
      if (row.article_id) {
        articleIds.add(String(row.article_id));
      }
    }
  }

  return Array.from(articleIds);
}

function intersectArticleIdSets(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((articleId) => rightSet.has(articleId));
}

async function listMarketNewsArticleIdsBySectorFilter(sectorSlug: string) {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as string[];
  }

  const normalizedSector = sectorSlug.trim().toLowerCase();

  if (!normalizedSector) {
    return [] as string[];
  }

  const [directSectorResult, stockSectorResult] = await Promise.all([
    supabase
      .from("market_news_article_entities")
      .select("article_id")
      .eq("entity_type", "sector")
      .eq("entity_slug", normalizedSector),
    supabase
      .from("market_news_article_entities")
      .select("article_id")
      .eq("entity_type", "stock")
      .eq("sector_slug", normalizedSector),
  ]);

  if (directSectorResult.error) {
    throw new Error(`Unable to load sector market news matches: ${directSectorResult.error.message}`);
  }

  if (stockSectorResult.error) {
    throw new Error(`Unable to load stock sector market news matches: ${stockSectorResult.error.message}`);
  }

  const articleIds = new Set<string>();

  for (const result of [directSectorResult, stockSectorResult]) {
    for (const row of result.data ?? []) {
      if (row.article_id) {
        articleIds.add(String(row.article_id));
      }
    }
  }

  return Array.from(articleIds);
}

async function listMarketNewsArticleIdsForFilters(filters: Required<MarketNewsArticleFilters>) {
  let constrainedArticleIds: string[] | null = null;

  if (filters.company) {
    const companyArticleIds = await listMarketNewsArticleIdsByEntityMatch({
      entityType: "stock",
      entitySlug: filters.company.toLowerCase(),
    });

    constrainedArticleIds = companyArticleIds;
  }

  if (filters.sector) {
    const sectorArticleIds = await listMarketNewsArticleIdsBySectorFilter(filters.sector);

    constrainedArticleIds =
      constrainedArticleIds === null
        ? sectorArticleIds
        : intersectArticleIdSets(constrainedArticleIds, sectorArticleIds);
  }

  return constrainedArticleIds;
}

function buildMarketNewsSearchText(article: MarketNewsArticleWithRelations) {
  return [
    article.rewritten_title,
    article.original_title,
    article.short_summary,
    article.summary,
    article.source_name,
    article.category,
    article.impact_label,
    ...article.entities.map((entity) => entity.display_name),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

async function searchRecentMarketNewsArticlesByKeywords(
  keywords: readonly string[],
  limit: number,
) {
  const safeKeywords = Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length >= 3),
    ),
  );

  if (!safeKeywords.length) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const recentArticles = await getMarketNewsArticles(Math.max(limit * 10, 50));

  return recentArticles
    .map((article) => {
      const haystack = buildMarketNewsSearchText(article);
      const score = safeKeywords.reduce((total, keyword) => {
        if (!haystack.includes(keyword)) {
          return total;
        }

        const exactTitleHit =
          article.rewritten_title?.toLowerCase().includes(keyword) ||
          article.original_title?.toLowerCase().includes(keyword);

        return total + (exactTitleHit ? 4 : 1);
      }, 0);

      return {
        article,
        score,
        recency: article.published_at ?? article.source_published_at ?? article.created_at,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return String(right.recency).localeCompare(String(left.recency));
    })
    .slice(0, limit)
    .map((item) => item.article);
}

async function getLatestIpoCategoryMarketNews(limit: number) {
  const recentArticles = await getMarketNewsArticles(Math.max(limit * 8, 40));

  return recentArticles
    .filter((article) => {
      const category = String(article.category ?? "").trim().toLowerCase();
      const impactLabel = String(article.impact_label ?? "").trim().toLowerCase();
      return impactLabel === "ipo" || category === "ipo";
    })
    .slice(0, limit);
}

async function listMarketNewsArticlesByIds(articleIds: readonly string[], limit: number) {
  if (!articleIds.length) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 24) : 5;
  const { data, error } = await supabase
    .from("market_news_articles")
    .select("*")
    .in("id", [...articleIds])
    .in("status", PUBLIC_MARKET_NEWS_STATUSES);

  if (error) {
    throw new Error(`Unable to load market news articles by entity: ${error.message}`);
  }

  const hydrated = await hydrateMarketNewsArticles((data ?? []) as MarketNewsArticleRecord[]);
  return sortArticlesByRecency(hydrated).slice(0, safeLimit);
}

function getMarketNewsHydrationCandidateLimit(limit: number) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 60) : 24;
  return Math.min(Math.max(safeLimit * 3, 18), Math.min(Math.max(safeLimit * 5, 40), 240));
}

async function buildMarketNewsArticleCandidates(
  supabase: ReturnType<typeof createSupabaseReadClient>,
  filters: Required<MarketNewsArticleFilters>,
  constrainedArticleIds: string[] | null,
) {
  let query = supabase
    .from("market_news_articles")
    .select(MARKET_NEWS_ARTICLE_CANDIDATE_SELECT)
    .in("status", PUBLIC_MARKET_NEWS_STATUSES);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.impactLabel) {
    query = query.eq("impact_label", filters.impactLabel);
  }

  if (constrainedArticleIds) {
    query = query.in("id", constrainedArticleIds);
  }

  const candidateWindow = Math.min(Math.max(filters.limit * 5, 40), 240);
  const { data, error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(candidateWindow);

  if (error) {
    throw new Error(`Unable to load market news articles: ${error.message}`);
  }

  const articleRows = (data ?? []) as unknown as Array<
    Pick<
      MarketNewsArticleRecord,
      | "id"
      | "slug"
      | "original_title"
      | "rewritten_title"
      | "short_summary"
      | "summary"
      | "source_name"
      | "source_url"
      | "source_published_at"
      | "published_at"
      | "category"
      | "impact_label"
      | "image_url"
      | "fallback_image_url"
      | "image_alt_text"
      | "canonical_url"
      | "duplicate_group_id"
      | "created_at"
      | "updated_at"
    >
  >;

  if (!articleRows.length) {
    return [] as MarketNewsArticleCandidateRow[];
  }

  const articleIds = articleRows.map((article) => article.id);
  const sourceNames = Array.from(
    new Set(
      articleRows
        .map((article) => normalizeLooseFilterValue(article.source_name))
        .filter(Boolean),
    ),
  );

  const [{ data: entityData, error: entityError }, { data: sourceData, error: sourceError }] =
    await Promise.all([
      supabase
        .from("market_news_article_entities")
        .select(
          "id, article_id, entity_type, entity_slug, symbol, display_name, sector_slug, relevance_score, created_at",
        )
        .in("article_id", articleIds)
        .order("relevance_score", { ascending: false })
        .order("created_at", { ascending: true }),
      sourceNames.length
        ? supabase
            .from("market_news_sources")
            .select("name, reliability_score")
            .in("name", sourceNames)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (entityError) {
    throw new Error(`Unable to load market news article entities: ${entityError.message}`);
  }

  if (sourceError) {
    throw new Error(`Unable to load market news source reliability scores: ${sourceError.message}`);
  }

  const entityMap = new Map<string, MarketNewsCandidateEntity[]>();
  const sourceReliabilityMap = new Map<string, number | null>();

  for (const entity of (entityData ?? []) as MarketNewsCandidateEntity[]) {
    const existing = entityMap.get(entity.article_id) ?? [];
    existing.push(entity);
    entityMap.set(entity.article_id, existing);
  }

  for (const source of (sourceData ?? []) as Array<{ name: string; reliability_score: number | null }>) {
    sourceReliabilityMap.set(String(source.name).trim(), source.reliability_score ?? null);
  }

  return articleRows.map((article) => {
    const entities = entityMap.get(article.id) ?? [];
    const resolvedImage = getNewsImageForArticle(article, null);
    const normalizedSourceName = normalizeLooseFilterValue(article.source_name);
    const sourceReliabilityScore = normalizedSourceName
      ? sourceReliabilityMap.get(normalizedSourceName) ?? null
      : null;

    return {
      ...article,
      entities,
      source_reliability_score: sourceReliabilityScore,
      importance_score: getMarketNewsImportanceScore({
        ...article,
        entities,
      }),
      uses_fallback_image: resolvedImage.usesFallback,
    } satisfies MarketNewsArticleCandidateRow;
  });
}

export async function getMarketNewsArticles(input?: number | MarketNewsArticleFilters) {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const filters = normalizeMarketNewsArticleFilters(input);
  const cacheKey = buildMarketNewsArticleCacheKey(filters);
  const cached = readTimedCache(marketNewsArticlesCache, cacheKey);

  if (cached.hit) {
    return cached.value;
  }

  const constrainedArticleIds = await listMarketNewsArticleIdsForFilters(filters);

  if (constrainedArticleIds && !constrainedArticleIds.length) {
    writeTimedCache(marketNewsArticlesCache, cacheKey, []);
    return [] as MarketNewsArticleWithRelations[];
  }

  const candidates = await buildMarketNewsArticleCandidates(
    supabase,
    filters,
    constrainedArticleIds,
  );
  const candidateLimit = getMarketNewsHydrationCandidateLimit(filters.limit);
  const shortlistedIds = dedupeMarketNewsArticlesByDuplicateGroup(
    sortArticlesByRecency<MarketNewsArticleCandidateRow>(
      candidates.filter((article) => !isLowValueMarketNewsArticle(article)),
    ),
    candidateLimit,
  ).map((article) => article.id);

  if (!shortlistedIds.length) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const { data, error } = await supabase
    .from("market_news_articles")
    .select("*")
    .in("id", shortlistedIds)
    .in("status", PUBLIC_MARKET_NEWS_STATUSES);

  if (error) {
    throw new Error(`Unable to load market news article details: ${error.message}`);
  }

  const hydrated = await hydrateMarketNewsArticles((data ?? []) as MarketNewsArticleRecord[]);
  const hydratedById = new Map(hydrated.map((article) => [article.id, article]));
  const orderedHydrated = shortlistedIds
    .map((articleId) => hydratedById.get(articleId) ?? null)
    .filter((article): article is MarketNewsArticleWithRelations => article !== null);
  const curated = sortArticlesByRecency(
    orderedHydrated.filter((article) => !isLowValueMarketNewsArticle(article)),
  );

  const deduped = dedupeMarketNewsArticlesByDuplicateGroup(curated, filters.limit);
  writeTimedCache(marketNewsArticlesCache, cacheKey, deduped);
  return deduped;
}

export async function getPublishedMarketNewsSitemapEntries() {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsPublishedSitemapEntry[];
  }

  const { data, error } = await supabase
    .from("market_news_articles")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load published market news sitemap entries: ${error.message}`);
  }

  return (data ?? []) as MarketNewsPublishedSitemapEntry[];
}

export async function getPublishedGoogleNewsSitemapEntries(hoursWindow = 48) {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsGoogleNewsSitemapEntry[];
  }

  const safeWindowHours = Number.isFinite(hoursWindow)
    ? Math.min(Math.max(Math.trunc(hoursWindow), 1), 168)
    : 48;
  const cutoffIso = new Date(Date.now() - safeWindowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("market_news_articles")
    .select("*")
    .eq("status", "published")
    .gte("published_at", cutoffIso)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(240);

  if (error) {
    throw new Error(`Unable to load Google News sitemap entries: ${error.message}`);
  }

  const hydrated = dedupeMarketNewsArticlesByDuplicateGroup(
    await hydrateMarketNewsArticles((data ?? []) as MarketNewsArticleRecord[]),
  );

  return hydrated.map((article) => ({
    slug: article.slug,
    title: article.rewritten_title || article.original_title,
    published_at: article.published_at || article.source_published_at || article.created_at,
    updated_at: article.updated_at,
    image_url: article.uses_fallback_image ? null : article.display_image_url,
    keywords: article.keywords ?? [],
    entity_names: article.entities.map((entity) => entity.display_name).filter(Boolean),
    entity_symbols: article.entities.map((entity) => entity.symbol ?? "").filter(Boolean),
  })) satisfies MarketNewsGoogleNewsSitemapEntry[];
}

function getMarketNewsTopStoryScore(article: MarketNewsArticleWithRelations) {
  // TODO: Replace with full ML ranking later.
  let score = article.importance_score;

  score += normalizeSourceReliabilityScore(article.source_reliability_score) * 15;

  if (article.impact_note?.trim()) {
    score += 4;
  }

  if (!article.uses_fallback_image) {
    score += 5;
  }

  score -= getMarketNewsMinorUpdatePenaltyScore(article);

  return score;
}

function getMarketNewsAgePenalty(article: Pick<MarketNewsArticleRecord, "published_at" | "source_published_at" | "created_at">) {
  const publishedTimestamp = getArticleRecencyTimestamp(article);

  if (!Number.isFinite(publishedTimestamp)) {
    return 0;
  }

  const ageHours = Math.max(0, (Date.now() - publishedTimestamp) / (1000 * 60 * 60));
  return ageHours * 0.5;
}

function getMarketNewsRecencyDecayBoost(article: Pick<MarketNewsArticleRecord, "published_at" | "source_published_at" | "created_at">) {
  const publishedTimestamp = getArticleRecencyTimestamp(article);

  if (!Number.isFinite(publishedTimestamp)) {
    return 0;
  }

  const ageHours = Math.max(0, (Date.now() - publishedTimestamp) / (1000 * 60 * 60));
  const decayFactor = Math.exp(-ageHours / 36);

  return decayFactor * 10;
}

async function getMarketNewsClickMetrics(
  articleIds: readonly string[],
  options?: {
    includeInternalAnalytics?: boolean;
  },
) {
  if (!articleIds.length) {
    return new Map<string, { clicks24h: number; clicks7d: number }>();
  }

  if (!options?.includeInternalAnalytics || !hasRuntimeSupabaseAdminEnv()) {
    return new Map<string, { clicks24h: number; clicks7d: number }>();
  }

  const supabase = requireMarketNewsAdminClient();

  if (!supabase) {
    return new Map<string, { clicks24h: number; clicks7d: number }>();
  }

  const now = Date.now();
  const lastSevenDaysIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const lastTwentyFourHoursCutoff = now - 24 * 60 * 60 * 1000;

  const { data, error } = await supabase
    .from("market_news_analytics_events")
    .select("article_id, created_at")
    .eq("event_type", "click")
    .in("article_id", [...articleIds])
    .gte("created_at", lastSevenDaysIso);

  if (error) {
    throw new Error(`Unable to load market news analytics events: ${error.message}`);
  }

  const metrics = new Map<string, { clicks24h: number; clicks7d: number }>();

  for (const row of data ?? []) {
    const articleId = String(row.article_id ?? "").trim();

    if (!articleId) {
      continue;
    }

    const createdAt = Date.parse(String(row.created_at ?? ""));
    const existing = metrics.get(articleId) ?? { clicks24h: 0, clicks7d: 0 };

    existing.clicks7d += 1;

    if (Number.isFinite(createdAt) && createdAt >= lastTwentyFourHoursCutoff) {
      existing.clicks24h += 1;
    }

    metrics.set(articleId, existing);
  }

  return metrics;
}

function getMarketNewsTrendingScore(
  article: MarketNewsArticleWithRelations,
  metrics?: { clicks24h: number; clicks7d: number } | null,
) {
  const clickMetrics = metrics ?? { clicks24h: 0, clicks7d: 0 };

  return (
    clickMetrics.clicks24h * 5 +
    clickMetrics.clicks7d * 2 -
    getMarketNewsAgePenalty(article) +
    getMarketNewsRecencyDecayBoost(article) +
    normalizeSourceReliabilityScore(article.source_reliability_score) * 4 +
    article.importance_score * 0.8 -
    getMarketNewsMinorUpdatePenaltyScore(article)
  );
}

function isMarketNewsArticleWithinLastHours(
  article: Pick<MarketNewsArticleRecord, "published_at" | "source_published_at" | "created_at">,
  hours: number,
) {
  const timestamp = getArticleRecencyTimestamp(article);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp >= Date.now() - hours * 60 * 60 * 1000;
}

function isMarketNewsArticleWithinTimeWindow(
  article: Pick<MarketNewsArticleRecord, "published_at" | "source_published_at" | "created_at">,
  input: {
    fromIso?: string | null;
    toIso?: string | null;
    hoursWindow?: number | null;
  },
) {
  const timestamp = getArticleRecencyTimestamp(article);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const fromTimestamp = input.fromIso ? Date.parse(input.fromIso) : NaN;
  const toTimestamp = input.toIso ? Date.parse(input.toIso) : NaN;

  if (Number.isFinite(fromTimestamp) && timestamp < fromTimestamp) {
    return false;
  }

  if (Number.isFinite(toTimestamp) && timestamp > toTimestamp) {
    return false;
  }

  if (!Number.isFinite(fromTimestamp) && !Number.isFinite(toTimestamp)) {
    return isMarketNewsArticleWithinLastHours(article, input.hoursWindow ?? 24);
  }

  return true;
}

export async function getTopMarketNewsArticles(input?: number | MarketNewsArticleFilters) {
  const filters = normalizeMarketNewsArticleFilters(input);
  const safeLimit = Math.min(Math.max(filters.limit || 3, 1), 12);
  const articles = await getMarketNewsArticles({
    ...filters,
    limit: Math.max(safeLimit * 8, 24),
  });

  const clickMetrics = await getMarketNewsClickMetrics(articles.map((article) => article.id));
  const hasAnalyticsData = Array.from(clickMetrics.values()).some(
    (metric) => metric.clicks24h > 0 || metric.clicks7d > 0,
  );

  if (!hasAnalyticsData) {
    return dedupeMarketNewsArticlesByDuplicateGroup(
      [...articles]
      .sort((left, right) => {
        const scoreDelta = getMarketNewsTopStoryScore(right) - getMarketNewsTopStoryScore(left);

        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return comparePublicListingArticles(left, right);
      }),
      safeLimit,
    );
  }

  return dedupeMarketNewsArticlesByDuplicateGroup(
    [...articles]
    .sort((left, right) => {
      const leftMetrics = clickMetrics.get(left.id) ?? { clicks24h: 0, clicks7d: 0 };
      const rightMetrics = clickMetrics.get(right.id) ?? { clicks24h: 0, clicks7d: 0 };
      const leftScore = getMarketNewsTrendingScore(left, leftMetrics);
      const rightScore = getMarketNewsTrendingScore(right, rightMetrics);
      const scoreDelta = rightScore - leftScore;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return comparePublicListingArticles(left, right);
    }),
    safeLimit,
  );
}

export async function getDailyMarketBriefArticles(
  limit = 5,
  input?: {
    fromIso?: string | null;
    toIso?: string | null;
    hoursWindow?: number | null;
  },
) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 40) : 5;
  const cacheKey = JSON.stringify({
    limit: safeLimit,
    fromIso: String(input?.fromIso ?? "").trim(),
    toIso: String(input?.toIso ?? "").trim(),
    hoursWindow:
      typeof input?.hoursWindow === "number" && Number.isFinite(input.hoursWindow)
        ? Math.trunc(input.hoursWindow)
        : null,
  });
  const cached = readTimedCache(dailyMarketBriefArticlesCache, cacheKey);

  if (cached.hit) {
    return cached.value;
  }

  const candidateArticles = await getMarketNewsArticles({
    limit: Math.max(safeLimit * 10, 40),
  });
  const recentArticles = candidateArticles.filter((article) =>
    isMarketNewsArticleWithinTimeWindow(article, input ?? { hoursWindow: 24 }),
  );

  if (!recentArticles.length) {
    writeTimedCache(dailyMarketBriefArticlesCache, cacheKey, []);
    return [] as MarketNewsArticleWithRelations[];
  }

  const clickMetrics = await getMarketNewsClickMetrics(recentArticles.map((article) => article.id));

  const deduped = dedupeMarketNewsArticlesByDuplicateGroup(
    [...recentArticles]
      .sort((left, right) => {
        const leftScore =
          left.importance_score * 1.1 + getMarketNewsTrendingScore(left, clickMetrics.get(left.id));
        const rightScore =
          right.importance_score * 1.1 + getMarketNewsTrendingScore(right, clickMetrics.get(right.id));
        const scoreDelta = rightScore - leftScore;

        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return comparePublicListingArticles(left, right);
      }),
    safeLimit,
  );

  writeTimedCache(dailyMarketBriefArticlesCache, cacheKey, deduped);
  return deduped;
}

export function buildMarketNewsFilterOptionsFromArticles(
  articles: readonly MarketNewsArticleWithRelations[],
): MarketNewsFilterOptions {
  const companyMap = new Map<string, string>();
  const sectorMap = new Map<string, string>();
  const categorySet = new Set<string>();
  const impactLabelSet = new Set<string>();

  for (const article of articles) {
    if (article.category?.trim()) {
      categorySet.add(article.category.trim());
    }

    if (article.impact_label?.trim()) {
      impactLabelSet.add(article.impact_label.trim());
    }

    for (const entity of article.entities) {
      if (entity.entity_type === "stock" && entity.entity_slug.trim()) {
        companyMap.set(
          entity.entity_slug.trim(),
          entity.display_name.trim() || titleCaseFromSlug(entity.entity_slug.trim()),
        );
      }

      if (entity.entity_type === "sector" && entity.entity_slug.trim()) {
        sectorMap.set(
          entity.entity_slug.trim(),
          entity.display_name.trim() || titleCaseFromSlug(entity.entity_slug.trim()),
        );
      } else if (entity.sector_slug?.trim()) {
        const normalizedSectorSlug = entity.sector_slug.trim();

        if (!sectorMap.has(normalizedSectorSlug)) {
          sectorMap.set(normalizedSectorSlug, titleCaseFromSlug(normalizedSectorSlug));
        }
      }
    }
  }

  const sortOptions = (values: readonly { value: string; label: string }[]) =>
    [...values].sort((left, right) => left.label.localeCompare(right.label));

  return {
    companies: sortOptions(
      Array.from(companyMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ),
    sectors: sortOptions(
      Array.from(sectorMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ),
    categories: sortOptions(
      Array.from(categorySet.values()).map((value) => ({
        value,
        label: value
          .split("_")
          .map((part) => (part ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : ""))
          .join(" ")
          .trim(),
      })),
    ),
    impactLabels: sortOptions(
      Array.from(impactLabelSet.values()).map((value) => ({
        value,
        label: value
          .split("_")
          .map((part) => (part ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : ""))
          .join(" ")
          .trim(),
      })),
    ),
  } satisfies MarketNewsFilterOptions;
}

export async function getMarketNewsFilterOptions(limit = 160) {
  const safeLimit = Math.max(Math.min(Math.max(Math.trunc(limit), 1), 240), 60);
  const cached = readTimedCache(marketNewsFilterOptionsCache, safeLimit);

  if (cached.hit) {
    return cached.value;
  }

  const articles = await getMarketNewsArticles({
    limit: safeLimit,
  });
  const options = buildMarketNewsFilterOptionsFromArticles(articles);

  writeTimedCache(marketNewsFilterOptionsCache, safeLimit, options);
  return options;
}

export async function getMarketNewsArticleBySlug(slug: string) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("market_news_articles")
    .select("*")
    .eq("slug", normalizedSlug)
    .in("status", PUBLIC_MARKET_NEWS_STATUSES)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load market news article "${normalizedSlug}": ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const hydrated = await hydrateMarketNewsArticles([data as MarketNewsArticleRecord]);
  return hydrated[0] ?? null;
}

export async function getRelatedMarketNewsArticles(
  article: MarketNewsArticleWithRelations,
  limit = 4,
) {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 12) : 4;
  const { data, error } = await supabase
    .from("market_news_articles")
    .select("*")
    .in("status", PUBLIC_MARKET_NEWS_STATUSES)
    .neq("id", article.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(safeLimit * 4, 12));

  if (error) {
    throw new Error(`Unable to load related market news articles: ${error.message}`);
  }

  const hydrated = await hydrateMarketNewsArticles((data ?? []) as MarketNewsArticleRecord[]);
  const articleEntityKeys = new Set(
    article.entities.map((entity) => `${entity.entity_type}:${entity.entity_slug}`),
  );

  const ranked = hydrated
    .filter((candidate) => !isLowValueMarketNewsArticle(candidate))
    .map((candidate) => {
      const overlap = candidate.entities.reduce((count, entity) => {
        return count + (articleEntityKeys.has(`${entity.entity_type}:${entity.entity_slug}`) ? 1 : 0);
      }, 0);

      return {
        article: candidate,
        overlap,
        recency:
          candidate.published_at ??
          candidate.source_published_at ??
          candidate.created_at,
      };
    })
    .sort((left, right) => {
      if (right.overlap !== left.overlap) {
        return right.overlap - left.overlap;
      }

      return comparePublicListingArticles(left.article, right.article);
    })
    .map((item) => item.article);

  return dedupeMarketNewsArticlesByDuplicateGroup(ranked, safeLimit);
}

async function listAdminMarketNewsArticlesByStatuses(
  statuses: readonly MarketNewsArticleStatus[],
  limit = 30,
) {
  const supabase = requireMarketNewsAdminClient();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 30;
  const { data, error } = await supabase
    .from("market_news_articles")
    .select("*")
    .in("status", [...statuses])
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Unable to load admin market news articles: ${error.message}`);
  }

  const hydrated = await hydrateMarketNewsArticles((data ?? []) as MarketNewsArticleRecord[], supabase);
  return decorateAdminArticles(hydrated);
}

export async function listFailedMarketNewsRewriteItems(limit = 20) {
  const supabase = requireMarketNewsAdminClient();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 20;
  const { data, error } = await supabase
    .from("market_news_raw_items")
    .select("*")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Unable to load failed market news rewrite items: ${error.message}`);
  }

  const rawItems = (data ?? []) as MarketNewsRawItemRecord[];

  if (!rawItems.length) {
    return [] as MarketNewsAdminFailedRewriteItem[];
  }

  const rawItemIds = rawItems.map((item) => item.id);
  const { data: logsData, error: logsError } = await supabase
    .from("market_news_rewrite_logs")
    .select("*")
    .in("raw_item_id", rawItemIds)
    .order("created_at", { ascending: false });

  if (logsError) {
    throw new Error(`Unable to load market news rewrite logs: ${logsError.message}`);
  }

  const latestLogMap = new Map<string, MarketNewsRewriteLogRecord>();

  for (const log of (logsData ?? []) as MarketNewsRewriteLogRecord[]) {
    if (!latestLogMap.has(log.raw_item_id)) {
      latestLogMap.set(log.raw_item_id, log);
    }
  }

  return rawItems.map((item) => ({
    ...item,
    latest_rewrite_log: latestLogMap.get(item.id) ?? null,
  }));
}

export async function listRecentMarketNewsIngestionRuns(limit = 12) {
  const supabase = requireMarketNewsAdminClient();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 12;
  const { data, error } = await supabase
    .from("market_news_ingestion_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Unable to load market news ingestion runs: ${error.message}`);
  }

  const runs = (data ?? []) as MarketNewsIngestionRunRecord[];

  if (!runs.length) {
    return [] as MarketNewsAdminIngestionRun[];
  }

  const sourceIds = Array.from(new Set(runs.map((run) => run.source_id).filter(Boolean)));
  const { data: sourceData, error: sourceError } = await supabase
    .from("market_news_sources")
    .select("id, name, slug")
    .in("id", sourceIds);

  if (sourceError) {
    throw new Error(`Unable to load market news sources for ingestion runs: ${sourceError.message}`);
  }

  const sourceMap = new Map(
    ((sourceData ?? []) as Pick<MarketNewsSourceRecord, "id" | "name" | "slug">[]).map((source) => [
      source.id,
      source,
    ]),
  );

  return runs.map((run) => {
    const source = sourceMap.get(run.source_id);
    return {
      ...run,
      source_name: source?.name ?? null,
      source_slug: source?.slug ?? null,
    } satisfies MarketNewsAdminIngestionRun;
  });
}

export async function listAdminMarketNewsSources() {
  const [sources, recentRuns] = await Promise.all([
    listMarketNewsSources(),
    listRecentMarketNewsIngestionRuns(120),
  ]);
  const lastRunBySource = new Map<string, MarketNewsAdminIngestionRun>();

  for (const run of recentRuns) {
    if (!run.source_id || lastRunBySource.has(run.source_id)) {
      continue;
    }

    lastRunBySource.set(run.source_id, run);
  }

  return sources.map((source) => {
    const lastRun = lastRunBySource.get(source.id);

    return {
      ...source,
      last_run_status: lastRun?.status ?? null,
      last_run_started_at: lastRun?.started_at ?? null,
      last_run_error: lastRun?.error_message ?? null,
    } satisfies MarketNewsAdminSourceRecord;
  });
}

export async function getAdminMarketNewsDashboardState(): Promise<MarketNewsAdminDashboardState> {
  const [readyArticles, publishedArticles, rejectedArticles, failedRewriteItems, recentIngestionRuns, sources] =
    await Promise.all([
      listAdminMarketNewsArticlesByStatuses(["ready"], 30),
      listAdminMarketNewsArticlesByStatuses(["published"], 30),
      listAdminMarketNewsArticlesByStatuses(["rejected"], 30),
      listFailedMarketNewsRewriteItems(20),
      listRecentMarketNewsIngestionRuns(12),
      listAdminMarketNewsSources(),
    ]);

  return {
    ready_articles: readyArticles,
    published_articles: publishedArticles,
    rejected_articles: rejectedArticles,
    failed_rewrite_items: failedRewriteItems,
    recent_ingestion_runs: recentIngestionRuns,
    sources,
  };
}

export async function updateMarketNewsArticleStatus(input: {
  articleId: string;
  status: Extract<MarketNewsArticleStatus, "ready" | "published" | "rejected">;
}) {
  const supabase = requireMarketNewsAdminClient();
  const nextPublishedAt =
    input.status === "published" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("market_news_articles")
    .update({
      status: input.status,
      published_at: nextPublishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.articleId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update market news article status: ${error.message}`);
  }

  const hydrated = await hydrateMarketNewsArticles([data as MarketNewsArticleRecord], supabase);
  return decorateAdminArticles(hydrated)[0] ?? null;
}

export async function getLatestMarketNewsForEntity(input: {
  entityType: "stock" | "sector" | "mutual_fund" | "etf" | "ipo";
  entitySlug: string;
  symbol?: string | null;
  sectorSlug?: string | null;
  fallbackEntityMatches?: Array<{
    entityType: "sector" | "index" | "market" | "mutual_fund" | "etf" | "ipo";
    entitySlug: string;
    symbol?: string | null;
  }>;
  fallbackKeywords?: string[];
  allowIpoCategoryFallback?: boolean;
  allowLatestFallback?: boolean;
  limit?: number;
}) {
  const safeLimit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.min(Math.max(Math.trunc(input.limit), 1), 12)
      : 5;

  const directIds = await listMarketNewsArticleIdsByEntityMatch({
    entityType: input.entityType,
    entitySlug: input.entitySlug,
    symbol: input.symbol,
  });
  const directArticles = await listMarketNewsArticlesByIds(directIds, safeLimit);

  if (directArticles.length) {
    return {
      articles: directArticles,
      matchedEntityType: input.entityType,
      usedSectorFallback: false,
      usedEntityFallback: false,
      usedKeywordFallback: false,
      usedIpoFallback: false,
      usedLatestFallback: false,
    } satisfies MarketNewsEntityArticleLookup;
  }

  if (input.entityType === "stock") {
    const sectorSlug = input.sectorSlug?.trim() ?? "";

    if (sectorSlug) {
      const sectorIds = await listMarketNewsArticleIdsByEntityMatch({
        entityType: "sector",
        entitySlug: sectorSlug,
      });
      const sectorArticles = await listMarketNewsArticlesByIds(sectorIds, safeLimit);

      if (sectorArticles.length) {
        return {
          articles: sectorArticles,
          matchedEntityType: "sector",
          usedSectorFallback: true,
          usedEntityFallback: false,
          usedKeywordFallback: false,
          usedIpoFallback: false,
          usedLatestFallback: false,
        } satisfies MarketNewsEntityArticleLookup;
      }
    }

    return {
      articles: [],
      matchedEntityType: null,
      usedSectorFallback: false,
      usedEntityFallback: false,
      usedKeywordFallback: false,
      usedIpoFallback: false,
      usedLatestFallback: false,
    } satisfies MarketNewsEntityArticleLookup;
  }

  const fallbackEntityMatches = input.fallbackEntityMatches ?? [];

  for (const fallbackMatch of fallbackEntityMatches) {
    const fallbackIds = await listMarketNewsArticleIdsByEntityMatch({
      entityType: fallbackMatch.entityType,
      entitySlug: fallbackMatch.entitySlug,
      symbol: fallbackMatch.symbol,
    });
    const fallbackArticles = await listMarketNewsArticlesByIds(fallbackIds, safeLimit);

    if (fallbackArticles.length) {
      return {
        articles: fallbackArticles,
        matchedEntityType: fallbackMatch.entityType,
        usedSectorFallback: false,
        usedEntityFallback: true,
        usedKeywordFallback: false,
        usedIpoFallback: false,
        usedLatestFallback: false,
      } satisfies MarketNewsEntityArticleLookup;
    }
  }

  const keywordArticles = await searchRecentMarketNewsArticlesByKeywords(
    input.fallbackKeywords ?? [],
    safeLimit,
  );

  if (keywordArticles.length) {
    return {
      articles: keywordArticles,
      matchedEntityType: "market",
      usedSectorFallback: false,
      usedEntityFallback: false,
      usedKeywordFallback: true,
      usedIpoFallback: false,
      usedLatestFallback: false,
    } satisfies MarketNewsEntityArticleLookup;
  }

  if (input.allowIpoCategoryFallback) {
    const ipoArticles = await getLatestIpoCategoryMarketNews(safeLimit);

    if (ipoArticles.length) {
      return {
        articles: ipoArticles,
        matchedEntityType: "ipo",
        usedSectorFallback: false,
        usedEntityFallback: false,
        usedKeywordFallback: false,
        usedIpoFallback: true,
        usedLatestFallback: false,
      } satisfies MarketNewsEntityArticleLookup;
    }
  }

  const allowLatestFallback = input.entityType === "sector" || input.allowLatestFallback;

  if (allowLatestFallback) {
    const latestArticles = await getMarketNewsArticles(safeLimit);

    return {
      articles: latestArticles.slice(0, safeLimit),
      matchedEntityType: latestArticles.length ? "market" : null,
      usedSectorFallback: false,
      usedEntityFallback: false,
      usedKeywordFallback: false,
      usedIpoFallback: false,
      usedLatestFallback: latestArticles.length > 0,
    } satisfies MarketNewsEntityArticleLookup;
  }

  return {
    articles: [],
    matchedEntityType: null,
    usedSectorFallback: false,
    usedEntityFallback: false,
    usedKeywordFallback: false,
    usedIpoFallback: false,
    usedLatestFallback: false,
  } satisfies MarketNewsEntityArticleLookup;
}
