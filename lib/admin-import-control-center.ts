import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { listAdminActivityLog } from "@/lib/admin-activity-log";
import {
  classifyStockFreshness,
  isAcceptedProviderNoDataSymbol,
  resolveIndianTradingDatePolicy,
  type StockFreshnessReasonCategory,
} from "@/lib/stock-freshness-policy";
import {
  loadActiveMarketDataRowQuarantines,
  type MarketDataRowQuarantineItem,
  type MarketDataRowQuarantineTableName,
} from "@/lib/market-data-row-quarantine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withDevelopmentTiming } from "@/lib/supabase/shared";
import { getYahooOperationalConfig } from "@/lib/yahoo-finance-service";
import {
  getAdminStockImportDashboardData,
  type AdminStockImportActivityRow,
  type AdminStockImportCoverageRow,
  type AdminStockImportDashboardData,
  type AdminStockImportDashboardRow,
} from "@/lib/admin-stock-import-dashboard";

type JsonRecord = Record<string, unknown>;
const YAHOO_DAILY_CRON_ACTION_TYPE = "market_data.yahoo_daily_update_cron";
const YAHOO_DAILY_UPDATE_BATCH_PROFILES = new Set([
  "daily_chart_update",
  "daily_same_day_only_cron_primary",
  "daily_same_day_only_cron_retry",
]);

export type AdminImportControlCenterSourceStatus = {
  label: string;
  status: "active" | "degraded" | "disabled" | "future";
  summary: string;
  note: string;
};

export type AdminImportControlCenterStateLabel =
  | "complete"
  | "in_progress"
  | "degraded"
  | "disabled_by_design"
  | "needs_migration";

export type AdminImportControlCenterStatusLegendItem = {
  key: AdminImportControlCenterStateLabel;
  label: string;
  explanation: string;
};

export type AdminImportControlCenterNextActionItem = {
  key:
    | "historical_prices"
    | "latest_snapshots"
    | "yahoo_protected_fundamentals"
    | "valuation_share_highlights"
    | "financial_statements"
    | "canonical_stock_universe"
    | "legacy_instruments_layer";
  label: string;
  status: AdminImportControlCenterStateLabel;
  summary: string;
  detail: string;
};

export type AdminImportControlCenterModuleProgress = {
  key:
    | "historical_prices"
    | "quote_statistics"
    | "financial_statements"
    | "valuation_metrics"
    | "share_statistics"
    | "financial_highlights";
  label: string;
  status: "active" | "degraded" | "disabled";
  stocksCovered: number;
  coveragePercentage: number;
  fillPercentage: number;
  warningCount: number;
  errorCount: number;
  latestImportedAt: string | null;
};

export type AdminImportControlCenterActivityItem = {
  id: string;
  stockLabel: string;
  yahooSymbol: string | null;
  moduleName: string;
  stepName: string;
  status: string;
  message: string | null;
  rowsFetched: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  fillPercentage: number;
  affectedTable: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type AdminImportControlCenterWorstStockItem = {
  stockId: string;
  slug: string;
  symbol: string;
  companyName: string;
  yahooSymbol: string | null;
  route: string;
  dataQualityScore: number;
  missingModuleCount: number;
  warningCount: number;
  errorCount: number;
  latestSnapshotCompleted: boolean;
  historicalCompleted: boolean;
  lastSuccessfulImportAt: string | null;
  nextRecommendedAction: string;
};

export type AdminImportControlCenterProductionChecklistItem = {
  key:
    | "historical_coverage_complete"
    | "snapshot_coverage_complete"
    | "data_quality_generated"
    | "daily_update_cli_working"
    | "cron_enabled_or_disabled"
    | "yahoo_protected_modules_disabled"
    | "last_import_job_status"
    | "recent_errors";
  label: string;
  status: AdminImportControlCenterStateLabel;
  summary: string;
  detail: string;
};

export type AdminImportControlCenterHealthStatus = "green" | "yellow" | "red";

export type AdminImportControlCenterSystemAlert = {
  key: "yahoo_cooldown_active" | "abnormal_error_spike" | "missing_updates_spike" | "db_write_failures";
  label: string;
  status: AdminImportControlCenterHealthStatus;
  active: boolean;
  detail: string;
};

export type AdminImportControlCenterDurableAlert = {
  id: string;
  alertType: string;
  severity: "warning" | "critical";
  message: string;
  affectedScope: string;
  createdAt: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
};

export type AdminImportControlCenterFreshnessItem = {
  stockId: string;
  slug: string;
  symbol: string;
  companyName: string;
  yahooSymbol: string | null;
  hasTodayPrice: boolean;
  hasTodaySnapshot: boolean;
  lastPriceDate: string | null;
  lastSnapshotDate: string | null;
  expectedTradingDate: string | null;
  evaluationDate: string | null;
  reasonCategory: StockFreshnessReasonCategory;
  marketSessionState: string | null;
  isStale: boolean;
  checkedAt: string | null;
  route: string;
};

export type AdminImportControlCenterQuarantineItem = {
  id: string;
  stockId: string | null;
  slug: string | null;
  symbol: string | null;
  companyName: string;
  yahooSymbol: string | null;
  tableName: MarketDataRowQuarantineTableName;
  rowDate: string | null;
  reason: string;
  evidence: Record<string, unknown>;
  status: "active" | "resolved";
  createdAt: string | null;
  resolvedAt: string | null;
  route: string | null;
};

export type AdminImportControlCenterActiveCronProgress = {
  jobId: string;
  status: string;
  cronWindow: "primary" | "retry";
  targetDate: string | null;
  totalStocks: number;
  processedStocks: number;
  pendingStocks: number;
  seededItemCount: number;
  remainingUnseededCount: number;
  nextCursor: number | null;
  nextSeedCursor: number | null;
  lastProcessedSymbol: string | null;
  nextPendingSymbol: string | null;
  updatedAt: string | null;
};

type DurableStockDataQualityRow = {
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
  scoreModel: string | null;
  scoreNotes: string | null;
};

type DurableStockFreshnessRow = {
  stockId: string;
  hasTodayPrice: boolean;
  hasTodaySnapshot: boolean;
  lastPriceDate: string | null;
  lastSnapshotDate: string | null;
  expectedTradingDate: string | null;
  evaluationDate: string | null;
  reasonCategory: StockFreshnessReasonCategory;
  marketSessionState: string | null;
  isStale: boolean;
  checkedAt: string | null;
};

export type AdminImportControlCenterData = {
  projectStatus: {
    totalActiveStocks: number;
    stocksWithHistoricalData: number;
    stocksWithLatestSnapshot: number;
    stocksWithValuationData: number;
    stocksWithFinancialStatements: number;
    overallImportCompletionPercentage: number;
  };
  dataSourceStatus: AdminImportControlCenterSourceStatus[];
  importSafetyStatus: {
    currentThrottle: string;
    requestsThisHour: number;
    requestsToday: number;
    cooldownStatus: string;
    concurrentWorkerSetting: string;
    disabledModules: string[];
    savedRequestsAvoided: number;
    existingDataReused: number;
    latestBatchStatus: string;
    lastYahooError: string | null;
  };
  dataQuality: {
    historicalRowsCount: number;
    snapshotRowsCount: number;
    missingModulesCount: number;
    warningCount: number;
    errorCount: number;
    reconciliationPassCount: number;
    reconciliationFailCount: number;
    averageDataQualityScore: number;
    stocksAbove75: number;
    stocksBelow50: number;
    missingSnapshotCount: number;
    scoreModelNote: string;
    worstStocks: AdminImportControlCenterWorstStockItem[];
  };
  recentActivity: {
    latestEvents: AdminImportControlCenterActivityItem[];
    latestFailedImports: AdminImportControlCenterActivityItem[];
    latestSkippedImports: AdminImportControlCenterActivityItem[];
    latestReusedDataEvents: AdminImportControlCenterActivityItem[];
  };
  systemHealthMonitor: {
    importHealth: {
      lastSuccessfulJobTime: string | null;
      lastFailedJobTime: string | null;
      totalJobsToday: number;
      totalFailuresToday: number;
      failureRatePercentage: number;
    };
    dataHealth: {
      stocksWithFullHistoricalData: number;
      stocksMissingRecentUpdates: number;
      stocksWithStaleSnapshot: number;
      stocksWithRepeatedWarnings: number;
    };
    systemLoad: {
      requestsLastHour: number;
      requestsToday: number;
      currentThrottleRate: string;
      currentWorkerCount: string;
    };
    alerts: AdminImportControlCenterSystemAlert[];
    durableAlerts: AdminImportControlCenterDurableAlert[];
    quarantine: {
      activeRowCount: number;
      affectedStockCount: number;
      latestReason: string | null;
      rows: AdminImportControlCenterQuarantineItem[];
    };
    freshness: {
      staleStockCount: number;
      acceptedExceptionCount: number;
      checkedAt: string | null;
      staleStocks: AdminImportControlCenterFreshnessItem[];
      acceptedExceptions: AdminImportControlCenterFreshnessItem[];
      reasonCounts: Record<StockFreshnessReasonCategory, number>;
      expectedTradingDate: string | null;
      evaluationDate: string | null;
      source: "durable" | "runtime_fallback";
    };
    indicators: {
      ingestion: AdminImportControlCenterHealthStatus;
      dataFreshness: AdminImportControlCenterHealthStatus;
      errorRate: AdminImportControlCenterHealthStatus;
    };
  };
  productionReadiness: {
    checklist: AdminImportControlCenterProductionChecklistItem[];
    latestDailyUpdateJobStatus: string;
    recentErrorCount: number;
    cronStatus: "enabled" | "disabled";
    lastCronRunTime: string | null;
    lastCronResult: string | null;
    activeCronJobProgress: AdminImportControlCenterActiveCronProgress | null;
    currentRecommendation: "Ready" | "Not Ready";
    recommendationNote: string;
  };
  statusLegend: AdminImportControlCenterStatusLegendItem[];
  whatNeedsFixingNext: AdminImportControlCenterNextActionItem[];
  progressByModule: AdminImportControlCenterModuleProgress[];
  actionScope: {
    safeDryRunSymbol: string;
    boundedWorkerSlice: number;
    missingHistoricalStocks: number;
    snapshotRefreshStocks: number;
    retrySafeModuleStocks: number;
  };
  dashboard: AdminStockImportDashboardData;
  warnings: string[];
};

export type AdminImportControlCenterOverviewData = Pick<
  AdminImportControlCenterData,
  | "projectStatus"
  | "importSafetyStatus"
  | "dataQuality"
  | "recentActivity"
  | "systemHealthMonitor"
  | "productionReadiness"
  | "progressByModule"
  | "warnings"
>;

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

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, 240)).filter(Boolean)
    : [];
}

function ensureControlCenterReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Yahoo import control center requires durable Supabase admin credentials in this environment.",
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

async function countExact(
  warnings: string[],
  table: string,
  configure?: (query: any) => any,
) {
  try {
    const supabase = createSupabaseAdminClient();
    let query: any = supabase.from(table).select("id", { count: "exact", head: true });
    if (configure) {
      query = configure(query);
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

function coverageValue(row: AdminStockImportCoverageRow | null | undefined) {
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
        coverageValue(row) > 0),
  );
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
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

function normalizeDurableQualityRow(row: JsonRecord): DurableStockDataQualityRow {
  return {
    stockId: cleanString(row.stock_id, 160),
    yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
    hasHistoricalPrices: Boolean(row.has_historical_prices),
    historicalFirstDate: cleanString(row.historical_first_date, 120) || null,
    historicalLastDate: cleanString(row.historical_last_date, 120) || null,
    historicalRowCount: numericOrZero(row.historical_row_count),
    hasLatestSnapshot: Boolean(row.has_latest_snapshot),
    hasValuationMetrics: Boolean(row.has_valuation_metrics),
    hasFinancialStatements: Boolean(row.has_financial_statements),
    missingModuleCount: numericOrZero(row.missing_module_count),
    warningCount: numericOrZero(row.warning_count),
    errorCount: numericOrZero(row.error_count),
    overallDataScore: numericOrZero(row.overall_data_score),
    lastImportAt: cleanString(row.last_import_at, 120) || null,
    updatedAt: cleanString(row.updated_at, 120) || null,
    scoreModel: cleanString(row.score_model, 160) || null,
    scoreNotes: cleanString(row.score_notes, 4000) || null,
  };
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

function toActivityItem(
  row: AdminStockImportActivityRow,
  stockMap: Map<string, AdminStockImportDashboardRow>,
): AdminImportControlCenterActivityItem {
  const stock = row.stockId ? stockMap.get(row.stockId) ?? null : null;
  return {
    id: row.id,
    stockLabel: stock?.companyName ?? stock?.symbol ?? row.yahooSymbol ?? "Unknown stock",
    yahooSymbol: row.yahooSymbol,
    moduleName: row.moduleName,
    stepName: row.stepName,
    status: row.status,
    message: row.message,
    rowsFetched: row.rowsFetched,
    rowsInserted: row.rowsInserted,
    rowsUpdated: row.rowsUpdated,
    rowsSkipped: row.rowsSkipped,
    fillPercentage: row.fillPercentage,
    affectedTable: row.affectedTable,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
    metadata: row.metadata,
  };
}

function buildCoverageMap(coverageRows: JsonRecord[]) {
  const coverageByStockId = new Map<string, Map<string, AdminStockImportCoverageRow>>();
  const normalizedRows = coverageRows.map(normalizeCoverageRow);

  for (const row of coverageRows) {
    const stockId = cleanString(row.stock_id, 160);
    const bucketKey = cleanString(row.bucket_key, 160);
    if (!stockId || !bucketKey) {
      continue;
    }
    const bucketMap = coverageByStockId.get(stockId) ?? new Map<string, AdminStockImportCoverageRow>();
    bucketMap.set(bucketKey, normalizeCoverageRow(row));
    coverageByStockId.set(stockId, bucketMap);
  }

  return {
    normalizedRows,
    coverageByStockId,
  };
}

function findLatestIso(values: Array<string | null>) {
  return values
    .filter(Boolean)
    .sort((left, right) => cleanString(right, 120).localeCompare(cleanString(left, 120)))[0] ?? null;
}

function buildModuleProgress(
  key:
    | "historical_prices"
    | "quote_statistics"
    | "financial_statements"
    | "valuation_metrics"
    | "share_statistics"
    | "financial_highlights",
  label: string,
  status: "active" | "degraded" | "disabled",
  bucketKeys: string[],
  stocks: AdminStockImportDashboardRow[],
  coverageByStockId: Map<string, Map<string, AdminStockImportCoverageRow>>,
) {
  const relevantRows = stocks.flatMap((stock) =>
    bucketKeys
      .map((bucketKey) => coverageByStockId.get(stock.stockId)?.get(bucketKey) ?? null)
      .filter(Boolean) as AdminStockImportCoverageRow[],
  );

  const stocksCovered = stocks.filter((stock) =>
    bucketKeys.some((bucketKey) => hasCoverageData(coverageByStockId.get(stock.stockId)?.get(bucketKey))),
  ).length;

  return {
    key,
    label,
    status,
    stocksCovered,
    coveragePercentage: stocks.length ? Number(((stocksCovered / stocks.length) * 100).toFixed(2)) : 0,
    fillPercentage: average(relevantRows.map((row) => coverageValue(row))),
    warningCount: relevantRows.reduce((sum, row) => sum + row.warningCount, 0),
    errorCount: relevantRows.reduce((sum, row) => sum + row.errorCount, 0),
    latestImportedAt: findLatestIso(relevantRows.map((row) => row.latestImportedAt)),
  } satisfies AdminImportControlCenterModuleProgress;
}

function countIncompleteModules(
  stocks: AdminStockImportDashboardRow[],
  coverageByStockId: Map<string, Map<string, AdminStockImportCoverageRow>>,
) {
  let total = 0;
  for (const stock of stocks) {
    const stockCoverage = coverageByStockId.get(stock.stockId) ?? new Map();
    if (!stock.historicalCompleted) total += 1;
    if (!stock.latestSnapshotCompleted) total += 1;
    if (!hasCoverageData(stockCoverage.get("valuation_metrics"))) total += 1;
    if (!hasCoverageData(stockCoverage.get("share_statistics"))) total += 1;
    if (!hasCoverageData(stockCoverage.get("financial_highlights"))) total += 1;
    if (!stock.financialsCompleted) total += 1;
  }
  return total;
}

function isSkippedActivity(item: AdminImportControlCenterActivityItem) {
  return (
    item.rowsSkipped > 0 ||
    cleanString(item.metadata.skipReason, 160).length > 0 ||
    cleanString(item.message, 4000).toLowerCase().includes("skipped")
  );
}

function isReusedDataActivity(item: AdminImportControlCenterActivityItem) {
  return (
    numericOrZero(item.metadata.existingDataReused) > 0 ||
    numericOrZero(item.metadata.savedRequestsAvoided) > 0 ||
    cleanString(item.metadata.skipReason, 160).length > 0
  );
}

function buildWorstStockItems(rows: AdminStockImportDashboardRow[]) {
  return [...rows]
    .sort((left, right) => {
      const leftRank = `${String(left.dataQualityScore).padStart(3, "0")}:${String(
        left.errorCount,
      ).padStart(6, "0")}:${String(left.missingModuleCount).padStart(3, "0")}:${left.slug}`;
      const rightRank = `${String(right.dataQualityScore).padStart(3, "0")}:${String(
        right.errorCount,
      ).padStart(6, "0")}:${String(right.missingModuleCount).padStart(3, "0")}:${right.slug}`;
      return leftRank.localeCompare(rightRank);
    })
    .slice(0, 20)
    .map((row) => ({
      stockId: row.stockId,
      slug: row.slug,
      symbol: row.symbol,
      companyName: row.companyName,
      yahooSymbol: row.yahooSymbol,
      route: row.route,
      dataQualityScore: row.dataQualityScore,
      missingModuleCount: row.missingModuleCount,
      warningCount: row.warningCount,
      errorCount: row.errorCount,
      latestSnapshotCompleted: row.latestSnapshotCompleted,
      historicalCompleted: row.historicalCompleted,
      lastSuccessfulImportAt: row.lastSuccessfulImportAt,
      nextRecommendedAction: row.nextRecommendedAction,
    }));
}

function buildWorstStockItemsFromDurableRows(
  durableRows: DurableStockDataQualityRow[],
  stockMap: Map<string, AdminStockImportDashboardRow>,
) {
  return [...durableRows]
    .sort((left, right) => {
      const leftRank = `${String(left.overallDataScore).padStart(3, "0")}:${String(
        left.errorCount,
      ).padStart(6, "0")}:${String(left.missingModuleCount).padStart(3, "0")}:${left.stockId}`;
      const rightRank = `${String(right.overallDataScore).padStart(3, "0")}:${String(
        right.errorCount,
      ).padStart(6, "0")}:${String(right.missingModuleCount).padStart(3, "0")}:${right.stockId}`;
      return leftRank.localeCompare(rightRank);
    })
    .slice(0, 20)
    .map((row) => {
      const stock = stockMap.get(row.stockId);
      return {
        stockId: row.stockId,
        slug: stock?.slug ?? row.stockId,
        symbol: stock?.symbol ?? row.yahooSymbol ?? "UNKNOWN",
        companyName: stock?.companyName ?? row.yahooSymbol ?? "Unknown stock",
        yahooSymbol: row.yahooSymbol,
        route: stock?.route ?? "#",
        dataQualityScore: row.overallDataScore,
        missingModuleCount: row.missingModuleCount,
        warningCount: row.warningCount,
        errorCount: row.errorCount,
        latestSnapshotCompleted: row.hasLatestSnapshot,
        historicalCompleted: row.hasHistoricalPrices,
        lastSuccessfulImportAt: stock?.lastSuccessfulImportAt ?? row.lastImportAt,
        nextRecommendedAction:
          stock?.nextRecommendedAction ??
          (row.hasLatestSnapshot
            ? "Review durable score details and verify public stock data."
            : "Run the safe missing snapshot import for this stock."),
      } satisfies AdminImportControlCenterWorstStockItem;
    });
}

async function loadDurableQualityRows(warnings: string[]) {
  const rows = await safeSelectRows(
    warnings,
    "stock_data_quality_summary",
    "stock_id, yahoo_symbol, has_historical_prices, historical_first_date, historical_last_date, historical_row_count, has_latest_snapshot, has_valuation_metrics, has_financial_statements, missing_module_count, warning_count, error_count, overall_data_score, last_import_at, updated_at, score_model, score_notes",
    (query) => query.order("updated_at", { ascending: false }).range(0, 4999),
  );

  return rows
    .map(normalizeDurableQualityRow)
    .filter((row) => row.stockId);
}

function startOfRecentWindowIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function parseDateOnly(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffInDaysFromNow(value: string | null) {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return Number.POSITIVE_INFINITY;
  }
  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
}

function toIsoDateHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function normalizeDurableAlertRow(row: JsonRecord): AdminImportControlCenterDurableAlert {
  return {
    id: cleanString(row.id, 160),
    alertType: cleanString(row.alert_type, 160),
    severity: cleanString(row.severity, 40) === "critical" ? "critical" : "warning",
    message: cleanString(row.message, 4000),
    affectedScope: cleanString(row.affected_scope, 240),
    createdAt: cleanString(row.created_at, 160) || null,
    resolvedAt: cleanString(row.resolved_at, 160) || null,
    metadata: normalizeMetadata(row.metadata),
  };
}

function normalizeDurableFreshnessRow(row: JsonRecord): DurableStockFreshnessRow {
  const reasonCategory = cleanString(row.reason_category, 80);
  return {
    stockId: cleanString(row.stock_id, 160),
    hasTodayPrice: Boolean(row.has_today_price),
    hasTodaySnapshot: Boolean(row.has_today_snapshot),
    lastPriceDate: cleanString(row.last_price_date, 120) || null,
    lastSnapshotDate: cleanString(row.last_snapshot_date, 120) || null,
    expectedTradingDate: cleanString(row.expected_trading_date, 120) || null,
    evaluationDate: cleanString(row.evaluation_date, 120) || null,
    reasonCategory:
      reasonCategory === "stale_missing_price" ||
      reasonCategory === "stale_missing_snapshot" ||
      reasonCategory === "provider_no_data" ||
      reasonCategory === "provider_lag" ||
      reasonCategory === "market_not_closed" ||
      reasonCategory === "holiday_or_weekend" ||
      reasonCategory === "symbol_issue"
        ? reasonCategory
        : "fresh",
    marketSessionState: cleanString(row.market_session_state, 80) || null,
    isStale: Boolean(row.is_stale),
    checkedAt: cleanString(row.checked_at, 160) || null,
  };
}

async function loadDurableFreshnessRows(warnings: string[]) {
  const supabase = createSupabaseAdminClient();
  const extendedSelect =
    "stock_id, has_today_price, has_today_snapshot, last_price_date, last_snapshot_date, expected_trading_date, evaluation_date, reason_category, market_session_state, is_stale, checked_at";
  const legacySelect =
    "stock_id, has_today_price, has_today_snapshot, last_price_date, last_snapshot_date, is_stale, checked_at";

  const loadAllRows = async (selectClause: string) => {
    const pageSize = 1000;
    const rows: JsonRecord[] = [];

    for (let from = 0; from < 5000; from += pageSize) {
      const { data, error } = await supabase
        .from("stock_data_freshness")
        .select(selectClause)
        .range(from, from + pageSize - 1);

      if (error) {
        return { data: [] as JsonRecord[], error };
      }

      const safeRows = Array.isArray(data) ? (data as unknown as JsonRecord[]) : [];
      if (!safeRows.length) {
        break;
      }

      rows.push(...safeRows);

      if (safeRows.length < pageSize) {
        break;
      }
    }

    return { data: rows, error: null };
  };

  const { data, error } = await loadAllRows(extendedSelect);

  if (!error) {
    return data;
  }

  const { data: legacyData, error: legacyError } = await loadAllRows(legacySelect);

  if (legacyError) {
    warnings.push(`stock_data_freshness read: ${legacyError.message}`);
    return [] as JsonRecord[];
  }

  warnings.push(
    "stock_data_freshness is still on the legacy schema. Trading-date reason categories will appear after migration 0058 is applied.",
  );
  return legacyData;
}

async function loadYahooDailyCronSnapshot(warnings: string[]) {
  try {
    const entries = await listAdminActivityLog(200);
    const latestTerminalCronEntry =
      entries.find((entry) => {
        if (entry.actionType !== YAHOO_DAILY_CRON_ACTION_TYPE) {
          return false;
        }
        const stage = cleanString(entry.metadata.stage, 80);
        return stage === "completed" || stage === "failed";
      }) ?? null;
    const latestCronEntry =
      latestTerminalCronEntry ??
      entries.find((entry) => entry.actionType === YAHOO_DAILY_CRON_ACTION_TYPE) ??
      null;

    return {
      cronStatus: "enabled" as const,
      lastCronRunTime: latestCronEntry?.createdAt ?? null,
      lastCronResult:
        cleanString(latestCronEntry?.metadata.resultStatus, 160) ||
        cleanString(latestCronEntry?.metadata.stage, 160) ||
        "scheduled",
    };
  } catch (error) {
    warnings.push(
      `yahoo daily cron activity read: ${error instanceof Error ? error.message : "Unknown activity log error."}`,
    );
    return {
      cronStatus: "enabled" as const,
      lastCronRunTime: null,
      lastCronResult: "scheduled",
    };
  }
}

function getLatestCoverageTradeDate(
  coverageByStockId: Map<
    string,
    Map<string, { latestTradeDate: string | null; metadata: Record<string, unknown> }>
  >,
) {
  let latest: string | null = null;

  for (const coverageRows of coverageByStockId.values()) {
    for (const bucketKey of ["historical_prices", "latest_market_snapshot"]) {
      const row = coverageRows.get(bucketKey);
      if (!row) {
        continue;
      }
      const candidate =
        cleanString(row.metadata.lastAvailableDate, 120) ||
        cleanString(row.latestTradeDate, 120) ||
        null;
      if (candidate && (!latest || candidate > latest)) {
        latest = candidate;
      }
    }
  }

  return latest;
}

function buildFreshnessReasonCounts(items: AdminImportControlCenterFreshnessItem[]) {
  const counts: Record<StockFreshnessReasonCategory, number> = {
    fresh: 0,
    stale_missing_price: 0,
    stale_missing_snapshot: 0,
    provider_no_data: 0,
    provider_lag: 0,
    market_not_closed: 0,
    holiday_or_weekend: 0,
    symbol_issue: 0,
  };

  for (const item of items) {
    counts[item.reasonCategory] += 1;
  }

  return counts;
}

function isYahooDailyUpdateBatchProfile(profile: string) {
  return YAHOO_DAILY_UPDATE_BATCH_PROFILES.has(cleanString(profile, 160));
}

function normalizeActiveCronJobProgress(row: {
  id: string;
  status: string;
  updatedAt: string | null;
  metadata: JsonRecord;
}): AdminImportControlCenterActiveCronProgress | null {
  const metadata = normalizeMetadata(row.metadata);
  const batchProfile = cleanString(metadata.batchProfile, 160);
  if (!isYahooDailyUpdateBatchProfile(batchProfile)) {
    return null;
  }

  const totalStocks = Number(metadata.requestedStocks ?? metadata.totalStocks ?? 0) || 0;
  const processedStocks = Number(metadata.processedStocks ?? 0) || 0;
  const pendingStocks = Number(metadata.pendingStocks ?? Math.max(totalStocks - processedStocks, 0)) || 0;
  const seededItemCount = Number(metadata.seededItemCount ?? 0) || 0;
  const remainingUnseededCount = Number(metadata.remainingUnseededCount ?? 0) || 0;
  const nextCursor = Number(metadata.nextCursor ?? 0);
  const nextSeedCursor = Number(metadata.nextSeedCursor ?? 0);

  if (!["queued", "running"].includes(cleanString(row.status, 120)) && pendingStocks <= 0) {
    return null;
  }

  return {
    jobId: row.id,
    status: row.status,
    cronWindow: cleanString(metadata.cronWindow, 40) === "retry" ? "retry" : "primary",
    targetDate: cleanString(metadata.targetDate, 40) || null,
    totalStocks,
    processedStocks,
    pendingStocks,
    seededItemCount,
    remainingUnseededCount,
    nextCursor: Number.isFinite(nextCursor) ? nextCursor : null,
    nextSeedCursor: Number.isFinite(nextSeedCursor) ? nextSeedCursor : null,
    lastProcessedSymbol: cleanString(metadata.lastProcessedSymbol, 160) || null,
    nextPendingSymbol: cleanString(metadata.nextPendingSymbol, 160) || null,
    updatedAt: row.updatedAt,
  };
}

function buildFreshnessItems(
  rows: DurableStockFreshnessRow[],
  stockRows: JsonRecord[],
): AdminImportControlCenterFreshnessItem[] {
  const stockRowById = new Map(
    stockRows.map((row) => [
      cleanString(row.id, 160),
      {
        slug: cleanString(row.slug, 240),
        symbol: cleanString(row.symbol, 160),
        companyName:
          cleanString(row.company_name, 240) ||
          cleanString(row.name, 240) ||
          cleanString(row.symbol, 160) ||
          "Unknown stock",
        yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
      },
    ]),
  );

  return rows
    .filter((row) => row.stockId)
    .map((row) => {
      const stock = stockRowById.get(row.stockId);
      const slug = stock?.slug || row.stockId;
      const isAcceptedException =
        row.reasonCategory === "provider_no_data" ||
        isAcceptedProviderNoDataSymbol(stock?.yahooSymbol);
      const reasonCategory = isAcceptedException ? "provider_no_data" : row.reasonCategory;
      const isStale = isAcceptedException ? false : row.isStale;
      return {
        stockId: row.stockId,
        slug,
        symbol: stock?.symbol || "Unknown",
        companyName: stock?.companyName || stock?.symbol || "Unknown stock",
        yahooSymbol: stock?.yahooSymbol || null,
        hasTodayPrice: row.hasTodayPrice,
        hasTodaySnapshot: row.hasTodaySnapshot,
        lastPriceDate: row.lastPriceDate,
        lastSnapshotDate: row.lastSnapshotDate,
        expectedTradingDate: row.expectedTradingDate,
        evaluationDate: row.evaluationDate,
        reasonCategory,
        marketSessionState: row.marketSessionState,
        isStale,
        checkedAt: row.checkedAt,
        route: `/stocks/${slug}`,
      };
    });
}

function buildQuarantineItems(
  rows: MarketDataRowQuarantineItem[],
  stockRows: JsonRecord[],
): AdminImportControlCenterQuarantineItem[] {
  const stockRowById = new Map(
    stockRows.map((row) => [
      cleanString(row.id, 160),
      {
        slug: cleanString(row.slug, 240) || null,
        symbol: cleanString(row.symbol, 160) || null,
        companyName:
          cleanString(row.company_name, 240) ||
          cleanString(row.symbol, 160) ||
          "Unknown stock",
      },
    ]),
  );

  return rows.map((row) => {
    const stock = row.stockId ? stockRowById.get(row.stockId) : null;
    return {
      id: row.id,
      stockId: row.stockId,
      slug: stock?.slug ?? null,
      symbol: stock?.symbol ?? null,
      companyName: stock?.companyName ?? row.yahooSymbol ?? row.stockId ?? "Unknown stock",
      yahooSymbol: row.yahooSymbol,
      tableName: row.tableName,
      rowDate: row.rowDate,
      reason: row.reason,
      evidence: row.evidence,
      status: row.status,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      route: stock?.slug ? `/stocks/${stock.slug}` : null,
    };
  });
}

async function syncDurableImportAlerts(
  warnings: string[],
  alerts: Array<{
    alertType:
      | "job_failure_rate_high"
      | "yahoo_cooldown_triggered"
      | "snapshot_skip_rate_high"
      | "db_write_failures_spike"
      | "no_successful_job_in_6h";
    severity: "warning" | "critical";
    message: string;
    affectedScope: string;
    active: boolean;
    metadata: Record<string, unknown>;
  }>,
) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: existingRows, error: existingError } = await supabase
      .from("stock_import_alerts")
      .select("id, alert_type, resolved_at")
      .in(
        "alert_type",
        alerts.map((alert) => alert.alertType),
      );

    if (existingError) {
      warnings.push(`stock_import_alerts: ${existingError.message}`);
      return [] as AdminImportControlCenterDurableAlert[];
    }

    const existingByType = new Map(
      (Array.isArray(existingRows) ? existingRows : []).map((row) => [
        cleanString((row as JsonRecord).alert_type, 160),
        row as JsonRecord,
      ]),
    );

    for (const alert of alerts) {
      const existing = existingByType.get(alert.alertType);
      if (alert.active) {
        if (existing && !(existing.resolved_at ?? null)) {
          const { error } = await supabase
            .from("stock_import_alerts")
            .update({
              severity: alert.severity,
              message: alert.message,
              affected_scope: alert.affectedScope,
              metadata: alert.metadata,
              resolved_at: null,
            })
            .eq("id", cleanString(existing.id, 160));
          if (error) {
            warnings.push(`stock_import_alerts update ${alert.alertType}: ${error.message}`);
          }
        } else {
          const { error } = await supabase.from("stock_import_alerts").insert({
            alert_type: alert.alertType,
            severity: alert.severity,
            message: alert.message,
            affected_scope: alert.affectedScope,
            metadata: alert.metadata,
            resolved_at: null,
          });
          if (error) {
            warnings.push(`stock_import_alerts insert ${alert.alertType}: ${error.message}`);
          }
        }
      } else if (existing && !(existing.resolved_at ?? null)) {
        const { error } = await supabase
          .from("stock_import_alerts")
          .update({ resolved_at: new Date().toISOString() })
          .eq("id", cleanString(existing.id, 160));
        if (error) {
          warnings.push(`stock_import_alerts resolve ${alert.alertType}: ${error.message}`);
        }
      }
    }

    const { data: durableAlerts, error: durableAlertsError } = await supabase
      .from("stock_import_alerts")
      .select("id, alert_type, severity, message, affected_scope, created_at, resolved_at, metadata")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (durableAlertsError) {
      warnings.push(`stock_import_alerts read: ${durableAlertsError.message}`);
      return [] as AdminImportControlCenterDurableAlert[];
    }

    return (Array.isArray(durableAlerts) ? durableAlerts : []).map((row) =>
      normalizeDurableAlertRow(row as JsonRecord),
    );
  } catch (error) {
    warnings.push(
      `stock_import_alerts: ${error instanceof Error ? error.message : "Unknown alert sync failure."}`,
    );
    return [] as AdminImportControlCenterDurableAlert[];
  }
}

export async function getAdminImportControlCenterOverviewData(): Promise<AdminImportControlCenterOverviewData> {
  return withDevelopmentTiming("getAdminImportControlCenterOverviewData", async () => {
    ensureControlCenterReady();
    const warnings: string[] = [];
    const operationalConfig = getYahooOperationalConfig();

    const [
      activeStockRowsRaw,
      durableQualityRows,
      durableFreshnessRowsRaw,
      quarantineRowsRaw,
      activityRowsRaw,
      latestDailyUpdateJobsRaw,
      recentImportErrorsRaw,
      requestsThisHour,
      requestsToday,
      historicalRowsCount,
      snapshotRowsCount,
      reconciliationTotalCount,
      reconciliationFailCount,
      durableAlertRowsRaw,
      cronSnapshot,
    ] = await Promise.all([
      safeSelectRows(
        warnings,
        "stocks_master",
        "id, slug, symbol, company_name, yahoo_symbol",
        (query) => query.eq("status", "active").order("company_name", { ascending: true }).range(0, 4999),
      ),
      loadDurableQualityRows(warnings),
      loadDurableFreshnessRows(warnings),
      loadActiveMarketDataRowQuarantines({ limit: 5000 }).catch((error) => {
        warnings.push(
          `market_data_row_quarantine: ${error instanceof Error ? error.message : "Unknown read failure."}`,
        );
        return [] as MarketDataRowQuarantineItem[];
      }),
      safeSelectRows(
        warnings,
        "stock_import_activity_log",
        "id, stock_id, yahoo_symbol, module_name, step_name, status, message, rows_fetched, rows_inserted, rows_updated, rows_skipped, fill_percentage, affected_table, started_at, completed_at, error_message, metadata",
        (query) => query.order("started_at", { ascending: false }).limit(80),
      ),
      safeSelectRows(
        warnings,
        "stock_import_jobs",
        "id, status, job_kind, import_scope, started_at, completed_at, created_at, updated_at, metadata",
        (query) =>
          query
            .eq("job_kind", "yahoo_batch_import")
            .order("created_at", { ascending: false })
            .limit(40),
      ),
      safeSelectRows(
        warnings,
        "stock_import_errors",
        "id, stock_id, error_message, created_at, metadata",
        (query) => query.gte("created_at", startOfRecentWindowIso(24)).order("created_at", { ascending: false }).limit(120),
      ),
      countExact(
        warnings,
        "raw_yahoo_imports",
        (query) => query.gte("imported_at", startOfRecentWindowIso(1)),
      ),
      countExact(
        warnings,
        "raw_yahoo_imports",
        (query) => query.gte("imported_at", startOfRecentWindowIso(24)),
      ),
      countExact(warnings, "stock_price_history"),
      countExact(warnings, "stock_market_snapshot"),
      countExact(warnings, "stock_import_reconciliation"),
      countExact(
        warnings,
        "stock_import_reconciliation",
        (query) => query.eq("reconciliation_status", "failed"),
      ),
      safeSelectRows(
        warnings,
        "stock_import_alerts",
        "id, alert_type, severity, message, affected_scope, created_at, resolved_at, metadata",
        (query) => query.is("resolved_at", null).order("created_at", { ascending: false }).limit(20),
      ),
      loadYahooDailyCronSnapshot(warnings),
    ]);

    const activeStocks = activeStockRowsRaw.map((row) => ({
      id: cleanString(row.id, 160),
      slug: cleanString(row.slug, 240),
      symbol: cleanString(row.symbol, 160),
      companyName:
        cleanString(row.company_name, 240) ||
        cleanString(row.symbol, 160) ||
        "Unknown stock",
      yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
    }));
    const activeStockById = new Map(activeStocks.map((row) => [row.id, row]));
    const activeStockCount = activeStocks.length;
    const normalizedActivity = activityRowsRaw.map(normalizeActivityRow);
    const activityItems: AdminImportControlCenterActivityItem[] = normalizedActivity.map((row) => {
      const stock = row.stockId ? activeStockById.get(row.stockId) ?? null : null;
      return {
        id: row.id,
        stockLabel: stock?.companyName ?? stock?.symbol ?? row.yahooSymbol ?? "Unknown stock",
        yahooSymbol: row.yahooSymbol,
        moduleName: row.moduleName,
        stepName: row.stepName,
        status: row.status,
        message: row.message,
        rowsFetched: row.rowsFetched,
        rowsInserted: row.rowsInserted,
        rowsUpdated: row.rowsUpdated,
        rowsSkipped: row.rowsSkipped,
        fillPercentage: row.fillPercentage,
        affectedTable: row.affectedTable,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        errorMessage: row.errorMessage,
        metadata: row.metadata,
      };
    });
    const durableFreshnessRows = durableFreshnessRowsRaw
      .map((row) => normalizeDurableFreshnessRow(row))
      .filter((row) => row.stockId);
    const quarantineItems = buildQuarantineItems(quarantineRowsRaw, activeStockRowsRaw);
    const latestQuarantineReason = quarantineItems[0]?.reason ?? null;
    const affectedQuarantineStockCount = new Set(
      quarantineItems.map((row) => row.stockId).filter((row): row is string => Boolean(row)),
    ).size;
    const freshnessItems = buildFreshnessItems(durableFreshnessRows, activeStockRowsRaw);
    const acceptedFreshnessItems = freshnessItems.filter(
      (item) => item.reasonCategory === "provider_no_data",
    );
    const staleFreshnessItems = freshnessItems.filter(
      (item) => item.isStale && item.reasonCategory !== "provider_no_data",
    );
    const freshnessReasonCounts = buildFreshnessReasonCounts(freshnessItems);
    const stocksMissingRecentUpdates = freshnessItems.filter(
      (item) => !item.hasTodayPrice && item.reasonCategory !== "provider_no_data",
    ).length;
    const stocksWithStaleSnapshot = freshnessItems.filter(
      (item) => !item.hasTodaySnapshot && item.reasonCategory !== "provider_no_data",
    ).length;
    const evaluationDateForJobs =
      durableFreshnessRows.find((row) => row.evaluationDate)?.evaluationDate ??
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    const normalizedRecentJobs = latestDailyUpdateJobsRaw
      .map((row) => ({
        id: cleanString(row.id, 160),
        status: cleanString(row.status, 160),
        createdAt: cleanString(row.created_at, 160) || null,
        startedAt: cleanString(row.started_at, 160) || null,
        completedAt: cleanString(row.completed_at, 160) || null,
        metadata: normalizeMetadata(row.metadata),
        updatedAt: cleanString(row.updated_at, 160) || null,
      }))
      .filter((job) => isYahooDailyUpdateBatchProfile(cleanString(job.metadata.batchProfile, 160)));
    const latestDailyUpdateJob = normalizedRecentJobs[0] ?? null;
    const activeCronJobProgress =
      normalizedRecentJobs.map(normalizeActiveCronJobProgress).find(Boolean) ?? null;
    const latestSuccessJob = normalizedRecentJobs.find(
      (job) => job.status === "completed" || job.status === "completed_with_errors",
    );
    const latestFailedJob = normalizedRecentJobs.find((job) => job.status === "failed");
    const totalJobsToday = latestDailyUpdateJobsRaw.filter((row) => {
      const startedAt = cleanString(row.started_at, 160) || cleanString(row.created_at, 160);
      const metadata = normalizeMetadata((row as JsonRecord).metadata);
      return (
        startedAt.startsWith(evaluationDateForJobs) &&
        isYahooDailyUpdateBatchProfile(cleanString(metadata.batchProfile, 160))
      );
    }).length;
    const totalFailuresToday = latestDailyUpdateJobsRaw.filter((row) => {
      const startedAt = cleanString(row.started_at, 160) || cleanString(row.created_at, 160);
      const metadata = normalizeMetadata((row as JsonRecord).metadata);
      return (
        startedAt.startsWith(evaluationDateForJobs) &&
        cleanString(row.status, 160) === "failed" &&
        isYahooDailyUpdateBatchProfile(cleanString(metadata.batchProfile, 160))
      );
    }).length;
    const failureRatePercentage =
      totalJobsToday > 0 ? (totalFailuresToday / totalJobsToday) * 100 : 0;
    const activeAlertRows = durableAlertRowsRaw.map((row) =>
      normalizeDurableAlertRow(row as JsonRecord),
    );
    const stocksAbove75 = durableQualityRows.filter((row) => row.overallDataScore >= 75).length;
    const stocksBelow50 = durableQualityRows.filter((row) => row.overallDataScore < 50).length;
    const missingSnapshotCount = durableQualityRows.filter((row) => !row.hasLatestSnapshot).length;
    const moduleProgress: AdminImportControlCenterModuleProgress[] = [
      {
        key: "historical_prices",
        label: "Historical prices",
        status: "active",
        stocksCovered: durableQualityRows.filter((row) => row.hasHistoricalPrices).length,
        coveragePercentage:
          activeStockCount > 0
            ? (durableQualityRows.filter((row) => row.hasHistoricalPrices).length / activeStockCount) * 100
            : 0,
        fillPercentage: 100,
        warningCount: durableQualityRows.reduce((sum, row) => sum + row.warningCount, 0),
        errorCount: durableQualityRows.reduce((sum, row) => sum + row.errorCount, 0),
        latestImportedAt: findLatestIso(durableQualityRows.map((row) => row.updatedAt)),
      },
      {
        key: "quote_statistics",
        label: "Quote statistics",
        status: "degraded",
        stocksCovered: durableQualityRows.filter((row) => row.hasLatestSnapshot).length,
        coveragePercentage:
          activeStockCount > 0
            ? (durableQualityRows.filter((row) => row.hasLatestSnapshot).length / activeStockCount) * 100
            : 0,
        fillPercentage: 100,
        warningCount: staleFreshnessItems.length,
        errorCount: 0,
        latestImportedAt: findLatestIso(durableQualityRows.map((row) => row.lastImportAt)),
      },
      {
        key: "financial_statements",
        label: "Financial statements",
        status: "disabled",
        stocksCovered: durableQualityRows.filter((row) => row.hasFinancialStatements).length,
        coveragePercentage:
          activeStockCount > 0
            ? (durableQualityRows.filter((row) => row.hasFinancialStatements).length / activeStockCount) * 100
            : 0,
        fillPercentage: 0,
        warningCount: 0,
        errorCount: 0,
        latestImportedAt: findLatestIso(durableQualityRows.map((row) => row.lastImportAt)),
      },
      {
        key: "valuation_metrics",
        label: "Valuation metrics",
        status: "degraded",
        stocksCovered: durableQualityRows.filter((row) => row.hasValuationMetrics).length,
        coveragePercentage:
          activeStockCount > 0
            ? (durableQualityRows.filter((row) => row.hasValuationMetrics).length / activeStockCount) * 100
            : 0,
        fillPercentage: 0,
        warningCount: 0,
        errorCount: 0,
        latestImportedAt: findLatestIso(durableQualityRows.map((row) => row.lastImportAt)),
      },
      {
        key: "share_statistics",
        label: "Share statistics",
        status: "degraded",
        stocksCovered: 0,
        coveragePercentage: 0,
        fillPercentage: 0,
        warningCount: 0,
        errorCount: 0,
        latestImportedAt: null,
      },
      {
        key: "financial_highlights",
        label: "Financial highlights",
        status: "degraded",
        stocksCovered: 0,
        coveragePercentage: 0,
        fillPercentage: 0,
        warningCount: 0,
        errorCount: 0,
        latestImportedAt: null,
      },
    ];

    const worstStocks = [...durableQualityRows]
      .sort((left, right) => {
        const leftRank = `${String(left.overallDataScore).padStart(3, "0")}:${String(left.errorCount).padStart(6, "0")}:${String(left.missingModuleCount).padStart(3, "0")}:${left.stockId}`;
        const rightRank = `${String(right.overallDataScore).padStart(3, "0")}:${String(right.errorCount).padStart(6, "0")}:${String(right.missingModuleCount).padStart(3, "0")}:${right.stockId}`;
        return leftRank.localeCompare(rightRank);
      })
      .slice(0, 20)
      .map((row) => {
        const stock = activeStockById.get(row.stockId);
        return {
          stockId: row.stockId,
          slug: stock?.slug ?? row.stockId,
          symbol: stock?.symbol ?? row.yahooSymbol ?? "UNKNOWN",
          companyName: stock?.companyName ?? row.yahooSymbol ?? "Unknown stock",
          yahooSymbol: row.yahooSymbol,
          route: `/stocks/${stock?.slug ?? row.stockId}`,
          dataQualityScore: row.overallDataScore,
          missingModuleCount: row.missingModuleCount,
          warningCount: row.warningCount,
          errorCount: row.errorCount,
          latestSnapshotCompleted: row.hasLatestSnapshot,
          historicalCompleted: row.hasHistoricalPrices,
          lastSuccessfulImportAt: row.lastImportAt,
          nextRecommendedAction: row.hasLatestSnapshot
            ? "Open the full stock import dashboard for deeper diagnostics."
            : "Refresh the missing latest snapshot for this stock.",
        } satisfies AdminImportControlCenterWorstStockItem;
      });

    return {
      projectStatus: {
        totalActiveStocks: activeStockCount,
        stocksWithHistoricalData: durableQualityRows.filter((row) => row.hasHistoricalPrices).length,
        stocksWithLatestSnapshot: durableQualityRows.filter((row) => row.hasLatestSnapshot).length,
        stocksWithValuationData: durableQualityRows.filter((row) => row.hasValuationMetrics).length,
        stocksWithFinancialStatements: durableQualityRows.filter((row) => row.hasFinancialStatements).length,
        overallImportCompletionPercentage: average(durableQualityRows.map((row) => row.overallDataScore)),
      },
      importSafetyStatus: {
        currentThrottle: `${operationalConfig.requestsPerSecond} req/${operationalConfig.requestsPerSecond === 1 ? "sec" : "sec"} cap`,
        requestsThisHour,
        requestsToday,
        cooldownStatus:
          cleanString(latestDailyUpdateJob?.metadata.cooldownStatus, 240) || "No cooldown active",
        concurrentWorkerSetting: `1/${operationalConfig.maxConcurrentWorkers} active workers`,
        disabledModules: ["quoteSummary protected modules", "financial_statements batch lane"],
        savedRequestsAvoided: numericOrZero(latestDailyUpdateJob?.metadata.savedRequestsAvoided),
        existingDataReused: numericOrZero(latestDailyUpdateJob?.metadata.existingDataReused),
        latestBatchStatus: cleanString(latestDailyUpdateJob?.status, 160) || "not_started",
        lastYahooError:
          cleanString((recentImportErrorsRaw[0] as JsonRecord | undefined)?.error_message, 4000) || null,
      },
      dataQuality: {
        historicalRowsCount,
        snapshotRowsCount,
        missingModulesCount: durableQualityRows.reduce((sum, row) => sum + row.missingModuleCount, 0),
        warningCount: durableQualityRows.reduce((sum, row) => sum + row.warningCount, 0),
        errorCount: durableQualityRows.reduce((sum, row) => sum + row.errorCount, 0),
        reconciliationPassCount: Math.max(reconciliationTotalCount - reconciliationFailCount, 0),
        reconciliationFailCount,
        averageDataQualityScore: average(durableQualityRows.map((row) => row.overallDataScore)),
        stocksAbove75,
        stocksBelow50,
        missingSnapshotCount,
        scoreModelNote:
          "Data quality score is price-data-focused for now: historical prices, latest snapshot, limited valuation signal, limited financials signal, and recent error posture.",
        worstStocks,
      },
      recentActivity: {
        latestEvents: activityItems.slice(0, 20),
        latestFailedImports: activityItems.filter((item) => item.status === "failed").slice(0, 20),
        latestSkippedImports: activityItems.filter((item) => item.rowsSkipped > 0).slice(0, 20),
        latestReusedDataEvents: activityItems
          .filter((item) => numericOrZero(item.metadata.existingDataReused) > 0)
          .slice(0, 20),
      },
      systemHealthMonitor: {
        importHealth: {
          lastSuccessfulJobTime:
            latestSuccessJob?.completedAt ?? latestSuccessJob?.startedAt ?? latestSuccessJob?.createdAt ?? null,
          lastFailedJobTime:
            latestFailedJob?.completedAt ?? latestFailedJob?.startedAt ?? latestFailedJob?.createdAt ?? null,
          totalJobsToday,
          totalFailuresToday,
          failureRatePercentage,
        },
        dataHealth: {
          stocksWithFullHistoricalData: durableQualityRows.filter((row) => row.hasHistoricalPrices).length,
          stocksMissingRecentUpdates,
          stocksWithStaleSnapshot,
          stocksWithRepeatedWarnings: durableQualityRows.filter((row) => row.warningCount >= 3).length,
        },
        systemLoad: {
          requestsLastHour: requestsThisHour,
          requestsToday,
          currentThrottleRate: `${operationalConfig.requestsPerSecond} request every ${Math.max(1, Math.round(1000 / Math.max(operationalConfig.requestsPerSecond, 1)) / 1000)} seconds`,
          currentWorkerCount: `1 / ${operationalConfig.maxConcurrentWorkers}`,
        },
        alerts: [
          {
            key: "yahoo_cooldown_active",
            label: "Yahoo cooldown active",
            status:
              cleanString(latestDailyUpdateJob?.status, 160) === "cooling_down" ? "red" : "green",
            active: cleanString(latestDailyUpdateJob?.status, 160) === "cooling_down",
            detail:
              cleanString(latestDailyUpdateJob?.metadata.cooldownStatus, 240) || "No Yahoo cooldown is active right now.",
          },
          {
            key: "abnormal_error_spike",
            label: "Abnormal error spike",
            status: recentImportErrorsRaw.length >= 25 ? "red" : recentImportErrorsRaw.length >= 10 ? "yellow" : "green",
            active: recentImportErrorsRaw.length >= 10,
            detail: `${recentImportErrorsRaw.length} recent import errors were recorded in the last 24 hours.`,
          },
          {
            key: "missing_updates_spike",
            label: "Missing updates spike",
            status: staleFreshnessItems.length >= 250 ? "red" : staleFreshnessItems.length >= 50 ? "yellow" : "green",
            active: staleFreshnessItems.length >= 50,
            detail: `${staleFreshnessItems.length} stocks are currently stale in the durable freshness view.`,
          },
          {
            key: "db_write_failures",
            label: "DB write failures",
            status: recentImportErrorsRaw.some((row) => cleanString((row as JsonRecord).error_message, 4000).toLowerCase().includes("timeout")) ? "yellow" : "green",
            active: recentImportErrorsRaw.some((row) => cleanString((row as JsonRecord).error_message, 4000).toLowerCase().includes("timeout")),
            detail: "Recent durable import errors were checked for timeout-style write failures.",
          },
        ],
        durableAlerts: activeAlertRows,
        quarantine: {
          activeRowCount: quarantineItems.length,
          affectedStockCount: affectedQuarantineStockCount,
          latestReason: latestQuarantineReason,
          rows: quarantineItems.slice(0, 20),
        },
        freshness: {
          staleStockCount: staleFreshnessItems.length,
          acceptedExceptionCount: acceptedFreshnessItems.length,
          checkedAt: findLatestIso(durableFreshnessRows.map((row) => row.checkedAt)),
          staleStocks: staleFreshnessItems.slice(0, 20),
          acceptedExceptions: acceptedFreshnessItems.slice(0, 20),
          reasonCounts: freshnessReasonCounts,
          expectedTradingDate:
            durableFreshnessRows.find((row) => row.expectedTradingDate)?.expectedTradingDate ?? null,
          evaluationDate: evaluationDateForJobs,
          source: durableFreshnessRows.length ? "durable" : "runtime_fallback",
        },
        indicators: {
          ingestion: recentImportErrorsRaw.length >= 25 ? "red" : recentImportErrorsRaw.length >= 10 ? "yellow" : "green",
          dataFreshness: staleFreshnessItems.length > 0 ? "yellow" : "green",
          errorRate: failureRatePercentage > 5 ? "red" : failureRatePercentage > 0 ? "yellow" : "green",
        },
      },
      productionReadiness: {
        checklist: [
          {
            key: "historical_coverage_complete",
            label: "Historical coverage complete",
            status:
              durableQualityRows.every((row) => row.hasHistoricalPrices) ? "complete" : "in_progress",
            summary:
              durableQualityRows.every((row) => row.hasHistoricalPrices) ? "Complete" : "In Progress",
            detail: `${durableQualityRows.filter((row) => row.hasHistoricalPrices).length} of ${activeStockCount} active stocks currently have historical coverage.`,
          },
          {
            key: "snapshot_coverage_complete",
            label: "Snapshot coverage complete",
            status:
              durableQualityRows.every((row) => row.hasLatestSnapshot) ? "complete" : "in_progress",
            summary:
              durableQualityRows.every((row) => row.hasLatestSnapshot) ? "Complete" : "In Progress",
            detail: `${durableQualityRows.filter((row) => row.hasLatestSnapshot).length} of ${activeStockCount} active stocks currently have latest snapshot coverage.`,
          },
          {
            key: "data_quality_generated",
            label: "Data quality generated",
            status: durableQualityRows.length === activeStockCount ? "complete" : "in_progress",
            summary: durableQualityRows.length === activeStockCount ? "Complete" : "In Progress",
            detail: `${durableQualityRows.length} durable quality rows are currently available.`,
          },
          {
            key: "daily_update_cli_working",
            label: "Daily update CLI working",
            status: latestDailyUpdateJob ? "complete" : "degraded",
            summary: latestDailyUpdateJob ? "Complete" : "Degraded",
            detail: latestDailyUpdateJob
              ? "The latest daily chart-update job is visible in durable job history."
              : "No recent daily chart-update job was visible in durable job history.",
          },
          {
            key: "cron_enabled_or_disabled",
            label: "Cron enabled or disabled",
            status: "complete",
            summary: cronSnapshot.cronStatus === "enabled" ? "Enabled" : "Disabled",
            detail:
              cronSnapshot.cronStatus === "enabled"
                ? "Yahoo strict same-day-only cron is enabled for the post-close lane and retry window."
                : "Cron remains disabled.",
          },
          {
            key: "yahoo_protected_modules_disabled",
            label: "Yahoo protected modules disabled",
            status: "complete",
            summary: "Complete",
            detail: "Protected Yahoo quoteSummary and financial statement modules remain disabled for batch use.",
          },
          {
            key: "last_import_job_status",
            label: "Last import job status",
            status:
              cleanString(latestDailyUpdateJob?.status, 160) === "completed" ? "complete" : "degraded",
            summary: cleanString(latestDailyUpdateJob?.status, 160) || "Unknown",
            detail: "The latest durable daily-update batch status is shown here without loading the full diagnostics bundle.",
          },
          {
            key: "recent_errors",
            label: "Recent errors",
            status: recentImportErrorsRaw.length === 0 ? "complete" : "degraded",
            summary: recentImportErrorsRaw.length === 0 ? "Complete" : "Degraded",
            detail: `${recentImportErrorsRaw.length} recent durable import errors are still visible in the last 24 hours.`,
          },
        ],
        latestDailyUpdateJobStatus: cleanString(latestDailyUpdateJob?.status, 160) || "unknown",
        recentErrorCount: recentImportErrorsRaw.length,
        cronStatus: cronSnapshot.cronStatus,
        lastCronRunTime: cronSnapshot.lastCronRunTime,
        lastCronResult: cronSnapshot.lastCronResult,
        activeCronJobProgress,
        currentRecommendation:
          staleFreshnessItems.length === 0 && recentImportErrorsRaw.length === 0 ? "Ready" : "Not Ready",
        recommendationNote:
          staleFreshnessItems.length === 0 && recentImportErrorsRaw.length === 0
            ? "The lightweight control-center checks do not currently show stale stocks or recent import errors."
            : "Heavy diagnostics were deferred on first load. Use the stock import dashboard for deeper drill-down before enabling cron.",
      },
      progressByModule: moduleProgress,
      warnings: [
        ...warnings,
        "Heavy per-stock diagnostics are deferred on first load to keep this page responsive. Use the stock import dashboard for deeper drill-down.",
      ],
    };
  });
}

export async function getAdminImportControlCenterData(
  options: { includeDashboardStockRows?: boolean } = {},
): Promise<AdminImportControlCenterData> {
  return withDevelopmentTiming("getAdminImportControlCenterData", async () => {
    ensureControlCenterReady();
    const warnings: string[] = [];
    const dashboard = await getAdminStockImportDashboardData({
      includeStockRows: options.includeDashboardStockRows !== false,
    });

  const [
    activeStockCount,
    activeInstrumentCount,
    historicalRowsCount,
    snapshotRowsCount,
    errorCount,
    reconciliationTotalCount,
    reconciliationFailCount,
    coverageRowsRaw,
    activityRowsRaw,
    legacyInstrumentRows,
    durableQualityRows,
    latestDailyUpdateJobsRaw,
    recentImportErrorsRaw,
    activeStockRowsRaw,
    durableFreshnessRowsRaw,
    quarantineRowsRaw,
    cronSnapshot,
  ] = await Promise.all([
    countExact(warnings, "stocks_master", (query) => query.eq("status", "active")),
    countExact(warnings, "instruments", (query) => query.eq("status", "active")),
    countExact(warnings, "stock_price_history"),
    countExact(warnings, "stock_market_snapshot"),
    countExact(warnings, "stock_import_errors"),
    countExact(warnings, "stock_import_reconciliation"),
    countExact(warnings, "stock_import_reconciliation", (query) =>
      query.eq("reconciliation_status", "failed"),
    ),
    safeSelectRows(
      warnings,
      "stock_import_coverage",
      "stock_id, bucket_key, coverage_status, latest_trade_date, latest_fiscal_date, latest_imported_at, rows_available, rows_imported, row_count, warning_count, error_count, coverage_notes, metadata",
      (query) => query.range(0, 25000),
    ),
    safeSelectRows(
      warnings,
      "stock_import_activity_log",
      "id, job_id, job_item_id, stock_id, yahoo_symbol, module_name, step_name, status, message, rows_fetched, rows_inserted, rows_updated, rows_skipped, mapped_fields_count, missing_fields_count, fill_percentage, affected_table, started_at, completed_at, error_message, metadata",
      (query) => query.order("started_at", { ascending: false }).range(0, 199),
    ),
    safeSelectRows(
      warnings,
      "instruments",
      "id, symbol, slug, name, status",
      (query) => query.eq("status", "active").range(0, 200),
    ),
    loadDurableQualityRows(warnings),
    safeSelectRows(
      warnings,
      "stock_import_jobs",
      "id, status, import_scope, started_at, completed_at, created_at, updated_at, metadata",
      (query) =>
        query
          .eq("job_kind", "yahoo_batch_import")
          .order("created_at", { ascending: false })
          .limit(100),
    ),
    safeSelectRows(
      warnings,
      "stock_import_errors",
      "id, error_message, created_at, metadata",
      (query) => query.gte("created_at", startOfRecentWindowIso(24)).order("created_at", { ascending: false }),
    ),
    safeSelectRows(
      warnings,
      "stocks_master",
      "id, slug, symbol, company_name, yahoo_symbol",
      (query) => query.eq("status", "active").range(0, 4999),
    ),
    loadDurableFreshnessRows(warnings),
    loadActiveMarketDataRowQuarantines({ limit: 5000 }).catch((error) => {
      warnings.push(
        `market_data_row_quarantine: ${error instanceof Error ? error.message : "Unknown read failure."}`,
      );
      return [] as MarketDataRowQuarantineItem[];
    }),
    loadYahooDailyCronSnapshot(warnings),
  ]);

  const stockMap = new Map(dashboard.stocks.map((stock) => [stock.stockId, stock]));
  const normalizedActivity = activityRowsRaw.map(normalizeActivityRow);
  const activityItems = normalizedActivity.map((row) => toActivityItem(row, stockMap));
  const useDurableQualityRows = durableQualityRows.length > 0;
  const averageDataQualityScore = useDurableQualityRows
    ? average(durableQualityRows.map((row) => row.overallDataScore))
    : average(dashboard.stocks.map((stock) => stock.dataQualityScore));
  const stocksAbove75 = useDurableQualityRows
    ? durableQualityRows.filter((row) => row.overallDataScore >= 75).length
    : dashboard.stocks.filter((stock) => stock.dataQualityScore >= 75).length;
  const stocksBelow50 = useDurableQualityRows
    ? durableQualityRows.filter((row) => row.overallDataScore < 50).length
    : dashboard.stocks.filter((stock) => stock.dataQualityScore < 50).length;
  const missingSnapshotCount = useDurableQualityRows
    ? durableQualityRows.filter((row) => !row.hasLatestSnapshot).length
    : dashboard.stocks.filter((stock) => !stock.latestSnapshotCompleted).length;
  const worstStocks = useDurableQualityRows
    ? buildWorstStockItemsFromDurableRows(durableQualityRows, stockMap)
    : buildWorstStockItems(dashboard.stocks);

  const { normalizedRows: coverageRows, coverageByStockId } = buildCoverageMap(coverageRowsRaw);
  const progressByModule: AdminImportControlCenterModuleProgress[] = [
    buildModuleProgress(
      "historical_prices",
      "Historical prices",
      "active",
      ["historical_prices"],
      dashboard.stocks,
      coverageByStockId,
    ),
    buildModuleProgress(
      "quote_statistics",
      "Quote statistics",
      "degraded",
      ["latest_market_snapshot"],
      dashboard.stocks,
      coverageByStockId,
    ),
    buildModuleProgress(
      "financial_statements",
      "Financial statements",
      "disabled",
      [
        "income_statement_annual",
        "income_statement_quarterly",
        "balance_sheet_annual",
        "balance_sheet_quarterly",
        "cash_flow_annual",
        "cash_flow_quarterly",
      ],
      dashboard.stocks,
      coverageByStockId,
    ),
    buildModuleProgress(
      "valuation_metrics",
      "Valuation metrics",
      "degraded",
      ["valuation_metrics"],
      dashboard.stocks,
      coverageByStockId,
    ),
    buildModuleProgress(
      "share_statistics",
      "Share statistics",
      "degraded",
      ["share_statistics"],
      dashboard.stocks,
      coverageByStockId,
    ),
    buildModuleProgress(
      "financial_highlights",
      "Financial highlights",
      "degraded",
      ["financial_highlights"],
      dashboard.stocks,
      coverageByStockId,
    ),
  ];

  const safeImportableStocks = dashboard.stocks.filter((stock) => stock.importable);
  const activeStockSymbols = new Set(
    safeImportableStocks
      .map((stock) => cleanString(stock.symbol, 160).toUpperCase())
      .filter(Boolean),
  );
  const legacyInstrumentOverlapCount = legacyInstrumentRows.filter((row) =>
    activeStockSymbols.has(cleanString(row.symbol, 160).toUpperCase()),
  ).length;
  const latestSnapshotsMissingCount = Math.max(
    (activeStockCount || safeImportableStocks.length) -
      dashboard.summary.stocksWithLatestSnapshotCompleted,
    0,
  );
  const valuationReadyCount = dashboard.summary.stocksWithValuationDataCompleted;
  const financialsReadyCount = dashboard.summary.stocksWithFinancialsCompleted;
  const actionScope = {
    safeDryRunSymbol: "RELIANCE.NS",
    boundedWorkerSlice: 10,
    missingHistoricalStocks: dashboard.stocks.filter(
      (stock) => stock.importable && !stock.historicalCompleted,
    ).length,
    snapshotRefreshStocks: dashboard.stocks.filter((stock) => stock.importable).length,
    retrySafeModuleStocks: dashboard.stocks.filter((stock) => stock.importable && stock.failed).length,
  };
  const latestDailyUpdateJob = latestDailyUpdateJobsRaw
    .map((row) => ({
      id: cleanString(row.id, 160),
      status: cleanString(row.status, 160),
      createdAt: cleanString(row.created_at, 160) || null,
      updatedAt: cleanString(row.updated_at, 160) || null,
      metadata: normalizeMetadata(row.metadata),
    }))
    .find((job) => isYahooDailyUpdateBatchProfile(cleanString(job.metadata.batchProfile, 160)));
  const normalizedRecentJobs = latestDailyUpdateJobsRaw.map((row) => ({
    id: cleanString(row.id, 160),
    status: cleanString(row.status, 160),
    startedAt: cleanString(row.started_at, 160) || null,
    completedAt: cleanString(row.completed_at, 160) || null,
    createdAt: cleanString(row.created_at, 160) || null,
    updatedAt: cleanString(row.updated_at, 160) || null,
    metadata: normalizeMetadata(row.metadata),
  }));
  const recentDailyJobs = normalizedRecentJobs.filter(
    (job) => isYahooDailyUpdateBatchProfile(cleanString(job.metadata.batchProfile, 160)),
  );
  const activeCronJobProgress =
    recentDailyJobs.map(normalizeActiveCronJobProgress).find(Boolean) ?? null;
  const activeStockRows = activeStockRowsRaw;
  const durableFreshnessRows = durableFreshnessRowsRaw
    .map(normalizeDurableFreshnessRow)
    .filter((row) => row.stockId);
  const quarantineItems = buildQuarantineItems(quarantineRowsRaw, activeStockRowsRaw);
  const latestQuarantineReason = quarantineItems[0]?.reason ?? null;
  const affectedQuarantineStockCount = new Set(
    quarantineItems.map((row) => row.stockId).filter((row): row is string => Boolean(row)),
  ).size;
  const coverageLatestByStockId = new Map<string, { lastPriceDate: string | null; lastSnapshotDate: string | null }>();
  for (const [stockId, stockCoverage] of coverageByStockId.entries()) {
    const existing = coverageLatestByStockId.get(stockId) ?? {
      lastPriceDate: null,
      lastSnapshotDate: null,
    };
    const historicalRow = stockCoverage.get("historical_prices");
    const snapshotRow = stockCoverage.get("latest_market_snapshot");
    if (historicalRow) {
      existing.lastPriceDate = historicalRow?.latestTradeDate ?? null;
    }
    if (snapshotRow) {
      existing.lastSnapshotDate = snapshotRow.latestTradeDate ?? null;
    }
    coverageLatestByStockId.set(stockId, existing);
  }
  const tradingDatePolicy = resolveIndianTradingDatePolicy({
    globalLatestTradingDate: getLatestCoverageTradeDate(coverageByStockId),
  });
  const latestDailyUpdateJobStatus =
    latestDailyUpdateJob?.status || cleanString(dashboard.yahooOperations.latestBatchStatus, 160) || "unknown";
  const recentErrorCount = recentImportErrorsRaw.length;
  const durableQualityRowCount = durableQualityRows.length;
  const historicalCoverageComplete =
    dashboard.summary.stocksWithHistoricalDataCompleted >= (activeStockCount || safeImportableStocks.length);
  const snapshotCoverageComplete =
    dashboard.summary.stocksWithLatestSnapshotCompleted >= (activeStockCount || safeImportableStocks.length);
  const dataQualityGenerated = durableQualityRowCount >= (activeStockCount || safeImportableStocks.length);
  const dailyUpdateCliWorking = latestDailyUpdateJobStatus === "completed" || latestDailyUpdateJobStatus === "completed_with_errors";
  const yahooProtectedModulesDisabled = Object.values(dashboard.yahooOperations.disabledModules).some((value) =>
    cleanString(value, 160).includes("protected_quote_summary_disabled"),
  );
  const cronStatus: "enabled" | "disabled" = cronSnapshot.cronStatus;
  const recentErrorsHealthy = recentErrorCount === 0;
  const latestJobHealthy = latestDailyUpdateJobStatus === "completed" || latestDailyUpdateJobStatus === "completed_with_errors";
  const productionReady =
    historicalCoverageComplete &&
    snapshotCoverageComplete &&
    dataQualityGenerated &&
    dailyUpdateCliWorking &&
    cronStatus === "enabled" &&
    yahooProtectedModulesDisabled &&
    latestJobHealthy &&
    recentErrorsHealthy;
  const recommendationNote = productionReady
    ? "The strict same-day-only Yahoo cron lane is enabled and the latest operator checks are aligned with unattended post-close scheduling."
    : "The chart-only daily lane is functional, but it is not yet production-ready for unattended scheduling because recent durable errors, freshness, or cron state still need attention.";
  const lastSuccessfulJobTime =
    recentDailyJobs.find((job) => job.status === "completed" || job.status === "completed_with_errors")?.completedAt ||
    null;
  const lastFailedJobTime = recentDailyJobs.find((job) => job.status === "failed")?.completedAt || null;
  const totalJobsToday = recentDailyJobs.length;
  const totalFailuresToday = recentDailyJobs.filter((job) => job.status === "failed").length;
  const failureRatePercentage = totalJobsToday
    ? (totalFailuresToday / totalJobsToday) * 100
    : 0;
  const stocksWithFullHistoricalData = dashboard.summary.stocksWithHistoricalDataCompleted;
  let stocksMissingRecentUpdates = durableQualityRows.filter(
    (row) => !row.hasHistoricalPrices || diffInDaysFromNow(row.historicalLastDate) > 5,
  ).length;
  let stocksWithStaleSnapshot = coverageRows.filter(
    (row) => row.bucketKey === "latest_market_snapshot" && diffInDaysFromNow(row.latestTradeDate) > 1,
  ).length;
  const stocksWithRepeatedWarnings = durableQualityRows.filter((row) => row.warningCount >= 3).length;
  const hasDbWriteFailures = recentImportErrorsRaw.some((row) => {
    const message = `${cleanString(row.error_message, 4000)} ${cleanString(normalizeMetadata(row.metadata).message, 4000)}`.toLowerCase();
    return (
      message.includes("could not insert stock_price_history") ||
      message.includes("timed out") ||
      message.includes("write")
    );
  });
  const hasAbnormalErrorSpike = recentErrorCount >= 10;
  let hasMissingUpdatesSpike = stocksMissingRecentUpdates >= 25 || stocksWithStaleSnapshot >= 25;
  const hasCooldownActive = dashboard.yahooOperations.cooldownUntil !== null;
  const ingestionStatus: AdminImportControlCenterHealthStatus = hasCooldownActive
    ? "red"
    : totalFailuresToday > 0 || latestDailyUpdateJobStatus === "failed"
      ? "yellow"
      : latestJobHealthy
        ? "green"
        : "yellow";
  let dataFreshnessStatus: AdminImportControlCenterHealthStatus = hasMissingUpdatesSpike
    ? "red"
    : stocksMissingRecentUpdates > 0 || stocksWithStaleSnapshot > 0
      ? "yellow"
      : "green";
  const errorRateStatus: AdminImportControlCenterHealthStatus = hasAbnormalErrorSpike || hasDbWriteFailures
    ? "red"
    : recentErrorCount > 0 || failureRatePercentage > 0
      ? "yellow"
      : "green";
  const totalSnapshotCoverage = dashboard.summary.stocksWithLatestSnapshotCompleted;
  const snapshotSkipCoverageRate =
    totalSnapshotCoverage > 0
      ? (dashboard.yahooOperations.skipBreakdown.skippedExistingSnapshot / totalSnapshotCoverage) * 100
      : 0;
  const noSuccessfulJobInLast6Hours =
    !lastSuccessfulJobTime ||
    Date.now() - new Date(lastSuccessfulJobTime).getTime() > 6 * 60 * 60 * 1000;
  const durableAlerts = await syncDurableImportAlerts(warnings, [
    {
      alertType: "job_failure_rate_high",
      severity: failureRatePercentage > 10 ? "critical" : "warning",
      message: `Daily chart update failure rate is ${failureRatePercentage.toFixed(1)}% across the recent 100-job monitoring window.`,
      affectedScope: "recent_jobs",
      active: failureRatePercentage > 5,
      metadata: {
        totalJobsToday,
        totalFailuresToday,
        failureRatePercentage,
      },
    },
    {
      alertType: "yahoo_cooldown_triggered",
      severity: "critical",
      message: dashboard.yahooOperations.cooldownStatus,
      affectedScope: "daily_chart_update",
      active: hasCooldownActive,
      metadata: {
        cooldownUntil: dashboard.yahooOperations.cooldownUntil,
        cooldownStatus: dashboard.yahooOperations.cooldownStatus,
      },
    },
    {
      alertType: "snapshot_skip_rate_high",
      severity: snapshotSkipCoverageRate > 25 ? "critical" : "warning",
      message: `Same-day snapshot skips are ${snapshotSkipCoverageRate.toFixed(1)}% of snapshot-covered stocks.`,
      affectedScope: "snapshot_updates",
      active: snapshotSkipCoverageRate > 10,
      metadata: {
        skippedExistingSnapshot: dashboard.yahooOperations.skipBreakdown.skippedExistingSnapshot,
        stocksWithLatestSnapshot: totalSnapshotCoverage,
        snapshotSkipCoverageRate,
      },
    },
    {
      alertType: "db_write_failures_spike",
      severity: "critical",
      message: "Recent durable import errors include write-timeout or insert-style failures.",
      affectedScope: "db_write_path",
      active: hasDbWriteFailures,
      metadata: {
        recentErrorCount,
      },
    },
    {
      alertType: "no_successful_job_in_6h",
      severity: "critical",
      message: "No successful daily chart update job has completed in the last 6 hours.",
      affectedScope: "daily_chart_update",
      active: noSuccessfulJobInLast6Hours,
      metadata: {
        lastSuccessfulJobTime,
      },
    },
  ]);
  const freshnessItems = durableFreshnessRows.length
    ? buildFreshnessItems(durableFreshnessRows, activeStockRows)
    : buildFreshnessItems(
        activeStockRows.map((row) => {
          const stockId = cleanString(row.id, 160);
          const latestCoverage = coverageLatestByStockId.get(stockId) ?? {
            lastPriceDate: null,
            lastSnapshotDate: null,
          };
          const hasTodayPrice = latestCoverage.lastPriceDate === tradingDatePolicy.expectedTradingDate;
          const hasTodaySnapshot =
            latestCoverage.lastSnapshotDate === tradingDatePolicy.expectedTradingDate;
          const classification = classifyStockFreshness({
            yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
            expectedTradingDate: tradingDatePolicy.expectedTradingDate,
            policyReason: tradingDatePolicy.policyReason,
            hasExpectedPrice: hasTodayPrice,
            hasExpectedSnapshot: hasTodaySnapshot,
            lastPriceDate: latestCoverage.lastPriceDate,
            lastSnapshotDate: latestCoverage.lastSnapshotDate,
          });
          return {
            stockId,
            hasTodayPrice,
            hasTodaySnapshot,
            lastPriceDate: latestCoverage.lastPriceDate,
            lastSnapshotDate: latestCoverage.lastSnapshotDate,
            expectedTradingDate: tradingDatePolicy.expectedTradingDate,
            evaluationDate: tradingDatePolicy.evaluationDate,
            reasonCategory: classification.reasonCategory,
            marketSessionState: tradingDatePolicy.marketSessionState,
            isStale: classification.isStale,
            checkedAt: new Date().toISOString(),
          };
        }),
        activeStockRows,
      );
  const acceptedFreshnessItems = freshnessItems.filter(
    (item) => item.reasonCategory === "provider_no_data",
  );
  const staleFreshnessItems = freshnessItems.filter(
    (item) => item.isStale && item.reasonCategory !== "provider_no_data",
  );
  const freshnessReasonCounts = buildFreshnessReasonCounts(freshnessItems);
  const freshnessCheckedAt =
    durableFreshnessRows.find((row) => row.checkedAt)?.checkedAt ||
    (freshnessItems[0]?.checkedAt ?? null);
  stocksMissingRecentUpdates = freshnessItems.filter(
    (item) => !item.hasTodayPrice && item.reasonCategory !== "provider_no_data",
  ).length;
  stocksWithStaleSnapshot = freshnessItems.filter(
    (item) => !item.hasTodaySnapshot && item.reasonCategory !== "provider_no_data",
  ).length;
  hasMissingUpdatesSpike = stocksMissingRecentUpdates >= 25 || stocksWithStaleSnapshot >= 25;
  dataFreshnessStatus = hasMissingUpdatesSpike
    ? "red"
    : stocksMissingRecentUpdates > 0 || stocksWithStaleSnapshot > 0
      ? "yellow"
      : "green";

    return {
    projectStatus: {
      totalActiveStocks: activeStockCount || safeImportableStocks.length,
      stocksWithHistoricalData: dashboard.summary.stocksWithHistoricalDataCompleted,
      stocksWithLatestSnapshot: dashboard.summary.stocksWithLatestSnapshotCompleted,
      stocksWithValuationData: dashboard.summary.stocksWithValuationDataCompleted,
      stocksWithFinancialStatements: dashboard.summary.stocksWithFinancialsCompleted,
      overallImportCompletionPercentage: average(
        dashboard.stocks.map((stock) => stock.importPercentage),
      ),
    },
    dataSourceStatus: [
      {
        label: "Yahoo historical",
        status: "active",
        summary: "Active",
        note: "Daily chart and OHLCV history imports are live and are the primary durable source for historical price data.",
      },
      {
        label: "Yahoo quote/statistics",
        status: "degraded",
        summary: "Degraded snapshot-only mode",
        note: "Latest market snapshot is usable, but protected valuation and statistics modules are still upstream-blocked in this runtime.",
      },
      {
        label: "Yahoo financial statements",
        status: "disabled",
        summary: "Disabled for batch",
        note: "Financial statements remain manual single-stock test only because Yahoo continues to block those protected modules in live batch mode.",
      },
      {
        label: "NSE provider lane",
        status: "future",
        summary: "Not active",
        note: "NSE stays available as a backup or future provider lane, but it is not part of the live Yahoo batch import flow right now.",
      },
    ],
    importSafetyStatus: {
      currentThrottle: dashboard.yahooOperations.currentRequestPace,
      requestsThisHour: dashboard.yahooOperations.requestsUsedCurrentHour,
      requestsToday: dashboard.yahooOperations.requestsUsedToday,
      cooldownStatus: dashboard.yahooOperations.cooldownStatus,
      concurrentWorkerSetting: `${dashboard.yahooOperations.activeWorkers}/${dashboard.yahooOperations.maxConcurrentWorkers} active workers`,
      disabledModules: Object.entries(dashboard.yahooOperations.disabledModules).map(
        ([moduleName, status]) => `${moduleName}: ${status}`,
      ),
      savedRequestsAvoided: dashboard.yahooOperations.savedRequestsAvoided,
      existingDataReused: dashboard.yahooOperations.existingDataReused,
      latestBatchStatus: dashboard.yahooOperations.latestBatchStatus,
      lastYahooError: dashboard.yahooOperations.lastYahooError,
    },
    dataQuality: {
      historicalRowsCount,
      snapshotRowsCount,
      missingModulesCount: countIncompleteModules(dashboard.stocks, coverageByStockId),
      warningCount: coverageRows.reduce((sum, row) => sum + row.warningCount, 0),
      errorCount,
      reconciliationPassCount: Math.max(reconciliationTotalCount - reconciliationFailCount, 0),
      reconciliationFailCount,
      averageDataQualityScore,
      stocksAbove75,
      stocksBelow50,
      missingSnapshotCount,
      scoreModelNote:
        durableQualityRows[0]?.scoreNotes ||
        "Data quality score is price-data-focused for now: 50 historical, 25 latest snapshot, 10 valuation signal, 10 financial statements, and 5 for no recent import errors. Yahoo protected fundamentals are still blocked at scale.",
      worstStocks,
    },
    recentActivity: {
      latestEvents: activityItems.slice(0, 20),
      latestFailedImports: activityItems.filter((item) => item.status === "failed").slice(0, 8),
      latestSkippedImports: activityItems.filter(isSkippedActivity).slice(0, 8),
      latestReusedDataEvents: activityItems.filter(isReusedDataActivity).slice(0, 8),
    },
    systemHealthMonitor: {
      importHealth: {
        lastSuccessfulJobTime,
        lastFailedJobTime,
        totalJobsToday,
        totalFailuresToday,
        failureRatePercentage,
      },
      dataHealth: {
        stocksWithFullHistoricalData,
        stocksMissingRecentUpdates,
        stocksWithStaleSnapshot,
        stocksWithRepeatedWarnings,
      },
      systemLoad: {
        requestsLastHour: dashboard.yahooOperations.requestsUsedCurrentHour,
        requestsToday: dashboard.yahooOperations.requestsUsedToday,
        currentThrottleRate: dashboard.yahooOperations.currentRequestPace,
        currentWorkerCount: `${dashboard.yahooOperations.activeWorkers}/${dashboard.yahooOperations.maxConcurrentWorkers}`,
      },
      alerts: [
        {
          key: "yahoo_cooldown_active",
          label: "Yahoo cooldown active",
          status: hasCooldownActive ? "red" : "green",
          active: hasCooldownActive,
          detail: hasCooldownActive
            ? dashboard.yahooOperations.cooldownStatus
            : "No Yahoo cooldown is active right now.",
        },
        {
          key: "abnormal_error_spike",
          label: "Abnormal error spike",
          status: hasAbnormalErrorSpike ? "red" : recentErrorCount > 0 ? "yellow" : "green",
          active: hasAbnormalErrorSpike,
          detail: recentErrorCount
            ? `${recentErrorCount} durable import error rows were recorded in the last 24 hours.`
            : "No durable import error spike is currently visible.",
        },
        {
          key: "missing_updates_spike",
          label: "Missing updates spike",
          status: hasMissingUpdatesSpike ? "red" : stocksMissingRecentUpdates > 0 || stocksWithStaleSnapshot > 0 ? "yellow" : "green",
          active: hasMissingUpdatesSpike,
          detail:
            `Missing recent updates: ${stocksMissingRecentUpdates}. Stale snapshots (>24h): ${stocksWithStaleSnapshot}.`,
        },
        {
          key: "db_write_failures",
          label: "DB write failures",
          status: hasDbWriteFailures ? "red" : "green",
          active: hasDbWriteFailures,
          detail: hasDbWriteFailures
            ? "Recent durable import errors include write-timeout or insert-style failures. Review before unattended runs."
            : "No recent write-timeout or insert-failure signal is currently visible.",
        },
      ],
      durableAlerts,
      quarantine: {
        activeRowCount: quarantineItems.length,
        affectedStockCount: affectedQuarantineStockCount,
        latestReason: latestQuarantineReason,
        rows: quarantineItems.slice(0, 25),
      },
      freshness: {
        staleStockCount: staleFreshnessItems.length,
        acceptedExceptionCount: acceptedFreshnessItems.length,
        checkedAt: freshnessCheckedAt,
        staleStocks: staleFreshnessItems.slice(0, 25),
        acceptedExceptions: acceptedFreshnessItems.slice(0, 25),
        reasonCounts: freshnessReasonCounts,
        expectedTradingDate: freshnessItems[0]?.expectedTradingDate ?? tradingDatePolicy.expectedTradingDate,
        evaluationDate: freshnessItems[0]?.evaluationDate ?? tradingDatePolicy.evaluationDate,
        source: durableFreshnessRows.length ? "durable" : "runtime_fallback",
      },
      indicators: {
        ingestion: ingestionStatus,
        dataFreshness: dataFreshnessStatus,
        errorRate: errorRateStatus,
      },
    },
    productionReadiness: {
      checklist: [
        {
          key: "historical_coverage_complete",
          label: "Historical coverage complete",
          status: historicalCoverageComplete ? "complete" : "in_progress",
          summary: historicalCoverageComplete ? "Complete" : "In Progress",
          detail: `${dashboard.summary.stocksWithHistoricalDataCompleted} of ${activeStockCount || safeImportableStocks.length} active stocks currently have durable historical price coverage.`,
        },
        {
          key: "snapshot_coverage_complete",
          label: "Snapshot coverage complete",
          status: snapshotCoverageComplete ? "complete" : "in_progress",
          summary: snapshotCoverageComplete ? "Complete" : "In Progress",
          detail: `${dashboard.summary.stocksWithLatestSnapshotCompleted} of ${activeStockCount || safeImportableStocks.length} active stocks currently have latest snapshot coverage.`,
        },
        {
          key: "data_quality_generated",
          label: "Data quality generated",
          status: dataQualityGenerated ? "complete" : "in_progress",
          summary: dataQualityGenerated ? "Complete" : "In Progress",
          detail: `${durableQualityRowCount} durable stock_data_quality_summary rows are currently available for the active stock universe.`,
        },
        {
          key: "daily_update_cli_working",
          label: "Daily update CLI working",
          status: dailyUpdateCliWorking ? "complete" : "degraded",
          summary: dailyUpdateCliWorking ? "Complete" : "Degraded",
          detail: `Latest daily chart update job status: ${latestDailyUpdateJobStatus.replaceAll("_", " ")}.`,
        },
        {
          key: "cron_enabled_or_disabled",
          label: "Cron enabled or disabled",
          status: cronStatus === "enabled" ? "complete" : "degraded",
          summary: cronStatus === "enabled" ? "Enabled" : "Disabled",
          detail:
            cronStatus === "enabled"
              ? "Cron is enabled. The scheduler should stay on the strict same-day-only Yahoo lane with the post-close primary run and retry window."
              : "Cron remains disabled. Manual CLI and bounded admin actions are the only approved execution paths right now.",
        },
        {
          key: "yahoo_protected_modules_disabled",
          label: "Yahoo protected modules disabled",
          status: yahooProtectedModulesDisabled ? "complete" : "degraded",
          summary: yahooProtectedModulesDisabled ? "Complete" : "Degraded",
          detail:
            "Protected Yahoo fundamentals such as valuation, share statistics, financial highlights, and financial statements remain intentionally disabled or excluded from the daily chart update lane.",
        },
        {
          key: "last_import_job_status",
          label: "Last import job status",
          status: latestJobHealthy ? "complete" : "degraded",
          summary: latestDailyUpdateJobStatus.replaceAll("_", " "),
          detail: latestDailyUpdateJob
            ? `Latest daily chart update job ${latestDailyUpdateJob.id} finished with status ${latestDailyUpdateJobStatus.replaceAll("_", " ")}.`
            : "No recent daily chart update job could be confirmed from durable job history.",
        },
        {
          key: "recent_errors",
          label: "Recent errors",
          status: recentErrorsHealthy ? "complete" : "degraded",
          summary: recentErrorsHealthy ? "No recent errors" : `${recentErrorCount} recent errors`,
          detail: recentErrorsHealthy
            ? "No stock_import_errors rows were recorded in the last 24 hours."
            : `${recentErrorCount} stock_import_errors rows were recorded in the last 24 hours. Review them before enabling unattended scheduling.`,
        },
      ],
      latestDailyUpdateJobStatus,
      recentErrorCount,
      cronStatus,
      lastCronRunTime: cronSnapshot.lastCronRunTime,
      lastCronResult: cronSnapshot.lastCronResult,
      activeCronJobProgress,
      currentRecommendation: productionReady ? "Ready" : "Not Ready",
      recommendationNote,
    },
    statusLegend: [
      {
        key: "complete",
        label: "Complete",
        explanation: "This lane is healthy right now and does not need more migration work before normal use.",
      },
      {
        key: "in_progress",
        label: "In Progress",
        explanation: "This lane is working, but more imports or coverage expansion are still needed before it is considered complete.",
      },
      {
        key: "degraded",
        label: "Degraded",
        explanation: "This lane has a safe fallback, but some upstream Yahoo data is blocked or incomplete so the result is only partially complete.",
      },
      {
        key: "disabled_by_design",
        label: "Disabled by Design",
        explanation: "This lane is intentionally disabled in batch mode to prevent repeated Yahoo failures, request waste, and noisy broken imports.",
      },
      {
        key: "needs_migration",
        label: "Needs Migration",
        explanation: "This lane still depends on an older data model or route layer, so it must be migrated before legacy data can be safely removed.",
      },
    ],
    whatNeedsFixingNext: [
      {
        key: "historical_prices",
        label: "Historical prices",
        status: "complete",
        summary: "Complete and healthy.",
        detail: `${dashboard.summary.stocksWithHistoricalDataCompleted} of ${activeStockCount || safeImportableStocks.length} active stocks now have historical price coverage, so the Yahoo history lane is in the healthy state.`,
      },
      {
        key: "latest_snapshots",
        label: "Latest snapshots",
        status: "in_progress",
        summary: "Partially complete, action needed to import missing snapshots.",
        detail: `${dashboard.summary.stocksWithLatestSnapshotCompleted} of ${activeStockCount || safeImportableStocks.length} active stocks have latest snapshot coverage. ${latestSnapshotsMissingCount} stocks still need safe snapshot imports.`,
      },
      {
        key: "yahoo_protected_fundamentals",
        label: "Yahoo protected fundamentals",
        status: "disabled_by_design",
        summary: "Disabled for batch due to Yahoo 401 and 429 behavior.",
        detail: "Protected quoteSummary-style fundamentals are intentionally kept out of live batch mode because repeated Yahoo 401 and 429 responses make that lane unreliable and wasteful at scale.",
      },
      {
        key: "valuation_share_highlights",
        label: "Valuation, share statistics, and financial highlights",
        status: "degraded",
        summary: "Not reliable from Yahoo currently.",
        detail: `${valuationReadyCount} stock currently has durable valuation-style pilot data. That is not enough to treat Yahoo protected fundamentals as reliable for the full stock universe.`,
      },
      {
        key: "financial_statements",
        label: "Financial statements",
        status: "disabled_by_design",
        summary: "Manual single-stock test only.",
        detail: `${financialsReadyCount} stock currently has financial statement coverage. Batch financial statements stay intentionally disabled until Yahoo fundamentals become dependable enough for scale.`,
      },
      {
        key: "canonical_stock_universe",
        label: "Canonical stock universe",
        status: "complete",
        summary: "stocks_master is now the import source of truth.",
        detail: `${activeStockCount || safeImportableStocks.length} active stocks are now tracked in stocks_master, and that table is the canonical import universe going forward.`,
      },
      {
        key: "legacy_instruments_layer",
        label: "Legacy instruments layer",
        status: "needs_migration",
        summary: "Still used by public stock pages and must not be deleted yet.",
        detail: `${activeInstrumentCount} older active instrument rows still exist, with ${legacyInstrumentOverlapCount} symbol overlaps against the canonical stocks_master universe. Public stock routes still depend on this layer, so it must be migrated before cleanup.`,
      },
    ],
    progressByModule,
    actionScope,
    dashboard:
      options.includeDashboardStockRows === false
        ? {
            ...dashboard,
            stocks: [],
          }
        : dashboard,
    warnings: [...dashboard.warnings, ...warnings],
    };
  });
}
