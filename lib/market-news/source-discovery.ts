import { normalizeMarketNewsUrl, normalizeWhitespace } from "@/lib/market-news/normalizers";
import type {
  MarketNewsSourceDraftInput,
  MarketNewsSourceRecord,
  MarketNewsSourceTestResult,
  MarketNewsSourceType,
} from "@/lib/market-news/types";

const SOURCE_TEST_TIMEOUT_MS = 10_000;
const SOURCE_DISCOVERY_HEADERS = {
  Accept:
    "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5",
  "User-Agent": "RiddraMarketNewsSourceTest/1.0 (+https://www.riddra.com)",
};

type MarketNewsSourceLike = Pick<
  MarketNewsSourceRecord,
  "name" | "slug" | "source_type" | "homepage_url" | "feed_url" | "api_url"
> &
  {
    id?: string | null;
  } &
  Partial<Pick<MarketNewsSourceRecord, "category" | "region" | "notes">>;

export type MarketNewsFeedDiscoveryResult = {
  homepageUrl: string | null;
  reachable: boolean;
  blocked: boolean;
  statusCode: number | null;
  detectedFeedUrl: string | null;
  errorMessage: string | null;
};

function createTimeoutSignal(timeoutMs = SOURCE_TEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
    },
  };
}

function looksBlocked(statusCode: number | null, body: string) {
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
    return true;
  }

  const normalized = body.toLowerCase();

  return [
    "access denied",
    "attention required",
    "captcha",
    "cf-browser-verification",
    "cloudflare",
    "enable javascript",
    "just a moment",
    "paywall",
    "please subscribe",
    "sign in to continue",
  ].some((token) => normalized.includes(token));
}

async function fetchTextWithStatus(url: string) {
  const { signal, cleanup } = createTimeoutSignal();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: SOURCE_DISCOVERY_HEADERS,
      cache: "no-store",
      signal,
    });
    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      text,
      url: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      text: "",
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    cleanup();
  }
}

function extractAlternateFeedLinks(markup: string, baseUrl: string) {
  const links = new Set<string>();
  const alternatePattern =
    /<link\b[^>]*rel=["'][^"']*alternate[^"']*["'][^>]*type=["'](?:application\/rss\+xml|application\/atom\+xml|text\/xml|application\/xml)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;

  for (const match of markup.matchAll(alternatePattern)) {
    const normalized = normalizeMarketNewsUrl(match[1], baseUrl);

    if (normalized) {
      links.add(normalized);
    }
  }

  const hrefPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

  for (const match of markup.matchAll(hrefPattern)) {
    const href = normalizeWhitespace(match[1]);

    if (!href || !/(rss|feed|atom|xml)/i.test(href)) {
      continue;
    }

    const normalized = normalizeMarketNewsUrl(href, baseUrl);

    if (normalized) {
      links.add(normalized);
    }
  }

  return Array.from(links);
}

function countRssItems(markup: string) {
  const itemCount = (markup.match(/<item\b/gi) ?? []).length;
  const entryCount = (markup.match(/<entry\b/gi) ?? []).length;
  return itemCount || entryCount;
}

function countJsonItems(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (!payload || typeof payload !== "object") {
    return 0;
  }

  for (const key of ["articles", "data", "items", "results", "stories"]) {
    const value = (payload as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 0;
}

function getSafeSourceType(source: Pick<MarketNewsSourceLike, "source_type">, hasFeedUrl: boolean): MarketNewsSourceType {
  if (source.source_type === "blocked" || source.source_type === "candidate") {
    return hasFeedUrl ? "rss" : "candidate";
  }

  return source.source_type;
}

export async function discoverNewsFeedFromHomepage(
  homepageUrl: string | null | undefined,
): Promise<MarketNewsFeedDiscoveryResult> {
  const normalizedHomepageUrl = normalizeMarketNewsUrl(homepageUrl);

  if (!normalizedHomepageUrl) {
    return {
      homepageUrl: null,
      reachable: false,
      blocked: false,
      statusCode: null,
      detectedFeedUrl: null,
      errorMessage: "Homepage URL is missing.",
    };
  }

  const response = await fetchTextWithStatus(normalizedHomepageUrl);

  if (response.status === null) {
    return {
      homepageUrl: normalizedHomepageUrl,
      reachable: false,
      blocked: false,
      statusCode: null,
      detectedFeedUrl: null,
      errorMessage: response.error ?? "Could not reach the homepage.",
    };
  }

  const blocked = looksBlocked(response.status, response.text);

  if (!response.ok || blocked) {
    return {
      homepageUrl: normalizedHomepageUrl,
      reachable: false,
      blocked,
      statusCode: response.status,
      detectedFeedUrl: null,
      errorMessage: blocked
        ? "Homepage appears protected by anti-bot, paywall, or access controls."
        : `Homepage returned status ${response.status}.`,
    };
  }

  const feedLinks = extractAlternateFeedLinks(response.text, response.url || normalizedHomepageUrl);

  return {
    homepageUrl: normalizedHomepageUrl,
    reachable: true,
    blocked: false,
    statusCode: response.status,
    detectedFeedUrl: feedLinks[0] ?? null,
    errorMessage: feedLinks[0] ? null : "No RSS or Atom feed link was discovered on the homepage.",
  };
}

export function classifySourceReachability(
  result: Pick<MarketNewsSourceTestResult, "reachable" | "blocked" | "sampleItemCount">,
) {
  if (result.blocked) {
    return "blocked" as const;
  }

  if (result.reachable && result.sampleItemCount > 0) {
    return "working" as const;
  }

  if (result.reachable) {
    return "candidate" as const;
  }

  return "failed" as const;
}

export async function testMarketNewsSource(
  source: MarketNewsSourceLike | MarketNewsSourceDraftInput,
): Promise<MarketNewsSourceTestResult> {
  const normalizedHomepageUrl = normalizeMarketNewsUrl(source.homepage_url);
  const normalizedFeedUrl = normalizeMarketNewsUrl(source.feed_url, normalizedHomepageUrl);
  const normalizedApiUrl = normalizeMarketNewsUrl(source.api_url, normalizedHomepageUrl);
  const sourceType = getSafeSourceType(
    {
      source_type: "source_type" in source && source.source_type ? source.source_type : normalizedApiUrl ? "api" : "candidate",
    },
    Boolean(normalizedFeedUrl),
  );
  const sourceName = normalizeWhitespace(source.name);
  const sourceSlug = "slug" in source ? source.slug : null;

  let statusCode: number | null = null;
  let detectedFeedUrl: string | null = normalizedFeedUrl;
  let sampleItemCount = 0;
  let blocked = false;
  let errorMessage: string | null = null;
  let reachable = false;

  if (sourceType === "api" && normalizedApiUrl) {
    const response = await fetchTextWithStatus(normalizedApiUrl);
    statusCode = response.status;
    blocked = looksBlocked(response.status, response.text);

    if (response.ok && !blocked) {
      reachable = true;

      try {
        sampleItemCount = countJsonItems(JSON.parse(response.text));
      } catch {
        errorMessage = "API returned non-JSON content.";
      }
    } else {
      errorMessage = blocked
        ? "API endpoint appears protected or rate-limited."
        : response.status === null
          ? response.error ?? "Could not reach the API endpoint."
          : `API endpoint returned status ${response.status}.`;
    }
  } else {
    const candidateFeedUrls = normalizedFeedUrl ? [normalizedFeedUrl] : [];

    if (!candidateFeedUrls.length && normalizedHomepageUrl) {
      const discovery = await discoverNewsFeedFromHomepage(normalizedHomepageUrl);
      statusCode = discovery.statusCode;
      blocked = discovery.blocked;
      reachable = discovery.reachable;
      errorMessage = discovery.errorMessage;
      detectedFeedUrl = discovery.detectedFeedUrl;

      if (discovery.detectedFeedUrl) {
        candidateFeedUrls.push(discovery.detectedFeedUrl);
      }
    }

    if (candidateFeedUrls.length) {
      const rssResponse = await fetchTextWithStatus(candidateFeedUrls[0]!);
      statusCode = rssResponse.status;
      blocked = looksBlocked(rssResponse.status, rssResponse.text);

      if (rssResponse.ok && !blocked) {
        reachable = true;
        detectedFeedUrl = normalizeMarketNewsUrl(candidateFeedUrls[0], normalizedHomepageUrl);
        sampleItemCount = countRssItems(rssResponse.text);

        if (sampleItemCount <= 0) {
          errorMessage = "Feed was reachable but did not contain any RSS items.";
        } else {
          errorMessage = null;
        }
      } else if (!errorMessage) {
        errorMessage = blocked
          ? "Feed appears protected by anti-bot, paywall, or rate limits."
          : rssResponse.status === null
            ? rssResponse.error ?? "Could not reach the feed URL."
            : `Feed returned status ${rssResponse.status}.`;
      }
    }
  }

  const result: MarketNewsSourceTestResult = {
    sourceName: sourceName || "Untitled source",
    sourceSlug,
    sourceType,
    homepageUrl: normalizedHomepageUrl,
    feedUrl: normalizedFeedUrl,
    detectedFeedUrl,
    reachable,
    statusCode,
    sampleItemCount,
    blocked,
    errorMessage,
    classification: "failed",
  };

  result.classification = classifySourceReachability(result);
  return result;
}
