import { createClient } from "@supabase/supabase-js";

const SYMBOLS = [
  "AXISBANK.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "INFY.NS",
  "ITC.NS",
  "KOTAKBANK.NS",
  "LT.NS",
  "SBIN.NS",
  "ULTRACEMCO.NS",
  "WIPRO.NS",
];

const JOB_IDS = [
  "f19eff7f-d1a5-40bd-b897-70c9e495c6f3",
  "b1dca5cf-685c-42e0-9f0a-7c16070360ec",
  "6521e47f-8cbb-422c-9421-dd24f70ae8a3",
];

const TARGET_TRADE_DATE = "2026-04-30";
const RAW_IMPORT_FROM_ISO = "2026-04-30T01:44:00Z";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

function countDuplicateKeys(rows) {
  const counts = new Map();
  for (const row of rows ?? []) {
    const key = `${row.stock_id}:${row.trade_date}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.values()).filter((value) => value > 1).length;
}

async function main() {
  const { data: stocks, error: stocksError } = await supabase
    .from("stocks_master")
    .select("id, symbol, yahoo_symbol, slug")
    .in("yahoo_symbol", SYMBOLS)
    .order("symbol", { ascending: true });
  if (stocksError) {
    throw new Error(`Could not load stocks. ${stocksError.message}`);
  }

  const stockIds = (stocks ?? []).map((stock) => stock.id);
  const perStock = [];
  for (const stock of stocks ?? []) {
    const { count: historicalTodayCount, error: histError } = await supabase
      .from("stock_price_history")
      .select("id", { count: "exact", head: true })
      .eq("stock_id", stock.id)
      .eq("trade_date", TARGET_TRADE_DATE);
    if (histError) {
      throw new Error(`Could not load historical rows for ${stock.symbol}. ${histError.message}`);
    }

    const { count: snapshotTodayCount, error: snapshotError } = await supabase
      .from("stock_market_snapshot")
      .select("id", { count: "exact", head: true })
      .eq("stock_id", stock.id)
      .eq("trade_date", TARGET_TRADE_DATE);
    if (snapshotError) {
      throw new Error(`Could not load snapshot rows for ${stock.symbol}. ${snapshotError.message}`);
    }

    perStock.push({
      symbol: stock.symbol,
      yahooSymbol: stock.yahoo_symbol,
      slug: stock.slug,
      historicalTodayCount: historicalTodayCount ?? 0,
      snapshotTodayCount: snapshotTodayCount ?? 0,
    });
  }

  const { data: activityRows, error: activityError } = await supabase
    .from("stock_import_activity_log")
    .select(
      "id, job_id, stock_id, module_name, step_name, status, message, rows_skipped, rows_inserted, metadata",
    )
    .in("stock_id", stockIds)
    .gte("started_at", RAW_IMPORT_FROM_ISO)
    .order("started_at", { ascending: true });
  if (activityError) {
    throw new Error(`Could not load stock_import_activity_log rows. ${activityError.message}`);
  }

  const { data: reconciliationRows, error: reconciliationError } = await supabase
    .from("stock_import_reconciliation")
    .select("id, job_id, module_name, reconciliation_status, raw_records_count, normalized_records_count")
    .in("stock_id", stockIds)
    .gte("created_at", RAW_IMPORT_FROM_ISO);
  if (reconciliationError) {
    throw new Error(`Could not load stock_import_reconciliation rows. ${reconciliationError.message}`);
  }

  const { data: rawRows, error: rawError } = await supabase
    .from("raw_yahoo_imports")
    .select("id, stock_id, request_type, imported_at")
    .in("stock_id", stockIds)
    .gte("imported_at", RAW_IMPORT_FROM_ISO);
  if (rawError) {
    throw new Error(`Could not load raw_yahoo_imports rows. ${rawError.message}`);
  }

  const { data: historicalRows, error: historicalError } = await supabase
    .from("stock_price_history")
    .select("stock_id, trade_date")
    .in("stock_id", stockIds)
    .eq("trade_date", TARGET_TRADE_DATE);
  if (historicalError) {
    throw new Error(`Could not load stock_price_history audit rows. ${historicalError.message}`);
  }

  const { data: snapshotRows, error: snapshotError } = await supabase
    .from("stock_market_snapshot")
    .select("stock_id, trade_date")
    .in("stock_id", stockIds)
    .eq("trade_date", TARGET_TRADE_DATE);
  if (snapshotError) {
    throw new Error(`Could not load stock_market_snapshot audit rows. ${snapshotError.message}`);
  }

  const reconciliationStatuses = {};
  for (const row of reconciliationRows ?? []) {
    const key = String(row.reconciliation_status ?? "unknown");
    reconciliationStatuses[key] = (reconciliationStatuses[key] ?? 0) + 1;
  }

  const skippedExistingSnapshotActivities = (activityRows ?? []).filter((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    return (
      String(row.message ?? "").includes("Skipped Yahoo snapshot fetch") ||
      String(metadata.skipReason ?? "") === "snapshot_already_exists_today"
    );
  });

  const reusedExistingDataActivities = (activityRows ?? []).filter((row) =>
    Number(row.rows_skipped ?? 0) > 0,
  );

  console.log(
    JSON.stringify(
      {
        symbols: SYMBOLS,
        jobIds: JOB_IDS,
        targetTradeDate: TARGET_TRADE_DATE,
        perStock,
        activityCount: (activityRows ?? []).length,
        reconciliationCount: (reconciliationRows ?? []).length,
        rawResponseCount: (rawRows ?? []).length,
        skippedExistingSnapshotActivityCount: skippedExistingSnapshotActivities.length,
        reusedExistingDataActivityCount: reusedExistingDataActivities.length,
        historicalDuplicateKeys: countDuplicateKeys(historicalRows),
        snapshotDuplicateKeys: countDuplicateKeys(snapshotRows),
        reconciliationStatuses,
        latestActivityRows: (activityRows ?? []).slice(-15),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[collect-yahoo-daily-update-dry-run-metrics] failed", error);
  process.exitCode = 1;
});
