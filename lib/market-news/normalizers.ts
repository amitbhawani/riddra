import { createHash } from "crypto";

const TRACKING_QUERY_PARAM_PREFIXES = ["utm_"];
const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "ref",
  "ref_src",
  "spm",
  "yclid",
]);

const XML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

function decodeEntity(entity: string) {
  if (entity.startsWith("#x")) {
    const codePoint = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : `&${entity};`;
  }

  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : `&${entity};`;
  }

  return XML_ENTITY_MAP[entity] ?? `&${entity};`;
}

export function decodeXmlEntities(value: string | null | undefined) {
  return String(value ?? "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) =>
    decodeEntity(entity),
  );
}

export function normalizeWhitespace(value: string | null | undefined) {
  return decodeXmlEntities(String(value ?? ""))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtmlToText(value: string | null | undefined) {
  return normalizeWhitespace(
    String(value ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

export function normalizeMarketNewsTitle(value: string | null | undefined) {
  return stripHtmlToText(value).toLowerCase();
}

function shouldDropQueryParam(key: string) {
  const normalized = key.trim().toLowerCase();

  if (TRACKING_QUERY_PARAMS.has(normalized)) {
    return true;
  }

  return TRACKING_QUERY_PARAM_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function normalizeMarketNewsUrl(value: string | null | undefined, baseUrl?: string | null) {
  const normalizedInput = normalizeWhitespace(value);

  if (!normalizedInput) {
    return null;
  }

  try {
    const parsed = baseUrl ? new URL(normalizedInput, baseUrl) : new URL(normalizedInput);
    parsed.hash = "";

    const retainedParams = Array.from(parsed.searchParams.entries())
      .filter(([key]) => !shouldDropQueryParam(key))
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        if (leftKey === rightKey) {
          return leftValue.localeCompare(rightValue);
        }

        return leftKey.localeCompare(rightKey);
      });

    parsed.search = "";

    for (const [key, nextValue] of retainedParams) {
      parsed.searchParams.append(key, nextValue);
    }

    const result = parsed.toString();

    if (parsed.pathname !== "/" && result.endsWith("/")) {
      return result.slice(0, -1);
    }

    return result;
  } catch {
    return null;
  }
}

export function normalizeMarketNewsExcerpt(value: string | null | undefined) {
  const cleaned = stripHtmlToText(value);
  return cleaned || null;
}

export function parseMarketNewsPublishedAt(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (/^\d{10}$/.test(normalized)) {
    const timestamp = Number.parseInt(normalized, 10) * 1000;
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
  }

  if (/^\d{13}$/.test(normalized)) {
    const timestamp = Number.parseInt(normalized, 10);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
  }

  const gdeltMatch = normalized.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );

  if (gdeltMatch) {
    const [, year, month, day, hour, minute, second] = gdeltMatch;
    return new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
    ).toISOString();
  }

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function extractImageUrlFromHtml(value: string | null | undefined, baseUrl?: string | null) {
  return extractImageUrlsFromHtml(value, baseUrl)[0] ?? null;
}

function readHtmlAttribute(markup: string, attribute: string) {
  const match = markup.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
  return normalizeWhitespace(match?.[1]);
}

function readFirstSrcSetCandidate(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  const firstEntry = normalized.split(",")[0]?.trim() ?? "";
  return firstEntry.split(/\s+/)[0] ?? null;
}

export function extractImageUrlsFromHtml(
  value: string | null | undefined,
  baseUrl?: string | null,
) {
  const html = String(value ?? "");

  if (!html) {
    return [];
  }

  const candidates: string[] = [];

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property =
      readHtmlAttribute(tag, "property").toLowerCase() ||
      readHtmlAttribute(tag, "name").toLowerCase();

    if (
      property === "og:image" ||
      property === "og:image:url" ||
      property === "twitter:image"
    ) {
      const content = readHtmlAttribute(tag, "content");

      if (content) {
        candidates.push(content);
      }
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src =
      readHtmlAttribute(tag, "src") ||
      readHtmlAttribute(tag, "data-src") ||
      readHtmlAttribute(tag, "data-original") ||
      readFirstSrcSetCandidate(readHtmlAttribute(tag, "srcset"));

    if (src) {
      candidates.push(src);
    }
  }

  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = match[0];
    const src =
      readHtmlAttribute(tag, "src") ||
      readFirstSrcSetCandidate(readHtmlAttribute(tag, "srcset"));

    if (src) {
      candidates.push(src);
    }
  }

  return Array.from(
    new Set(
      candidates
        .map((candidate) => normalizeMarketNewsUrl(candidate, baseUrl))
        .filter((candidate): candidate is string => Boolean(candidate)),
    ),
  );
}

export function buildMarketNewsContentHash(input: {
  canonicalUrl?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
}) {
  const canonical = normalizeMarketNewsUrl(input.canonicalUrl ?? input.sourceUrl ?? null) ?? "";
  const title = normalizeMarketNewsTitle(input.title);

  return createHash("sha256")
    .update(`${canonical}::${title}`, "utf8")
    .digest("hex");
}
