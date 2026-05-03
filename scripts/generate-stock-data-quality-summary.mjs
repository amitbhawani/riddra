import { createClient } from "@supabase/supabase-js";

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

const RECENT_ERROR_LOOKBACK_DAYS = 14;
const SCORE_NOTES =
  "Data quality score is price-data-focused for now: 50 historical, 25 latest snapshot, 10 valuation signal, 10 financial statements, and 5 for no recent import errors. Yahoo protected fundamentals are still blocked at scale.";

const FINANCIAL_BUCKET_GROUPS = {
  incomeStatement: ["income_statement_annual", "income_statement_quarterly"],
  balanceSheet: ["balance_sheet_annual", "balance_sheet_quarterly"],
  cashFlow: ["cash_flow_annual", "cash_flow_quarterly"],
};

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function numericOrZero(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isRetriableFetchFailure(error) {
  const message = cleanString(error?.message ?? error, 4000).toLowerCase();
  if (!message) return false;
  return [
    "fetch failed",
    "network",
    "timeout",
    "timed out",
    "socket",
    "connection",
    "terminated",
  ].some((token) => message.includes(token));
}

async function delayMs(durationMs) {
  if (durationMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function runQueryWithRetry(runQuery, label) {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runQuery();
    } catch (error) {
      if (!isRetriableFetchFailure(error) || attempt >= maxAttempts) {
        throw error;
      }

      console.warn(
        `[generate-stock-data-quality-summary] transient read failure for ${label}, retrying attempt ${attempt + 1}/${maxAttempts}`,
      );
      await delayMs(Math.min(500 * 2 ** (attempt - 1), 4000));
    }
  }

  throw new Error(`Unexpected retry exit for ${label}.`);
}

function coverageValue(row) {
  if (!row) return 0;
  const metadata = normalizeMetadata(row.metadata);
  const completionPercentage = numericOrZero(metadata.completionPercentage);
  const fillPercentage = numericOrZero(metadata.fillPercentage);
  const rowsAvailable = numericOrZero(row.rows_available);
  const rowsImported = numericOrZero(row.rows_imported);
  const rowCount = numericOrZero(row.row_count);
  if (completionPercentage > 0) return completionPercentage;
  if (fillPercentage > 0) return fillPercentage;
  if (rowCount > 0 && rowsAvailable <= 0) return 100;
  if (rowsAvailable > 0) return Number(((rowsImported / rowsAvailable) * 100).toFixed(2));
  return 0;
}

function hasCoverageData(row) {
  if (!row) return false;
  const metadata = normalizeMetadata(row.metadata);
  return Boolean(
    numericOrZero(row.row_count) > 0 ||
      numericOrZero(row.rows_imported) > 0 ||
      numericOrZero(metadata.filledFields) > 0 ||
      cleanString(row.coverage_status, 120) === "current" ||
      cleanString(row.coverage_status, 120) === "partial" ||
      coverageValue(row) > 0,
  );
}

function findLatestIso(values) {
  return values
    .filter(Boolean)
    .sort((left, right) => cleanString(right, 120).localeCompare(cleanString(left, 120)))[0] ?? null;
}

function getRecentErrorCutoffIso() {
  return new Date(Date.now() - RECENT_ERROR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchAllRows(table, selectClause, configure) {
  const rows = [];
  let from = 0;
  const pageSize = 500;

  while (true) {
    const { data, error } = await runQueryWithRetry(async () => {
      const maxAttempts = 4;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        let query = supabase.from(table).select(selectClause).range(from, from + pageSize - 1);
        if (configure) {
          query = configure(query);
        }

        const result = await query;
        const fetchErrorMessage = cleanString(result.error?.message, 4000);

        if (
          result.error &&
          isRetriableFetchFailure(fetchErrorMessage) &&
          attempt < maxAttempts
        ) {
          console.warn(
            `[generate-stock-data-quality-summary] transient page read failure for ${table}:${from}, retrying attempt ${attempt + 1}/${maxAttempts}`,
          );
          await delayMs(Math.min(500 * 2 ** (attempt - 1), 4000));
          continue;
        }

        return result;
      }

      throw new Error(`Unexpected query retry exit for ${table}:${from}.`);
    }, `${table}:${from}`);

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

const stocks = await fetchAllRows(
  "stocks_master",
  "id, yahoo_symbol, status",
  (query) => query.eq("status", "active").order("id", { ascending: true }),
);

const coverageRowsRaw = await fetchAllRows(
  "stock_import_coverage",
  "stock_id, bucket_key, coverage_status, latest_trade_date, latest_imported_at, rows_available, rows_imported, row_count, warning_count, error_count, metadata",
  (query) => query.order("stock_id", { ascending: true }),
);

const jobRowsRaw = await fetchAllRows(
  "stock_import_jobs",
  "stock_id, status, completed_at, updated_at",
  (query) => query.order("completed_at", { ascending: false, nullsFirst: false }),
);

const errorRowsRaw = await fetchAllRows(
  "stock_import_errors",
  "stock_id, imported_at",
  (query) => query.order("imported_at", { ascending: false }),
);

const coverageByStockId = new Map();
for (const row of coverageRowsRaw) {
  const stockId = cleanString(row.stock_id, 160);
  const bucketKey = cleanString(row.bucket_key, 160);
  if (!stockId || !bucketKey) continue;
  const coverageMap = coverageByStockId.get(stockId) ?? new Map();
  coverageMap.set(bucketKey, row);
  coverageByStockId.set(stockId, coverageMap);
}

const latestJobByStockId = new Map();
const latestSuccessfulJobByStockId = new Map();
for (const row of jobRowsRaw) {
  const stockId = cleanString(row.stock_id, 160);
  if (!stockId) continue;
  if (!latestJobByStockId.has(stockId)) {
    latestJobByStockId.set(stockId, row);
  }
  const status = cleanString(row.status, 120);
  if (
    !latestSuccessfulJobByStockId.has(stockId) &&
    (status === "completed" || status === "completed_with_errors")
  ) {
    latestSuccessfulJobByStockId.set(stockId, row);
  }
}

const errorRowsByStockId = new Map();
for (const row of errorRowsRaw) {
  const stockId = cleanString(row.stock_id, 160);
  if (!stockId) continue;
  const existing = errorRowsByStockId.get(stockId) ?? [];
  existing.push(row);
  errorRowsByStockId.set(stockId, existing);
}

const recentErrorCutoff = getRecentErrorCutoffIso();

const summaryRows = stocks.map((stock) => {
  const stockId = cleanString(stock.id, 160);
  const coverageMap = coverageByStockId.get(stockId) ?? new Map();
  const coverageRows = [...coverageMap.values()];
  const historicalRow = coverageMap.get("historical_prices");
  const latestSnapshotRow = coverageMap.get("latest_market_snapshot");
  const valuationRow = coverageMap.get("valuation_metrics");
  const incomeGroup = FINANCIAL_BUCKET_GROUPS.incomeStatement.map((key) => coverageMap.get(key) ?? null);
  const balanceGroup = FINANCIAL_BUCKET_GROUPS.balanceSheet.map((key) => coverageMap.get(key) ?? null);
  const cashGroup = FINANCIAL_BUCKET_GROUPS.cashFlow.map((key) => coverageMap.get(key) ?? null);
  const errorRows = errorRowsByStockId.get(stockId) ?? [];
  const latestJob = latestJobByStockId.get(stockId) ?? null;
  const latestSuccessfulJob = latestSuccessfulJobByStockId.get(stockId) ?? null;

  const hasHistoricalPrices = hasCoverageData(historicalRow);
  const hasLatestSnapshot = hasCoverageData(latestSnapshotRow);
  const hasValuationMetrics = hasCoverageData(valuationRow);
  const hasFinancialStatements =
    incomeGroup.some((row) => hasCoverageData(row)) &&
    balanceGroup.some((row) => hasCoverageData(row)) &&
    cashGroup.some((row) => hasCoverageData(row));

  const missingModuleCount = [
    hasHistoricalPrices,
    hasLatestSnapshot,
    hasValuationMetrics,
    hasFinancialStatements,
  ].filter((value) => !value).length;

  const warningCount = coverageRows.reduce((sum, row) => sum + numericOrZero(row.warning_count), 0);
  const errorCount =
    errorRows.length + coverageRows.reduce((sum, row) => sum + numericOrZero(row.error_count), 0);
  const hasRecentErrors =
    errorRows.some((row) => cleanString(row.imported_at, 120) >= recentErrorCutoff) ||
    cleanString(latestJob?.updated_at ?? latestJob?.completed_at, 120) >= recentErrorCutoff;

  const overallDataScore =
    (hasHistoricalPrices ? 50 : 0) +
    (hasLatestSnapshot ? 25 : 0) +
    (hasValuationMetrics ? 10 : 0) +
    (hasFinancialStatements ? 10 : 0) +
    (!hasRecentErrors ? 5 : 0);

  const historicalMetadata = normalizeMetadata(historicalRow?.metadata);

  return {
    stock_id: stockId,
    yahoo_symbol: cleanString(stock.yahoo_symbol, 160) || null,
    has_historical_prices: hasHistoricalPrices,
    historical_first_date:
      cleanString(historicalMetadata.firstAvailableDate, 120) || cleanString(historicalRow?.latest_trade_date, 120) || null,
    historical_last_date:
      cleanString(historicalMetadata.lastAvailableDate, 120) || cleanString(historicalRow?.latest_trade_date, 120) || null,
    historical_row_count:
      numericOrZero(historicalMetadata.totalRowsRetained) || numericOrZero(historicalRow?.row_count),
    has_latest_snapshot: hasLatestSnapshot,
    has_valuation_metrics: hasValuationMetrics,
    has_financial_statements: hasFinancialStatements,
    missing_module_count: missingModuleCount,
    warning_count: warningCount,
    error_count: errorCount,
    overall_data_score: overallDataScore,
    last_import_at: findLatestIso([
      cleanString(latestSuccessfulJob?.completed_at, 120) || null,
      cleanString(latestJob?.completed_at, 120) || null,
      cleanString(latestJob?.updated_at, 120) || null,
      ...coverageRows.map((row) => cleanString(row.latest_imported_at, 120) || null),
    ]),
    updated_at: new Date().toISOString(),
    score_model: "price_data_focused_v1",
    score_notes: SCORE_NOTES,
  };
});

if (!summaryRows.length) {
  throw new Error("No active stocks were found in stocks_master.");
}

const { error: upsertError } = await supabase
  .from("stock_data_quality_summary")
  .upsert(summaryRows, { onConflict: "stock_id" });

if (upsertError) {
  throw new Error(`stock_data_quality_summary: ${upsertError.message}`);
}

const averageDataQualityScore = Number(
  (
    summaryRows.reduce((sum, row) => sum + numericOrZero(row.overall_data_score), 0) /
    summaryRows.length
  ).toFixed(2),
);

const result = {
  rowCount: summaryRows.length,
  averageDataQualityScore,
  stocksAbove75: summaryRows.filter((row) => numericOrZero(row.overall_data_score) >= 75).length,
  stocksBelow50: summaryRows.filter((row) => numericOrZero(row.overall_data_score) < 50).length,
  missingSnapshotCount: summaryRows.filter((row) => !row.has_latest_snapshot).length,
};

console.log(JSON.stringify(result, null, 2));
