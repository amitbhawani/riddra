import fs from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.RIDDRA_ROUTE_CHECK_BASE_URL || "http://127.0.0.1:3001";
const OUTPUT_PATH =
  process.env.RIDDRA_ROUTE_CHECK_OUTPUT || "/private/tmp/riddra-stock-route-breadth-check.json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function fetchAll(table, selectClause, configure) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase.from(table).select(selectClause).range(from, from + pageSize - 1);
    if (configure) {
      query = configure(query);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

function buildSample({ legacy, stocks }) {
  const legacySlugs = new Set(legacy.map((item) => item.slug));
  const canonicalOnly = stocks.filter((item) => !legacySlugs.has(item.slug));

  const buckets = {
    numeric: canonicalOnly.filter((item) => /\d/.test(item.slug)),
    long: canonicalOnly.filter((item) => item.slug.length >= 28),
    hyphenHeavy: canonicalOnly.filter((item) => (item.slug.match(/-/g)?.length ?? 0) >= 3),
    symbolOdd: canonicalOnly.filter((item) => /[^A-Z0-9]/.test(item.symbol)),
    short: canonicalOnly.filter((item) => item.slug.length <= 8),
  };

  const chosen = [];
  const used = new Set();
  const add = (row, tag) => {
    if (!row || used.has(row.slug) || chosen.length >= 78) {
      return;
    }
    used.add(row.slug);
    chosen.push({ ...row, source: "canonical-only", tag });
  };

  for (const row of buckets.numeric.slice(0, 20)) add(row, "numeric");
  for (const row of buckets.long.slice(0, 20)) add(row, "long");
  for (const row of buckets.hyphenHeavy.slice(0, 20)) add(row, "hyphen");
  for (const row of buckets.symbolOdd.slice(0, 10)) add(row, "symbol-odd");
  for (const row of buckets.short.slice(0, 8)) add(row, "short");
  for (const row of canonicalOnly) add(row, "general");

  return [
    ...legacy.map((row) => ({ symbol: row.symbol, slug: row.slug, source: "legacy", tag: "legacy" })),
    ...chosen.slice(0, 78).map((row) => ({
      symbol: row.symbol,
      slug: row.slug,
      source: row.source,
      tag: row.tag,
    })),
  ];
}

async function main() {
  const [legacy, stocks] = await Promise.all([
    fetchAll("instruments", "symbol, slug, status, instrument_type", (query) =>
      query.eq("status", "active").eq("instrument_type", "stock").order("slug", { ascending: true }),
    ),
    fetchAll("stocks_master", "id, symbol, slug, company_name, yahoo_symbol, status, instrument_id", (query) =>
      query.eq("status", "active").order("slug", { ascending: true }),
    ),
  ]);

  const sample = buildSample({ legacy, stocks });
  const results = [];

  for (let index = 0; index < sample.length; index += 1) {
    const row = sample[index];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), 20_000);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/stocks/${row.slug}`, {
        signal: controller.signal,
        redirect: "manual",
      });
      const text = await response.text();
      results.push({
        slug: row.slug,
        symbol: row.symbol,
        source: row.source,
        tag: row.tag,
        status: response.status,
        durationMs: Date.now() - startedAt,
        title: /<title>(.*?)<\/title>/i.exec(text)?.[1] ?? null,
        hasStockNotFound: /Stock not found/i.test(text),
        hasApplicationError: /Application error|Internal Server Error|Server Error/i.test(text),
        hasEmptyStateText: /(awaiting|unavailable|no data|not available)/i.test(text),
      });
    } catch (error) {
      results.push({
        slug: row.slug,
        symbol: row.symbol,
        source: row.source,
        tag: row.tag,
        status: 0,
        durationMs: Date.now() - startedAt,
        error: String(error),
      });
    } finally {
      clearTimeout(timeout);
    }

    if ((index + 1) % 10 === 0 || index === sample.length - 1) {
      const status200 = results.filter((item) => item.status === 200).length;
      const status404 = results.filter((item) => item.status === 404).length;
      const status500 = results.filter((item) => item.status === 500).length;
      const status0 = results.filter((item) => item.status === 0).length;
      console.log(
        JSON.stringify(
          {
            progress: `${index + 1}/${sample.length}`,
            status200,
            status404,
            status500,
            status0,
            lastSlug: row.slug,
          },
          null,
          2,
        ),
      );
    }
  }

  const summary = {
    baseUrl: BASE_URL,
    total: results.length,
    status200: results.filter((item) => item.status === 200).length,
    status404: results.filter((item) => item.status === 404).length,
    status500: results.filter((item) => item.status === 500).length,
    status0: results.filter((item) => item.status === 0).length,
    emptyStateHits: results.filter((item) => item.hasEmptyStateText).length,
    slowOver5s: results.filter((item) => item.durationMs > 5000).length,
    failures: results.filter((item) => item.status !== 200 || item.hasApplicationError),
    results,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${OUTPUT_PATH}`);
}

await main();
