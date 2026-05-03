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

const { runYahooDailySameDayOnlyUntilComplete } = await import("../lib/yahoo-finance-batch-import.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllRows(table, selectClause, configure) {
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

async function regenerateFreshness(targetDate) {
  const [stocks, coverageRowsRaw, todayPriceRows, todaySnapshotRows] = await Promise.all([
    fetchAllRows(
      "stocks_master",
      "id, symbol, yahoo_symbol, company_name",
      (query) => query.eq("status", "active").order("id", { ascending: true }),
    ),
    fetchAllRows(
      "stock_import_coverage",
      "stock_id, bucket_key, latest_trade_date, metadata",
      (query) => query.order("stock_id", { ascending: true }),
    ),
    fetchAllRows(
      "stock_price_history",
      "stock_id, trade_date",
      (query) =>
        query.eq("trade_date", targetDate).eq("interval_type", "1d").eq("source_name", "yahoo_finance"),
    ),
    fetchAllRows(
      "stock_market_snapshot",
      "stock_id, trade_date",
      (query) => query.eq("trade_date", targetDate).eq("source_name", "yahoo_finance"),
    ),
  ]);

  const coverageByStockId = new Map();
  for (const row of coverageRowsRaw) {
    const stockId = cleanString(row.stock_id, 160);
    const bucketKey = cleanString(row.bucket_key, 160);
    if (!stockId || !bucketKey) continue;
    const coverageMap = coverageByStockId.get(stockId) ?? new Map();
    coverageMap.set(bucketKey, row);
    coverageByStockId.set(stockId, coverageMap);
  }

  const todayPriceStockIds = new Set(todayPriceRows.map((row) => cleanString(row.stock_id, 160)).filter(Boolean));
  const todaySnapshotStockIds = new Set(
    todaySnapshotRows.map((row) => cleanString(row.stock_id, 160)).filter(Boolean),
  );

  const checkedAt = new Date().toISOString();
  const freshnessRows = stocks.map((stock) => {
    const stockId = cleanString(stock.id, 160);
    const stockCoverage = coverageByStockId.get(stockId) ?? new Map();
    const historicalCoverage = stockCoverage.get("historical_prices");
    const snapshotCoverage = stockCoverage.get("latest_market_snapshot");
    const historicalMetadata = normalizeMetadata(historicalCoverage?.metadata);
    const snapshotMetadata = normalizeMetadata(snapshotCoverage?.metadata);
    const lastPriceDate =
      cleanString(historicalMetadata.lastAvailableDate, 120) ||
      cleanString(historicalCoverage?.latest_trade_date, 120) ||
      null;
    const lastSnapshotDate =
      cleanString(snapshotMetadata.lastAvailableDate, 120) ||
      cleanString(snapshotCoverage?.latest_trade_date, 120) ||
      null;
    const hasTodayPrice = todayPriceStockIds.has(stockId);
    const hasTodaySnapshot = todaySnapshotStockIds.has(stockId);

    return {
      stock_id: stockId,
      has_today_price: hasTodayPrice,
      has_today_snapshot: hasTodaySnapshot,
      last_price_date: lastPriceDate,
      last_snapshot_date: lastSnapshotDate,
      is_stale: !(hasTodayPrice && hasTodaySnapshot),
      checked_at: checkedAt,
    };
  });

  const { error: upsertError } = await supabase.from("stock_data_freshness").upsert(freshnessRows, {
    onConflict: "stock_id",
  });

  if (upsertError) {
    throw new Error(`stock_data_freshness: ${upsertError.message}`);
  }

  return {
    todayIsoDate: targetDate,
    totalStocks: freshnessRows.length,
    staleCount: freshnessRows.filter((row) => row.is_stale).length,
    freshCount: freshnessRows.filter((row) => !row.is_stale).length,
    missingTodayPrice: freshnessRows.filter((row) => !row.has_today_price).length,
    missingTodaySnapshot: freshnessRows.filter((row) => !row.has_today_snapshot).length,
  };
}

async function getNextStaleSymbols(batchSize) {
  const { data, error } = await supabase
    .from("stock_data_freshness")
    .select("stock_id, has_today_price, has_today_snapshot, stocks_master!inner(yahoo_symbol)")
    .or("has_today_price.eq.false,has_today_snapshot.eq.false")
    .order("stock_id", { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`stock_data_freshness: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => cleanString(row.stocks_master?.yahoo_symbol, 160))
    .filter(Boolean);
}

async function getBatchSafetySummary({ batchStartIso, symbols }) {
  const { data: stocks, error: stockError } = await supabase
    .from("stocks_master")
    .select("id, yahoo_symbol")
    .in("yahoo_symbol", symbols);

  if (stockError) {
    throw new Error(`stocks_master: ${stockError.message}`);
  }

  const stockIdSet = new Set((stocks ?? []).map((row) => cleanString(row.id, 160)).filter(Boolean));

  const [{ data: errorRows, error: errorFetchError }, { data: alertRows, error: alertFetchError }] =
    await Promise.all([
      supabase
        .from("stock_import_errors")
        .select("stock_id, error_message, error_stage, bucket_key, created_at")
        .gte("created_at", batchStartIso)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("stock_import_alerts")
        .select("alert_type, resolved_at, created_at, message")
        .gte("created_at", batchStartIso)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (errorFetchError) {
    throw new Error(`stock_import_errors: ${errorFetchError.message}`);
  }
  if (alertFetchError) {
    throw new Error(`stock_import_alerts: ${alertFetchError.message}`);
  }

  const scopedErrors = (errorRows ?? []).filter((row) => stockIdSet.has(cleanString(row.stock_id, 160)));
  const duplicateKeyErrors = scopedErrors.filter((row) =>
    cleanString(row.error_message).toLowerCase().includes("duplicate key"),
  );
  const dbWriteErrors = scopedErrors.filter((row) => {
    const message = cleanString(row.error_message).toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("write") ||
      message.includes("insert") ||
      message.includes("upsert")
    );
  });
  const providerIssues = scopedErrors.filter((row) => {
    const message = cleanString(row.error_message).toLowerCase();
    return (
      message.includes("yahoo") ||
      message.includes("crumb") ||
      message.includes("429") ||
      message.includes("401") ||
      message.includes("provider")
    );
  });
  const cooldownActive = (alertRows ?? []).some(
    (row) => cleanString(row.alert_type) === "yahoo_cooldown_active" && !row.resolved_at,
  );

  return {
    cooldownActive,
    duplicateKeyErrors,
    dbWriteErrors,
    providerIssues,
    scopedErrors,
  };
}

async function main() {
  const targetDate = cleanString(process.env.TARGET_DATE || "2026-04-30") || "2026-04-30";
  const batchSize = Math.max(1, Number(process.env.BATCH_SIZE || 250) || 250);
  const maxBatches = Math.max(1, Number(process.env.MAX_BATCHES || 20) || 20);
  const pauseMs = Math.max(0, Number(process.env.PAUSE_MS || 600000) || 600000);
  const actorEmail =
    cleanString(
      process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
        process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
        "Yahoo Same-Day Full Completion Runner",
    ) || "Yahoo Same-Day Full Completion Runner";

  const beforeFreshness = await regenerateFreshness(targetDate);
  const batches = [];
  const noDataSymbols = [];
  const failedSymbols = [];
  const providerIssues = [];
  const dbIssues = [];
  let totalAttempted = 0;
  let totalCompleted = 0;
  let stoppedEarly = false;
  let stopReason = null;

  for (let batchNumber = 1; batchNumber <= maxBatches; batchNumber += 1) {
    const symbols = await getNextStaleSymbols(batchSize);

    if (symbols.length === 0) {
      stopReason = "no_stale_symbols_remaining";
      break;
    }

    const batchStartIso = new Date().toISOString();
    const result = await runYahooDailySameDayOnlyUntilComplete({
      targetDate,
      maxItems: batchSize,
      stocks: symbols.map((yahooSymbol) => ({ yahooSymbol })),
      dryRun: false,
      force: false,
      actorEmail,
    });

    totalAttempted += symbols.length;
    totalCompleted += result.completedCount;

    const batchNoDataSymbols = result.results
      .filter((entry) => entry.noData)
      .map((entry) => cleanString(entry.stock.yahooSymbol, 160))
      .filter(Boolean);
    noDataSymbols.push(...batchNoDataSymbols);

    const batchFailedSymbols = [
      ...result.failures
        .map((failure) => cleanString(failure.yahooSymbol || failure.symbol || failure.stockId, 160))
        .filter(Boolean),
      ...result.results
        .filter((entry) => entry.jobStatus === "failed")
        .map((entry) => cleanString(entry.stock.yahooSymbol, 160))
        .filter(Boolean),
    ];
    failedSymbols.push(...batchFailedSymbols);

    const safety = await getBatchSafetySummary({ batchStartIso, symbols });
    providerIssues.push(
      ...safety.providerIssues.map((row) => ({
        stockId: cleanString(row.stock_id, 160),
        errorStage: cleanString(row.error_stage, 160),
        bucketKey: cleanString(row.bucket_key, 160),
        errorMessage: cleanString(row.error_message, 500),
      })),
    );
    dbIssues.push(
      ...safety.dbWriteErrors.map((row) => ({
        stockId: cleanString(row.stock_id, 160),
        errorStage: cleanString(row.error_stage, 160),
        bucketKey: cleanString(row.bucket_key, 160),
        errorMessage: cleanString(row.error_message, 500),
      })),
    );

    const freshness = await regenerateFreshness(targetDate);

    batches.push({
      batchNumber,
      attempted: symbols.length,
      completed: result.completedCount,
      skipped: result.skippedRows,
      noData: result.noDataCount,
      failed: result.failedCount,
      insertedRows: result.insertedRows,
      snapshotInsertedCount: result.snapshotInsertedCount,
      errors: safety.scopedErrors.length,
      cooldownActive: safety.cooldownActive,
      freshness,
    });

    if (safety.cooldownActive || safety.dbWriteErrors.length > 0 || safety.duplicateKeyErrors.length > 0) {
      stoppedEarly = true;
      stopReason = safety.cooldownActive
        ? "cooldown_active"
        : safety.dbWriteErrors.length > 0
          ? "db_write_spike"
          : "duplicate_key_errors";
      break;
    }

    if (batchNumber < maxBatches) {
      await sleep(pauseMs);
    }
  }

  const finalFreshness = await regenerateFreshness(targetDate);
  const uniqueNoDataSymbols = [...new Set(noDataSymbols)];
  const uniqueFailedSymbols = [...new Set(failedSymbols)];

  console.log(
    JSON.stringify(
      {
        targetDate,
        batchSize,
        maxBatches,
        pauseMs,
        beforeFreshness,
        attempted: totalAttempted,
        completed: totalCompleted,
        stillStale: finalFreshness.staleCount,
        noDataSymbols: uniqueNoDataSymbols,
        failedSymbols: uniqueFailedSymbols,
        providerIssues,
        dbIssues,
        finalFreshness,
        batches,
        stoppedEarly,
        stopReason,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[run-yahoo-same-day-full-stale-completion] failed", error);
  process.exitCode = 1;
});
