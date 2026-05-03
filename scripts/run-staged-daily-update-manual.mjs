import fs from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

function resolveAliasCandidate(specifier) {
  if (!specifier.startsWith("@/")) {
    return null;
  }

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
  if (!specifier.startsWith("next/") || path.extname(specifier)) {
    return null;
  }

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
      return {
        shortCircuit: true,
        url: pathToFileURL(aliasCandidate).href,
      };
    }

    const nextPackageCandidate = resolveNextPackageCandidate(specifier);

    if (nextPackageCandidate) {
      return {
        shortCircuit: true,
        url: pathToFileURL(nextPackageCandidate).href,
      };
    }

    return nextResolve(specifier, context);
  },
});

const TODAY = "2026-04-30";
const BATCH_SIZE = 250;
const PAUSE_MS = 10 * 60 * 1000;
const MAX_ITEMS_PER_BATCH_RUN = 500;
const PAGE_SIZE = 1000;
const OUTPUT_LOG_PATH = "/private/tmp/riddra-full-universe-daily-update-manual-run.jsonl";
const OUTPUT_SUMMARY_PATH = "/private/tmp/riddra-full-universe-daily-update-manual-run-summary.json";

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (error) {
      throw new Error(error.message);
    }
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return rows;
}

async function loadActiveNseStocks(supabase) {
  return await selectAllPaged(() =>
    supabase
      .from("stocks_master")
      .select("id, slug, symbol, yahoo_symbol, company_name, exchange, status")
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

async function loadJobItems(supabase, jobId) {
  return await selectAllPaged(() =>
    supabase
      .from("stock_import_job_items")
      .select("id, stock_id, symbol, bucket_key, row_status, action_taken, normalized_row, raw_row")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true }),
  );
}

async function loadJobErrors(supabase, jobId) {
  return await selectAllPaged(() =>
    supabase
      .from("stock_import_errors")
      .select("id, symbol, bucket_key, error_stage, error_message, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true }),
  );
}

function sumItemRows(items) {
  return items.reduce(
    (acc, item) => {
      const normalized = item.normalized_row && typeof item.normalized_row === "object" ? item.normalized_row : {};
      acc.insertedRows += Number(normalized.insertedRows ?? 0) || 0;
      acc.updatedRows += Number(normalized.updatedRows ?? 0) || 0;
      acc.skippedRows += Number(normalized.skippedRows ?? 0) || 0;
      return acc;
    },
    {
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
    },
  );
}

function summarizeErrors(errors) {
  const duplicateKeyErrors = errors.filter((row) => {
    const message = cleanString(row.error_message, 4000).toLowerCase();
    return message.includes("duplicate key") || message.includes("stock_price_history_unique");
  });
  const dbWriteErrors = errors.filter((row) => {
    const message = cleanString(row.error_message, 4000).toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("write") ||
      message.includes("connection terminated") ||
      message.includes("could not save")
    );
  });

  return {
    duplicateKeyErrors,
    dbWriteErrors,
    allErrors: errors.map((row) => ({
      symbol: row.symbol,
      module: row.bucket_key,
      stage: row.error_stage,
      message: row.error_message,
    })),
  };
}

async function main() {
  fs.writeFileSync(OUTPUT_LOG_PATH, "");
  const supabase = createSupabaseAdminClient();
  const {
    createYahooDailyChartUpdateJob,
    runYahooStockBatchImportUntilComplete,
  } = await import("../lib/yahoo-finance-batch-import.ts");

  const actorEmail =
    cleanString(
      process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
        process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
        "Yahoo Full Universe Daily Update Manual Run",
    ) || "Yahoo Full Universe Daily Update Manual Run";

  const initialFreshness = await computeFreshnessSnapshot(supabase);
  const staleStocks = initialFreshness.staleStocks;
  const totalBatches = Math.ceil(staleStocks.length / BATCH_SIZE);
  const batches = [];
  let stopReason = null;

  logProgress("manual_run_started", {
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
    const batchNumber = batchIndex + 1;
    const slice = staleStocks.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
    const stocks = slice.map((stock) => ({
      stockId: stock.stockId,
      yahooSymbol: stock.yahooSymbol,
    }));

    logProgress("batch_started", {
      batchNumber,
      totalBatches,
      stocksAttempted: stocks.length,
      sampleSymbols: slice.slice(0, 10).map((stock) => stock.yahooSymbol),
    });

    const created = await createYahooDailyChartUpdateJob({
      stocks,
      actorEmail,
      force: false,
      dryRun: false,
    });

    const outcome = await runYahooStockBatchImportUntilComplete({
      jobId: created.jobId,
      actorEmail,
      maxItemsPerRun: MAX_ITEMS_PER_BATCH_RUN,
    });

    const [items, errors, freshnessAfter] = await Promise.all([
      loadJobItems(supabase, created.jobId),
      loadJobErrors(supabase, created.jobId),
      computeFreshnessSnapshot(supabase),
    ]);

    const rowSums = sumItemRows(items);
    const errorSummary = summarizeErrors(errors);
    const failedStocks = outcome.report.stockProgress
      .filter((item) => item.status === "failed")
      .map((item) => cleanString(item.yahooSymbol || item.symbol, 160))
      .filter(Boolean);

    const batchSummary = {
      batchNumber,
      totalBatches,
      jobId: created.jobId,
      status: outcome.report.status,
      stocksAttempted: stocks.length,
      stocksCompleted: outcome.report.completedStocks + outcome.report.skippedStocks,
      insertedRows: rowSums.insertedRows,
      updatedRows: rowSums.updatedRows,
      skippedRows: rowSums.skippedRows,
      failedStocks,
      errorCount: errors.length,
      errors: errorSummary.allErrors,
      duplicateKeyErrorCount: errorSummary.duplicateKeyErrors.length,
      dbWriteErrorCount: errorSummary.dbWriteErrors.length,
      cooldownStatus:
        outcome.report.status === "cooling_down" || outcome.report.cooldownUntil
          ? {
              active: true,
              reason: outcome.report.cooldownReason,
              until: outcome.report.cooldownUntil,
            }
          : {
              active: false,
              reason: null,
              until: null,
            },
      requestsAvoided: outcome.report.savedRequestsAvoided,
      freshnessAfterBatch: {
        totalActiveStocks: freshnessAfter.totalActiveStocks,
        todayPriceCount: freshnessAfter.todayPriceCount,
        todaySnapshotCount: freshnessAfter.todaySnapshotCount,
        staleCount: freshnessAfter.staleCount,
      },
      warnings: outcome.warnings,
    };

    batches.push(batchSummary);
    logProgress("batch_completed", batchSummary);

    if (batchSummary.cooldownStatus.active) {
      stopReason = "yahoo_cooldown";
      break;
    }
    if (batchSummary.duplicateKeyErrorCount > 0) {
      stopReason = "duplicate_key_errors";
      break;
    }
    if (batchSummary.dbWriteErrorCount > 0) {
      stopReason = "db_write_errors";
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
  console.error("[run-staged-daily-update-manual] failed", error);
  process.exitCode = 1;
});
