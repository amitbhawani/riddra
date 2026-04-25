import {
  normalizeMarketNewsUrl,
  normalizeWhitespace,
} from "@/lib/market-news/normalizers";
import type {
  MarketNewsArticleImageRecord,
  MarketNewsArticleRecord,
  MarketNewsFallbackImageKey,
  MarketNewsImageContext,
  MarketNewsRawItemRecord,
  MarketNewsResolvedImage,
} from "@/lib/market-news/types";

const ALLOWED_REMOTE_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

const REJECTED_NON_IMAGE_EXTENSIONS = new Set([
  ".asp",
  ".aspx",
  ".csv",
  ".doc",
  ".docx",
  ".htm",
  ".html",
  ".js",
  ".json",
  ".jsp",
  ".pdf",
  ".php",
  ".rss",
  ".txt",
  ".xml",
  ".zip",
]);

const TRACKING_HOST_KEYWORDS = [
  "analytics",
  "beacon",
  "doubleclick",
  "googletagmanager",
  "pixel",
  "track",
];

const TRACKING_PATH_KEYWORDS = [
  "/analytics",
  "/beacon",
  "/collect",
  "/pixel",
  "/track",
  "/tracking",
];

const STOCK_KEYWORDS = [
  "bonus",
  "buyback",
  "company",
  "dividend",
  "earnings",
  "equity",
  "results",
  "share",
  "stock",
];

const MUTUAL_FUND_KEYWORDS = [
  "amc",
  "aum",
  "fund",
  "mutual",
  "nav",
  "scheme",
  "sip",
];

const IPO_KEYWORDS = [
  "allotment",
  "gmp",
  "ipo",
  "listing",
  "subscription",
];

const REGULATORY_KEYWORDS = [
  "circular",
  "compliance",
  "exchange communication",
  "nse",
  "press release",
  "regulator",
  "regulatory",
  "sebi",
];

export const MARKET_NEWS_FALLBACK_IMAGES: Record<
  MarketNewsFallbackImageKey,
  string
> = {
  market: "/news-fallbacks/riddra-market-news.svg",
  stock: "/news-fallbacks/riddra-stock-news.svg",
  mutual_fund: "/news-fallbacks/riddra-mutual-fund-news.svg",
  regulatory: "/news-fallbacks/riddra-regulatory-news.svg",
  ipo: "/news-fallbacks/riddra-ipo-news.svg",
};

function normalizeKeywordText(...values: Array<string | null | undefined>) {
  return values
    .map((value) => normalizeWhitespace(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function includesAnyKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractPathExtension(pathname: string) {
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
  const lastDot = lastSegment.lastIndexOf(".");

  if (lastDot < 0) {
    return "";
  }

  return lastSegment.slice(lastDot).toLowerCase();
}

function looksLikeTrackingPixel(parsed: URL) {
  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (TRACKING_HOST_KEYWORDS.some((keyword) => host.includes(keyword))) {
    return true;
  }

  if (TRACKING_PATH_KEYWORDS.some((keyword) => pathname.includes(keyword))) {
    return true;
  }

  if (pathname.includes("1x1") || pathname.includes("pixel.gif")) {
    return true;
  }

  const width = parsed.searchParams.get("width") ?? parsed.searchParams.get("w");
  const height = parsed.searchParams.get("height") ?? parsed.searchParams.get("h");

  if ((width === "1" || width === "1px") && (height === "1" || height === "1px")) {
    return true;
  }

  return false;
}

export function normalizeNewsImageUrl(
  value: string | null | undefined,
  baseUrl?: string | null,
) {
  const normalizedUrl = normalizeMarketNewsUrl(value, baseUrl);

  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsed = new URL(normalizedUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (looksLikeTrackingPixel(parsed)) {
      return null;
    }

    const extension = extractPathExtension(parsed.pathname);

    if (extension && REJECTED_NON_IMAGE_EXTENSIONS.has(extension)) {
      return null;
    }

    if (extension && !ALLOWED_REMOTE_IMAGE_EXTENSIONS.has(extension)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function isValidNewsImageUrl(value: string | null | undefined) {
  return Boolean(normalizeNewsImageUrl(value));
}

export function getFallbackNewsImage(input: MarketNewsImageContext) {
  const text = normalizeKeywordText(
    input.title,
    input.excerpt,
    input.sourceName,
    input.sourceUrl,
    input.canonicalUrl,
  );

  if (includesAnyKeyword(text, IPO_KEYWORDS)) {
    return MARKET_NEWS_FALLBACK_IMAGES.ipo;
  }

  if (includesAnyKeyword(text, REGULATORY_KEYWORDS)) {
    return MARKET_NEWS_FALLBACK_IMAGES.regulatory;
  }

  if (includesAnyKeyword(text, MUTUAL_FUND_KEYWORDS)) {
    return MARKET_NEWS_FALLBACK_IMAGES.mutual_fund;
  }

  if (includesAnyKeyword(text, STOCK_KEYWORDS)) {
    return MARKET_NEWS_FALLBACK_IMAGES.stock;
  }

  return MARKET_NEWS_FALLBACK_IMAGES.market;
}

export function getNewsImageForRawItem(
  rawItem: Pick<
    MarketNewsRawItemRecord,
    | "original_title"
    | "original_excerpt"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "raw_payload"
    | "image_url"
  >,
): MarketNewsResolvedImage {
  const imageUrl =
    normalizeNewsImageUrl(rawItem.image_url, rawItem.canonical_url ?? rawItem.source_url) ??
    null;
  const fallbackImageUrl = getFallbackNewsImage({
    title: rawItem.original_title,
    excerpt: rawItem.original_excerpt,
    sourceName: rawItem.source_name,
    sourceUrl: rawItem.source_url,
    canonicalUrl: rawItem.canonical_url,
    rawPayload: rawItem.raw_payload,
    imageUrl,
  });

  return {
    imageUrl,
    fallbackImageUrl,
    displayImageUrl: imageUrl ?? fallbackImageUrl,
    usesFallback: !imageUrl,
  };
}

export function getNewsImageForArticle(
  article: Pick<
    MarketNewsArticleRecord,
    | "rewritten_title"
    | "original_title"
    | "short_summary"
    | "summary"
    | "source_name"
    | "source_url"
    | "canonical_url"
    | "image_url"
    | "fallback_image_url"
    | "image_alt_text"
  >,
  imageRecord?: Pick<
    MarketNewsArticleImageRecord,
    "source_image_url" | "local_image_url" | "fallback_image_url" | "image_alt_text"
  > | null,
) {
  const baseUrl = article.canonical_url ?? article.source_url;
  const imageUrl =
    normalizeNewsImageUrl(article.image_url, baseUrl) ??
    normalizeNewsImageUrl(imageRecord?.local_image_url, baseUrl) ??
    normalizeNewsImageUrl(imageRecord?.source_image_url, baseUrl) ??
    null;
  const fallbackImageUrl =
    normalizeNewsImageUrl(article.fallback_image_url, baseUrl) ??
    normalizeNewsImageUrl(imageRecord?.fallback_image_url, baseUrl) ??
    getFallbackNewsImage({
      title: article.rewritten_title || article.original_title,
      excerpt: article.short_summary || article.summary,
      sourceName: article.source_name,
      sourceUrl: article.source_url,
      canonicalUrl: article.canonical_url,
      imageUrl,
    });
  const altText =
    normalizeWhitespace(article.image_alt_text) ||
    normalizeWhitespace(imageRecord?.image_alt_text) ||
    `${article.rewritten_title || article.original_title} | Riddra Market News`;

  return {
    imageUrl,
    fallbackImageUrl,
    displayImageUrl: imageUrl ?? fallbackImageUrl,
    usesFallback: !imageUrl,
    altText,
  };
}
