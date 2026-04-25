export const MARKET_NEWS_SOURCE_TYPES = [
  "rss",
  "api",
  "official",
  "manual",
] as const;

export const MARKET_NEWS_SOURCE_CONTENT_CATEGORIES = [
  "company_news",
  "market_news",
  "regulatory",
  "macro",
  "ipo",
] as const;

export const MARKET_NEWS_RAW_ITEM_STATUSES = [
  "new",
  "duplicate",
  "processed",
  "rejected",
  "failed",
] as const;

export const MARKET_NEWS_ARTICLE_STATUSES = [
  "draft",
  "ready",
  "published",
  "rejected",
  "duplicate",
  "failed_rewrite",
] as const;

export const MARKET_NEWS_IMPACT_LABELS = [
  "positive",
  "negative",
  "neutral",
  "regulatory",
  "results",
  "ipo",
  "macro",
  "fund",
  "corporate_action",
] as const;

export const MARKET_NEWS_ENTITY_TYPES = [
  "stock",
  "mutual_fund",
  "etf",
  "ipo",
  "sector",
  "index",
  "market",
] as const;

export const MARKET_NEWS_FALLBACK_IMAGE_KEYS = [
  "market",
  "stock",
  "mutual_fund",
  "regulatory",
  "ipo",
] as const;

export type MarketNewsSourceType = (typeof MARKET_NEWS_SOURCE_TYPES)[number];
export type MarketNewsSourceContentCategory =
  (typeof MARKET_NEWS_SOURCE_CONTENT_CATEGORIES)[number];
export type MarketNewsRawItemStatus = (typeof MARKET_NEWS_RAW_ITEM_STATUSES)[number];
export type MarketNewsArticleStatus = (typeof MARKET_NEWS_ARTICLE_STATUSES)[number];
export type MarketNewsImpactLabel = (typeof MARKET_NEWS_IMPACT_LABELS)[number];
export type MarketNewsEntityType = (typeof MARKET_NEWS_ENTITY_TYPES)[number];
export type MarketNewsFallbackImageKey = (typeof MARKET_NEWS_FALLBACK_IMAGE_KEYS)[number];

export type MarketNewsId = string;
export type MarketNewsTimestamp = string;

export type MarketNewsJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: MarketNewsJsonValue }
  | MarketNewsJsonValue[];

export type MarketNewsImageContext = {
  title?: string | null;
  excerpt?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  canonicalUrl?: string | null;
  rawPayload?: MarketNewsJsonValue;
  imageUrl?: string | null;
};

export type MarketNewsResolvedImage = {
  imageUrl: string | null;
  fallbackImageUrl: string;
  displayImageUrl: string;
  usesFallback: boolean;
};

export type MarketNewsAiRewritePayload = {
  rewritten_title: string;
  seo_title: string;
  seo_description: string;
  short_summary: string;
  summary: string;
  slug: string;
  category: string;
  impact_label: string;
  sentiment: string;
  companies: string[];
  symbols: string[];
  sectors: string[];
  keywords: string[];
  image_alt_text: string;
  reject: boolean;
  reject_reason: string | null;
};

export type MarketNewsMatchedEntity = {
  entityType: MarketNewsEntityType;
  entitySlug: string;
  symbol: string | null;
  displayName: string;
  sectorSlug: string | null;
  relevanceScore: number;
};

function isMarketNewsEnumValue<T extends readonly string[]>(
  allowedValues: T,
  value: string,
): value is T[number] {
  return (allowedValues as readonly string[]).includes(value);
}

export function isMarketNewsSourceType(value: string): value is MarketNewsSourceType {
  return isMarketNewsEnumValue(MARKET_NEWS_SOURCE_TYPES, value);
}

export function isMarketNewsRawItemStatus(
  value: string,
): value is MarketNewsRawItemStatus {
  return isMarketNewsEnumValue(MARKET_NEWS_RAW_ITEM_STATUSES, value);
}

export function isMarketNewsArticleStatus(
  value: string,
): value is MarketNewsArticleStatus {
  return isMarketNewsEnumValue(MARKET_NEWS_ARTICLE_STATUSES, value);
}

export function isMarketNewsImpactLabel(
  value: string,
): value is MarketNewsImpactLabel {
  return isMarketNewsEnumValue(MARKET_NEWS_IMPACT_LABELS, value);
}

export function isMarketNewsEntityType(
  value: string,
): value is MarketNewsEntityType {
  return isMarketNewsEnumValue(MARKET_NEWS_ENTITY_TYPES, value);
}

export type MarketNewsSourceRecord = {
  id: MarketNewsId;
  name: string;
  slug: string;
  source_type: MarketNewsSourceType;
  feed_url: string | null;
  api_url: string | null;
  homepage_url: string | null;
  reliability_score: number;
  is_enabled: boolean;
  fetch_interval_minutes: number;
  created_at: MarketNewsTimestamp;
  updated_at: MarketNewsTimestamp;
};

export type MarketNewsRawItemRecord = {
  id: MarketNewsId;
  source_id: MarketNewsId;
  source_name: string;
  original_title: string;
  original_excerpt: string | null;
  source_url: string;
  canonical_url: string | null;
  source_published_at: MarketNewsTimestamp | null;
  fetched_at: MarketNewsTimestamp;
  raw_payload: MarketNewsJsonValue;
  image_url: string | null;
  content_hash: string;
  duplicate_group_id: string | null;
  status: MarketNewsRawItemStatus;
  created_at: MarketNewsTimestamp;
  updated_at: MarketNewsTimestamp;
};

export type MarketNewsArticleRecord = {
  id: MarketNewsId;
  raw_item_id: MarketNewsId | null;
  slug: string;
  original_title: string;
  rewritten_title: string | null;
  short_summary: string | null;
  summary: string | null;
  source_name: string;
  source_url: string;
  source_published_at: MarketNewsTimestamp | null;
  fetched_at: MarketNewsTimestamp | null;
  published_at: MarketNewsTimestamp | null;
  status: MarketNewsArticleStatus;
  category: string | null;
  impact_label: MarketNewsImpactLabel;
  sentiment: string | null;
  language: string;
  image_url: string | null;
  fallback_image_url: string | null;
  image_alt_text: string | null;
  canonical_url: string | null;
  duplicate_group_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string[];
  created_at: MarketNewsTimestamp;
  updated_at: MarketNewsTimestamp;
};

export type MarketNewsArticleEntityRecord = {
  id: MarketNewsId;
  article_id: MarketNewsId;
  entity_type: MarketNewsEntityType;
  entity_slug: string;
  symbol: string | null;
  display_name: string;
  sector_slug: string | null;
  relevance_score: number;
  created_at: MarketNewsTimestamp;
};

export type MarketNewsArticleImageRecord = {
  id: MarketNewsId;
  article_id: MarketNewsId | null;
  raw_item_id: MarketNewsId | null;
  source_image_url: string | null;
  local_image_url: string | null;
  fallback_image_url: string | null;
  image_alt_text: string | null;
  image_credit: string | null;
  image_status: string;
  created_at: MarketNewsTimestamp;
  updated_at: MarketNewsTimestamp;
};

export type MarketNewsArticleWithRelations = MarketNewsArticleRecord & {
  entities: MarketNewsArticleEntityRecord[];
  image: MarketNewsArticleImageRecord | null;
  display_image_url: string;
  image_display_alt_text: string;
  uses_fallback_image: boolean;
};

export type MarketNewsArticleFilters = {
  limit?: number;
  company?: string | null;
  sector?: string | null;
  category?: string | null;
  impactLabel?: string | null;
};

export type MarketNewsFilterOption = {
  value: string;
  label: string;
};

export type MarketNewsFilterOptions = {
  companies: MarketNewsFilterOption[];
  sectors: MarketNewsFilterOption[];
  categories: MarketNewsFilterOption[];
  impactLabels: MarketNewsFilterOption[];
};

export type MarketNewsIngestionRunRecord = {
  id: MarketNewsId;
  source_id: MarketNewsId;
  started_at: MarketNewsTimestamp;
  finished_at: MarketNewsTimestamp | null;
  status: string;
  fetched_count: number;
  inserted_count: number;
  duplicate_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: MarketNewsTimestamp;
};

export type MarketNewsRewriteLogRecord = {
  id: MarketNewsId;
  raw_item_id: MarketNewsId;
  article_id: MarketNewsId | null;
  model: string | null;
  status: string;
  input_tokens: number;
  output_tokens: number;
  error_message: string | null;
  created_at: MarketNewsTimestamp;
};

export type MarketNewsAnalyticsEventRecord = {
  id: MarketNewsId;
  article_id: MarketNewsId;
  event_type: string;
  entity_type: MarketNewsEntityType | null;
  entity_slug: string | null;
  referrer: string | null;
  created_at: MarketNewsTimestamp;
};

export type MarketNewsAdminArticleRecord = MarketNewsArticleWithRelations & {
  internal_url: string;
};

export type MarketNewsAdminFailedRewriteItem = MarketNewsRawItemRecord & {
  latest_rewrite_log: MarketNewsRewriteLogRecord | null;
};

export type MarketNewsAdminIngestionRun = MarketNewsIngestionRunRecord & {
  source_name: string | null;
  source_slug: string | null;
};

export type MarketNewsAdminDashboardState = {
  ready_articles: MarketNewsAdminArticleRecord[];
  published_articles: MarketNewsAdminArticleRecord[];
  rejected_articles: MarketNewsAdminArticleRecord[];
  failed_rewrite_items: MarketNewsAdminFailedRewriteItem[];
  recent_ingestion_runs: MarketNewsAdminIngestionRun[];
};
