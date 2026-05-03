import { randomUUID } from "crypto";

import {
  buildYahooSameDayHistoricalSignature,
  runYahooFinancialStatementsImport,
  runYahooDailySameDayOnlyImport,
  runYahooHistoricalOhlcvImport,
  runYahooQuoteStatisticsImport,
  type YahooDailySameDayOnlyImportResult,
  type YahooFinancialStatementsImportResult,
  type YahooHistoricalOhlcvImportResult,
  type YahooQuoteStatisticsImportResult,
  type YahooSameDayHistoricalRow,
} from "@/lib/yahoo-finance-import";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getYahooFailureCooldownMinutes,
  getYahooMaxConcurrentWorkers,
  getYahooOperationalConfig,
  getYahooOperationalGuardrailSnapshot,
  isLikelyYahooProviderFailureMessage,
  isYahooGuardrailError,
  logYahooImportError,
  resolveYahooStockTarget,
} from "@/lib/yahoo-finance-service";

export const YAHOO_BATCH_IMPORT_MODULES = [
  "historical_prices",
  "quote_statistics",
  "financial_statements",
] as const;

const DEFAULT_YAHOO_BATCH_IMPORT_MODULES: YahooBatchImportModule[] = [
  "quote_statistics",
];
const YAHOO_BATCH_AUTO_PAUSE_AFTER_FAILURES = 2;
const YAHOO_DAILY_SAME_DAY_CRON_BATCH_SIZE = 25;
const YAHOO_DAILY_SAME_DAY_CRON_PRIMARY_PROFILE = "daily_same_day_only_cron_primary";
const YAHOO_DAILY_SAME_DAY_CRON_RETRY_PROFILE = "daily_same_day_only_cron_retry";

export type YahooBatchImportModule = (typeof YAHOO_BATCH_IMPORT_MODULES)[number];
export type YahooBatchDuplicateMode = "replace_matching_dates" | "skip_existing_dates";
export type YahooBatchControlAction = "pause" | "resume" | "retry" | "stop";
export type YahooBatchVisibleStatus =
  | "running"
  | "paused"
  | "cooling_down"
  | "failed"
  | "completed"
  | "stopped";
export type YahooBatchControlState = "active" | "pause_requested" | "paused" | "stop_requested";

type JsonRecord = Record<string, unknown>;

type BatchJobRow = {
  id: string;
  status: string;
  totalItems: number;
  importedItems: number;
  updatedItems: number;
  skippedItems: number;
  failedItems: number;
  warningItems: number;
  metadata: JsonRecord;
  requestedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
};

type BatchItemRow = {
  id: string;
  stockId: string | null;
  symbol: string | null;
  bucketKey: YahooBatchImportModule;
  itemKey: string;
  rowStatus: string;
  sourceKey: string | null;
  targetKey: string | null;
  actionTaken: string | null;
  rawRow: JsonRecord;
  normalizedRow: JsonRecord;
  importedAt: string | null;
  updatedAt: string | null;
};

type BatchStockTarget = {
  stockId: string;
  slug: string | null;
  symbol: string;
  yahooSymbol: string;
  companyName: string | null;
};

export type YahooBatchImportStockInput = {
  stockId?: string | null;
  yahooSymbol?: string | null;
};

export type YahooBatchImportCreateInput = {
  stocks: YahooBatchImportStockInput[];
  modules?: YahooBatchImportModule[];
  importOnlyMissingData?: boolean;
  duplicateMode?: YahooBatchDuplicateMode;
  actorEmail?: string | null;
  actorUserId?: string | null;
};

export type YahooDailyChartUpdateCreateInput = {
  stocks?: YahooBatchImportStockInput[];
  actorEmail?: string | null;
  actorUserId?: string | null;
  force?: boolean;
  dryRun?: boolean;
};

export type YahooDailySameDayOnlyRunInput = {
  stocks?: YahooBatchImportStockInput[];
  actorEmail?: string | null;
  actorUserId?: string | null;
  targetDate?: string | null;
  force?: boolean;
  dryRun?: boolean;
  maxItems?: number;
};

export type YahooDailySameDayOnlyRunResult = {
  mode: "daily_same_day_only";
  targetDate: string;
  requestedCount: number;
  processedCount: number;
  completedCount: number;
  failedCount: number;
  warningCount: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  snapshotInsertedCount: number;
  snapshotSkippedCount: number;
  noDataCount: number;
  usedLatestAvailableTradingDateCount: number;
  stoppedEarly: boolean;
  stopReason: string | null;
  warnings: string[];
  failures: Array<{
    yahooSymbol: string;
    stockId: string | null;
    error: string;
  }>;
  results: YahooDailySameDayOnlyImportResult[];
};

export type YahooDailyCronWindow = "primary" | "retry";

export type YahooDailySameDayCronJobInput = {
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
};

export type YahooDailySameDayCronJobPreparation = {
  mode: "queued_job" | "already_running" | "no_work";
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  jobId: string | null;
  created: boolean;
  reused: boolean;
  requestedCount: number;
  queueWorker: boolean;
  dispatchCursor: number;
  lastProcessedSymbol: string | null;
  nextPendingSymbol: string | null;
  report: YahooBatchImportReport | null;
};

export type YahooDailySameDayCronWorkerInput = {
  jobId: string;
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  maxItemsPerRun?: number;
};

export type YahooDailySameDayCronWorkerOutcome = {
  jobId: string;
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  processedStocks: number;
  report: YahooBatchImportReport;
  warnings: string[];
  shouldQueueFollowUp: boolean;
  dispatchCursor: number;
  lastProcessedSymbol: string | null;
  nextPendingSymbol: string | null;
};

type SameDaySignatureRecord = {
  stockId: string | null;
  yahooSymbol: string;
  symbol: string;
  row: YahooSameDayHistoricalRow;
};

export type YahooBatchWorkerRunInput = {
  jobId: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  maxItemsPerRun?: number;
};

export type YahooBatchImportReport = {
  jobId: string;
  status: YahooBatchVisibleStatus;
  controlState: YahooBatchControlState;
  totalStocks: number;
  completedStocks: number;
  failedStocks: number;
  skippedStocks: number;
  pendingStocks: number;
  totalItems: number;
  processedItems: number;
  terminalItems: number;
  importedItems: number;
  updatedItems: number;
  skippedItems: number;
  failedItems: number;
  warningItems: number;
  pendingItems: number;
  estimatedRemainingSeconds: number;
  historicalDataCompletionPercentage: number;
  moduleCompletion: Record<
    YahooBatchImportModule,
    {
      totalItems: number;
      terminalItems: number;
      successItems: number;
      failedItems: number;
      skippedItems: number;
      warningItems: number;
      completionPercentage: number;
    }
  >;
  modules: YahooBatchImportModule[];
  importOnlyMissingData: boolean;
  duplicateMode: YahooBatchDuplicateMode;
  throttleRequestsPerSecond: number;
  requestsUsedCurrentHour: number;
  requestsUsedToday: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxConcurrentWorkers: number;
  activeWorkers: number;
  currentRequestPace: string;
  savedRequestsAvoided: number;
  existingDataReused: number;
  skipBreakdown: {
    skippedExistingHistory: number;
    skippedExistingSnapshot: number;
    skippedBlockedModule: number;
    skippedDuplicateRawResponse: number;
  };
  disabledModules: Record<string, string>;
  cooldownUntil: string | null;
  cooldownReason: string | null;
  lastYahooError: string | null;
  lastFailedModule: string | null;
  lastFailedSymbol: string | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latestHeartbeatAt: string | null;
  reportGeneratedAt: string;
  stockProgress: Array<{
    stockId: string | null;
    symbol: string | null;
    yahooSymbol: string | null;
    slug: string | null;
    status: "pending" | "completed" | "failed" | "skipped";
    completedModules: YahooBatchImportModule[];
    skippedModules: YahooBatchImportModule[];
    failedModules: YahooBatchImportModule[];
    warningModules: YahooBatchImportModule[];
  }>;
  affectedRoutes: string[];
  finalReport: JsonRecord;
};

export type YahooBatchControlResult = {
  jobId: string;
  action: YahooBatchControlAction;
  status: YahooBatchVisibleStatus;
  controlState: YahooBatchControlState;
  message: string;
  report: YahooBatchImportReport;
};

type BatchWorkerOutcome = {
  processedItems: number;
  report: YahooBatchImportReport;
  warnings: string[];
};

function ensureBatchImporterReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Yahoo batch importer requires durable Supabase admin credentials in this environment.",
    );
  }
}

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
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

function numericOrZero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function detectSuspiciousSameDaySignatureSpike(
  records: SameDaySignatureRecord[],
  threshold = 3,
) {
  const normalizedThreshold = Math.max(2, Math.floor(threshold));
  const signatureMap = new Map<string, SameDaySignatureRecord[]>();

  for (const record of records) {
    const signature = buildYahooSameDayHistoricalSignature(record.row);
    if (!signature) {
      continue;
    }

    const existing = signatureMap.get(signature) ?? [];
    existing.push(record);
    signatureMap.set(signature, existing);
  }

  for (const [signature, matches] of signatureMap.entries()) {
    const distinctSymbols = Array.from(
      new Set(matches.map((match) => cleanString(match.yahooSymbol, 160).toUpperCase()).filter(Boolean)),
    );

    if (distinctSymbols.length >= normalizedThreshold) {
      return {
        shouldStop: true,
        signature,
        threshold: normalizedThreshold,
        matches,
        distinctSymbols,
        message: `Suspicious same-day OHLCV signature spike detected for ${distinctSymbols.length} symbols in one daily_same_day_only batch: ${distinctSymbols.join(", ")}.`,
      };
    }
  }

  return {
    shouldStop: false,
    signature: null,
    threshold: normalizedThreshold,
    matches: [] as SameDaySignatureRecord[],
    distinctSymbols: [] as string[],
    message: null,
  };
}

function readPositiveEnvNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeModules(value: YahooBatchImportModule[] | undefined) {
  const requested = Array.isArray(value) && value.length ? value : [...DEFAULT_YAHOO_BATCH_IMPORT_MODULES];
  const normalized = requested.filter((moduleKey): moduleKey is YahooBatchImportModule =>
    YAHOO_BATCH_IMPORT_MODULES.includes(moduleKey),
  );
  return normalized.length ? Array.from(new Set(normalized)) : [...DEFAULT_YAHOO_BATCH_IMPORT_MODULES];
}

function enforceBatchModulePolicy(modules: YahooBatchImportModule[]) {
  if (modules.includes("financial_statements")) {
    throw new Error(
      "financial_statements is disabled for Yahoo batch imports right now. Use the manual single-stock financial statements test flow instead.",
    );
  }
}

function normalizeDuplicateMode(value: unknown): YahooBatchDuplicateMode {
  return cleanString(value, 160) === "replace_matching_dates"
    ? "replace_matching_dates"
    : "skip_existing_dates";
}

function getDefaultMaxItemsPerRun() {
  return Math.max(1, Math.floor(readPositiveEnvNumber("YAHOO_BATCH_IMPORT_MAX_ITEMS_PER_RUN", 10)));
}

function getDefaultDailySameDayCronBatchSize() {
  return Math.max(
    1,
    Math.min(
      50,
      Math.floor(
        readPositiveEnvNumber(
          "YAHOO_DAILY_SAME_DAY_CRON_MAX_ITEMS_PER_RUN",
          YAHOO_DAILY_SAME_DAY_CRON_BATCH_SIZE,
        ),
      ),
    ),
  );
}

function getConfiguredRequestsPerSecond() {
  return readPositiveEnvNumber("YAHOO_FINANCE_REQUESTS_PER_SECOND", 1);
}

function getYahooDailySameDayCronBatchProfile(cronWindow: YahooDailyCronWindow) {
  return cronWindow === "retry"
    ? YAHOO_DAILY_SAME_DAY_CRON_RETRY_PROFILE
    : YAHOO_DAILY_SAME_DAY_CRON_PRIMARY_PROFILE;
}

function isYahooDailySameDayCronBatchProfile(profile: string) {
  return (
    profile === YAHOO_DAILY_SAME_DAY_CRON_PRIMARY_PROFILE ||
    profile === YAHOO_DAILY_SAME_DAY_CRON_RETRY_PROFILE
  );
}

function isCooldownStyleSameDayFailure(error: unknown) {
  const message = cleanString(error instanceof Error ? error.message : error, 4000).toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("cooldown") ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  );
}

function isWriteSpikeSameDayFailure(error: unknown) {
  const message = cleanString(error instanceof Error ? error.message : error, 4000).toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("write") ||
    message.includes("connection terminated")
  );
}

function isDuplicateKeySameDayFailure(error: unknown) {
  const message = cleanString(error instanceof Error ? error.message : error, 4000).toLowerCase();
  return message.includes("duplicate key");
}

function getConfiguredMaxConcurrentWorkers() {
  return getYahooMaxConcurrentWorkers();
}

function getBatchWorkerStaleAfterMs() {
  return Math.max(30_000, readPositiveEnvNumber("YAHOO_BATCH_WORKER_STALE_AFTER_MS", 120_000));
}

function isTerminalItemStatus(status: string) {
  return ["imported", "updated", "skipped", "warning", "failed"].includes(status);
}

function isSuccessLikeItemStatus(status: string) {
  return ["imported", "updated", "warning"].includes(status);
}

function readCooldownUntil(metadata: JsonRecord) {
  return cleanString(metadata.cooldownUntil, 120) || null;
}

function readCooldownReason(metadata: JsonRecord) {
  return cleanString(metadata.cooldownReason, 4000) || null;
}

function isCoolingDown(metadata: JsonRecord) {
  const cooldownUntil = readCooldownUntil(metadata);
  if (!cooldownUntil) {
    return false;
  }
  const parsed = Date.parse(cooldownUntil);
  return Number.isFinite(parsed) && parsed > Date.now();
}

function computeDisplayedBatchStatus(job: BatchJobRow) {
  if (isCoolingDown(job.metadata)) {
    return "cooling_down" as const;
  }
  const controlState = readControlState(job.metadata);
  if (controlState === "paused" || controlState === "pause_requested") {
    return "paused" as const;
  }
  const normalized = cleanString(job.status, 120);
  if (normalized === "failed") {
    return "failed" as const;
  }
  if (normalized === "completed" || normalized === "completed_with_errors") {
    return "completed" as const;
  }
  if (normalized === "cancelled") {
    return "stopped" as const;
  }
  return "running" as const;
}

function readControlState(metadata: JsonRecord): YahooBatchControlState {
  const normalized = cleanString(metadata.controlState, 120);
  if (
    normalized === "pause_requested" ||
    normalized === "paused" ||
    normalized === "stop_requested"
  ) {
    return normalized;
  }
  return "active";
}

function roundToOneDecimal(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return roundToOneDecimal((numerator / denominator) * 100);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadBatchStockTargetById(stockId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stocks_master")
    .select("id, slug, symbol, company_name, yahoo_symbol")
    .eq("id", stockId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read stocks_master by id. ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const stock = data as JsonRecord;
  const yahooSymbol = cleanString(stock.yahoo_symbol, 160).toUpperCase();
  if (!yahooSymbol) {
    throw new Error(`Stock "${cleanString(stock.symbol, 160) || stockId}" is missing yahoo_symbol.`);
  }

  return {
    stockId: cleanString(stock.id, 160) || stockId,
    slug: cleanString(stock.slug, 160) || null,
    symbol: cleanString(stock.symbol, 160),
    yahooSymbol,
    companyName: cleanString(stock.company_name, 240) || null,
  } satisfies BatchStockTarget;
}

async function resolveBatchStockTarget(input: YahooBatchImportStockInput) {
  const requestedStockId = cleanString(input.stockId, 160);
  const requestedYahooSymbol = cleanString(input.yahooSymbol, 160).toUpperCase();

  if (requestedStockId) {
    const stock = await loadBatchStockTargetById(requestedStockId);
    if (!stock) {
      throw new Error(`No stocks_master row was found for stock_id "${requestedStockId}".`);
    }
    if (requestedYahooSymbol && requestedYahooSymbol !== stock.yahooSymbol) {
      throw new Error(
        `The requested stock_id "${requestedStockId}" is mapped to Yahoo symbol "${stock.yahooSymbol}", not "${requestedYahooSymbol}".`,
      );
    }
    return stock;
  }

  if (!requestedYahooSymbol) {
    throw new Error("Each Yahoo batch stock needs a stock_id or yahoo_symbol.");
  }

  const resolved = await resolveYahooStockTarget(requestedYahooSymbol);
  if (!resolved.stockId) {
    throw new Error(
      `Yahoo symbol "${requestedYahooSymbol}" could not be mapped to a durable stocks_master row.`,
    );
  }

  return {
    stockId: resolved.stockId,
    slug: resolved.slug,
    symbol: resolved.symbol,
    yahooSymbol: resolved.yahooSymbol,
    companyName: resolved.companyName,
  } satisfies BatchStockTarget;
}

async function resolveBatchStockTargets(stocks: YahooBatchImportStockInput[]) {
  const dedupe = new Map<string, YahooBatchImportStockInput>();
  for (const stock of stocks) {
    const stockId = cleanString(stock.stockId, 160);
    const yahooSymbol = cleanString(stock.yahooSymbol, 160).toUpperCase();
    if (!stockId && !yahooSymbol) {
      continue;
    }
    dedupe.set(stockId || yahooSymbol, stock);
  }

  const resolved: BatchStockTarget[] = [];
  for (const stock of dedupe.values()) {
    resolved.push(await resolveBatchStockTarget(stock));
  }
  return resolved;
}

function buildBatchItemKey(stock: BatchStockTarget, moduleKey: YahooBatchImportModule) {
  return `${stock.stockId}:${moduleKey}`;
}

async function insertParentBatchJob(input: {
  stocks: BatchStockTarget[];
  modules: YahooBatchImportModule[];
  importOnlyMissingData: boolean;
  duplicateMode: YahooBatchDuplicateMode;
  actorEmail: string;
  actorUserId: string | null;
  metadataOverrides?: JsonRecord;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const jobId = randomUUID();
  const metadata = {
    batchType: "yahoo_stock_batch_import",
    createdAt: now,
    totalStocks: input.stocks.length,
    modules: input.modules,
    stockIds: input.stocks.map((stock) => stock.stockId),
    yahooSymbols: input.stocks.map((stock) => stock.yahooSymbol),
    importOnlyMissingData: input.importOnlyMissingData,
    duplicateMode: input.duplicateMode,
    controlState: "active",
    throttleRequestsPerSecond: getConfiguredRequestsPerSecond(),
    maxRequestsPerHour: getYahooOperationalConfig().maxRequestsPerHour,
    maxRequestsPerDay: getYahooOperationalConfig().maxRequestsPerDay,
    maxConcurrentWorkers: getConfiguredMaxConcurrentWorkers(),
    failureCooldownMinutes: getYahooFailureCooldownMinutes(),
    savedRequestsAvoided: 0,
    existingDataReused: 0,
    skippedExistingHistoryCount: 0,
    skippedExistingSnapshotCount: 0,
    skippedBlockedModuleCount: 0,
    skippedDuplicateRawResponseCount: 0,
    moduleDisabledStatus: {
      financial_statements: "manual_single_stock_only",
    },
    processedItemDurationsMs: [] as number[],
    processedDurationTotalMs: 0,
    processedDurationCount: 0,
    createdByUserId: input.actorUserId,
    createdByEmail: input.actorEmail,
    latestHeartbeatAt: now,
    ...normalizeMetadata(input.metadataOverrides),
  };

  const { error } = await supabase.from("stock_import_jobs").insert({
    id: jobId,
    stock_id: null,
    symbol: null,
    source_type: "yahoo_finance",
    source_name: "yahoo_finance_batch_importer",
    source_url: "https://finance.yahoo.com",
    source_symbol: null,
    job_kind: "yahoo_batch_import",
    import_scope: input.modules.join(","),
    requested_by: input.actorEmail,
    status: "queued",
    started_at: null,
    completed_at: null,
    total_items: input.stocks.length * input.modules.length,
    imported_items: 0,
    updated_items: 0,
    skipped_items: 0,
    failed_items: 0,
    warning_items: 0,
    metadata,
    raw_payload: {
      requestedStocks: input.stocks,
      requestedModules: input.modules,
    },
    imported_at: now,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Could not create Yahoo batch stock_import_jobs row. ${error.message}`);
  }

  const queueRows = input.stocks.flatMap((stock) =>
    input.modules.map((moduleKey) => ({
      id: randomUUID(),
      job_id: jobId,
      stock_id: stock.stockId,
      symbol: stock.symbol,
      bucket_key: moduleKey,
      item_key: buildBatchItemKey(stock, moduleKey),
      trade_date: null,
      fiscal_date: null,
      row_status: "pending",
      source_key: stock.yahooSymbol,
      target_key: stock.slug,
      action_taken: "queued",
      raw_row: {
        requestedAt: now,
        yahooSymbol: stock.yahooSymbol,
        stockId: stock.stockId,
      },
      normalized_row: {
        moduleKey,
      },
      raw_payload: {},
      imported_at: now,
      created_at: now,
      updated_at: now,
    })),
  );

  const { error: queueError } = await supabase
    .from("stock_import_job_items")
    .insert(queueRows);

  if (queueError) {
    await supabase
      .from("stock_import_jobs")
      .update({
        status: "failed",
        failed_items: queueRows.length,
        completed_at: now,
        updated_at: now,
        metadata: {
          ...metadata,
          seedError: queueError.message,
          seedFailedAt: now,
        },
      })
      .eq("id", jobId);
    throw new Error(`Could not seed Yahoo batch job items. ${queueError.message}`);
  }

  return jobId;
}

function normalizeBatchJobRow(value: JsonRecord): BatchJobRow {
  return {
    id: cleanString(value.id, 160),
    status: cleanString(value.status, 120) || "queued",
    totalItems: numericOrZero(value.total_items),
    importedItems: numericOrZero(value.imported_items),
    updatedItems: numericOrZero(value.updated_items),
    skippedItems: numericOrZero(value.skipped_items),
    failedItems: numericOrZero(value.failed_items),
    warningItems: numericOrZero(value.warning_items),
    metadata: normalizeMetadata(value.metadata),
    requestedBy: cleanString(value.requested_by, 240) || null,
    startedAt: cleanString(value.started_at, 120) || null,
    completedAt: cleanString(value.completed_at, 120) || null,
    updatedAt: cleanString(value.updated_at, 120) || null,
  };
}

function normalizeBatchItemRow(value: JsonRecord): BatchItemRow {
  return {
    id: cleanString(value.id, 160),
    stockId: cleanString(value.stock_id, 160) || null,
    symbol: cleanString(value.symbol, 160) || null,
    bucketKey: cleanString(value.bucket_key, 120) as YahooBatchImportModule,
    itemKey: cleanString(value.item_key, 240),
    rowStatus: cleanString(value.row_status, 120) || "pending",
    sourceKey: cleanString(value.source_key, 160) || null,
    targetKey: cleanString(value.target_key, 160) || null,
    actionTaken: cleanString(value.action_taken, 240) || null,
    rawRow: normalizeMetadata(value.raw_row),
    normalizedRow: normalizeMetadata(value.normalized_row),
    importedAt: cleanString(value.imported_at, 120) || null,
    updatedAt: cleanString(value.updated_at, 120) || null,
  };
}

async function loadBatchJob(jobId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_import_jobs")
    .select("*")
    .eq("id", jobId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read Yahoo batch job. ${error.message}`);
  }
  if (!data) {
    throw new Error(`Yahoo batch job "${jobId}" was not found.`);
  }

  return normalizeBatchJobRow(data as JsonRecord);
}

async function loadBatchItems(jobId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_import_job_items")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not read Yahoo batch job items. ${error.message}`);
  }

  return Array.isArray(data) ? data.map((row) => normalizeBatchItemRow(row as JsonRecord)) : [];
}

async function loadCoverageRows(stockIds: string[]) {
  const ids = Array.from(new Set(stockIds.map((stockId) => cleanString(stockId, 160)).filter(Boolean)));
  if (!ids.length) {
    return [] as JsonRecord[];
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_import_coverage")
    .select("stock_id, bucket_key, coverage_status, metadata")
    .in("stock_id", ids);

  if (error) {
    throw new Error(`Could not read stock_import_coverage for Yahoo batch report. ${error.message}`);
  }

  return Array.isArray(data) ? (data as JsonRecord[]) : [];
}

async function updateBatchJobRow(
  job: BatchJobRow,
  input: {
    status?: "queued" | "running" | "completed" | "completed_with_errors" | "failed" | "cancelled";
    startedAt?: string | null;
    completedAt?: string | null;
    importedItems?: number;
    updatedItems?: number;
    skippedItems?: number;
    failedItems?: number;
    warningItems?: number;
    metadata?: JsonRecord;
  },
) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const nextMetadata = {
    ...job.metadata,
    ...(input.metadata ?? {}),
  };

  const { error } = await supabase
    .from("stock_import_jobs")
    .update({
      status: input.status ?? job.status,
      started_at: input.startedAt ?? job.startedAt,
      completed_at:
        input.completedAt === undefined ? job.completedAt : input.completedAt,
      imported_items: input.importedItems ?? job.importedItems,
      updated_items: input.updatedItems ?? job.updatedItems,
      skipped_items: input.skippedItems ?? job.skippedItems,
      failed_items: input.failedItems ?? job.failedItems,
      warning_items: input.warningItems ?? job.warningItems,
      metadata: nextMetadata,
      updated_at: now,
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(`Could not update Yahoo batch job row. ${error.message}`);
  }

  return {
    ...job,
    status: input.status ?? job.status,
    startedAt: input.startedAt ?? job.startedAt,
    completedAt:
      input.completedAt === undefined ? job.completedAt : input.completedAt,
    importedItems: input.importedItems ?? job.importedItems,
    updatedItems: input.updatedItems ?? job.updatedItems,
    skippedItems: input.skippedItems ?? job.skippedItems,
    failedItems: input.failedItems ?? job.failedItems,
    warningItems: input.warningItems ?? job.warningItems,
    updatedAt: now,
    metadata: nextMetadata,
  } satisfies BatchJobRow;
}

async function updateBatchItemRow(
  item: BatchItemRow,
  input: {
    rowStatus: "pending" | "validated" | "imported" | "updated" | "skipped" | "warning" | "failed";
    actionTaken: string;
    rawRow?: JsonRecord;
    normalizedRow?: JsonRecord;
  },
) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stock_import_job_items")
    .update({
      row_status: input.rowStatus,
      action_taken: input.actionTaken,
      raw_row: input.rawRow ?? item.rawRow,
      normalized_row: input.normalizedRow ?? item.normalizedRow,
      imported_at: now,
      updated_at: now,
    })
    .eq("id", item.id);

  if (error) {
    throw new Error(`Could not update Yahoo batch job item row. ${error.message}`);
  }

  return {
    ...item,
    rowStatus: input.rowStatus,
    actionTaken: input.actionTaken,
    rawRow: input.rawRow ?? item.rawRow,
    normalizedRow: input.normalizedRow ?? item.normalizedRow,
    importedAt: now,
    updatedAt: now,
  } satisfies BatchItemRow;
}

async function incrementBatchJobMetadataCounters(jobId: string, counters: Partial<Record<
  | "savedRequestsAvoided"
  | "existingDataReused"
  | "skippedExistingHistoryCount"
  | "skippedExistingSnapshotCount"
  | "skippedBlockedModuleCount"
  | "skippedDuplicateRawResponseCount",
  number
>>) {
  const job = await loadBatchJob(jobId);
  const nextMetadata: JsonRecord = {};
  for (const [key, value] of Object.entries(counters)) {
    const incrementBy = numericOrZero(value);
    if (incrementBy <= 0) {
      continue;
    }
    nextMetadata[key] = numericOrZero(job.metadata[key]) + incrementBy;
  }
  if (!Object.keys(nextMetadata).length) {
    return job;
  }
  return await updateBatchJobRow(job, {
    metadata: nextMetadata,
  });
}

async function resetBatchItemsToPending(jobId: string, statuses: string[]) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stock_import_job_items")
    .update({
      row_status: "pending",
      action_taken: "requeued",
      updated_at: now,
    })
    .eq("job_id", jobId)
    .in("row_status", statuses);

  if (error) {
    throw new Error(`Could not requeue Yahoo batch job items. ${error.message}`);
  }
}

function normalizeModuleListFromMetadata(metadata: JsonRecord) {
  const rawModules = Array.isArray(metadata.modules)
    ? metadata.modules.map((item) => cleanString(item, 160) as YahooBatchImportModule)
    : [];
  return normalizeModules(rawModules);
}

function readImportOnlyMissingData(metadata: JsonRecord) {
  return metadata.importOnlyMissingData !== false;
}

function readDuplicateMode(metadata: JsonRecord): YahooBatchDuplicateMode {
  return normalizeDuplicateMode(metadata.duplicateMode);
}

function readBatchProfile(metadata: JsonRecord) {
  return cleanString(metadata.batchProfile, 160) || "standard";
}

function readDailySameDayCronWindow(metadata: JsonRecord): YahooDailyCronWindow {
  return cleanString(metadata.cronWindow, 40) === "retry" ? "retry" : "primary";
}

function readDailySameDayTargetDate(metadata: JsonRecord) {
  return cleanString(metadata.targetDate, 40) || null;
}

function readDailySameDayDispatchCursor(metadata: JsonRecord) {
  const value = Math.floor(numericOrZero(metadata.nextCursor));
  return value >= 0 ? value : 0;
}

function readDailySameDayLastProcessedSymbol(metadata: JsonRecord) {
  return cleanString(metadata.lastProcessedSymbol, 160) || null;
}

function readDailySameDayNextPendingSymbol(metadata: JsonRecord) {
  return cleanString(metadata.nextPendingSymbol, 160) || null;
}

function readHistoricalPeriod(metadata: JsonRecord) {
  return cleanString(metadata.historicalPeriod, 80) || "max";
}

function readSnapshotOnly(metadata: JsonRecord) {
  return metadata.snapshotOnly === true;
}

function readForceMode(metadata: JsonRecord) {
  return metadata.force === true;
}

function readRefreshSnapshots(metadata: JsonRecord) {
  return metadata.refreshSnapshots === true;
}

function readMinimumRequestIntervalMs(metadata: JsonRecord) {
  const configured = numericOrZero(metadata.minimumRequestIntervalMs);
  return configured > 0 ? configured : 0;
}

function readDryRunMode(metadata: JsonRecord) {
  return metadata.dryRun === true;
}

function buildCoverageExpectation(moduleKey: YahooBatchImportModule) {
  if (moduleKey === "historical_prices") {
    return ["historical_prices"];
  }
  if (moduleKey === "quote_statistics") {
    return [
      "latest_market_snapshot",
      "valuation_metrics",
      "share_statistics",
      "financial_highlights",
    ];
  }
  return [
    "income_statement_annual",
    "income_statement_quarterly",
    "balance_sheet_annual",
    "balance_sheet_quarterly",
    "cash_flow_annual",
    "cash_flow_quarterly",
  ];
}

async function shouldSkipModuleForCoverage(stockId: string, moduleKey: YahooBatchImportModule) {
  const coverageRows = await loadCoverageRows([stockId]);
  const rowsByBucket = new Map(
    coverageRows.map((row) => [cleanString(row.bucket_key, 160), cleanString(row.coverage_status, 120)]),
  );
  const buckets = buildCoverageExpectation(moduleKey);
  return buckets.every((bucketKey) => rowsByBucket.get(bucketKey) === "current");
}

function inferStockRoute(item: BatchItemRow) {
  const slug = cleanString(item.targetKey, 160);
  return slug ? `/stocks/${slug}` : null;
}

function buildBatchItemStockTarget(item: BatchItemRow) {
  return {
    stockId: item.stockId,
    instrumentId: null,
    slug: cleanString(item.targetKey, 160) || null,
    symbol: cleanString(item.symbol, 160) || cleanString(item.sourceKey, 160),
    yahooSymbol: cleanString(item.sourceKey, 160).toUpperCase(),
    companyName: null,
    exchange: null,
  };
}

function readLatestHeartbeatAt(metadata: JsonRecord) {
  const latestHeartbeatAt = cleanString(metadata.latestHeartbeatAt, 120);
  return latestHeartbeatAt ? Date.parse(latestHeartbeatAt) : Number.NaN;
}

function hasFreshActiveWorker(metadata: JsonRecord) {
  const activeWorkerId = cleanString(metadata.activeWorkerId, 160);
  if (!activeWorkerId) {
    return false;
  }
  const latestHeartbeatAt = readLatestHeartbeatAt(metadata);
  if (!Number.isFinite(latestHeartbeatAt)) {
    return true;
  }
  return Date.now() - latestHeartbeatAt < getBatchWorkerStaleAfterMs();
}

async function countActiveYahooBatchWorkers(excludingJobId?: string | null) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_import_jobs")
    .select("id, status, metadata")
    .eq("source_type", "yahoo_finance")
    .eq("job_kind", "yahoo_batch_import")
    .eq("status", "running");

  if (error) {
    throw new Error(`Could not read active Yahoo batch workers. ${error.message}`);
  }

  return Array.isArray(data)
    ? data.filter((row) => {
        const jobId = cleanString((row as JsonRecord).id, 160);
        if (excludingJobId && jobId === excludingJobId) {
          return false;
        }
        return hasFreshActiveWorker(normalizeMetadata((row as JsonRecord).metadata));
      }).length
    : 0;
}

function buildCooldownUntilIso() {
  return new Date(Date.now() + getYahooFailureCooldownMinutes() * 60_000).toISOString();
}

async function recordYahooFailureAgainstBatch(input: {
  jobId: string;
  item: BatchItemRow;
  message: string;
}) {
  const job = await loadBatchJob(input.jobId);
  const currentFailureCount = numericOrZero(job.metadata.yahooFailureCount);
  const currentConsecutiveFailures = numericOrZero(job.metadata.consecutiveYahooFailures);
  const nextFailureCount = currentFailureCount + 1;
  const nextConsecutiveFailures = currentConsecutiveFailures + 1;
  const now = new Date().toISOString();

  const metadataUpdate: JsonRecord = {
    yahooFailureCount: nextFailureCount,
    consecutiveYahooFailures: nextConsecutiveFailures,
    lastYahooError: input.message,
    lastYahooErrorAt: now,
    lastFailedModule: input.item.bucketKey,
    lastFailedSymbol:
      cleanString(input.item.sourceKey, 160) ||
      cleanString(input.item.symbol, 160) ||
      null,
    latestHeartbeatAt: now,
  };

  let didPauseForCooldown = false;
  if (nextConsecutiveFailures >= YAHOO_BATCH_AUTO_PAUSE_AFTER_FAILURES) {
    didPauseForCooldown = true;
    metadataUpdate.controlState = "paused";
    metadataUpdate.cooldownUntil = buildCooldownUntilIso();
    metadataUpdate.cooldownReason = `Repeated Yahoo/provider failures while importing ${cleanString(
      input.item.sourceKey || input.item.symbol || input.item.itemKey,
      160,
    )} · ${input.item.bucketKey}.`;
    metadataUpdate.autoPausedAt = now;
    metadataUpdate.cooldownFailureCount = nextConsecutiveFailures;
    metadataUpdate.activeWorkerId = null;
  }

  await updateBatchJobRow(job, {
    status: didPauseForCooldown ? "queued" : undefined,
    completedAt: null,
    metadata: metadataUpdate,
  });

  return {
    didPauseForCooldown,
    cooldownUntil: didPauseForCooldown ? cleanString(metadataUpdate.cooldownUntil, 120) : null,
    cooldownReason: didPauseForCooldown ? cleanString(metadataUpdate.cooldownReason, 4000) : null,
  };
}

async function pauseYahooBatchJobForImmediateCooldown(input: {
  jobId: string;
  item: BatchItemRow;
  message: string;
}) {
  const job = await loadBatchJob(input.jobId);
  const now = new Date().toISOString();
  const cooldownUntil = buildCooldownUntilIso();
  const cooldownReason = `Yahoo cooldown detected while importing ${cleanString(
    input.item.sourceKey || input.item.symbol || input.item.itemKey,
    160,
  )}.`;

  await updateBatchJobRow(job, {
    status: "queued",
    completedAt: null,
    metadata: {
      controlState: "paused",
      latestHeartbeatAt: now,
      activeWorkerId: null,
      cooldownUntil,
      cooldownReason,
      autoPausedAt: now,
      yahooFailureCount: numericOrZero(job.metadata.yahooFailureCount) + 1,
      consecutiveYahooFailures: numericOrZero(job.metadata.consecutiveYahooFailures) + 1,
      cooldownFailureCount: numericOrZero(job.metadata.cooldownFailureCount) + 1,
      lastYahooError: input.message,
      lastYahooErrorAt: now,
      lastFailedModule: input.item.bucketKey,
      lastFailedSymbol:
        cleanString(input.item.sourceKey, 160) ||
        cleanString(input.item.symbol, 160) ||
        null,
    },
  });

  return {
    cooldownUntil,
    cooldownReason,
  };
}

function buildEmptyModuleSummary() {
  return {
    totalItems: 0,
    terminalItems: 0,
    successItems: 0,
    failedItems: 0,
    skippedItems: 0,
    warningItems: 0,
    completionPercentage: 0,
  };
}

async function buildBatchReportFromState(input: {
  job: BatchJobRow;
  items: BatchItemRow[];
  coverageRows: JsonRecord[];
}) {
  const yahooOperationalSnapshot = await getYahooOperationalGuardrailSnapshot();
  const activeWorkers = await countActiveYahooBatchWorkers();
  const modules = normalizeModuleListFromMetadata(input.job.metadata);
  const moduleCompletion = Object.fromEntries(
    YAHOO_BATCH_IMPORT_MODULES.map((moduleKey) => [moduleKey, buildEmptyModuleSummary()]),
  ) as YahooBatchImportReport["moduleCompletion"];

  const stockMap = new Map<
    string,
    {
      stockId: string | null;
      symbol: string | null;
      yahooSymbol: string | null;
      slug: string | null;
      statuses: string[];
      completedModules: YahooBatchImportModule[];
      skippedModules: YahooBatchImportModule[];
      failedModules: YahooBatchImportModule[];
      warningModules: YahooBatchImportModule[];
    }
  >();

  for (const item of input.items) {
    if (!YAHOO_BATCH_IMPORT_MODULES.includes(item.bucketKey)) {
      continue;
    }

    const moduleSummary = moduleCompletion[item.bucketKey];
    moduleSummary.totalItems += 1;
    if (isTerminalItemStatus(item.rowStatus)) {
      moduleSummary.terminalItems += 1;
    }
    if (isSuccessLikeItemStatus(item.rowStatus)) {
      moduleSummary.successItems += 1;
    }
    if (item.rowStatus === "failed") {
      moduleSummary.failedItems += 1;
    }
    if (item.rowStatus === "skipped") {
      moduleSummary.skippedItems += 1;
    }
    if (item.rowStatus === "warning") {
      moduleSummary.warningItems += 1;
    }

    const stockKey = item.stockId || item.itemKey;
    const stockSummary = stockMap.get(stockKey) ?? {
      stockId: item.stockId,
      symbol: item.symbol,
      yahooSymbol: item.sourceKey,
      slug: item.targetKey,
      statuses: [],
      completedModules: [],
      skippedModules: [],
      failedModules: [],
      warningModules: [],
    };
    stockSummary.statuses.push(item.rowStatus);
    if (["imported", "updated"].includes(item.rowStatus)) {
      stockSummary.completedModules.push(item.bucketKey);
    }
    if (item.rowStatus === "skipped") {
      stockSummary.skippedModules.push(item.bucketKey);
    }
    if (item.rowStatus === "failed") {
      stockSummary.failedModules.push(item.bucketKey);
    }
    if (item.rowStatus === "warning") {
      stockSummary.warningModules.push(item.bucketKey);
    }
    stockMap.set(stockKey, stockSummary);
  }

  for (const moduleKey of YAHOO_BATCH_IMPORT_MODULES) {
    moduleCompletion[moduleKey].completionPercentage = percentage(
      moduleCompletion[moduleKey].terminalItems,
      moduleCompletion[moduleKey].totalItems,
    );
  }

  const terminalItems = input.items.filter((item) => isTerminalItemStatus(item.rowStatus)).length;
  const processedItems = input.items.filter((item) => item.rowStatus !== "pending" && item.rowStatus !== "validated").length;
  const pendingItems = input.items.length - terminalItems;
  const importedItems = input.items.filter((item) => item.rowStatus === "imported").length;
  const updatedItems = input.items.filter((item) => item.rowStatus === "updated").length;
  const skippedItems = input.items.filter((item) => item.rowStatus === "skipped").length;
  const failedItems = input.items.filter((item) => item.rowStatus === "failed").length;
  const warningItems = input.items.filter((item) => item.rowStatus === "warning").length;

  const completedStocks = Array.from(stockMap.values()).filter(
    (stock) =>
      stock.statuses.length > 0 &&
      stock.failedModules.length === 0 &&
      stock.statuses.every((status) => isTerminalItemStatus(status)) &&
      stock.skippedModules.length < stock.statuses.length,
  ).length;
  const skippedStocks = Array.from(stockMap.values()).filter(
    (stock) => stock.statuses.length > 0 && stock.skippedModules.length === stock.statuses.length,
  ).length;
  const failedStocks = Array.from(stockMap.values()).filter((stock) => stock.failedModules.length > 0).length;
  const pendingStocks = Array.from(stockMap.values()).filter(
    (stock) => stock.statuses.some((status) => !isTerminalItemStatus(status)),
  ).length;

  const timingMetadata = normalizeMetadata(input.job.metadata);
  const processedDurationCount = numericOrZero(timingMetadata.processedDurationCount);
  const processedDurationTotalMs = numericOrZero(timingMetadata.processedDurationTotalMs);
  const averageDurationMs =
    processedDurationCount > 0 ? processedDurationTotalMs / processedDurationCount : 0;
  const estimatedRemainingSeconds =
    averageDurationMs > 0
      ? Math.max(0, Math.round((pendingItems * averageDurationMs) / 1000))
      : 0;

  const controlState = readControlState(input.job.metadata);
  const displayStatus = computeDisplayedBatchStatus(input.job);
  const coverageByStockBucket = new Map<string, JsonRecord>();
  for (const row of input.coverageRows) {
    const stockId = cleanString(row.stock_id, 160);
    const bucketKey = cleanString(row.bucket_key, 160);
    if (!stockId || !bucketKey) {
      continue;
    }
    coverageByStockBucket.set(`${stockId}:${bucketKey}`, row);
  }
  const historicalCoverageValues = Array.from(stockMap.values())
    .map((stock) => {
      if (!stock.stockId) {
        return 0;
      }
      const coverageRow = coverageByStockBucket.get(`${stock.stockId}:historical_prices`);
      const metadata = normalizeMetadata(coverageRow?.metadata);
      return numericOrZero(metadata.completionPercentage);
    })
    .filter((value) => value > 0);
  const historicalCoverageAveragePercentage = historicalCoverageValues.length
    ? roundToOneDecimal(
        historicalCoverageValues.reduce((sum, value) => sum + value, 0) /
          historicalCoverageValues.length,
      )
    : moduleCompletion.historical_prices.completionPercentage;

  const stockProgress = Array.from(stockMap.values()).map((stock) => {
    let status: "pending" | "completed" | "failed" | "skipped" = "pending";
    if (stock.failedModules.length > 0) {
      status = "failed";
    } else if (stock.skippedModules.length === stock.statuses.length && stock.statuses.length > 0) {
      status = "skipped";
    } else if (stock.statuses.length > 0 && stock.statuses.every((itemStatus) => isTerminalItemStatus(itemStatus))) {
      status = "completed";
    }

    return {
      stockId: stock.stockId,
      symbol: stock.symbol,
      yahooSymbol: stock.yahooSymbol,
      slug: stock.slug,
      status,
      completedModules: Array.from(new Set(stock.completedModules)),
      skippedModules: Array.from(new Set(stock.skippedModules)),
      failedModules: Array.from(new Set(stock.failedModules)),
      warningModules: Array.from(new Set(stock.warningModules)),
    };
  });

  const affectedRoutes = Array.from(
    new Set(
      input.items
        .filter((item) => ["imported", "updated", "warning"].includes(item.rowStatus))
        .map((item) => inferStockRoute(item))
        .filter(Boolean) as string[],
    ),
  );

  const finalReport = {
    totalStocks: stockMap.size,
    completedStocks,
    failedStocks,
    skippedStocks,
    pendingStocks,
    totalItems: input.items.length,
    processedItems,
    terminalItems,
    importedItems,
    updatedItems,
    skippedItems,
    failedItems,
    warningItems,
    pendingItems,
    estimatedRemainingSeconds,
    historicalDataCompletionPercentage: historicalCoverageAveragePercentage,
    moduleCompletion,
    modules,
    controlState,
    status: displayStatus,
    savedRequestsAvoided: numericOrZero(input.job.metadata.savedRequestsAvoided),
    existingDataReused: numericOrZero(input.job.metadata.existingDataReused),
    skipBreakdown: {
      skippedExistingHistory: numericOrZero(input.job.metadata.skippedExistingHistoryCount),
      skippedExistingSnapshot: numericOrZero(input.job.metadata.skippedExistingSnapshotCount),
      skippedBlockedModule: numericOrZero(input.job.metadata.skippedBlockedModuleCount),
      skippedDuplicateRawResponse: numericOrZero(
        input.job.metadata.skippedDuplicateRawResponseCount,
      ),
    },
    disabledModules:
      Object.keys(normalizeStringRecord(input.job.metadata.moduleDisabledStatus)).length > 0
        ? normalizeStringRecord(input.job.metadata.moduleDisabledStatus)
        : {
            financial_statements: "manual_single_stock_only",
          },
  } satisfies JsonRecord;

  return {
    jobId: input.job.id,
    status: displayStatus,
    controlState,
    totalStocks: stockMap.size,
    completedStocks,
    failedStocks,
    skippedStocks,
    pendingStocks,
    totalItems: input.items.length,
    processedItems,
    terminalItems,
    importedItems,
    updatedItems,
    skippedItems,
    failedItems,
    warningItems,
    pendingItems,
    estimatedRemainingSeconds,
    historicalDataCompletionPercentage: historicalCoverageAveragePercentage,
    moduleCompletion,
    modules,
    importOnlyMissingData: readImportOnlyMissingData(input.job.metadata),
    duplicateMode: readDuplicateMode(input.job.metadata),
    throttleRequestsPerSecond: numericOrZero(input.job.metadata.throttleRequestsPerSecond) || getConfiguredRequestsPerSecond(),
    requestsUsedCurrentHour: yahooOperationalSnapshot.requestsUsedCurrentHour,
    requestsUsedToday: yahooOperationalSnapshot.requestsUsedToday,
    maxRequestsPerHour: yahooOperationalSnapshot.maxRequestsPerHour,
    maxRequestsPerDay: yahooOperationalSnapshot.maxRequestsPerDay,
    maxConcurrentWorkers: yahooOperationalSnapshot.maxConcurrentWorkers,
    activeWorkers,
    currentRequestPace: `${yahooOperationalSnapshot.currentRequestPaceLabel} · ${activeWorkers}/${yahooOperationalSnapshot.maxConcurrentWorkers} workers active`,
    savedRequestsAvoided: numericOrZero(input.job.metadata.savedRequestsAvoided),
    existingDataReused: numericOrZero(input.job.metadata.existingDataReused),
    skipBreakdown: {
      skippedExistingHistory: numericOrZero(input.job.metadata.skippedExistingHistoryCount),
      skippedExistingSnapshot: numericOrZero(input.job.metadata.skippedExistingSnapshotCount),
      skippedBlockedModule: numericOrZero(input.job.metadata.skippedBlockedModuleCount),
      skippedDuplicateRawResponse: numericOrZero(
        input.job.metadata.skippedDuplicateRawResponseCount,
      ),
    },
    disabledModules:
      Object.keys(normalizeStringRecord(input.job.metadata.moduleDisabledStatus)).length > 0
        ? normalizeStringRecord(input.job.metadata.moduleDisabledStatus)
        : {
            financial_statements: "manual_single_stock_only",
          },
    cooldownUntil: readCooldownUntil(input.job.metadata),
    cooldownReason: readCooldownReason(input.job.metadata),
    lastYahooError: cleanString(input.job.metadata.lastYahooError, 4000) || null,
    lastFailedModule: cleanString(input.job.metadata.lastFailedModule, 160) || null,
    lastFailedSymbol: cleanString(input.job.metadata.lastFailedSymbol, 160) || null,
    createdAt: cleanString(input.job.metadata.createdAt, 120) || input.job.updatedAt,
    startedAt: input.job.startedAt,
    completedAt: input.job.completedAt,
    latestHeartbeatAt: cleanString(input.job.metadata.latestHeartbeatAt, 120) || null,
    reportGeneratedAt: new Date().toISOString(),
    stockProgress,
    affectedRoutes,
    finalReport,
  } satisfies YahooBatchImportReport;
}

async function updateBatchProgressSnapshot(jobId: string) {
  const [job, items] = await Promise.all([loadBatchJob(jobId), loadBatchItems(jobId)]);
  const stockIds = items.map((item) => item.stockId).filter(Boolean) as string[];
  const coverageRows = await loadCoverageRows(stockIds);
  const report = await buildBatchReportFromState({
    job,
    items,
    coverageRows,
  });

  await updateBatchJobRow(job, {
    importedItems: report.importedItems,
    updatedItems: report.updatedItems,
    skippedItems: report.skippedItems,
    failedItems: report.failedItems,
    warningItems: report.warningItems,
    metadata: {
      latestHeartbeatAt: new Date().toISOString(),
      progress: report.finalReport,
    },
  });

  return report;
}

function summarizeChildImport(
  moduleKey: YahooBatchImportModule,
  result:
    | YahooHistoricalOhlcvImportResult
    | YahooQuoteStatisticsImportResult
    | YahooFinancialStatementsImportResult,
) {
  if (moduleKey === "historical_prices") {
    const historical = result as YahooHistoricalOhlcvImportResult;
    const hasWarnings = historical.jobStatus === "completed_with_errors" || historical.warnings.length > 0;
    if (historical.insertedRows > 0) {
      return {
        rowStatus: hasWarnings ? "warning" : "imported",
        actionTaken: hasWarnings ? "imported_history_with_warnings" : "inserted_history_rows",
        normalizedRow: {
          childJobId: historical.jobId,
          latestTradeDate: historical.coverage.lastAvailableDate,
          insertedRows: historical.insertedRows,
          updatedRows: historical.updatedRows,
          skippedRows: historical.skippedRows,
          completionPercentage: historical.coverage.completionPercentage,
          warnings: historical.warnings,
        },
      } as const;
    }
    if (historical.updatedRows > 0) {
      return {
        rowStatus: hasWarnings ? "warning" : "updated",
        actionTaken: hasWarnings ? "updated_history_with_warnings" : "updated_history_rows",
        normalizedRow: {
          childJobId: historical.jobId,
          latestTradeDate: historical.coverage.lastAvailableDate,
          insertedRows: historical.insertedRows,
          updatedRows: historical.updatedRows,
          skippedRows: historical.skippedRows,
          completionPercentage: historical.coverage.completionPercentage,
          warnings: historical.warnings,
        },
      } as const;
    }
    return {
      rowStatus: "skipped",
      actionTaken: "skipped_existing_history_rows",
      normalizedRow: {
        childJobId: historical.jobId,
        latestTradeDate: historical.coverage.lastAvailableDate,
        insertedRows: historical.insertedRows,
        updatedRows: historical.updatedRows,
        skippedRows: historical.skippedRows,
        completionPercentage: historical.coverage.completionPercentage,
        warnings: historical.warnings,
      },
    } as const;
  }

  const generic = result as YahooQuoteStatisticsImportResult | YahooFinancialStatementsImportResult;
  if ("skippedExistingSnapshot" in generic && generic.skippedExistingSnapshot) {
    return {
      rowStatus: "skipped",
      actionTaken: "skipped_existing_snapshot",
      normalizedRow: {
        childJobId: generic.jobId,
        warnings: generic.warnings,
        reports: "reports" in generic ? generic.reports : {},
        skippedExistingSnapshot: true,
      },
    } as const;
  }
  const rowStatus =
    generic.jobStatus === "completed_with_errors" || generic.warnings.length > 0
      ? "warning"
      : "imported";

  return {
    rowStatus,
    actionTaken:
      moduleKey === "quote_statistics"
        ? rowStatus === "warning"
          ? "normalized_quote_statistics_with_warnings"
          : "normalized_quote_statistics"
        : rowStatus === "warning"
          ? "normalized_financial_statements_with_warnings"
          : "normalized_financial_statements",
    normalizedRow: {
      childJobId: generic.jobId,
      warnings: generic.warnings,
      reports: "reports" in generic ? generic.reports : {},
    },
  } as const;
}

async function runBatchModuleImport(input: {
  item: BatchItemRow;
  duplicateMode: YahooBatchDuplicateMode;
  actorEmail: string;
  actorUserId: string | null;
  jobMetadata: JsonRecord;
}) {
  const yahooSymbol = cleanString(input.item.sourceKey, 160).toUpperCase();
  const stockId = input.item.stockId;
  const force = readForceMode(input.jobMetadata);

  if (!yahooSymbol || !stockId) {
    throw new Error("Batch item is missing a Yahoo symbol or stock_id.");
  }

  if (input.item.bucketKey === "historical_prices") {
    return runYahooHistoricalOhlcvImport({
      yahooSymbol,
      stockId,
      actorEmail: input.actorEmail,
      actorUserId: input.actorUserId,
      period: readHistoricalPeriod(input.jobMetadata),
      interval: "1d",
      duplicateMode: input.duplicateMode,
      force,
      dryRun: readDryRunMode(input.jobMetadata),
    });
  }

  if (input.item.bucketKey === "quote_statistics") {
    return runYahooQuoteStatisticsImport({
      yahooSymbol,
      stockId,
      actorEmail: input.actorEmail,
      actorUserId: input.actorUserId,
      force,
      refresh: readRefreshSnapshots(input.jobMetadata),
      snapshotOnly: readSnapshotOnly(input.jobMetadata),
      dryRun: readDryRunMode(input.jobMetadata),
      allowExistingSnapshotSkipOnDryRun: readBatchProfile(input.jobMetadata) === "daily_chart_update",
    });
  }

  return runYahooFinancialStatementsImport({
    yahooSymbol,
    stockId,
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    dryRun: readDryRunMode(input.jobMetadata),
  });
}

async function maybeMarkBatchPaused(jobId: string) {
  const job = await loadBatchJob(jobId);
  const controlState = readControlState(job.metadata);
  if (controlState !== "pause_requested" && controlState !== "paused") {
    return null;
  }

  const updatedJob = await updateBatchJobRow(job, {
    status: "queued",
    completedAt: null,
    metadata: {
      controlState: "paused",
      pausedAt: new Date().toISOString(),
      activeWorkerId: null,
    },
  });
  const items = await loadBatchItems(jobId);
  const coverageRows = await loadCoverageRows(items.map((item) => item.stockId).filter(Boolean) as string[]);
  return await buildBatchReportFromState({
    job: updatedJob,
    items,
    coverageRows,
  });
}

async function maybeCancelBatchJob(jobId: string) {
  const job = await loadBatchJob(jobId);
  const controlState = readControlState(job.metadata);
  if (controlState !== "stop_requested") {
    return null;
  }

  const updatedJob = await updateBatchJobRow(job, {
    status: "cancelled",
    completedAt: new Date().toISOString(),
    metadata: {
      controlState: "stop_requested",
      stoppedAt: new Date().toISOString(),
      activeWorkerId: null,
    },
  });
  const items = await loadBatchItems(jobId);
  const coverageRows = await loadCoverageRows(items.map((item) => item.stockId).filter(Boolean) as string[]);
  return await buildBatchReportFromState({
    job: updatedJob,
    items,
    coverageRows,
  });
}

export async function createYahooStockBatchImportJob(
  input: YahooBatchImportCreateInput,
) {
  ensureBatchImporterReady();
  const stocks = await resolveBatchStockTargets(input.stocks);
  if (!stocks.length) {
    throw new Error("Add at least one Yahoo stock symbol or stock_id for the batch import.");
  }

  const modules = normalizeModules(input.modules);
  enforceBatchModulePolicy(modules);
  const importOnlyMissingData = input.importOnlyMissingData !== false;
  const duplicateMode = normalizeDuplicateMode(input.duplicateMode);
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Batch Import";
  const actorUserId = cleanString(input.actorUserId, 160) || null;
  const jobId = await insertParentBatchJob({
    stocks,
    modules,
    importOnlyMissingData,
    duplicateMode,
    actorEmail,
    actorUserId,
  });

  const report = await getYahooStockBatchImportReport(jobId);
  return {
    jobId,
    report,
  };
}

async function loadActiveNseBatchStockTargets() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stocks_master")
    .select("id, slug, symbol, yahoo_symbol, company_name")
    .eq("exchange", "NSE")
    .eq("status", "active")
    .not("yahoo_symbol", "is", null)
    .order("symbol", { ascending: true });

  if (error) {
    throw new Error(`Could not load active NSE stocks for the Yahoo daily update job. ${error.message}`);
  }

  return Array.isArray(data)
    ? data
        .map((row) => ({
          stockId: cleanString((row as JsonRecord).id, 160),
          slug: cleanString((row as JsonRecord).slug, 160) || null,
          symbol: cleanString((row as JsonRecord).symbol, 160).toUpperCase(),
          yahooSymbol: cleanString((row as JsonRecord).yahoo_symbol, 160).toUpperCase(),
          companyName: cleanString((row as JsonRecord).company_name, 4000) || null,
        }))
        .filter((row) => row.stockId && row.symbol && row.yahooSymbol)
    : [];
}

async function loadDurableFreshnessRowsForDailySameDayCron() {
  const supabase = createSupabaseAdminClient();
  const pageSize = 1000;
  const rows: JsonRecord[] = [];

  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from("stock_data_freshness")
      .select(
        "stock_id, has_today_price, has_today_snapshot, expected_trading_date, reason_category, is_stale",
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Could not load stock_data_freshness for the Yahoo daily cron. ${error.message}`);
    }

    const pageRows = Array.isArray(data) ? (data as JsonRecord[]) : [];
    if (!pageRows.length) {
      break;
    }

    rows.push(...pageRows);
    if (pageRows.length < pageSize) {
      break;
    }
  }

  return rows;
}

function shouldIncludeFreshnessRowForDailySameDayCron(row: JsonRecord, targetDate: string) {
  const reasonCategory = cleanString(row.reason_category, 80);
  if (reasonCategory === "provider_no_data") {
    return false;
  }

  const expectedTradingDate = cleanString(row.expected_trading_date, 40) || targetDate;
  if (expectedTradingDate !== targetDate) {
    return true;
  }

  return !Boolean(row.has_today_price) || !Boolean(row.has_today_snapshot) || Boolean(row.is_stale);
}

async function loadStocksNeedingDailySameDayCronUpdate(targetDate: string) {
  const [stocks, freshnessRows] = await Promise.all([
    loadActiveNseBatchStockTargets(),
    loadDurableFreshnessRowsForDailySameDayCron().catch(() => [] as JsonRecord[]),
  ]);

  if (!freshnessRows.length) {
    return stocks;
  }

  const freshnessByStockId = new Map(
    freshnessRows
      .map((row) => [cleanString(row.stock_id, 160), row] as const)
      .filter(([stockId]) => Boolean(stockId)),
  );

  return stocks.filter((stock) => {
    const row = freshnessByStockId.get(stock.stockId);
    if (!row) {
      return true;
    }
    return shouldIncludeFreshnessRowForDailySameDayCron(row, targetDate);
  });
}

async function loadRecentYahooDailyCronBatchJobs(limit = 50) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_import_jobs")
    .select("id, status, started_at, completed_at, created_at, updated_at, metadata")
    .eq("job_kind", "yahoo_batch_import")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Could not load recent Yahoo daily cron batch jobs. ${error.message}`);
  }

  return Array.isArray(data)
    ? data
        .map((row) => {
          const record = row as JsonRecord;
          const metadata = normalizeMetadata(record.metadata);
          return {
            id: cleanString(record.id, 160),
            status: cleanString(record.status, 120) || "queued",
            startedAt: cleanString(record.started_at, 120) || null,
            completedAt: cleanString(record.completed_at, 120) || null,
            createdAt: cleanString(record.created_at, 120) || null,
            updatedAt: cleanString(record.updated_at, 120) || null,
            metadata,
          };
        })
        .filter((row) => isYahooDailySameDayCronBatchProfile(readBatchProfile(row.metadata)))
    : [];
}

async function findLatestYahooDailyCronBatchJob(
  cronWindow: YahooDailyCronWindow,
  targetDate: string,
) {
  const jobs = await loadRecentYahooDailyCronBatchJobs();
  return (
    jobs.find((job) => {
      const metadata = normalizeMetadata(job.metadata);
      return (
        readDailySameDayCronWindow(metadata) === cronWindow &&
        readDailySameDayTargetDate(metadata) === targetDate
      );
    }) ?? null
  );
}

function isYahooDailyCronJobTerminal(status: string) {
  return ["completed", "completed_with_errors", "failed", "cancelled"].includes(cleanString(status, 120));
}

async function loadRetryStocksForDailySameDayCron(targetDate: string) {
  const [stocksNeedingUpdate, latestPrimaryJob] = await Promise.all([
    loadStocksNeedingDailySameDayCronUpdate(targetDate),
    findLatestYahooDailyCronBatchJob("primary", targetDate),
  ]);

  const requestedByStockId = new Map(stocksNeedingUpdate.map((stock) => [stock.stockId, stock]));
  if (!latestPrimaryJob) {
    return Array.from(requestedByStockId.values());
  }

  const items = await loadBatchItems(latestPrimaryJob.id);
  for (const item of items) {
    if (!item.stockId || !item.sourceKey) {
      continue;
    }
    if (["pending", "validated", "failed"].includes(item.rowStatus)) {
      const stock = await resolveBatchStockTarget({
        stockId: item.stockId,
        yahooSymbol: item.sourceKey,
      });
      requestedByStockId.set(stock.stockId, stock);
    }
  }

  return Array.from(requestedByStockId.values());
}

function buildDailySameDayCronProgressMetadata(input: {
  items: BatchItemRow[];
  targetDate: string;
  cronWindow: YahooDailyCronWindow;
  lastProcessedSymbol?: string | null;
}) {
  const totalStocks = input.items.length;
  const terminalItems = input.items.filter((item) => isTerminalItemStatus(item.rowStatus)).length;
  const completedStocks = input.items.filter((item) =>
    ["imported", "updated", "warning"].includes(item.rowStatus),
  ).length;
  const failedStocks = input.items.filter((item) => item.rowStatus === "failed").length;
  const skippedStocks = input.items.filter((item) => item.rowStatus === "skipped").length;
  const nextPendingItem =
    input.items.find((item) => item.rowStatus === "pending" || item.rowStatus === "validated") ?? null;
  const nextCursor = nextPendingItem ? input.items.findIndex((item) => item.id === nextPendingItem.id) : totalStocks;

  return {
    targetDate: input.targetDate,
    cronWindow: input.cronWindow,
    requestedStocks: totalStocks,
    processedStocks: terminalItems,
    completedStocks,
    failedStocks,
    skippedStocks,
    pendingStocks: Math.max(totalStocks - terminalItems, 0),
    nextCursor,
    lastProcessedSymbol: cleanString(input.lastProcessedSymbol, 160) || null,
    nextPendingSymbol:
      cleanString(nextPendingItem?.sourceKey, 160) ||
      cleanString(nextPendingItem?.symbol, 160) ||
      null,
  } satisfies JsonRecord;
}

export async function runYahooDailySameDayOnlyUntilComplete(
  input: YahooDailySameDayOnlyRunInput = {},
) {
  ensureBatchImporterReady();
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Daily Same-Day-Only Update";
  const actorUserId = cleanString(input.actorUserId, 160) || null;
  const targetDate = cleanString(input.targetDate, 40) || "2026-04-30";
  const force = input.force === true;
  const dryRun = input.dryRun === true;
  const requestedMaxItems = Math.floor(numericOrZero(input.maxItems));

  const stocks =
    Array.isArray(input.stocks) && input.stocks.length
      ? await resolveBatchStockTargets(input.stocks)
      : await loadActiveNseBatchStockTargets();

  const scopedStocks =
    requestedMaxItems > 0
      ? stocks.slice(0, requestedMaxItems)
      : stocks;
  const results: YahooDailySameDayOnlyImportResult[] = [];
  const failures: Array<{ yahooSymbol: string; stockId: string | null; error: string }> = [];
  const warnings: string[] = [];

  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let snapshotInsertedCount = 0;
  let snapshotSkippedCount = 0;
  let noDataCount = 0;
  let usedLatestAvailableTradingDateCount = 0;
  let warningCount = 0;
  let stoppedEarly = false;
  let stopReason: string | null = null;
  const sameDaySignatureRecords: SameDaySignatureRecord[] = [];

  for (const stock of scopedStocks) {
    try {
      const result = await runYahooDailySameDayOnlyImport({
        yahooSymbol: stock.yahooSymbol,
        stockId: stock.stockId,
        actorEmail,
        actorUserId,
        targetDate,
        force,
        dryRun,
      });
      results.push(result);
      insertedRows += result.insertedRows;
      updatedRows += result.updatedRows;
      skippedRows += result.skippedRows;
      snapshotInsertedCount += Number(result.snapshotInserted);
      snapshotSkippedCount += Number(result.snapshotSkipped);
      noDataCount += Number(result.noData);
      usedLatestAvailableTradingDateCount += Number(result.usedLatestAvailableTradingDate);
      warningCount += result.warnings.length > 0 ? 1 : 0;
      warnings.push(...result.warnings);

      if (
        result.effectiveHistoricalRow &&
        (result.insertedRows > 0 || result.updatedRows > 0) &&
        !result.noData
      ) {
        sameDaySignatureRecords.push({
          stockId: stock.stockId,
          yahooSymbol: stock.yahooSymbol,
          symbol: stock.symbol,
          row: result.effectiveHistoricalRow,
        });

        const anomaly = detectSuspiciousSameDaySignatureSpike(sameDaySignatureRecords);
        if (anomaly.shouldStop) {
          stoppedEarly = true;
          stopReason = anomaly.message;
          warningCount += 1;
          if (anomaly.message) {
            warnings.push(anomaly.message);
          }
          break;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown same-day-only import failure.";
      failures.push({
        yahooSymbol: stock.yahooSymbol,
        stockId: stock.stockId,
        error: message,
      });
      if (isCooldownStyleSameDayFailure(error)) {
        stoppedEarly = true;
        stopReason = `Yahoo cooldown triggered while processing ${stock.yahooSymbol}.`;
        warnings.push(stopReason);
        break;
      }
      if (isWriteSpikeSameDayFailure(error)) {
        stoppedEarly = true;
        stopReason = `Stopped same-day-only batch after a write-timeout style failure on ${stock.yahooSymbol}.`;
        warnings.push(stopReason);
        break;
      }
      if (isDuplicateKeySameDayFailure(error)) {
        stoppedEarly = true;
        stopReason = `Stopped same-day-only batch after a duplicate-key failure on ${stock.yahooSymbol}.`;
        warnings.push(stopReason);
        break;
      }
    }
  }

  return {
    mode: "daily_same_day_only",
    targetDate,
    requestedCount: scopedStocks.length,
    processedCount: results.length + failures.length,
    completedCount: results.length,
    failedCount: failures.length,
    warningCount,
    insertedRows,
    updatedRows,
    skippedRows,
    snapshotInsertedCount,
    snapshotSkippedCount,
    noDataCount,
    usedLatestAvailableTradingDateCount,
    stoppedEarly,
    stopReason,
    warnings,
    failures,
    results,
  } satisfies YahooDailySameDayOnlyRunResult;
}

export async function createYahooDailyChartUpdateJob(
  input: YahooDailyChartUpdateCreateInput = {},
) {
  ensureBatchImporterReady();
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Daily Chart Update";
  const actorUserId = cleanString(input.actorUserId, 160) || null;
  const force = input.force === true;
  const dryRun = input.dryRun === true;

  const stocks =
    Array.isArray(input.stocks) && input.stocks.length
      ? await resolveBatchStockTargets(input.stocks)
      : await loadActiveNseBatchStockTargets();

  if (!stocks.length) {
    throw new Error("No active NSE stocks are available for the Yahoo daily chart update job.");
  }

  const jobId = await insertParentBatchJob({
    stocks,
    modules: ["historical_prices", "quote_statistics"],
    importOnlyMissingData: false,
    duplicateMode: "skip_existing_dates",
    actorEmail,
    actorUserId,
    metadataOverrides: {
      batchProfile: "daily_chart_update",
      chartOnly: true,
      historicalPeriod: "1mo",
      snapshotOnly: true,
      refreshSnapshots: force,
      force,
      dryRun,
      minimumRequestIntervalMs: 3000,
      throttleRequestsPerSecond: 1,
      maxConcurrentWorkers: 1,
      moduleDisabledStatus: {
        financial_statements: "disabled_for_daily_chart_update",
        valuation_metrics: "protected_quote_summary_disabled",
        share_statistics: "protected_quote_summary_disabled",
        financial_highlights: "protected_quote_summary_disabled",
        quote_summary: "chart_fallback_only",
        holders: "not_in_daily_chart_update_scope",
        options: "not_in_daily_chart_update_scope",
        news: "not_in_daily_chart_update_scope",
      },
      jobSummary:
        "Daily chart-only Yahoo update. Updates recent history and refreshes latest snapshot with chart fallback only.",
    },
  });

  const report = await getYahooStockBatchImportReport(jobId);
  return {
    jobId,
    report,
  };
}

export async function prepareYahooDailySameDayCronJob(
  input: YahooDailySameDayCronJobInput,
): Promise<YahooDailySameDayCronJobPreparation> {
  ensureBatchImporterReady();
  const targetDate = cleanString(input.targetDate, 40) || new Date().toISOString().slice(0, 10);
  const cronWindow = input.cronWindow;
  const actorEmail =
    cleanString(input.actorEmail, 240) ||
    (cronWindow === "retry"
      ? "Yahoo Daily Same-Day Retry Cron"
      : "Yahoo Daily Same-Day Cron");
  const actorUserId = cleanString(input.actorUserId, 160) || null;

  const latestJob = await findLatestYahooDailyCronBatchJob(cronWindow, targetDate);
  if (latestJob) {
    const latestReport = await getYahooStockBatchImportReport(latestJob.id);
    const latestMetadata = normalizeMetadata(latestJob.metadata);
    if (hasFreshActiveWorker(latestMetadata)) {
      return {
        mode: "already_running",
        cronWindow,
        targetDate,
        jobId: latestJob.id,
        created: false,
        reused: true,
        requestedCount: latestReport.totalStocks,
        queueWorker: false,
        dispatchCursor: readDailySameDayDispatchCursor(latestMetadata),
        lastProcessedSymbol: readDailySameDayLastProcessedSymbol(latestMetadata),
        nextPendingSymbol: readDailySameDayNextPendingSymbol(latestMetadata),
        report: latestReport,
      };
    }

    if (!isYahooDailyCronJobTerminal(latestJob.status)) {
      return {
        mode: "queued_job",
        cronWindow,
        targetDate,
        jobId: latestJob.id,
        created: false,
        reused: true,
        requestedCount: latestReport.totalStocks,
        queueWorker: true,
        dispatchCursor: readDailySameDayDispatchCursor(latestMetadata),
        lastProcessedSymbol: readDailySameDayLastProcessedSymbol(latestMetadata),
        nextPendingSymbol: readDailySameDayNextPendingSymbol(latestMetadata),
        report: latestReport,
      };
    }
  }

  const stocks =
    cronWindow === "retry"
      ? await loadRetryStocksForDailySameDayCron(targetDate)
      : await loadStocksNeedingDailySameDayCronUpdate(targetDate);

  if (!stocks.length) {
    return {
      mode: "no_work",
      cronWindow,
      targetDate,
      jobId: null,
      created: false,
      reused: false,
      requestedCount: 0,
      queueWorker: false,
      dispatchCursor: 0,
      lastProcessedSymbol: null,
      nextPendingSymbol: null,
      report: null,
    };
  }

  const jobId = await insertParentBatchJob({
    stocks,
    modules: ["historical_prices"],
    importOnlyMissingData: false,
    duplicateMode: "skip_existing_dates",
    actorEmail,
    actorUserId,
    metadataOverrides: {
      batchProfile: getYahooDailySameDayCronBatchProfile(cronWindow),
      cronWindow,
      mode: "daily_same_day_only",
      targetDate,
      force: false,
      dryRun: false,
      chartOnly: true,
      snapshotOnly: true,
      refreshSnapshots: false,
      importOnlyMissingData: false,
      minimumRequestIntervalMs: 3000,
      throttleRequestsPerSecond: Number((1 / 3).toFixed(6)),
      maxConcurrentWorkers: 1,
      nextCursor: 0,
      lastProcessedSymbol: null,
      nextPendingSymbol: stocks[0]?.yahooSymbol ?? null,
      requestedStocks: stocks.length,
      processedStocks: 0,
      completedStocks: 0,
      failedStocks: 0,
      pendingStocks: stocks.length,
      moduleDisabledStatus: {
        financial_statements: "disabled_for_daily_same_day_cron",
        valuation_metrics: "chart_only_same_day_mode",
        share_statistics: "chart_only_same_day_mode",
        financial_highlights: "chart_only_same_day_mode",
        quote_summary: "chart_only_same_day_mode",
        holders: "chart_only_same_day_mode",
        options: "chart_only_same_day_mode",
        news: "chart_only_same_day_mode",
      },
      jobSummary:
        cronWindow === "retry"
          ? "Retry-only strict same-day Yahoo cron lane for missing, stale, or failed remainder."
          : "Primary strict same-day Yahoo cron lane for active NSE stocks missing the expected trading-date row or snapshot.",
    },
  });

  const report = await getYahooStockBatchImportReport(jobId);
  return {
    mode: "queued_job",
    cronWindow,
    targetDate,
    jobId,
    created: true,
    reused: false,
    requestedCount: stocks.length,
    queueWorker: true,
    dispatchCursor: 0,
    lastProcessedSymbol: null,
    nextPendingSymbol: stocks[0]?.yahooSymbol ?? null,
    report,
  };
}

export async function getYahooStockBatchImportReport(jobId: string): Promise<YahooBatchImportReport> {
  ensureBatchImporterReady();
  const [job, items] = await Promise.all([loadBatchJob(jobId), loadBatchItems(jobId)]);
  const coverageRows = await loadCoverageRows(items.map((item) => item.stockId).filter(Boolean) as string[]);
  return await buildBatchReportFromState({
    job,
    items,
    coverageRows,
  });
}

function summarizeDailySameDayCronItemResult(result: YahooDailySameDayOnlyImportResult) {
  const hasWarnings = result.warnings.length > 0;

  if (result.noData) {
    return {
      rowStatus: "warning" as const,
      actionTaken: "same_day_no_data",
    };
  }

  if (result.insertedRows > 0 || result.snapshotInserted) {
    return {
      rowStatus: hasWarnings ? ("warning" as const) : ("imported" as const),
      actionTaken: hasWarnings ? "same_day_imported_with_warnings" : "same_day_inserted",
    };
  }

  if (result.updatedRows > 0) {
    return {
      rowStatus: hasWarnings ? ("warning" as const) : ("updated" as const),
      actionTaken: hasWarnings ? "same_day_updated_with_warnings" : "same_day_updated",
    };
  }

  if (result.skippedRows > 0 || result.snapshotSkipped) {
    return {
      rowStatus: hasWarnings ? ("warning" as const) : ("skipped" as const),
      actionTaken: hasWarnings
        ? "same_day_skipped_with_warnings"
        : "same_day_skipped_existing_rows",
    };
  }

  return {
    rowStatus: hasWarnings ? ("warning" as const) : ("imported" as const),
    actionTaken: hasWarnings ? "same_day_completed_with_warnings" : "same_day_completed",
  };
}

export async function runYahooDailySameDayCronWorker(
  input: YahooDailySameDayCronWorkerInput,
): Promise<YahooDailySameDayCronWorkerOutcome> {
  ensureBatchImporterReady();
  const maxItemsPerRun = Math.max(
    1,
    Math.min(50, Math.floor(input.maxItemsPerRun ?? getDefaultDailySameDayCronBatchSize())),
  );
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Daily Same-Day Cron Worker";
  const actorUserId = cleanString(input.actorUserId, 160) || null;
  const targetDate = cleanString(input.targetDate, 40) || new Date().toISOString().slice(0, 10);
  const cronWindow = input.cronWindow;

  let job = await loadBatchJob(input.jobId);
  const batchProfile = readBatchProfile(job.metadata);
  if (!isYahooDailySameDayCronBatchProfile(batchProfile)) {
    throw new Error(`Yahoo batch job "${input.jobId}" is not a strict same-day cron job.`);
  }

  const initialStatus = computeDisplayedBatchStatus(job);
  const existingActiveWorkerIsFresh = job.status === "running" && hasFreshActiveWorker(job.metadata);
  if (["completed", "failed", "stopped"].includes(initialStatus)) {
    return {
      jobId: input.jobId,
      cronWindow,
      targetDate,
      processedStocks: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [],
      shouldQueueFollowUp: false,
      dispatchCursor: readDailySameDayDispatchCursor(job.metadata),
      lastProcessedSymbol: readDailySameDayLastProcessedSymbol(job.metadata),
      nextPendingSymbol: readDailySameDayNextPendingSymbol(job.metadata),
    };
  }

  if (initialStatus === "paused" || initialStatus === "cooling_down") {
    return {
      jobId: input.jobId,
      cronWindow,
      targetDate,
      processedStocks: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [
        initialStatus === "cooling_down"
          ? `Batch job is cooling down until ${readCooldownUntil(job.metadata) ?? "the cooldown expires"}.`
          : "Batch job is paused.",
      ],
      shouldQueueFollowUp: false,
      dispatchCursor: readDailySameDayDispatchCursor(job.metadata),
      lastProcessedSymbol: readDailySameDayLastProcessedSymbol(job.metadata),
      nextPendingSymbol: readDailySameDayNextPendingSymbol(job.metadata),
    };
  }

  if (existingActiveWorkerIsFresh) {
    return {
      jobId: input.jobId,
      cronWindow,
      targetDate,
      processedStocks: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [
        "A Yahoo daily same-day cron worker is already active for this job.",
      ],
      shouldQueueFollowUp: false,
      dispatchCursor: readDailySameDayDispatchCursor(job.metadata),
      lastProcessedSymbol: readDailySameDayLastProcessedSymbol(job.metadata),
      nextPendingSymbol: readDailySameDayNextPendingSymbol(job.metadata),
    };
  }

  const activeWorkers = await countActiveYahooBatchWorkers(input.jobId);
  if (activeWorkers >= getConfiguredMaxConcurrentWorkers()) {
    return {
      jobId: input.jobId,
      cronWindow,
      targetDate,
      processedStocks: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [
        `Yahoo worker limit reached (${getConfiguredMaxConcurrentWorkers()} active worker${getConfiguredMaxConcurrentWorkers() === 1 ? "" : "s"}).`,
      ],
      shouldQueueFollowUp: false,
      dispatchCursor: readDailySameDayDispatchCursor(job.metadata),
      lastProcessedSymbol: readDailySameDayLastProcessedSymbol(job.metadata),
      nextPendingSymbol: readDailySameDayNextPendingSymbol(job.metadata),
    };
  }

  const workerId = randomUUID();
  const now = new Date().toISOString();
  job = await updateBatchJobRow(job, {
    status: "running",
    startedAt: job.startedAt ?? now,
    completedAt: null,
    metadata: {
      controlState: "active",
      activeWorkerId: workerId,
      latestHeartbeatAt: now,
      lastRunStartedAt: now,
      cronWindow,
      targetDate,
    },
  });

  const warnings: string[] = [];
  let processedStocks = 0;
  let lastProcessedSymbol: string | null = null;
  let stopReason: string | null = null;
  const items = await loadBatchItems(input.jobId);
  const pendingItems = items
    .filter((item) => item.rowStatus === "pending" || item.rowStatus === "validated")
    .slice(0, maxItemsPerRun);

  for (const item of pendingItems) {
    const cancelledReport = await maybeCancelBatchJob(input.jobId);
    if (cancelledReport) {
      const cancelledJob = await loadBatchJob(input.jobId);
      return {
        jobId: input.jobId,
        cronWindow,
        targetDate,
        processedStocks,
        report: cancelledReport,
        warnings,
        shouldQueueFollowUp: false,
        dispatchCursor: readDailySameDayDispatchCursor(cancelledJob.metadata),
        lastProcessedSymbol,
        nextPendingSymbol: readDailySameDayNextPendingSymbol(cancelledJob.metadata),
      };
    }

    const pausedReport = await maybeMarkBatchPaused(input.jobId);
    if (pausedReport) {
      const pausedJob = await loadBatchJob(input.jobId);
      return {
        jobId: input.jobId,
        cronWindow,
        targetDate,
        processedStocks,
        report: pausedReport,
        warnings,
        shouldQueueFollowUp: false,
        dispatchCursor: readDailySameDayDispatchCursor(pausedJob.metadata),
        lastProcessedSymbol,
        nextPendingSymbol: readDailySameDayNextPendingSymbol(pausedJob.metadata),
      };
    }

    const claimedItem =
      item.rowStatus === "validated"
        ? await updateBatchItemRow(item, {
            rowStatus: "validated",
            actionTaken: "reprocessing_same_day_item",
            normalizedRow: {
              ...item.normalizedRow,
              workerRestartedAt: new Date().toISOString(),
            },
          })
        : await updateBatchItemRow(item, {
            rowStatus: "validated",
            actionTaken: "processing_same_day_item",
            normalizedRow: {
              ...item.normalizedRow,
              workerStartedAt: new Date().toISOString(),
            },
          });

    const startedMs = Date.now();
    let shouldStopAfterItem = false;

    try {
      const yahooSymbol =
        cleanString(claimedItem.sourceKey, 160) || cleanString(claimedItem.symbol, 160);
      if (!yahooSymbol || !claimedItem.stockId) {
        throw new Error("The same-day cron worker item is missing stock_id or yahoo_symbol.");
      }

      const result = await runYahooDailySameDayOnlyImport({
        yahooSymbol,
        stockId: claimedItem.stockId,
        actorEmail,
        actorUserId,
        targetDate,
        force: false,
        dryRun: false,
      });
      const summary = summarizeDailySameDayCronItemResult(result);
      lastProcessedSymbol = result.stock.yahooSymbol;
      await updateBatchItemRow(claimedItem, {
        rowStatus: summary.rowStatus,
        actionTaken: summary.actionTaken,
        rawRow: {
          yahooSymbol: result.stock.yahooSymbol,
          childJobId: result.jobId,
          rawImportId: result.rawImportId,
          effectiveTradeDate: result.effectiveTradeDate,
          targetDate: result.targetDate,
        },
        normalizedRow: {
          ...claimedItem.normalizedRow,
          childJobId: result.jobId,
          rawImportId: result.rawImportId,
          targetDate: result.targetDate,
          effectiveTradeDate: result.effectiveTradeDate,
          insertedRows: result.insertedRows,
          updatedRows: result.updatedRows,
          skippedRows: result.skippedRows,
          snapshotInserted: result.snapshotInserted,
          snapshotSkipped: result.snapshotSkipped,
          noData: result.noData,
          usedLatestAvailableTradingDate: result.usedLatestAvailableTradingDate,
          warnings: result.warnings,
        },
      });

      job = await loadBatchJob(input.jobId);
      const currentMetadata = normalizeMetadata(job.metadata);
      const nextMetadata: JsonRecord = {
        consecutiveYahooFailures: 0,
        lastSuccessfulYahooModule: "historical_prices",
        lastSuccessfulYahooSymbol: result.stock.yahooSymbol,
        lastSuccessfulYahooAt: new Date().toISOString(),
        dailySameDayInsertedRows: numericOrZero(currentMetadata.dailySameDayInsertedRows) + result.insertedRows,
        dailySameDayUpdatedRows: numericOrZero(currentMetadata.dailySameDayUpdatedRows) + result.updatedRows,
        dailySameDaySkippedRows: numericOrZero(currentMetadata.dailySameDaySkippedRows) + result.skippedRows,
        dailySameDaySnapshotInsertedCount:
          numericOrZero(currentMetadata.dailySameDaySnapshotInsertedCount) + Number(result.snapshotInserted),
        dailySameDaySnapshotSkippedCount:
          numericOrZero(currentMetadata.dailySameDaySnapshotSkippedCount) + Number(result.snapshotSkipped),
        dailySameDayNoDataCount:
          numericOrZero(currentMetadata.dailySameDayNoDataCount) + Number(result.noData),
        dailySameDayProviderLagCount:
          numericOrZero(currentMetadata.dailySameDayProviderLagCount) +
          Number(result.usedLatestAvailableTradingDate),
        lastProcessedSymbol: result.stock.yahooSymbol,
      };

      if (result.skippedRows > 0) {
        nextMetadata.savedRequestsAvoided = numericOrZero(currentMetadata.savedRequestsAvoided) + 1;
        nextMetadata.existingDataReused = numericOrZero(currentMetadata.existingDataReused) + 1;
        nextMetadata.skippedExistingHistoryCount =
          numericOrZero(currentMetadata.skippedExistingHistoryCount) + result.skippedRows;
      }
      if (result.snapshotSkipped) {
        nextMetadata.savedRequestsAvoided = numericOrZero(nextMetadata.savedRequestsAvoided ?? currentMetadata.savedRequestsAvoided) + 1;
        nextMetadata.existingDataReused = numericOrZero(nextMetadata.existingDataReused ?? currentMetadata.existingDataReused) + 1;
        nextMetadata.skippedExistingSnapshotCount =
          numericOrZero(currentMetadata.skippedExistingSnapshotCount) + 1;
      }

      await updateBatchJobRow(job, {
        metadata: nextMetadata,
      });

      if (result.warnings.length) {
        warnings.push(
          `${result.stock.yahooSymbol}: ${result.warnings.join(" ")}`,
        );
      }
      processedStocks += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Yahoo same-day cron item failure.";
      await updateBatchItemRow(claimedItem, {
        rowStatus: "failed",
        actionTaken: "same_day_item_failed",
        rawRow: {
          yahooSymbol: claimedItem.sourceKey,
          error: message,
        },
        normalizedRow: {
          ...claimedItem.normalizedRow,
          error: message,
          targetDate,
        },
      });
      warnings.push(
        `${cleanString(claimedItem.sourceKey || claimedItem.symbol || claimedItem.itemKey, 160)} failed: ${message}`,
      );
      processedStocks += 1;

      if (isCooldownStyleSameDayFailure(error)) {
        const cooldown = await pauseYahooBatchJobForImmediateCooldown({
          jobId: input.jobId,
          item: claimedItem,
          message,
        });
        stopReason = cooldown.cooldownReason;
        if (stopReason) {
          warnings.push(stopReason);
        }
        shouldStopAfterItem = true;
      } else if (isWriteSpikeSameDayFailure(error)) {
        stopReason = `Stopped strict same-day cron after a write-timeout style failure on ${cleanString(
          claimedItem.sourceKey || claimedItem.symbol || claimedItem.itemKey,
          160,
        )}.`;
        warnings.push(stopReason);
        shouldStopAfterItem = true;
      } else if (isDuplicateKeySameDayFailure(error)) {
        stopReason = `Stopped strict same-day cron after a duplicate-key failure on ${cleanString(
          claimedItem.sourceKey || claimedItem.symbol || claimedItem.itemKey,
          160,
        )}.`;
        warnings.push(stopReason);
        shouldStopAfterItem = true;
      }
    } finally {
      job = await loadBatchJob(input.jobId);
      const durationMs = Date.now() - startedMs;
      const existingDurations = Array.isArray(job.metadata.processedItemDurationsMs)
        ? job.metadata.processedItemDurationsMs
            .map((itemValue) => numericOrZero(itemValue))
            .filter((value) => value > 0)
            .slice(-24)
        : [];
      const nextDurations = [...existingDurations, durationMs].slice(-24);
      await updateBatchJobRow(job, {
        metadata: {
          activeWorkerId: workerId,
          latestHeartbeatAt: new Date().toISOString(),
          processedDurationCount: numericOrZero(job.metadata.processedDurationCount) + 1,
          processedDurationTotalMs:
            numericOrZero(job.metadata.processedDurationTotalMs) + durationMs,
          processedItemDurationsMs: nextDurations,
        },
      });
    }

    if (shouldStopAfterItem) {
      break;
    }

    const minimumRequestIntervalMs = readMinimumRequestIntervalMs(job.metadata);
    if (minimumRequestIntervalMs > 0) {
      const elapsedMs = Date.now() - startedMs;
      if (elapsedMs < minimumRequestIntervalMs) {
        await sleep(minimumRequestIntervalMs - elapsedMs);
      }
    }
  }

  const refreshedReport = await updateBatchProgressSnapshot(input.jobId);
  const refreshedJob = await loadBatchJob(input.jobId);
  const refreshedItems = await loadBatchItems(input.jobId);
  const progressMetadata = buildDailySameDayCronProgressMetadata({
    items: refreshedItems,
    targetDate,
    cronWindow,
    lastProcessedSymbol,
  });

  if (stopReason && !isCoolingDown(refreshedJob.metadata)) {
    await updateBatchJobRow(refreshedJob, {
      status: "failed",
      completedAt: new Date().toISOString(),
      importedItems: refreshedReport.importedItems,
      updatedItems: refreshedReport.updatedItems,
      skippedItems: refreshedReport.skippedItems,
      failedItems: refreshedReport.failedItems,
      warningItems: refreshedReport.warningItems,
      metadata: {
        ...progressMetadata,
        activeWorkerId: null,
        latestHeartbeatAt: new Date().toISOString(),
        lastRunFinishedAt: new Date().toISOString(),
        stopReason,
      },
    });
  } else if (refreshedReport.pendingItems === 0) {
    const nextTerminalStatus: "completed" | "completed_with_errors" | "failed" =
      refreshedReport.failedItems > 0
        ? refreshedReport.completedStocks > 0 || refreshedReport.skippedStocks > 0
          ? "completed_with_errors"
          : "failed"
        : refreshedReport.warningItems > 0
          ? "completed_with_errors"
          : "completed";

    await updateBatchJobRow(refreshedJob, {
      status: nextTerminalStatus,
      completedAt: new Date().toISOString(),
      importedItems: refreshedReport.importedItems,
      updatedItems: refreshedReport.updatedItems,
      skippedItems: refreshedReport.skippedItems,
      failedItems: refreshedReport.failedItems,
      warningItems: refreshedReport.warningItems,
      metadata: {
        ...progressMetadata,
        controlState: "active",
        activeWorkerId: null,
        latestHeartbeatAt: new Date().toISOString(),
        lastRunFinishedAt: new Date().toISOString(),
        consecutiveYahooFailures: 0,
      },
    });
  } else {
    await updateBatchJobRow(refreshedJob, {
      status: isCoolingDown(refreshedJob.metadata) ? "queued" : "queued",
      completedAt: null,
      importedItems: refreshedReport.importedItems,
      updatedItems: refreshedReport.updatedItems,
      skippedItems: refreshedReport.skippedItems,
      failedItems: refreshedReport.failedItems,
      warningItems: refreshedReport.warningItems,
      metadata: {
        ...progressMetadata,
        activeWorkerId: null,
        latestHeartbeatAt: new Date().toISOString(),
        lastRunFinishedAt: new Date().toISOString(),
      },
    });
  }

  const finalJob = await loadBatchJob(input.jobId);
  const finalReport = await getYahooStockBatchImportReport(input.jobId);
  const shouldQueueFollowUp =
    processedStocks > 0 &&
    finalReport.pendingItems > 0 &&
    !["completed", "failed", "stopped", "paused", "cooling_down"].includes(finalReport.status);

  return {
    jobId: input.jobId,
    cronWindow,
    targetDate,
    processedStocks,
    report: finalReport,
    warnings,
    shouldQueueFollowUp,
    dispatchCursor: readDailySameDayDispatchCursor(finalJob.metadata),
    lastProcessedSymbol: readDailySameDayLastProcessedSymbol(finalJob.metadata),
    nextPendingSymbol: readDailySameDayNextPendingSymbol(finalJob.metadata),
  };
}

export async function controlYahooStockBatchImportJob(input: {
  jobId: string;
  action: YahooBatchControlAction;
  actorEmail?: string | null;
}) {
  ensureBatchImporterReady();
  const job = await loadBatchJob(input.jobId);
  const controlState = readControlState(job.metadata);
  const action = input.action;
  let nextMessage = "";

  if (action === "pause") {
    const displayStatus = computeDisplayedBatchStatus(job);
    if (displayStatus === "paused" || displayStatus === "cooling_down") {
      nextMessage = "Batch job is already paused.";
    } else {
      const nextStatus = job.status === "running" ? "running" : "queued";
      await updateBatchJobRow(job, {
        status: nextStatus as "queued" | "running",
        completedAt: null,
        metadata: {
          controlState: nextStatus === "running" ? "pause_requested" : "paused",
          pauseRequestedAt: new Date().toISOString(),
        },
      });
      nextMessage =
        nextStatus === "running"
          ? "Pause requested. The worker will stop after the current stock/module finishes."
          : "Batch job paused before the next worker run.";
    }
  } else if (action === "resume") {
    await updateBatchJobRow(job, {
      status: "queued",
      completedAt: null,
      metadata: {
        controlState: "active",
        pausedAt: null,
        pauseRequestedAt: null,
        stopRequestedAt: null,
        cooldownUntil: null,
        cooldownReason: null,
        cooldownFailureCount: 0,
        consecutiveYahooFailures: 0,
      },
    });
    nextMessage = "Batch job resumed and is ready for the next worker run.";
  } else if (action === "stop") {
    const displayStatus = computeDisplayedBatchStatus(job);
    if (displayStatus === "running") {
      await updateBatchJobRow(job, {
        status: "running",
        metadata: {
          controlState: "stop_requested",
          stopRequestedAt: new Date().toISOString(),
        },
      });
      nextMessage = "Stop requested. The worker will cancel the batch after the current stock/module finishes.";
    } else {
      await updateBatchJobRow(job, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
        metadata: {
          controlState: "stop_requested",
          stoppedAt: new Date().toISOString(),
        },
      });
      nextMessage = "Batch job cancelled.";
    }
  } else if (action === "retry") {
    await resetBatchItemsToPending(input.jobId, ["failed", "validated"]);
    await updateBatchJobRow(job, {
      status: "queued",
      completedAt: null,
      importedItems: 0,
      updatedItems: 0,
      skippedItems: 0,
      failedItems: 0,
      warningItems: 0,
      metadata: {
        controlState: controlState === "paused" ? "paused" : "active",
        retryRequestedAt: new Date().toISOString(),
        cooldownUntil: null,
        cooldownReason: null,
        cooldownFailureCount: 0,
        consecutiveYahooFailures: 0,
      },
    });
    nextMessage = "Failed Yahoo batch items were requeued.";
  }

  const report = await getYahooStockBatchImportReport(input.jobId);
  return {
    jobId: input.jobId,
    action,
    status: report.status,
    controlState: report.controlState,
    message: nextMessage || "No batch state change was required.",
    report,
  } satisfies YahooBatchControlResult;
}

export async function runYahooStockBatchImportWorker(
  input: YahooBatchWorkerRunInput,
): Promise<BatchWorkerOutcome> {
  ensureBatchImporterReady();
  const maxItemsPerRun = Math.max(1, Math.floor(input.maxItemsPerRun ?? getDefaultMaxItemsPerRun()));
  const actorEmail = cleanString(input.actorEmail, 240) || "Yahoo Batch Worker";
  const actorUserId = cleanString(input.actorUserId, 160) || null;
  let job = await loadBatchJob(input.jobId);
  const initialStatus = computeDisplayedBatchStatus(job);
  const existingActiveWorkerIsFresh = job.status === "running" && hasFreshActiveWorker(job.metadata);

  if (["completed", "failed", "stopped"].includes(initialStatus)) {
    return {
      processedItems: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [],
    };
  }

  if (initialStatus === "paused" || initialStatus === "cooling_down") {
    return {
      processedItems: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [
        initialStatus === "cooling_down"
          ? `Batch job is cooling down until ${readCooldownUntil(job.metadata) ?? "the configured cooldown expires"}.`
          : "Batch job is paused. Resume it before running the worker again.",
      ],
    };
  }

  if (existingActiveWorkerIsFresh) {
    return {
      processedItems: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [
        "A Yahoo batch worker is already active for this job. Wait for the current worker heartbeat to expire or for the active run to finish before starting another worker.",
      ],
    };
  }

  const activeWorkers = await countActiveYahooBatchWorkers(input.jobId);
  if (activeWorkers >= getConfiguredMaxConcurrentWorkers()) {
    return {
      processedItems: 0,
      report: await getYahooStockBatchImportReport(input.jobId),
      warnings: [
        `Yahoo batch worker limit reached (${getConfiguredMaxConcurrentWorkers()} active worker${getConfiguredMaxConcurrentWorkers() === 1 ? "" : "s"}). Wait for an active worker to finish before starting another run.`,
      ],
    };
  }

  const now = new Date().toISOString();
  const workerId = randomUUID();
  job = await updateBatchJobRow(job, {
    status: "running",
    startedAt: job.startedAt ?? now,
    completedAt: null,
    metadata: {
      controlState: "active",
      activeWorkerId: workerId,
      latestHeartbeatAt: now,
      lastRunStartedAt: now,
      cooldownUntil: null,
      cooldownReason: null,
      createdAt: cleanString(job.metadata.createdAt, 120) || now,
    },
  });

  const warnings: string[] = [];
  let processedItems = 0;
  const duplicateMode = readDuplicateMode(job.metadata);
  const importOnlyMissingData = readImportOnlyMissingData(job.metadata);
  const items = await loadBatchItems(input.jobId);
  const pendingItems = items
    .filter((item) => item.rowStatus === "pending" || item.rowStatus === "validated")
    .slice(0, maxItemsPerRun);

  for (const item of pendingItems) {
    const cancelledReport = await maybeCancelBatchJob(input.jobId);
    if (cancelledReport) {
      return {
        processedItems,
        report: cancelledReport,
        warnings,
      };
    }

    const pausedReport = await maybeMarkBatchPaused(input.jobId);
    if (pausedReport) {
      return {
        processedItems,
        report: pausedReport,
        warnings,
      };
    }

    const claimedItem =
      item.rowStatus === "validated"
        ? await updateBatchItemRow(item, {
            rowStatus: "validated",
            actionTaken: "reprocessing_stale_item",
            normalizedRow: {
              ...item.normalizedRow,
              workerRestartedAt: new Date().toISOString(),
            },
          })
        : await updateBatchItemRow(item, {
            rowStatus: "validated",
            actionTaken: "processing",
            normalizedRow: {
              ...item.normalizedRow,
              workerStartedAt: new Date().toISOString(),
            },
          });

    const startedMs = Date.now();
    let pausedForCooldown = false;
    let cooldownWarning: string | null = null;

    try {
      if (claimedItem.bucketKey === "financial_statements") {
        await updateBatchItemRow(claimedItem, {
          rowStatus: "skipped",
          actionTaken: "skipped_blocked_module",
          normalizedRow: {
            ...claimedItem.normalizedRow,
            skippedReason: "financial_statements_manual_single_stock_only",
          },
        });
        await incrementBatchJobMetadataCounters(input.jobId, {
          savedRequestsAvoided: 1,
          skippedBlockedModuleCount: 1,
        });
        processedItems += 1;
        continue;
      }

      if (importOnlyMissingData && claimedItem.stockId) {
        const alreadyCurrent = await shouldSkipModuleForCoverage(claimedItem.stockId, claimedItem.bucketKey);
        if (alreadyCurrent) {
          await updateBatchItemRow(claimedItem, {
            rowStatus: "skipped",
            actionTaken: "skipped_current_coverage",
            normalizedRow: {
              ...claimedItem.normalizedRow,
              skippedReason: "coverage_current",
            },
          });
          await incrementBatchJobMetadataCounters(input.jobId, {
            savedRequestsAvoided: 1,
            existingDataReused: 1,
          });
          processedItems += 1;
        } else {
          const result = await runBatchModuleImport({
            item: claimedItem,
            duplicateMode,
            actorEmail,
            actorUserId,
            jobMetadata: job.metadata,
          });
          const summary = summarizeChildImport(claimedItem.bucketKey, result);
          await updateBatchItemRow(claimedItem, {
            rowStatus: summary.rowStatus,
            actionTaken: summary.actionTaken,
            rawRow: {
              yahooSymbol: claimedItem.sourceKey,
              childJobId: result.jobId,
            warnings: result.warnings,
          },
          normalizedRow: {
            ...claimedItem.normalizedRow,
            ...summary.normalizedRow,
          },
        });
          await incrementBatchJobMetadataCounters(input.jobId, {
            savedRequestsAvoided: numericOrZero((result as { savedRequestsAvoided?: number }).savedRequestsAvoided),
            existingDataReused: numericOrZero((result as { existingDataReused?: number }).existingDataReused),
            skippedExistingHistoryCount:
              claimedItem.bucketKey === "historical_prices"
                ? numericOrZero((result as { skippedRows?: number }).skippedRows)
                : 0,
            skippedExistingSnapshotCount:
              claimedItem.bucketKey === "quote_statistics" &&
              (result as { skippedExistingSnapshot?: boolean }).skippedExistingSnapshot
                ? 1
                : 0,
          });
          if (summary.rowStatus === "warning" && result.warnings.length) {
            warnings.push(
              `${claimedItem.symbol || claimedItem.sourceKey || claimedItem.itemKey} ${claimedItem.bucketKey}: ${result.warnings.join(" ")}`,
            );
          }
          job = await loadBatchJob(input.jobId);
          await updateBatchJobRow(job, {
            metadata: {
              consecutiveYahooFailures: 0,
              lastSuccessfulYahooModule: claimedItem.bucketKey,
              lastSuccessfulYahooSymbol:
                cleanString(claimedItem.sourceKey, 160) || cleanString(claimedItem.symbol, 160) || null,
              lastSuccessfulYahooAt: new Date().toISOString(),
            },
          });
          processedItems += 1;
        }
      } else {
        const result = await runBatchModuleImport({
          item: claimedItem,
          duplicateMode,
          actorEmail,
          actorUserId,
          jobMetadata: job.metadata,
        });
        const summary = summarizeChildImport(claimedItem.bucketKey, result);
        await updateBatchItemRow(claimedItem, {
          rowStatus: summary.rowStatus,
          actionTaken: summary.actionTaken,
          rawRow: {
            yahooSymbol: claimedItem.sourceKey,
            childJobId: result.jobId,
          warnings: result.warnings,
        },
        normalizedRow: {
          ...claimedItem.normalizedRow,
          ...summary.normalizedRow,
        },
      });
        await incrementBatchJobMetadataCounters(input.jobId, {
          savedRequestsAvoided: numericOrZero((result as { savedRequestsAvoided?: number }).savedRequestsAvoided),
          existingDataReused: numericOrZero((result as { existingDataReused?: number }).existingDataReused),
          skippedExistingHistoryCount:
            claimedItem.bucketKey === "historical_prices"
              ? numericOrZero((result as { skippedRows?: number }).skippedRows)
              : 0,
          skippedExistingSnapshotCount:
            claimedItem.bucketKey === "quote_statistics" &&
            (result as { skippedExistingSnapshot?: boolean }).skippedExistingSnapshot
              ? 1
              : 0,
        });
        if (summary.rowStatus === "warning" && result.warnings.length) {
          warnings.push(
            `${claimedItem.symbol || claimedItem.sourceKey || claimedItem.itemKey} ${claimedItem.bucketKey}: ${result.warnings.join(" ")}`,
          );
        }
        job = await loadBatchJob(input.jobId);
        await updateBatchJobRow(job, {
          metadata: {
            consecutiveYahooFailures: 0,
            lastSuccessfulYahooModule: claimedItem.bucketKey,
            lastSuccessfulYahooSymbol:
              cleanString(claimedItem.sourceKey, 160) || cleanString(claimedItem.symbol, 160) || null,
            lastSuccessfulYahooAt: new Date().toISOString(),
          },
        });
        processedItems += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Yahoo batch item failure.";
      await logYahooImportError({
        jobId: input.jobId,
        stock: buildBatchItemStockTarget(claimedItem),
        bucketKey: claimedItem.bucketKey,
        errorStage: "batch_worker",
        errorMessage: message,
        rawPayload: {
          batchItemId: claimedItem.id,
          batchJobId: input.jobId,
          sourceKey: claimedItem.sourceKey,
          targetKey: claimedItem.targetKey,
        },
        context: {
          actorEmail,
          duplicateMode,
          importOnlyMissingData,
          itemKey: claimedItem.itemKey,
          rowStatus: claimedItem.rowStatus,
          actionTaken: claimedItem.actionTaken,
        },
      });
      await updateBatchItemRow(claimedItem, {
        rowStatus: "failed",
        actionTaken: "batch_item_failed",
        rawRow: {
          yahooSymbol: claimedItem.sourceKey,
          error: message,
        },
        normalizedRow: {
          ...claimedItem.normalizedRow,
          error: message,
        },
      });
      warnings.push(
        `${claimedItem.symbol || claimedItem.sourceKey || claimedItem.itemKey} ${claimedItem.bucketKey} failed: ${message}`,
      );
      if (isYahooGuardrailError(error) || isLikelyYahooProviderFailureMessage(message)) {
        const cooldownResult = await recordYahooFailureAgainstBatch({
          jobId: input.jobId,
          item: claimedItem,
          message,
        });
        if (cooldownResult.didPauseForCooldown) {
          pausedForCooldown = true;
          cooldownWarning =
            `${cleanString(claimedItem.sourceKey || claimedItem.symbol || claimedItem.itemKey, 160)} triggered Yahoo cooldown after repeated failures. ` +
            `${cooldownResult.cooldownReason ?? "The batch was paused automatically."}`;
        }
      }
      processedItems += 1;
    } finally {
      job = await loadBatchJob(input.jobId);
      const durationMs = Date.now() - startedMs;
      const existingDurations = Array.isArray(job.metadata.processedItemDurationsMs)
        ? job.metadata.processedItemDurationsMs
            .map((itemValue) => numericOrZero(itemValue))
            .filter((value) => value > 0)
            .slice(-24)
        : [];
      const nextDurations = [...existingDurations, durationMs].slice(-24);
      job = await updateBatchJobRow(job, {
        metadata: {
          activeWorkerId: workerId,
          latestHeartbeatAt: new Date().toISOString(),
          processedDurationCount: numericOrZero(job.metadata.processedDurationCount) + 1,
          processedDurationTotalMs:
            numericOrZero(job.metadata.processedDurationTotalMs) + durationMs,
          processedItemDurationsMs: nextDurations,
        },
      });
    }

    if (pausedForCooldown) {
      if (cooldownWarning) {
        warnings.push(cooldownWarning);
      }
      return {
        processedItems,
        report: await getYahooStockBatchImportReport(input.jobId),
        warnings,
      };
    }

    const minimumRequestIntervalMs = readMinimumRequestIntervalMs(job.metadata);
    if (minimumRequestIntervalMs > 0) {
      const elapsedMs = Date.now() - startedMs;
      if (elapsedMs < minimumRequestIntervalMs) {
        await sleep(minimumRequestIntervalMs - elapsedMs);
      }
    }
  }

  const refreshedReport = await updateBatchProgressSnapshot(input.jobId);
  const refreshedJob = await loadBatchJob(input.jobId);
  const hasPendingItems = refreshedReport.pendingItems > 0;
  const hasFailedItems = refreshedReport.failedItems > 0;

  if (!hasPendingItems) {
    const nextTerminalStatus: "completed" | "completed_with_errors" | "failed" = hasFailedItems
      ? refreshedReport.completedStocks > 0 || refreshedReport.skippedStocks > 0
        ? "completed_with_errors"
        : "failed"
      : refreshedReport.warningItems > 0
        ? "completed_with_errors"
        : "completed";
    await updateBatchJobRow(refreshedJob, {
      status: nextTerminalStatus,
      completedAt: new Date().toISOString(),
      importedItems: refreshedReport.importedItems,
      updatedItems: refreshedReport.updatedItems,
      skippedItems: refreshedReport.skippedItems,
      failedItems: refreshedReport.failedItems,
      warningItems: refreshedReport.warningItems,
      metadata: {
        controlState: "active",
        activeWorkerId: null,
        latestHeartbeatAt: new Date().toISOString(),
        finalReport: refreshedReport.finalReport,
        finalSummary: `Processed ${refreshedReport.totalStocks} stock${refreshedReport.totalStocks === 1 ? "" : "s"} across ${refreshedReport.totalItems} module item${refreshedReport.totalItems === 1 ? "" : "s"}. Completed ${refreshedReport.completedStocks}, skipped ${refreshedReport.skippedStocks}, failed ${refreshedReport.failedStocks}.`,
        lastRunFinishedAt: new Date().toISOString(),
        consecutiveYahooFailures: 0,
      },
    });
  } else {
    await updateBatchJobRow(refreshedJob, {
      status: "queued",
      completedAt: null,
      importedItems: refreshedReport.importedItems,
      updatedItems: refreshedReport.updatedItems,
      skippedItems: refreshedReport.skippedItems,
      failedItems: refreshedReport.failedItems,
      warningItems: refreshedReport.warningItems,
      metadata: {
        controlState: "active",
        activeWorkerId: null,
        latestHeartbeatAt: new Date().toISOString(),
        progress: refreshedReport.finalReport,
        lastRunFinishedAt: new Date().toISOString(),
      },
    });
  }

  return {
    processedItems,
    report: await getYahooStockBatchImportReport(input.jobId),
    warnings,
  };
}

export async function runYahooStockBatchImportUntilComplete(
  input: YahooBatchWorkerRunInput,
) {
  ensureBatchImporterReady();
  const maxItemsPerRun = Math.max(1, Math.floor(input.maxItemsPerRun ?? getDefaultMaxItemsPerRun()));
  const warnings: string[] = [];
  let processedItems = 0;
  let report = await getYahooStockBatchImportReport(input.jobId);

  while (
    !["completed", "failed", "stopped", "paused", "cooling_down"].includes(report.status)
  ) {
    const outcome = await runYahooStockBatchImportWorker({
      ...input,
      maxItemsPerRun,
    });
    processedItems += outcome.processedItems;
    warnings.push(...outcome.warnings);
    const previousStatus = report.status;
    const previousPendingItems = report.pendingItems;
    report = outcome.report;
    if (
      outcome.processedItems === 0 &&
      report.pendingItems === previousPendingItems &&
      report.status === previousStatus
    ) {
      warnings.push(
        "Yahoo batch worker made no forward progress on this run. Use the current report to inspect pending items or retry the job if a stale state needs to be requeued.",
      );
      break;
    }
    if (report.status === "running" && report.pendingItems > 0) {
      await sleep(25);
      continue;
    }
  }

  return {
    processedItems,
    report,
    warnings,
  };
}
