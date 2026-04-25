import { env } from "@/lib/env";
import { matchMarketNewsEntities } from "@/lib/market-news/entity-matcher";
import { getNewsImageForRawItem } from "@/lib/market-news/images";
import { normalizeWhitespace } from "@/lib/market-news/normalizers";
import {
  findMarketNewsArticleBySlug,
  insertMarketNewsArticle,
  insertMarketNewsArticleEntities,
  insertMarketNewsArticleImage,
  insertMarketNewsRewriteLog,
  listMarketNewsRawItemsForRewrite,
  updateMarketNewsRawItemStatus,
} from "@/lib/market-news/queries";
import type {
  MarketNewsAiRewritePayload,
  MarketNewsImpactLabel,
  MarketNewsRawItemRecord,
} from "@/lib/market-news/types";
import { isMarketNewsImpactLabel } from "@/lib/market-news/types";

const DEFAULT_MARKET_NEWS_MODEL = "gpt-4.1-mini";
const DEFAULT_REWRITE_LIMIT = 10;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const TARGET_SHORT_SUMMARY_MIN_WORDS = 30;
const TARGET_SHORT_SUMMARY_MAX_WORDS = 50;
const ACCEPTABLE_SHORT_SUMMARY_MIN_WORDS = 20;
const ACCEPTABLE_SHORT_SUMMARY_MAX_WORDS = 60;
const TARGET_SUMMARY_MIN_WORDS = 100;
const TARGET_SUMMARY_MAX_WORDS = 150;
const ACCEPTABLE_SUMMARY_MIN_WORDS = 80;
const ACCEPTABLE_SUMMARY_MAX_WORDS = 170;

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export type MarketNewsRewriteArticleResult = {
  rawItemId: string;
  status: "created" | "rejected" | "failed";
  articleId: string | null;
  slug: string | null;
  error: string | null;
};

export type MarketNewsRewriteSummary = {
  ok: true;
  processed: number;
  created: number;
  rejected: number;
  failed: number;
  articles: MarketNewsRewriteArticleResult[];
};

function getConfiguredModel() {
  return process.env.MARKET_NEWS_MODEL?.trim() || DEFAULT_MARKET_NEWS_MODEL;
}

function isMarketNewsAiEnabled() {
  return process.env.MARKET_NEWS_AI_ENABLED?.trim() === "true";
}

function getOpenAiApiKey() {
  return env.openAiApiKey ?? process.env.OPENAI_API_KEY?.trim() ?? "";
}

function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}

function sanitizeStringArray(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeWhitespace(typeof value === "string" ? value : ""))
        .filter(Boolean),
    ),
  );
}

function countWords(value: string) {
  return normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatPublishedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function splitIntoSentences(value: string) {
  return normalizeWhitespace(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter(Boolean);
}

function ensureSentence(value: string, fallbackPunctuation = ".") {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}${fallbackPunctuation}`;
}

function trimToWordLimit(value: string, maxWords: number) {
  const normalized = normalizeWhitespace(value);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return normalized;
  }

  const sentences = splitIntoSentences(normalized);
  let accepted: string[] = [];
  let totalWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);

    if (accepted.length > 0 && totalWords + sentenceWords > maxWords) {
      break;
    }

    accepted.push(sentence);
    totalWords += sentenceWords;
  }

  if (accepted.length > 0) {
    return normalizeWhitespace(accepted.join(" "));
  }

  return normalizeWhitespace(words.slice(0, maxWords).join(" "));
}

function buildSummaryFactSentences(
  rawItem: MarketNewsRawItemRecord,
  payload: MarketNewsAiRewritePayload,
) {
  const facts: string[] = [];

  if (rawItem.original_title) {
    facts.push(
      ensureSentence(`The original source headline focuses on ${rawItem.original_title}`),
    );
  }

  if (rawItem.original_excerpt) {
    facts.push(
      ensureSentence(`The available source excerpt says ${rawItem.original_excerpt}`),
    );
  }

  if (rawItem.source_name) {
    facts.push(
      ensureSentence(`This update is attributed to ${rawItem.source_name}`),
    );
  }

  const publishedAt = formatPublishedAt(rawItem.source_published_at);

  if (publishedAt) {
    facts.push(
      ensureSentence(`The source published this item on ${publishedAt}`),
    );
  }

  if (rawItem.source_url) {
    facts.push(
      "The original source link remains attached for direct attribution and additional context.",
    );
  }

  if (payload.category) {
    facts.push(
      ensureSentence(`Riddra has classified the update under ${payload.category}`),
    );
  }

  return Array.from(new Set(facts.filter(Boolean)));
}

function expandSummaryWithFacts(
  value: string,
  rawItem: MarketNewsRawItemRecord,
  payload: MarketNewsAiRewritePayload,
) {
  let summary = normalizeWhitespace(value);

  if (!summary) {
    return "";
  }

  if (countWords(summary) >= TARGET_SUMMARY_MIN_WORDS) {
    return summary;
  }

  const existingSentences = new Set(splitIntoSentences(summary).map((sentence) => sentence.toLowerCase()));
  const facts = buildSummaryFactSentences(rawItem, payload);

  for (const fact of facts) {
    const normalizedFact = normalizeWhitespace(fact);

    if (!normalizedFact || existingSentences.has(normalizedFact.toLowerCase())) {
      continue;
    }

    summary = normalizeWhitespace(`${summary} ${normalizedFact}`);
    existingSentences.add(normalizedFact.toLowerCase());

    if (countWords(summary) >= TARGET_SUMMARY_MIN_WORDS) {
      break;
    }
  }

  return summary;
}

function buildShortSummaryFromSummary(summary: string) {
  const sentences = splitIntoSentences(summary);

  if (sentences.length === 0) {
    return "";
  }

  let shortSummary = sentences[0] ?? "";

  if (countWords(shortSummary) < TARGET_SHORT_SUMMARY_MIN_WORDS && sentences[1]) {
    shortSummary = `${shortSummary} ${sentences[1]}`;
  }

  return trimToWordLimit(shortSummary, TARGET_SHORT_SUMMARY_MAX_WORDS);
}

function normalizeRewritePayload(
  rawItem: MarketNewsRawItemRecord,
  payload: MarketNewsAiRewritePayload,
) {
  const normalized = {
    ...payload,
    rewritten_title: normalizeWhitespace(payload.rewritten_title),
    seo_title: normalizeWhitespace(payload.seo_title),
    seo_description: normalizeWhitespace(payload.seo_description),
    category: normalizeWhitespace(payload.category),
    slug: slugify(payload.slug || payload.rewritten_title || rawItem.original_title),
    summary: expandSummaryWithFacts(payload.summary, rawItem, payload),
    short_summary: normalizeWhitespace(payload.short_summary),
  };

  if (countWords(normalized.summary) > ACCEPTABLE_SUMMARY_MAX_WORDS) {
    normalized.summary = trimToWordLimit(normalized.summary, TARGET_SUMMARY_MAX_WORDS);
  }

  if (!normalized.short_summary || countWords(normalized.short_summary) < ACCEPTABLE_SHORT_SUMMARY_MIN_WORDS) {
    normalized.short_summary = buildShortSummaryFromSummary(normalized.summary);
  }

  if (countWords(normalized.short_summary) > ACCEPTABLE_SHORT_SUMMARY_MAX_WORDS) {
    normalized.short_summary = trimToWordLimit(
      normalized.short_summary,
      TARGET_SHORT_SUMMARY_MAX_WORDS,
    );
  }

  if (!normalized.seo_title) {
    normalized.seo_title = normalized.rewritten_title;
  }

  if (!normalized.seo_description) {
    normalized.seo_description = normalized.short_summary || trimToWordLimit(normalized.summary, 45);
  }

  if (!normalized.image_alt_text) {
    normalized.image_alt_text = `${normalized.rewritten_title || rawItem.original_title} | Riddra Market News`;
  }

  if (!normalized.slug) {
    normalized.slug = `market-news-${rawItem.id.slice(0, 8)}`;
  }

  return normalized;
}

function inferFailureLogStatus(message: string) {
  const normalized = normalizeWhitespace(message).toLowerCase();

  if (normalized.includes("invalid json")) {
    return "failed_invalid_json";
  }

  if (
    normalized.includes("openai") ||
    normalized.includes("request failed") ||
    normalized.includes("returned no content")
  ) {
    return "failed_ai";
  }

  if (
    normalized.includes("missing rewritten_title") ||
    normalized.includes("summary is empty") ||
    normalized.includes("source url is missing")
  ) {
    return "failed_validation";
  }

  return "failed_processing";
}

function normalizeImpactLabel(value: string): MarketNewsImpactLabel {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return isMarketNewsImpactLabel(normalized) ? normalized : "neutral";
}

function normalizeSentiment(value: string) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized || "neutral";
}

function normalizeCategoryForAutoPublish(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value ?? "").toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized === "company_news" ||
    normalized === "company news" ||
    normalized === "companies" ||
    normalized === "company"
  ) {
    return "company_news" as const;
  }

  if (
    normalized === "earnings" ||
    normalized === "results" ||
    normalized === "quarterly results" ||
    normalized === "earnings news"
  ) {
    return "earnings" as const;
  }

  return normalized;
}

// Auto-publish logic: high-confidence stock-linked news only
function shouldAutoPublishMarketNewsArticle(input: {
  category: string | null | undefined;
  matchedEntities: Awaited<ReturnType<typeof matchMarketNewsEntities>>;
}) {
  const normalizedCategory = normalizeCategoryForAutoPublish(input.category);

  if (normalizedCategory !== "company_news" && normalizedCategory !== "earnings") {
    return false;
  }

  return input.matchedEntities.some(
    (entity) => entity.entityType === "stock" && Boolean(normalizeWhitespace(entity.symbol ?? "")),
  );
}

function createRewritePrompt(rawItem: MarketNewsRawItemRecord) {
  const rawPayloadText = JSON.stringify(rawItem.raw_payload).slice(0, 12_000);

  return [
    "Rewrite this Indian market news item into a factual publishable article draft for Riddra.",
    "Return only JSON matching the required schema.",
    "Rules:",
    "- rewritten_title must be interesting but factual",
    "- IMPORTANT: short_summary MUST be 30 to 50 words, ideally 35 to 45 words",
    "- IMPORTANT: summary MUST be 100 to 150 words, ideally 115 to 135 words",
    "- If the source facts are thin, expand carefully by restating only confirmed source facts",
    "- do not invent numbers",
    "- do not give buy or sell advice",
    "- do not overstate market impact",
    "- keep Indian market context",
    "- reject irrelevant items",
    "",
    `Original title: ${rawItem.original_title}`,
    `Original excerpt: ${rawItem.original_excerpt ?? ""}`,
    `Source name: ${rawItem.source_name}`,
    `Source URL: ${rawItem.source_url}`,
    `Canonical URL: ${rawItem.canonical_url ?? ""}`,
    `Source published at: ${rawItem.source_published_at ?? ""}`,
    `Image URL: ${rawItem.image_url ?? ""}`,
    `Raw payload: ${rawPayloadText}`,
  ].join("\n");
}

function getRewriteJsonSchema() {
  return {
    name: "market_news_rewrite",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        rewritten_title: { type: "string" },
        seo_title: { type: "string" },
        seo_description: { type: "string" },
        short_summary: { type: "string" },
        summary: { type: "string" },
        slug: { type: "string" },
        category: { type: "string" },
        impact_label: { type: "string" },
        sentiment: { type: "string" },
        companies: {
          type: "array",
          items: { type: "string" },
        },
        symbols: {
          type: "array",
          items: { type: "string" },
        },
        sectors: {
          type: "array",
          items: { type: "string" },
        },
        keywords: {
          type: "array",
          items: { type: "string" },
        },
        image_alt_text: { type: "string" },
        reject: { type: "boolean" },
        reject_reason: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
      },
      required: [
        "rewritten_title",
        "seo_title",
        "seo_description",
        "short_summary",
        "summary",
        "slug",
        "category",
        "impact_label",
        "sentiment",
        "companies",
        "symbols",
        "sectors",
        "keywords",
        "image_alt_text",
        "reject",
        "reject_reason",
      ],
    },
  };
}

async function requestRewriteFromOpenAi(rawItem: MarketNewsRawItemRecord) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for market news rewrite.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getConfiguredModel(),
      temperature: 0.2,
      max_completion_tokens: 1200,
      response_format: {
        type: "json_schema",
        json_schema: getRewriteJsonSchema(),
      },
      messages: [
        {
          role: "system",
          content:
            "You rewrite market news into factual Riddra article drafts. Output only JSON. Never add markdown.",
        },
        {
          role: "user",
          content: createRewritePrompt(rawItem),
        },
      ],
    }),
  });

  const payload = (await response.json()) as OpenAiChatCompletionResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI rewrite returned no content.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI rewrite returned invalid JSON.");
  }

  return {
    payload: parsed,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
  };
}

function validateRewritePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Rewrite payload is not an object.");
  }

  const record = value as Record<string, unknown>;
  const payload: MarketNewsAiRewritePayload = {
    rewritten_title: normalizeWhitespace(typeof record.rewritten_title === "string" ? record.rewritten_title : ""),
    seo_title: normalizeWhitespace(typeof record.seo_title === "string" ? record.seo_title : ""),
    seo_description: normalizeWhitespace(
      typeof record.seo_description === "string" ? record.seo_description : "",
    ),
    short_summary: normalizeWhitespace(
      typeof record.short_summary === "string" ? record.short_summary : "",
    ),
    summary: normalizeWhitespace(typeof record.summary === "string" ? record.summary : ""),
    slug: normalizeWhitespace(typeof record.slug === "string" ? record.slug : ""),
    category: normalizeWhitespace(typeof record.category === "string" ? record.category : ""),
    impact_label: normalizeWhitespace(typeof record.impact_label === "string" ? record.impact_label : ""),
    sentiment: normalizeWhitespace(typeof record.sentiment === "string" ? record.sentiment : ""),
    companies: sanitizeStringArray(record.companies),
    symbols: sanitizeStringArray(record.symbols),
    sectors: sanitizeStringArray(record.sectors),
    keywords: sanitizeStringArray(record.keywords),
    image_alt_text: normalizeWhitespace(
      typeof record.image_alt_text === "string" ? record.image_alt_text : "",
    ),
    reject: Boolean(record.reject),
    reject_reason:
      typeof record.reject_reason === "string" ? normalizeWhitespace(record.reject_reason) : null,
  };

  if (payload.reject) {
    return payload;
  }

  if (!payload.rewritten_title) {
    throw new Error("Rewrite payload is missing rewritten_title.");
  }

  return payload;
}

async function ensureUniqueArticleSlug(baseValue: string, rawItemId: string) {
  const normalizedBase = slugify(baseValue) || `market-news-${rawItemId.slice(0, 8)}`;
  let candidate = normalizedBase;
  let attempt = 2;

  while (await findMarketNewsArticleBySlug(candidate)) {
    candidate = `${normalizedBase}-${attempt}`;
    attempt += 1;
  }

  return candidate;
}

async function markRejected(
  rawItem: MarketNewsRawItemRecord,
  model: string,
  reason: string | null,
  tokens?: { inputTokens?: number; outputTokens?: number },
) {
  await updateMarketNewsRawItemStatus(rawItem.id, "rejected");
  await insertMarketNewsRewriteLog({
    raw_item_id: rawItem.id,
    article_id: null,
    model,
    status: "rejected",
    input_tokens: tokens?.inputTokens ?? 0,
    output_tokens: tokens?.outputTokens ?? 0,
    error_message: reason,
  });
}

async function markFailed(
  rawItem: MarketNewsRawItemRecord,
  model: string,
  reason: string,
  status = "failed_processing",
  tokens?: { inputTokens?: number; outputTokens?: number },
) {
  await updateMarketNewsRawItemStatus(rawItem.id, "failed");
  await insertMarketNewsRewriteLog({
    raw_item_id: rawItem.id,
    article_id: null,
    model,
    status,
    input_tokens: tokens?.inputTokens ?? 0,
    output_tokens: tokens?.outputTokens ?? 0,
    error_message: reason,
  });
}

async function createArticleFromRawItem(rawItem: MarketNewsRawItemRecord) {
  const model = getConfiguredModel();

  if (!normalizeWhitespace(rawItem.original_title)) {
    throw new Error("Original title is empty.");
  }

  if (!normalizeWhitespace(rawItem.source_url)) {
    throw new Error("Source URL is missing.");
  }

  const { payload: rawPayload, inputTokens, outputTokens } = await requestRewriteFromOpenAi(rawItem);
  const payload = normalizeRewritePayload(rawItem, validateRewritePayload(rawPayload));

  if (payload.reject) {
    await markRejected(rawItem, model, payload.reject_reason, {
      inputTokens,
      outputTokens,
    });

    return {
      status: "rejected" as const,
      articleId: null,
      slug: null,
      error: payload.reject_reason,
    };
  }

  if (!payload.summary) {
    throw new Error("Summary is empty.");
  }

  const uniqueSlug = await ensureUniqueArticleSlug(payload.slug || payload.rewritten_title, rawItem.id);
  const resolvedImage = getNewsImageForRawItem(rawItem);
  const matchedEntities = await matchMarketNewsEntities({
    rawItem,
    payload,
  });
  const shouldAutoPublish = shouldAutoPublishMarketNewsArticle({
    category: payload.category,
    matchedEntities,
  });
  const articleStatus = shouldAutoPublish ? "published" : "ready";
  const publishedAt = shouldAutoPublish ? new Date().toISOString() : null;
  const imageAltText =
    payload.image_alt_text || `${payload.rewritten_title} | Riddra Market News`;

  const article = await insertMarketNewsArticle({
    raw_item_id: rawItem.id,
    slug: uniqueSlug,
    original_title: rawItem.original_title,
    rewritten_title: payload.rewritten_title,
    short_summary: payload.short_summary,
    summary: payload.summary,
    source_name: rawItem.source_name,
    source_url: rawItem.source_url,
    source_published_at: rawItem.source_published_at,
    fetched_at: rawItem.fetched_at,
    published_at: publishedAt,
    status: articleStatus,
    category: truncateText(payload.category, 120) || null,
    impact_label: normalizeImpactLabel(payload.impact_label),
    sentiment: normalizeSentiment(payload.sentiment),
    language: "en",
    image_url: resolvedImage.imageUrl,
    fallback_image_url: resolvedImage.fallbackImageUrl,
    image_alt_text: imageAltText,
    canonical_url: rawItem.canonical_url ?? rawItem.source_url,
    duplicate_group_id: rawItem.duplicate_group_id,
    seo_title: truncateText(payload.seo_title || payload.rewritten_title, 160) || null,
    seo_description:
      truncateText(payload.seo_description || payload.short_summary, 320) || null,
    keywords: sanitizeStringArray(payload.keywords).slice(0, 12),
  });

  await insertMarketNewsArticleEntities(
    matchedEntities.map((entity) => ({
      article_id: article.id,
      entity_type: entity.entityType,
      entity_slug: entity.entitySlug,
      symbol: entity.symbol,
      display_name: entity.displayName,
      sector_slug: entity.sectorSlug,
      relevance_score: entity.relevanceScore,
    })),
  );

  await insertMarketNewsArticleImage({
    article_id: article.id,
    raw_item_id: rawItem.id,
    source_image_url: resolvedImage.imageUrl,
    local_image_url: null,
    fallback_image_url: resolvedImage.fallbackImageUrl,
    image_alt_text: imageAltText,
    image_credit: rawItem.source_name,
    image_status: resolvedImage.usesFallback ? "fallback" : "source",
  });

  await updateMarketNewsRawItemStatus(rawItem.id, "processed");
  await insertMarketNewsRewriteLog({
    raw_item_id: rawItem.id,
    article_id: article.id,
    model,
    status: shouldAutoPublish ? "created_auto_published" : "created",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    error_message: null,
  });

  return {
    status: "created" as const,
    articleId: article.id,
    slug: article.slug,
    error: null,
  };
}

export function getMarketNewsRewriteReadiness() {
  return {
    aiEnabled: isMarketNewsAiEnabled(),
    openAiConfigured: Boolean(getOpenAiApiKey()),
    model: getConfiguredModel(),
  };
}

export async function runMarketNewsRewrite(input?: { limit?: number; retryFailed?: boolean }) {
  if (!isMarketNewsAiEnabled()) {
    throw new Error("MARKET_NEWS_AI_ENABLED must be true for market news rewrite.");
  }

  if (!getOpenAiApiKey()) {
    throw new Error("OPENAI_API_KEY is required for market news rewrite.");
  }

  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit)
      ? Math.min(Math.max(Math.trunc(input.limit), 1), 50)
      : DEFAULT_REWRITE_LIMIT;

  const rawItems = await listMarketNewsRawItemsForRewrite(limit, {
    retryFailed: input?.retryFailed === true,
  });
  const results: MarketNewsRewriteArticleResult[] = [];
  let created = 0;
  let rejected = 0;
  let failed = 0;

  for (const rawItem of rawItems) {
    try {
      const result = await createArticleFromRawItem(rawItem);

      results.push({
        rawItemId: rawItem.id,
        status: result.status,
        articleId: result.articleId,
        slug: result.slug,
        error: result.error,
      });

      if (result.status === "created") {
        created += 1;
      } else if (result.status === "rejected") {
        rejected += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown market news rewrite failure";
      await markFailed(rawItem, getConfiguredModel(), message, inferFailureLogStatus(message));
      failed += 1;
      results.push({
        rawItemId: rawItem.id,
        status: "failed",
        articleId: null,
        slug: null,
        error: message,
      });
    }
  }

  return {
    ok: true as const,
    processed: rawItems.length,
    created,
    rejected,
    failed,
    articles: results,
  } satisfies MarketNewsRewriteSummary;
}
