function parseMarketNewsDate(value: string | null | undefined) {
  const timestamp = Date.parse(String(value ?? ""));

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

function normalizeWhitespace(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function humanizeHostLabel(hostname: string) {
  const normalizedHost = hostname.replace(/^www\./i, "").toLowerCase();

  const hostLabelMap: Record<string, string> = {
    "thehindubusinessline.com": "BusinessLine",
    "economictimes.indiatimes.com": "Economic Times",
    "livemint.com": "LiveMint",
    "moneycontrol.com": "Moneycontrol",
    "sebi.gov.in": "SEBI",
    "business-standard.com": "Business Standard",
    "financialexpress.com": "Financial Express",
    "ndtvprofit.com": "NDTV Profit",
    "reuters.com": "Reuters",
    "cnbc.com": "CNBC",
    "bloomberg.com": "Bloomberg",
  };

  if (hostLabelMap[normalizedHost]) {
    return hostLabelMap[normalizedHost];
  }

  const primaryLabel = normalizedHost.split(".")[0] ?? normalizedHost;
  return primaryLabel
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

const MARKET_NEWS_EDITORIAL_LEAK_PATTERNS = [
  /The original source headline focuses on[^.?!]*[.?!]?/gi,
  /The available source excerpt says[^.?!]*[.?!]?/gi,
  /This update is attributed to[^.?!]*[.?!]?/gi,
  /The source published this item on[^.?!]*[.?!]?/gi,
  /The original source link remains attached for direct attribution and additional context\.?/gi,
  /Riddra has classified the update under[^.?!]*[.?!]?/gi,
];

export function sanitizeMarketNewsEditorialCopy(value: string | null | undefined) {
  let nextValue = normalizeWhitespace(value);

  if (!nextValue) {
    return "";
  }

  for (const pattern of MARKET_NEWS_EDITORIAL_LEAK_PATTERNS) {
    nextValue = nextValue.replace(pattern, " ");
  }

  return normalizeWhitespace(nextValue);
}

export function formatMarketNewsAuthorName(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "Riddra Markets Desk";
  }

  if (/^author\b/i.test(normalized)) {
    return "Riddra Markets Desk";
  }

  const cleaned = normalized.replace(/^Author\s+/i, "").trim();
  const lower = cleaned.toLowerCase();

  if (!cleaned || ["amit", "ramit", "tamit"].includes(lower)) {
    return "Riddra Markets Desk";
  }

  return cleaned;
}

export function formatMarketNewsDateTime(value: string | null | undefined) {
  const date = parseMarketNewsDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatMarketNewsFullDate(value: string | null | undefined) {
  const date = parseMarketNewsDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
  }).format(date);
}

export function formatMarketNewsRelativeTime(value: string | null | undefined) {
  const date = parseMarketNewsDate(value);

  if (!date) {
    return null;
  }

  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(hours / 24);

  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function formatMarketNewsSourceLabel(
  sourceName: string | null | undefined,
  sourceUrl: string | null | undefined,
) {
  const normalizedSourceName = normalizeWhitespace(sourceName)
    .replace(/\b(rss|api)\b/gi, "")
    .replace(/\b(companies|markets|business|finance)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedSourceName) {
    return normalizedSourceName;
  }

  const normalizedSourceUrl = normalizeWhitespace(sourceUrl);

  if (!normalizedSourceUrl) {
    return "the source";
  }

  try {
    return humanizeHostLabel(new URL(normalizedSourceUrl).hostname);
  } catch {
    return "the source";
  }
}

export function getMarketNewsSnippet(
  value: string | null | undefined,
  {
    maxWords = 22,
    maxSentences = 1,
  }: {
    maxWords?: number;
    maxSentences?: number;
  } = {},
) {
  const sanitized = sanitizeMarketNewsEditorialCopy(value);

  if (!sanitized) {
    return "";
  }

  const sentenceMatches = sanitized.match(/[^.?!]+[.?!]?/g) ?? [];
  const preferredText = sentenceMatches.slice(0, maxSentences).join(" ").trim() || sanitized;
  const words = preferredText.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return preferredText;
  }

  return `${words.slice(0, maxWords).join(" ").replace(/[.,;:!?-]+$/, "")}…`;
}

export function formatMarketNewsCategoryLabel(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value).replace(/_/g, " ");

  if (!normalized) {
    return "Market news";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}
