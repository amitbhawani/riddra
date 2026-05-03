import { createSupabaseReadClient } from "@/lib/supabase/admin";
import type { SearchCatalogEntry } from "@/lib/search-catalog";

type JsonRecord = Record<string, unknown>;

export type PublicSearchFallbackEntry = SearchCatalogEntry & {
  context: string;
  truthLabel?: string;
  score: number;
};

type TimedCacheEntry = {
  expiresAt: number;
  entries: PublicSearchFallbackEntry[];
};

const PUBLIC_SEARCH_FALLBACK_CACHE_TTL_MS = 60_000;
const publicSearchFallbackCache = new Map<string, TimedCacheEntry>();

function cleanString(value: unknown, maxLength = 400) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function readCache(key: string) {
  const cached = publicSearchFallbackCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    publicSearchFallbackCache.delete(key);
    return null;
  }

  return cached.entries;
}

function writeCache(key: string, entries: PublicSearchFallbackEntry[]) {
  publicSearchFallbackCache.set(key, {
    entries,
    expiresAt: Date.now() + PUBLIC_SEARCH_FALLBACK_CACHE_TTL_MS,
  });
}

function scoreTextMatch(input: {
  query: string;
  title: string;
  aliases?: Array<string | null | undefined>;
  categoryBoost?: number;
}) {
  const normalizedQuery = normalizeText(input.query);
  const title = normalizeText(input.title);
  const aliases = (input.aliases ?? [])
    .map((value) => normalizeText(cleanString(value, 200)))
    .filter(Boolean);
  let score = input.categoryBoost ?? 0;

  if (!normalizedQuery) {
    return 0;
  }

  if (title === normalizedQuery) {
    score += 1400;
  } else if (aliases.includes(normalizedQuery)) {
    score += 1280;
  } else if (title.startsWith(normalizedQuery)) {
    score += 1120;
  } else if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    score += 1000;
  } else if (title.includes(normalizedQuery)) {
    score += 840;
  } else if (aliases.some((alias) => alias.includes(normalizedQuery))) {
    score += 720;
  }

  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  for (const term of terms) {
    if (title.startsWith(term)) {
      score += 90;
      continue;
    }

    if (title.includes(term)) {
      score += 55;
      continue;
    }

    if (aliases.some((alias) => alias === term || alias.startsWith(term))) {
      score += 70;
      continue;
    }

    if (aliases.some((alias) => alias.includes(term))) {
      score += 45;
    }
  }

  return score;
}

function dedupeEntries(entries: PublicSearchFallbackEntry[]) {
  return entries.filter(
    (entry, index, allEntries) =>
      allEntries.findIndex((candidate) => candidate.href === entry.href) === index,
  );
}

async function safeRows(
  label: string,
  queryFactory: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
) {
  try {
    const { data, error } = await queryFactory();

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[public-search-fallback] query failed", {
          label,
          error: error.message,
        });
      }
      return [] as JsonRecord[];
    }

    return Array.isArray(data) ? (data as JsonRecord[]) : [];
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[public-search-fallback] query threw", {
        label,
        error,
      });
    }
    return [] as JsonRecord[];
  }
}

function buildStockEntries(rows: JsonRecord[], query: string): PublicSearchFallbackEntry[] {
  const entries: PublicSearchFallbackEntry[] = [];

  for (const row of rows) {
    const slug = cleanString(row.slug, 160);
    const symbol = cleanString(row.symbol, 80);
    const companyName = cleanString(row.company_name, 200);
    const yahooSymbol = cleanString(row.yahoo_symbol, 80);
    const exchange = cleanString(row.exchange, 80);

    if (!slug || !companyName) {
      continue;
    }

    const entry: PublicSearchFallbackEntry = {
      title: companyName,
      href: `/stocks/${slug}`,
      category: "Stock",
      query: `${companyName} ${symbol} ${yahooSymbol} ${slug}`.trim(),
      reasonBase: "stored stock route identity",
      context: [exchange || "Exchange stored", symbol || yahooSymbol || "Symbol stored"]
        .filter(Boolean)
        .join(" • "),
      truthLabel: "Stored Riddra market data",
      score: scoreTextMatch({
        query,
        title: companyName,
        aliases: [symbol, yahooSymbol, slug.replace(/-/g, " ")],
        categoryBoost: 240,
      }),
    };

    if (entry.score > 0) {
      entries.push(entry);
    }
  }

  return entries;
}

function buildFundEntries(rows: JsonRecord[], query: string): PublicSearchFallbackEntry[] {
  const entries: PublicSearchFallbackEntry[] = [];

  for (const row of rows) {
    const slug = cleanString(row.slug, 160);
    const fundName = cleanString(row.fund_name, 200);
    const category = cleanString(row.category, 120);
    const benchmark = cleanString(row.benchmark, 160);

    if (!slug || !fundName) {
      continue;
    }

    const entry: PublicSearchFallbackEntry = {
      title: fundName,
      href: `/mutual-funds/${slug}`,
      category: "Mutual Fund",
      query: `${fundName} ${category} ${benchmark} ${slug}`.trim(),
      reasonBase: "stored fund route identity",
      context: [category || "Fund route", benchmark || null].filter(Boolean).join(" • "),
      truthLabel: "Stored Riddra fund data",
      score: scoreTextMatch({
        query,
        title: fundName,
        aliases: [slug.replace(/-/g, " "), category, benchmark],
        categoryBoost: 120,
      }),
    };

    if (entry.score > 0) {
      entries.push(entry);
    }
  }

  return entries;
}

function buildIpoEntries(rows: JsonRecord[], query: string): PublicSearchFallbackEntry[] {
  const entries: PublicSearchFallbackEntry[] = [];

  for (const row of rows) {
    const slug = cleanString(row.slug, 160);
    const companyName = cleanString(row.company_name, 200);
    const status = cleanString(row.status, 120);

    if (!slug || !companyName) {
      continue;
    }

    const entry: PublicSearchFallbackEntry = {
      title: companyName,
      href: `/ipo/${slug}`,
      category: "IPO",
      query: `${companyName} ${status} ${slug}`.trim(),
      reasonBase: "stored IPO route identity",
      context: status || "IPO route",
      truthLabel: "Stored Riddra IPO data",
      score: scoreTextMatch({
        query,
        title: companyName,
        aliases: [slug.replace(/-/g, " "), status],
        categoryBoost: 90,
      }),
    };

    if (entry.score > 0) {
      entries.push(entry);
    }
  }

  return entries;
}

function buildIndexEntries(rows: JsonRecord[], query: string): PublicSearchFallbackEntry[] {
  const entries: PublicSearchFallbackEntry[] = [];

  for (const row of rows) {
    const slug = cleanString(row.slug, 160);
    const name = cleanString(row.title, 200) || cleanString(row.name, 200) || cleanString(row.display_name, 200);

    if (!slug || !name) {
      continue;
    }

    const entry: PublicSearchFallbackEntry = {
      title: name,
      href: slug.startsWith("/") ? slug : `/${slug}`,
      category: "Index",
      query: `${name} ${slug}`.trim(),
      reasonBase: "stored index route identity",
      context: "Tracked index route",
      truthLabel: "Stored Riddra index data",
      score: scoreTextMatch({
        query,
        title: name,
        aliases: [slug.replace(/-/g, " "), slug],
        categoryBoost: 100,
      }),
    };

    if (entry.score > 0) {
      entries.push(entry);
    }
  }

  return entries;
}

export async function searchPublicCatalogFallback(query: string, limit = 12) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [] as PublicSearchFallbackEntry[];
  }

  const cacheKey = `${normalizedQuery}:${limit}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }

  const supabase = createSupabaseReadClient();
  const likePattern = `%${cleanString(query, 120).replace(/[%]/g, "").trim()}%`;

  const [stockRows, fundRows, ipoRows, indexRows] = await Promise.all([
    safeRows("stocks_master", () =>
      supabase
        .from("stocks_master")
        .select("slug, symbol, company_name, yahoo_symbol, exchange")
        .eq("status", "active")
        .or(
          [
            `symbol.ilike.${likePattern}`,
            `company_name.ilike.${likePattern}`,
            `slug.ilike.${likePattern}`,
            `yahoo_symbol.ilike.${likePattern}`,
          ].join(","),
        )
        .limit(Math.max(limit, 8)),
    ),
    safeRows("mutual_funds", () =>
      supabase
        .from("mutual_funds")
        .select("slug, fund_name, category, benchmark")
        .or(
          [
            `fund_name.ilike.${likePattern}`,
            `slug.ilike.${likePattern}`,
            `category.ilike.${likePattern}`,
          ].join(","),
        )
        .limit(Math.max(Math.min(limit, 6), 4)),
    ),
    safeRows("ipos", () =>
      supabase
        .from("ipos")
        .select("slug, company_name, status")
        .or([`company_name.ilike.${likePattern}`, `slug.ilike.${likePattern}`].join(","))
        .limit(Math.max(Math.min(limit, 6), 4)),
    ),
    safeRows("tracked_indexes", () =>
      supabase
        .from("tracked_indexes")
        .select("slug, title")
        .or([`title.ilike.${likePattern}`, `slug.ilike.${likePattern}`].join(","))
        .limit(Math.max(Math.min(limit, 5), 3)),
    ),
  ]);

  const entries = dedupeEntries([
    ...buildStockEntries(stockRows, query),
    ...buildFundEntries(fundRows, query),
    ...buildIpoEntries(ipoRows, query),
    ...buildIndexEntries(indexRows, query),
  ])
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);

  writeCache(cacheKey, entries);
  return entries;
}
