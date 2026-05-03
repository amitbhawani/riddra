import { randomUUID } from "crypto";

import {
  executeMarketDataImport,
  type ExecuteMarketDataImportResult,
  type MarketDataImportDuplicateMode,
  type MarketDataImportExecutionMode,
} from "@/lib/market-data-imports";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  YAHOO_QUOTE_SUMMARY_PROFILE_MODULES,
  YAHOO_QUOTE_SUMMARY_VALUATION_MODULES,
  buildYahooHistoricalCsvText,
  extractYahooChartPayloadSymbol,
  fetchYahooDividendsAndSplits,
  fetchYahooFinancialStatements,
  fetchYahooHistoricalPriceData,
  fetchYahooHolders,
  fetchYahooLatestQuote,
  fetchYahooNews,
  fetchYahooOptions,
  fetchYahooQuoteSummaryModules,
  isYahooProtectedEndpointUnavailableError,
  logYahooImportError,
  resolveYahooStockTarget,
  type YahooResolvedStockTarget,
  type YahooRawImportRecord,
} from "@/lib/yahoo-finance-service";

type StockImportJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

type StockImportJobItemStatus =
  | "pending"
  | "validated"
  | "imported"
  | "updated"
  | "skipped"
  | "warning"
  | "failed";

type StockImportActivityStatus = "running" | "completed" | "warning" | "failed";

type StockImportActivityStepName =
  | "fetch_started"
  | "fetch_completed"
  | "raw_saved"
  | "duplicate_payload_deduped"
  | "normalization_started"
  | "skipped_existing_history_rows"
  | "skipped_existing_snapshot"
  | "history_write_completed"
  | "snapshot_write_completed"
  | "normalization_completed"
  | "coverage_updated"
  | "reconciliation_completed"
  | "write_batch_failed"
  | "import_failed";

const STOCK_IMPORT_ACTIVITY_STEP_FALLBACKS: Partial<
  Record<StockImportActivityStepName, StockImportActivityStepName>
> = {
  duplicate_payload_deduped: "normalization_started",
  skipped_existing_history_rows: "normalization_completed",
  skipped_existing_snapshot: "normalization_completed",
  history_write_completed: "normalization_completed",
  snapshot_write_completed: "normalization_completed",
  write_batch_failed: "import_failed",
};

type StockImportReconciliationStatus =
  | "completed"
  | "completed_with_warnings"
  | "failed"
  | "no_data";

type BucketRunSummary = {
  bucketKey: string;
  status: StockImportJobItemStatus;
  actionTaken: string;
  note: string;
  rawImportId: string | null;
};

export type YahooFinanceSampleImportInput = {
  yahooSymbol: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  executionMode?: MarketDataImportExecutionMode;
  duplicateMode?: MarketDataImportDuplicateMode;
  historyRange?: string;
};

export type YahooHistoricalOhlcvImportInput = {
  yahooSymbol: string;
  stockId?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  period?: string | null;
  interval?: "1d";
  duplicateMode?: "replace_matching_dates" | "skip_existing_dates";
  dryRun?: boolean;
  force?: boolean;
};

export type YahooDailySameDayOnlyImportInput = {
  yahooSymbol: string;
  stockId?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  targetDate?: string | null;
  force?: boolean;
  dryRun?: boolean;
};

export type YahooHistoricalOhlcvImportBatchInput = {
  stocks: Array<{
    yahooSymbol: string;
    stockId?: string | null;
  }>;
  actorEmail?: string | null;
  actorUserId?: string | null;
  period?: string | null;
  interval?: "1d";
  duplicateMode?: "replace_matching_dates" | "skip_existing_dates";
};

export type YahooFinanceSampleImportResult = {
  stock: YahooResolvedStockTarget;
  jobId: string;
  jobStatus: StockImportJobStatus;
  bucketResults: BucketRunSummary[];
  rawImportCount: number;
  warnings: string[];
  marketDataImport: ExecuteMarketDataImportResult | null;
};

export type YahooHistoricalCoverageSummary = {
  firstAvailableDate: string | null;
  lastAvailableDate: string | null;
  totalRowsAvailable: number;
  totalRowsImported: number;
  totalRowsRetained: number;
  missingDatesCount: number;
  completionPercentage: number;
};

export type YahooHistoricalImportMode =
  | "full_initial"
  | "backfill_missing"
  | "update_recent"
  | "force_rebuild";

export type YahooHistoricalOhlcvImportResult = {
  stock: YahooResolvedStockTarget;
  jobId: string;
  jobStatus: StockImportJobStatus;
  rawImportId: string | null;
  period: string;
  interval: "1d";
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  totalProcessedRows: number;
  coverage: YahooHistoricalCoverageSummary;
  warnings: string[];
  mode: YahooHistoricalImportMode;
  forceApplied: boolean;
  savedRequestsAvoided: number;
  existingDataReused: number;
  effectiveDuplicateMode: "replace_matching_dates" | "skip_existing_dates";
  fetchWindow: {
    period: string | null;
    periodStartDate: string | null;
    periodEndDate: string | null;
  };
};

export type YahooHistoricalOhlcvImportBatchResult = {
  requestedCount: number;
  completedCount: number;
  failedCount: number;
  results: YahooHistoricalOhlcvImportResult[];
  failures: Array<{
    yahooSymbol: string;
    stockId: string | null;
    error: string;
  }>;
};

export type YahooDailySameDayOnlyImportResult = {
  stock: YahooResolvedStockTarget;
  jobId: string;
  jobStatus: StockImportJobStatus;
  rawImportId: string | null;
  targetDate: string;
  effectiveTradeDate: string | null;
  usedLatestAvailableTradingDate: boolean;
  noData: boolean;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  snapshotInserted: boolean;
  snapshotSkipped: boolean;
  effectiveHistoricalRow: YahooSameDayHistoricalRow | null;
  warnings: string[];
  reports: {
    historicalPrices: YahooFieldCoverageReport;
    latestMarketSnapshot: YahooFieldCoverageReport;
  };
};

export type YahooFieldCoverageReport = {
  bucketKey: string;
  tableName: string;
  totalMappedFields: number;
  filledFields: number;
  missingFields: number;
  fillPercentage: number;
  filledFieldKeys: string[];
  missingFieldKeys: string[];
};

export type YahooQuoteStatisticsImportInput = {
  yahooSymbol: string;
  stockId?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  dryRun?: boolean;
  force?: boolean;
  refresh?: boolean;
  snapshotOnly?: boolean;
  allowExistingSnapshotSkipOnDryRun?: boolean;
};

export type YahooQuoteStatisticsImportResult = {
  stock: YahooResolvedStockTarget;
  jobId: string;
  jobStatus: StockImportJobStatus;
  rawImportIds: string[];
  warnings: string[];
  snapshotTradeDate: string | null;
  skippedExistingSnapshot: boolean;
  savedRequestsAvoided: number;
  existingDataReused: number;
  reports: {
    latestMarketSnapshot: YahooFieldCoverageReport;
    valuationMetrics: YahooFieldCoverageReport;
    shareStatistics: YahooFieldCoverageReport;
    financialHighlights: YahooFieldCoverageReport;
  };
};

export type YahooFinancialStatementsImportInput = {
  yahooSymbol: string;
  stockId?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  dryRun?: boolean;
  manualTestMode?: boolean;
};

export type YahooDryRunImportInput = {
  yahooSymbol?: string;
  stockId?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  period?: string | null;
  interval?: "1d";
  duplicateMode?: "replace_matching_dates" | "skip_existing_dates";
};

export type YahooDryRunImportResult = {
  dryRun: true;
  yahooSymbol: string;
  stock: YahooResolvedStockTarget;
  historical: YahooHistoricalOhlcvImportResult;
  quoteStatistics: YahooQuoteStatisticsImportResult;
  financialStatements: YahooFinancialStatementsImportResult;
};

export type YahooFinancialStatementsImportResult = {
  stock: YahooResolvedStockTarget;
  jobId: string;
  jobStatus: StockImportJobStatus;
  rawImportId: string | null;
  warnings: string[];
  skippedBlockedModule: boolean;
  savedRequestsAvoided: number;
  reports: {
    incomeStatementAnnual: YahooFieldCoverageReport;
    incomeStatementQuarterly: YahooFieldCoverageReport;
    balanceSheetAnnual: YahooFieldCoverageReport;
    balanceSheetQuarterly: YahooFieldCoverageReport;
    cashFlowAnnual: YahooFieldCoverageReport;
    cashFlowQuarterly: YahooFieldCoverageReport;
  };
};

type HistoricalPricePersistRow = {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
};

export type YahooSameDayHistoricalRow = {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
};

type ExistingHistoricalWindowSummary = {
  rowCount: number;
  earliestTradeDate: string | null;
  latestTradeDate: string | null;
  missingGapStartDate: string | null;
  missingGapPreviousDate: string | null;
};

type QuoteStatisticsPersistResult = {
  valuationMetrics: YahooFieldCoverageReport;
  shareStatistics: YahooFieldCoverageReport;
  financialHighlights: YahooFieldCoverageReport;
};

type StatementRowCoverageInput = {
  fiscalDate: string;
  mappedFields: Record<string, unknown>;
};

type FinancialStatementsPersistResult = {
  reports: {
    incomeStatementAnnual: YahooFieldCoverageReport;
    incomeStatementQuarterly: YahooFieldCoverageReport;
    balanceSheetAnnual: YahooFieldCoverageReport;
    balanceSheetQuarterly: YahooFieldCoverageReport;
    cashFlowAnnual: YahooFieldCoverageReport;
    cashFlowQuarterly: YahooFieldCoverageReport;
  };
  rowCounts: {
    incomeStatementAnnual: number;
    incomeStatementQuarterly: number;
    balanceSheetAnnual: number;
    balanceSheetQuarterly: number;
    cashFlowAnnual: number;
    cashFlowQuarterly: number;
  };
  rawSourceCounts: {
    incomeStatementAnnual: number;
    incomeStatementQuarterly: number;
    balanceSheetAnnual: number;
    balanceSheetQuarterly: number;
    cashFlowAnnual: number;
    cashFlowQuarterly: number;
  };
  latestFiscalDates: {
    incomeStatementAnnual: string | null;
    incomeStatementQuarterly: string | null;
    balanceSheetAnnual: string | null;
    balanceSheetQuarterly: string | null;
    cashFlowAnnual: string | null;
    cashFlowQuarterly: string | null;
  };
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function chunkArray<T>(items: T[], size: number) {
  const normalizedSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += normalizedSize) {
    chunks.push(items.slice(index, index + normalizedSize));
  }

  return chunks;
}

function getYahooHistoricalWriteBatchSize() {
  const parsed = Number.parseInt(
    cleanString(
      process.env.YAHOO_HISTORY_WRITE_BATCH_SIZE ??
        process.env.YAHOO_HISTORICAL_WRITE_BATCH_SIZE,
      20,
    ),
    10,
  );

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 250;
  }

  return Math.min(parsed, 1000);
}

function getYahooHistoricalWriteMaxRetries() {
  const parsed = Number.parseInt(
    cleanString(process.env.YAHOO_FINANCE_MAX_RETRIES, 20),
    10,
  );

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 3;
  }

  return Math.min(parsed, 10);
}

function getYahooHistoricalWriteRetryBackoffMs(attemptNumber: number) {
  const boundedAttempt = Math.max(1, Math.trunc(attemptNumber));
  return Math.min(1000 * 2 ** (boundedAttempt - 1), 10_000);
}

function isRetriableHistoricalWriteError(error: unknown) {
  const message = cleanString(error instanceof Error ? error.message : error, 4000).toLowerCase();
  if (!message) {
    return false;
  }

  return [
    "timeout",
    "timed out",
    "statement timeout",
    "gateway timeout",
    "canceling statement due to statement timeout",
    "connection terminated",
    "connection reset",
    "could not insert stock_price_history rows",
    "could not upsert stock_price_history rows",
  ].some((token) => message.includes(token));
}

async function delayMs(durationMs: number) {
  if (durationMs <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}

function safeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractYahooNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const rawValue = safeNumber(record.raw);
    if (rawValue !== null) {
      return rawValue;
    }
    const regularValue = safeNumber(record.value);
    if (regularValue !== null) {
      return regularValue;
    }
  }

  return null;
}

function extractYahooString(value: unknown) {
  if (typeof value === "string") {
    return cleanString(value, 4000) || null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["longFmt", "fmt", "shortFmt", "displayName", "name", "raw"]) {
      const normalized = cleanString(record[key], 4000);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function firstYahooNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = extractYahooNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function firstYahooString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = extractYahooString(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function isoDateFromUnixSeconds(value: unknown, fallbackTimeZone = "Asia/Kolkata") {
  const seconds = safeNumber(value);
  if (seconds === null) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fallbackTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(seconds * 1000));
}

function isoTimestampFromUnixSeconds(value: unknown) {
  const seconds = safeNumber(value);
  if (seconds === null) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

function getCurrentIsoDateInTimeZone(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftIsoDateByDays(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function normalizeProviderRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeDailyInterval(value: unknown): "1d" {
  const normalized = cleanString(value, 20).toLowerCase();
  if (normalized && normalized !== "1d") {
    throw new Error("Yahoo historical OHLCV importer currently supports interval 1d only.");
  }
  return "1d";
}

function normalizeHistoryPeriod(value: unknown) {
  const normalized = cleanString(value, 40).toLowerCase();
  if (!normalized || normalized === "full") {
    return "max";
  }
  return normalized;
}

function countWeekdaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }

  let cursor = new Date(start);
  let weekdays = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (cursor <= end && day !== 0 && day !== 6) {
      weekdays += 1;
    }
  }

  return weekdays;
}

function dedupeHistoricalRowsByTradeDate(rows: HistoricalPricePersistRow[]) {
  const byTradeDate = new Map<string, HistoricalPricePersistRow>();
  for (const row of rows) {
    byTradeDate.set(row.tradeDate, row);
  }

  return Array.from(byTradeDate.values()).sort((left, right) =>
    left.tradeDate.localeCompare(right.tradeDate),
  );
}

function countMissingTradingDays(rows: HistoricalPricePersistRow[]) {
  if (rows.length < 2) {
    return 0;
  }

  let missing = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    const weekdaysGap = countWeekdaysBetween(previous.tradeDate, current.tradeDate);
    missing += Math.max(0, weekdaysGap - 1);
  }

  return missing;
}

function findFirstMissingTradingGap(tradeDates: string[]) {
  if (tradeDates.length < 2) {
    return {
      missingGapStartDate: null,
      missingGapPreviousDate: null,
    };
  }

  const sortedDates = [...tradeDates].sort((left, right) => left.localeCompare(right));
  for (let index = 1; index < sortedDates.length; index += 1) {
    const previous = sortedDates[index - 1]!;
    const current = sortedDates[index]!;
    const weekdaysGap = countWeekdaysBetween(previous, current);
    if (weekdaysGap > 1) {
      return {
        missingGapStartDate: shiftIsoDateByDays(previous, 1),
        missingGapPreviousDate: previous,
      };
    }
  }

  return {
    missingGapStartDate: null,
    missingGapPreviousDate: null,
  };
}

function isFieldFilled(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return cleanString(value).length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

function buildFieldCoverageReport(input: {
  bucketKey: string;
  tableName: string;
  mappedFields: Record<string, unknown>;
}) {
  const entries = Object.entries(input.mappedFields);
  const filledFieldKeys = entries.filter(([, value]) => isFieldFilled(value)).map(([key]) => key);
  const missingFieldKeys = entries
    .filter(([, value]) => !isFieldFilled(value))
    .map(([key]) => key);
  const totalMappedFields = entries.length;
  const filledFields = filledFieldKeys.length;
  const missingFields = missingFieldKeys.length;
  const fillPercentage =
    totalMappedFields > 0
      ? Number(((filledFields / totalMappedFields) * 100).toFixed(2))
      : 0;

  return {
    bucketKey: input.bucketKey,
    tableName: input.tableName,
    totalMappedFields,
    filledFields,
    missingFields,
    fillPercentage,
    filledFieldKeys,
    missingFieldKeys,
  } satisfies YahooFieldCoverageReport;
}

function extractYahooDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return isoDateFromUnixSeconds(value);
  }

  if (typeof value === "string") {
    const normalized = cleanString(value, 40);
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : normalized.slice(0, 10) || null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const rawDate: string | null = extractYahooDate(record.raw);
    if (rawDate) {
      return rawDate;
    }

    for (const key of ["fmt", "longFmt", "shortFmt", "displayName"]) {
      const normalized = cleanString(record[key], 40);
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
      }
      if (normalized) {
        return normalized.slice(0, 10);
      }
    }
  }

  return null;
}

function extractStatementRecords(value: unknown, candidateKeys: string[]) {
  const record = normalizeProviderRecord(value);
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate.map((item) => normalizeProviderRecord(item));
    }
  }
  return [] as Array<Record<string, unknown>>;
}

function buildMultiRowFieldCoverageReport(input: {
  bucketKey: string;
  tableName: string;
  rows: StatementRowCoverageInput[];
}) {
  const flattened: Record<string, unknown> = {};
  for (const row of input.rows) {
    for (const [fieldKey, fieldValue] of Object.entries(row.mappedFields)) {
      flattened[`${row.fiscalDate}:${fieldKey}`] = fieldValue;
    }
  }

  return buildFieldCoverageReport({
    bucketKey: input.bucketKey,
    tableName: input.tableName,
    mappedFields: flattened,
  });
}

function cleanStringArray(values: string[]) {
  return Array.from(new Set(values.map((value) => cleanString(value, 240)).filter(Boolean)));
}

const YAHOO_VALUATION_METRIC_FIELD_KEYS = [
  "market_cap",
  "enterprise_value",
  "trailing_pe",
  "forward_pe",
  "peg_ratio",
  "price_to_book",
  "ev_to_revenue",
  "ev_to_ebitda",
  "trailing_eps",
  "forward_eps",
  "dividend_yield",
] as const;

const YAHOO_SHARE_STATISTICS_FIELD_KEYS = [
  "shares_outstanding",
  "float_shares",
  "implied_shares_outstanding",
  "shares_short",
  "shares_short_prior_month",
  "shares_short_ratio",
  "short_percent_float",
  "short_percent_shares_outstanding",
  "held_percent_insiders",
  "held_percent_institutions",
] as const;

const YAHOO_FINANCIAL_HIGHLIGHT_FIELD_KEYS = [
  "total_revenue",
  "gross_profit",
  "ebitda",
  "net_income_to_common",
  "diluted_eps",
  "operating_cash_flow",
  "free_cash_flow",
  "total_cash",
  "total_debt",
  "current_ratio",
  "book_value_per_share",
  "return_on_assets",
  "return_on_equity",
] as const;

const YAHOO_INCOME_STATEMENT_FIELD_KEYS = [
  "currency_code",
  "total_revenue",
  "cost_of_revenue",
  "gross_profit",
  "operating_expense",
  "operating_income",
  "interest_expense",
  "pretax_income",
  "income_tax_expense",
  "net_income",
  "net_income_common",
  "basic_eps",
  "diluted_eps",
  "ebitda",
] as const;

const YAHOO_BALANCE_SHEET_FIELD_KEYS = [
  "currency_code",
  "total_assets",
  "total_liabilities",
  "stockholders_equity",
  "current_assets",
  "current_liabilities",
  "cash_and_equivalents",
  "inventory",
  "receivables",
  "payables",
  "short_term_debt",
  "long_term_debt",
  "net_debt",
] as const;

const YAHOO_CASH_FLOW_FIELD_KEYS = [
  "currency_code",
  "operating_cash_flow",
  "investing_cash_flow",
  "financing_cash_flow",
  "capital_expenditure",
  "free_cash_flow",
  "dividends_paid",
  "stock_based_compensation",
  "depreciation_amortization",
  "beginning_cash_position",
  "end_cash_position",
] as const;

function buildUnavailableFieldCoverageReport(
  bucketKey: string,
  tableName: string,
  fieldKeys: readonly string[],
) {
  return buildFieldCoverageReport({
    bucketKey,
    tableName,
    mappedFields: Object.fromEntries(fieldKeys.map((fieldKey) => [fieldKey, null])),
  });
}

function buildUnavailableQuoteStatisticsReports(): QuoteStatisticsPersistResult {
  return {
    valuationMetrics: buildUnavailableFieldCoverageReport(
      "valuation_metrics",
      "stock_valuation_metrics",
      YAHOO_VALUATION_METRIC_FIELD_KEYS,
    ),
    shareStatistics: buildUnavailableFieldCoverageReport(
      "share_statistics",
      "stock_share_statistics",
      YAHOO_SHARE_STATISTICS_FIELD_KEYS,
    ),
    financialHighlights: buildUnavailableFieldCoverageReport(
      "financial_highlights",
      "stock_financial_highlights",
      YAHOO_FINANCIAL_HIGHLIGHT_FIELD_KEYS,
    ),
  };
}

function buildUnavailableFinancialStatementsReports(): FinancialStatementsPersistResult {
  return {
    reports: {
      incomeStatementAnnual: buildUnavailableFieldCoverageReport(
        "income_statement_annual",
        "stock_income_statement",
        YAHOO_INCOME_STATEMENT_FIELD_KEYS,
      ),
      incomeStatementQuarterly: buildUnavailableFieldCoverageReport(
        "income_statement_quarterly",
        "stock_income_statement",
        YAHOO_INCOME_STATEMENT_FIELD_KEYS,
      ),
      balanceSheetAnnual: buildUnavailableFieldCoverageReport(
        "balance_sheet_annual",
        "stock_balance_sheet",
        YAHOO_BALANCE_SHEET_FIELD_KEYS,
      ),
      balanceSheetQuarterly: buildUnavailableFieldCoverageReport(
        "balance_sheet_quarterly",
        "stock_balance_sheet",
        YAHOO_BALANCE_SHEET_FIELD_KEYS,
      ),
      cashFlowAnnual: buildUnavailableFieldCoverageReport(
        "cash_flow_annual",
        "stock_cash_flow",
        YAHOO_CASH_FLOW_FIELD_KEYS,
      ),
      cashFlowQuarterly: buildUnavailableFieldCoverageReport(
        "cash_flow_quarterly",
        "stock_cash_flow",
        YAHOO_CASH_FLOW_FIELD_KEYS,
      ),
    },
    rowCounts: {
      incomeStatementAnnual: 0,
      incomeStatementQuarterly: 0,
      balanceSheetAnnual: 0,
      balanceSheetQuarterly: 0,
      cashFlowAnnual: 0,
      cashFlowQuarterly: 0,
    },
    rawSourceCounts: {
      incomeStatementAnnual: 0,
      incomeStatementQuarterly: 0,
      balanceSheetAnnual: 0,
      balanceSheetQuarterly: 0,
      cashFlowAnnual: 0,
      cashFlowQuarterly: 0,
    },
    latestFiscalDates: {
      incomeStatementAnnual: null,
      incomeStatementQuarterly: null,
      balanceSheetAnnual: null,
      balanceSheetQuarterly: null,
      cashFlowAnnual: null,
      cashFlowQuarterly: null,
    },
  };
}

function buildSyntheticQuotePayloadFromHistoricalPayload(input: {
  payload: Record<string, unknown>;
  yahooSymbol: string;
  selectedTradeDate?: string | null;
}) {
  const chart = normalizeProviderRecord(input.payload.chart);
  const result = normalizeProviderRecord(Array.isArray(chart.result) ? chart.result[0] : null);
  const meta = normalizeProviderRecord(result.meta);
  const indicators = normalizeProviderRecord(result.indicators);
  const quote = normalizeProviderRecord(Array.isArray(indicators.quote) ? indicators.quote[0] : null);
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const closes = Array.isArray(quote.close) ? quote.close : [];
  const opens = Array.isArray(quote.open) ? quote.open : [];
  const highs = Array.isArray(quote.high) ? quote.high : [];
  const lows = Array.isArray(quote.low) ? quote.low : [];
  const volumes = Array.isArray(quote.volume) ? quote.volume : [];

  let latestIndex = -1;
  const selectedTradeDate = cleanString(input.selectedTradeDate, 40) || null;
  if (selectedTradeDate) {
    for (let index = timestamps.length - 1; index >= 0; index -= 1) {
      const timestamp = timestamps[index];
      const close = closes[index];
      if (
        typeof timestamp === "number" &&
        typeof close === "number" &&
        Number.isFinite(close) &&
        isoDateFromUnixSeconds(timestamp, "Asia/Kolkata") === selectedTradeDate
      ) {
        latestIndex = index;
        break;
      }
    }
  }

  if (latestIndex < 0) {
    for (let index = closes.length - 1; index >= 0; index -= 1) {
      if (typeof closes[index] === "number" && Number.isFinite(closes[index] as number)) {
        latestIndex = index;
        break;
      }
    }
  }

  const latestClose =
    latestIndex >= 0 ? safeNumber(closes[latestIndex]) : extractYahooNumber(meta.regularMarketPrice);
  const previousClose =
    extractYahooNumber(meta.previousClose) ??
    extractYahooNumber(meta.chartPreviousClose) ??
    (latestIndex > 0 ? safeNumber(closes[latestIndex - 1]) : null);
  const latestTimestamp =
    latestIndex >= 0 && typeof timestamps[latestIndex] === "number"
      ? (timestamps[latestIndex] as number)
      : safeNumber(meta.regularMarketTime);
  const latestOpen =
    latestIndex >= 0 ? safeNumber(opens[latestIndex]) : extractYahooNumber(meta.regularMarketOpen);
  const latestHigh =
    latestIndex >= 0 ? safeNumber(highs[latestIndex]) : extractYahooNumber(meta.regularMarketDayHigh);
  const latestLow =
    latestIndex >= 0 ? safeNumber(lows[latestIndex]) : extractYahooNumber(meta.regularMarketDayLow);
  const latestVolume =
    latestIndex >= 0 ? safeNumber(volumes[latestIndex]) : extractYahooNumber(meta.regularMarketVolume);
  const changeAbsolute =
    latestClose !== null && previousClose !== null ? Number((latestClose - previousClose).toFixed(4)) : null;
  const changePercent =
    latestClose !== null && previousClose !== null && previousClose !== 0
      ? Number((((latestClose - previousClose) / previousClose) * 100).toFixed(4))
      : null;

  return {
    quoteResponse: {
      result: [
        {
          symbol: cleanString(meta.symbol, 160) || input.yahooSymbol,
          currency: cleanString(meta.currency, 20) || "INR",
          marketState: cleanString(meta.marketState, 120) || "CLOSED",
          exchangeName: cleanString(meta.exchangeName, 120) || null,
          regularMarketOpen: latestOpen,
          regularMarketTime: latestTimestamp,
          regularMarketPrice: latestClose,
          regularMarketChange: changeAbsolute,
          regularMarketDayLow: latestLow,
          regularMarketVolume: latestVolume,
          regularMarketDayHigh: latestHigh,
          regularMarketChangePercent: changePercent,
          regularMarketPreviousClose: previousClose,
          marketCap: extractYahooNumber(meta.marketCap),
        },
      ],
      error: null,
    },
  } satisfies Record<string, unknown>;
}

function buildHistoricalFieldSummary(rows: HistoricalPricePersistRow[]) {
  let mappedFieldsCount = 0;
  let filledFieldsCount = 0;
  const missingOptionalFields = new Set<string>();

  for (const row of rows) {
    mappedFieldsCount += 7;
    filledFieldsCount += 5;
    if (row.adjClose !== null) {
      filledFieldsCount += 1;
    } else {
      missingOptionalFields.add("adjusted_close");
    }
    if (row.volume !== null) {
      filledFieldsCount += 1;
    } else {
      missingOptionalFields.add("volume");
    }
  }

  const missingFieldsCount = Math.max(0, mappedFieldsCount - filledFieldsCount);
  const fillPercentage =
    mappedFieldsCount > 0
      ? Number(((filledFieldsCount / mappedFieldsCount) * 100).toFixed(2))
      : 0;

  return {
    mappedFieldsCount,
    filledFieldsCount,
    missingFieldsCount,
    fillPercentage,
    missingOptionalFields: Array.from(missingOptionalFields),
  };
}

function buildReconciliationStatus(input: {
  normalizedRecordsCount: number;
  missingRequiredFields?: string[];
  missingOptionalFields?: string[];
  failed?: boolean;
}) {
  if (input.failed) {
    return "failed" as const;
  }
  if (input.normalizedRecordsCount <= 0) {
    return "no_data" as const;
  }
  if ((input.missingRequiredFields?.length ?? 0) > 0 || (input.missingOptionalFields?.length ?? 0) > 0) {
    return "completed_with_warnings" as const;
  }
  return "completed" as const;
}

function buildReconciliationMetadata(input: {
  stock: YahooResolvedStockTarget;
  sourceUrl?: string | null;
  sourceRecordedAt?: string | null;
  extra?: Record<string, unknown>;
}) {
  return {
    stockSlug: input.stock.slug,
    stockSymbol: input.stock.symbol,
    yahooSymbol: input.stock.yahooSymbol,
    sourceName: "yahoo_finance",
    sourceUrl: cleanString(input.sourceUrl, 600) || null,
    sourceRecordedAt: cleanString(input.sourceRecordedAt, 120) || null,
    ...(input.extra ?? {}),
  };
}

async function saveStockImportActivity(input: {
  jobId: string;
  jobItemId?: string | null;
  stock: YahooResolvedStockTarget;
  yahooSymbol: string;
  moduleName: string;
  stepName: StockImportActivityStepName;
  status: StockImportActivityStatus;
  message: string;
  rowsFetched?: number | null;
  rowsInserted?: number | null;
  rowsUpdated?: number | null;
  rowsSkipped?: number | null;
  mappedFieldsCount?: number | null;
  missingFieldsCount?: number | null;
  fillPercentage?: number | null;
  affectedTable?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const buildPayload = (
    stepName: StockImportActivityStepName,
    metadata: Record<string, unknown> | undefined,
  ) => ({
    id: randomUUID(),
    job_id: input.jobId,
    job_item_id: cleanString(input.jobItemId, 160) || null,
    stock_id: input.stock.stockId,
    yahoo_symbol: cleanString(input.yahooSymbol, 160) || input.stock.yahooSymbol,
    module_name: cleanString(input.moduleName, 160),
    step_name: stepName,
    status: input.status,
    message: cleanString(input.message, 4000) || null,
    rows_fetched:
      typeof input.rowsFetched === "number" && Number.isFinite(input.rowsFetched)
        ? Math.max(0, Math.trunc(input.rowsFetched))
        : 0,
    rows_inserted:
      typeof input.rowsInserted === "number" && Number.isFinite(input.rowsInserted)
        ? Math.max(0, Math.trunc(input.rowsInserted))
        : 0,
    rows_updated:
      typeof input.rowsUpdated === "number" && Number.isFinite(input.rowsUpdated)
        ? Math.max(0, Math.trunc(input.rowsUpdated))
        : 0,
    rows_skipped:
      typeof input.rowsSkipped === "number" && Number.isFinite(input.rowsSkipped)
        ? Math.max(0, Math.trunc(input.rowsSkipped))
        : 0,
    mapped_fields_count:
      typeof input.mappedFieldsCount === "number" && Number.isFinite(input.mappedFieldsCount)
        ? Math.max(0, Math.trunc(input.mappedFieldsCount))
        : 0,
    missing_fields_count:
      typeof input.missingFieldsCount === "number" && Number.isFinite(input.missingFieldsCount)
        ? Math.max(0, Math.trunc(input.missingFieldsCount))
        : 0,
    fill_percentage:
      typeof input.fillPercentage === "number" && Number.isFinite(input.fillPercentage)
        ? Number(input.fillPercentage.toFixed(2))
        : null,
    affected_table: cleanString(input.affectedTable, 160) || null,
    started_at: cleanString(input.startedAt, 120) || now,
    completed_at: cleanString(input.completedAt, 120) || null,
    error_message: cleanString(input.errorMessage, 4000) || null,
    metadata: metadata ?? {},
    created_at: now,
    updated_at: now,
  });

  const primaryPayload = buildPayload(input.stepName, input.metadata);
  const { error } = await supabase.from("stock_import_activity_log").insert(primaryPayload);

  if (!error) {
    return;
  }

  const fallbackStepName = STOCK_IMPORT_ACTIVITY_STEP_FALLBACKS[input.stepName];
  const supportsFallback =
    error.message.includes("stock_import_activity_log_step_name_check") &&
    Boolean(fallbackStepName);

  if (!supportsFallback || !fallbackStepName) {
    throw new Error(`Could not save stock_import_activity_log row. ${error.message}`);
  }

  const fallbackPayload = buildPayload(fallbackStepName, {
    ...(input.metadata ?? {}),
    intendedStepName: input.stepName,
    usedStepNameFallback: true,
    stepConstraintError: error.message,
  });

  const { error: fallbackError } = await supabase
    .from("stock_import_activity_log")
    .insert(fallbackPayload);

  if (fallbackError) {
    throw new Error(`Could not save stock_import_activity_log row. ${fallbackError.message}`);
  }
}

async function safeSaveStockImportActivity(
  input: Parameters<typeof saveStockImportActivity>[0],
) {
  try {
    await saveStockImportActivity(input);
  } catch (error) {
    console.error("[yahoo-finance-import] failed to save stock import activity", error);
  }
}

async function saveStockImportReconciliation(input: {
  jobId: string;
  stock: YahooResolvedStockTarget;
  yahooSymbol: string;
  moduleName: string;
  rawImportId?: string | null;
  targetTable: string;
  rawRecordsCount: number;
  normalizedRecordsCount: number;
  unmappedRecordsCount?: number | null;
  missingRequiredFields?: string[];
  missingOptionalFields?: string[];
  reconciliationStatus: StockImportReconciliationStatus;
  reconciliationNotes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("stock_import_reconciliation").upsert(
    {
      id: randomUUID(),
      job_id: input.jobId,
      stock_id: input.stock.stockId,
      yahoo_symbol: cleanString(input.yahooSymbol, 160) || input.stock.yahooSymbol,
      module_name: cleanString(input.moduleName, 160),
      raw_import_id: cleanString(input.rawImportId, 160) || null,
      target_table: cleanString(input.targetTable, 160),
      raw_records_count: Math.max(0, Math.trunc(input.rawRecordsCount)),
      normalized_records_count: Math.max(0, Math.trunc(input.normalizedRecordsCount)),
      unmapped_records_count: Math.max(
        0,
        Math.trunc(input.unmappedRecordsCount ?? input.rawRecordsCount - input.normalizedRecordsCount),
      ),
      missing_required_fields: cleanStringArray(input.missingRequiredFields ?? []),
      missing_optional_fields: cleanStringArray(input.missingOptionalFields ?? []),
      reconciliation_status: input.reconciliationStatus,
      reconciliation_notes: cleanString(input.reconciliationNotes, 4000) || null,
      metadata: input.metadata ?? {},
      created_at: now,
      updated_at: now,
    },
    { onConflict: "job_id,stock_id,module_name,target_table" },
  );

  if (error) {
    throw new Error(`Could not save stock_import_reconciliation row. ${error.message}`);
  }
}

async function safeSaveStockImportReconciliation(
  input: Parameters<typeof saveStockImportReconciliation>[0],
) {
  try {
    await saveStockImportReconciliation(input);
  } catch (error) {
    console.error("[yahoo-finance-import] failed to save stock import reconciliation", error);
  }
}

async function persistUnavailableBucketOutcome(input: {
  jobId: string;
  stock: YahooResolvedStockTarget;
  yahooSymbol: string;
  bucketKey: string;
  targetTable: string;
  report: YahooFieldCoverageReport;
  reason: string;
  rawImportId?: string | null;
  sourceUrl?: string | null;
  sourceRecordedAt?: string | null;
  latestTradeDate?: string | null;
  latestFiscalDate?: string | null;
  rawRecordsCount?: number | null;
}) {
  const jobItemId = await saveStockImportJobItem({
    jobId: input.jobId,
    stock: input.stock,
    bucketKey: input.bucketKey,
    itemKey: `${input.stock.symbol}:${input.latestTradeDate ?? input.latestFiscalDate ?? "unavailable"}:${input.bucketKey}`,
    rowStatus: "warning",
    actionTaken: "provider_unavailable",
    rawImportId: input.rawImportId ?? null,
    rawRow: {
      error: input.reason,
    },
    normalizedRow: {
      tradeDate: input.latestTradeDate ?? null,
      fiscalDate: input.latestFiscalDate ?? null,
      unavailable: true,
      report: input.report,
    },
  });

  await safeSaveStockImportActivity({
    jobId: input.jobId,
    jobItemId,
    stock: input.stock,
    yahooSymbol: input.yahooSymbol,
    moduleName: input.bucketKey,
    stepName: "import_failed",
    status: "warning",
    message: `${input.bucketKey.replaceAll("_", " ")} was unavailable for ${input.stock.symbol}.`,
    rowsFetched: Math.max(0, Math.trunc(input.rawRecordsCount ?? 0)),
    rowsSkipped: 1,
    mappedFieldsCount: input.report.totalMappedFields,
    missingFieldsCount: input.report.totalMappedFields,
    fillPercentage: input.report.fillPercentage,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedTable: input.targetTable,
    errorMessage: input.reason,
    metadata: {
      rawImportId: input.rawImportId ?? null,
      unavailable: true,
    },
  });

  await persistFieldCoverageReport({
    stock: input.stock,
    jobId: input.jobId,
    bucketKey: input.bucketKey,
    report: input.report,
    rawImportId: input.rawImportId ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceRecordedAt: input.sourceRecordedAt ?? null,
    latestTradeDate: input.latestTradeDate ?? null,
    latestFiscalDate: input.latestFiscalDate ?? null,
    rowCount: 0,
    rowsAvailable: input.report.totalMappedFields,
    rowsImported: 0,
    notes: input.reason,
    metadata: {
      unavailable: true,
      retryRecommendation: "Retry this module later after Yahoo quoteSummary access recovers.",
    },
  });

  await safeSaveStockImportActivity({
    jobId: input.jobId,
    jobItemId,
    stock: input.stock,
    yahooSymbol: input.yahooSymbol,
    moduleName: input.bucketKey,
    stepName: "coverage_updated",
    status: "warning",
    rowsFetched: Math.max(0, Math.trunc(input.rawRecordsCount ?? 0)),
    rowsInserted: 0,
    rowsSkipped: 1,
    mappedFieldsCount: input.report.totalMappedFields,
    missingFieldsCount: input.report.totalMappedFields,
    fillPercentage: input.report.fillPercentage,
    message: `Marked ${input.bucketKey.replaceAll("_", " ")} coverage unavailable for ${input.stock.symbol}.`,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedTable: "stock_import_coverage",
    metadata: {
      rawImportId: input.rawImportId ?? null,
      unavailable: true,
    },
  });

  await safeSaveStockImportReconciliation({
    jobId: input.jobId,
    stock: input.stock,
    yahooSymbol: input.yahooSymbol,
    moduleName: input.bucketKey,
    rawImportId: input.rawImportId ?? null,
    targetTable: input.targetTable,
    rawRecordsCount: Math.max(0, Math.trunc(input.rawRecordsCount ?? 0)),
    normalizedRecordsCount: 0,
    unmappedRecordsCount: Math.max(0, Math.trunc(input.rawRecordsCount ?? 0)),
    missingRequiredFields: ["provider_response_unavailable"],
    missingOptionalFields: input.report.missingFieldKeys,
    reconciliationStatus: "no_data",
    reconciliationNotes: input.reason,
    metadata: buildReconciliationMetadata({
      stock: input.stock,
      sourceUrl: input.sourceUrl ?? null,
      sourceRecordedAt: input.sourceRecordedAt ?? null,
      extra: {
        rawImportId: input.rawImportId ?? null,
        unavailable: true,
      },
    }),
  });

  await safeSaveStockImportActivity({
    jobId: input.jobId,
    jobItemId,
    stock: input.stock,
    yahooSymbol: input.yahooSymbol,
    moduleName: input.bucketKey,
    stepName: "reconciliation_completed",
    status: "warning",
    rowsFetched: Math.max(0, Math.trunc(input.rawRecordsCount ?? 0)),
    rowsInserted: 0,
    rowsSkipped: 1,
    mappedFieldsCount: input.report.totalMappedFields,
    missingFieldsCount: input.report.totalMappedFields,
    fillPercentage: input.report.fillPercentage,
    message: `Recorded unavailable reconciliation state for ${input.bucketKey.replaceAll("_", " ")}.`,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedTable: "stock_import_reconciliation",
    metadata: {
      rawImportId: input.rawImportId ?? null,
      reconciliationStatus: "no_data",
      unavailable: true,
    },
  });
}

async function createStockImportJob(input: {
  stock: YahooResolvedStockTarget;
  actorEmail: string;
  yahooSymbol: string;
  jobKind?: string;
  importScope?: string;
  totalItems?: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stock_import_jobs")
    .insert({
      id: randomUUID(),
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      source_type: "yahoo_finance",
      source_name: "yahoo_finance_service",
      source_url: `https://finance.yahoo.com/quote/${encodeURIComponent(input.yahooSymbol)}`,
      source_symbol: input.yahooSymbol,
      job_kind: cleanString(input.jobKind, 120) || "sample_import",
      import_scope: cleanString(input.importScope, 120) || "stock_full_fetch",
      requested_by: input.actorEmail,
      status: "running",
      started_at: now,
      total_items:
        typeof input.totalItems === "number" && Number.isFinite(input.totalItems)
          ? Math.max(1, Math.trunc(input.totalItems))
          : 8,
      imported_items: 0,
      updated_items: 0,
      skipped_items: 0,
      failed_items: 0,
      warning_items: 0,
      metadata: {
        sourceDisplayName: input.stock.companyName ?? input.stock.symbol,
        ...(input.metadata ?? {}),
      },
      raw_payload: {},
      imported_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not create stock_import_jobs row. ${error.message}`);
  }

  return cleanString(data?.id, 160);
}

async function updateStockImportJob(input: {
  jobId: string;
  status: StockImportJobStatus;
  importedItems: number;
  updatedItems: number;
  skippedItems: number;
  failedItems: number;
  warningItems: number;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("stock_import_jobs")
    .update({
      status: input.status,
      imported_items: input.importedItems,
      updated_items: input.updatedItems,
      skipped_items: input.skippedItems,
      failed_items: input.failedItems,
      warning_items: input.warningItems,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: input.metadata,
    })
    .eq("id", input.jobId);

  if (error) {
    throw new Error(`Could not update stock_import_jobs row. ${error.message}`);
  }
}

async function loadStocksMasterById(stockId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stocks_master")
    .select("*")
    .eq("id", stockId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read stocks_master by id. ${error.message}`);
  }

  return data ? (data as Record<string, unknown>) : null;
}

async function resolveHistoricalImportStockTarget(input: {
  yahooSymbol: string;
  stockId?: string | null;
}) {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase();
  const stock = await resolveYahooStockTarget(yahooSymbol);
  const requestedStockId = cleanString(input.stockId, 160) || null;
  if (!requestedStockId) {
    return stock;
  }

  const row = await loadStocksMasterById(requestedStockId);
  if (!row) {
    throw new Error(`No stocks_master row was found for stock_id "${requestedStockId}".`);
  }

  const resolved = {
    stockId: cleanString(row.id, 160) || requestedStockId,
    instrumentId: cleanString(row.instrument_id, 160) || null,
    slug: cleanString(row.slug, 160) || null,
    symbol: cleanString(row.symbol, 160) || stock.symbol,
    yahooSymbol: cleanString(row.yahoo_symbol, 160) || yahooSymbol,
    companyName: cleanString(row.company_name, 240) || null,
    exchange: cleanString(row.exchange, 120) || null,
  } satisfies YahooResolvedStockTarget;

  if (stock.stockId && stock.stockId !== resolved.stockId) {
    throw new Error(
      `Yahoo symbol "${yahooSymbol}" resolved to stock_id "${stock.stockId}", which does not match the requested stock_id "${requestedStockId}".`,
    );
  }

  if (
    cleanString(row.yahoo_symbol, 160) &&
    cleanString(row.yahoo_symbol, 160).toUpperCase() !== yahooSymbol
  ) {
    throw new Error(
      `The requested stock_id "${requestedStockId}" is mapped to Yahoo symbol "${cleanString(
        row.yahoo_symbol,
        160,
      )}", not "${yahooSymbol}".`,
    );
  }

  return resolved;
}

async function loadExistingHistoricalWindowSummary(stockId: string): Promise<ExistingHistoricalWindowSummary> {
  const supabase = createSupabaseAdminClient();
  const [earliestResult, latestResult, allDateRowsResult] = await Promise.all([
    supabase
      .from("stock_price_history")
      .select("trade_date")
      .eq("stock_id", stockId)
      .eq("interval_type", "1d")
      .eq("source_name", "yahoo_finance")
      .order("trade_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("stock_price_history")
      .select("trade_date")
      .eq("stock_id", stockId)
      .eq("interval_type", "1d")
      .eq("source_name", "yahoo_finance")
      .order("trade_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("stock_price_history")
      .select("trade_date", { count: "exact" })
      .eq("stock_id", stockId)
      .eq("interval_type", "1d")
      .eq("source_name", "yahoo_finance")
      .order("trade_date", { ascending: true })
      .range(0, 9999),
  ]);

  if (earliestResult.error) {
    throw new Error(
      `Could not read earliest stock_price_history row. ${earliestResult.error.message}`,
    );
  }
  if (latestResult.error) {
    throw new Error(
      `Could not read latest stock_price_history row. ${latestResult.error.message}`,
    );
  }
  if (allDateRowsResult.error) {
    throw new Error(
      `Could not read stock_price_history date coverage. ${allDateRowsResult.error.message}`,
    );
  }

  const tradeDates = Array.isArray(allDateRowsResult.data)
    ? allDateRowsResult.data
        .map((row) => cleanString((row as Record<string, unknown>).trade_date, 40))
        .filter(Boolean)
    : [];
  const gap = findFirstMissingTradingGap(tradeDates);

  return {
    rowCount:
      typeof allDateRowsResult.count === "number"
        ? allDateRowsResult.count
        : tradeDates.length,
    earliestTradeDate: cleanString(earliestResult.data?.trade_date, 40) || null,
    latestTradeDate: cleanString(latestResult.data?.trade_date, 40) || null,
    missingGapStartDate: gap.missingGapStartDate,
    missingGapPreviousDate: gap.missingGapPreviousDate,
  };
}

async function loadExistingHistoricalTradeDatesInRange(input: {
  stockId: string;
  startDate: string;
  endDate: string;
}) {
  const supabase = createSupabaseAdminClient();
  const tradeDates = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("stock_price_history")
      .select("trade_date")
      .eq("stock_id", input.stockId)
      .eq("interval_type", "1d")
      .eq("source_name", "yahoo_finance")
      .gte("trade_date", input.startDate)
      .lte("trade_date", input.endDate)
      .order("trade_date", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Could not read existing stock_price_history rows. ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const tradeDate = cleanString((row as Record<string, unknown>).trade_date, 40);
      if (tradeDate) {
        tradeDates.add(tradeDate);
      }
    }

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return tradeDates;
}

function isDuplicateHistoricalWriteError(error: unknown) {
  const message = cleanString(error instanceof Error ? error.message : error, 4000).toLowerCase();
  return message.includes("duplicate key");
}

function buildHistoricalFetchPlan(input: {
  requestedPeriod: string;
  force: boolean;
  existing: ExistingHistoricalWindowSummary;
}): {
  mode: YahooHistoricalImportMode;
  period: string | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
} {
  if (input.force) {
    return {
      mode: "force_rebuild",
      period: input.requestedPeriod || "max",
      periodStartDate: null,
      periodEndDate: null,
    };
  }

  if (!input.existing.rowCount || !input.existing.latestTradeDate) {
    return {
      mode: "full_initial",
      period: "max",
      periodStartDate: null,
      periodEndDate: null,
    };
  }

  const today = getCurrentIsoDateInTimeZone();
  if (input.existing.missingGapStartDate) {
    return {
      mode: "backfill_missing",
      period: null,
      periodStartDate: shiftIsoDateByDays(
        input.existing.missingGapPreviousDate ?? input.existing.missingGapStartDate,
        -7,
      ),
      periodEndDate: today,
    };
  }

  return {
    mode: "update_recent",
    period: null,
    periodStartDate: shiftIsoDateByDays(input.existing.latestTradeDate, -30),
    periodEndDate: today,
  };
}

function normalizeIsoDateOrToday(value: unknown) {
  const normalized = cleanString(value, 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  return getCurrentIsoDateInTimeZone();
}

function buildUnavailableLatestMarketSnapshotReport() {
  return buildFieldCoverageReport({
    bucketKey: "latest_market_snapshot",
    tableName: "stock_market_snapshot",
    mappedFields: {
      currency_code: null,
      market_state: null,
      price: null,
      previous_close: null,
      open: null,
      day_high: null,
      day_low: null,
      change_absolute: null,
      change_percent: null,
      volume: null,
      market_cap: null,
    },
  });
}

function buildHistoricalRowCoverageReport(row: HistoricalPricePersistRow | null) {
  return buildFieldCoverageReport({
    bucketKey: "historical_prices",
    tableName: "stock_price_history",
    mappedFields: row
      ? {
          trade_date: row.tradeDate,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          adjusted_close: row.adjClose,
          volume: row.volume,
        }
      : {
          trade_date: null,
          open: null,
          high: null,
          low: null,
          close: null,
          adjusted_close: null,
          volume: null,
        },
  });
}

function toSameDayHistoricalRow(row: HistoricalPricePersistRow | null): YahooSameDayHistoricalRow | null {
  if (!row) {
    return null;
  }

  return {
    tradeDate: row.tradeDate,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    adjClose: row.adjClose,
    volume: row.volume,
  };
}

export function buildYahooSameDayHistoricalSignature(row: YahooSameDayHistoricalRow | null) {
  if (!row) {
    return null;
  }

  return [
    row.tradeDate,
    row.open,
    row.high,
    row.low,
    row.close,
    row.adjClose ?? "null",
    row.volume ?? "null",
  ].join("|");
}

export function validateYahooSameDayHistoricalSourceIsolation(input: {
  requestedYahooSymbol: string;
  resolvedYahooSymbol: string;
  rawImportYahooSymbol: string;
  requestUrl: string;
  payload: unknown;
  targetDate: string;
  effectiveRow: YahooSameDayHistoricalRow | null;
}) {
  const issues: string[] = [];
  const expectedYahooSymbol = cleanString(input.requestedYahooSymbol, 160).toUpperCase();
  const resolvedYahooSymbol = cleanString(input.resolvedYahooSymbol, 160).toUpperCase();
  const rawImportYahooSymbol = cleanString(input.rawImportYahooSymbol, 160).toUpperCase();
  const payloadSymbol = extractYahooChartPayloadSymbol(input.payload);
  const requestUrl = cleanString(input.requestUrl, 2000).toUpperCase();

  if (!expectedYahooSymbol) {
    issues.push("Expected Yahoo symbol was missing for same-day source isolation validation.");
  }
  if (resolvedYahooSymbol !== expectedYahooSymbol) {
    issues.push(
      `Resolved Yahoo symbol mismatch. Expected "${expectedYahooSymbol}" but received "${resolvedYahooSymbol}".`,
    );
  }
  if (rawImportYahooSymbol !== expectedYahooSymbol) {
    issues.push(
      `Raw import Yahoo symbol mismatch. Expected "${expectedYahooSymbol}" but received "${rawImportYahooSymbol}".`,
    );
  }
  if (!payloadSymbol) {
    issues.push("Yahoo chart payload did not include meta.symbol.");
  } else if (payloadSymbol !== expectedYahooSymbol) {
    issues.push(
      `Yahoo chart payload symbol mismatch. Expected "${expectedYahooSymbol}" but received "${payloadSymbol}".`,
    );
  }
  if (!requestUrl.includes(expectedYahooSymbol)) {
    issues.push(`Yahoo chart request URL did not contain the expected symbol "${expectedYahooSymbol}".`);
  }
  if (input.effectiveRow && input.effectiveRow.tradeDate > input.targetDate) {
    issues.push(
      `Effective same-day row date "${input.effectiveRow.tradeDate}" is after requested target date "${input.targetDate}".`,
    );
  }

  return {
    ok: issues.length === 0,
    payloadSymbol,
    issues,
  };
}

function selectEffectiveHistoricalRowForTargetDate(
  rows: HistoricalPricePersistRow[],
  targetDate: string,
) {
  const sortedRows = [...rows].sort((left, right) => left.tradeDate.localeCompare(right.tradeDate));
  const exactMatch = sortedRows.find((row) => row.tradeDate === targetDate) ?? null;
  if (exactMatch) {
    const exactIndex = sortedRows.findIndex((row) => row.tradeDate === targetDate);
    return {
      effectiveRow: exactMatch,
      previousRow: exactIndex > 0 ? sortedRows[exactIndex - 1] ?? null : null,
      usedLatestAvailableTradingDate: false,
    };
  }

  const fallbackIndex = sortedRows
    .map((row, index) => ({ row, index }))
    .filter((entry) => entry.row.tradeDate <= targetDate)
    .sort((left, right) => right.row.tradeDate.localeCompare(left.row.tradeDate))[0];

  if (!fallbackIndex) {
    return {
      effectiveRow: null,
      previousRow: null,
      usedLatestAvailableTradingDate: false,
    };
  }

  return {
    effectiveRow: fallbackIndex.row,
    previousRow: fallbackIndex.index > 0 ? sortedRows[fallbackIndex.index - 1] ?? null : null,
    usedLatestAvailableTradingDate: fallbackIndex.row.tradeDate !== targetDate,
  };
}

async function loadExistingSnapshotForTradeDate(input: {
  stockId: string;
  tradeDate: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_market_snapshot")
    .select("*")
    .eq("stock_id", input.stockId)
    .eq("trade_date", input.tradeDate)
    .eq("source_name", "yahoo_finance")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read existing stock_market_snapshot row. ${error.message}`);
  }

  return data ? (data as Record<string, unknown>) : null;
}

function buildSnapshotReportFromStoredRow(row: Record<string, unknown>) {
  return buildFieldCoverageReport({
    bucketKey: "latest_market_snapshot",
    tableName: "stock_market_snapshot",
    mappedFields: {
      currency_code: cleanString(row.currency_code, 20) || null,
      market_state: cleanString(row.market_state, 120) || null,
      price: safeNumber(row.price),
      previous_close: safeNumber(row.previous_close),
      open: safeNumber(row.open),
      day_high: safeNumber(row.day_high),
      day_low: safeNumber(row.day_low),
      change_absolute: safeNumber(row.change_absolute),
      change_percent: safeNumber(row.change_percent),
      volume: safeNumber(row.volume),
      market_cap: safeNumber(row.market_cap),
    },
  });
}

async function saveStockImportJobItem(input: {
  jobId: string;
  stock: YahooResolvedStockTarget;
  bucketKey: string;
  itemKey?: string | null;
  rowStatus: StockImportJobItemStatus;
  actionTaken: string;
  rawRow?: Record<string, unknown>;
  normalizedRow?: Record<string, unknown>;
  rawImportId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const itemKey = cleanString(input.itemKey, 240) || input.bucketKey;
  const { data, error } = await supabase
    .from("stock_import_job_items")
    .upsert(
      {
        id: randomUUID(),
        job_id: input.jobId,
        stock_id: input.stock.stockId,
        symbol: input.stock.symbol,
        bucket_key: input.bucketKey,
        item_key: itemKey,
        trade_date: cleanString(input.normalizedRow?.tradeDate, 40) || null,
        fiscal_date: cleanString(input.normalizedRow?.fiscalDate, 40) || null,
        row_status: input.rowStatus,
        source_key: input.stock.yahooSymbol,
        target_key: input.stock.slug,
        action_taken: input.actionTaken,
        raw_row: {
          rawImportId: input.rawImportId ?? null,
          ...(input.rawRow ?? {}),
        },
        normalized_row: input.normalizedRow ?? {},
        raw_payload: input.rawRow ?? {},
        imported_at: now,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "job_id,bucket_key,item_key" },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not save stock_import_job_items row. ${error.message}`);
  }

  return cleanString(data?.id, 160) || null;
}

async function persistStockCompanyProfile(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  payload: Record<string, unknown>;
}) {
  if (!input.stock.stockId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const quoteSummaryRoot = normalizeProviderRecord(input.payload.quoteSummary);
  const quoteSummaryResult = Array.isArray(quoteSummaryRoot.result)
    ? quoteSummaryRoot.result
    : [];
  const quoteSummary = normalizeProviderRecord(quoteSummaryResult[0]);
  const assetProfile = normalizeProviderRecord(quoteSummary?.assetProfile);
  const summaryProfile = normalizeProviderRecord(quoteSummary?.summaryProfile);
  const price = normalizeProviderRecord(quoteSummary?.price);
  const quoteType = normalizeProviderRecord(quoteSummary?.quoteType);
  const sourceRecordedAt =
    isoTimestampFromUnixSeconds(price.regularMarketTime) ?? input.rawImport.importedAt;

  const { error } = await supabase.from("stock_company_profile").upsert(
    {
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      profile_date: now.slice(0, 10),
      company_name:
        cleanString(price.longName, 240) ||
        cleanString(summaryProfile.longBusinessSummary, 240) ||
        input.stock.companyName ||
        input.stock.symbol,
      short_name: cleanString(price.shortName, 240) || null,
      long_name: cleanString(price.longName, 240) || null,
      yahoo_symbol: input.stock.yahooSymbol,
      exchange: cleanString(price.exchangeName, 120) || input.stock.exchange,
      quote_type: cleanString(quoteType.quoteType, 120) || cleanString(price.quoteType, 120) || null,
      sector: cleanString(assetProfile.sector, 240) || null,
      industry: cleanString(assetProfile.industry, 240) || null,
      website_url: cleanString(assetProfile.website, 600) || null,
      long_business_summary:
        cleanString(assetProfile.longBusinessSummary, 6000) ||
        cleanString(summaryProfile.longBusinessSummary, 6000) ||
        null,
      country: cleanString(assetProfile.country, 120) || null,
      state_region: cleanString(assetProfile.state, 120) || null,
      city: cleanString(assetProfile.city, 120) || null,
      address1: cleanString(assetProfile.address1, 240) || null,
      phone: cleanString(assetProfile.phone, 120) || null,
      employee_count: safeNumber(assetProfile.fullTimeEmployees),
      officers_json: Array.isArray(assetProfile.companyOfficers)
        ? assetProfile.companyOfficers
        : [],
      raw_import_id: input.rawImport.id,
      raw_payload: input.payload,
      source_name: "yahoo_finance",
      source_url: input.rawImport.requestUrl,
      source_symbol: input.stock.yahooSymbol,
      source_recorded_at: sourceRecordedAt,
      imported_at: input.rawImport.importedAt,
      created_at: now,
      updated_at: now,
    },
    {
      onConflict: "stock_id,profile_date,source_name",
    },
  );

  if (error) {
    throw new Error(`Could not save stock_company_profile row. ${error.message}`);
  }
}

async function persistStockValuationSnapshots(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  payload: Record<string, unknown>;
  tradeDate: string;
}) {
  if (!input.stock.stockId) {
    return {
      valuationMetrics: buildFieldCoverageReport({
        bucketKey: "valuation_metrics",
        tableName: "stock_valuation_metrics",
        mappedFields: {},
      }),
      shareStatistics: buildFieldCoverageReport({
        bucketKey: "share_statistics",
        tableName: "stock_share_statistics",
        mappedFields: {},
      }),
      financialHighlights: buildFieldCoverageReport({
        bucketKey: "financial_highlights",
        tableName: "stock_financial_highlights",
        mappedFields: {},
      }),
    };
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const quoteSummaryRoot = normalizeProviderRecord(input.payload.quoteSummary);
  const quoteSummaryResult = Array.isArray(quoteSummaryRoot.result)
    ? quoteSummaryRoot.result
    : [];
  const quoteSummary = normalizeProviderRecord(quoteSummaryResult[0]);
  const summaryDetail = normalizeProviderRecord(quoteSummary?.summaryDetail);
  const defaultKeyStatistics = normalizeProviderRecord(quoteSummary?.defaultKeyStatistics);
  const financialData = normalizeProviderRecord(quoteSummary?.financialData);
  const price = normalizeProviderRecord(quoteSummary?.price);

  const valuationRow = {
    stock_id: input.stock.stockId,
    symbol: input.stock.symbol,
    trade_date: input.tradeDate,
    market_cap:
      extractYahooNumber(price.marketCap) ??
      extractYahooNumber(summaryDetail.marketCap),
    enterprise_value:
      extractYahooNumber(defaultKeyStatistics.enterpriseValue) ??
      extractYahooNumber(financialData.enterpriseValue),
    trailing_pe: extractYahooNumber(summaryDetail.trailingPE),
    forward_pe: extractYahooNumber(summaryDetail.forwardPE),
    peg_ratio: extractYahooNumber(defaultKeyStatistics.pegRatio),
    price_to_book: extractYahooNumber(defaultKeyStatistics.priceToBook),
    ev_to_revenue: extractYahooNumber(defaultKeyStatistics.enterpriseToRevenue),
    ev_to_ebitda: extractYahooNumber(defaultKeyStatistics.enterpriseToEbitda),
    trailing_eps: extractYahooNumber(defaultKeyStatistics.trailingEps),
    forward_eps: extractYahooNumber(defaultKeyStatistics.forwardEps),
    dividend_yield: extractYahooNumber(summaryDetail.dividendYield),
    raw_import_id: input.rawImport.id,
    raw_payload: input.payload,
    source_name: "yahoo_finance",
    source_url: input.rawImport.requestUrl,
    source_symbol: input.stock.yahooSymbol,
    source_recorded_at: input.rawImport.importedAt,
    imported_at: input.rawImport.importedAt,
    created_at: now,
    updated_at: now,
  };

  const valuationMappedFields = {
    market_cap: valuationRow.market_cap,
    enterprise_value: valuationRow.enterprise_value,
    trailing_pe: valuationRow.trailing_pe,
    forward_pe: valuationRow.forward_pe,
    peg_ratio: valuationRow.peg_ratio,
    price_to_book: valuationRow.price_to_book,
    ev_to_revenue: valuationRow.ev_to_revenue,
    ev_to_ebitda: valuationRow.ev_to_ebitda,
    trailing_eps: valuationRow.trailing_eps,
    forward_eps: valuationRow.forward_eps,
    dividend_yield: valuationRow.dividend_yield,
  };

  const shareStatsRow = {
    stock_id: input.stock.stockId,
    symbol: input.stock.symbol,
    trade_date: input.tradeDate,
    shares_outstanding: extractYahooNumber(defaultKeyStatistics.sharesOutstanding),
    float_shares: extractYahooNumber(defaultKeyStatistics.floatShares),
    implied_shares_outstanding: extractYahooNumber(defaultKeyStatistics.impliedSharesOutstanding),
    shares_short: extractYahooNumber(defaultKeyStatistics.sharesShort),
    shares_short_prior_month: extractYahooNumber(defaultKeyStatistics.sharesShortPriorMonth),
    shares_short_ratio: extractYahooNumber(defaultKeyStatistics.shortRatio),
    short_percent_float: extractYahooNumber(defaultKeyStatistics.shortPercentOfFloat),
    short_percent_shares_outstanding: extractYahooNumber(defaultKeyStatistics.sharesPercentSharesOut),
    held_percent_insiders: extractYahooNumber(defaultKeyStatistics.heldPercentInsiders),
    held_percent_institutions: extractYahooNumber(defaultKeyStatistics.heldPercentInstitutions),
    raw_import_id: input.rawImport.id,
    raw_payload: input.payload,
    source_name: "yahoo_finance",
    source_url: input.rawImport.requestUrl,
    source_symbol: input.stock.yahooSymbol,
    source_recorded_at: input.rawImport.importedAt,
    imported_at: input.rawImport.importedAt,
    created_at: now,
    updated_at: now,
  };

  const shareStatisticsMappedFields = {
    shares_outstanding: shareStatsRow.shares_outstanding,
    float_shares: shareStatsRow.float_shares,
    implied_shares_outstanding: shareStatsRow.implied_shares_outstanding,
    shares_short: shareStatsRow.shares_short,
    shares_short_prior_month: shareStatsRow.shares_short_prior_month,
    shares_short_ratio: shareStatsRow.shares_short_ratio,
    short_percent_float: shareStatsRow.short_percent_float,
    short_percent_shares_outstanding: shareStatsRow.short_percent_shares_outstanding,
    held_percent_insiders: shareStatsRow.held_percent_insiders,
    held_percent_institutions: shareStatsRow.held_percent_institutions,
  };

  const financialHighlightsRow = {
    stock_id: input.stock.stockId,
    symbol: input.stock.symbol,
    fiscal_date: input.tradeDate,
    period_type: "ttm",
    total_revenue: extractYahooNumber(financialData.totalRevenue),
    gross_profit: extractYahooNumber(financialData.grossProfits),
    ebitda: extractYahooNumber(financialData.ebitda),
    net_income_to_common: extractYahooNumber(defaultKeyStatistics.netIncomeToCommon),
    diluted_eps:
      extractYahooNumber(defaultKeyStatistics.trailingEps) ??
      extractYahooNumber(financialData.epsCurrentYear),
    operating_cash_flow: extractYahooNumber(financialData.operatingCashflow),
    free_cash_flow: extractYahooNumber(financialData.freeCashflow),
    total_cash: extractYahooNumber(financialData.totalCash),
    total_debt: extractYahooNumber(financialData.totalDebt),
    current_ratio: extractYahooNumber(financialData.currentRatio),
    book_value_per_share: extractYahooNumber(defaultKeyStatistics.bookValue),
    return_on_assets: extractYahooNumber(financialData.returnOnAssets),
    return_on_equity: extractYahooNumber(financialData.returnOnEquity),
    raw_import_id: input.rawImport.id,
    raw_payload: input.payload,
    source_name: "yahoo_finance",
    source_url: input.rawImport.requestUrl,
    source_symbol: input.stock.yahooSymbol,
    source_recorded_at: input.rawImport.importedAt,
    imported_at: input.rawImport.importedAt,
    created_at: now,
    updated_at: now,
  };

  const financialHighlightsMappedFields = {
    total_revenue: financialHighlightsRow.total_revenue,
    gross_profit: financialHighlightsRow.gross_profit,
    ebitda: financialHighlightsRow.ebitda,
    net_income_to_common: financialHighlightsRow.net_income_to_common,
    diluted_eps: financialHighlightsRow.diluted_eps,
    operating_cash_flow: financialHighlightsRow.operating_cash_flow,
    free_cash_flow: financialHighlightsRow.free_cash_flow,
    total_cash: financialHighlightsRow.total_cash,
    total_debt: financialHighlightsRow.total_debt,
    current_ratio: financialHighlightsRow.current_ratio,
    book_value_per_share: financialHighlightsRow.book_value_per_share,
    return_on_assets: financialHighlightsRow.return_on_assets,
    return_on_equity: financialHighlightsRow.return_on_equity,
  };

  const [valuationResult, shareStatsResult, highlightsResult] = await Promise.all([
    supabase
      .from("stock_valuation_metrics")
      .upsert(valuationRow, { onConflict: "stock_id,trade_date,source_name" }),
    supabase
      .from("stock_share_statistics")
      .upsert(shareStatsRow, { onConflict: "stock_id,trade_date,source_name" }),
    supabase
      .from("stock_financial_highlights")
      .upsert(financialHighlightsRow, {
        onConflict: "stock_id,fiscal_date,period_type,source_name",
      }),
  ]);

  const failure = valuationResult.error ?? shareStatsResult.error ?? highlightsResult.error;
  if (failure) {
    throw new Error(`Could not save Yahoo valuation/statistics rows. ${failure.message}`);
  }

  return {
    valuationMetrics: buildFieldCoverageReport({
      bucketKey: "valuation_metrics",
      tableName: "stock_valuation_metrics",
      mappedFields: valuationMappedFields,
    }),
    shareStatistics: buildFieldCoverageReport({
      bucketKey: "share_statistics",
      tableName: "stock_share_statistics",
      mappedFields: shareStatisticsMappedFields,
    }),
    financialHighlights: buildFieldCoverageReport({
      bucketKey: "financial_highlights",
      tableName: "stock_financial_highlights",
      mappedFields: financialHighlightsMappedFields,
    }),
  };
}

async function persistYahooFinancialStatements(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  payload: Record<string, unknown>;
}) {
  if (!input.stock.stockId) {
    const emptyReport = (bucketKey: string, tableName: string) =>
      buildFieldCoverageReport({ bucketKey, tableName, mappedFields: {} });
    return {
      reports: {
        incomeStatementAnnual: emptyReport(
          "income_statement_annual",
          "stock_income_statement",
        ),
        incomeStatementQuarterly: emptyReport(
          "income_statement_quarterly",
          "stock_income_statement",
        ),
        balanceSheetAnnual: emptyReport(
          "balance_sheet_annual",
          "stock_balance_sheet",
        ),
        balanceSheetQuarterly: emptyReport(
          "balance_sheet_quarterly",
          "stock_balance_sheet",
        ),
        cashFlowAnnual: emptyReport("cash_flow_annual", "stock_cash_flow"),
        cashFlowQuarterly: emptyReport("cash_flow_quarterly", "stock_cash_flow"),
      },
      rowCounts: {
        incomeStatementAnnual: 0,
        incomeStatementQuarterly: 0,
        balanceSheetAnnual: 0,
        balanceSheetQuarterly: 0,
        cashFlowAnnual: 0,
        cashFlowQuarterly: 0,
      },
      rawSourceCounts: {
        incomeStatementAnnual: 0,
        incomeStatementQuarterly: 0,
        balanceSheetAnnual: 0,
        balanceSheetQuarterly: 0,
        cashFlowAnnual: 0,
        cashFlowQuarterly: 0,
      },
      latestFiscalDates: {
        incomeStatementAnnual: null,
        incomeStatementQuarterly: null,
        balanceSheetAnnual: null,
        balanceSheetQuarterly: null,
        cashFlowAnnual: null,
        cashFlowQuarterly: null,
      },
    } satisfies FinancialStatementsPersistResult;
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const quoteSummaryRoot = normalizeProviderRecord(input.payload.quoteSummary);
  const quoteSummaryResult = Array.isArray(quoteSummaryRoot.result)
    ? quoteSummaryRoot.result
    : [];
  const quoteSummary = normalizeProviderRecord(quoteSummaryResult[0]);

  const incomeAnnualSource = extractStatementRecords(quoteSummary.incomeStatementHistory, [
    "incomeStatementHistory",
    "incomeStatementStatements",
  ]);
  const incomeQuarterlySource = extractStatementRecords(
    quoteSummary.incomeStatementHistoryQuarterly,
    ["incomeStatementHistory", "incomeStatementStatements"],
  );
  const balanceAnnualSource = extractStatementRecords(quoteSummary.balanceSheetHistory, [
    "balanceSheetStatements",
    "balanceSheetHistory",
  ]);
  const balanceQuarterlySource = extractStatementRecords(
    quoteSummary.balanceSheetHistoryQuarterly,
    ["balanceSheetStatements", "balanceSheetHistory"],
  );
  const cashAnnualSource = extractStatementRecords(quoteSummary.cashflowStatementHistory, [
    "cashflowStatements",
    "cashFlowStatements",
  ]);
  const cashQuarterlySource = extractStatementRecords(
    quoteSummary.cashflowStatementHistoryQuarterly,
    ["cashflowStatements", "cashFlowStatements"],
  );

  const mapIncomeRows = (rows: Array<Record<string, unknown>>, periodType: "annual" | "quarterly") =>
    rows
      .map((row) => {
        const fiscalDate =
          extractYahooDate(row.endDate) ??
          extractYahooDate(row.asOfDate) ??
          extractYahooDate(row.fiscalDateEnding) ??
          null;

        if (!fiscalDate) {
          return null;
        }

        const mappedFields = {
          currency_code: firstYahooString(row, ["currencyCode"]) || "INR",
          total_revenue: firstYahooNumber(row, ["totalRevenue"]),
          cost_of_revenue: firstYahooNumber(row, ["costOfRevenue"]),
          gross_profit: firstYahooNumber(row, ["grossProfit"]),
          operating_expense: firstYahooNumber(row, [
            "totalOperatingExpenses",
            "operatingExpense",
          ]),
          operating_income: firstYahooNumber(row, ["operatingIncome"]),
          interest_expense: firstYahooNumber(row, ["interestExpense"]),
          pretax_income: firstYahooNumber(row, ["incomeBeforeTax", "pretaxIncome"]),
          income_tax_expense: firstYahooNumber(row, ["incomeTaxExpense"]),
          net_income: firstYahooNumber(row, ["netIncome"]),
          net_income_common: firstYahooNumber(row, [
            "netIncomeApplicableToCommonShares",
            "netIncomeCommonStockholders",
          ]),
          basic_eps: firstYahooNumber(row, ["basicEPS"]),
          diluted_eps: firstYahooNumber(row, ["dilutedEPS"]),
          ebitda: firstYahooNumber(row, ["ebitda"]),
        };

        return {
          dbRow: {
            stock_id: input.stock.stockId,
            symbol: input.stock.symbol,
            fiscal_date: fiscalDate,
            period_type: periodType,
            currency_code: mappedFields.currency_code,
            total_revenue: mappedFields.total_revenue,
            cost_of_revenue: mappedFields.cost_of_revenue,
            gross_profit: mappedFields.gross_profit,
            operating_expense: mappedFields.operating_expense,
            operating_income: mappedFields.operating_income,
            interest_expense: mappedFields.interest_expense,
            pretax_income: mappedFields.pretax_income,
            income_tax_expense: mappedFields.income_tax_expense,
            net_income: mappedFields.net_income,
            net_income_common: mappedFields.net_income_common,
            basic_eps: mappedFields.basic_eps,
            diluted_eps: mappedFields.diluted_eps,
            ebitda: mappedFields.ebitda,
            raw_import_id: input.rawImport.id,
            raw_payload: row,
            source_name: "yahoo_finance",
            source_url: input.rawImport.requestUrl,
            source_symbol: input.stock.yahooSymbol,
            source_recorded_at: input.rawImport.importedAt,
            imported_at: input.rawImport.importedAt,
            created_at: now,
            updated_at: now,
          },
          coverage: {
            fiscalDate,
            mappedFields,
          },
        };
      })
      .filter(Boolean) as Array<{
      dbRow: Record<string, unknown>;
      coverage: StatementRowCoverageInput;
    }>;

  const mapBalanceRows = (rows: Array<Record<string, unknown>>, periodType: "annual" | "quarterly") =>
    rows
      .map((row) => {
        const fiscalDate =
          extractYahooDate(row.endDate) ??
          extractYahooDate(row.asOfDate) ??
          extractYahooDate(row.fiscalDateEnding) ??
          null;

        if (!fiscalDate) {
          return null;
        }

        const mappedFields = {
          currency_code: firstYahooString(row, ["currencyCode"]) || "INR",
          total_assets: firstYahooNumber(row, ["totalAssets"]),
          total_liabilities: firstYahooNumber(row, [
            "totalLiab",
            "totalLiabilitiesNetMinorityInterest",
          ]),
          stockholders_equity: firstYahooNumber(row, [
            "totalStockholderEquity",
            "stockholdersEquity",
          ]),
          current_assets: firstYahooNumber(row, ["totalCurrentAssets"]),
          current_liabilities: firstYahooNumber(row, ["totalCurrentLiabilities"]),
          cash_and_equivalents: firstYahooNumber(row, [
            "cash",
            "cashAndCashEquivalents",
            "cashAndShortTermInvestments",
          ]),
          inventory: firstYahooNumber(row, ["inventory"]),
          receivables: firstYahooNumber(row, ["netReceivables", "accountsReceivable"]),
          payables: firstYahooNumber(row, ["accountsPayable"]),
          short_term_debt: firstYahooNumber(row, [
            "shortLongTermDebt",
            "shortTermDebt",
          ]),
          long_term_debt: firstYahooNumber(row, [
            "longTermDebt",
            "longTermDebtAndCapitalLeaseObligation",
          ]),
          net_debt: firstYahooNumber(row, ["netDebt"]),
        };

        return {
          dbRow: {
            stock_id: input.stock.stockId,
            symbol: input.stock.symbol,
            fiscal_date: fiscalDate,
            period_type: periodType,
            currency_code: mappedFields.currency_code,
            total_assets: mappedFields.total_assets,
            total_liabilities: mappedFields.total_liabilities,
            stockholders_equity: mappedFields.stockholders_equity,
            current_assets: mappedFields.current_assets,
            current_liabilities: mappedFields.current_liabilities,
            cash_and_equivalents: mappedFields.cash_and_equivalents,
            inventory: mappedFields.inventory,
            receivables: mappedFields.receivables,
            payables: mappedFields.payables,
            short_term_debt: mappedFields.short_term_debt,
            long_term_debt: mappedFields.long_term_debt,
            net_debt: mappedFields.net_debt,
            raw_import_id: input.rawImport.id,
            raw_payload: row,
            source_name: "yahoo_finance",
            source_url: input.rawImport.requestUrl,
            source_symbol: input.stock.yahooSymbol,
            source_recorded_at: input.rawImport.importedAt,
            imported_at: input.rawImport.importedAt,
            created_at: now,
            updated_at: now,
          },
          coverage: {
            fiscalDate,
            mappedFields,
          },
        };
      })
      .filter(Boolean) as Array<{
      dbRow: Record<string, unknown>;
      coverage: StatementRowCoverageInput;
    }>;

  const mapCashFlowRows = (rows: Array<Record<string, unknown>>, periodType: "annual" | "quarterly") =>
    rows
      .map((row) => {
        const fiscalDate =
          extractYahooDate(row.endDate) ??
          extractYahooDate(row.asOfDate) ??
          extractYahooDate(row.fiscalDateEnding) ??
          null;

        if (!fiscalDate) {
          return null;
        }

        const mappedFields = {
          currency_code: firstYahooString(row, ["currencyCode"]) || "INR",
          operating_cash_flow: firstYahooNumber(row, [
            "totalCashFromOperatingActivities",
            "operatingCashflow",
          ]),
          investing_cash_flow: firstYahooNumber(row, [
            "totalCashflowsFromInvestingActivities",
            "cashflowFromInvestment",
          ]),
          financing_cash_flow: firstYahooNumber(row, [
            "totalCashFromFinancingActivities",
            "cashflowFromFinancing",
          ]),
          capital_expenditure: firstYahooNumber(row, [
            "capitalExpenditures",
            "investments",
          ]),
          free_cash_flow: firstYahooNumber(row, ["freeCashFlow"]),
          dividends_paid: firstYahooNumber(row, ["dividendsPaid"]),
          stock_based_compensation: firstYahooNumber(row, ["stockBasedCompensation"]),
          depreciation_amortization: firstYahooNumber(row, [
            "depreciation",
            "depreciationAndAmortization",
          ]),
          beginning_cash_position: firstYahooNumber(row, ["beginningCashPosition"]),
          end_cash_position: firstYahooNumber(row, ["endCashPosition"]),
        };

        return {
          dbRow: {
            stock_id: input.stock.stockId,
            symbol: input.stock.symbol,
            fiscal_date: fiscalDate,
            period_type: periodType,
            currency_code: mappedFields.currency_code,
            operating_cash_flow: mappedFields.operating_cash_flow,
            investing_cash_flow: mappedFields.investing_cash_flow,
            financing_cash_flow: mappedFields.financing_cash_flow,
            capital_expenditure: mappedFields.capital_expenditure,
            free_cash_flow: mappedFields.free_cash_flow,
            dividends_paid: mappedFields.dividends_paid,
            stock_based_compensation: mappedFields.stock_based_compensation,
            depreciation_amortization: mappedFields.depreciation_amortization,
            beginning_cash_position: mappedFields.beginning_cash_position,
            end_cash_position: mappedFields.end_cash_position,
            raw_import_id: input.rawImport.id,
            raw_payload: row,
            source_name: "yahoo_finance",
            source_url: input.rawImport.requestUrl,
            source_symbol: input.stock.yahooSymbol,
            source_recorded_at: input.rawImport.importedAt,
            imported_at: input.rawImport.importedAt,
            created_at: now,
            updated_at: now,
          },
          coverage: {
            fiscalDate,
            mappedFields,
          },
        };
      })
      .filter(Boolean) as Array<{
      dbRow: Record<string, unknown>;
      coverage: StatementRowCoverageInput;
    }>;

  const incomeAnnual = mapIncomeRows(incomeAnnualSource, "annual");
  const incomeQuarterly = mapIncomeRows(incomeQuarterlySource, "quarterly");
  const balanceAnnual = mapBalanceRows(balanceAnnualSource, "annual");
  const balanceQuarterly = mapBalanceRows(balanceQuarterlySource, "quarterly");
  const cashAnnual = mapCashFlowRows(cashAnnualSource, "annual");
  const cashQuarterly = mapCashFlowRows(cashQuarterlySource, "quarterly");

  const writes = [];
  if (incomeAnnual.length || incomeQuarterly.length) {
    writes.push(
      supabase.from("stock_income_statement").upsert(
        [...incomeAnnual, ...incomeQuarterly].map((item) => item.dbRow),
        { onConflict: "stock_id,fiscal_date,period_type,source_name" },
      ),
    );
  }
  if (balanceAnnual.length || balanceQuarterly.length) {
    writes.push(
      supabase.from("stock_balance_sheet").upsert(
        [...balanceAnnual, ...balanceQuarterly].map((item) => item.dbRow),
        { onConflict: "stock_id,fiscal_date,period_type,source_name" },
      ),
    );
  }
  if (cashAnnual.length || cashQuarterly.length) {
    writes.push(
      supabase.from("stock_cash_flow").upsert(
        [...cashAnnual, ...cashQuarterly].map((item) => item.dbRow),
        { onConflict: "stock_id,fiscal_date,period_type,source_name" },
      ),
    );
  }

  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`Could not save Yahoo financial statement rows. ${failed.error.message}`);
  }

  const reports = {
    incomeStatementAnnual: buildMultiRowFieldCoverageReport({
      bucketKey: "income_statement_annual",
      tableName: "stock_income_statement",
      rows: incomeAnnual.map((item) => item.coverage),
    }),
    incomeStatementQuarterly: buildMultiRowFieldCoverageReport({
      bucketKey: "income_statement_quarterly",
      tableName: "stock_income_statement",
      rows: incomeQuarterly.map((item) => item.coverage),
    }),
    balanceSheetAnnual: buildMultiRowFieldCoverageReport({
      bucketKey: "balance_sheet_annual",
      tableName: "stock_balance_sheet",
      rows: balanceAnnual.map((item) => item.coverage),
    }),
    balanceSheetQuarterly: buildMultiRowFieldCoverageReport({
      bucketKey: "balance_sheet_quarterly",
      tableName: "stock_balance_sheet",
      rows: balanceQuarterly.map((item) => item.coverage),
    }),
    cashFlowAnnual: buildMultiRowFieldCoverageReport({
      bucketKey: "cash_flow_annual",
      tableName: "stock_cash_flow",
      rows: cashAnnual.map((item) => item.coverage),
    }),
    cashFlowQuarterly: buildMultiRowFieldCoverageReport({
      bucketKey: "cash_flow_quarterly",
      tableName: "stock_cash_flow",
      rows: cashQuarterly.map((item) => item.coverage),
    }),
  };

  const latestFiscalDate = (rows: Array<{ coverage: StatementRowCoverageInput }>) =>
    rows.length
      ? rows
          .map((item) => item.coverage.fiscalDate)
          .sort((left, right) => right.localeCompare(left))[0] ?? null
      : null;

  return {
    reports,
    rowCounts: {
      incomeStatementAnnual: incomeAnnual.length,
      incomeStatementQuarterly: incomeQuarterly.length,
      balanceSheetAnnual: balanceAnnual.length,
      balanceSheetQuarterly: balanceQuarterly.length,
      cashFlowAnnual: cashAnnual.length,
      cashFlowQuarterly: cashQuarterly.length,
    },
    rawSourceCounts: {
      incomeStatementAnnual: incomeAnnualSource.length,
      incomeStatementQuarterly: incomeQuarterlySource.length,
      balanceSheetAnnual: balanceAnnualSource.length,
      balanceSheetQuarterly: balanceQuarterlySource.length,
      cashFlowAnnual: cashAnnualSource.length,
      cashFlowQuarterly: cashQuarterlySource.length,
    },
    latestFiscalDates: {
      incomeStatementAnnual: latestFiscalDate(incomeAnnual),
      incomeStatementQuarterly: latestFiscalDate(incomeQuarterly),
      balanceSheetAnnual: latestFiscalDate(balanceAnnual),
      balanceSheetQuarterly: latestFiscalDate(balanceQuarterly),
      cashFlowAnnual: latestFiscalDate(cashAnnual),
      cashFlowQuarterly: latestFiscalDate(cashQuarterly),
    },
  } satisfies FinancialStatementsPersistResult;
}

async function persistStockMarketSnapshot(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  payload: Record<string, unknown>;
  refreshExistingToday?: boolean;
}) {
  if (!input.stock.stockId) {
    return {
      tradeDate: null,
      snapshotAt: null,
      price: null,
      report: buildFieldCoverageReport({
        bucketKey: "latest_market_snapshot",
        tableName: "stock_market_snapshot",
        mappedFields: {},
      }),
    };
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const quoteResponse = normalizeProviderRecord(input.payload.quoteResponse);
  const quoteResult = Array.isArray(quoteResponse.result) ? quoteResponse.result : [];
  const quote = normalizeProviderRecord(quoteResult[0]);
  const snapshotAt =
    isoTimestampFromUnixSeconds(quote.regularMarketTime) ?? input.rawImport.importedAt;
  const tradeDate =
    isoDateFromUnixSeconds(quote.regularMarketTime) ?? snapshotAt.slice(0, 10);
  const existingSnapshotForDate = await loadExistingSnapshotForTradeDate({
    stockId: input.stock.stockId,
    tradeDate,
  });
  const effectiveSnapshotAt =
    input.refreshExistingToday && existingSnapshotForDate
      ? cleanString(existingSnapshotForDate.snapshot_at, 120) || snapshotAt
      : snapshotAt;
  const snapshotRow = {
    stock_id: input.stock.stockId,
    symbol: input.stock.symbol,
    trade_date: tradeDate,
    snapshot_at: effectiveSnapshotAt,
    currency_code: cleanString(quote.currency, 20) || "INR",
    market_state: cleanString(quote.marketState, 120) || null,
    price: extractYahooNumber(quote.regularMarketPrice),
    previous_close: extractYahooNumber(quote.regularMarketPreviousClose),
    open: extractYahooNumber(quote.regularMarketOpen),
    day_high: extractYahooNumber(quote.regularMarketDayHigh),
    day_low: extractYahooNumber(quote.regularMarketDayLow),
    change_absolute: extractYahooNumber(quote.regularMarketChange),
    change_percent: extractYahooNumber(quote.regularMarketChangePercent),
    volume: extractYahooNumber(quote.regularMarketVolume),
    market_cap: extractYahooNumber(quote.marketCap),
    raw_import_id: input.rawImport.id,
    raw_payload: input.payload,
    source_name: "yahoo_finance",
    source_url: input.rawImport.requestUrl,
    source_symbol: input.stock.yahooSymbol,
    source_recorded_at: snapshotAt,
    imported_at: input.rawImport.importedAt,
    created_at: now,
    updated_at: now,
  };

  const report = buildFieldCoverageReport({
    bucketKey: "latest_market_snapshot",
    tableName: "stock_market_snapshot",
    mappedFields: {
      currency_code: snapshotRow.currency_code,
      market_state: snapshotRow.market_state,
      price: snapshotRow.price,
      previous_close: snapshotRow.previous_close,
      open: snapshotRow.open,
      day_high: snapshotRow.day_high,
      day_low: snapshotRow.day_low,
      change_absolute: snapshotRow.change_absolute,
      change_percent: snapshotRow.change_percent,
      volume: snapshotRow.volume,
      market_cap: snapshotRow.market_cap,
    },
  });

  const { error } = await supabase.from("stock_market_snapshot").upsert(
    snapshotRow,
    { onConflict: "stock_id,snapshot_at,source_name" },
  );

  if (error) {
    throw new Error(`Could not save stock_market_snapshot row. ${error.message}`);
  }

  return {
    tradeDate,
    snapshotAt: effectiveSnapshotAt,
    price: snapshotRow.price,
    report,
  };
}

async function persistTypedHistoricalRows(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  rows: Array<{
    tradeDate: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number | null;
    volume: number | null;
  }>;
}) {
  if (!input.stock.stockId || !input.rows.length) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const payloadRows = input.rows.map((row) => ({
    stock_id: input.stock.stockId,
    symbol: input.stock.symbol,
    trade_date: row.tradeDate,
    interval_type: "1d",
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    adj_close: row.adjClose,
    volume: row.volume,
    currency_code: "INR",
    raw_import_id: input.rawImport.id,
    raw_payload: row,
    source_name: "yahoo_finance",
    source_url: input.rawImport.requestUrl,
    source_symbol: input.stock.yahooSymbol,
    source_recorded_at: input.rawImport.importedAt,
    imported_at: input.rawImport.importedAt,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("stock_price_history")
    .upsert(payloadRows, { onConflict: "stock_id,interval_type,trade_date,source_name" });

  if (error) {
    throw new Error(`Could not save stock_price_history rows. ${error.message}`);
  }
}

async function persistHistoricalImportCoverage(input: {
  stock: YahooResolvedStockTarget;
  jobId: string;
  period: string;
  interval: "1d";
  rawImportId: string | null;
  sourceUrl: string | null;
  sourceRecordedAt: string | null;
  coverageStatus: "current" | "partial" | "error";
  coverage: YahooHistoricalCoverageSummary;
  warningCount: number;
  errorCount: number;
  coverageNotes: string;
}) {
  if (!input.stock.stockId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const importedAt = new Date().toISOString();
  const { error } = await supabase.from("stock_import_coverage").upsert(
    {
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      bucket_key: "historical_prices",
      coverage_status: input.coverageStatus,
      latest_trade_date: input.coverage.lastAvailableDate,
      latest_fiscal_date: null,
      latest_imported_at: importedAt,
      rows_available: input.coverage.totalRowsAvailable,
      rows_imported: input.coverage.totalRowsImported,
      row_count: input.coverage.totalRowsRetained,
      warning_count: input.warningCount,
      error_count: input.errorCount,
      coverage_notes: input.coverageNotes,
      metadata: {
        jobId: input.jobId,
        rawImportId: input.rawImportId,
        stockSlug: input.stock.slug,
        yahooSymbol: input.stock.yahooSymbol,
        sourceName: "yahoo_finance",
        sourceUrl: input.sourceUrl,
        sourceRecordedAt: input.sourceRecordedAt,
        period: input.period,
        interval: input.interval,
        firstAvailableDate: input.coverage.firstAvailableDate,
        lastAvailableDate: input.coverage.lastAvailableDate,
        totalRowsAvailable: input.coverage.totalRowsAvailable,
        totalRowsImported: input.coverage.totalRowsImported,
        totalRowsRetained: input.coverage.totalRowsRetained,
        missingDatesCount: input.coverage.missingDatesCount,
        completionPercentage: input.coverage.completionPercentage,
      },
      imported_at: importedAt,
      created_at: importedAt,
      updated_at: importedAt,
    },
    { onConflict: "stock_id,bucket_key" },
  );

  if (error) {
    throw new Error(`Could not save stock_import_coverage row. ${error.message}`);
  }
}

async function persistFieldCoverageReport(input: {
  stock: YahooResolvedStockTarget;
  jobId: string;
  bucketKey: string;
  report: YahooFieldCoverageReport;
  rawImportId: string | null;
  sourceUrl: string | null;
  sourceRecordedAt: string | null;
  latestTradeDate?: string | null;
  latestFiscalDate?: string | null;
  notes: string;
  rowCount?: number | null;
  rowsAvailable?: number | null;
  rowsImported?: number | null;
  metadata?: Record<string, unknown>;
}) {
  if (!input.stock.stockId) {
    return;
  }

  const importedAt = new Date().toISOString();
  const coverageStatus: "missing" | "partial" | "current" =
    input.report.filledFields <= 0
      ? "missing"
      : input.report.missingFields > 0
        ? "partial"
        : "current";

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("stock_import_coverage").upsert(
    {
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      bucket_key: input.bucketKey,
      coverage_status: coverageStatus,
      latest_trade_date: cleanString(input.latestTradeDate, 40) || null,
      latest_fiscal_date: cleanString(input.latestFiscalDate, 40) || null,
      latest_imported_at: importedAt,
      rows_available: input.rowsAvailable ?? input.report.totalMappedFields,
      rows_imported: input.rowsImported ?? input.report.filledFields,
      row_count: input.rowCount ?? input.report.totalMappedFields,
      warning_count: input.report.missingFields,
      error_count: 0,
      coverage_notes: input.notes,
      metadata: {
        jobId: input.jobId,
        rawImportId: input.rawImportId,
        stockSlug: input.stock.slug,
        yahooSymbol: input.stock.yahooSymbol,
        sourceName: "yahoo_finance",
        sourceUrl: input.sourceUrl,
        sourceRecordedAt: input.sourceRecordedAt,
        totalMappedFields: input.report.totalMappedFields,
        filledFields: input.report.filledFields,
        missingFields: input.report.missingFields,
        fillPercentage: input.report.fillPercentage,
        filledFieldKeys: input.report.filledFieldKeys,
        missingFieldKeys: input.report.missingFieldKeys,
        ...(input.metadata ?? {}),
      },
      imported_at: importedAt,
      created_at: importedAt,
      updated_at: importedAt,
    },
    { onConflict: "stock_id,bucket_key" },
  );

  if (error) {
    throw new Error(`Could not save stock_import_coverage field report row. ${error.message}`);
  }
}

async function persistYahooHistoricalDailyRows(input: {
  jobId: string;
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  rows: HistoricalPricePersistRow[];
  duplicateMode: "replace_matching_dates" | "skip_existing_dates";
  force?: boolean;
}) {
  if (!input.stock.stockId) {
    throw new Error(
      `Yahoo historical import requires a mapped stock_id for "${input.stock.yahooSymbol}".`,
    );
  }
  const stockId = input.stock.stockId;

  const sourceRowCount = input.rows.length;
  const dedupedRows = dedupeHistoricalRowsByTradeDate(input.rows);
  const duplicatePayloadRowsRemoved = Math.max(0, sourceRowCount - dedupedRows.length);
  if (!dedupedRows.length) {
    return {
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      totalProcessedRows: 0,
      effectiveDuplicateMode:
        input.force === true ? input.duplicateMode : "skip_existing_dates",
      coverage: {
        firstAvailableDate: null,
        lastAvailableDate: null,
        totalRowsAvailable: 0,
        totalRowsImported: 0,
        totalRowsRetained: 0,
        missingDatesCount: 0,
        completionPercentage: 0,
      } satisfies YahooHistoricalCoverageSummary,
    };
  }

  const supabase = createSupabaseAdminClient();
  const importedAt = new Date().toISOString();
  const firstAvailableDate = dedupedRows[0]?.tradeDate ?? null;
  const lastAvailableDate = dedupedRows[dedupedRows.length - 1]?.tradeDate ?? null;

  const existingDates = await loadExistingHistoricalTradeDatesInRange({
    stockId,
    startDate: firstAvailableDate,
    endDate: lastAvailableDate,
  });

  const payloadRows = dedupedRows.map((row) => ({
    stock_id: stockId,
    symbol: input.stock.symbol,
    trade_date: row.tradeDate,
    interval_type: "1d",
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    adj_close: row.adjClose,
    volume: row.volume,
    currency_code: "INR",
    raw_import_id: input.rawImport.id,
    raw_payload: row,
    source_name: "yahoo_finance",
    source_url: input.rawImport.requestUrl,
    source_symbol: input.stock.yahooSymbol,
    source_recorded_at: input.rawImport.importedAt,
    imported_at: input.rawImport.importedAt,
    created_at: importedAt,
    updated_at: importedAt,
  }));

  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = duplicatePayloadRowsRemoved;
  const existingMatches = payloadRows.filter((row) => existingDates.has(row.trade_date)).length;
  insertedRows = payloadRows.length - existingMatches;
  const effectiveDuplicateMode =
    input.force === true ? input.duplicateMode : "skip_existing_dates";
  const writeBatchSize = getYahooHistoricalWriteBatchSize();
  const maxRetries = getYahooHistoricalWriteMaxRetries();

  async function writeHistoricalBatch(
    rowBatch: typeof payloadRows,
    batchIndex: number,
    totalBatches: number,
    mode: "insert" | "upsert",
  ) {
    let attempt = 0;
    let activeBatch = rowBatch;
    let skippedExistingInBatch = 0;

    while (true) {
      attempt += 1;

      try {
        if (activeBatch.length === 0) {
          return {
            skippedExistingInBatch,
          };
        }

        if (mode === "insert") {
          const { error } = await supabase.from("stock_price_history").insert(activeBatch);
          if (error) {
            throw new Error(`Could not insert stock_price_history rows. ${error.message}`);
          }
        } else {
          const { error } = await supabase
            .from("stock_price_history")
            .upsert(activeBatch, {
              onConflict: "stock_id,interval_type,trade_date,source_name",
            });
          if (error) {
            throw new Error(`Could not upsert stock_price_history rows. ${error.message}`);
          }
        }

        return {
          skippedExistingInBatch,
        };
      } catch (error) {
        if (mode === "insert" && isDuplicateHistoricalWriteError(error)) {
          const activeBatchTradeDates = activeBatch.map((row) => row.trade_date).filter(Boolean);
          const duplicateFilteredExistingDates = await loadExistingHistoricalTradeDatesInRange({
            stockId,
            startDate: activeBatchTradeDates[0] ?? firstAvailableDate,
            endDate:
              activeBatchTradeDates[activeBatchTradeDates.length - 1] ?? lastAvailableDate,
          });
          const retryBatch = activeBatch.filter(
            (row) => !duplicateFilteredExistingDates.has(row.trade_date),
          );
          const duplicateSkips = activeBatch.length - retryBatch.length;
          skippedExistingInBatch += duplicateSkips;
          activeBatch = retryBatch;

          if (duplicateSkips > 0) {
            await safeSaveStockImportActivity({
              jobId: input.jobId,
              stock: input.stock,
              yahooSymbol: input.stock.yahooSymbol,
              moduleName: "historical_prices",
              stepName: "skipped_existing_history_rows",
              status: "warning",
              message: `Skipped ${duplicateSkips} existing historical row${duplicateSkips === 1 ? "" : "s"} from batch ${batchIndex}/${totalBatches} for ${input.stock.symbol} after duplicate-key protection.`,
              rowsFetched: activeBatch.length + duplicateSkips,
              rowsInserted: 0,
              rowsUpdated: 0,
              rowsSkipped: duplicateSkips,
              startedAt: input.rawImport.importedAt,
              completedAt: new Date().toISOString(),
              affectedTable: "stock_price_history",
              errorMessage: error instanceof Error ? error.message : cleanString(error, 4000),
              metadata: {
                rawImportId: input.rawImport.id,
                writeMode: mode,
                batchIndex,
                totalBatches,
                duplicateSkips,
                tradeDateStart: activeBatchTradeDates[0] ?? null,
                tradeDateEnd: activeBatchTradeDates[activeBatchTradeDates.length - 1] ?? null,
              },
            });
          }

          if (activeBatch.length === 0) {
            return {
              skippedExistingInBatch,
            };
          }

          continue;
        }

        const retriable = isRetriableHistoricalWriteError(error);
        const exhausted = attempt > maxRetries;
        const message =
          error instanceof Error
            ? error.message
            : `Unknown stock_price_history ${mode} batch failure.`;

        await safeSaveStockImportActivity({
          jobId: input.jobId,
          stock: input.stock,
          yahooSymbol: input.stock.yahooSymbol,
          moduleName: "historical_prices",
          stepName: "write_batch_failed",
          status: exhausted || !retriable ? "failed" : "warning",
          message: exhausted || !retriable
            ? `Historical ${mode} batch ${batchIndex}/${totalBatches} failed for ${input.stock.symbol}.`
            : `Historical ${mode} batch ${batchIndex}/${totalBatches} timed out for ${input.stock.symbol}; retrying.`,
          rowsFetched: activeBatch.length,
          rowsInserted: mode === "insert" ? 0 : null,
          rowsUpdated: mode === "upsert" ? 0 : null,
          rowsSkipped: 0,
          startedAt: input.rawImport.importedAt,
          completedAt: new Date().toISOString(),
          affectedTable: "stock_price_history",
          errorMessage: message,
          metadata: {
            rawImportId: input.rawImport.id,
            writeMode: mode,
            batchIndex,
            totalBatches,
            batchSize: activeBatch.length,
            attempt,
            maxRetries,
            retriable,
            tradeDateStart: activeBatch[0]?.trade_date ?? null,
            tradeDateEnd: activeBatch[activeBatch.length - 1]?.trade_date ?? null,
          },
        });

        if (!retriable || exhausted) {
          throw error;
        }

        await delayMs(getYahooHistoricalWriteRetryBackoffMs(attempt));
      }
    }
  }

  if (duplicatePayloadRowsRemoved > 0) {
    await safeSaveStockImportActivity({
      jobId: input.jobId,
      stock: input.stock,
      yahooSymbol: input.stock.yahooSymbol,
      moduleName: "historical_prices",
      stepName: "duplicate_payload_deduped",
      status: "warning",
      message: `Deduped ${duplicatePayloadRowsRemoved} duplicate historical payload row${duplicatePayloadRowsRemoved === 1 ? "" : "s"} for ${input.stock.symbol} before saving.`,
      rowsFetched: sourceRowCount,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: duplicatePayloadRowsRemoved,
      startedAt: input.rawImport.importedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "stock_price_history",
      metadata: {
        rawImportId: input.rawImport.id,
        sourceRowCount,
        dedupedRowCount: dedupedRows.length,
        duplicatePayloadRowsRemoved,
        duplicate_detected_count: duplicatePayloadRowsRemoved,
      },
    });
  }

  if (effectiveDuplicateMode === "skip_existing_dates") {
    const newRows = payloadRows.filter((row) => !existingDates.has(row.trade_date));
    skippedRows += existingMatches;
    const rowBatches = chunkArray(newRows, writeBatchSize);
    for (const [index, rowBatch] of rowBatches.entries()) {
      if (rowBatch.length === 0) {
        continue;
      }
      const batchResult = await writeHistoricalBatch(rowBatch, index + 1, rowBatches.length, "insert");
      skippedRows += batchResult.skippedExistingInBatch;
      insertedRows -= batchResult.skippedExistingInBatch;
    }

    if (skippedRows > 0) {
      await safeSaveStockImportActivity({
        jobId: input.jobId,
        stock: input.stock,
        yahooSymbol: input.stock.yahooSymbol,
        moduleName: "historical_prices",
        stepName: "skipped_existing_history_rows",
        status: "completed",
        message: `Skipped ${skippedRows} existing historical row${skippedRows === 1 ? "" : "s"} for ${input.stock.symbol}.`,
        rowsFetched: payloadRows.length,
        rowsInserted: insertedRows,
        rowsUpdated: 0,
        rowsSkipped: skippedRows,
        startedAt: input.rawImport.importedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "stock_price_history",
        metadata: {
          rawImportId: input.rawImport.id,
          existingMatches,
          duplicatePayloadRowsRemoved,
          effectiveDuplicateMode,
          inserted_count: insertedRows,
          updated_count: 0,
          skipped_existing_count: skippedRows,
          duplicate_detected_count: duplicatePayloadRowsRemoved,
        },
      });
    }
  } else {
    updatedRows = existingMatches;
    const rowBatches = chunkArray(payloadRows, writeBatchSize);
    for (const [index, rowBatch] of rowBatches.entries()) {
      if (rowBatch.length === 0) {
        continue;
      }
      await writeHistoricalBatch(rowBatch, index + 1, rowBatches.length, "upsert");
    }
  }

  await safeSaveStockImportActivity({
    jobId: input.jobId,
    stock: input.stock,
    yahooSymbol: input.stock.yahooSymbol,
    moduleName: "historical_prices",
    stepName: "history_write_completed",
    status: "completed",
    message: `Completed historical write for ${input.stock.symbol}.`,
    rowsFetched: payloadRows.length,
    rowsInserted: insertedRows,
    rowsUpdated: updatedRows,
    rowsSkipped: skippedRows,
    startedAt: input.rawImport.importedAt,
    completedAt: new Date().toISOString(),
    affectedTable: "stock_price_history",
    metadata: {
      rawImportId: input.rawImport.id,
      effectiveDuplicateMode,
      duplicatePayloadRowsRemoved,
      existingMatches,
      writeBatchSize,
      force: input.force,
      inserted_count: insertedRows,
      updated_count: updatedRows,
      skipped_existing_count: skippedRows,
      duplicate_detected_count: duplicatePayloadRowsRemoved,
    },
  });

  const { count: retainedCount, error: retainedError } = await supabase
    .from("stock_price_history")
    .select("trade_date", { count: "exact", head: true })
    .eq("stock_id", stockId)
    .eq("interval_type", "1d")
    .eq("source_name", "yahoo_finance")
    .gte("trade_date", firstAvailableDate)
    .lte("trade_date", lastAvailableDate);

  if (retainedError) {
    throw new Error(
      `Could not count retained stock_price_history rows. ${retainedError.message}`,
    );
  }

  const totalRowsRetained = retainedCount ?? 0;
  const totalRowsImported = insertedRows + updatedRows;
  const completionPercentage =
    dedupedRows.length > 0
      ? Number(Math.min(100, (totalRowsRetained / dedupedRows.length) * 100).toFixed(2))
      : 0;

  return {
    insertedRows,
    updatedRows,
    skippedRows,
    totalProcessedRows: dedupedRows.length,
    effectiveDuplicateMode,
    coverage: {
      firstAvailableDate,
      lastAvailableDate,
      totalRowsAvailable: dedupedRows.length,
      totalRowsImported,
      totalRowsRetained,
      missingDatesCount: countMissingTradingDays(dedupedRows),
      completionPercentage,
    } satisfies YahooHistoricalCoverageSummary,
  };
}

async function persistYahooDividendsAndSplits(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  dividends: Record<string, unknown>;
  splits: Record<string, unknown>;
}) {
  if (!input.stock.stockId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const dividendRows = Object.values(input.dividends)
    .map((value) => normalizeProviderRecord(value))
    .map((row) => ({
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      ex_dividend_date:
        isoDateFromUnixSeconds(row.date) ||
        cleanString(row.exDate, 40) ||
        null,
      record_date: cleanString(row.recordDate, 40) || null,
      payment_date: cleanString(row.paymentDate, 40) || null,
      declaration_date: cleanString(row.declarationDate, 40) || null,
      dividend_amount:
        extractYahooNumber(row.amount) ??
        extractYahooNumber(row.dividendAmount),
      currency_code: cleanString(row.currency, 20) || "INR",
      dividend_type: cleanString(row.type, 120) || null,
      frequency: cleanString(row.frequency, 120) || null,
      raw_import_id: input.rawImport.id,
      raw_payload: row,
      source_name: "yahoo_finance",
      source_url: input.rawImport.requestUrl,
      source_symbol: input.stock.yahooSymbol,
      source_recorded_at: input.rawImport.importedAt,
      imported_at: input.rawImport.importedAt,
      created_at: now,
      updated_at: now,
    }))
    .filter((row) => row.ex_dividend_date && row.dividend_amount !== null);

  const splitRows = Object.values(input.splits)
    .map((value) => normalizeProviderRecord(value))
    .map((row) => ({
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      split_date: isoDateFromUnixSeconds(row.date) || null,
      numerator: extractYahooNumber(row.numerator),
      denominator: extractYahooNumber(row.denominator),
      split_ratio_text:
        cleanString(row.splitRatio, 120) ||
        (extractYahooNumber(row.numerator) !== null && extractYahooNumber(row.denominator) !== null
          ? `${extractYahooNumber(row.numerator)}:${extractYahooNumber(row.denominator)}`
          : null),
      raw_import_id: input.rawImport.id,
      raw_payload: row,
      source_name: "yahoo_finance",
      source_url: input.rawImport.requestUrl,
      source_symbol: input.stock.yahooSymbol,
      source_recorded_at: input.rawImport.importedAt,
      imported_at: input.rawImport.importedAt,
      created_at: now,
      updated_at: now,
    }))
    .filter((row) => row.split_date);

  const writes = [];
  if (dividendRows.length) {
    writes.push(
      supabase
        .from("stock_dividends")
        .upsert(dividendRows, {
          onConflict: "stock_id,ex_dividend_date,source_name,dividend_amount",
        }),
    );
  }
  if (splitRows.length) {
    writes.push(
      supabase
        .from("stock_splits")
        .upsert(splitRows, { onConflict: "stock_id,split_date,source_name" }),
    );
  }

  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`Could not save Yahoo dividends/splits rows. ${failed.error.message}`);
  }
}

async function persistYahooNewsItems(input: {
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  payload: Record<string, unknown>;
}) {
  if (!input.stock.stockId) {
    return 0;
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const newsRows = Array.isArray(input.payload.news)
    ? input.payload.news
    : Array.isArray(input.payload.stream)
      ? input.payload.stream
      : [];

  if (!newsRows.length) {
    return 0;
  }

  const rows = newsRows
    .map((item) => normalizeProviderRecord(item))
    .map((row) => {
      const thumbnail = normalizeProviderRecord(row.thumbnail);
      const thumbnailResolutions = Array.isArray(thumbnail.resolutions)
        ? thumbnail.resolutions
        : [];
      const primaryThumbnail = normalizeProviderRecord(thumbnailResolutions[0]);
      return {
        stock_id: input.stock.stockId,
        symbol: input.stock.symbol,
        external_news_id: cleanString(row.uuid || row.id, 240) || null,
        published_at:
          isoTimestampFromUnixSeconds(row.providerPublishTime) ||
          now,
        title:
          cleanString(row.title, 1200) ||
          cleanString(row.name, 1200) ||
          "Untitled Yahoo news item",
        publisher: cleanString(row.publisher, 240) || null,
        provider_name: cleanString(row.provider, 240) || "Yahoo Finance",
        link_url: cleanString(row.link, 2000) || null,
        thumbnail_url:
          cleanString(
            primaryThumbnail.url || thumbnail.url,
            2000,
          ) || null,
        summary: cleanString(row.summary, 4000) || null,
        sentiment_label: cleanString(row.sentiment, 120) || null,
        related_symbols: Array.isArray(row.relatedTickers) ? row.relatedTickers : [],
        raw_import_id: input.rawImport.id,
        raw_payload: row,
        source_name: "yahoo_finance",
        source_url: input.rawImport.requestUrl,
        source_symbol: input.stock.yahooSymbol,
        source_recorded_at: input.rawImport.importedAt,
        imported_at: input.rawImport.importedAt,
        created_at: now,
        updated_at: now,
      };
    });

  const { error } = await supabase
    .from("stock_news")
    .upsert(rows, { onConflict: "stock_id,external_news_id" });

  if (error) {
    throw new Error(`Could not save stock_news rows. ${error.message}`);
  }

  return rows.length;
}

function createBucketSummary(
  bucketKey: string,
  status: StockImportJobItemStatus,
  actionTaken: string,
  note: string,
  rawImportId: string | null,
): BucketRunSummary {
  return {
    bucketKey,
    status,
    actionTaken,
    note,
    rawImportId,
  };
}

export async function runYahooFinanceSampleStockImport(
  input: YahooFinanceSampleImportInput,
): Promise<YahooFinanceSampleImportResult> {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase() || "RELIANCE.NS";
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Import Script";
  const stock = await resolveYahooStockTarget(yahooSymbol);

  const jobId = await createStockImportJob({
    stock,
    actorEmail,
    yahooSymbol,
  });

  const bucketResults: BucketRunSummary[] = [];
  const warnings: string[] = [];
  const rawImportIds = new Set<string>();
  let marketDataImport: ExecuteMarketDataImportResult | null = null;

  const registerFailure = async (
    bucketKey: string,
    actionTaken: string,
    error: unknown,
    rawImportId: string | null = null,
  ) => {
    const message = error instanceof Error ? error.message : "Unknown Yahoo import failure.";
    warnings.push(`${bucketKey}: ${message}`);
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey,
      rowStatus: "failed",
      actionTaken,
      rawImportId,
      rawRow: {
        error: message,
      },
      normalizedRow: {},
    });
    await logYahooImportError({
      jobId,
      stock,
      bucketKey,
      errorStage: "normalize",
      errorMessage: message,
      context: {
        rawImportId,
        actionTaken,
      },
    });
    bucketResults.push(createBucketSummary(bucketKey, "failed", actionTaken, message, rawImportId));
  };

  try {
    const quoteLatest = await fetchYahooLatestQuote({
      yahooSymbol,
      jobId,
    });
    rawImportIds.add(quoteLatest.rawImport.id);
    const snapshot = await persistStockMarketSnapshot({
      stock: quoteLatest.stock,
      rawImport: quoteLatest.rawImport,
      payload: quoteLatest.payload,
    });
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "quote_latest",
      rowStatus: "imported",
      actionTaken: "saved_snapshot",
      rawImportId: quoteLatest.rawImport.id,
      rawRow: quoteLatest.payload,
      normalizedRow: {
        tradeDate: snapshot?.tradeDate ?? null,
        price: snapshot?.price ?? null,
      },
    });
    bucketResults.push(
      createBucketSummary(
        "quote_latest",
        "imported",
        "saved_snapshot",
        `Saved latest market snapshot${snapshot?.price !== null ? ` at ${snapshot?.price}` : ""}.`,
        quoteLatest.rawImport.id,
      ),
    );

    const profileSummary = await fetchYahooQuoteSummaryModules({
      yahooSymbol,
      modules: [...YAHOO_QUOTE_SUMMARY_PROFILE_MODULES],
      bucketKey: "company_profile",
      jobId,
    });
    rawImportIds.add(profileSummary.rawImport.id);
    await persistStockCompanyProfile({
      stock: profileSummary.stock,
      rawImport: profileSummary.rawImport,
      payload: profileSummary.payload,
    });
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "company_profile",
      rowStatus: "imported",
      actionTaken: "saved_profile",
      rawImportId: profileSummary.rawImport.id,
      rawRow: profileSummary.payload,
      normalizedRow: {
        tradeDate: new Date().toISOString().slice(0, 10),
      },
    });
    bucketResults.push(
      createBucketSummary(
        "company_profile",
        "imported",
        "saved_profile",
        "Saved company profile snapshot.",
        profileSummary.rawImport.id,
      ),
    );

    const valuationSummary = await fetchYahooQuoteSummaryModules({
      yahooSymbol,
      modules: [...YAHOO_QUOTE_SUMMARY_VALUATION_MODULES],
      bucketKey: "valuation_statistics",
      jobId,
    });
    rawImportIds.add(valuationSummary.rawImport.id);
    const valuationTradeDate =
      snapshot?.tradeDate ?? new Date().toISOString().slice(0, 10);
    await persistStockValuationSnapshots({
      stock: valuationSummary.stock,
      rawImport: valuationSummary.rawImport,
      payload: valuationSummary.payload,
      tradeDate: valuationTradeDate,
    });
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "valuation_statistics",
      rowStatus: "imported",
      actionTaken: "saved_valuation_metrics",
      rawImportId: valuationSummary.rawImport.id,
      rawRow: valuationSummary.payload,
      normalizedRow: {
        tradeDate: valuationTradeDate,
      },
    });
    bucketResults.push(
      createBucketSummary(
        "valuation_statistics",
        "imported",
        "saved_valuation_metrics",
        "Saved valuation, share statistics, and financial highlights snapshots.",
        valuationSummary.rawImport.id,
      ),
    );

    const financialStatements = await fetchYahooFinancialStatements({
      yahooSymbol,
      jobId,
    });
    rawImportIds.add(financialStatements.rawImport.id);
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "financial_statements",
      rowStatus: "validated",
      actionTaken: "raw_saved_only",
      rawImportId: financialStatements.rawImport.id,
      rawRow: financialStatements.payload,
      normalizedRow: {},
    });
    bucketResults.push(
      createBucketSummary(
        "financial_statements",
        "validated",
        "raw_saved_only",
        "Stored raw financial statement modules for later normalization.",
        financialStatements.rawImport.id,
      ),
    );

    const holders = await fetchYahooHolders({
      yahooSymbol,
      jobId,
    });
    rawImportIds.add(holders.rawImport.id);
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "holders",
      rowStatus: "validated",
      actionTaken: "raw_saved_only",
      rawImportId: holders.rawImport.id,
      rawRow: holders.payload,
      normalizedRow: {},
    });
    bucketResults.push(
      createBucketSummary(
        "holders",
        "validated",
        "raw_saved_only",
        "Stored raw holder modules for later normalization.",
        holders.rawImport.id,
      ),
    );

    const historical = await fetchYahooDividendsAndSplits({
      yahooSymbol,
      range: cleanString(input.historyRange, 40) || "1mo",
      interval: "1d",
      jobId,
    });
    rawImportIds.add(historical.rawImport.id);
    await persistTypedHistoricalRows({
      stock: historical.stock,
      rawImport: historical.rawImport,
      rows: historical.rows,
    });
    await persistYahooDividendsAndSplits({
      stock: historical.stock,
      rawImport: historical.rawImport,
      dividends: historical.dividends as Record<string, unknown>,
      splits: historical.splits as Record<string, unknown>,
    });
    marketDataImport = await executeMarketDataImport({
      type: "stock_ohlcv",
      csvText: buildYahooHistoricalCsvText({
        symbol: historical.stock.symbol,
        rows: historical.rows,
        sourceLabel: "yahoo_finance_import",
      }),
      fileName: `${historical.stock.symbol}-${cleanString(input.historyRange, 40) || "1mo"}-yahoo-history.csv`,
      executionMode: input.executionMode ?? "import_valid_rows",
      duplicateMode: input.duplicateMode ?? "replace_matching_dates",
      sourceType: "yahoo_finance",
      sourceLabel: "yahoo_finance_import",
      sourceUrl: historical.rawImport.requestUrl,
      actorUserId: input.actorUserId ?? null,
      actorEmail,
    });
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "historical_prices",
      rowStatus:
        marketDataImport.batch.status === "failed" ? "failed" : "imported",
      actionTaken: "saved_price_history",
      rawImportId: historical.rawImport.id,
      rawRow: {
        rawImportId: historical.rawImport.id,
        rowCount: historical.rows.length,
      },
      normalizedRow: {
        tradeDate: historical.rows[historical.rows.length - 1]?.tradeDate ?? null,
        importedRows: marketDataImport.batch.successCount,
        batchId: marketDataImport.batch.id,
      },
    });
    bucketResults.push(
      createBucketSummary(
        "historical_prices",
        marketDataImport.batch.status === "failed" ? "failed" : "imported",
        "saved_price_history",
        `Saved ${marketDataImport.batch.successCount} historical price row${marketDataImport.batch.successCount === 1 ? "" : "s"} into the durable OHLCV lane.`,
        historical.rawImport.id,
      ),
    );

    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "dividends_splits",
      rowStatus: "imported",
      actionTaken: "saved_dividends_and_splits",
      rawImportId: historical.rawImport.id,
      rawRow: {
        dividendCount: Object.keys(historical.dividends as Record<string, unknown>).length,
        splitCount: Object.keys(historical.splits as Record<string, unknown>).length,
      },
      normalizedRow: {},
    });
    bucketResults.push(
      createBucketSummary(
        "dividends_splits",
        "imported",
        "saved_dividends_and_splits",
        "Saved dividend and split history from the chart events feed.",
        historical.rawImport.id,
      ),
    );

    const options = await fetchYahooOptions({
      yahooSymbol,
      jobId,
    });
    rawImportIds.add(options.rawImport.id);
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "options",
      rowStatus: "validated",
      actionTaken: "raw_saved_only",
      rawImportId: options.rawImport.id,
      rawRow: options.payload,
      normalizedRow: {},
    });
    bucketResults.push(
      createBucketSummary(
        "options",
        "validated",
        "raw_saved_only",
        "Stored raw options chain data for later normalization.",
        options.rawImport.id,
      ),
    );

    const news = await fetchYahooNews({
      yahooSymbol,
      jobId,
    });
    rawImportIds.add(news.rawImport.id);
    const savedNewsCount = await persistYahooNewsItems({
      stock: news.stock,
      rawImport: news.rawImport,
      payload: news.payload,
    });
    await saveStockImportJobItem({
      jobId,
      stock,
      bucketKey: "news",
      rowStatus: "imported",
      actionTaken: "saved_news",
      rawImportId: news.rawImport.id,
      rawRow: news.payload,
      normalizedRow: {
        importedRows: savedNewsCount,
      },
    });
    bucketResults.push(
      createBucketSummary(
        "news",
        "imported",
        "saved_news",
        `Saved ${savedNewsCount} Yahoo-linked news row${savedNewsCount === 1 ? "" : "s"}.`,
        news.rawImport.id,
      ),
    );
  } catch (error) {
    await registerFailure("job", "fatal_failure", error, null);
  }

  const importedItems = bucketResults.filter((item) =>
    item.status === "imported" || item.status === "updated",
  ).length;
  const failedItems = bucketResults.filter((item) => item.status === "failed").length;
  const warningItems = bucketResults.filter((item) => item.status === "warning").length;
  const status: StockImportJobStatus =
    failedItems > 0
      ? importedItems > 0 || bucketResults.some((item) => item.status === "validated")
        ? "completed_with_errors"
        : "failed"
      : "completed";

  await updateStockImportJob({
    jobId,
    status,
    importedItems,
    updatedItems: bucketResults.filter((item) => item.status === "updated").length,
    skippedItems: bucketResults.filter((item) => item.status === "skipped").length,
    failedItems,
    warningItems,
    metadata: {
      yahooSymbol,
      stockSlug: stock.slug,
      rawImportCount: rawImportIds.size,
      marketDataImportBatchId: marketDataImport?.batch.id ?? null,
      warnings,
      bucketResults,
    },
  });

  return {
    stock,
    jobId,
    jobStatus: status,
    bucketResults,
    rawImportCount: rawImportIds.size,
    warnings,
    marketDataImport,
  };
}

export async function runYahooQuoteStatisticsImport(
  input: YahooQuoteStatisticsImportInput,
): Promise<YahooQuoteStatisticsImportResult> {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase();
  if (!yahooSymbol) {
    throw new Error("Enter a Yahoo symbol such as RELIANCE.NS.");
  }

  const dryRun = input.dryRun === true;
  const force = input.force === true;
  const refresh = input.refresh === true;
  const snapshotOnly = input.snapshotOnly === true;
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Quote Statistics Import";
  const stock = await resolveHistoricalImportStockTarget({
    yahooSymbol,
    stockId: input.stockId ?? null,
  });

  if (!stock.stockId) {
    throw new Error(
      `Yahoo symbol "${yahooSymbol}" could not be mapped to a durable stocks_master row.`,
    );
  }

  const jobId = await createStockImportJob({
    stock,
    actorEmail,
    yahooSymbol,
    jobKind: "quote_statistics_import",
    importScope: "stock_quote_statistics",
    totalItems: snapshotOnly ? 1 : 4,
    metadata: {
      dryRun,
      snapshotOnly,
      requestedStockId: cleanString(input.stockId, 160) || null,
    },
  });

  const warnings: string[] = [];
  const rawImportIds: string[] = [];
  const todayTradeDate = getCurrentIsoDateInTimeZone();

    if ((!dryRun || input.allowExistingSnapshotSkipOnDryRun === true) && !force && !refresh) {
      const existingSnapshot = await loadExistingSnapshotForTradeDate({
        stockId: stock.stockId,
        tradeDate: todayTradeDate,
      });

    if (existingSnapshot) {
      const snapshotReport = buildSnapshotReportFromStoredRow(existingSnapshot);
      const unavailableReports = buildUnavailableQuoteStatisticsReports();
      const skippedJobItemId = await saveStockImportJobItem({
        jobId,
        stock,
        bucketKey: "latest_market_snapshot",
        itemKey: `${stock.symbol}:${todayTradeDate}:snapshot`,
        rowStatus: "skipped",
        actionTaken: "skipped_existing_snapshot",
        rawRow: {
          skipReason: "snapshot_already_exists_today",
          existingSnapshotId: cleanString(existingSnapshot.id, 160) || null,
        },
        normalizedRow: {
          tradeDate: todayTradeDate,
          report: snapshotReport,
          skippedExistingSnapshot: true,
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: skippedJobItemId,
        stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "skipped_existing_snapshot",
        status: "completed",
        message: `Skipped Yahoo snapshot fetch for ${stock.symbol} because today's snapshot already exists.`,
        rowsFetched: 0,
        rowsSkipped: 1,
        mappedFieldsCount: snapshotReport.totalMappedFields,
        missingFieldsCount: snapshotReport.missingFields,
        fillPercentage: snapshotReport.fillPercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_market_snapshot",
        metadata: {
          skipReason: "snapshot_already_exists_today",
          existingSnapshotId: cleanString(existingSnapshot.id, 160) || null,
          tradeDate: todayTradeDate,
          snapshotOnly,
        },
      });

      const skippedSnapshotReconciliationStatus = buildReconciliationStatus({
        normalizedRecordsCount: 1,
        missingOptionalFields: snapshotReport.missingFieldKeys,
      });

      await safeSaveStockImportReconciliation({
        jobId,
        stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        rawImportId: null,
        targetTable: "stock_market_snapshot",
        rawRecordsCount: 0,
        normalizedRecordsCount: 1,
        unmappedRecordsCount: 0,
        missingRequiredFields: [],
        missingOptionalFields: snapshotReport.missingFieldKeys,
        reconciliationStatus: skippedSnapshotReconciliationStatus,
        reconciliationNotes: `Reused existing latest market snapshot for ${stock.symbol} on ${todayTradeDate}.`,
        metadata: buildReconciliationMetadata({
          stock,
          extra: {
            tradeDate: todayTradeDate,
            existingSnapshotId: cleanString(existingSnapshot.id, 160) || null,
            skipReason: "snapshot_already_exists_today",
            snapshotOnly,
            fillPercentage: snapshotReport.fillPercentage,
          },
        }),
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: skippedJobItemId,
        stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "reconciliation_completed",
        status: skippedSnapshotReconciliationStatus === "completed" ? "completed" : "warning",
        message: `Reconciled reused market snapshot against stock_market_snapshot for ${stock.symbol}.`,
        rowsFetched: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        mappedFieldsCount: snapshotReport.totalMappedFields,
        missingFieldsCount: snapshotReport.missingFields,
        fillPercentage: snapshotReport.fillPercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_reconciliation",
        metadata: {
          tradeDate: todayTradeDate,
          existingSnapshotId: cleanString(existingSnapshot.id, 160) || null,
          reconciliationStatus: skippedSnapshotReconciliationStatus,
          skipReason: "snapshot_already_exists_today",
          snapshotOnly,
        },
      });

      await updateStockImportJob({
        jobId,
        status: "completed",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 1,
        failedItems: 0,
        warningItems: 0,
        metadata: {
          yahooSymbol,
          stockSlug: stock.slug,
          stockId: stock.stockId,
          rawImportIds,
          dryRun,
          force,
          refresh,
          snapshotOnly,
          snapshotTradeDate: todayTradeDate,
          skippedExistingSnapshot: true,
          skippedExistingSnapshotCount: 1,
          savedRequestsAvoided: 1,
          existingDataReused: 1,
          moduleDisabledStatus: {
            financial_statements: "manual_single_stock_only",
          },
          reports: {
            latestMarketSnapshot: snapshotReport,
            valuationMetrics: unavailableReports.valuationMetrics,
            shareStatistics: unavailableReports.shareStatistics,
            financialHighlights: unavailableReports.financialHighlights,
          },
          warnings,
        },
      });

      return {
        stock,
        jobId,
        jobStatus: "completed",
        rawImportIds,
        warnings,
        snapshotTradeDate: todayTradeDate,
        skippedExistingSnapshot: true,
        savedRequestsAvoided: 1,
        existingDataReused: 1,
        reports: {
          latestMarketSnapshot: snapshotReport,
          valuationMetrics: unavailableReports.valuationMetrics,
          shareStatistics: unavailableReports.shareStatistics,
          financialHighlights: unavailableReports.financialHighlights,
        },
      };
    }
  }

  try {
    const snapshotFetchStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "fetch_started",
      status: "running",
      message: snapshotOnly
        ? `Fetching latest Yahoo market snapshot for ${stock.symbol} from chart history only.`
        : `Fetching latest Yahoo market snapshot for ${stock.symbol}.`,
      startedAt: snapshotFetchStartedAt,
      affectedTable: "raw_yahoo_imports",
    });

    let latestQuote: Awaited<ReturnType<typeof fetchYahooLatestQuote>>;
    let snapshotUsedChartFallback = false;

    if (snapshotOnly) {
      const fallbackHistorical = await fetchYahooHistoricalPriceData({
        yahooSymbol,
        range: "1mo",
        interval: "1d",
        jobId,
        dryRun,
      });
      snapshotUsedChartFallback = true;
      latestQuote = {
        stock: fallbackHistorical.stock,
        rawImport: fallbackHistorical.rawImport,
        payload: buildSyntheticQuotePayloadFromHistoricalPayload({
          payload: fallbackHistorical.payload as Record<string, unknown>,
          yahooSymbol,
        }),
      };
    } else {
      try {
        latestQuote = await fetchYahooLatestQuote({
          yahooSymbol,
          jobId,
          dryRun,
        });
      } catch (error) {
        if (!dryRun && isYahooProtectedEndpointUnavailableError(error)) {
          const fallbackHistorical = await fetchYahooHistoricalPriceData({
            yahooSymbol,
            range: "1mo",
            interval: "1d",
            jobId,
            dryRun,
          });
          snapshotUsedChartFallback = true;
          latestQuote = {
            stock: fallbackHistorical.stock,
            rawImport: fallbackHistorical.rawImport,
            payload: buildSyntheticQuotePayloadFromHistoricalPayload({
              payload: fallbackHistorical.payload as Record<string, unknown>,
              yahooSymbol,
            }),
          };
          warnings.push(
            `Latest market snapshot quote endpoint was unavailable for ${stock.symbol}. Used Yahoo chart fallback instead.`,
          );
        } else {
          throw error;
        }
      }
    }
    rawImportIds.push(latestQuote.rawImport.id);

    await safeSaveStockImportActivity({
      jobId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "fetch_completed",
      status: "completed",
      message: snapshotUsedChartFallback
        ? `Fetched latest market snapshot for ${latestQuote.stock.symbol} through Yahoo chart fallback.`
        : `Fetched latest Yahoo market snapshot for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      startedAt: snapshotFetchStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: latestQuote.stock,
        sourceUrl: latestQuote.rawImport.requestUrl,
        sourceRecordedAt: latestQuote.rawImport.importedAt,
        extra: {
          rawImportId: latestQuote.rawImport.id,
          fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
          responseStatus: latestQuote.rawImport.responseStatus,
        },
      }),
    });

    await safeSaveStockImportActivity({
      jobId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "raw_saved",
      status: "completed",
      message: snapshotUsedChartFallback
        ? `Saved Yahoo chart fallback payload for ${latestQuote.stock.symbol} snapshot normalization.`
        : `Saved raw Yahoo market snapshot payload for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      startedAt: latestQuote.rawImport.importedAt,
      completedAt: latestQuote.rawImport.importedAt,
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: latestQuote.stock,
        sourceUrl: latestQuote.rawImport.requestUrl,
        sourceRecordedAt: latestQuote.rawImport.importedAt,
        extra: {
          fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
          rawImportId: latestQuote.rawImport.id,
          sourceBucket: latestQuote.rawImport.sourceBucket,
        },
      }),
    });

    const snapshotNormalizationStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "normalization_started",
      status: "running",
      message: snapshotUsedChartFallback
        ? `Normalizing chart-derived market snapshot into stock_market_snapshot for ${latestQuote.stock.symbol}.`
        : `Normalizing latest Yahoo snapshot into stock_market_snapshot for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      startedAt: snapshotNormalizationStartedAt,
      affectedTable: "stock_market_snapshot",
      metadata: {
        fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
        rawImportId: latestQuote.rawImport.id,
      },
    });

    const snapshot = await persistStockMarketSnapshot({
      stock: latestQuote.stock,
      rawImport: latestQuote.rawImport,
      payload: latestQuote.payload,
      refreshExistingToday: force || refresh,
    });

    await safeSaveStockImportActivity({
      jobId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "snapshot_write_completed",
      status: "completed",
      message: `Saved latest market snapshot row for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      mappedFieldsCount: snapshot.report.totalMappedFields,
      missingFieldsCount: snapshot.report.missingFields,
      fillPercentage: snapshot.report.fillPercentage,
      startedAt: snapshotNormalizationStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "stock_market_snapshot",
      metadata: {
        fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
        rawImportId: latestQuote.rawImport.id,
        tradeDate: snapshot.tradeDate,
        snapshotOnly,
      },
    });

    if (snapshot.report.missingFields > 0) {
      warnings.push(
        `Latest Market Snapshot is missing ${snapshot.report.missingFields} of ${snapshot.report.totalMappedFields} mapped field${snapshot.report.totalMappedFields === 1 ? "" : "s"}.`,
      );
    }

    const snapshotJobItemId = await saveStockImportJobItem({
      jobId,
      stock: latestQuote.stock,
      bucketKey: "latest_market_snapshot",
      itemKey: `${latestQuote.stock.symbol}:${snapshot.tradeDate ?? "unknown"}:snapshot`,
      rowStatus: snapshot.report.missingFields > 0 ? "warning" : "imported",
      actionTaken: "saved_snapshot",
      rawImportId: latestQuote.rawImport.id,
      rawRow: latestQuote.payload,
      normalizedRow: {
        tradeDate: snapshot.tradeDate,
        price: snapshot.price,
        report: snapshot.report,
      },
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: snapshotJobItemId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "normalization_completed",
      status: snapshot.report.missingFields > 0 ? "warning" : "completed",
      message: `Normalized latest Yahoo snapshot for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      rowsInserted: 1,
      mappedFieldsCount: snapshot.report.totalMappedFields,
      missingFieldsCount: snapshot.report.missingFields,
      fillPercentage: snapshot.report.fillPercentage,
      startedAt: snapshotNormalizationStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "stock_market_snapshot",
      metadata: {
        fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
        rawImportId: latestQuote.rawImport.id,
        tradeDate: snapshot.tradeDate,
        snapshotOnly,
      },
    });

    await persistFieldCoverageReport({
      stock: latestQuote.stock,
      jobId,
      bucketKey: "latest_market_snapshot",
      report: snapshot.report,
      rawImportId: latestQuote.rawImport.id,
      sourceUrl: latestQuote.rawImport.requestUrl,
      sourceRecordedAt: latestQuote.rawImport.importedAt,
      latestTradeDate: snapshot.tradeDate,
      notes: `Normalized latest market snapshot for ${latestQuote.stock.symbol}. Filled ${snapshot.report.filledFields} of ${snapshot.report.totalMappedFields} mapped fields.`,
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: snapshotJobItemId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "coverage_updated",
      status: snapshot.report.missingFields > 0 ? "warning" : "completed",
      message: `Updated latest market snapshot coverage for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      rowsInserted: 1,
      mappedFieldsCount: snapshot.report.totalMappedFields,
      missingFieldsCount: snapshot.report.missingFields,
      fillPercentage: snapshot.report.fillPercentage,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_coverage",
      metadata: {
        rawImportId: latestQuote.rawImport.id,
        bucketKey: "latest_market_snapshot",
        fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
        snapshotOnly,
      },
    });

    const snapshotReconciliationStatus = buildReconciliationStatus({
      normalizedRecordsCount: 1,
      missingOptionalFields: snapshot.report.missingFieldKeys,
    });

    await safeSaveStockImportReconciliation({
      jobId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      rawImportId: latestQuote.rawImport.id,
      targetTable: "stock_market_snapshot",
      rawRecordsCount: 1,
      normalizedRecordsCount: 1,
      unmappedRecordsCount: 0,
      missingRequiredFields: [],
      missingOptionalFields: snapshot.report.missingFieldKeys,
      reconciliationStatus: snapshotReconciliationStatus,
      reconciliationNotes: `Latest snapshot mapped ${snapshot.report.filledFields}/${snapshot.report.totalMappedFields} fields.`,
      metadata: buildReconciliationMetadata({
        stock: latestQuote.stock,
        sourceUrl: latestQuote.rawImport.requestUrl,
        sourceRecordedAt: latestQuote.rawImport.importedAt,
        extra: {
          fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
          rawImportId: latestQuote.rawImport.id,
          tradeDate: snapshot.tradeDate,
          fillPercentage: snapshot.report.fillPercentage,
        },
      }),
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: snapshotJobItemId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "reconciliation_completed",
      status: snapshotReconciliationStatus === "completed" ? "completed" : "warning",
      message: `Reconciled latest Yahoo snapshot against stock_market_snapshot for ${latestQuote.stock.symbol}.`,
      rowsFetched: 1,
      rowsInserted: 1,
      mappedFieldsCount: snapshot.report.totalMappedFields,
      missingFieldsCount: snapshot.report.missingFields,
      fillPercentage: snapshot.report.fillPercentage,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_reconciliation",
      metadata: {
        fallbackStrategy: snapshotUsedChartFallback ? "chart_history" : null,
        rawImportId: latestQuote.rawImport.id,
        reconciliationStatus: snapshotReconciliationStatus,
        snapshotOnly,
      },
    });

    if (snapshotOnly) {
      const unavailableReports = buildUnavailableQuoteStatisticsReports();
      const warningItems = snapshot.report.missingFields > 0 ? 1 : 0;
      const jobStatus: StockImportJobStatus =
        warningItems > 0 ? "completed_with_errors" : "completed";
      const savedRequestsAvoided = [latestQuote.rawImport.deduplicated].filter(Boolean).length;

      await updateStockImportJob({
        jobId,
        status: jobStatus,
        importedItems: warningItems > 0 ? 0 : 1,
        updatedItems: 0,
        skippedItems: 0,
        failedItems: 0,
        warningItems,
        metadata: {
          yahooSymbol,
          stockSlug: stock.slug,
          stockId: stock.stockId,
          rawImportIds,
          dryRun,
          force,
          refresh,
          snapshotOnly,
          snapshotTradeDate: snapshot.tradeDate,
          skippedExistingSnapshot: false,
          skippedExistingSnapshotCount: 0,
          skippedDuplicateRawResponseCount: savedRequestsAvoided,
          savedRequestsAvoided,
          existingDataReused: 0,
          moduleDisabledStatus: {
            valuation_metrics: "snapshot_only_not_requested",
            share_statistics: "snapshot_only_not_requested",
            financial_highlights: "snapshot_only_not_requested",
            financial_statements: "manual_single_stock_only",
          },
          reports: {
            latestMarketSnapshot: snapshot.report,
            valuationMetrics: unavailableReports.valuationMetrics,
            shareStatistics: unavailableReports.shareStatistics,
            financialHighlights: unavailableReports.financialHighlights,
          },
          warnings,
        },
      });

      return {
        stock,
        jobId,
        jobStatus,
        rawImportIds,
        warnings,
        snapshotTradeDate: snapshot.tradeDate,
        skippedExistingSnapshot: false,
        savedRequestsAvoided,
        existingDataReused: 0,
        reports: {
          latestMarketSnapshot: snapshot.report,
          valuationMetrics: unavailableReports.valuationMetrics,
          shareStatistics: unavailableReports.shareStatistics,
          financialHighlights: unavailableReports.financialHighlights,
        },
      };
    }

    const valuationFetchStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock: latestQuote.stock,
      yahooSymbol,
      moduleName: "valuation_statistics",
      stepName: "fetch_started",
      status: "running",
      message: `Fetching Yahoo valuation and key statistics for ${latestQuote.stock.symbol}.`,
      startedAt: valuationFetchStartedAt,
      affectedTable: "raw_yahoo_imports",
    });

    const tradeDate = snapshot.tradeDate ?? new Date().toISOString().slice(0, 10);
    let stats = buildUnavailableQuoteStatisticsReports();
    let valuationSummary: Awaited<ReturnType<typeof fetchYahooQuoteSummaryModules>> | null = null;
    let valuationUnavailableMessage: string | null = null;

    try {
      valuationSummary = await fetchYahooQuoteSummaryModules({
        yahooSymbol,
        modules: [...YAHOO_QUOTE_SUMMARY_VALUATION_MODULES],
        bucketKey: "valuation_statistics",
        jobId,
        dryRun,
      });
      rawImportIds.push(valuationSummary.rawImport.id);

      await safeSaveStockImportActivity({
        jobId,
        stock: valuationSummary.stock,
        yahooSymbol,
        moduleName: "valuation_statistics",
        stepName: "fetch_completed",
        status: "completed",
        message: `Fetched Yahoo valuation and key statistics for ${valuationSummary.stock.symbol}.`,
        rowsFetched: 1,
        startedAt: valuationFetchStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "raw_yahoo_imports",
        metadata: buildReconciliationMetadata({
          stock: valuationSummary.stock,
          sourceUrl: valuationSummary.rawImport.requestUrl,
          sourceRecordedAt: valuationSummary.rawImport.importedAt,
          extra: {
            rawImportId: valuationSummary.rawImport.id,
            responseStatus: valuationSummary.rawImport.responseStatus,
            modules: [...YAHOO_QUOTE_SUMMARY_VALUATION_MODULES],
          },
        }),
      });

      await safeSaveStockImportActivity({
        jobId,
        stock: valuationSummary.stock,
        yahooSymbol,
        moduleName: "valuation_statistics",
        stepName: "raw_saved",
        status: "completed",
        message: `Saved raw Yahoo valuation/statistics payload for ${valuationSummary.stock.symbol}.`,
        rowsFetched: 1,
        startedAt: valuationSummary.rawImport.importedAt,
        completedAt: valuationSummary.rawImport.importedAt,
        affectedTable: "raw_yahoo_imports",
        metadata: buildReconciliationMetadata({
          stock: valuationSummary.stock,
          sourceUrl: valuationSummary.rawImport.requestUrl,
          sourceRecordedAt: valuationSummary.rawImport.importedAt,
          extra: {
            rawImportId: valuationSummary.rawImport.id,
            sourceBucket: valuationSummary.rawImport.sourceBucket,
          },
        }),
      });

      const valuationNormalizationStartedAt = new Date().toISOString();
      await safeSaveStockImportActivity({
        jobId,
        stock: valuationSummary.stock,
        yahooSymbol,
        moduleName: "valuation_statistics",
        stepName: "normalization_started",
        status: "running",
        message: `Normalizing Yahoo valuation/statistics buckets for ${valuationSummary.stock.symbol}.`,
        rowsFetched: 1,
        startedAt: valuationNormalizationStartedAt,
        affectedTable: "stock_valuation_metrics",
        metadata: {
          rawImportId: valuationSummary.rawImport.id,
          tradeDate,
        },
      });

      stats = await persistStockValuationSnapshots({
        stock: valuationSummary.stock,
        rawImport: valuationSummary.rawImport,
        payload: valuationSummary.payload,
        tradeDate,
      });

      const valuationEntries = [
        {
          bucketKey: "valuation_metrics",
          itemKey: `${valuationSummary.stock.symbol}:${tradeDate}:valuation`,
          rowStatus: stats.valuationMetrics.missingFields > 0 ? "warning" : "imported",
          actionTaken: "saved_valuation_metrics",
          normalizedRow: {
            tradeDate,
            report: stats.valuationMetrics,
          },
          report: stats.valuationMetrics,
          targetTable: "stock_valuation_metrics",
          latestTradeDate: tradeDate,
          latestFiscalDate: null,
        },
        {
          bucketKey: "share_statistics",
          itemKey: `${valuationSummary.stock.symbol}:${tradeDate}:share-statistics`,
          rowStatus: stats.shareStatistics.missingFields > 0 ? "warning" : "imported",
          actionTaken: "saved_share_statistics",
          normalizedRow: {
            tradeDate,
            report: stats.shareStatistics,
          },
          report: stats.shareStatistics,
          targetTable: "stock_share_statistics",
          latestTradeDate: tradeDate,
          latestFiscalDate: null,
        },
        {
          bucketKey: "financial_highlights",
          itemKey: `${valuationSummary.stock.symbol}:${tradeDate}:financial-highlights`,
          rowStatus: stats.financialHighlights.missingFields > 0 ? "warning" : "imported",
          actionTaken: "saved_financial_highlights",
          normalizedRow: {
            fiscalDate: tradeDate,
            report: stats.financialHighlights,
          },
          report: stats.financialHighlights,
          targetTable: "stock_financial_highlights",
          latestTradeDate: null,
          latestFiscalDate: tradeDate,
        },
      ] as const;

      for (const report of [
        stats.valuationMetrics,
        stats.shareStatistics,
        stats.financialHighlights,
      ]) {
        if (report.missingFields > 0) {
          warnings.push(
            `${report.tableName} is missing ${report.missingFields} of ${report.totalMappedFields} mapped field${report.totalMappedFields === 1 ? "" : "s"}.`,
          );
        }
      }

      for (const entry of valuationEntries) {
        const jobItemId = await saveStockImportJobItem({
          jobId,
          stock: valuationSummary.stock,
          bucketKey: entry.bucketKey,
          itemKey: entry.itemKey,
          rowStatus: entry.rowStatus,
          actionTaken: entry.actionTaken,
          rawImportId: valuationSummary.rawImport.id,
          rawRow: valuationSummary.payload,
          normalizedRow: entry.normalizedRow,
        });

        await safeSaveStockImportActivity({
          jobId,
          jobItemId,
          stock: valuationSummary.stock,
          yahooSymbol,
          moduleName: entry.bucketKey,
          stepName: "normalization_completed",
          status: entry.report.missingFields > 0 ? "warning" : "completed",
          message: `Normalized ${entry.bucketKey.replaceAll("_", " ")} for ${valuationSummary.stock.symbol}.`,
          rowsFetched: 1,
          rowsInserted: 1,
          mappedFieldsCount: entry.report.totalMappedFields,
          missingFieldsCount: entry.report.missingFields,
          fillPercentage: entry.report.fillPercentage,
          startedAt: valuationNormalizationStartedAt,
          completedAt: new Date().toISOString(),
          affectedTable: entry.targetTable,
          metadata: {
            rawImportId: valuationSummary.rawImport.id,
            tradeDate,
          },
        });

        await persistFieldCoverageReport({
          stock: valuationSummary.stock,
          jobId,
          bucketKey: entry.bucketKey,
          report: entry.report,
          rawImportId: valuationSummary.rawImport.id,
          sourceUrl: valuationSummary.rawImport.requestUrl,
          sourceRecordedAt: valuationSummary.rawImport.importedAt,
          latestTradeDate: entry.latestTradeDate,
          latestFiscalDate: entry.latestFiscalDate,
          notes: `Normalized ${entry.bucketKey.replaceAll("_", " ")} for ${valuationSummary.stock.symbol}. Filled ${entry.report.filledFields} of ${entry.report.totalMappedFields} mapped fields.`,
        });

        await safeSaveStockImportActivity({
          jobId,
          jobItemId,
          stock: valuationSummary.stock,
          yahooSymbol,
          moduleName: entry.bucketKey,
          stepName: "coverage_updated",
          status: entry.report.missingFields > 0 ? "warning" : "completed",
          message: `Updated ${entry.bucketKey.replaceAll("_", " ")} coverage for ${valuationSummary.stock.symbol}.`,
          rowsFetched: 1,
          rowsInserted: 1,
          mappedFieldsCount: entry.report.totalMappedFields,
          missingFieldsCount: entry.report.missingFields,
          fillPercentage: entry.report.fillPercentage,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          affectedTable: "stock_import_coverage",
          metadata: {
            rawImportId: valuationSummary.rawImport.id,
            bucketKey: entry.bucketKey,
          },
        });

        const reconciliationStatus = buildReconciliationStatus({
          normalizedRecordsCount: 1,
          missingOptionalFields: entry.report.missingFieldKeys,
        });

        await safeSaveStockImportReconciliation({
          jobId,
          stock: valuationSummary.stock,
          yahooSymbol,
          moduleName: entry.bucketKey,
          rawImportId: valuationSummary.rawImport.id,
          targetTable: entry.targetTable,
          rawRecordsCount: 1,
          normalizedRecordsCount: 1,
          unmappedRecordsCount: 0,
          missingRequiredFields: [],
          missingOptionalFields: entry.report.missingFieldKeys,
          reconciliationStatus,
          reconciliationNotes: `${entry.bucketKey.replaceAll("_", " ")} mapped ${entry.report.filledFields}/${entry.report.totalMappedFields} fields.`,
          metadata: buildReconciliationMetadata({
            stock: valuationSummary.stock,
            sourceUrl: valuationSummary.rawImport.requestUrl,
            sourceRecordedAt: valuationSummary.rawImport.importedAt,
            extra: {
              rawImportId: valuationSummary.rawImport.id,
              tradeDate,
              fillPercentage: entry.report.fillPercentage,
            },
          }),
        });

        await safeSaveStockImportActivity({
          jobId,
          jobItemId,
          stock: valuationSummary.stock,
          yahooSymbol,
          moduleName: entry.bucketKey,
          stepName: "reconciliation_completed",
          status: reconciliationStatus === "completed" ? "completed" : "warning",
          message: `Reconciled ${entry.bucketKey.replaceAll("_", " ")} against ${entry.targetTable} for ${valuationSummary.stock.symbol}.`,
          rowsFetched: 1,
          rowsInserted: 1,
          mappedFieldsCount: entry.report.totalMappedFields,
          missingFieldsCount: entry.report.missingFields,
          fillPercentage: entry.report.fillPercentage,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          affectedTable: "stock_import_reconciliation",
          metadata: {
            rawImportId: valuationSummary.rawImport.id,
            reconciliationStatus,
            targetTable: entry.targetTable,
          },
        });
      }
    } catch (error) {
      if (!dryRun && isYahooProtectedEndpointUnavailableError(error)) {
        valuationUnavailableMessage =
          error instanceof Error ? error.message : "Yahoo valuation/statistics modules are unavailable.";
        warnings.push(
          `Yahoo valuation/statistics modules are currently unavailable for ${stock.symbol}. ${valuationUnavailableMessage}`,
        );
      } else {
        throw error;
      }
    }
    if (valuationUnavailableMessage) {
      for (const [bucketKey, report, targetTable] of [
        ["valuation_metrics", stats.valuationMetrics, "stock_valuation_metrics"],
        ["share_statistics", stats.shareStatistics, "stock_share_statistics"],
        ["financial_highlights", stats.financialHighlights, "stock_financial_highlights"],
      ] as const) {
        await persistUnavailableBucketOutcome({
          jobId,
          stock,
          yahooSymbol,
          bucketKey,
          targetTable,
          report,
          reason: valuationUnavailableMessage,
          rawImportId: null,
          sourceUrl: null,
          sourceRecordedAt: null,
          latestTradeDate: bucketKey === "financial_highlights" ? null : tradeDate,
          latestFiscalDate: bucketKey === "financial_highlights" ? tradeDate : null,
          rawRecordsCount: 0,
        });
      }
    }

    const warningItems = [
      snapshot.report,
      stats.valuationMetrics,
      stats.shareStatistics,
      stats.financialHighlights,
    ].filter((report) => report.missingFields > 0).length;

    const jobStatus: StockImportJobStatus =
      warningItems > 0 ? "completed_with_errors" : "completed";

    await updateStockImportJob({
      jobId,
      status: jobStatus,
      importedItems: 4 - warningItems,
      updatedItems: 0,
      skippedItems: 0,
      failedItems: 0,
      warningItems,
      metadata: {
        yahooSymbol,
        stockSlug: stock.slug,
        stockId: stock.stockId,
        rawImportIds,
        dryRun,
        force,
        refresh,
        snapshotTradeDate: snapshot.tradeDate,
        skippedExistingSnapshot: false,
        skippedExistingSnapshotCount: 0,
        skippedDuplicateRawResponseCount: [
          latestQuote.rawImport.deduplicated,
          valuationSummary?.rawImport.deduplicated,
        ].filter(Boolean).length,
        savedRequestsAvoided: [
          latestQuote.rawImport.deduplicated,
          valuationSummary?.rawImport.deduplicated,
        ].filter(Boolean).length,
        existingDataReused: 0,
        moduleDisabledStatus: {
          financial_statements: "manual_single_stock_only",
        },
        reports: {
          latestMarketSnapshot: snapshot.report,
          valuationMetrics: stats.valuationMetrics,
          shareStatistics: stats.shareStatistics,
          financialHighlights: stats.financialHighlights,
        },
        warnings,
      },
    });

    return {
      stock,
      jobId,
      jobStatus,
      rawImportIds,
      warnings,
      snapshotTradeDate: snapshot.tradeDate,
      skippedExistingSnapshot: false,
      savedRequestsAvoided: [
        latestQuote.rawImport.deduplicated,
        valuationSummary?.rawImport.deduplicated,
      ].filter(Boolean).length,
      existingDataReused: 0,
      reports: {
        latestMarketSnapshot: snapshot.report,
        valuationMetrics: stats.valuationMetrics,
        shareStatistics: stats.shareStatistics,
        financialHighlights: stats.financialHighlights,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Yahoo quote/statistics import failure.";

    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "quote_statistics",
      stepName: "import_failed",
      status: "failed",
      message: `Yahoo quote/statistics import failed for ${stock.symbol}.`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_errors",
      errorMessage: message,
        metadata: {
          rawImportIds,
          force,
          refresh,
        },
      });

    try {
      await logYahooImportError({
        jobId,
        stock,
        bucketKey: "quote_statistics",
        errorStage: "normalize",
        errorMessage: message,
        context: {
          yahooSymbol,
        },
      });
    } catch (importError) {
      console.error("[yahoo-finance-import] failed to log quote/statistics import error", importError);
    }

    try {
      await updateStockImportJob({
        jobId,
        status: "failed",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 0,
        failedItems: 1,
        warningItems: 0,
        metadata: {
          yahooSymbol,
          stockSlug: stock.slug,
          stockId: stock.stockId,
          rawImportIds,
          dryRun,
          force,
          refresh,
          error: message,
        },
      });
    } catch (jobError) {
      console.error("[yahoo-finance-import] failed to mark quote/statistics job failed", jobError);
    }

    throw new Error(message);
  }
}

export async function runYahooFinancialStatementsImport(
  input: YahooFinancialStatementsImportInput,
): Promise<YahooFinancialStatementsImportResult> {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase();
  if (!yahooSymbol) {
    throw new Error("Enter a Yahoo symbol such as RELIANCE.NS.");
  }

  const dryRun = input.dryRun === true;
  const manualTestMode = input.manualTestMode === true;
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Financial Statements Import";
  const stock = await resolveHistoricalImportStockTarget({
    yahooSymbol,
    stockId: input.stockId ?? null,
  });

  if (!stock.stockId) {
    throw new Error(
      `Yahoo symbol "${yahooSymbol}" could not be mapped to a durable stocks_master row.`,
    );
  }

  const jobId = await createStockImportJob({
    stock,
    actorEmail,
    yahooSymbol,
    jobKind: "financial_statements_import",
    importScope: "stock_financial_statements",
    totalItems: 6,
    metadata: {
      dryRun,
      requestedStockId: cleanString(input.stockId, 160) || null,
    },
  });

  let rawImportId: string | null = null;
  const warnings: string[] = [];

  try {
    const statementsFetchStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "financial_statements",
      stepName: "fetch_started",
      status: "running",
      message: `Fetching Yahoo financial statements for ${stock.symbol}.`,
      startedAt: statementsFetchStartedAt,
      affectedTable: "raw_yahoo_imports",
    });

    let financialStatements: Awaited<ReturnType<typeof fetchYahooFinancialStatements>> | null = null;
    let unavailableMessage: string | null = null;

    try {
      financialStatements = await fetchYahooFinancialStatements({
        yahooSymbol,
        jobId,
        dryRun,
      });
      rawImportId = financialStatements.rawImport.id;
    } catch (error) {
      if (!dryRun && isYahooProtectedEndpointUnavailableError(error)) {
        unavailableMessage =
          error instanceof Error ? error.message : "Yahoo financial statements are unavailable.";
        warnings.push(
          `Yahoo financial statement modules are currently unavailable for ${stock.symbol}. ${unavailableMessage}`,
        );
      } else {
        throw error;
      }
    }

    if (!financialStatements) {
      const unavailable = buildUnavailableFinancialStatementsReports();
      const unavailableEntries = [
        {
          bucketKey: "income_statement_annual",
          report: unavailable.reports.incomeStatementAnnual,
          targetTable: "stock_income_statement",
          latestFiscalDate: null,
        },
        {
          bucketKey: "income_statement_quarterly",
          report: unavailable.reports.incomeStatementQuarterly,
          targetTable: "stock_income_statement",
          latestFiscalDate: null,
        },
        {
          bucketKey: "balance_sheet_annual",
          report: unavailable.reports.balanceSheetAnnual,
          targetTable: "stock_balance_sheet",
          latestFiscalDate: null,
        },
        {
          bucketKey: "balance_sheet_quarterly",
          report: unavailable.reports.balanceSheetQuarterly,
          targetTable: "stock_balance_sheet",
          latestFiscalDate: null,
        },
        {
          bucketKey: "cash_flow_annual",
          report: unavailable.reports.cashFlowAnnual,
          targetTable: "stock_cash_flow",
          latestFiscalDate: null,
        },
        {
          bucketKey: "cash_flow_quarterly",
          report: unavailable.reports.cashFlowQuarterly,
          targetTable: "stock_cash_flow",
          latestFiscalDate: null,
        },
      ] as const;

      await safeSaveStockImportActivity({
        jobId,
        stock,
        yahooSymbol,
        moduleName: "financial_statements",
        stepName: "import_failed",
        status: "warning",
        message: `Yahoo financial statements are currently unavailable for ${stock.symbol}.`,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_errors",
        errorMessage: unavailableMessage,
        metadata: {
          rawImportId: null,
          unavailable: true,
          retryRecommendation: "Retry only the financial_statements module later.",
        },
      });

      for (const entry of unavailableEntries) {
        await persistUnavailableBucketOutcome({
          jobId,
          stock,
          yahooSymbol,
          bucketKey: entry.bucketKey,
          targetTable: entry.targetTable,
          report: entry.report,
          reason:
            unavailableMessage ??
            `Yahoo financial statement module ${entry.bucketKey} was unavailable.`,
          rawImportId: null,
          sourceUrl: null,
          sourceRecordedAt: null,
          latestFiscalDate: entry.latestFiscalDate,
          rawRecordsCount: 0,
        });
      }

      await updateStockImportJob({
        jobId,
        status: "completed_with_errors",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 0,
        failedItems: 0,
        warningItems: unavailableEntries.length,
        metadata: {
          yahooSymbol,
          stockSlug: stock.slug,
          stockId: stock.stockId,
          dryRun,
          manualTestMode,
          rawImportId: null,
          unavailable: true,
          skippedBlockedModule: false,
          savedRequestsAvoided: 0,
          reports: unavailable.reports,
          warnings,
        },
      });

      return {
        stock,
        jobId,
        jobStatus: "completed_with_errors",
        rawImportId: null,
        warnings,
        skippedBlockedModule: false,
        savedRequestsAvoided: 0,
        reports: unavailable.reports,
      };
    }

    await safeSaveStockImportActivity({
      jobId,
      stock: financialStatements.stock,
      yahooSymbol,
      moduleName: "financial_statements",
      stepName: "fetch_completed",
      status: "completed",
      message: `Fetched Yahoo financial statement payload for ${financialStatements.stock.symbol}.`,
      rowsFetched: 1,
      startedAt: statementsFetchStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: financialStatements.stock,
        sourceUrl: financialStatements.rawImport.requestUrl,
        sourceRecordedAt: financialStatements.rawImport.importedAt,
        extra: {
          rawImportId: financialStatements.rawImport.id,
          responseStatus: financialStatements.rawImport.responseStatus,
        },
      }),
    });

    await safeSaveStockImportActivity({
      jobId,
      stock: financialStatements.stock,
      yahooSymbol,
      moduleName: "financial_statements",
      stepName: "raw_saved",
      status: "completed",
      message: `Saved raw Yahoo financial statement payload for ${financialStatements.stock.symbol}.`,
      rowsFetched: 1,
      startedAt: financialStatements.rawImport.importedAt,
      completedAt: financialStatements.rawImport.importedAt,
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: financialStatements.stock,
        sourceUrl: financialStatements.rawImport.requestUrl,
        sourceRecordedAt: financialStatements.rawImport.importedAt,
        extra: {
          rawImportId: financialStatements.rawImport.id,
          sourceBucket: financialStatements.rawImport.sourceBucket,
        },
      }),
    });

    const statementsNormalizationStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock: financialStatements.stock,
      yahooSymbol,
      moduleName: "financial_statements",
      stepName: "normalization_started",
      status: "running",
      message: `Normalizing Yahoo financial statement buckets for ${financialStatements.stock.symbol}.`,
      rowsFetched: 1,
      startedAt: statementsNormalizationStartedAt,
      affectedTable: "stock_income_statement",
      metadata: {
        rawImportId: financialStatements.rawImport.id,
      },
    });

    const persisted = await persistYahooFinancialStatements({
      stock: financialStatements.stock,
      rawImport: financialStatements.rawImport,
      payload: financialStatements.payload,
    });

    const reportEntries = [
      {
        bucketKey: "income_statement_annual",
        actionTaken: "saved_income_statement_annual",
        report: persisted.reports.incomeStatementAnnual,
        rowCount: persisted.rowCounts.incomeStatementAnnual,
        rawRecordsCount: persisted.rawSourceCounts.incomeStatementAnnual,
        latestFiscalDate: persisted.latestFiscalDates.incomeStatementAnnual,
        targetTable: "stock_income_statement",
      },
      {
        bucketKey: "income_statement_quarterly",
        actionTaken: "saved_income_statement_quarterly",
        report: persisted.reports.incomeStatementQuarterly,
        rowCount: persisted.rowCounts.incomeStatementQuarterly,
        rawRecordsCount: persisted.rawSourceCounts.incomeStatementQuarterly,
        latestFiscalDate: persisted.latestFiscalDates.incomeStatementQuarterly,
        targetTable: "stock_income_statement",
      },
      {
        bucketKey: "balance_sheet_annual",
        actionTaken: "saved_balance_sheet_annual",
        report: persisted.reports.balanceSheetAnnual,
        rowCount: persisted.rowCounts.balanceSheetAnnual,
        rawRecordsCount: persisted.rawSourceCounts.balanceSheetAnnual,
        latestFiscalDate: persisted.latestFiscalDates.balanceSheetAnnual,
        targetTable: "stock_balance_sheet",
      },
      {
        bucketKey: "balance_sheet_quarterly",
        actionTaken: "saved_balance_sheet_quarterly",
        report: persisted.reports.balanceSheetQuarterly,
        rowCount: persisted.rowCounts.balanceSheetQuarterly,
        rawRecordsCount: persisted.rawSourceCounts.balanceSheetQuarterly,
        latestFiscalDate: persisted.latestFiscalDates.balanceSheetQuarterly,
        targetTable: "stock_balance_sheet",
      },
      {
        bucketKey: "cash_flow_annual",
        actionTaken: "saved_cash_flow_annual",
        report: persisted.reports.cashFlowAnnual,
        rowCount: persisted.rowCounts.cashFlowAnnual,
        rawRecordsCount: persisted.rawSourceCounts.cashFlowAnnual,
        latestFiscalDate: persisted.latestFiscalDates.cashFlowAnnual,
        targetTable: "stock_cash_flow",
      },
      {
        bucketKey: "cash_flow_quarterly",
        actionTaken: "saved_cash_flow_quarterly",
        report: persisted.reports.cashFlowQuarterly,
        rowCount: persisted.rowCounts.cashFlowQuarterly,
        rawRecordsCount: persisted.rawSourceCounts.cashFlowQuarterly,
        latestFiscalDate: persisted.latestFiscalDates.cashFlowQuarterly,
        targetTable: "stock_cash_flow",
      },
    ] as const;

    for (const entry of reportEntries) {
      if (entry.report.missingFields > 0) {
        warnings.push(
          `${entry.bucketKey} is missing ${entry.report.missingFields} of ${entry.report.totalMappedFields} mapped field${entry.report.totalMappedFields === 1 ? "" : "s"}.`,
        );
      }
      if (entry.rowCount === 0) {
        warnings.push(`${entry.bucketKey} returned no importable Yahoo rows.`);
      }

      const jobItemId = await saveStockImportJobItem({
        jobId,
        stock: financialStatements.stock,
        bucketKey: entry.bucketKey,
        itemKey: `${financialStatements.stock.symbol}:${entry.latestFiscalDate ?? "none"}:${entry.bucketKey}`,
        rowStatus:
          entry.rowCount === 0 || entry.report.missingFields > 0 ? "warning" : "imported",
        actionTaken: entry.actionTaken,
        rawImportId: financialStatements.rawImport.id,
        rawRow: financialStatements.payload,
        normalizedRow: {
          fiscalDate: entry.latestFiscalDate,
          rowCount: entry.rowCount,
          report: entry.report,
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId,
        stock: financialStatements.stock,
        yahooSymbol,
        moduleName: entry.bucketKey,
        stepName: "normalization_completed",
        status:
          entry.rowCount === 0 || entry.report.missingFields > 0 ? "warning" : "completed",
        message: `Normalized ${entry.bucketKey.replaceAll("_", " ")} for ${financialStatements.stock.symbol}.`,
        rowsFetched: entry.rawRecordsCount,
        rowsInserted: entry.rowCount,
        mappedFieldsCount: entry.report.totalMappedFields,
        missingFieldsCount: entry.report.missingFields,
        fillPercentage: entry.report.fillPercentage,
        startedAt: statementsNormalizationStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: entry.targetTable,
        metadata: {
          rawImportId: financialStatements.rawImport.id,
          latestFiscalDate: entry.latestFiscalDate,
          periodType: entry.bucketKey.endsWith("_quarterly") ? "quarterly" : "annual",
        },
      });

      await persistFieldCoverageReport({
        stock: financialStatements.stock,
        jobId,
        bucketKey: entry.bucketKey,
        report: entry.report,
        rawImportId: financialStatements.rawImport.id,
        sourceUrl: financialStatements.rawImport.requestUrl,
        sourceRecordedAt: financialStatements.rawImport.importedAt,
        latestFiscalDate: entry.latestFiscalDate,
        rowCount: entry.rowCount,
        rowsAvailable: entry.report.totalMappedFields,
        rowsImported: entry.report.filledFields,
        metadata: {
          periodType: entry.bucketKey.endsWith("_quarterly") ? "quarterly" : "annual",
          statementTable: entry.report.tableName,
        },
        notes: `Normalized ${entry.bucketKey} for ${financialStatements.stock.symbol}. Filled ${entry.report.filledFields} of ${entry.report.totalMappedFields} mapped fields across ${entry.rowCount} statement row${entry.rowCount === 1 ? "" : "s"}.`,
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId,
        stock: financialStatements.stock,
        yahooSymbol,
        moduleName: entry.bucketKey,
        stepName: "coverage_updated",
        status:
          entry.rowCount === 0 || entry.report.missingFields > 0 ? "warning" : "completed",
        message: `Updated ${entry.bucketKey.replaceAll("_", " ")} coverage for ${financialStatements.stock.symbol}.`,
        rowsFetched: entry.rawRecordsCount,
        rowsInserted: entry.rowCount,
        mappedFieldsCount: entry.report.totalMappedFields,
        missingFieldsCount: entry.report.missingFields,
        fillPercentage: entry.report.fillPercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_coverage",
        metadata: {
          rawImportId: financialStatements.rawImport.id,
          bucketKey: entry.bucketKey,
        },
      });

      const reconciliationStatus = buildReconciliationStatus({
        normalizedRecordsCount: entry.rowCount,
        missingRequiredFields: entry.rowCount === 0 ? ["statement_rows"] : [],
        missingOptionalFields: entry.report.missingFieldKeys,
      });

      await safeSaveStockImportReconciliation({
        jobId,
        stock: financialStatements.stock,
        yahooSymbol,
        moduleName: entry.bucketKey,
        rawImportId: financialStatements.rawImport.id,
        targetTable: entry.targetTable,
        rawRecordsCount: entry.rawRecordsCount,
        normalizedRecordsCount: entry.rowCount,
        unmappedRecordsCount: Math.max(0, entry.rawRecordsCount - entry.rowCount),
        missingRequiredFields: entry.rowCount === 0 ? ["statement_rows"] : [],
        missingOptionalFields: entry.report.missingFieldKeys,
        reconciliationStatus,
        reconciliationNotes: `Normalized ${entry.rowCount} of ${entry.rawRecordsCount} raw statement row${entry.rawRecordsCount === 1 ? "" : "s"} for ${entry.bucketKey}.`,
        metadata: buildReconciliationMetadata({
          stock: financialStatements.stock,
          sourceUrl: financialStatements.rawImport.requestUrl,
          sourceRecordedAt: financialStatements.rawImport.importedAt,
          extra: {
            rawImportId: financialStatements.rawImport.id,
            latestFiscalDate: entry.latestFiscalDate,
            periodType: entry.bucketKey.endsWith("_quarterly") ? "quarterly" : "annual",
            fillPercentage: entry.report.fillPercentage,
          },
        }),
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId,
        stock: financialStatements.stock,
        yahooSymbol,
        moduleName: entry.bucketKey,
        stepName: "reconciliation_completed",
        status: reconciliationStatus === "completed" ? "completed" : "warning",
        message: `Reconciled ${entry.bucketKey.replaceAll("_", " ")} against ${entry.targetTable} for ${financialStatements.stock.symbol}.`,
        rowsFetched: entry.rawRecordsCount,
        rowsInserted: entry.rowCount,
        mappedFieldsCount: entry.report.totalMappedFields,
        missingFieldsCount: entry.report.missingFields,
        fillPercentage: entry.report.fillPercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_reconciliation",
        metadata: {
          rawImportId: financialStatements.rawImport.id,
          reconciliationStatus,
          targetTable: entry.targetTable,
        },
      });
    }

    const warningItems = reportEntries.filter(
      (entry) => entry.rowCount === 0 || entry.report.missingFields > 0,
    ).length;
    const jobStatus: StockImportJobStatus =
      warningItems > 0 ? "completed_with_errors" : "completed";

    await updateStockImportJob({
      jobId,
      status: jobStatus,
      importedItems: reportEntries.length - warningItems,
      updatedItems: 0,
      skippedItems: 0,
      failedItems: 0,
      warningItems,
        metadata: {
          yahooSymbol,
          stockSlug: stock.slug,
          stockId: stock.stockId,
          rawImportId: financialStatements.rawImport.id,
          manualTestMode,
          skippedBlockedModule: false,
          skippedDuplicateRawResponseCount: financialStatements.rawImport.deduplicated ? 1 : 0,
          savedRequestsAvoided: financialStatements.rawImport.deduplicated ? 1 : 0,
          reports: persisted.reports,
          rowCounts: persisted.rowCounts,
          latestFiscalDates: persisted.latestFiscalDates,
          dryRun,
          warnings,
      },
    });

    return {
      stock,
      jobId,
      jobStatus,
      rawImportId: financialStatements.rawImport.id,
      warnings,
      skippedBlockedModule: false,
      savedRequestsAvoided: financialStatements.rawImport.deduplicated ? 1 : 0,
      reports: persisted.reports,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Yahoo financial statements import failure.";

    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "financial_statements",
      stepName: "import_failed",
      status: "failed",
      message: `Yahoo financial statements import failed for ${stock.symbol}.`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_errors",
      errorMessage: message,
      metadata: {
        rawImportId,
      },
    });

    try {
      await logYahooImportError({
        jobId,
        stock,
        bucketKey: "financial_statements",
        errorStage: "normalize",
        errorMessage: message,
        context: {
          yahooSymbol,
          rawImportId,
        },
      });
    } catch (importError) {
      console.error("[yahoo-finance-import] failed to log financial statements import error", importError);
    }

    try {
      await updateStockImportJob({
        jobId,
        status: "failed",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 0,
        failedItems: 1,
        warningItems: 0,
        metadata: {
          yahooSymbol,
          stockSlug: stock.slug,
          stockId: stock.stockId,
          dryRun,
          manualTestMode,
          rawImportId,
          error: message,
        },
      });
    } catch (jobError) {
      console.error("[yahoo-finance-import] failed to mark financial statements job failed", jobError);
    }

    throw new Error(message);
  }
}

export async function runYahooDailySameDayOnlyImport(
  input: YahooDailySameDayOnlyImportInput,
): Promise<YahooDailySameDayOnlyImportResult> {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase();
  if (!yahooSymbol) {
    throw new Error("Enter a Yahoo symbol such as RELIANCE.NS.");
  }

  const targetDate = normalizeIsoDateOrToday(input.targetDate);
  const force = input.force === true;
  const dryRun = input.dryRun === true;
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Daily Same-Day-Only Import";
  const stock = await resolveHistoricalImportStockTarget({
    yahooSymbol,
    stockId: input.stockId ?? null,
  });

  if (!stock.stockId) {
    throw new Error(
      `Yahoo symbol "${yahooSymbol}" could not be mapped to a durable stocks_master row.`,
    );
  }

  const targetDateExistingHistory = await loadExistingHistoricalTradeDatesInRange({
    stockId: stock.stockId,
    startDate: targetDate,
    endDate: targetDate,
  });
  const targetDateExistingSnapshot = await loadExistingSnapshotForTradeDate({
    stockId: stock.stockId,
    tradeDate: targetDate,
  });

  const targetHistoryAlreadyExists = targetDateExistingHistory.has(targetDate);
  const targetSnapshotAlreadyExists = Boolean(targetDateExistingSnapshot);

  const jobId = await createStockImportJob({
    stock,
    actorEmail,
    yahooSymbol,
    jobKind: "daily_same_day_only_import",
    importScope: "stock_price_history,stock_market_snapshot",
    totalItems: 2,
    metadata: {
      mode: "daily_same_day_only",
      targetDate,
      dryRun,
      force,
      requestedStockId: cleanString(input.stockId, 160) || null,
      targetHistoryAlreadyExists,
      targetSnapshotAlreadyExists,
    },
  });

  const warnings: string[] = [];
  let rawImportId: string | null = null;
  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let snapshotInserted = false;
  let snapshotSkipped = false;
  let effectiveTradeDate: string | null = null;
  let effectiveHistoricalRow: YahooSameDayHistoricalRow | null = null;
  let usedLatestAvailableTradingDate = false;
  let noData = false;
  let historicalReport = buildHistoricalRowCoverageReport(null);
  let snapshotReport = buildUnavailableLatestMarketSnapshotReport();

  try {
    if (!force && targetHistoryAlreadyExists && targetSnapshotAlreadyExists) {
      const historicalJobItemId = await saveStockImportJobItem({
        jobId,
        stock,
        bucketKey: "historical_prices",
        itemKey: `${stock.symbol}:${targetDate}:same_day_only_history`,
        rowStatus: "skipped",
        actionTaken: "skipped_existing_history",
        normalizedRow: {
          tradeDate: targetDate,
          mode: "daily_same_day_only",
          skipReason: "target_trade_date_already_exists",
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: historicalJobItemId,
        stock,
        yahooSymbol,
        moduleName: "historical_prices",
        stepName: "skipped_existing_history_rows",
        status: "completed",
        message: `Skipped same-day historical write for ${stock.symbol} because ${targetDate} already exists.`,
        rowsFetched: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_price_history",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          skipReason: "target_trade_date_already_exists",
        },
      });

      await safeSaveStockImportReconciliation({
        jobId,
        stock,
        yahooSymbol,
        moduleName: "historical_prices",
        rawImportId: null,
        targetTable: "stock_price_history",
        rawRecordsCount: 0,
        normalizedRecordsCount: 1,
        unmappedRecordsCount: 0,
        missingRequiredFields: [],
        missingOptionalFields: [],
        reconciliationStatus: "completed",
        reconciliationNotes: `Reused existing ${targetDate} stock_price_history row for ${stock.symbol}.`,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          reusedExistingData: true,
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: historicalJobItemId,
        stock,
        yahooSymbol,
        moduleName: "historical_prices",
        stepName: "reconciliation_completed",
        status: "completed",
        message: `Reconciled reused same-day history against stock_price_history for ${stock.symbol}.`,
        rowsFetched: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_reconciliation",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          reusedExistingData: true,
        },
      });

      const snapshotJobItemId = await saveStockImportJobItem({
        jobId,
        stock,
        bucketKey: "latest_market_snapshot",
        itemKey: `${stock.symbol}:${targetDate}:same_day_only_snapshot`,
        rowStatus: "skipped",
        actionTaken: "skipped_existing_snapshot",
        normalizedRow: {
          tradeDate: targetDate,
          mode: "daily_same_day_only",
          skipReason: "target_trade_date_already_exists",
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: snapshotJobItemId,
        stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "skipped_existing_snapshot",
        status: "completed",
        message: `Skipped same-day snapshot write for ${stock.symbol} because ${targetDate} already exists.`,
        rowsFetched: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_market_snapshot",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          skipReason: "target_trade_date_already_exists",
        },
      });

      await safeSaveStockImportReconciliation({
        jobId,
        stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        rawImportId: null,
        targetTable: "stock_market_snapshot",
        rawRecordsCount: 0,
        normalizedRecordsCount: 1,
        unmappedRecordsCount: 0,
        missingRequiredFields: [],
        missingOptionalFields: [],
        reconciliationStatus: "completed",
        reconciliationNotes: `Reused existing ${targetDate} stock_market_snapshot row for ${stock.symbol}.`,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          reusedExistingData: true,
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: snapshotJobItemId,
        stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "reconciliation_completed",
        status: "completed",
        message: `Reconciled reused same-day snapshot against stock_market_snapshot for ${stock.symbol}.`,
        rowsFetched: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_reconciliation",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          reusedExistingData: true,
        },
      });

      skippedRows = 2;
      effectiveTradeDate = targetDate;
      snapshotSkipped = true;
      historicalReport = buildHistoricalRowCoverageReport({
        tradeDate: targetDate,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        adjClose: null,
        volume: null,
      });
      snapshotReport = buildSnapshotReportFromStoredRow(targetDateExistingSnapshot as Record<string, unknown>);

      await updateStockImportJob({
        jobId,
        status: "completed",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 2,
        failedItems: 0,
        warningItems: 0,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          effectiveTradeDate,
          dryRun,
          force,
          noData: false,
          usedLatestAvailableTradingDate: false,
          skippedExistingHistory: true,
          skippedExistingSnapshot: true,
          savedRequestsAvoided: 1,
          existingDataReused: 2,
        },
      });

      return {
        stock,
        jobId,
        jobStatus: "completed",
        rawImportId: null,
        targetDate,
        effectiveTradeDate,
        usedLatestAvailableTradingDate: false,
        noData: false,
        insertedRows,
        updatedRows,
        skippedRows,
        snapshotInserted,
        snapshotSkipped,
        effectiveHistoricalRow: null,
        warnings,
        reports: {
          historicalPrices: historicalReport,
          latestMarketSnapshot: snapshotReport,
        },
      };
    }

    const fetchStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "daily_same_day_only",
      stepName: "fetch_started",
      status: "running",
      message: `Fetching Yahoo chart history for ${stock.symbol} in strict same-day-only mode for target date ${targetDate}.`,
      startedAt: fetchStartedAt,
      affectedTable: "raw_yahoo_imports",
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        periodStartDate: shiftIsoDateByDays(targetDate, -10),
        periodEndDate: targetDate,
      },
    });

    const historical = await fetchYahooHistoricalPriceData({
      yahooSymbol,
      range: "1mo",
      interval: "1d",
      periodStartDate: shiftIsoDateByDays(targetDate, -10),
      periodEndDate: targetDate,
      events: "div,splits",
      jobId,
      dryRun,
    });
    rawImportId = historical.rawImport.id;

    await safeSaveStockImportActivity({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "daily_same_day_only",
      stepName: "fetch_completed",
      status: "completed",
      message: `Fetched ${historical.rows.length} chart row${historical.rows.length === 1 ? "" : "s"} for strict same-day-only processing of ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      startedAt: fetchStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: historical.stock,
        sourceUrl: historical.rawImport.requestUrl,
        sourceRecordedAt: historical.rawImport.importedAt,
        extra: {
          mode: "daily_same_day_only",
          targetDate,
          rawImportId: historical.rawImport.id,
          responseStatus: historical.rawImport.responseStatus,
        },
      }),
    });

    await safeSaveStockImportActivity({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "daily_same_day_only",
      stepName: "raw_saved",
      status: "completed",
      message: `Saved raw Yahoo chart payload for strict same-day-only processing of ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      startedAt: historical.rawImport.importedAt,
      completedAt: historical.rawImport.importedAt,
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: historical.stock,
        sourceUrl: historical.rawImport.requestUrl,
        sourceRecordedAt: historical.rawImport.importedAt,
        extra: {
          mode: "daily_same_day_only",
          targetDate,
          rawImportId: historical.rawImport.id,
          deduplicatedRawResponse: historical.rawImport.deduplicated,
        },
      }),
    });

    const selectedRow = selectEffectiveHistoricalRowForTargetDate(historical.rows, targetDate);
    effectiveTradeDate = selectedRow.effectiveRow?.tradeDate ?? null;
    effectiveHistoricalRow = toSameDayHistoricalRow(selectedRow.effectiveRow);
    usedLatestAvailableTradingDate = selectedRow.usedLatestAvailableTradingDate;

    if (usedLatestAvailableTradingDate && effectiveTradeDate) {
      warnings.push(
        `Target date ${targetDate} had no direct Yahoo bar for ${historical.stock.symbol}. Used latest available trading date ${effectiveTradeDate}.`,
      );
    }

    const normalizationStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "daily_same_day_only",
      stepName: "normalization_started",
      status: "running",
      message: `Normalizing strict same-day-only chart output for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      startedAt: normalizationStartedAt,
      affectedTable: "stock_price_history",
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        rawImportId: historical.rawImport.id,
      },
    });

    const isolationCheck = validateYahooSameDayHistoricalSourceIsolation({
      requestedYahooSymbol: yahooSymbol,
      resolvedYahooSymbol: historical.stock.yahooSymbol,
      rawImportYahooSymbol: historical.rawImport.yahooSymbol,
      requestUrl: historical.rawImport.requestUrl,
      payload: historical.payload,
      targetDate,
      effectiveRow: effectiveHistoricalRow,
    });

    if (!isolationCheck.ok) {
      throw new Error(
        `Strict same-day-only source isolation failed for ${historical.stock.symbol}. ${isolationCheck.issues.join(" ")}`,
      );
    }

    if (!selectedRow.effectiveRow || !effectiveTradeDate) {
      noData = true;
      historicalReport = buildHistoricalRowCoverageReport(null);
      snapshotReport = buildUnavailableLatestMarketSnapshotReport();

      const noDataMessage = `Yahoo chart returned no usable bar on or before ${targetDate} for ${historical.stock.symbol}.`;
      warnings.push(noDataMessage);

      const historicalJobItemId = await saveStockImportJobItem({
        jobId,
        stock: historical.stock,
        bucketKey: "historical_prices",
        itemKey: `${historical.stock.symbol}:${targetDate}:same_day_only_history`,
        rowStatus: "warning",
        actionTaken: "no_data_for_target_trade_date",
        rawImportId: historical.rawImport.id,
        rawRow: historical.payload as Record<string, unknown>,
        normalizedRow: {
          targetDate,
          effectiveTradeDate: null,
          noData: true,
          mode: "daily_same_day_only",
        },
      });

      await safeSaveStockImportReconciliation({
        jobId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "historical_prices",
        rawImportId: historical.rawImport.id,
        targetTable: "stock_price_history",
        rawRecordsCount: historical.rows.length,
        normalizedRecordsCount: 0,
        unmappedRecordsCount: historical.rows.length,
        missingRequiredFields: ["target_trade_date_bar"],
        missingOptionalFields: [],
        reconciliationStatus: "no_data",
        reconciliationNotes: noDataMessage,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: historicalJobItemId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "historical_prices",
        stepName: "reconciliation_completed",
        status: "warning",
        message: noDataMessage,
        rowsFetched: historical.rows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        startedAt: normalizationStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_reconciliation",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          noData: true,
        },
      });

      const snapshotJobItemId = await saveStockImportJobItem({
        jobId,
        stock: historical.stock,
        bucketKey: "latest_market_snapshot",
        itemKey: `${historical.stock.symbol}:${targetDate}:same_day_only_snapshot`,
        rowStatus: "warning",
        actionTaken: "no_data_for_target_trade_date",
        rawImportId: historical.rawImport.id,
        rawRow: historical.payload as Record<string, unknown>,
        normalizedRow: {
          targetDate,
          effectiveTradeDate: null,
          noData: true,
          mode: "daily_same_day_only",
        },
      });

      await safeSaveStockImportReconciliation({
        jobId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        rawImportId: historical.rawImport.id,
        targetTable: "stock_market_snapshot",
        rawRecordsCount: historical.rows.length,
        normalizedRecordsCount: 0,
        unmappedRecordsCount: historical.rows.length,
        missingRequiredFields: ["target_trade_date_bar"],
        missingOptionalFields: [],
        reconciliationStatus: "no_data",
        reconciliationNotes: noDataMessage,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: snapshotJobItemId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "reconciliation_completed",
        status: "warning",
        message: `No chart-derived same-day snapshot could be written for ${historical.stock.symbol}.`,
        rowsFetched: historical.rows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        startedAt: normalizationStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "stock_import_reconciliation",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          noData: true,
        },
      });

      await updateStockImportJob({
        jobId,
        status: "completed_with_errors",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 0,
        failedItems: 0,
        warningItems: 2,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          effectiveTradeDate: null,
          dryRun,
          force,
          noData: true,
          usedLatestAvailableTradingDate,
          rawImportId: historical.rawImport.id,
          warnings,
        },
      });

      return {
        stock: historical.stock,
        jobId,
        jobStatus: "completed_with_errors",
        rawImportId: historical.rawImport.id,
        targetDate,
        effectiveTradeDate: null,
        usedLatestAvailableTradingDate,
        noData: true,
        insertedRows,
        updatedRows,
        skippedRows,
        snapshotInserted,
        snapshotSkipped,
        effectiveHistoricalRow: null,
        warnings,
        reports: {
          historicalPrices: historicalReport,
          latestMarketSnapshot: snapshotReport,
        },
      };
    }

    historicalReport = buildHistoricalRowCoverageReport(selectedRow.effectiveRow);

    const effectiveHistoryAlreadyExists = await loadExistingHistoricalTradeDatesInRange({
      stockId: historical.stock.stockId!,
      startDate: effectiveTradeDate,
      endDate: effectiveTradeDate,
    });

    let historicalJobItemId: string | null = null;
    if (!force && effectiveHistoryAlreadyExists.has(effectiveTradeDate)) {
      skippedRows += 1;
      historicalJobItemId = await saveStockImportJobItem({
        jobId,
        stock: historical.stock,
        bucketKey: "historical_prices",
        itemKey: `${historical.stock.symbol}:${effectiveTradeDate}:same_day_only_history`,
        rowStatus: "skipped",
        actionTaken: "skipped_existing_history",
        rawImportId: historical.rawImport.id,
        rawRow: historical.payload as Record<string, unknown>,
        normalizedRow: {
          targetDate,
          effectiveTradeDate,
          mode: "daily_same_day_only",
          skipReason: "effective_trade_date_already_exists",
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: historicalJobItemId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "historical_prices",
        stepName: "skipped_existing_history_rows",
        status: "completed",
        message: `Skipped strict same-day-only history write for ${historical.stock.symbol} because ${effectiveTradeDate} already exists.`,
        rowsFetched: 1,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        startedAt: normalizationStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "stock_price_history",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          effectiveTradeDate,
          usedLatestAvailableTradingDate,
        },
      });
    } else {
      const persistedHistorical = await persistYahooHistoricalDailyRows({
        jobId,
        stock: historical.stock,
        rawImport: historical.rawImport,
        rows: [selectedRow.effectiveRow],
        duplicateMode: force ? "replace_matching_dates" : "skip_existing_dates",
        force,
      });
      insertedRows += persistedHistorical.insertedRows;
      updatedRows += persistedHistorical.updatedRows;
      skippedRows += persistedHistorical.skippedRows;

      historicalJobItemId = await saveStockImportJobItem({
        jobId,
        stock: historical.stock,
        bucketKey: "historical_prices",
        itemKey: `${historical.stock.symbol}:${effectiveTradeDate}:same_day_only_history`,
        rowStatus:
          persistedHistorical.insertedRows > 0
            ? "imported"
            : persistedHistorical.updatedRows > 0
              ? "updated"
              : "skipped",
        actionTaken:
          persistedHistorical.insertedRows > 0
            ? "inserted_same_day_history"
            : persistedHistorical.updatedRows > 0
              ? "updated_same_day_history"
              : "skipped_existing_history",
        rawImportId: historical.rawImport.id,
        rawRow: historical.payload as Record<string, unknown>,
        normalizedRow: {
          targetDate,
          effectiveTradeDate,
          mode: "daily_same_day_only",
          insertedRows: persistedHistorical.insertedRows,
          updatedRows: persistedHistorical.updatedRows,
          skippedRows: persistedHistorical.skippedRows,
        },
      });
    }

    await safeSaveStockImportReconciliation({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      rawImportId: historical.rawImport.id,
      targetTable: "stock_price_history",
      rawRecordsCount: 1,
      normalizedRecordsCount: 1,
      unmappedRecordsCount: 0,
      missingRequiredFields: [],
      missingOptionalFields: historicalReport.missingFieldKeys,
      reconciliationStatus: buildReconciliationStatus({
        normalizedRecordsCount: 1,
        missingOptionalFields: historicalReport.missingFieldKeys,
      }),
      reconciliationNotes: `Processed strict same-day-only historical row for ${historical.stock.symbol} using effective trade date ${effectiveTradeDate}.`,
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        effectiveTradeDate,
        usedLatestAvailableTradingDate,
      },
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: historicalJobItemId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "reconciliation_completed",
      status: historicalReport.missingFields > 0 ? "warning" : "completed",
      message: `Reconciled strict same-day-only history against stock_price_history for ${historical.stock.symbol}.`,
      rowsFetched: 1,
      rowsInserted: insertedRows,
      rowsUpdated: updatedRows,
      rowsSkipped: skippedRows,
      mappedFieldsCount: historicalReport.totalMappedFields,
      missingFieldsCount: historicalReport.missingFields,
      fillPercentage: historicalReport.fillPercentage,
      startedAt: normalizationStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_reconciliation",
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        effectiveTradeDate,
        usedLatestAvailableTradingDate,
      },
    });

    const effectiveSnapshotExisting = await loadExistingSnapshotForTradeDate({
      stockId: historical.stock.stockId!,
      tradeDate: effectiveTradeDate,
    });
    const syntheticSnapshotPayload = buildSyntheticQuotePayloadFromHistoricalPayload({
      payload: historical.payload as Record<string, unknown>,
      yahooSymbol,
      selectedTradeDate: effectiveTradeDate,
    });

    let snapshotJobItemId: string | null = null;
    if (!force && effectiveSnapshotExisting) {
      snapshotSkipped = true;
      skippedRows += 1;
      snapshotReport = buildSnapshotReportFromStoredRow(effectiveSnapshotExisting as Record<string, unknown>);
      snapshotJobItemId = await saveStockImportJobItem({
        jobId,
        stock: historical.stock,
        bucketKey: "latest_market_snapshot",
        itemKey: `${historical.stock.symbol}:${effectiveTradeDate}:same_day_only_snapshot`,
        rowStatus: "skipped",
        actionTaken: "skipped_existing_snapshot",
        rawImportId: historical.rawImport.id,
        rawRow: syntheticSnapshotPayload,
        normalizedRow: {
          targetDate,
          effectiveTradeDate,
          mode: "daily_same_day_only",
          skipReason: "effective_trade_date_snapshot_already_exists",
        },
      });

      await safeSaveStockImportActivity({
        jobId,
        jobItemId: snapshotJobItemId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "skipped_existing_snapshot",
        status: "completed",
        message: `Skipped strict same-day-only snapshot write for ${historical.stock.symbol} because ${effectiveTradeDate} already exists.`,
        rowsFetched: 1,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 1,
        startedAt: normalizationStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "stock_market_snapshot",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          effectiveTradeDate,
          usedLatestAvailableTradingDate,
        },
      });
    } else {
      const snapshot = await persistStockMarketSnapshot({
        stock: historical.stock,
        rawImport: historical.rawImport,
        payload: syntheticSnapshotPayload,
        refreshExistingToday: force,
      });
      snapshotReport = snapshot.report;
      snapshotInserted = true;

      await safeSaveStockImportActivity({
        jobId,
        stock: historical.stock,
        yahooSymbol,
        moduleName: "latest_market_snapshot",
        stepName: "snapshot_write_completed",
        status: "completed",
        message: `Saved strict same-day-only snapshot row for ${historical.stock.symbol}.`,
        rowsFetched: 1,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsSkipped: 0,
        mappedFieldsCount: snapshot.report.totalMappedFields,
        missingFieldsCount: snapshot.report.missingFields,
        fillPercentage: snapshot.report.fillPercentage,
        startedAt: normalizationStartedAt,
        completedAt: new Date().toISOString(),
        affectedTable: "stock_market_snapshot",
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          effectiveTradeDate,
          usedLatestAvailableTradingDate,
          rawImportId: historical.rawImport.id,
        },
      });

      snapshotJobItemId = await saveStockImportJobItem({
        jobId,
        stock: historical.stock,
        bucketKey: "latest_market_snapshot",
        itemKey: `${historical.stock.symbol}:${effectiveTradeDate}:same_day_only_snapshot`,
        rowStatus: snapshot.report.missingFields > 0 ? "warning" : "imported",
        actionTaken: "saved_same_day_snapshot",
        rawImportId: historical.rawImport.id,
        rawRow: syntheticSnapshotPayload,
        normalizedRow: {
          targetDate,
          effectiveTradeDate,
          mode: "daily_same_day_only",
          report: snapshot.report,
        },
      });
    }

    await safeSaveStockImportReconciliation({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      rawImportId: historical.rawImport.id,
      targetTable: "stock_market_snapshot",
      rawRecordsCount: 1,
      normalizedRecordsCount: 1,
      unmappedRecordsCount: 0,
      missingRequiredFields: [],
      missingOptionalFields: snapshotReport.missingFieldKeys,
      reconciliationStatus: buildReconciliationStatus({
        normalizedRecordsCount: 1,
        missingOptionalFields: snapshotReport.missingFieldKeys,
      }),
      reconciliationNotes: `Processed strict same-day-only market snapshot for ${historical.stock.symbol} using effective trade date ${effectiveTradeDate}.`,
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        effectiveTradeDate,
        usedLatestAvailableTradingDate,
      },
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: snapshotJobItemId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "latest_market_snapshot",
      stepName: "reconciliation_completed",
      status: snapshotReport.missingFields > 0 ? "warning" : "completed",
      message: `Reconciled strict same-day-only snapshot against stock_market_snapshot for ${historical.stock.symbol}.`,
      rowsFetched: 1,
      rowsInserted: snapshotInserted ? 1 : 0,
      rowsUpdated: 0,
      rowsSkipped: snapshotSkipped ? 1 : 0,
      mappedFieldsCount: snapshotReport.totalMappedFields,
      missingFieldsCount: snapshotReport.missingFields,
      fillPercentage: snapshotReport.fillPercentage,
      startedAt: normalizationStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_reconciliation",
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        effectiveTradeDate,
        usedLatestAvailableTradingDate,
      },
    });

    const jobStatus: StockImportJobStatus = warnings.length > 0 ? "completed_with_errors" : "completed";
    await updateStockImportJob({
      jobId,
      status: jobStatus,
      importedItems: insertedRows + Number(snapshotInserted),
      updatedItems: updatedRows,
      skippedItems: skippedRows,
      failedItems: 0,
      warningItems: warnings.length > 0 ? 1 : 0,
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        effectiveTradeDate,
        dryRun,
        force,
        noData,
        usedLatestAvailableTradingDate,
        rawImportId: historical.rawImport.id,
        insertedRows,
        updatedRows,
        skippedRows,
        snapshotInserted,
        snapshotSkipped,
        warnings,
      },
    });

    return {
      stock: historical.stock,
      jobId,
      jobStatus,
      rawImportId: historical.rawImport.id,
      targetDate,
      effectiveTradeDate,
      usedLatestAvailableTradingDate,
      noData,
      insertedRows,
      updatedRows,
      skippedRows,
      snapshotInserted,
      snapshotSkipped,
      effectiveHistoricalRow,
      warnings,
      reports: {
        historicalPrices: historicalReport,
        latestMarketSnapshot: snapshotReport,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Yahoo daily same-day-only import failure.";

    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "daily_same_day_only",
      stepName: "import_failed",
      status: "failed",
      message: `Yahoo daily same-day-only import failed for ${stock.symbol}.`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_errors",
      errorMessage: message,
      metadata: {
        mode: "daily_same_day_only",
        targetDate,
        rawImportId,
      },
    });

    try {
      await logYahooImportError({
        jobId,
        stock,
        bucketKey: "daily_same_day_only",
        errorStage: "normalize",
        errorMessage: message,
        context: {
          yahooSymbol,
          targetDate,
          rawImportId,
        },
      });
    } catch (importError) {
      console.error("[yahoo-finance-import] failed to log daily same-day-only import error", importError);
    }

    try {
      await updateStockImportJob({
        jobId,
        status: "failed",
        importedItems: insertedRows + Number(snapshotInserted),
        updatedItems: updatedRows,
        skippedItems: skippedRows,
        failedItems: 1,
        warningItems: 0,
        metadata: {
          mode: "daily_same_day_only",
          targetDate,
          effectiveTradeDate,
          rawImportId,
          error: message,
          dryRun,
          force,
        },
      });
    } catch (jobError) {
      console.error("[yahoo-finance-import] failed to mark daily same-day-only job failed", jobError);
    }

    throw new Error(message);
  }
}

export async function runYahooHistoricalOhlcvImport(
  input: YahooHistoricalOhlcvImportInput,
): Promise<YahooHistoricalOhlcvImportResult> {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase();
  if (!yahooSymbol) {
    throw new Error("Enter a Yahoo symbol such as RELIANCE.NS.");
  }

  const period = normalizeHistoryPeriod(input.period);
  const interval = normalizeDailyInterval(input.interval);
  const duplicateMode = input.duplicateMode ?? "replace_matching_dates";
  const dryRun = input.dryRun === true;
  const force = input.force === true;
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Historical Import";
  const stock = await resolveHistoricalImportStockTarget({
    yahooSymbol,
    stockId: input.stockId ?? null,
  });

  if (!stock.stockId) {
    throw new Error(
      `Yahoo symbol "${yahooSymbol}" could not be mapped to a durable stocks_master row.`,
    );
  }

  const existingHistoricalWindow = await loadExistingHistoricalWindowSummary(stock.stockId);
  const fetchPlan = buildHistoricalFetchPlan({
    requestedPeriod: period,
    force,
    existing: existingHistoricalWindow,
  });

  const jobId = await createStockImportJob({
    stock,
    actorEmail,
    yahooSymbol,
    jobKind: "historical_ohlcv_import",
    importScope: "stock_price_history",
    totalItems: 1,
    metadata: {
      period,
      interval,
      duplicateMode,
      dryRun,
      force,
      mode: fetchPlan.mode,
      fetchWindow: fetchPlan,
      existingHistoricalWindow,
      requestedStockId: cleanString(input.stockId, 160) || null,
    },
  });

  const warnings: string[] = [];
  let rawImportId: string | null = null;

  try {
    const fetchStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "fetch_started",
      status: "running",
      message: `Fetching Yahoo daily history for ${stock.symbol} using ${fetchPlan.mode} mode.`,
      startedAt: fetchStartedAt,
      affectedTable: "raw_yahoo_imports",
      metadata: {
        period: fetchPlan.period,
        interval,
        duplicateMode,
        effectiveDuplicateMode: force ? duplicateMode : "skip_existing_dates",
        force,
        mode: fetchPlan.mode,
        periodStartDate: fetchPlan.periodStartDate,
        periodEndDate: fetchPlan.periodEndDate,
        existingHistoricalWindow,
      },
    });

    const historical = await fetchYahooHistoricalPriceData({
      yahooSymbol,
      range: fetchPlan.period ?? period,
      interval,
      periodStartDate: fetchPlan.periodStartDate,
      periodEndDate: fetchPlan.periodEndDate,
      events: "div,splits",
      jobId,
      dryRun,
    });
    rawImportId = historical.rawImport.id;

    await safeSaveStockImportActivity({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "fetch_completed",
      status: "completed",
      message: `Fetched ${historical.rows.length} Yahoo historical row${historical.rows.length === 1 ? "" : "s"} for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      startedAt: fetchStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: historical.stock,
        sourceUrl: historical.rawImport.requestUrl,
        sourceRecordedAt: historical.rawImport.importedAt,
        extra: {
          rawImportId: historical.rawImport.id,
          responseStatus: historical.rawImport.responseStatus,
          period: fetchPlan.period,
          interval,
          mode: fetchPlan.mode,
          periodStartDate: fetchPlan.periodStartDate,
          periodEndDate: fetchPlan.periodEndDate,
          deduplicatedRawResponse: historical.rawImport.deduplicated,
        },
      }),
    });

    await safeSaveStockImportActivity({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "raw_saved",
      status: "completed",
      message: historical.rawImport.deduplicated
        ? `Skipped duplicate failed raw Yahoo payload save and reused the existing raw row for ${historical.stock.symbol}.`
        : `Saved raw Yahoo historical payload for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      startedAt: historical.rawImport.importedAt,
      completedAt: historical.rawImport.importedAt,
      affectedTable: "raw_yahoo_imports",
      metadata: buildReconciliationMetadata({
        stock: historical.stock,
        sourceUrl: historical.rawImport.requestUrl,
        sourceRecordedAt: historical.rawImport.importedAt,
        extra: {
          rawImportId: historical.rawImport.id,
          responseStatus: historical.rawImport.responseStatus,
          period: fetchPlan.period,
          interval,
          mode: fetchPlan.mode,
          periodStartDate: fetchPlan.periodStartDate,
          periodEndDate: fetchPlan.periodEndDate,
          sourceBucket: historical.rawImport.sourceBucket,
          deduplicatedRawResponse: historical.rawImport.deduplicated,
          linkedRawImportId: historical.rawImport.linkedRawImportId,
        },
      }),
    });

    if (!historical.rows.length) {
      throw new Error(`Yahoo Finance did not return any daily OHLCV rows for "${yahooSymbol}".`);
    }

    const normalizationStartedAt = new Date().toISOString();
    await safeSaveStockImportActivity({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "normalization_started",
      status: "running",
      message: `Normalizing Yahoo historical rows into stock_price_history for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      startedAt: normalizationStartedAt,
      affectedTable: "stock_price_history",
      metadata: {
        rawImportId: historical.rawImport.id,
        duplicateMode,
        effectiveDuplicateMode: force ? duplicateMode : "skip_existing_dates",
        force,
        mode: fetchPlan.mode,
      },
    });

    const persisted = await persistYahooHistoricalDailyRows({
      jobId,
      stock: historical.stock,
      rawImport: historical.rawImport,
      rows: historical.rows,
      duplicateMode,
      force,
    });

    if (persisted.coverage.missingDatesCount > 0) {
      warnings.push(
        `Detected ${persisted.coverage.missingDatesCount} weekday gap${persisted.coverage.missingDatesCount === 1 ? "" : "s"} in the Yahoo historical series.`,
      );
    }

    const rowStatus: StockImportJobItemStatus =
      persisted.insertedRows > 0
        ? "imported"
        : persisted.updatedRows > 0
          ? "updated"
          : "skipped";

    const actionTaken =
      rowStatus === "imported"
        ? "inserted_daily_history"
        : rowStatus === "updated"
          ? "updated_existing_history"
          : "skipped_existing_history";

    const coverageStatus: "current" | "partial" =
      persisted.coverage.completionPercentage >= 99.99 ? "current" : "partial";

    const coverageNotes = `Imported Yahoo daily history for ${historical.stock.symbol}. Inserted ${persisted.insertedRows}, updated ${persisted.updatedRows}, skipped ${persisted.skippedRows}. Latest available date: ${persisted.coverage.lastAvailableDate ?? "unknown"}.`;

    const historicalFieldSummary = buildHistoricalFieldSummary(historical.rows);

    const historicalJobItemId = await saveStockImportJobItem({
      jobId,
      stock: historical.stock,
      bucketKey: "historical_prices",
      itemKey: `${historical.stock.symbol}:${period}:${interval}`,
      rowStatus,
      actionTaken,
      rawImportId: historical.rawImport.id,
      rawRow: {
        yahooSymbol,
        period: fetchPlan.period ?? period,
        interval,
        duplicateMode: persisted.effectiveDuplicateMode,
        rowCount: historical.rows.length,
      },
      normalizedRow: {
        tradeDate: persisted.coverage.lastAvailableDate,
        firstAvailableDate: persisted.coverage.firstAvailableDate,
        lastAvailableDate: persisted.coverage.lastAvailableDate,
        insertedRows: persisted.insertedRows,
        updatedRows: persisted.updatedRows,
        skippedRows: persisted.skippedRows,
        missingDatesCount: persisted.coverage.missingDatesCount,
        completionPercentage: persisted.coverage.completionPercentage,
        mode: fetchPlan.mode,
        effectiveDuplicateMode: persisted.effectiveDuplicateMode,
        },
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: historicalJobItemId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "normalization_completed",
      status: warnings.length > 0 || historicalFieldSummary.missingFieldsCount > 0 ? "warning" : "completed",
      message: `Normalized Yahoo historical daily rows for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      rowsInserted: persisted.insertedRows,
      rowsUpdated: persisted.updatedRows,
      rowsSkipped: persisted.skippedRows,
      mappedFieldsCount: historicalFieldSummary.mappedFieldsCount,
      missingFieldsCount: historicalFieldSummary.missingFieldsCount,
      fillPercentage: historicalFieldSummary.fillPercentage,
      startedAt: normalizationStartedAt,
      completedAt: new Date().toISOString(),
      affectedTable: "stock_price_history",
      metadata: {
        rawImportId: historical.rawImport.id,
        duplicateMode: persisted.effectiveDuplicateMode,
        mode: fetchPlan.mode,
        firstAvailableDate: persisted.coverage.firstAvailableDate,
        lastAvailableDate: persisted.coverage.lastAvailableDate,
        deduplicatedRawResponse: historical.rawImport.deduplicated,
      },
    });

    await persistHistoricalImportCoverage({
      stock: historical.stock,
      jobId,
      period: fetchPlan.period ?? period,
      interval,
      rawImportId: historical.rawImport.id,
      sourceUrl: historical.rawImport.requestUrl,
      sourceRecordedAt: historical.rawImport.importedAt,
      coverageStatus,
      coverage: persisted.coverage,
      warningCount: warnings.length,
      errorCount: 0,
      coverageNotes,
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: historicalJobItemId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "coverage_updated",
      status: warnings.length > 0 ? "warning" : "completed",
      message: `Updated historical coverage for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      rowsInserted: persisted.insertedRows,
      rowsUpdated: persisted.updatedRows,
      rowsSkipped: persisted.skippedRows,
      fillPercentage: persisted.coverage.completionPercentage,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_coverage",
      metadata: {
        rawImportId: historical.rawImport.id,
        coverageStatus,
        coverageNotes,
        mode: fetchPlan.mode,
        effectiveDuplicateMode: persisted.effectiveDuplicateMode,
      },
    });

    const historicalReconciliationStatus = buildReconciliationStatus({
      normalizedRecordsCount: persisted.totalProcessedRows,
      missingOptionalFields: historicalFieldSummary.missingOptionalFields,
    });

    await safeSaveStockImportReconciliation({
      jobId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      rawImportId: historical.rawImport.id,
      targetTable: "stock_price_history",
      rawRecordsCount: historical.rows.length,
      normalizedRecordsCount: persisted.totalProcessedRows,
      unmappedRecordsCount: Math.max(0, historical.rows.length - persisted.totalProcessedRows),
      missingRequiredFields: [],
      missingOptionalFields: historicalFieldSummary.missingOptionalFields,
      reconciliationStatus: historicalReconciliationStatus,
      reconciliationNotes: coverageNotes,
      metadata: buildReconciliationMetadata({
        stock: historical.stock,
        sourceUrl: historical.rawImport.requestUrl,
        sourceRecordedAt: historical.rawImport.importedAt,
        extra: {
          rawImportId: historical.rawImport.id,
          duplicateMode: persisted.effectiveDuplicateMode,
          mode: fetchPlan.mode,
          insertedRows: persisted.insertedRows,
          updatedRows: persisted.updatedRows,
          skippedRows: persisted.skippedRows,
          completionPercentage: persisted.coverage.completionPercentage,
        },
      }),
    });

    await safeSaveStockImportActivity({
      jobId,
      jobItemId: historicalJobItemId,
      stock: historical.stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "reconciliation_completed",
      status: historicalReconciliationStatus === "completed" ? "completed" : "warning",
      message: `Reconciled Yahoo historical rows against stock_price_history for ${historical.stock.symbol}.`,
      rowsFetched: historical.rows.length,
      rowsInserted: persisted.insertedRows,
      rowsUpdated: persisted.updatedRows,
      rowsSkipped: persisted.skippedRows,
      mappedFieldsCount: historicalFieldSummary.mappedFieldsCount,
      missingFieldsCount: historicalFieldSummary.missingFieldsCount,
      fillPercentage: historicalFieldSummary.fillPercentage,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_reconciliation",
      metadata: {
        rawImportId: historical.rawImport.id,
        reconciliationStatus: historicalReconciliationStatus,
        rawRecordsCount: historical.rows.length,
        normalizedRecordsCount: persisted.totalProcessedRows,
        mode: fetchPlan.mode,
      },
    });

    const jobStatus: StockImportJobStatus = warnings.length > 0 ? "completed_with_errors" : "completed";
    await updateStockImportJob({
      jobId,
      status: jobStatus,
      importedItems: rowStatus === "imported" ? 1 : 0,
      updatedItems: rowStatus === "updated" ? 1 : 0,
      skippedItems: rowStatus === "skipped" ? 1 : 0,
      failedItems: 0,
      warningItems: warnings.length > 0 ? 1 : 0,
      metadata: {
        yahooSymbol,
        stockSlug: historical.stock.slug,
        stockId: historical.stock.stockId,
        period: fetchPlan.period ?? period,
        interval,
        duplicateMode: persisted.effectiveDuplicateMode,
        rawImportId: historical.rawImport.id,
        insertedRows: persisted.insertedRows,
        updatedRows: persisted.updatedRows,
        skippedRows: persisted.skippedRows,
        totalProcessedRows: persisted.totalProcessedRows,
        coverage: persisted.coverage,
        mode: fetchPlan.mode,
        forceApplied: force,
        fetchWindow: fetchPlan,
        skippedExistingHistory: persisted.skippedRows,
        skippedExistingHistoryCount: persisted.skippedRows,
        skippedDuplicateRawResponseCount: historical.rawImport.deduplicated ? 1 : 0,
        savedRequestsAvoided: historical.rawImport.deduplicated ? 1 : 0,
        existingDataReused: persisted.skippedRows,
        dryRun,
        warnings,
      },
    });

    return {
      stock: historical.stock,
      jobId,
      jobStatus,
      rawImportId: historical.rawImport.id,
      period,
      interval,
      insertedRows: persisted.insertedRows,
      updatedRows: persisted.updatedRows,
      skippedRows: persisted.skippedRows,
      totalProcessedRows: persisted.totalProcessedRows,
      coverage: persisted.coverage,
      warnings,
      mode: fetchPlan.mode,
      forceApplied: force,
      savedRequestsAvoided: historical.rawImport.deduplicated ? 1 : 0,
      existingDataReused: persisted.skippedRows,
      effectiveDuplicateMode: persisted.effectiveDuplicateMode,
      fetchWindow: {
        period: fetchPlan.period,
        periodStartDate: fetchPlan.periodStartDate,
        periodEndDate: fetchPlan.periodEndDate,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Yahoo historical OHLCV import failure.";

    await safeSaveStockImportActivity({
      jobId,
      stock,
      yahooSymbol,
      moduleName: "historical_prices",
      stepName: "import_failed",
      status: "failed",
      message: `Yahoo historical import failed for ${stock.symbol}.`,
      rowsFetched: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      affectedTable: "stock_import_errors",
      errorMessage: message,
      metadata: {
        rawImportId,
        period,
        interval,
        duplicateMode,
      },
    });

    try {
      await saveStockImportJobItem({
        jobId,
        stock,
        bucketKey: "historical_prices",
        itemKey: `${stock.symbol}:${period}:${interval}`,
        rowStatus: "failed",
        actionTaken: "historical_import_failed",
        rawImportId,
        rawRow: {
          yahooSymbol,
          period: fetchPlan.period ?? period,
          interval,
          duplicateMode,
          mode: fetchPlan.mode,
          force,
          error: message,
        },
        normalizedRow: {},
      });
    } catch (jobItemError) {
      console.error("[yahoo-finance-import] failed to save historical job item", jobItemError);
    }

    try {
      await logYahooImportError({
        jobId,
        stock,
        bucketKey: "historical_prices",
        errorStage: "historical_import",
        errorMessage: message,
        context: {
          yahooSymbol,
          period: fetchPlan.period ?? period,
          interval,
          duplicateMode,
          dryRun,
          rawImportId,
          mode: fetchPlan.mode,
          force,
        },
      });
    } catch (importError) {
      console.error("[yahoo-finance-import] failed to log historical import error", importError);
    }

    try {
      await persistHistoricalImportCoverage({
        stock,
        jobId,
        period: fetchPlan.period ?? period,
        interval,
        rawImportId,
        sourceUrl: null,
        sourceRecordedAt: null,
        coverageStatus: "error",
        coverage: {
          firstAvailableDate: null,
          lastAvailableDate: null,
          totalRowsAvailable: 0,
          totalRowsImported: 0,
          totalRowsRetained: 0,
          missingDatesCount: 0,
          completionPercentage: 0,
        },
        warningCount: 0,
        errorCount: 1,
        coverageNotes: message,
      });
    } catch (coverageError) {
      console.error("[yahoo-finance-import] failed to save historical coverage error", coverageError);
    }

    try {
      await updateStockImportJob({
        jobId,
        status: "failed",
        importedItems: 0,
        updatedItems: 0,
        skippedItems: 0,
        failedItems: 1,
        warningItems: 0,
        metadata: {
        yahooSymbol,
        stockSlug: stock.slug,
        stockId: stock.stockId,
        period: fetchPlan.period ?? period,
        interval,
        duplicateMode,
        rawImportId,
        error: message,
        mode: fetchPlan.mode,
        force,
      },
    });
    } catch (jobError) {
      console.error("[yahoo-finance-import] failed to mark historical job failed", jobError);
    }

    throw new Error(message);
  }
}

export async function runYahooHistoricalOhlcvImportBatch(
  input: YahooHistoricalOhlcvImportBatchInput,
): Promise<YahooHistoricalOhlcvImportBatchResult> {
  const requestedStocks = input.stocks.filter(
    (stock) => cleanString(stock.yahooSymbol, 80) || cleanString(stock.stockId, 160),
  );

  const results: YahooHistoricalOhlcvImportResult[] = [];
  const failures: YahooHistoricalOhlcvImportBatchResult["failures"] = [];

  for (const stock of requestedStocks) {
    try {
      const result = await runYahooHistoricalOhlcvImport({
        yahooSymbol: stock.yahooSymbol,
        stockId: stock.stockId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorUserId: input.actorUserId ?? null,
        period: input.period ?? null,
        interval: input.interval ?? "1d",
        duplicateMode: input.duplicateMode ?? "replace_matching_dates",
      });
      results.push(result);
    } catch (error) {
      failures.push({
        yahooSymbol: cleanString(stock.yahooSymbol, 80).toUpperCase(),
        stockId: cleanString(stock.stockId, 160) || null,
        error: error instanceof Error ? error.message : "Unknown Yahoo historical import failure.",
      });
    }
  }

  return {
    requestedCount: requestedStocks.length,
    completedCount: results.length,
    failedCount: failures.length,
    results,
    failures,
  };
}

export async function runYahooDryRunImport(
  input: YahooDryRunImportInput = {},
): Promise<YahooDryRunImportResult> {
  const yahooSymbol = cleanString(input.yahooSymbol, 80).toUpperCase() || "RELIANCE.NS";
  const historical = await runYahooHistoricalOhlcvImport({
    yahooSymbol,
    stockId: input.stockId ?? null,
    actorEmail: input.actorEmail ?? "Yahoo Dry Run Import",
    actorUserId: input.actorUserId ?? null,
    period: input.period ?? "max",
    interval: input.interval ?? "1d",
    duplicateMode: input.duplicateMode ?? "replace_matching_dates",
    dryRun: true,
  });

  const quoteStatistics = await runYahooQuoteStatisticsImport({
    yahooSymbol,
    stockId: historical.stock.stockId,
    actorEmail: input.actorEmail ?? "Yahoo Dry Run Import",
    actorUserId: input.actorUserId ?? null,
    dryRun: true,
  });

  const financialStatements = await runYahooFinancialStatementsImport({
    yahooSymbol,
    stockId: historical.stock.stockId,
    actorEmail: input.actorEmail ?? "Yahoo Dry Run Import",
    actorUserId: input.actorUserId ?? null,
    dryRun: true,
  });

  return {
    dryRun: true,
    yahooSymbol,
    stock: historical.stock,
    historical,
    quoteStatistics,
    financialStatements,
  };
}
