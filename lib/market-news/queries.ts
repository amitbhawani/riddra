import { getNewsImageForArticle } from "@/lib/market-news/images";
import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import type {
  MarketNewsAdminArticleRecord,
  MarketNewsAdminDashboardState,
  MarketNewsAdminFailedRewriteItem,
  MarketNewsAdminIngestionRun,
  MarketNewsArticleFilters,
  MarketNewsArticleEntityRecord,
  MarketNewsArticleImageRecord,
  MarketNewsArticleRecord,
  MarketNewsArticleStatus,
  MarketNewsFilterOptions,
  MarketNewsArticleWithRelations,
  MarketNewsIngestionRunRecord,
  MarketNewsRewriteLogRecord,
  MarketNewsRawItemRecord,
  MarketNewsSourceRecord,
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
  reliability_score: number;
  is_enabled: boolean;
  fetch_interval_minutes: number;
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
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  fetched_at: string | null;
  published_at?: string | null;
  status: MarketNewsArticleRecord["status"];
  category: string | null;
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

function normalizeLooseFilterValue(value: string | null | undefined) {
  return String(value ?? "").trim();
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

export async function seedMarketNewsSources(sources: readonly MarketNewsSourceSeed[]) {
  const supabase = requireMarketNewsAdminClient();
  const payload = sources.map((source) => ({
    name: source.name,
    slug: source.slug,
    source_type: source.source_type,
    feed_url: source.feed_url,
    api_url: source.api_url,
    homepage_url: source.homepage_url,
    reliability_score: source.reliability_score,
    is_enabled: source.is_enabled,
    fetch_interval_minutes: source.fetch_interval_minutes,
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
    reliability_score: source.reliability_score,
    is_enabled: source.is_enabled,
    fetch_interval_minutes: source.fetch_interval_minutes,
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
      const resolvedImage = getNewsImageForArticle(article, null);

      return {
        ...article,
        entities: [],
        image: null,
        display_image_url: resolvedImage.displayImageUrl,
        image_display_alt_text: resolvedImage.altText,
        uses_fallback_image: resolvedImage.usesFallback,
      };
    });
  }

  const articleIds = articles.map((article) => article.id);
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
    const image = imageMap.get(article.id) ?? null;
    const resolvedImage = getNewsImageForArticle(article, image);

    return {
      ...article,
      entities: entityMap.get(article.id) ?? [],
      image,
      display_image_url: resolvedImage.displayImageUrl,
      image_display_alt_text: resolvedImage.altText,
      uses_fallback_image: resolvedImage.usesFallback,
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

function sortArticlesByRecency<T extends Pick<MarketNewsArticleRecord, "published_at" | "source_published_at" | "created_at">>(
  articles: readonly T[],
) {
  return [...articles].sort((left, right) => {
    const leftValue = left.published_at ?? left.source_published_at ?? left.created_at;
    const rightValue = right.published_at ?? right.source_published_at ?? right.created_at;
    return String(rightValue).localeCompare(String(leftValue));
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

export async function getMarketNewsArticles(input?: number | MarketNewsArticleFilters) {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsArticleWithRelations[];
  }

  const filters = normalizeMarketNewsArticleFilters(input);
  const constrainedArticleIds = await listMarketNewsArticleIdsForFilters(filters);

  if (constrainedArticleIds && !constrainedArticleIds.length) {
    return [] as MarketNewsArticleWithRelations[];
  }

  let query = supabase
    .from("market_news_articles")
    .select("*")
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

  const { data, error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(filters.limit);

  if (error) {
    throw new Error(`Unable to load market news articles: ${error.message}`);
  }

  return hydrateMarketNewsArticles((data ?? []) as MarketNewsArticleRecord[]);
}

export async function getPublishedMarketNewsSitemapEntries() {
  const supabase = getMarketNewsReadClient();

  if (!supabase) {
    return [] as MarketNewsPublishedSitemapEntry[];
  }

  const { data, error } = await supabase
    .from("market_news_articles")
    .select("slug, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load published market news sitemap entries: ${error.message}`);
  }

  return (data ?? []) as MarketNewsPublishedSitemapEntry[];
}

function getMarketNewsTopStoryScore(article: MarketNewsArticleWithRelations) {
  // TODO: Replace with full ML ranking later.
  let score = 0;

  const hasStockEntity = article.entities.some((entity) => entity.entity_type === "stock");
  const hasSymbol = article.entities.some((entity) => Boolean(entity.symbol?.trim()));
  const normalizedCategory = String(article.category ?? "").trim().toLowerCase();
  const hasPriorityCategory =
    normalizedCategory === "company_news" || normalizedCategory === "earnings";
  const hasPriorityImpact = String(article.impact_label ?? "").trim().toLowerCase() !== "neutral";

  if (hasStockEntity) {
    score += 100;
  }

  if (hasSymbol) {
    score += 60;
  }

  if (hasPriorityCategory) {
    score += 40;
  }

  if (hasPriorityImpact) {
    score += 20;
  }

  return score;
}

function getArticleRecencyTimestamp(article: Pick<MarketNewsArticleRecord, "published_at" | "source_published_at" | "created_at">) {
  return Date.parse(article.published_at ?? article.source_published_at ?? article.created_at ?? "");
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

async function getMarketNewsClickMetrics(articleIds: readonly string[]) {
  if (!articleIds.length) {
    return new Map<string, { clicks24h: number; clicks7d: number }>();
  }

  const supabase = getMarketNewsReadClient();

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
    return [...articles]
      .sort((left, right) => {
        const scoreDelta = getMarketNewsTopStoryScore(right) - getMarketNewsTopStoryScore(left);

        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        const rightValue = right.published_at ?? right.source_published_at ?? right.created_at;
        const leftValue = left.published_at ?? left.source_published_at ?? left.created_at;

        return String(rightValue).localeCompare(String(leftValue));
      })
      .slice(0, safeLimit);
  }

  return [...articles]
    .sort((left, right) => {
      const leftMetrics = clickMetrics.get(left.id) ?? { clicks24h: 0, clicks7d: 0 };
      const rightMetrics = clickMetrics.get(right.id) ?? { clicks24h: 0, clicks7d: 0 };
      const leftScore =
        leftMetrics.clicks24h * 5 +
        leftMetrics.clicks7d * 2 -
        getMarketNewsAgePenalty(left) +
        getMarketNewsRecencyDecayBoost(left);
      const rightScore =
        rightMetrics.clicks24h * 5 +
        rightMetrics.clicks7d * 2 -
        getMarketNewsAgePenalty(right) +
        getMarketNewsRecencyDecayBoost(right);
      const scoreDelta = rightScore - leftScore;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const rightValue = right.published_at ?? right.source_published_at ?? right.created_at;
      const leftValue = left.published_at ?? left.source_published_at ?? left.created_at;

      return String(rightValue).localeCompare(String(leftValue));
    })
    .slice(0, safeLimit);
}

export async function getMarketNewsFilterOptions(limit = 160) {
  const articles = await getMarketNewsArticles({
    limit: Math.max(Math.min(Math.max(Math.trunc(limit), 1), 240), 60),
  });

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
        companyMap.set(entity.entity_slug.trim(), entity.display_name.trim() || titleCaseFromSlug(entity.entity_slug.trim()));
      }

      if (entity.entity_type === "sector" && entity.entity_slug.trim()) {
        sectorMap.set(entity.entity_slug.trim(), entity.display_name.trim() || titleCaseFromSlug(entity.entity_slug.trim()));
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
        label: value,
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

      return String(right.recency).localeCompare(String(left.recency));
    })
    .slice(0, safeLimit)
    .map((item) => item.article);

  return ranked;
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

export async function getAdminMarketNewsDashboardState(): Promise<MarketNewsAdminDashboardState> {
  const [readyArticles, publishedArticles, rejectedArticles, failedRewriteItems, recentIngestionRuns] =
    await Promise.all([
      listAdminMarketNewsArticlesByStatuses(["ready"], 30),
      listAdminMarketNewsArticlesByStatuses(["published"], 30),
      listAdminMarketNewsArticlesByStatuses(["rejected"], 30),
      listFailedMarketNewsRewriteItems(20),
      listRecentMarketNewsIngestionRuns(12),
    ]);

  return {
    ready_articles: readyArticles,
    published_articles: publishedArticles,
    rejected_articles: rejectedArticles,
    failed_rewrite_items: failedRewriteItems,
    recent_ingestion_runs: recentIngestionRuns,
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
