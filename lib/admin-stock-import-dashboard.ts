import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withDevelopmentTiming } from "@/lib/supabase/shared";
import { getYahooOperationalConfig } from "@/lib/yahoo-finance-service";

type JsonRecord = Record<string, unknown>;

export type AdminStockImportCoverageRow = {
  bucketKey: string;
  coverageStatus: string;
  latestTradeDate: string | null;
  latestFiscalDate: string | null;
  latestImportedAt: string | null;
  rowsAvailable: number;
  rowsImported: number;
  rowCount: number;
  warningCount: number;
  errorCount: number;
  coverageNotes: string | null;
  completionPercentage: number;
  fillPercentage: number;
  filledFields: number;
  missingFields: number;
  missingFieldKeys: string[];
  filledFieldKeys: string[];
  metadata: Record<string, unknown>;
};

export type AdminStockImportDashboardRow = {
  stockId: string;
  slug: string;
  symbol: string;
  companyName: string;
  yahooSymbol: string | null;
  route: string;
  editorHref: string;
  importable: boolean;
  historicalCompleted: boolean;
  latestSnapshotCompleted: boolean;
  valuationCompleted: boolean;
  financialsCompleted: boolean;
  failed: boolean;
  pending: boolean;
  importPercentage: number;
  latestResult: "completed" | "pending" | "error" | "not_started";
  lastSuccessfulImportAt: string | null;
  latestError: string | null;
  rowsImportedInLatestSuccess: number;
  nextRecommendedAction: string;
  dataQualityScore: number;
  missingModuleCount: number;
  warningCount: number;
  errorCount: number;
  hasRecentErrors: boolean;
  priceDataFocusedScore: boolean;
};

export type AdminStockImportDashboardSummary = {
  totalStocks: number;
  stocksWithHistoricalDataCompleted: number;
  stocksWithLatestSnapshotCompleted: number;
  stocksWithValuationDataCompleted: number;
  stocksWithFinancialsCompleted: number;
  failedImports: number;
  pendingImports: number;
  lastSuccessfulImportDate: string | null;
};

export type AdminStockImportActivityRow = {
  id: string;
  jobId: string | null;
  jobItemId: string | null;
  stockId: string | null;
  yahooSymbol: string | null;
  moduleName: string;
  stepName: string;
  status: string;
  message: string | null;
  rowsFetched: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  mappedFieldsCount: number;
  missingFieldsCount: number;
  fillPercentage: number;
  affectedTable: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type AdminStockImportReconciliationRow = {
  id: string;
  jobId: string | null;
  stockId: string | null;
  yahooSymbol: string | null;
  moduleName: string;
  rawImportId: string | null;
  targetTable: string;
  rawRecordsCount: number;
  normalizedRecordsCount: number;
  unmappedRecordsCount: number;
  missingRequiredFields: string[];
  missingOptionalFields: string[];
  reconciliationStatus: string;
  reconciliationNotes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminYahooOperationalSummary = {
  latestBatchStatus: "running" | "paused" | "cooling_down" | "failed" | "completed" | "stopped" | "not_started";
  currentRequestPace: string;
  requestsUsedCurrentHour: number;
  maxRequestsPerHour: number;
  requestsUsedToday: number;
  maxRequestsPerDay: number;
  savedRequestsAvoided: number;
  existingDataReused: number;
  skipBreakdown: {
    skippedExistingHistory: number;
    skippedExistingSnapshot: number;
    skippedBlockedModule: number;
    skippedDuplicateRawResponse: number;
  };
  disabledModules: Record<string, string>;
  cooldownStatus: string;
  cooldownUntil: string | null;
  lastYahooError: string | null;
  activeWorkers: number;
  maxConcurrentWorkers: number;
};

export type AdminStockImportDashboardData = {
  summary: AdminStockImportDashboardSummary;
  yahooOperations: AdminYahooOperationalSummary;
  stocks: AdminStockImportDashboardRow[];
  latestActivity: AdminStockImportActivityRow[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  warnings: string[];
};

export type AdminStockDataQualitySummaryRow = {
  stockId: string;
  yahooSymbol: string | null;
  hasHistoricalPrices: boolean;
  historicalFirstDate: string | null;
  historicalLastDate: string | null;
  historicalRowCount: number;
  hasLatestSnapshot: boolean;
  hasValuationMetrics: boolean;
  hasFinancialStatements: boolean;
  missingModuleCount: number;
  warningCount: number;
  errorCount: number;
  overallDataScore: number;
  lastImportAt: string | null;
  updatedAt: string | null;
  priceDataFocused: boolean;
  hasRecentErrors: boolean;
};

export type AdminStockImportDetails = {
  stock: AdminStockImportDashboardRow;
  coverageRows: AdminStockImportCoverageRow[];
  latestPriceHistoryRows: JsonRecord[];
  latestMarketSnapshotRows: JsonRecord[];
  latestValuationMetrics: JsonRecord | null;
  latestShareStatistics: JsonRecord | null;
  latestFinancialHighlights: JsonRecord | null;
  incomeStatementAnnualRows: JsonRecord[];
  incomeStatementQuarterlyRows: JsonRecord[];
  balanceSheetAnnualRows: JsonRecord[];
  balanceSheetQuarterlyRows: JsonRecord[];
  cashFlowAnnualRows: JsonRecord[];
  cashFlowQuarterlyRows: JsonRecord[];
  dividendRows: JsonRecord[];
  splitRows: JsonRecord[];
  earningsEventRows: JsonRecord[];
  earningsTrendRows: JsonRecord[];
  analystRatingRows: JsonRecord[];
  holdersSummaryRows: JsonRecord[];
  holdersDetailRows: JsonRecord[];
  optionsRows: JsonRecord[];
  newsRows: JsonRecord[];
  importJobs: JsonRecord[];
  importErrors: JsonRecord[];
  rawImports: JsonRecord[];
  activityTimeline: AdminStockImportActivityRow[];
  reconciliationRows: AdminStockImportReconciliationRow[];
  retryRecommendation: string;
  warnings: string[];
};

type StockMasterRow = {
  id: string;
  slug: string;
  symbol: string;
  company_name: string | null;
  yahoo_symbol: string | null;
};

const VALUATION_BUCKET_KEYS = [
  "valuation_metrics",
  "share_statistics",
  "financial_highlights",
] as const;

const FINANCIAL_BUCKET_GROUPS = {
  incomeStatement: ["income_statement_annual", "income_statement_quarterly"],
  balanceSheet: ["balance_sheet_annual", "balance_sheet_quarterly"],
  cashFlow: ["cash_flow_annual", "cash_flow_quarterly"],
} as const;

const RECENT_ERROR_LOOKBACK_DAYS = 14;

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function numericOrZero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeStringRecord(value: unknown) {
  const record = normalizeMetadata(value);
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, item]) => [cleanString(key, 160), cleanString(item, 4000)])
      .filter(([key, item]) => key && item),
  ) as Record<string, string>;
}

function ensureAdminStockImportReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Admin stock import dashboard requires durable Supabase admin credentials in this environment.",
    );
  }
}

async function safeSelectRows(
  warnings: string[],
  table: string,
  selectClause: string,
  configure?: (query: any) => any,
) {
  try {
    const supabase = createSupabaseAdminClient();
    let query: any = supabase.from(table).select(selectClause);
    if (configure) {
      query = configure(query);
    }
    const { data, error } = await query;
    if (error) {
      warnings.push(`${table}: ${error.message}`);
      return [] as JsonRecord[];
    }
    return Array.isArray(data) ? (data as JsonRecord[]) : [];
  } catch (error) {
    warnings.push(`${table}: ${error instanceof Error ? error.message : "Unknown read failure."}`);
    return [] as JsonRecord[];
  }
}

async function safeSelectSingle(
  warnings: string[],
  table: string,
  selectClause: string,
  configure?: (query: any) => any,
) {
  const rows = await safeSelectRows(warnings, table, selectClause, (query) => {
    const scoped = configure ? configure(query) : query;
    return scoped.limit(1);
  });
  return rows[0] ?? null;
}

function normalizeCoverageRow(row: JsonRecord): AdminStockImportCoverageRow {
  const metadata = normalizeMetadata(row.metadata);
  return {
    bucketKey: cleanString(row.bucket_key, 160),
    coverageStatus: cleanString(row.coverage_status, 120) || "missing",
    latestTradeDate: cleanString(row.latest_trade_date, 120) || null,
    latestFiscalDate: cleanString(row.latest_fiscal_date, 120) || null,
    latestImportedAt: cleanString(row.latest_imported_at, 120) || null,
    rowsAvailable: numericOrZero(row.rows_available),
    rowsImported: numericOrZero(row.rows_imported),
    rowCount: numericOrZero(row.row_count),
    warningCount: numericOrZero(row.warning_count),
    errorCount: numericOrZero(row.error_count),
    coverageNotes: cleanString(row.coverage_notes, 4000) || null,
    completionPercentage: numericOrZero(metadata.completionPercentage),
    fillPercentage: numericOrZero(metadata.fillPercentage),
    filledFields: numericOrZero(metadata.filledFields),
    missingFields: numericOrZero(metadata.missingFields),
    missingFieldKeys: Array.isArray(metadata.missingFieldKeys)
      ? metadata.missingFieldKeys.map((item) => cleanString(item, 160)).filter(Boolean)
      : [],
    filledFieldKeys: Array.isArray(metadata.filledFieldKeys)
      ? metadata.filledFieldKeys.map((item) => cleanString(item, 160)).filter(Boolean)
      : [],
    metadata,
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, 240)).filter(Boolean)
    : [];
}

function normalizeActivityRow(row: JsonRecord): AdminStockImportActivityRow {
  return {
    id: cleanString(row.id, 160),
    jobId: cleanString(row.job_id, 160) || null,
    jobItemId: cleanString(row.job_item_id, 160) || null,
    stockId: cleanString(row.stock_id, 160) || null,
    yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
    moduleName: cleanString(row.module_name, 160) || "unknown_module",
    stepName: cleanString(row.step_name, 160) || "unknown_step",
    status: cleanString(row.status, 120) || "unknown",
    message: cleanString(row.message, 4000) || null,
    rowsFetched: numericOrZero(row.rows_fetched),
    rowsInserted: numericOrZero(row.rows_inserted),
    rowsUpdated: numericOrZero(row.rows_updated),
    rowsSkipped: numericOrZero(row.rows_skipped),
    mappedFieldsCount: numericOrZero(row.mapped_fields_count),
    missingFieldsCount: numericOrZero(row.missing_fields_count),
    fillPercentage: numericOrZero(row.fill_percentage),
    affectedTable: cleanString(row.affected_table, 160) || null,
    startedAt: cleanString(row.started_at, 120) || null,
    completedAt: cleanString(row.completed_at, 120) || null,
    errorMessage: cleanString(row.error_message, 4000) || null,
    metadata: normalizeMetadata(row.metadata),
  };
}

function normalizeReconciliationRow(row: JsonRecord): AdminStockImportReconciliationRow {
  return {
    id: cleanString(row.id, 160),
    jobId: cleanString(row.job_id, 160) || null,
    stockId: cleanString(row.stock_id, 160) || null,
    yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
    moduleName: cleanString(row.module_name, 160) || "unknown_module",
    rawImportId: cleanString(row.raw_import_id, 160) || null,
    targetTable: cleanString(row.target_table, 160) || "unknown_table",
    rawRecordsCount: numericOrZero(row.raw_records_count),
    normalizedRecordsCount: numericOrZero(row.normalized_records_count),
    unmappedRecordsCount: numericOrZero(row.unmapped_records_count),
    missingRequiredFields: normalizeStringArray(row.missing_required_fields),
    missingOptionalFields: normalizeStringArray(row.missing_optional_fields),
    reconciliationStatus: cleanString(row.reconciliation_status, 120) || "unknown",
    reconciliationNotes: cleanString(row.reconciliation_notes, 4000) || null,
    metadata: normalizeMetadata(row.metadata),
    createdAt: cleanString(row.created_at, 120) || null,
    updatedAt: cleanString(row.updated_at, 120) || null,
  };
}

function getCoverageValue(row: AdminStockImportCoverageRow | null | undefined) {
  if (!row) {
    return 0;
  }
  if (row.completionPercentage > 0) {
    return row.completionPercentage;
  }
  if (row.fillPercentage > 0) {
    return row.fillPercentage;
  }
  if (row.rowCount > 0 && row.rowsAvailable <= 0) {
    return 100;
  }
  if (row.rowsAvailable > 0) {
    return Number(((row.rowsImported / row.rowsAvailable) * 100).toFixed(2));
  }
  return 0;
}

function hasCoverageData(row: AdminStockImportCoverageRow | null | undefined) {
  return Boolean(
    row &&
      (row.rowCount > 0 ||
        row.rowsImported > 0 ||
        row.filledFields > 0 ||
        row.coverageStatus === "current" ||
        row.coverageStatus === "partial" ||
        getCoverageValue(row) > 0),
  );
}

function buildStockDataQualitySummary(input: {
  stock: StockMasterRow;
  coverageRows: AdminStockImportCoverageRow[];
  latestJob: JsonRecord | null;
  latestSuccessfulJob: JsonRecord | null;
  latestError: JsonRecord | null;
  errorRows: JsonRecord[];
}): AdminStockDataQualitySummaryRow {
  const coverageMap = new Map(input.coverageRows.map((row) => [row.bucketKey, row]));
  const historicalRow = coverageMap.get("historical_prices");
  const latestSnapshotRow = coverageMap.get("latest_market_snapshot");
  const valuationRow = coverageMap.get("valuation_metrics");
  const incomeGroup = FINANCIAL_BUCKET_GROUPS.incomeStatement.map((key) => coverageMap.get(key) ?? null);
  const balanceGroup = FINANCIAL_BUCKET_GROUPS.balanceSheet.map((key) => coverageMap.get(key) ?? null);
  const cashGroup = FINANCIAL_BUCKET_GROUPS.cashFlow.map((key) => coverageMap.get(key) ?? null);

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

  const warningCount = input.coverageRows.reduce((sum, row) => sum + row.warningCount, 0);
  const errorCount =
    input.errorRows.length + input.coverageRows.reduce((sum, row) => sum + row.errorCount, 0);
  const recentErrorCutoff = getRecentErrorCutoffIso();
  const hasRecentErrors =
    input.errorRows.some((row) => cleanString(row.imported_at, 120) >= recentErrorCutoff) ||
    cleanString(
      input.latestError?.imported_at ?? input.latestJob?.updated_at ?? input.latestJob?.completed_at,
      120,
    ) >= recentErrorCutoff;

  const overallDataScore =
    (hasHistoricalPrices ? 50 : 0) +
    (hasLatestSnapshot ? 25 : 0) +
    (hasValuationMetrics ? 10 : 0) +
    (hasFinancialStatements ? 10 : 0) +
    (!hasRecentErrors ? 5 : 0);

  return {
    stockId: input.stock.id,
    yahooSymbol: cleanString(input.stock.yahoo_symbol, 160) || null,
    hasHistoricalPrices,
    historicalFirstDate:
      cleanString(historicalRow?.metadata.firstAvailableDate, 120) ||
      findEarliestIso([historicalRow?.latestTradeDate ?? null]),
    historicalLastDate:
      cleanString(historicalRow?.metadata.lastAvailableDate, 120) ||
      findLatestIso([historicalRow?.latestTradeDate ?? null]),
    historicalRowCount:
      numericOrZero(historicalRow?.metadata.totalRowsRetained) || historicalRow?.rowCount || 0,
    hasLatestSnapshot,
    hasValuationMetrics,
    hasFinancialStatements,
    missingModuleCount,
    warningCount,
    errorCount,
    overallDataScore,
    lastImportAt: findLatestIso([
      cleanString(input.latestSuccessfulJob?.completed_at, 120) || null,
      cleanString(input.latestJob?.completed_at, 120) || null,
      cleanString(input.latestJob?.updated_at, 120) || null,
      ...input.coverageRows.map((row) => row.latestImportedAt),
    ]),
    updatedAt: new Date().toISOString(),
    priceDataFocused: true,
    hasRecentErrors,
  };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function findLatestIso(values: Array<string | null>) {
  return (
    values
      .filter(Boolean)
      .sort((left, right) => cleanString(right, 120).localeCompare(cleanString(left, 120)))[0] ??
    null
  );
}

function findEarliestIso(values: Array<string | null>) {
  return (
    values
      .filter(Boolean)
      .sort((left, right) => cleanString(left, 120).localeCompare(cleanString(right, 120)))[0] ??
    null
  );
}

function getRecentErrorCutoffIso() {
  return new Date(Date.now() - RECENT_ERROR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function latestDateDesc(left: string | null, right: string | null) {
  return cleanString(right, 120).localeCompare(cleanString(left, 120));
}

function readPositiveEnvNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBatchWorkerStaleAfterMs() {
  return Math.max(30_000, readPositiveEnvNumber("YAHOO_BATCH_WORKER_STALE_AFTER_MS", 120_000));
}

function parseBatchVisibleStatus(row: JsonRecord | null) {
  if (!row) {
    return "not_started" as const;
  }
  const status = cleanString(row.status, 120);
  const metadata = normalizeMetadata(row.metadata);
  const cooldownUntil = cleanString(metadata.cooldownUntil, 120);
  const cooldownAt = cooldownUntil ? Date.parse(cooldownUntil) : Number.NaN;
  const controlState = cleanString(metadata.controlState, 120);
  if (Number.isFinite(cooldownAt) && cooldownAt > Date.now()) {
    return "cooling_down" as const;
  }
  if (controlState === "paused" || controlState === "pause_requested") {
    return "paused" as const;
  }
  if (status === "failed") {
    return "failed" as const;
  }
  if (status === "completed" || status === "completed_with_errors") {
    return "completed" as const;
  }
  if (status === "cancelled") {
    return "stopped" as const;
  }
  return "running" as const;
}

function hasFreshActiveWorker(metadata: Record<string, unknown>) {
  const activeWorkerId = cleanString(metadata.activeWorkerId, 160);
  if (!activeWorkerId) {
    return false;
  }
  const latestHeartbeatAt = cleanString(metadata.latestHeartbeatAt, 120);
  if (!latestHeartbeatAt) {
    return true;
  }
  const parsed = Date.parse(latestHeartbeatAt);
  if (!Number.isFinite(parsed)) {
    return true;
  }
  return Date.now() - parsed < getBatchWorkerStaleAfterMs();
}

async function countTableRowsSince(
  warnings: string[],
  table: string,
  timeColumn: string,
  sinceIso: string,
  filters?: Record<string, string>,
) {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .gte(timeColumn, sinceIso);

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;
    if (error) {
      warnings.push(`${table}: ${error.message}`);
      return 0;
    }
    return typeof count === "number" ? count : 0;
  } catch (error) {
    warnings.push(`${table}: ${error instanceof Error ? error.message : "Unknown count failure."}`);
    return 0;
  }
}

async function getYahooOperationalSummary(
  warnings: string[],
  jobRowsRaw: JsonRecord[],
  errorRowsRaw: JsonRecord[],
): Promise<AdminYahooOperationalSummary> {
  const config = getYahooOperationalConfig();
  const now = new Date();
  const currentHourStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0),
  ).toISOString();
  const currentDayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  ).toISOString();

  const [requestsUsedCurrentHour, requestsUsedToday] = await Promise.all([
    countTableRowsSince(warnings, "raw_yahoo_imports", "imported_at", currentHourStart, {
      source_type: "yahoo_finance",
    }),
    countTableRowsSince(warnings, "raw_yahoo_imports", "imported_at", currentDayStart, {
      source_type: "yahoo_finance",
    }),
  ]);

  const latestBatchJob =
    jobRowsRaw.find((row) => cleanString(row.job_kind, 160) === "yahoo_batch_import") ?? null;
  const latestBatchMetadata = normalizeMetadata(latestBatchJob?.metadata);
  const latestBatchStatus = parseBatchVisibleStatus(latestBatchJob);
  const cooldownUntil = cleanString(latestBatchMetadata.cooldownUntil, 120) || null;
  const cooldownStatus =
    latestBatchStatus === "cooling_down"
      ? `Cooling down until ${cooldownUntil ?? "the configured cooldown expires"}`
      : latestBatchStatus === "paused"
        ? "Paused"
        : "No cooldown active";
  const activeWorkers = jobRowsRaw.filter((row) => {
    return (
      cleanString(row.job_kind, 160) === "yahoo_batch_import" &&
      cleanString(row.status, 120) === "running" &&
      hasFreshActiveWorker(normalizeMetadata(row.metadata))
    );
  }).length;

  const latestErrorRow = errorRowsRaw[0] ?? null;
  const lastYahooError =
    cleanString(latestErrorRow?.error_message, 4000) ||
    cleanString(latestBatchMetadata.lastYahooError, 4000) ||
    null;
  const disabledModules = normalizeStringRecord(latestBatchMetadata.moduleDisabledStatus);

  return {
    latestBatchStatus,
    currentRequestPace: `${config.requestsPerSecond} req/sec cap · ${activeWorkers}/${config.maxConcurrentWorkers} workers active`,
    requestsUsedCurrentHour,
    maxRequestsPerHour: config.maxRequestsPerHour,
    requestsUsedToday,
    maxRequestsPerDay: config.maxRequestsPerDay,
    savedRequestsAvoided: numericOrZero(latestBatchMetadata.savedRequestsAvoided),
    existingDataReused: numericOrZero(latestBatchMetadata.existingDataReused),
    skipBreakdown: {
      skippedExistingHistory: numericOrZero(latestBatchMetadata.skippedExistingHistoryCount),
      skippedExistingSnapshot: numericOrZero(latestBatchMetadata.skippedExistingSnapshotCount),
      skippedBlockedModule: numericOrZero(latestBatchMetadata.skippedBlockedModuleCount),
      skippedDuplicateRawResponse: numericOrZero(
        latestBatchMetadata.skippedDuplicateRawResponseCount,
      ),
    },
    disabledModules:
      Object.keys(disabledModules).length > 0
        ? disabledModules
        : {
            financial_statements: "manual_single_stock_only",
          },
    cooldownStatus,
    cooldownUntil,
    lastYahooError,
    activeWorkers,
    maxConcurrentWorkers: config.maxConcurrentWorkers,
  };
}

function buildDashboardRow(input: {
  stock: StockMasterRow;
  coverageRows: AdminStockImportCoverageRow[];
  latestJob: JsonRecord | null;
  latestSuccessfulJob: JsonRecord | null;
  latestError: JsonRecord | null;
  errorRows: JsonRecord[];
}): AdminStockImportDashboardRow {
  const coverageMap = new Map(input.coverageRows.map((row) => [row.bucketKey, row]));
  const historicalRow = coverageMap.get("historical_prices");
  const latestSnapshotRow = coverageMap.get("latest_market_snapshot");
  const valuationRows = VALUATION_BUCKET_KEYS.map((key) => coverageMap.get(key) ?? null);
  const incomeGroup = FINANCIAL_BUCKET_GROUPS.incomeStatement.map((key) => coverageMap.get(key) ?? null);
  const balanceGroup = FINANCIAL_BUCKET_GROUPS.balanceSheet.map((key) => coverageMap.get(key) ?? null);
  const cashGroup = FINANCIAL_BUCKET_GROUPS.cashFlow.map((key) => coverageMap.get(key) ?? null);

  const historicalCompleted = hasCoverageData(historicalRow);
  const latestSnapshotCompleted = hasCoverageData(latestSnapshotRow);
  const valuationCompleted = valuationRows.every((row) => hasCoverageData(row));
  const financialsCompleted =
    incomeGroup.some((row) => hasCoverageData(row)) &&
    balanceGroup.some((row) => hasCoverageData(row)) &&
    cashGroup.some((row) => hasCoverageData(row));

  const historicalPercent = getCoverageValue(historicalRow);
  const latestSnapshotPercent = getCoverageValue(latestSnapshotRow);
  const valuationPercent = average(valuationRows.map((row) => getCoverageValue(row)));
  const financialsPercent = average([
    Math.max(...incomeGroup.map((row) => getCoverageValue(row)), 0),
    Math.max(...balanceGroup.map((row) => getCoverageValue(row)), 0),
    Math.max(...cashGroup.map((row) => getCoverageValue(row)), 0),
  ]);
  const importPercentage = average([
    historicalPercent,
    latestSnapshotPercent,
    valuationPercent,
    financialsPercent,
  ]);

  const latestJobStatus = cleanString(input.latestJob?.status, 120);
  const failed =
    latestJobStatus === "failed" ||
    input.coverageRows.some((row) => row.coverageStatus === "error" || row.errorCount > 0);
  const pending =
    Boolean(input.stock.yahoo_symbol) &&
    (!historicalCompleted || !latestSnapshotCompleted || !valuationCompleted || !financialsCompleted) &&
    !failed;

  const latestResult: AdminStockImportDashboardRow["latestResult"] = failed
    ? "error"
    : latestJobStatus === "completed" || latestJobStatus === "completed_with_errors"
      ? "completed"
      : pending
        ? "pending"
        : "not_started";

  const lastSuccessfulImportAt = cleanString(
    input.latestSuccessfulJob?.completed_at ?? input.latestSuccessfulJob?.updated_at,
    120,
  ) || null;
  const latestJobMetadata = normalizeMetadata(input.latestJob?.metadata);
  const latestError =
    cleanString(
      input.latestError?.error_message ??
        latestJobMetadata.error ??
        latestJobMetadata.latestError,
      4000,
    ) || null;
  const rowsImportedInLatestSuccess =
    numericOrZero(input.latestSuccessfulJob?.imported_items) +
    numericOrZero(input.latestSuccessfulJob?.updated_items);

  const nextRecommendedAction = !input.stock.yahoo_symbol
    ? "Add a Yahoo symbol before running imports."
    : failed
      ? "Retry the failed import and inspect the latest Yahoo raw response."
      : pending
        ? "Run the pending Yahoo import buckets for this stock."
        : "Open the stock page and verify the imported data.";
  const qualitySummary = buildStockDataQualitySummary(input);

  return {
    stockId: input.stock.id,
    slug: input.stock.slug,
    symbol: input.stock.symbol,
    companyName: cleanString(input.stock.company_name, 240) || input.stock.symbol,
    yahooSymbol: cleanString(input.stock.yahoo_symbol, 160) || null,
    route: `/stocks/${input.stock.slug}`,
    editorHref: `/admin/content/stocks/${input.stock.slug}`,
    importable: Boolean(input.stock.yahoo_symbol),
    historicalCompleted,
    latestSnapshotCompleted,
    valuationCompleted,
    financialsCompleted,
    failed,
    pending,
    importPercentage,
    latestResult,
    lastSuccessfulImportAt,
    latestError,
    rowsImportedInLatestSuccess,
    nextRecommendedAction,
    dataQualityScore: qualitySummary.overallDataScore,
    missingModuleCount: qualitySummary.missingModuleCount,
    warningCount: qualitySummary.warningCount,
    errorCount: qualitySummary.errorCount,
    hasRecentErrors: qualitySummary.hasRecentErrors,
    priceDataFocusedScore: qualitySummary.priceDataFocused,
  };
}

async function loadStocksMasterRows(warnings: string[]) {
  const rows = await safeSelectRows(
    warnings,
    "stocks_master",
    "id, slug, symbol, company_name, yahoo_symbol",
    (query) => query.order("company_name", { ascending: true }).range(0, 4999),
  );

  return rows
    .map((row) => ({
      id: cleanString(row.id, 160),
      slug: cleanString(row.slug, 160),
      symbol: cleanString(row.symbol, 160),
      company_name: cleanString(row.company_name, 240) || null,
      yahoo_symbol: cleanString(row.yahoo_symbol, 160) || null,
    }))
    .filter((row) => row.id && row.slug && row.symbol) as StockMasterRow[];
}

type AdminStockImportDashboardOptions = {
  stockOffset?: number;
  stockLimit?: number;
  includeStockRows?: boolean;
};

export async function getAdminStockImportDashboardData(
  options: AdminStockImportDashboardOptions = {},
): Promise<AdminStockImportDashboardData> {
  return withDevelopmentTiming("getAdminStockImportDashboardData", async () => {
    ensureAdminStockImportReady();
    const warnings: string[] = [];
    const stockOffset = Math.max(0, Math.trunc(options.stockOffset ?? 0));
    const stockLimit = Math.max(0, Math.trunc(options.stockLimit ?? 5000));
    const includeStockRows = options.includeStockRows !== false;

    const [stocks, coverageRowsRaw, jobRowsRaw, errorRowsRaw, activityRowsRaw] = await Promise.all([
      loadStocksMasterRows(warnings),
      safeSelectRows(
        warnings,
        "stock_import_coverage",
        "stock_id, symbol, bucket_key, coverage_status, latest_trade_date, latest_fiscal_date, latest_imported_at, rows_available, rows_imported, row_count, warning_count, error_count, coverage_notes, metadata",
        (query) => query.range(0, 19999),
      ),
      safeSelectRows(
        warnings,
        "stock_import_jobs",
        "id, stock_id, symbol, source_symbol, status, job_kind, import_scope, imported_items, updated_items, skipped_items, failed_items, warning_items, started_at, completed_at, updated_at, metadata",
        (query) => query.order("started_at", { ascending: false }).range(0, 19999),
      ),
      safeSelectRows(
        warnings,
        "stock_import_errors",
        "id, stock_id, symbol, bucket_key, error_message, imported_at",
        (query) => query.order("imported_at", { ascending: false }).range(0, 9999),
      ),
      safeSelectRows(
        warnings,
        "stock_import_activity_log",
        "id, job_id, job_item_id, stock_id, yahoo_symbol, module_name, step_name, status, message, rows_fetched, rows_inserted, rows_updated, rows_skipped, mapped_fields_count, missing_fields_count, fill_percentage, affected_table, started_at, completed_at, error_message, metadata",
        (query) => query.order("started_at", { ascending: false }).range(0, 49),
      ),
    ]);

  const coverageByStockId = new Map<string, AdminStockImportCoverageRow[]>();
  for (const row of coverageRowsRaw) {
    const stockId = cleanString(row.stock_id, 160);
    if (!stockId) continue;
    const normalized = normalizeCoverageRow(row);
    const current = coverageByStockId.get(stockId) ?? [];
    current.push(normalized);
    coverageByStockId.set(stockId, current);
  }

  const latestJobByStockId = new Map<string, JsonRecord>();
  const latestSuccessfulJobByStockId = new Map<string, JsonRecord>();
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

  const latestErrorByStockId = new Map<string, JsonRecord>();
  const errorRowsByStockId = new Map<string, JsonRecord[]>();
  for (const row of errorRowsRaw) {
    const stockId = cleanString(row.stock_id, 160);
    if (!stockId) continue;
    if (!latestErrorByStockId.has(stockId)) {
      latestErrorByStockId.set(stockId, row);
    }
    const rows = errorRowsByStockId.get(stockId) ?? [];
    rows.push(row);
    errorRowsByStockId.set(stockId, rows);
  }

  const stockRows = stocks.map((stock) =>
    buildDashboardRow({
      stock,
      coverageRows: coverageByStockId.get(stock.id) ?? [],
      latestJob: latestJobByStockId.get(stock.id) ?? null,
      latestSuccessfulJob: latestSuccessfulJobByStockId.get(stock.id) ?? null,
      latestError: latestErrorByStockId.get(stock.id) ?? null,
      errorRows: errorRowsByStockId.get(stock.id) ?? [],
    }),
  );

  const latestSuccessfulImportDate = stockRows
    .map((row) => row.lastSuccessfulImportAt)
    .filter(Boolean)
    .sort(latestDateDesc)[0] ?? null;

  const yahooOperations = await getYahooOperationalSummary(warnings, jobRowsRaw, errorRowsRaw);

    return {
    summary: {
      totalStocks: stockRows.length,
      stocksWithHistoricalDataCompleted: stockRows.filter((row) => row.historicalCompleted).length,
      stocksWithLatestSnapshotCompleted: stockRows.filter((row) => row.latestSnapshotCompleted).length,
      stocksWithValuationDataCompleted: stockRows.filter((row) => row.valuationCompleted).length,
      stocksWithFinancialsCompleted: stockRows.filter((row) => row.financialsCompleted).length,
      failedImports: stockRows.filter((row) => row.failed).length,
      pendingImports: stockRows.filter((row) => row.pending).length,
      lastSuccessfulImportDate: latestSuccessfulImportDate,
    },
    yahooOperations,
    stocks: includeStockRows
      ? stockRows
          .sort((left, right) =>
            `${right.lastSuccessfulImportAt ?? ""}:${right.importPercentage}:${right.slug}`.localeCompare(
              `${left.lastSuccessfulImportAt ?? ""}:${left.importPercentage}:${left.slug}`,
            ),
          )
          .slice(stockOffset, stockOffset + stockLimit)
      : [],
    latestActivity: activityRowsRaw.map(normalizeActivityRow),
    pagination: {
      offset: stockOffset,
      limit: stockLimit,
      total: stockRows.length,
      hasMore: includeStockRows ? stockOffset + stockLimit < stockRows.length : false,
    },
    warnings,
    };
  });
}

export async function listStocksForImportByIds(stockIds: string[]) {
  ensureAdminStockImportReady();
  const ids = Array.from(new Set(stockIds.map((item) => cleanString(item, 160)).filter(Boolean)));
  if (!ids.length) {
    return [] as StockMasterRow[];
  }
  const warnings: string[] = [];
  const rows = await safeSelectRows(
    warnings,
    "stocks_master",
    "id, slug, symbol, company_name, yahoo_symbol",
    (query) => query.in("id", ids).order("company_name", { ascending: true }),
  );
  return rows
    .map((row) => ({
      id: cleanString(row.id, 160),
      slug: cleanString(row.slug, 160),
      symbol: cleanString(row.symbol, 160),
      company_name: cleanString(row.company_name, 240) || null,
      yahoo_symbol: cleanString(row.yahoo_symbol, 160) || null,
    }))
    .filter((row) => row.id && row.slug && row.symbol) as StockMasterRow[];
}

export async function listStocksForImportByYahooSymbols(yahooSymbols: string[]) {
  ensureAdminStockImportReady();
  const normalizedSymbols = Array.from(
    new Set(yahooSymbols.map((item) => cleanString(item, 160).toUpperCase()).filter(Boolean)),
  );
  if (!normalizedSymbols.length) {
    return [] as StockMasterRow[];
  }

  const warnings: string[] = [];
  const [yahooMatches, symbolMatches] = await Promise.all([
    safeSelectRows(
      warnings,
      "stocks_master",
      "id, slug, symbol, company_name, yahoo_symbol",
      (query) => query.in("yahoo_symbol", normalizedSymbols),
    ),
    safeSelectRows(
      warnings,
      "stocks_master",
      "id, slug, symbol, company_name, yahoo_symbol",
      (query) => query.in("symbol", normalizedSymbols),
    ),
  ]);

  const uniqueRows = new Map<string, JsonRecord>();
  for (const row of [...yahooMatches, ...symbolMatches]) {
    const id = cleanString(row.id, 160);
    if (id) {
      uniqueRows.set(id, row);
    }
  }

  return [...uniqueRows.values()]
    .map((row) => ({
      id: cleanString(row.id, 160),
      slug: cleanString(row.slug, 160),
      symbol: cleanString(row.symbol, 160),
      company_name: cleanString(row.company_name, 240) || null,
      yahoo_symbol: cleanString(row.yahoo_symbol, 160) || null,
    }))
    .filter((row) => row.id && row.slug && row.symbol) as StockMasterRow[];
}

export async function getPendingImportStocks() {
  const dashboard = await getAdminStockImportDashboardData();
  return dashboard.stocks.filter((stock) => stock.pending && stock.importable);
}

export async function getFailedImportStocks() {
  const dashboard = await getAdminStockImportDashboardData();
  return dashboard.stocks.filter((stock) => stock.failed && stock.importable);
}

async function resolveStockForDetails(input: { stockId?: string | null; slug?: string | null; symbol?: string | null }) {
  const warnings: string[] = [];
  const stocks = await loadStocksMasterRows(warnings);
  const stockId = cleanString(input.stockId, 160);
  const slug = cleanString(input.slug, 160).toLowerCase();
  const symbol = cleanString(input.symbol, 160).toUpperCase();
  return (
    stocks.find((stock) => stock.id === stockId) ??
    stocks.find((stock) => stock.slug.toLowerCase() === slug) ??
    stocks.find((stock) => stock.symbol.toUpperCase() === symbol) ??
    null
  );
}

export async function getAdminStockImportDetails(input: {
  stockId?: string | null;
  slug?: string | null;
  symbol?: string | null;
}): Promise<AdminStockImportDetails | null> {
  ensureAdminStockImportReady();
  const warnings: string[] = [];
  const stock = await resolveStockForDetails(input);
  if (!stock) {
    return null;
  }

  const dashboard = await getAdminStockImportDashboardData();
  const stockSummary =
    dashboard.stocks.find((item) => item.stockId === stock.id) ??
    buildDashboardRow({
      stock,
      coverageRows: [],
      latestJob: null,
      latestSuccessfulJob: null,
      latestError: null,
      errorRows: [],
    });

  const [
    coverageRowsRaw,
    latestPriceHistoryRows,
    latestMarketSnapshotRows,
    latestValuationMetrics,
    latestShareStatistics,
    latestFinancialHighlights,
    incomeStatementAnnualRows,
    incomeStatementQuarterlyRows,
    balanceSheetAnnualRows,
    balanceSheetQuarterlyRows,
    cashFlowAnnualRows,
    cashFlowQuarterlyRows,
    dividendRows,
    splitRows,
    earningsEventRows,
    earningsTrendRows,
    analystRatingRows,
    holdersSummaryRows,
    holdersDetailRows,
    optionsRows,
    newsRows,
    importJobs,
    importErrors,
    rawImports,
    activityTimelineRaw,
    reconciliationRowsRaw,
  ] = await Promise.all([
    safeSelectRows(
      warnings,
      "stock_import_coverage",
      "bucket_key, coverage_status, latest_trade_date, latest_fiscal_date, latest_imported_at, rows_available, rows_imported, row_count, warning_count, error_count, coverage_notes, metadata",
      (query) => query.eq("stock_id", stock.id).order("bucket_key", { ascending: true }),
    ),
    safeSelectRows(
      warnings,
      "stock_price_history",
      "trade_date, open, high, low, close, adj_close, volume, source_name, source_symbol, imported_at",
      (query) => query.eq("stock_id", stock.id).order("trade_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_market_snapshot",
      "trade_date, snapshot_at, currency_code, market_state, price, previous_close, open, day_high, day_low, change_absolute, change_percent, volume, market_cap, imported_at",
      (query) => query.eq("stock_id", stock.id).order("snapshot_at", { ascending: false }).limit(10),
    ),
    safeSelectSingle(
      warnings,
      "stock_valuation_metrics",
      "*",
      (query) => query.eq("stock_id", stock.id).order("trade_date", { ascending: false }),
    ),
    safeSelectSingle(
      warnings,
      "stock_share_statistics",
      "*",
      (query) => query.eq("stock_id", stock.id).order("trade_date", { ascending: false }),
    ),
    safeSelectSingle(
      warnings,
      "stock_financial_highlights",
      "*",
      (query) => query.eq("stock_id", stock.id).order("fiscal_date", { ascending: false }),
    ),
    safeSelectRows(
      warnings,
      "stock_income_statement",
      "*",
      (query) =>
        query.eq("stock_id", stock.id).eq("period_type", "annual").order("fiscal_date", { ascending: false }).limit(5),
    ),
    safeSelectRows(
      warnings,
      "stock_income_statement",
      "*",
      (query) =>
        query.eq("stock_id", stock.id).eq("period_type", "quarterly").order("fiscal_date", { ascending: false }).limit(5),
    ),
    safeSelectRows(
      warnings,
      "stock_balance_sheet",
      "*",
      (query) =>
        query.eq("stock_id", stock.id).eq("period_type", "annual").order("fiscal_date", { ascending: false }).limit(5),
    ),
    safeSelectRows(
      warnings,
      "stock_balance_sheet",
      "*",
      (query) =>
        query.eq("stock_id", stock.id).eq("period_type", "quarterly").order("fiscal_date", { ascending: false }).limit(5),
    ),
    safeSelectRows(
      warnings,
      "stock_cash_flow",
      "*",
      (query) =>
        query.eq("stock_id", stock.id).eq("period_type", "annual").order("fiscal_date", { ascending: false }).limit(5),
    ),
    safeSelectRows(
      warnings,
      "stock_cash_flow",
      "*",
      (query) =>
        query.eq("stock_id", stock.id).eq("period_type", "quarterly").order("fiscal_date", { ascending: false }).limit(5),
    ),
    safeSelectRows(
      warnings,
      "stock_dividends",
      "*",
      (query) => query.eq("stock_id", stock.id).order("ex_dividend_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_splits",
      "*",
      (query) => query.eq("stock_id", stock.id).order("split_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_earnings_events",
      "*",
      (query) => query.eq("stock_id", stock.id).order("event_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_earnings_trend",
      "*",
      (query) => query.eq("stock_id", stock.id).order("fiscal_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_analyst_ratings",
      "*",
      (query) => query.eq("stock_id", stock.id).order("fiscal_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_holders_summary",
      "*",
      (query) => query.eq("stock_id", stock.id).order("fiscal_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_holders_detail",
      "*",
      (query) => query.eq("stock_id", stock.id).order("fiscal_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_options_contracts",
      "*",
      (query) => query.eq("stock_id", stock.id).order("expiry_date", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_news",
      "*",
      (query) => query.eq("stock_id", stock.id).order("published_at", { ascending: false }).limit(10),
    ),
    safeSelectRows(
      warnings,
      "stock_import_jobs",
      "id, job_kind, import_scope, status, source_symbol, requested_by, imported_items, updated_items, skipped_items, failed_items, warning_items, started_at, completed_at, metadata",
      (query) => query.eq("stock_id", stock.id).order("started_at", { ascending: false }).limit(20),
    ),
    safeSelectRows(
      warnings,
      "stock_import_errors",
      "id, bucket_key, error_stage, error_code, error_message, trade_date, fiscal_date, imported_at, context_json",
      (query) => query.eq("stock_id", stock.id).order("imported_at", { ascending: false }).limit(20),
    ),
    safeSelectRows(
      warnings,
      "raw_yahoo_imports",
      "id, source_bucket, module_name, request_type, request_url, response_status, status, error_message, trade_date, fiscal_date, imported_at, raw_payload, normalized_payload",
      (query) => query.eq("stock_id", stock.id).order("imported_at", { ascending: false }).limit(20),
    ),
    safeSelectRows(
      warnings,
      "stock_import_activity_log",
      "id, job_id, job_item_id, stock_id, yahoo_symbol, module_name, step_name, status, message, rows_fetched, rows_inserted, rows_updated, rows_skipped, mapped_fields_count, missing_fields_count, fill_percentage, affected_table, started_at, completed_at, error_message, metadata",
      (query) => query.eq("stock_id", stock.id).order("started_at", { ascending: false }).limit(40),
    ),
    safeSelectRows(
      warnings,
      "stock_import_reconciliation",
      "id, job_id, stock_id, yahoo_symbol, module_name, raw_import_id, target_table, raw_records_count, normalized_records_count, unmapped_records_count, missing_required_fields, missing_optional_fields, reconciliation_status, reconciliation_notes, metadata, created_at, updated_at",
      (query) => query.eq("stock_id", stock.id).order("updated_at", { ascending: false }).limit(40),
    ),
  ]);

  const activityTimeline = activityTimelineRaw.map(normalizeActivityRow);
  const reconciliationRows = reconciliationRowsRaw.map(normalizeReconciliationRow);
  const retryRecommendation = reconciliationRows.some(
    (row) => row.reconciliationStatus === "failed",
  )
    ? "Retry only the failed Yahoo module after reviewing the latest raw payload and error log."
    : reconciliationRows.some(
          (row) =>
            row.reconciliationStatus === "completed_with_warnings" &&
            (row.missingRequiredFields.length > 0 || row.missingOptionalFields.length > 0),
        )
      ? "Review the missing-field and reconciliation warnings before deciding whether a focused module retry is necessary."
      : activityTimeline.some((row) => row.status === "failed")
        ? "Inspect the latest activity timeline and stock_import_errors before retrying this stock."
        : "No immediate retry is recommended. Review the latest activity and raw-vs-normalized counts first.";

  return {
    stock: stockSummary,
    coverageRows: coverageRowsRaw.map(normalizeCoverageRow),
    latestPriceHistoryRows,
    latestMarketSnapshotRows,
    latestValuationMetrics,
    latestShareStatistics,
    latestFinancialHighlights,
    incomeStatementAnnualRows,
    incomeStatementQuarterlyRows,
    balanceSheetAnnualRows,
    balanceSheetQuarterlyRows,
    cashFlowAnnualRows,
    cashFlowQuarterlyRows,
    dividendRows,
    splitRows,
    earningsEventRows,
    earningsTrendRows,
    analystRatingRows,
    holdersSummaryRows,
    holdersDetailRows,
    optionsRows,
    newsRows,
    importJobs,
    importErrors,
    rawImports,
    activityTimeline,
    reconciliationRows,
    retryRecommendation,
    warnings: [...dashboard.warnings, ...warnings],
  };
}
