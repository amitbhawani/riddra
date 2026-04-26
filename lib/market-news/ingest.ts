import {
  buildMarketNewsContentHash,
  extractImageUrlsFromHtml,
  normalizeMarketNewsExcerpt,
  normalizeMarketNewsTitle,
  normalizeMarketNewsUrl,
  normalizeWhitespace,
  parseMarketNewsPublishedAt,
} from "@/lib/market-news/normalizers";
import { normalizeNewsImageUrl } from "@/lib/market-news/images";
import {
  createMarketNewsIngestionRun,
  finalizeMarketNewsIngestionRun,
  findExistingMarketNewsRawItem,
  insertMarketNewsRawItem,
  updateMarketNewsSourceHealth,
} from "@/lib/market-news/queries";
import {
  loadMarketNewsSourceRegistry,
  type MarketNewsConfiguredSource,
  type MarketNewsSourceRegistry,
} from "@/lib/market-news/sources";
import type { MarketNewsJsonValue } from "@/lib/market-news/types";

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_HEADERS = {
  Accept: "application/rss+xml, application/xml, text/xml, application/json;q=0.9, text/plain;q=0.8, */*;q=0.5",
  "User-Agent": "RiddraMarketNewsBot/1.0 (+https://www.riddra.com)",
};

type MarketNewsFetchedItem = {
  source_name: string;
  original_title: string;
  original_excerpt: string | null;
  source_url: string;
  canonical_url: string | null;
  source_published_at: string | null;
  image_url: string | null;
  raw_payload: MarketNewsJsonValue;
};

const API_IMAGE_FIELD_KEYS = [
  "cover_image",
  "coverimage",
  "featured_image",
  "featuredimage",
  "hero_image",
  "heroimage",
  "image",
  "image_url",
  "imageurl",
  "item_image",
  "itemimage",
  "media:content",
  "media:thumbnail",
  "og:image",
  "og_image",
  "ogimage",
  "photo",
  "picture",
  "thumbnail",
  "thumbnail_url",
  "thumbnailurl",
  "twitter:image",
  "twitter_image",
  "twitterimage",
  "urltoimage",
] as const;

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

const HIGH_VALUE_MARKET_NEWS_PATTERNS = [
  /\b(results|earnings|quarterly results|q1|q2|q3|q4|fy\d{2})\b/i,
  /\b(ipo|listing|public issue)\b/i,
  /\b(sebi|regulatory|order|circular|tribunal|court|appeal|compliance)\b/i,
  /\b(economy|inflation|gdp|rbi|policy|macro)\b/i,
  /\b(company|corporate|dividend|board|merger|acquisition|deal|funding|investment round)\b/i,
];

export type MarketNewsSourceIngestionResult = {
  source: string;
  status: "success" | "partial" | "failed";
  fetched: number;
  inserted: number;
  duplicates: number;
  failed: number;
  error: string | null;
};

export type MarketNewsIngestionSummary = {
  ok: true;
  startedAt: string;
  finishedAt: string;
  registry: MarketNewsSourceRegistry;
  sources: MarketNewsSourceIngestionResult[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createFetchTimeoutSignal(timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
    },
  };
}

async function fetchText(url: string, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const { signal, cleanup } = createFetchTimeoutSignal(timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}.`);
    }

    return await response.text();
  } finally {
    cleanup();
  }
}

async function fetchJson(url: string, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const text = await fetchText(url, timeoutMs);

  try {
    return JSON.parse(text) as MarketNewsJsonValue;
  } catch {
    throw new Error("Source returned invalid JSON.");
  }
}

function readXmlTagContents(block: string, tagName: string) {
  const pattern = new RegExp(
    `<${escapeRegex(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegex(tagName)}>`,
    "gi",
  );

  return Array.from(block.matchAll(pattern)).map((match) => normalizeWhitespace(match[1]));
}

function readFirstXmlTagContent(block: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const value = readXmlTagContents(block, tagName).find(Boolean);

    if (value) {
      return value;
    }
  }

  return null;
}

function readXmlTagAttribute(block: string, tagName: string, attribute: string) {
  return readXmlTagAttributeValues(block, tagName, attribute)[0] ?? null;
}

function readXmlTagAttributeValues(block: string, tagName: string, attribute: string) {
  const pattern = new RegExp(
    `<${escapeRegex(tagName)}\\b[^>]*\\b${escapeRegex(attribute)}=["']([^"']+)["'][^>]*>`,
    "gi",
  );

  return Array.from(block.matchAll(pattern))
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean);
}

function readTagAttributeFromMarkup(markup: string, attribute: string) {
  const pattern = new RegExp(`\\b${escapeRegex(attribute)}\\s*=\\s*["']([^"']+)["']`, "i");
  return normalizeWhitespace(markup.match(pattern)?.[1]);
}

function readXmlMetaImageCandidates(block: string) {
  const candidates: string[] = [];

  for (const match of block.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property =
      readTagAttributeFromMarkup(tag, "property").toLowerCase() ||
      readTagAttributeFromMarkup(tag, "name").toLowerCase();

    if (
      property === "og:image" ||
      property === "og:image:url" ||
      property === "twitter:image"
    ) {
      const content = readTagAttributeFromMarkup(tag, "content");

      if (content) {
        candidates.push(content);
      }
    }
  }

  return candidates;
}

function readNestedXmlImageUrls(block: string, outerTagName: string) {
  const imageBlocks = Array.from(
    block.matchAll(
      new RegExp(
        `<${escapeRegex(outerTagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegex(outerTagName)}>`,
        "gi",
      ),
    ),
    (match) => match[1],
  );

  const candidates: string[] = [];

  for (const imageBlock of imageBlocks) {
    const url = readFirstXmlTagContent(imageBlock, ["url"]);

    if (url) {
      candidates.push(url);
    }
  }

  return candidates;
}

function selectValidNewsImageUrl(candidates: Array<string | null | undefined>, baseUrl?: string | null) {
  for (const candidate of candidates) {
    const normalized = normalizeNewsImageUrl(candidate, baseUrl);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function readXmlImageCandidates(block: string, baseUrl?: string | null) {
  const description =
    readFirstXmlTagContent(block, ["description", "summary", "content:encoded", "content"]) ??
    null;

  return [
    ...readXmlTagAttributeValues(block, "media:content", "url"),
    ...readXmlTagAttributeValues(block, "media:thumbnail", "url"),
    ...readXmlTagAttributeValues(block, "enclosure", "url"),
    ...readXmlMetaImageCandidates(block),
    ...readXmlTagContents(block, "og:image"),
    ...readXmlTagContents(block, "media:content"),
    ...readXmlTagContents(block, "media:thumbnail"),
    ...readXmlTagContents(block, "image"),
    ...readXmlTagContents(block, "thumbnail"),
    ...readNestedXmlImageUrls(block, "image"),
    ...extractImageUrlsFromHtml(description, baseUrl),
  ];
}

function readXmlLink(block: string) {
  const atomHref = readXmlTagAttribute(block, "link", "href");

  if (atomHref) {
    return atomHref;
  }

  return readFirstXmlTagContent(block, ["link", "guid", "id"]);
}

function parseRssFeed(xml: string, source: MarketNewsConfiguredSource) {
  const itemBlocks = [
    ...Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi), (match) => match[0]),
    ...Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi), (match) => match[0]),
  ];

  return itemBlocks
    .map<MarketNewsFetchedItem | null>((block) => {
      const originalTitle = readFirstXmlTagContent(block, ["title"]);
      const link = readXmlLink(block);
      const canonicalUrl =
        normalizeMarketNewsUrl(readFirstXmlTagContent(block, ["guid"]), source.feed_url) ??
        normalizeMarketNewsUrl(link, source.feed_url);
      const sourceUrl = normalizeMarketNewsUrl(link ?? canonicalUrl, source.feed_url);

      if (!originalTitle || !sourceUrl) {
        return null;
      }

      const description =
        readFirstXmlTagContent(block, ["description", "summary", "content:encoded", "content"]) ??
        null;
      const imageUrl = selectValidNewsImageUrl(readXmlImageCandidates(block, source.feed_url), source.feed_url);

      return {
        source_name: source.name,
        original_title: originalTitle,
        original_excerpt: normalizeMarketNewsExcerpt(description),
        source_url: sourceUrl,
        canonical_url: canonicalUrl,
        source_published_at: parseMarketNewsPublishedAt(
          readFirstXmlTagContent(block, ["pubDate", "published", "updated", "dc:date"]),
        ),
        image_url: imageUrl,
        raw_payload: {
          kind: "rss",
          sourceCategory: source.contentCategory,
          sourceSlug: source.slug,
          feedUrl: source.feed_url,
          rawItemXml: block,
        },
      };
    })
    .filter((item): item is MarketNewsFetchedItem => Boolean(item));
}

function readApiFieldValue(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  if (key.includes(".")) {
    const parts = key.split(".");
    let current: unknown = payload;

    for (const part of parts) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return null;
      }

      current = (current as Record<string, unknown>)[part];
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    if (typeof current === "number" && Number.isFinite(current)) {
      return String(current);
    }

    return null;
  }

  const nextValue = payload[key];

  if (typeof nextValue === "string" && nextValue.trim()) {
    return nextValue.trim();
  }

  if (typeof nextValue === "number" && Number.isFinite(nextValue)) {
    return String(nextValue);
  }

  return null;
}

function readApiField(
  payload: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const nextValue = readApiFieldValue(payload, key);

    if (nextValue) {
      return nextValue;
    }
  }

  return null;
}

function isJsonRecord(value: MarketNewsJsonValue): value is Record<string, MarketNewsJsonValue> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeApiItems(payload: MarketNewsJsonValue) {
  if (Array.isArray(payload)) {
    return payload.filter(isJsonRecord);
  }

  if (!isJsonRecord(payload)) {
    return [];
  }

  const record = payload;
  const collections = [record.items, record.articles, record.data];

  for (const collection of collections) {
    if (Array.isArray(collection)) {
      return collection.filter(isJsonRecord);
    }
  }

  return [];
}

function isImageHintKey(key: string) {
  const normalized = normalizeWhitespace(key).toLowerCase();
  return API_IMAGE_FIELD_KEYS.includes(normalized as (typeof API_IMAGE_FIELD_KEYS)[number]);
}

function readFirstApiSrcSetCandidate(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  const firstEntry = normalized.split(",")[0]?.trim() ?? "";
  return firstEntry.split(/\s+/)[0] ?? null;
}

function collectApiImageCandidates(
  value: MarketNewsJsonValue,
  candidates: string[],
  hintKey = "",
  depth = 0,
) {
  if (depth > 4 || value == null) {
    return;
  }

  if (typeof value === "string") {
    if (isImageHintKey(hintKey)) {
      candidates.push(value);
      return;
    }

    const srcsetCandidate = readFirstApiSrcSetCandidate(value);

    if (srcsetCandidate && srcsetCandidate !== value) {
      candidates.push(srcsetCandidate);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectApiImageCandidates(entry, candidates, hintKey, depth + 1);
    }
    return;
  }

  if (!isJsonRecord(value)) {
    return;
  }

  const imageLikeContext = isImageHintKey(hintKey);

  for (const [key, nextValue] of Object.entries(value)) {
    const normalizedKey = normalizeWhitespace(key).toLowerCase();

    if (typeof nextValue === "string") {
      if (isImageHintKey(normalizedKey)) {
        candidates.push(nextValue);
      } else if (
        imageLikeContext &&
        (normalizedKey === "url" ||
          normalizedKey === "href" ||
          normalizedKey === "src" ||
          normalizedKey === "content")
      ) {
        candidates.push(nextValue);
      } else if (normalizedKey === "srcset") {
        const srcsetCandidate = readFirstApiSrcSetCandidate(nextValue);

        if (srcsetCandidate) {
          candidates.push(srcsetCandidate);
        }
      }
    }

    collectApiImageCandidates(nextValue, candidates, normalizedKey, depth + 1);
  }
}

function parseApiFeed(payload: MarketNewsJsonValue, source: MarketNewsConfiguredSource) {
  return normalizeApiItems(payload)
    .map<MarketNewsFetchedItem | null>((entry) => {
      const originalTitle = readApiField(entry, ["title", "headline", "name"]);
      const sourceUrl = normalizeMarketNewsUrl(
        readApiField(entry, ["source_url", "url", "link", "canonical_url"]),
        source.api_url ?? source.homepage_url,
      );

      if (!originalTitle || !sourceUrl) {
        return null;
      }

      const canonicalUrl = normalizeMarketNewsUrl(
        readApiField(entry, ["canonical_url", "url", "link"]),
        source.api_url ?? source.homepage_url,
      );
      const imageCandidates: string[] = [];
      collectApiImageCandidates(entry as MarketNewsJsonValue, imageCandidates);
      const entrySourceName =
        readApiField(entry, [
          "source.name",
          "source.title",
          "sourceName",
          "source_name",
          "publisher",
          "domain",
          "source",
        ]) ?? source.name;
      const normalizedExcerpt = normalizeMarketNewsExcerpt(
        readApiField(entry, [
          "excerpt",
          "summary",
          "description",
          "content",
          "snippet",
          "body",
        ]),
      );

      return {
        source_name: entrySourceName,
        original_title: originalTitle,
        original_excerpt: normalizedExcerpt,
        source_url: sourceUrl,
        canonical_url: canonicalUrl,
        source_published_at: parseMarketNewsPublishedAt(
          readApiField(entry, [
            "published_at",
            "publishedAt",
            "published",
            "pubDate",
            "date",
            "datetime",
            "created_at",
            "updated",
            "updatedAt",
            "seendate",
          ]),
        ),
        image_url: selectValidNewsImageUrl(
          [
            readApiField(entry, [
              "image_url",
              "image",
              "thumbnail",
              "thumbnail_url",
              "item_image",
              "urlToImage",
              "og:image",
            ]),
            ...imageCandidates,
          ],
          source.api_url ?? source.homepage_url,
        ),
        raw_payload: {
          ...(entry as Record<string, MarketNewsJsonValue>),
          sourceCategory: source.contentCategory,
          sourceSlug: source.slug,
        },
      };
    })
    .filter((item): item is MarketNewsFetchedItem => Boolean(item));
}

async function fetchSourceItems(source: MarketNewsConfiguredSource) {
  const sourceFeedUrl = source.feed_url ?? source.detected_feed_url;

  if ((source.source_type === "rss" || source.source_type === "official") && sourceFeedUrl) {
    const feed = await fetchText(sourceFeedUrl);
    return parseRssFeed(feed, source);
  }

  if ((source.source_type === "api" || source.source_type === "official") && source.api_url) {
    const payload = await fetchJson(source.api_url);
    return parseApiFeed(payload, source);
  }

  throw new Error("No supported feed or API URL is configured for this source.");
}

function determineSourceResultStatus(input: {
  error: string | null;
  failed: number;
}) {
  if (input.error) {
    return "failed" as const;
  }

  if (input.failed > 0) {
    return "partial" as const;
  }

  return "success" as const;
}

function shouldDropLowValueMarketNewsItem(
  source: MarketNewsConfiguredSource,
  item: Pick<MarketNewsFetchedItem, "original_title" | "original_excerpt" | "source_name" | "source_url" | "canonical_url">,
) {
  const qualityText = normalizeWhitespace(
    [
      source.name,
      source.slug,
      source.contentCategory,
      item.source_name,
      item.original_title,
      item.original_excerpt,
      item.source_url,
      item.canonical_url,
    ].join(" "),
  ).toLowerCase();

  const hasHighValueSignals = HIGH_VALUE_MARKET_NEWS_PATTERNS.some((pattern) => pattern.test(qualityText));

  if (hasHighValueSignals) {
    return false;
  }

  if (LOW_VALUE_MARKET_NEWS_PATTERNS.some((pattern) => pattern.test(qualityText))) {
    return true;
  }

  if (LOW_VALUE_MARKET_NEWS_SOURCE_PATTERNS.some((pattern) => pattern.test(qualityText))) {
    return true;
  }

  return false;
}

export async function runMarketNewsIngestion() {
  const startedAt = new Date().toISOString();
  const registry = await loadMarketNewsSourceRegistry();
  const sourceResults: MarketNewsSourceIngestionResult[] = [];

  for (const source of registry.sources) {
    const run = await createMarketNewsIngestionRun(source.id);
    let fetchedCount = 0;
    let insertedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    let filteredCount = 0;
    let errorMessage: string | null = null;

    try {
      const items = await fetchSourceItems(source);
      fetchedCount = items.length;

      for (const item of items) {
        try {
          if (shouldDropLowValueMarketNewsItem(source, item)) {
            filteredCount += 1;
            continue;
          }

          const canonicalUrl = normalizeMarketNewsUrl(
            item.canonical_url ?? item.source_url,
            source.feed_url ?? source.detected_feed_url ?? source.api_url ?? source.homepage_url,
          );
          const sourceUrl = normalizeMarketNewsUrl(
            item.source_url,
            source.feed_url ?? source.detected_feed_url ?? source.api_url ?? source.homepage_url,
          );
          const normalizedTitle = normalizeMarketNewsTitle(item.original_title);

          if (!sourceUrl || !normalizedTitle) {
            failedCount += 1;
            continue;
          }

          const contentHash = buildMarketNewsContentHash({
            canonicalUrl,
            sourceUrl,
            title: normalizedTitle,
          });

          const existingItem = await findExistingMarketNewsRawItem({
            sourceUrl,
            canonicalUrl,
            contentHash,
          });

          if (existingItem) {
            duplicateCount += 1;
            continue;
          }

          await insertMarketNewsRawItem({
            source_id: source.id,
            source_name: item.source_name,
            original_title: normalizeWhitespace(item.original_title),
            original_excerpt: item.original_excerpt,
            source_url: sourceUrl,
            canonical_url: canonicalUrl,
            source_published_at: item.source_published_at,
            fetched_at: new Date().toISOString(),
            raw_payload:
              item.raw_payload && typeof item.raw_payload === "object" && !Array.isArray(item.raw_payload)
                ? {
                    ...(item.raw_payload as Record<string, MarketNewsJsonValue>),
                    sourceCategory: source.contentCategory,
                    sourceSlug: source.slug,
                  }
                : item.raw_payload,
            image_url: normalizeNewsImageUrl(
              item.image_url,
              source.feed_url ?? source.detected_feed_url ?? source.api_url ?? source.homepage_url,
            ),
            content_hash: contentHash,
            status: "new",
          });

          insertedCount += 1;
        } catch {
          failedCount += 1;
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown source ingestion failure";
      failedCount = Math.max(failedCount, 1);
    }

    const finishedAt = new Date().toISOString();
    const status = errorMessage ? "failed" : failedCount > 0 ? "partial" : "success";

    await finalizeMarketNewsIngestionRun(run.id, {
      finished_at: finishedAt,
      status,
      fetched_count: fetchedCount,
      inserted_count: insertedCount,
      duplicate_count: duplicateCount,
      failed_count: failedCount,
      error_message: errorMessage,
    });

    await updateMarketNewsSourceHealth(source.id, {
      detected_feed_url: source.feed_url ?? source.detected_feed_url ?? null,
      last_checked_at: finishedAt,
      last_status: status,
      last_error:
        errorMessage ||
        (failedCount > 0
          ? `${failedCount} item(s) failed during ingestion.`
          : filteredCount > 0
            ? `Filtered ${filteredCount} low-value item(s) during ingestion.`
            : null),
    });

    sourceResults.push({
      source: source.name,
      status: determineSourceResultStatus({
        error: errorMessage,
        failed: failedCount,
      }),
      fetched: fetchedCount,
      inserted: insertedCount,
      duplicates: duplicateCount,
      failed: failedCount,
      error: errorMessage,
    });
  }

  return {
    ok: true as const,
    startedAt,
    finishedAt: new Date().toISOString(),
    registry,
    sources: sourceResults,
  } satisfies MarketNewsIngestionSummary;
}
