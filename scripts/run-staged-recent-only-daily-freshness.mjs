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
  const directCandidates = [
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
  return directCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
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
const BATCH_SIZE = 250;
const PAUSE_MS = 10 * 60 * 1000;
const MIN_INTERVAL_MS = 3000;
const PAGE_SIZE = 1000;
const OUTPUT_LOG_PATH = "/private/tmp/riddra-recent-only-daily-freshness-run.jsonl";
const OUTPUT_SUMMARY_PATH = "/private/tmp/riddra-recent-only-daily-freshness-summary.json";

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

function logProgress(event, payload) {
  const entry = {
    event,
    at: new Date().toISOString(),
    ...payload,
  };
  fs.appendFileSync(OUTPUT_LOG_PATH, `${JSON.stringify(entry)}\n`);
  console.log(JSON.stringify(entry, null, 2));
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
        slug: cleanString(stock.slug, 200) || null,
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
  return lower.includes("cooldown") || lower.includes("429") || lower.includes("too many requests") || lower.includes("rate limit");
}

function isDuplicateKeyError(message) {
  const lower = cleanString(message, 4000).toLowerCase();
  return lower.includes("duplicate key") || lower.includes("stock_price_history_unique");
}

function isDbWriteError(message) {
  const lower = cleanString(message, 4000).toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("could not save") ||
    lower.includes("write") ||
    lower.includes("connection terminated")
  );
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
  fs.writeFileSync(OUTPUT_LOG_PATH, "");
  const supabase = createSupabaseAdminClient();
  const {
    runYahooHistoricalOhlcvImport,
    runYahooQuoteStatisticsImport,
  } = await import("../lib/yahoo-finance-import.ts");

  const actorEmail =
    cleanString(
      process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
        process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
        "Yahoo Recent-Only Daily Freshness Run",
    ) || "Yahoo Recent-Only Daily Freshness Run";

  const initialFreshness = await computeFreshnessSnapshot(supabase);
  const batches = [];
  let stopReason = null;
  let stopDetails = null;
  const initialStale = initialFreshness.staleStocks;
  const totalBatches = Math.ceil(initialStale.length / BATCH_SIZE);

  logProgress("recent_only_run_started", {
    actorEmail,
    today: TODAY,
    totalActiveStocks: initialFreshness.totalActiveStocks,
    initialFreshness: {
      todayPriceCount: initialFreshness.todayPriceCount,
      todaySnapshotCount: initialFreshness.todaySnapshotCount,
      staleCount: initialFreshness.staleCount,
    },
    totalBatches,
  });

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    const freshStateBefore = await computeFreshnessSnapshot(supabase);
    const batchStocks = freshStateBefore.staleStocks.slice(0, BATCH_SIZE);
    if (!batchStocks.length) break;

    const batchNumber = batchIndex + 1;
    const batchSummary = {
      batchNumber,
      totalBatches,
      stocksAttempted: batchStocks.length,
      stocksCompleted: 0,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      failedStocks: [],
      errors: [],
      duplicateKeyErrorCount: 0,
      dbWriteErrorCount: 0,
      requestsAvoided: 0,
      warnings: [],
      cooldownStatus: {
        active: false,
        reason: null,
      },
      freshnessAfterBatch: null,
    };

    logProgress("batch_started", {
      batchNumber,
      totalBatches,
      stocksAttempted: batchStocks.length,
      sampleSymbols: batchStocks.slice(0, 10).map((stock) => stock.yahooSymbol),
    });

    for (const stock of batchStocks) {
      try {
        if (stock.missingTodayPrice) {
          const historical = await runRequestWithThrottle(() =>
            runYahooHistoricalOhlcvImport({
              yahooSymbol: stock.yahooSymbol,
              stockId: stock.stockId,
              actorEmail,
              period: "5d",
              interval: "1d",
              duplicateMode: "skip_existing_dates",
            }),
          );
          batchSummary.insertedRows += historical.insertedRows;
          batchSummary.updatedRows += historical.updatedRows;
          batchSummary.skippedRows += historical.skippedRows;
          batchSummary.requestsAvoided += historical.savedRequestsAvoided;
          if (historical.warnings.length) {
            batchSummary.warnings.push(
              `${stock.yahooSymbol} historical: ${historical.warnings.join(" ")}`,
            );
          }
        }

        if (stock.missingTodaySnapshot) {
          const quote = await runRequestWithThrottle(() =>
            runYahooQuoteStatisticsImport({
              yahooSymbol: stock.yahooSymbol,
              stockId: stock.stockId,
              actorEmail,
              snapshotOnly: true,
            }),
          );
          batchSummary.requestsAvoided += quote.savedRequestsAvoided;
          batchSummary.skippedRows += quote.skippedExistingSnapshot ? 1 : 0;
          if (quote.skippedExistingSnapshot) {
            batchSummary.warnings.push(`${stock.yahooSymbol} snapshot already existed for ${TODAY}.`);
          }
          if (quote.warnings.length) {
            batchSummary.warnings.push(
              `${stock.yahooSymbol} snapshot: ${quote.warnings.join(" ")}`,
            );
          }
        }

        batchSummary.stocksCompleted += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown recent-only daily update failure.";
        batchSummary.failedStocks.push(stock.yahooSymbol);
        batchSummary.errors.push({
          yahooSymbol: stock.yahooSymbol,
          message,
        });
        if (isDuplicateKeyError(message)) {
          batchSummary.duplicateKeyErrorCount += 1;
        }
        if (isDbWriteError(message)) {
          batchSummary.dbWriteErrorCount += 1;
        }
        if (isCooldownError(message)) {
          batchSummary.cooldownStatus = {
            active: true,
            reason: message,
          };
        }
      }

      if (batchSummary.cooldownStatus.active) {
        stopReason = "yahoo_cooldown";
        stopDetails = batchSummary.cooldownStatus.reason;
        break;
      }
      if (batchSummary.duplicateKeyErrorCount > 0) {
        stopReason = "duplicate_key_errors";
        stopDetails = batchSummary.errors;
        break;
      }
      if (batchSummary.dbWriteErrorCount > 0) {
        stopReason = "db_write_errors";
        stopDetails = batchSummary.errors;
        break;
      }
    }

    const freshnessAfter = await computeFreshnessSnapshot(supabase);
    batchSummary.freshnessAfterBatch = {
      totalActiveStocks: freshnessAfter.totalActiveStocks,
      todayPriceCount: freshnessAfter.todayPriceCount,
      todaySnapshotCount: freshnessAfter.todaySnapshotCount,
      staleCount: freshnessAfter.staleCount,
    };

    batches.push(batchSummary);
    logProgress("batch_completed", batchSummary);

    if (stopReason) break;

    if (freshnessAfter.staleCount === 0) {
      break;
    }

    if (batchNumber < totalBatches) {
      logProgress("batch_pause_started", {
        batchNumber,
        pauseMs: PAUSE_MS,
      });
      await sleep(PAUSE_MS);
      logProgress("batch_pause_completed", {
        batchNumber,
      });
    }
  }

  const finalFreshness = await computeFreshnessSnapshot(supabase);
  const summary = {
    today: TODAY,
    actorEmail,
    totalBatchesPlanned: totalBatches,
    batchesCompleted: batches.length,
    stopReason,
    stopDetails,
    initialFreshness: {
      totalActiveStocks: initialFreshness.totalActiveStocks,
      todayPriceCount: initialFreshness.todayPriceCount,
      todaySnapshotCount: initialFreshness.todaySnapshotCount,
      staleCount: initialFreshness.staleCount,
    },
    finalFreshness: {
      totalActiveStocks: finalFreshness.totalActiveStocks,
      todayPriceCount: finalFreshness.todayPriceCount,
      todaySnapshotCount: finalFreshness.todaySnapshotCount,
      staleCount: finalFreshness.staleCount,
    },
    batches,
  };

  fs.writeFileSync(OUTPUT_SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("[run-staged-recent-only-daily-freshness] failed", error);
  process.exitCode = 1;
});
