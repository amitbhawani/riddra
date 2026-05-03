import { createClient } from "@supabase/supabase-js";

import {
  createYahooDailyChartUpdateJob,
  getYahooStockBatchImportReport,
  runYahooStockBatchImportUntilComplete,
} from "../lib/yahoo-finance-batch-import.ts";

const SAMPLE_SYMBOLS = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "SBIN.NS",
  "ITC.NS",
  "LT.NS",
  "KOTAKBANK.NS",
  "AXISBANK.NS",
];

const PRESEEDED_SYMBOLS = SAMPLE_SYMBOLS.slice(0, 5);
const TARGET_TRADE_DATE = "2026-04-30";

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function loadStocksByYahooSymbols(supabase, yahooSymbols) {
  const { data, error } = await supabase
    .from("stocks_master")
    .select("id, slug, symbol, yahoo_symbol, company_name")
    .in("yahoo_symbol", yahooSymbols)
    .order("symbol", { ascending: true });

  if (error) {
    throw new Error(`Could not load sample stocks. ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

async function loadPerStockState(supabase, stocks) {
  const state = [];
  for (const stock of stocks) {
    const { count: historicalTodayCount, error: histError } = await supabase
      .from("stock_price_history")
      .select("id", { count: "exact", head: true })
      .eq("stock_id", stock.id)
      .eq("trade_date", TARGET_TRADE_DATE);
    if (histError) {
      throw new Error(`Could not read stock_price_history for ${stock.symbol}. ${histError.message}`);
    }

    const { count: snapshotTodayCount, error: snapshotError } = await supabase
      .from("stock_market_snapshot")
      .select("id", { count: "exact", head: true })
      .eq("stock_id", stock.id)
      .eq("trade_date", TARGET_TRADE_DATE);
    if (snapshotError) {
      throw new Error(`Could not read stock_market_snapshot for ${stock.symbol}. ${snapshotError.message}`);
    }

    const { data: latestHistorical } = await supabase
      .from("stock_price_history")
      .select("trade_date")
      .eq("stock_id", stock.id)
      .order("trade_date", { ascending: false })
      .limit(1);

    const { data: latestSnapshot } = await supabase
      .from("stock_market_snapshot")
      .select("trade_date")
      .eq("stock_id", stock.id)
      .order("trade_date", { ascending: false })
      .limit(1);

    state.push({
      stockId: stock.id,
      symbol: stock.symbol,
      yahooSymbol: stock.yahoo_symbol,
      slug: stock.slug,
      companyName: stock.company_name,
      latestHistoricalDate: latestHistorical?.[0]?.trade_date ?? null,
      latestSnapshotDate: latestSnapshot?.[0]?.trade_date ?? null,
      historicalTodayCount: historicalTodayCount ?? 0,
      snapshotTodayCount: snapshotTodayCount ?? 0,
    });
  }
  return state;
}

async function loadActivityAndReconciliationCounts(supabase, jobId) {
  const { count: activityCount, error: activityError } = await supabase
    .from("stock_import_activity_log")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if (activityError) {
    throw new Error(`Could not count stock_import_activity_log rows. ${activityError.message}`);
  }

  const { count: reconciliationCount, error: reconciliationError } = await supabase
    .from("stock_import_reconciliation")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if (reconciliationError) {
    throw new Error(`Could not count stock_import_reconciliation rows. ${reconciliationError.message}`);
  }

  const { data: skippedActivityRows, error: skippedError } = await supabase
    .from("stock_import_activity_log")
    .select("module_name, step_name, status, message, metadata")
    .eq("job_id", jobId)
    .or("message.ilike.%Skipped Yahoo snapshot fetch%,metadata->>skipReason.eq.snapshot_already_exists_today");
  if (skippedError) {
    throw new Error(`Could not read skipped activity rows. ${skippedError.message}`);
  }

  return {
    activityCount: activityCount ?? 0,
    reconciliationCount: reconciliationCount ?? 0,
    skippedActivityRows: Array.isArray(skippedActivityRows) ? skippedActivityRows : [],
  };
}

async function loadDuplicateCountsForToday(supabase, stockIds) {
  const { data: historicalRows, error: historicalError } = await supabase
    .from("stock_price_history")
    .select("stock_id, trade_date")
    .in("stock_id", stockIds)
    .eq("trade_date", TARGET_TRADE_DATE);
  if (historicalError) {
    throw new Error(`Could not load historical duplicate audit rows. ${historicalError.message}`);
  }

  const { data: snapshotRows, error: snapshotError } = await supabase
    .from("stock_market_snapshot")
    .select("stock_id, trade_date")
    .in("stock_id", stockIds)
    .eq("trade_date", TARGET_TRADE_DATE);
  if (snapshotError) {
    throw new Error(`Could not load snapshot duplicate audit rows. ${snapshotError.message}`);
  }

  const countDuplicates = (rows) => {
    const counts = new Map();
    for (const row of rows ?? []) {
      const key = `${row.stock_id}:${row.trade_date}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.values()).filter((count) => count > 1).length;
  };

  return {
    historicalDuplicateKeys: countDuplicates(historicalRows),
    snapshotDuplicateKeys: countDuplicates(snapshotRows),
  };
}

async function runDailyDryRun(stocks, actorEmail) {
  const created = await createYahooDailyChartUpdateJob({
    stocks: stocks.map((stock) => ({
      stockId: stock.id,
      yahooSymbol: stock.yahoo_symbol,
    })),
    actorEmail,
    dryRun: true,
  });

  const result = await runYahooStockBatchImportUntilComplete({
    jobId: created.jobId,
    actorEmail,
    maxItemsPerRun: stocks.length * 2,
  });

  const report = await getYahooStockBatchImportReport(created.jobId);
  return {
    jobId: created.jobId,
    result,
    report,
  };
}

async function main() {
  const actorEmail =
    cleanString(
      process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
        process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
        "Yahoo Daily Update Dry Run",
    ) || "Yahoo Daily Update Dry Run";
  const supabase = createSupabaseAdminClient();

  const stocks = await loadStocksByYahooSymbols(supabase, SAMPLE_SYMBOLS);
  if (stocks.length !== SAMPLE_SYMBOLS.length) {
    throw new Error(`Expected ${SAMPLE_SYMBOLS.length} stocks, found ${stocks.length}.`);
  }

  const before = await loadPerStockState(supabase, stocks);
  const preseedStocks = stocks.filter((stock) => PRESEEDED_SYMBOLS.includes(stock.yahoo_symbol));
  const fullRunStocks = stocks;

  const preseed = await runDailyDryRun(preseedStocks, `${actorEmail} · Preseed`);
  const afterPreseed = await loadPerStockState(supabase, stocks);
  const fullRun = await runDailyDryRun(fullRunStocks, actorEmail);
  const afterFullRun = await loadPerStockState(supabase, stocks);
  const activityAndReconciliation = await loadActivityAndReconciliationCounts(supabase, fullRun.jobId);
  const duplicates = await loadDuplicateCountsForToday(
    supabase,
    stocks.map((stock) => stock.id),
  );

  const perStockSummary = afterFullRun.map((row) => {
    const previous = before.find((item) => item.stockId === row.stockId);
    const preseeded = afterPreseed.find((item) => item.stockId === row.stockId);
    return {
      symbol: row.symbol,
      yahooSymbol: row.yahooSymbol,
      slug: row.slug,
      preseededForExistingCase: PRESEEDED_SYMBOLS.includes(row.yahooSymbol),
      historicalTodayBefore: previous?.historicalTodayCount ?? 0,
      historicalTodayAfterPreseed: preseeded?.historicalTodayCount ?? 0,
      historicalTodayAfterFullRun: row.historicalTodayCount,
      snapshotTodayBefore: previous?.snapshotTodayCount ?? 0,
      snapshotTodayAfterPreseed: preseeded?.snapshotTodayCount ?? 0,
      snapshotTodayAfterFullRun: row.snapshotTodayCount,
      latestHistoricalDateAfter: row.latestHistoricalDate,
      latestSnapshotDateAfter: row.latestSnapshotDate,
    };
  });

  console.log(
    JSON.stringify(
      {
        targetTradeDate: TARGET_TRADE_DATE,
        sampleSymbols: SAMPLE_SYMBOLS,
        preseedSymbols: PRESEEDED_SYMBOLS,
        preseedJobId: preseed.jobId,
        preseedReport: preseed.report,
        fullRunJobId: fullRun.jobId,
        fullRunReport: fullRun.report,
        perStockSummary,
        activityAndReconciliation,
        duplicates,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[run-yahoo-daily-update-dry-run-check] failed", error);
  process.exitCode = 1;
});
