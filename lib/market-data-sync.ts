import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  buildMarketDataImportCsvTextFromRows,
  executeMarketDataImport,
  runMarketDataIngestion,
  type ExecuteMarketDataImportResult,
  type MarketDataImportDuplicateMode,
  type MarketDataImportRow,
  type MarketDataImportPreview,
} from "@/lib/market-data-imports";
import {
  getMarketDataSourceById,
  getMarketDataSourceDefaultDuplicateMode,
  getMarketDataSourceDefaultExecutionMode,
  getMarketDataSourceImportType,
  listActiveMarketDataSources,
  updateMarketDataSourceSyncResult,
  type MarketDataSourceRecord,
} from "@/lib/market-data-source-registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type MarketDataSyncResult = {
  source: MarketDataSourceRecord;
  outcome: "completed" | "completed_with_errors" | "no_new_rows" | "failed";
  latestStoredDateBeforeSync: string | null;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  latestImportedDate: string | null;
  batch: ExecuteMarketDataImportResult["batch"] | null;
  rows: ExecuteMarketDataImportResult["rows"];
  affectedRoutes: string[];
  affectedAssets: string[];
  warnings: string[];
  persistenceWarnings: string[];
};

export type MarketDataSourcePreviewSnapshot = {
  source: MarketDataSourceRecord;
  preview: MarketDataImportPreview;
  latestStoredDate: string | null;
  latestSourceDate: string | null;
  latestStoredValue: number | null;
  latestSourceValue: number | null;
  rowsAvailable: number;
  rowsThatWillImport: number;
  futureDatedRows: number;
  sourceRows: MarketDataImportRow[];
  warnings: string[];
};

type RunMarketDataSyncOptions = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  allowPaused?: boolean;
  duplicateMode?: MarketDataImportDuplicateMode;
  persistSourceState?: boolean;
};

const MARKET_DATA_SYNC_COOLDOWN_MS = 30_000;
const MARKET_DATA_SYNC_RETRY_BASE_MS = 60_000;
const MARKET_DATA_SYNC_MAX_RETRIES = 5;
const MARKET_DATA_SOURCE_PREVIEW_TIMEOUT_MS = 45_000;

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function numericOrZero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoString(value: unknown) {
  const normalized = cleanString(value, 120);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toFutureIso(msFromNow: number) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }, timeoutMs);
    }),
  ]);
}

function getRetryDelayMs(retryCount: number) {
  const boundedCount = Math.max(1, Math.min(MARKET_DATA_SYNC_MAX_RETRIES, retryCount));
  return Math.min(
    MARKET_DATA_SYNC_RETRY_BASE_MS * 2 ** (boundedCount - 1),
    30 * 60 * 1000,
  );
}

function getSourceMaxRetries(source: Pick<MarketDataSourceRecord, "sourceType">) {
  return source.sourceType === "yahoo_finance" ? 1 : MARKET_DATA_SYNC_MAX_RETRIES;
}

function createFailedSyncResult(input: {
  source: MarketDataSourceRecord;
  latestStoredDateBeforeSync?: string | null;
  warning?: string | null;
}) {
  return {
    source: input.source,
    outcome: "failed" as const,
    latestStoredDateBeforeSync: input.latestStoredDateBeforeSync ?? null,
    importedRows: 0,
    skippedRows: 0,
    failedRows: 0,
    latestImportedDate: null,
    batch: null,
    rows: [],
    affectedRoutes: [],
    affectedAssets: [],
    warnings: input.warning ? [input.warning] : [],
    persistenceWarnings: [],
  };
}

function resolveActorLabel(options: RunMarketDataSyncOptions) {
  return cleanString(options.actorEmail, 240) || "System";
}

function inferSourceLabel(source: MarketDataSourceRecord) {
  const explicit = cleanString(source.metadata.sourceLabel, 240);
  if (explicit) {
    return explicit;
  }

  return `${source.sourceType}_${source.id}`;
}

function inferFileName(source: MarketDataSourceRecord) {
  const explicit = cleanString(source.metadata.fileName, 240);
  if (explicit) {
    return explicit;
  }

  return `${source.sourceType}-${source.id}.csv`;
}

function inferSourceDisplayName(source: MarketDataSourceRecord) {
  return (
    cleanString(source.metadata.source_name, 240) ||
    cleanString(source.metadata.mapped_display_name, 240) ||
    cleanString(source.assetSlug, 240)
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") ||
    cleanString(source.benchmarkSlug, 240).toUpperCase() ||
    cleanString(source.symbol, 240) ||
    cleanString(source.schemeCode, 240) ||
    source.id
  );
}

function sourceTypeLabel(sourceType: MarketDataSourceRecord["sourceType"]) {
  if (sourceType === "google_sheet") {
    return "Google Sheet";
  }
  if (sourceType === "yahoo_finance") {
    return "Yahoo Finance";
  }
  return "Provider API";
}

function getPreviewRowValue(
  row: Pick<MarketDataImportRow, "payload">,
  importType: ReturnType<typeof getMarketDataSourceImportType>,
) {
  const rawValue = importType === "fund_nav" ? row.payload.nav : row.payload.close;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function countFutureRows(rows: Array<Pick<MarketDataImportRow, "importDate" | "status">>) {
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => row.status !== "failed" && cleanString(row.importDate, 120) > today)
    .length;
}

async function getLatestStoredValueForSource(source: MarketDataSourceRecord) {
  const importType = getMarketDataSourceImportType(source);
  const supabase = createSupabaseAdminClient();

  if (importType === "stock_ohlcv") {
    const slug = cleanString(source.assetSlug, 160);
    if (!slug) {
      return null;
    }

    const { data, error } = await supabase
      .from("stock_ohlcv_history")
      .select("close")
      .eq("slug", slug)
      .eq("timeframe", source.timeframe)
      .order("bar_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load latest stored stock close. ${error.message}`);
    }

    return numericOrZero(data?.close) || null;
  }

  if (importType === "benchmark_ohlcv") {
    const benchmarkSlug = cleanString(source.benchmarkSlug, 160);
    if (!benchmarkSlug) {
      return null;
    }

    const { data, error } = await supabase
      .from("benchmark_ohlcv_history")
      .select("close")
      .eq("index_slug", benchmarkSlug)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load latest stored benchmark close. ${error.message}`);
    }

    return numericOrZero(data?.close) || null;
  }

  const slug = cleanString(source.assetSlug, 160);
  if (!slug) {
    return null;
  }

  const { data, error } = await supabase
    .from("fund_nav_history")
    .select("nav")
    .eq("slug", slug)
    .order("nav_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load latest stored fund NAV. ${error.message}`);
  }

  return numericOrZero(data?.nav) || null;
}

function createSourceHealthWarnings(
  source: MarketDataSourceRecord,
  preview: MarketDataImportPreview,
  latestStoredDate: string | null,
  rowsThatWillImport: number,
) {
  const warnings: string[] = [];
  const latestSourceDate =
    [...new Set(preview.rows.map((row) => cleanString(row.importDate, 120)).filter(Boolean))]
      .sort((left, right) => right.localeCompare(left))[0] ?? null;
  const futureDatedRows = countFutureRows(preview.rows);

  if (latestStoredDate && latestSourceDate && latestSourceDate < latestStoredDate) {
    warnings.push(
      `Source latest date ${latestSourceDate} is older than the latest stored DB date ${latestStoredDate}.`,
    );
  }

  if (futureDatedRows > 0) {
    warnings.push(
      `${futureDatedRows} source row(s) are future-dated. Treat this source as test data or verify it carefully before production sync.`,
    );
  }

  if (rowsThatWillImport === 0 && latestStoredDate) {
    warnings.push(`No rows are newer than the latest stored date ${latestStoredDate}.`);
  }

  return {
    latestSourceDate,
    futureDatedRows,
    warnings: Array.from(new Set(warnings)),
  };
}

function createSyncSummary(input: {
  source: MarketDataSourceRecord;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  latestImportedDate: string | null;
  outcome: MarketDataSyncResult["outcome"];
}) {
  const sourceName = inferSourceDisplayName(input.source);
  const sourceLabel = sourceTypeLabel(input.source.sourceType);

  if (input.outcome === "no_new_rows") {
    return `Checked ${sourceName} from ${sourceLabel}. No new rows were available after ${input.latestImportedDate || "the latest stored date"}.`;
  }

  if (input.outcome === "completed_with_errors") {
    return `Synced ${sourceName} from ${sourceLabel}. Imported ${input.importedRows} row${input.importedRows === 1 ? "" : "s"}, skipped ${input.skippedRows}, and ${input.failedRows} failed. Latest date: ${input.latestImportedDate || "unknown"}.`;
  }

  return `Synced ${sourceName} from ${sourceLabel}. Imported ${input.importedRows} new row${input.importedRows === 1 ? "" : "s"}. Latest date: ${input.latestImportedDate || "unknown"}.`;
}

async function appendSyncActivity(
  source: MarketDataSourceRecord,
  options: RunMarketDataSyncOptions,
  actionType: string,
  summary: string,
  metadata: Record<string, unknown>,
) {
  await appendAdminActivityLog({
    actorUserId: options.actorUserId ?? null,
    actorEmail: resolveActorLabel(options),
    actionType,
    targetType: "market_data_source",
    targetId: source.id,
    targetFamily: getMarketDataSourceImportType(source),
    targetSlug:
      source.assetSlug || source.benchmarkSlug || cleanString(source.schemeCode, 160) || null,
    summary,
    metadata: {
      sourceId: source.id,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      assetSlug: source.assetSlug,
      symbol: source.symbol,
      benchmarkSlug: source.benchmarkSlug,
      schemeCode: source.schemeCode,
      timeframe: source.timeframe,
      ...metadata,
    },
  });
}

async function getLatestStoredDateForSource(source: MarketDataSourceRecord) {
  const importType = getMarketDataSourceImportType(source);
  const supabase = createSupabaseAdminClient();

  if (importType === "stock_ohlcv") {
    const slug = cleanString(source.assetSlug, 160);
    if (!slug) {
      throw new Error("Stock sync sources need asset_slug.");
    }

    const { data, error } = await supabase
      .from("stock_ohlcv_history")
      .select("bar_time")
      .eq("slug", slug)
      .eq("timeframe", source.timeframe)
      .order("bar_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load latest stored stock date. ${error.message}`);
    }

    return cleanString(data?.bar_time, 120).slice(0, 10) || null;
  }

  if (importType === "benchmark_ohlcv") {
    const benchmarkSlug = cleanString(source.benchmarkSlug, 160);
    if (!benchmarkSlug) {
      throw new Error("Benchmark sync sources need benchmark_slug.");
    }

    const { data, error } = await supabase
      .from("benchmark_ohlcv_history")
      .select("date")
      .eq("index_slug", benchmarkSlug)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load latest stored benchmark date. ${error.message}`);
    }

    return cleanString(data?.date, 120).slice(0, 10) || null;
  }

  const slug = cleanString(source.assetSlug, 160);
  if (!slug) {
    throw new Error("Fund sync sources need asset_slug.");
  }

  const { data, error } = await supabase
    .from("fund_nav_history")
    .select("nav_date")
    .eq("slug", slug)
    .order("nav_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load latest stored fund date. ${error.message}`);
  }

  return cleanString(data?.nav_date, 120).slice(0, 10) || null;
}

async function previewSourceData(source: MarketDataSourceRecord) {
  const importType = getMarketDataSourceImportType(source);
  const executionMode = getMarketDataSourceDefaultExecutionMode(source);
  const duplicateMode = getMarketDataSourceDefaultDuplicateMode(source);

  if (source.sourceType === "google_sheet") {
    return (await runMarketDataIngestion("google_sheet", {
      mode: "preview",
      type: importType,
      googleSheetUrl: source.sourceUrl,
      executionMode,
      duplicateMode,
      fileName: inferFileName(source),
      sourceLabel: inferSourceLabel(source),
      sourceUrl: source.sourceUrl,
    })) as MarketDataImportPreview;
  }

  if (source.sourceType === "yahoo_finance") {
    const yahooSymbol = cleanString(source.symbol, 160);
    if (!yahooSymbol) {
      throw new Error("Yahoo Finance sync sources need a symbol like RELIANCE.NS.");
    }

    return (await runMarketDataIngestion("yahoo_finance", {
      mode: "preview",
      type: "stock_ohlcv",
      yahooSymbol,
      executionMode,
      duplicateMode,
      fileName: inferFileName(source),
      sourceLabel: inferSourceLabel(source),
      sourceUrl: source.sourceUrl,
    })) as MarketDataImportPreview;
  }

  return (await runMarketDataIngestion("provider_api", {
    mode: "preview",
    type: importType,
    sourceUrl: source.sourceUrl,
    executionMode,
    duplicateMode,
    fileName: inferFileName(source),
    sourceLabel: inferSourceLabel(source),
  })) as MarketDataImportPreview;
}

export async function previewMarketDataSourceSnapshot(
  sourceOrId: string | MarketDataSourceRecord,
  limit = 10,
) {
  const source =
    typeof sourceOrId === "string" ? await getMarketDataSourceById(sourceOrId) : sourceOrId;
  if (!source) {
    throw new Error("Market-data source not found.");
  }

  const [preview, latestStoredDate, latestStoredValue] = await Promise.all([
    withTimeout(
      previewSourceData(source),
      MARKET_DATA_SOURCE_PREVIEW_TIMEOUT_MS,
      `${source.sourceType} source preview`,
    ),
    getLatestStoredDateForSource(source),
    getLatestStoredValueForSource(source),
  ]);

  const importableRows = preview.rows.filter((row) => row.status !== "failed");
  const rowsThatWillImport = filterRowsForIncrementalSync(preview, latestStoredDate).length;
  const { latestSourceDate, futureDatedRows, warnings } = createSourceHealthWarnings(
    source,
    preview,
    latestStoredDate,
    rowsThatWillImport,
  );
  const sortedRows = [...importableRows].sort((left, right) =>
    cleanString(right.importDate, 120).localeCompare(cleanString(left.importDate, 120)),
  );
  const latestSourceValue = sortedRows.length
    ? getPreviewRowValue(sortedRows[0], getMarketDataSourceImportType(source))
    : null;

  return {
    source,
    preview,
    latestStoredDate,
    latestSourceDate,
    latestStoredValue,
    latestSourceValue,
    rowsAvailable: importableRows.length,
    rowsThatWillImport,
    futureDatedRows,
    sourceRows: sortedRows.slice(0, Math.max(1, Math.min(20, limit))),
    warnings,
  } satisfies MarketDataSourcePreviewSnapshot;
}

function filterRowsForIncrementalSync(
  preview: MarketDataImportPreview,
  latestStoredDate: string | null,
) {
  const importableRows = preview.rows.filter((row) => row.status !== "failed");

  if (!latestStoredDate) {
    return importableRows;
  }

  return importableRows.filter((row) => {
    const importDate = cleanString(row.importDate, 120);
    return importDate && importDate > latestStoredDate;
  });
}

function sortDatesDescending(values: string[]) {
  return [...values].sort((left, right) => right.localeCompare(left));
}

function assertSourceSyncCanRun(source: MarketDataSourceRecord) {
  const now = Date.now();
  const lastStartedAt = toIsoString(source.metadata.last_sync_started_at);
  const nextRetryAt = toIsoString(source.metadata.next_retry_at);
  const syncInFlight = source.metadata.last_sync_in_flight === true;

  if (syncInFlight && lastStartedAt) {
    const startedAtMs = new Date(lastStartedAt).getTime();
    if (now - startedAtMs < MARKET_DATA_SYNC_COOLDOWN_MS) {
      throw new Error(
        "This source was synced very recently and is still inside the sync cooldown window. Please wait a moment before trying again.",
      );
    }
  }

  if (nextRetryAt) {
    const nextRetryMs = new Date(nextRetryAt).getTime();
    if (nextRetryMs > now) {
      throw new Error(
        `This source is in retry backoff until ${new Date(nextRetryMs).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })}.`,
      );
    }
  }
}

export async function runMarketDataSync(
  sourceId: string,
  options: RunMarketDataSyncOptions = {},
): Promise<MarketDataSyncResult> {
  const source = await getMarketDataSourceById(sourceId);
  if (!source) {
    throw new Error("Market-data source not found.");
  }

  if (source.syncStatus === "paused" && !options.allowPaused) {
    throw new Error("This market-data source is paused.");
  }

  return runMarketDataSyncForSource(source, options);
}

export async function runMarketDataSyncForSource(
  source: MarketDataSourceRecord,
  options: RunMarketDataSyncOptions = {},
): Promise<MarketDataSyncResult> {
  if (source.syncStatus === "paused" && !options.allowPaused) {
    throw new Error("This market-data source is paused.");
  }

  const importType = getMarketDataSourceImportType(source);
  const duplicateMode =
    options.duplicateMode ?? getMarketDataSourceDefaultDuplicateMode(source);
  const actorEmail = resolveActorLabel(options);
  const persistSourceState = options.persistSourceState !== false;
  const syncStartedAt = new Date().toISOString();
  const startupPersistenceWarnings: string[] = [];
  let workingSource = source;

  assertSourceSyncCanRun(source);

  if (persistSourceState) {
    try {
      workingSource = await updateMarketDataSourceSyncResult({
        id: source.id,
        syncStatus: source.syncStatus === "error" ? "active" : source.syncStatus,
        metadataPatch: {
          last_sync_started_at: syncStartedAt,
          last_sync_in_flight: true,
        },
      });
    } catch (error) {
      startupPersistenceWarnings.push(
        `Source registry warning: ${
          error instanceof Error
            ? error.message
            : "Could not persist the sync-start marker before running this source."
        }`,
      );
    }
  } else {
    workingSource = {
      ...source,
      metadata: {
        ...source.metadata,
        last_sync_started_at: syncStartedAt,
        last_sync_in_flight: true,
      },
    };
  }

  try {
    await appendSyncActivity(
      workingSource,
      options,
      "market_data.sync_started",
      `Started ${sourceTypeLabel(workingSource.sourceType)} sync for ${inferSourceDisplayName(workingSource)}.`,
      {
        duplicateMode,
      },
    );
  } catch (error) {
    startupPersistenceWarnings.push(
      `Activity log warning: ${
        error instanceof Error
          ? error.message
          : "Could not append the sync-start activity log."
      }`,
    );
  }

  try {
    const [preview, latestStoredDate] = await Promise.all([
      withTimeout(
        previewSourceData(workingSource),
        MARKET_DATA_SOURCE_PREVIEW_TIMEOUT_MS,
        `${workingSource.sourceType} source preview`,
      ),
      getLatestStoredDateForSource(workingSource),
    ]);

    const incrementalRows = filterRowsForIncrementalSync(preview, latestStoredDate);
    const previewHealth = createSourceHealthWarnings(
      workingSource,
      preview,
      latestStoredDate,
      incrementalRows.length,
    );
    if (!incrementalRows.length) {
      const syncedAt = new Date().toISOString();
      const noNewRowsSummary = createSyncSummary({
        source: workingSource,
        importedRows: 0,
        skippedRows: 0,
        failedRows: 0,
        latestImportedDate: latestStoredDate,
        outcome: "no_new_rows",
      });
      const updatedSource = persistSourceState
        ? await updateMarketDataSourceSyncResult({
            id: workingSource.id,
            syncStatus: "active",
            lastSyncedAt: syncedAt,
            lastSyncedDate: latestStoredDate,
            metadataPatch: {
              last_sync_error: null,
              last_provider_error: null,
              last_sync_message: noNewRowsSummary,
              last_sync_outcome: "no_new_rows",
              last_sync_finished_at: syncedAt,
              last_sync_in_flight: false,
              last_rows_imported: 0,
              last_rows_skipped: 0,
              last_rows_failed: 0,
              source_health: "no_new_rows",
              retry_count: 0,
              next_retry_at: null,
              last_sync_warning_summary: previewHealth.warnings.join(" "),
            },
          })
        : {
            ...workingSource,
            syncStatus: "active" as const,
            lastSyncedAt: syncedAt,
            lastSyncedDate: latestStoredDate,
            metadata: {
              ...workingSource.metadata,
              last_sync_error: null,
              last_provider_error: null,
              last_sync_message: noNewRowsSummary,
              last_sync_outcome: "no_new_rows",
              last_sync_finished_at: syncedAt,
              last_sync_in_flight: false,
              last_rows_imported: 0,
              last_rows_skipped: 0,
              last_rows_failed: 0,
              source_health: "no_new_rows",
              retry_count: 0,
              next_retry_at: null,
              last_sync_warning_summary: previewHealth.warnings.join(" "),
            },
          };

      const result: MarketDataSyncResult = {
        source: updatedSource,
        outcome: "no_new_rows",
        latestStoredDateBeforeSync: latestStoredDate,
        importedRows: 0,
        skippedRows: 0,
        failedRows: 0,
        latestImportedDate: latestStoredDate,
        batch: null,
        rows: [],
        affectedRoutes: [],
        affectedAssets: [],
        warnings: previewHealth.warnings,
        persistenceWarnings: startupPersistenceWarnings,
      };

      try {
        await appendSyncActivity(
          updatedSource,
          options,
          "market_data.sync_completed",
          createSyncSummary({
            source: updatedSource,
            importedRows: 0,
            skippedRows: 0,
            failedRows: 0,
            latestImportedDate: latestStoredDate,
            outcome: result.outcome,
          }),
          {
            outcome: result.outcome,
            latestStoredDateBeforeSync: latestStoredDate,
            importedRows: 0,
            skippedRows: 0,
            failedRows: 0,
            warnings: result.warnings,
          },
        );
      } catch (error) {
        result.persistenceWarnings.push(
          `Activity log warning: ${
            error instanceof Error
              ? error.message
              : "Could not append the sync-completed activity log."
          }`,
        );
      }

      return result;
    }

    const csvText = buildMarketDataImportCsvTextFromRows(importType, incrementalRows);
    const executeResult = await executeMarketDataImport({
      type: importType,
      csvText,
      fileName: inferFileName(workingSource),
      executionMode: "import_valid_rows",
      duplicateMode,
      sourceType: workingSource.sourceType,
      sourceLabel: inferSourceLabel(workingSource),
      sourceUrl: workingSource.sourceUrl,
      actorUserId: options.actorUserId ?? null,
      actorEmail,
    });

    const latestImportedDate =
      sortDatesDescending(
        executeResult.rows
          .map((row) => cleanString(row.importDate, 120))
          .filter(Boolean),
      )[0] ?? latestStoredDate;
    const importedRows = executeResult.rows.filter((row) => row.status === "imported").length;
    const skippedRows = executeResult.rows.filter((row) => row.status === "skipped").length;
    const failedRows = executeResult.rows.filter((row) => row.status === "failed").length;
    const outcome =
      executeResult.batch.status === "failed"
        ? "failed"
        : failedRows > 0
          ? "completed_with_errors"
          : "completed";

    const updatedSource = persistSourceState
      ? await updateMarketDataSourceSyncResult({
          id: workingSource.id,
          syncStatus: outcome === "failed" ? "error" : "active",
          lastSyncedAt: new Date().toISOString(),
          lastSyncedDate: latestImportedDate,
          metadataPatch: {
            last_sync_error: null,
            last_provider_error: null,
            last_sync_message: createSyncSummary({
              source: workingSource,
              importedRows,
              skippedRows,
              failedRows,
              latestImportedDate,
              outcome,
            }),
            last_sync_outcome: outcome,
            last_batch_id: executeResult.batch.id,
            last_sync_finished_at: new Date().toISOString(),
            last_sync_in_flight: false,
            last_rows_imported: importedRows,
            last_rows_skipped: skippedRows,
            last_rows_failed: failedRows,
            source_health: outcome === "completed_with_errors" ? "error" : "healthy",
            retry_count: 0,
            next_retry_at: null,
            last_sync_warning_summary: [...previewHealth.warnings, ...executeResult.warnings].join(
              " ",
            ),
          },
        })
      : {
          ...workingSource,
          syncStatus: outcome === "failed" ? ("error" as const) : ("active" as const),
          lastSyncedAt: new Date().toISOString(),
          lastSyncedDate: latestImportedDate,
          metadata: {
            ...workingSource.metadata,
            last_sync_error: null,
            last_provider_error: null,
            last_sync_message: createSyncSummary({
              source: workingSource,
              importedRows,
              skippedRows,
              failedRows,
              latestImportedDate,
              outcome,
            }),
            last_sync_outcome: outcome,
            last_batch_id: executeResult.batch.id,
            last_sync_finished_at: new Date().toISOString(),
            last_sync_in_flight: false,
            last_rows_imported: importedRows,
            last_rows_skipped: skippedRows,
            last_rows_failed: failedRows,
            source_health: outcome === "completed_with_errors" ? "error" : "healthy",
            retry_count: 0,
            next_retry_at: null,
            last_sync_warning_summary: [...previewHealth.warnings, ...executeResult.warnings].join(
              " ",
            ),
          },
        };

    const result: MarketDataSyncResult = {
      source: updatedSource,
      outcome,
      latestStoredDateBeforeSync: latestStoredDate,
      importedRows,
      skippedRows,
      failedRows,
      latestImportedDate,
      batch: executeResult.batch,
      rows: executeResult.rows,
      affectedRoutes: executeResult.affectedRoutes,
      affectedAssets: executeResult.affectedAssets,
        warnings: [...previewHealth.warnings, ...executeResult.warnings],
        persistenceWarnings: [
          ...startupPersistenceWarnings,
          ...executeResult.persistenceWarnings,
        ],
      };

    try {
      await appendSyncActivity(
        updatedSource,
        options,
        "market_data.sync_completed",
        createSyncSummary({
          source: updatedSource,
          importedRows,
          skippedRows,
          failedRows,
          latestImportedDate,
          outcome,
        }),
        {
          outcome,
          latestStoredDateBeforeSync: latestStoredDate,
          latestImportedDate,
          importedRows,
          skippedRows,
          failedRows,
          batchId: executeResult.batch.id,
          warnings: result.warnings,
          persistenceWarnings: result.persistenceWarnings,
        },
      );
    } catch (error) {
      result.persistenceWarnings.push(
        `Activity log warning: ${
          error instanceof Error
            ? error.message
            : "Could not append the sync-completed activity log."
        }`,
      );
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync failure.";
    const retryCount = Math.min(
      getSourceMaxRetries(workingSource),
      numericOrZero(workingSource.metadata.retry_count) + 1,
    );
    const nextRetryAt = toFutureIso(getRetryDelayMs(retryCount));
    const updatedSource = persistSourceState
      ? await updateMarketDataSourceSyncResult({
          id: workingSource.id,
          syncStatus: "error",
          metadataPatch: {
            last_sync_error: message,
            last_provider_error: message,
            last_sync_outcome: "failed",
            last_sync_finished_at: new Date().toISOString(),
            last_sync_in_flight: false,
            source_health: "error",
            last_rows_imported: 0,
            last_rows_skipped: 0,
            last_rows_failed: 0,
            retry_count: retryCount,
            next_retry_at: nextRetryAt,
          },
        }).catch(() => workingSource)
      : {
          ...workingSource,
          syncStatus: "error" as const,
          metadata: {
            ...workingSource.metadata,
            last_sync_error: message,
            last_provider_error: message,
            last_sync_outcome: "failed",
            last_sync_finished_at: new Date().toISOString(),
            last_sync_in_flight: false,
            source_health: "error",
            last_rows_imported: 0,
            last_rows_skipped: 0,
            last_rows_failed: 0,
            retry_count: retryCount,
            next_retry_at: nextRetryAt,
          },
        };

    await appendSyncActivity(
      updatedSource,
      options,
      "market_data.sync_failed",
      `Failed ${sourceTypeLabel(workingSource.sourceType)} sync for ${inferSourceDisplayName(
        workingSource,
      )}. ${message}`,
      {
        error: message,
        retryCount,
        nextRetryAt,
      },
    ).catch(() => undefined);

    throw error;
  }
}

export async function runAllActiveMarketDataSyncs(
  options: RunMarketDataSyncOptions = {},
) {
  const sources = await listActiveMarketDataSources();
  const results: MarketDataSyncResult[] = [];

  for (const source of sources) {
    try {
      results.push(
        await runMarketDataSync(source.id, {
          ...options,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync failure.";
      const refreshedSource =
        (await getMarketDataSourceById(source.id).catch(() => source)) ?? source;
      results.push(
        createFailedSyncResult({
          source: refreshedSource,
          warning: message,
        }),
      );
    }
  }

  return results;
}
