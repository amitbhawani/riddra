import fs from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

function resolveAliasCandidate(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const relativePath = specifier.slice(2);
  const basePath = path.join(process.cwd(), relativePath);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveNextPackageCandidate(specifier) {
  if (!specifier.startsWith("next/") || path.extname(specifier)) return null;
  try {
    return require.resolve(`${specifier}.js`);
  } catch {
    return null;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliasCandidate = resolveAliasCandidate(specifier);
    if (aliasCandidate) {
      return { shortCircuit: true, url: pathToFileURL(aliasCandidate).href };
    }
    const nextPackageCandidate = resolveNextPackageCandidate(specifier);
    if (nextPackageCandidate) {
      return { shortCircuit: true, url: pathToFileURL(nextPackageCandidate).href };
    }
    return nextResolve(specifier, context);
  },
});

const TODAY = "2026-04-30";
const PAGE_SIZE = 1000;
const BATCH_SIZE = 250;
const MIN_INTERVAL_MS = 4000;
const OUTPUT_PATH = "/private/tmp/riddra-stale-remainder-retry-report.json";

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function selectAllPaged(baseQueryFactory) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await baseQueryFactory().range(from, to);
    if (error) throw new Error(error.message);
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function loadActiveNseStocks(supabase) {
  return await selectAllPaged(() =>
    supabase
      .from("stocks_master")
      .select("id, slug, symbol, yahoo_symbol, company_name")
      .eq("exchange", "NSE")
      .eq("status", "active")
      .order("symbol", { ascending: true }),
  );
}

async function loadStockIdsWithDate(supabase, tableName, tradeDate) {
  const rows = await selectAllPaged(() =>
    supabase.from(tableName).select("stock_id").eq("trade_date", tradeDate).order("stock_id", { ascending: true }),
  );
  return new Set(rows.map((row) => cleanString(row.stock_id, 160)).filter(Boolean));
}

async function computeFreshnessSnapshot(supabase) {
  const [stocks, todayHistoryIds, todaySnapshotIds] = await Promise.all([
    loadActiveNseStocks(supabase),
    loadStockIdsWithDate(supabase, "stock_price_history", TODAY),
    loadStockIdsWithDate(supabase, "stock_market_snapshot", TODAY),
  ]);

  const staleStocks = stocks.filter((stock) => {
    const stockId = cleanString(stock.id, 160);
    return !todayHistoryIds.has(stockId) || !todaySnapshotIds.has(stockId);
  });

  return {
    totalActiveStocks: stocks.length,
    todayPriceCount: todayHistoryIds.size,
    todaySnapshotCount: todaySnapshotIds.size,
    staleCount: staleStocks.length,
    staleStocks: staleStocks.map((stock) => {
      const stockId = cleanString(stock.id, 160);
      return {
        stockId,
        symbol: cleanString(stock.symbol, 160).toUpperCase(),
        yahooSymbol: cleanString(stock.yahoo_symbol, 160).toUpperCase(),
        companyName: cleanString(stock.company_name, 4000) || null,
        missingTodayPrice: !todayHistoryIds.has(stockId),
        missingTodaySnapshot: !todaySnapshotIds.has(stockId),
      };
    }),
  };
}

function isCooldownError(message) {
  const lower = cleanString(message, 4000).toLowerCase();
  return (
    lower.includes("cooldown") ||
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  );
}

function categorizeFailure(message) {
  const lower = cleanString(message, 4000).toLowerCase();
  if (
    lower.includes("no data") ||
    lower.includes("empty") ||
    lower.includes("not found") ||
    lower.includes("missing chart result")
  ) {
    return "provider_no_data";
  }
  if (
    lower.includes("invalid symbol") ||
    lower.includes("symbol") ||
    lower.includes("delisted")
  ) {
    return "symbol_issue";
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("write") ||
    lower.includes("connection terminated") ||
    lower.includes("duplicate key")
  ) {
    return "db_write_issue";
  }
  if (lower.includes("already existed") || lower.includes("skip")) {
    return "skipped_existing";
  }
  return "unknown";
}

async function runRequestWithThrottle(fn) {
  const started = Date.now();
  const result = await fn();
  const elapsed = Date.now() - started;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  return result;
}

async function main() {
  const supabase = createSupabaseAdminClient();
  const { runYahooHistoricalOhlcvImport, runYahooQuoteStatisticsImport } = await import("../lib/yahoo-finance-import.ts");
  const actorEmail = "Yahoo Stale Remainder Retry Run";

  const before = await computeFreshnessSnapshot(supabase);
  const retryTargets = before.staleStocks.slice(0, BATCH_SIZE);

  const summary = {
    today: TODAY,
    actorEmail,
    staleBeforeRetry: before.staleCount,
    attempted: retryTargets.length,
    completed: 0,
    stillStale: null,
    reasonCategories: {
      provider_no_data: 0,
      symbol_issue: 0,
      db_write_issue: 0,
      skipped_existing: 0,
      unknown: 0,
    },
    cooldownTriggered: false,
    errors: [],
    sampleSymbols: retryTargets.slice(0, 25).map((stock) => stock.yahooSymbol),
  };

  for (const stock of retryTargets) {
    try {
      if (stock.missingTodayPrice) {
        await runRequestWithThrottle(() =>
          runYahooHistoricalOhlcvImport({
            yahooSymbol: stock.yahooSymbol,
            stockId: stock.stockId,
            actorEmail,
            period: "5d",
            interval: "1d",
            duplicateMode: "skip_existing_dates",
          }),
        );
      }

      if (stock.missingTodaySnapshot) {
        await runRequestWithThrottle(() =>
          runYahooQuoteStatisticsImport({
            yahooSymbol: stock.yahooSymbol,
            stockId: stock.stockId,
            actorEmail,
            snapshotOnly: true,
          }),
        );
      }

      summary.completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown stale remainder retry failure.";
      const category = categorizeFailure(message);
      summary.reasonCategories[category] += 1;
      summary.errors.push({
        yahooSymbol: stock.yahooSymbol,
        category,
        message,
      });
      if (isCooldownError(message)) {
        summary.cooldownTriggered = true;
        break;
      }
    }
  }

  const after = await computeFreshnessSnapshot(supabase);
  summary.stillStale = after.staleCount;
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("[run-stale-remainder-retry-once] failed", error);
  process.exitCode = 1;
});
