import type { CandlePoint } from "@/lib/advanced-chart-data";
import { ensureTrackedIndexFoundationData } from "@/lib/index-tracker-foundation";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/admin";

export type MarketSeriesType =
  | "stock_quote"
  | "stock_ohlcv"
  | "benchmark_ohlcv"
  | "fund_nav"
  | "index_snapshot";
export type MarketIngestMode =
  | "provider_sync"
  | "refresh_pipeline"
  | "admin_source_entry"
  | "manual_entry";

const MARKET_DATA_DURABILITY_MIGRATION = "db/migrations/0011_market_data_durability.sql";
const MIGRATION_0011_TABLES = new Set([
  "market_refresh_runs",
  "market_series_status",
  "stock_quote_history",
  "stock_ohlcv_history",
  "fund_nav_history",
]);

type StartMarketRefreshRunInput = {
  seriesType: MarketSeriesType;
  assetSlug: string;
  timeframe?: string;
  triggerSource: string;
  sourceLabel: string;
  sourceCode?: string | null;
  ingestMode: MarketIngestMode;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

type FinishMarketRefreshRunInput = {
  recordsWritten: number;
  recordsRetained: number;
  latestPointAt?: string | null;
  metadata?: Record<string, unknown>;
};

type UpdateSeriesStatusInput = {
  seriesType: MarketSeriesType;
  assetSlug: string;
  timeframe?: string;
  sourceLabel: string;
  sourceCode?: string | null;
  ingestMode: MarketIngestMode;
  refreshStatus: "live" | "failed";
  lastRefreshRunId: string;
  lastSuccessfulRunId?: string | null;
  latestPointAt?: string | null;
  coverageStart?: string | null;
  coverageEnd?: string | null;
  recordsRetained: number;
  latestValue?: number | null;
  latestChangePercent?: number | null;
  metadata?: Record<string, unknown>;
};

export type DurableStockQuoteSnapshot = {
  slug: string;
  source: string;
  sourceCode: string | null;
  ingestMode: MarketIngestMode;
  lastUpdated: string;
  price: number;
  changePercent: number;
};

export type DurableFundNavSnapshot = {
  slug: string;
  source: string;
  sourceCode: string | null;
  ingestMode: MarketIngestMode;
  lastUpdated: string;
  nav: number;
  returns1Y: number | null;
};

export class DurableMarketDataReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DurableMarketDataReadError";
  }
}

export type DurableStockChartSeries = {
  slug: string;
  source: string;
  sourceCode: string | null;
  ingestMode: MarketIngestMode;
  timeframe: string;
  lastUpdated: string;
  bars: CandlePoint[];
};

export type DurableMarketHistoryTelemetry = {
  stockHistory: {
    retainedSeries: number;
    verifiedSeries: number;
    previewSeries: number;
  };
  indexHistory: {
    retainedSeries: number;
    verifiedSeries: number;
    previewSeries: number;
  };
  fundHistory: {
    retainedSeries: number;
    verifiedSeries: number;
    previewSeries: number;
  };
};

const DURABLE_MARKET_READ_CACHE_TTL_MS = 30_000;

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const durableStockQuoteSnapshotCache = new Map<string, TimedCacheEntry<DurableStockQuoteSnapshot | null>>();
const durableFundNavSnapshotCache = new Map<string, TimedCacheEntry<DurableFundNavSnapshot | null>>();

export type DurableStockQuoteBatchResult = {
  snapshots: Map<string, DurableStockQuoteSnapshot>;
  readFailures: Map<string, DurableMarketDataReadError>;
};

export type DurableFundNavBatchResult = {
  snapshots: Map<string, DurableFundNavSnapshot>;
  readFailures: Map<string, DurableMarketDataReadError>;
};

function readTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string) {
  const cached = cache.get(key);

  if (!cached) {
    return { hit: false as const, value: null };
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return { hit: false as const, value: null };
  }

  return { hit: true as const, value: cached.value };
}

function writeTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + DURABLE_MARKET_READ_CACHE_TTL_MS,
  });
}

function normalizeDurableAssetSlugs(slugs: readonly string[]) {
  return [...new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean))];
}

type PersistStockQuoteInput = {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  price: number;
  changePercent: number;
  quotedAt: string;
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

type PersistStockChartInput = {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  timeframe?: string;
  bars: Array<CandlePoint & { volume?: number | null }>;
  lastUpdated: string;
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

type PersistFundNavInput = {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  nav: number;
  returns1Y?: number | null;
  navDate: string;
  lastUpdated: string;
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

type PersistFundNavEntry = {
  navDate: string;
  nav: number;
  returns1Y?: number | null;
};

type PersistFundNavSeriesInput = {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  entries: PersistFundNavEntry[];
  lastUpdated: string;
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

type PersistBenchmarkChartInput = {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  timeframe?: string;
  bars: Array<CandlePoint & { volume?: number | null }>;
  lastUpdated: string;
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

type PersistIndexComponentInput = {
  symbol: string;
  name: string;
  weight: number;
  changePercent: number;
  contribution: number;
  signal?: string | null;
};

type PersistIndexSnapshotInput = {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  snapshotAt: string;
  sessionPhase?: string | null;
  movePercent: number;
  weightedBreadthScore: number;
  advancingCount: number;
  decliningCount: number;
  positiveWeightShare: number;
  negativeWeightShare: number;
  marketMood?: string | null;
  dominanceLabel?: string | null;
  trendLabel?: string | null;
  components: PersistIndexComponentInput[];
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

function ensureAdminMarketDataReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are required for durable market-data writes.");
  }
}

async function createSupabaseMarketReadClient() {
  if (hasRuntimeSupabaseAdminEnv()) {
    return createSupabaseAdminClient();
  }

  return createSupabaseReadClient();
}

function isMissingSupabaseTableError(error: unknown, table: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return (
    candidate.code === "PGRST205" ||
    message.includes(`public.${table}`) ||
    message.includes(`table "${table}"`) ||
    message.includes(`relation "${table}"`) ||
    message.includes(table)
  );
}

function buildMissingSupabaseTableError(table: string, error: unknown) {
  const candidate = error as { message?: string } | null;
  const originalMessage = candidate?.message ?? "Unknown schema error.";
  const migrationHint = MIGRATION_0011_TABLES.has(table)
    ? ` Apply ${MARKET_DATA_DURABILITY_MIGRATION} to the real Supabase project and retry.`
    : "";

  return new Error(
    `Supabase is missing required table "${table}" in the real project schema.${migrationHint} Original error: ${originalMessage}`,
  );
}

function wrapSupabaseTableError(table: string, fallback: string, error: unknown) {
  if (isMissingSupabaseTableError(error, table)) {
    return buildMissingSupabaseTableError(table, error);
  }

  const candidate = error as { message?: string } | null;
  return new Error(`${fallback}: ${candidate?.message ?? "Unknown error"}`);
}

function normalizeTimeframe(value?: string | null) {
  return value?.trim().toUpperCase() || "SPOT";
}

function normalizeTimestamp(value: string | null | undefined, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const candidate = value.trim();
  if (!candidate) return fallback;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function normalizeDate(value: string | null | undefined, fallback = new Date().toISOString()) {
  if (!value) return fallback.slice(0, 10);
  const candidate = value.trim();
  if (!candidate) return fallback.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return fallback.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function coerceText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function isManualIngestMode(value: string | null | undefined) {
  return value === "admin_source_entry" || value === "manual_entry";
}

function buildDurableReadError(message: string, error?: unknown) {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown read failure.";

  return new DurableMarketDataReadError(`${message} ${detail}`.trim());
}

async function startMarketRefreshRun(input: StartMarketRefreshRunInput) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("market_refresh_runs")
    .insert({
      series_type: input.seriesType,
      asset_slug: input.assetSlug,
      timeframe: normalizeTimeframe(input.timeframe),
      trigger_source: input.triggerSource,
      source_label: input.sourceLabel,
      source_code: input.sourceCode ?? null,
      ingest_mode: input.ingestMode,
      requested_by: input.requestedBy ?? null,
      task_identifier: input.taskIdentifier ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw wrapSupabaseTableError(
      "market_refresh_runs",
      "Failed to start market refresh run",
      error,
    );
  }

  return data.id as string;
}

async function finishMarketRefreshRun(runId: string, input: FinishMarketRefreshRunInput) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const finishedAt = new Date().toISOString();
  const { error } = await supabase
    .from("market_refresh_runs")
    .update({
      run_status: "succeeded",
      finished_at: finishedAt,
      records_written: input.recordsWritten,
      records_retained: input.recordsRetained,
      latest_point_at: input.latestPointAt ?? null,
      metadata: input.metadata ?? {},
    })
    .eq("id", runId);

  if (error) {
    throw wrapSupabaseTableError(
      "market_refresh_runs",
      `Failed to finish market refresh run "${runId}"`,
      error,
    );
  }

  return finishedAt;
}

async function failMarketRefreshRun(
  runId: string,
  errorMessage: string,
  metadata?: Record<string, unknown>,
) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("market_refresh_runs")
    .update({
      run_status: "failed",
      finished_at: new Date().toISOString(),
      error_message: errorMessage,
      metadata: metadata ?? {},
    })
    .eq("id", runId);
}

async function upsertSeriesStatus(input: UpdateSeriesStatusInput) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const row = {
    series_type: input.seriesType,
    asset_slug: input.assetSlug,
    timeframe: normalizeTimeframe(input.timeframe),
    source_label: input.sourceLabel,
    source_code: input.sourceCode ?? null,
    ingest_mode: input.ingestMode,
    refresh_status: input.refreshStatus,
    last_refresh_run_id: input.lastRefreshRunId,
    last_successful_run_id:
      input.refreshStatus === "live"
        ? input.lastSuccessfulRunId ?? input.lastRefreshRunId
        : input.lastSuccessfulRunId ?? null,
    last_refreshed_at: now,
    last_successful_at:
      input.refreshStatus === "live" ? now : null,
    latest_point_at: input.latestPointAt ?? null,
    coverage_start: input.coverageStart ?? null,
    coverage_end: input.coverageEnd ?? null,
    records_retained: input.recordsRetained,
    latest_value: input.latestValue ?? null,
    latest_change_percent: input.latestChangePercent ?? null,
    metadata: input.metadata ?? {},
    updated_at: now,
  };

  const { error } = await supabase
    .from("market_series_status")
    .upsert(row, { onConflict: "series_type,asset_slug,timeframe" });

  if (error) {
    throw wrapSupabaseTableError(
      "market_series_status",
      "Failed to update market series status",
      error,
    );
  }
}

async function insertAuditSnapshot(snapshotKey: string, payload: Record<string, unknown>, fetchedAt: string) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("source_snapshots").insert({
    snapshot_key: snapshotKey,
    fetched_at: fetchedAt,
    status: "captured",
    payload,
  });

  return !error;
}

async function countRows(
  table:
    | "stock_quote_history"
    | "stock_ohlcv_history"
    | "benchmark_ohlcv_history"
    | "fund_nav_history",
  filters: Record<string, string>,
) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { count, error } = await query;
  if (error) {
    throw wrapSupabaseTableError(
      table,
      `Failed to count retained ${table} rows`,
      error,
    );
  }
  return count ?? 0;
}

function normalizeOptionalNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : null;
}

function dedupeRowsByKey<T>(rows: readonly T[], getKey: (row: T) => string) {
  const deduped = new Map<string, T>();
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    deduped.set(key, row);
  }
  return {
    rows: [...deduped.values()],
    duplicateDetectedCount: Math.max(0, rows.length - deduped.size),
  };
}

async function loadExistingStockOhlcvRows(input: {
  slug: string;
  timeframe: string;
  sourceLabel: string;
  barTimes: readonly string[];
}) {
  if (!input.barTimes.length) {
    return new Map<string, { open: number; high: number; low: number; close: number; volume: number | null }>();
  }

  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_ohlcv_history")
    .select("bar_time, open, high, low, close, volume")
    .eq("slug", input.slug)
    .eq("timeframe", input.timeframe)
    .eq("source_label", input.sourceLabel)
    .in("bar_time", [...input.barTimes]);

  if (error) {
    throw wrapSupabaseTableError(
      "stock_ohlcv_history",
      `Failed to load existing OHLCV history for "${input.slug}"`,
      error,
    );
  }

  const lookup = new Map<string, { open: number; high: number; low: number; close: number; volume: number | null }>();
  for (const row of data ?? []) {
    const key = coerceText(row.bar_time, "");
    if (!key) continue;
    lookup.set(key, {
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: normalizeOptionalNumber(row.volume),
    });
  }
  return lookup;
}

async function loadExistingBenchmarkRows(input: {
  slug: string;
  sourceLabel: string;
  dates: readonly string[];
}) {
  if (!input.dates.length) {
    return new Map<string, { open: number; high: number; low: number; close: number; volume: number | null }>();
  }

  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("benchmark_ohlcv_history")
    .select("date, open, high, low, close, volume")
    .eq("index_slug", input.slug)
    .eq("source_label", input.sourceLabel)
    .in("date", [...input.dates]);

  if (error) {
    throw wrapSupabaseTableError(
      "benchmark_ohlcv_history",
      `Failed to load existing benchmark OHLCV history for "${input.slug}"`,
      error,
    );
  }

  const lookup = new Map<string, { open: number; high: number; low: number; close: number; volume: number | null }>();
  for (const row of data ?? []) {
    const key = coerceText(row.date, "");
    if (!key) continue;
    lookup.set(key, {
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: normalizeOptionalNumber(row.volume),
    });
  }
  return lookup;
}

async function loadExistingFundNavRows(input: {
  slug: string;
  sourceLabel: string;
  navDates: readonly string[];
}) {
  if (!input.navDates.length) {
    return new Map<string, { nav: number; returns1Y: number | null }>();
  }

  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("fund_nav_history")
    .select("nav_date, nav, returns_1y")
    .eq("slug", input.slug)
    .eq("source_label", input.sourceLabel)
    .in("nav_date", [...input.navDates]);

  if (error) {
    throw wrapSupabaseTableError(
      "fund_nav_history",
      `Failed to load existing fund NAV history for "${input.slug}"`,
      error,
    );
  }

  const lookup = new Map<string, { nav: number; returns1Y: number | null }>();
  for (const row of data ?? []) {
    const key = coerceText(row.nav_date, "");
    if (!key) continue;
    lookup.set(key, {
      nav: Number(row.nav),
      returns1Y: normalizeOptionalNumber(row.returns_1y),
    });
  }
  return lookup;
}

export async function persistStockQuoteHistory(input: PersistStockQuoteInput) {
  const runId = await startMarketRefreshRun({
    seriesType: "stock_quote",
    assetSlug: input.slug,
    triggerSource: input.triggerSource,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    ingestMode: input.ingestMode,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: input.metadata,
  });

  const quotedAt = normalizeTimestamp(input.quotedAt);

  try {
    ensureAdminMarketDataReady();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("stock_quote_history").upsert(
      {
        slug: input.slug,
        source_label: input.sourceLabel,
        source_code: input.sourceCode ?? null,
        quoted_at: quotedAt,
        price: input.price,
        change_percent: input.changePercent,
        refresh_run_id: runId,
        payload: {
          source: input.sourceLabel,
          sourceCode: input.sourceCode ?? null,
          price: input.price,
          changePercent: input.changePercent,
          lastUpdated: quotedAt,
          ingestMode: input.ingestMode,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug,quoted_at,source_label" },
    );

    if (error) {
      throw wrapSupabaseTableError(
        "stock_quote_history",
        `Failed to persist stock quote history for "${input.slug}"`,
        error,
      );
    }

    const retained = await countRows("stock_quote_history", {
      slug: input.slug,
      source_label: input.sourceLabel,
    });
    await finishMarketRefreshRun(runId, {
      recordsWritten: 1,
      recordsRetained: retained,
      latestPointAt: quotedAt,
      metadata: input.metadata,
    });
    await upsertSeriesStatus({
      seriesType: "stock_quote",
      assetSlug: input.slug,
      sourceLabel: input.sourceLabel,
      sourceCode: input.sourceCode ?? null,
      ingestMode: input.ingestMode,
      refreshStatus: "live",
      lastRefreshRunId: runId,
      lastSuccessfulRunId: runId,
      latestPointAt: quotedAt,
      coverageStart: quotedAt,
      coverageEnd: quotedAt,
      recordsRetained: retained,
      latestValue: input.price,
      latestChangePercent: input.changePercent,
      metadata: input.metadata,
    });
    await insertAuditSnapshot(
      `stock:${input.slug}:quote`,
      {
        source: input.sourceLabel,
        sourceCode: input.sourceCode ?? null,
        isDemo: false,
        scope: "stock-quote",
        price: input.price,
        changePercent: input.changePercent,
        lastUpdated: quotedAt,
        durable: true,
        ingestMode: input.ingestMode,
        refreshRunId: runId,
      },
      new Date().toISOString(),
    );

    return { runId, recordsRetained: retained, quotedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown stock quote failure for "${input.slug}".`;
    await failMarketRefreshRun(runId, message, input.metadata);
    throw error;
  }
}

export async function persistStockOhlcvHistory(input: PersistStockChartInput) {
  const timeframe = normalizeTimeframe(input.timeframe || "1D");
  const runId = await startMarketRefreshRun({
    seriesType: "stock_ohlcv",
    assetSlug: input.slug,
    timeframe,
    triggerSource: input.triggerSource,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    ingestMode: input.ingestMode,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: input.metadata,
  });

  try {
    ensureAdminMarketDataReady();
    const supabase = createSupabaseAdminClient();
    const dedupedBars = dedupeRowsByKey(input.bars, (bar) => coerceText(bar.time, ""));
    const existingRows = await loadExistingStockOhlcvRows({
      slug: input.slug,
      timeframe,
      sourceLabel: input.sourceLabel,
      barTimes: dedupedBars.rows.map((bar) => coerceText(bar.time, "")),
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedExistingCount = 0;

    const rows = dedupedBars.rows
      .filter((bar) => {
        const existing = existingRows.get(coerceText(bar.time, ""));
        if (!existing) {
          insertedCount += 1;
          return true;
        }

        const changed =
          existing.open !== bar.open ||
          existing.high !== bar.high ||
          existing.low !== bar.low ||
          existing.close !== bar.close ||
          normalizeOptionalNumber(existing.volume) !== normalizeOptionalNumber(bar.volume);

        if (changed) {
          updatedCount += 1;
          return true;
        }

        skippedExistingCount += 1;
        return false;
      })
      .map((bar) => ({
      slug: input.slug,
      timeframe,
      source_label: input.sourceLabel,
      source_code: input.sourceCode ?? null,
      bar_time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume ?? null,
      refresh_run_id: runId,
      payload: {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? null,
      },
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("stock_ohlcv_history")
        .upsert(rows, { onConflict: "slug,timeframe,bar_time,source_label" });

      if (error) {
        throw wrapSupabaseTableError(
          "stock_ohlcv_history",
          `Failed to persist OHLCV history for "${input.slug}"`,
          error,
        );
      }
    }

    const sortedTimes = [...dedupedBars.rows.map((bar) => bar.time)].sort((left, right) =>
      left.localeCompare(right),
    );
    const latestPointAt = sortedTimes[sortedTimes.length - 1] ?? input.lastUpdated;
    const latestBar = [...dedupedBars.rows].sort((left, right) => left.time.localeCompare(right.time)).at(-1);
    const retained = await countRows("stock_ohlcv_history", {
      slug: input.slug,
      timeframe,
      source_label: input.sourceLabel,
    });

    await finishMarketRefreshRun(runId, {
      recordsWritten: rows.length,
      recordsRetained: retained,
      latestPointAt,
      metadata: {
        ...(input.metadata ?? {}),
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedBars.duplicateDetectedCount,
      },
    });
    await upsertSeriesStatus({
      seriesType: "stock_ohlcv",
      assetSlug: input.slug,
      timeframe,
      sourceLabel: input.sourceLabel,
      sourceCode: input.sourceCode ?? null,
      ingestMode: input.ingestMode,
      refreshStatus: "live",
      lastRefreshRunId: runId,
      lastSuccessfulRunId: runId,
      latestPointAt,
      coverageStart: sortedTimes[0] ?? latestPointAt,
      coverageEnd: latestPointAt,
      recordsRetained: retained,
      latestValue: latestBar?.close ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        lastUpdated: normalizeTimestamp(input.lastUpdated),
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedBars.duplicateDetectedCount,
      },
    });
    await insertAuditSnapshot(
      `stock:${input.slug}:ohlcv:${timeframe.toLowerCase()}`,
      {
        source: input.sourceLabel,
        sourceCode: input.sourceCode ?? null,
        isDemo: false,
        scope: "stock-chart",
        timeframe,
        bars: dedupedBars.rows,
        lastUpdated: normalizeTimestamp(input.lastUpdated),
        durable: true,
        ingestMode: input.ingestMode,
        refreshRunId: runId,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedBars.duplicateDetectedCount,
      },
      new Date().toISOString(),
    );

    return { runId, recordsRetained: retained, latestPointAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown OHLCV failure for "${input.slug}".`;
    await failMarketRefreshRun(runId, message, input.metadata);
    throw error;
  }
}

export async function persistBenchmarkOhlcvHistory(input: PersistBenchmarkChartInput) {
  const timeframe = normalizeTimeframe(input.timeframe || "1D");
  const runId = await startMarketRefreshRun({
    seriesType: "benchmark_ohlcv",
    assetSlug: input.slug,
    timeframe,
    triggerSource: input.triggerSource,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    ingestMode: input.ingestMode,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: input.metadata,
  });

  try {
    ensureAdminMarketDataReady();
    const supabase = createSupabaseAdminClient();
    const dedupedBars = dedupeRowsByKey(
      input.bars.map((bar) => ({ ...bar, normalizedDate: normalizeDate(bar.time, input.lastUpdated) })),
      (bar) => coerceText(bar.normalizedDate, ""),
    );
    const existingRows = await loadExistingBenchmarkRows({
      slug: input.slug,
      sourceLabel: input.sourceLabel,
      dates: dedupedBars.rows.map((bar) => coerceText(bar.normalizedDate, "")),
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedExistingCount = 0;

    const rows = dedupedBars.rows
      .filter((bar) => {
        const existing = existingRows.get(coerceText(bar.normalizedDate, ""));
        if (!existing) {
          insertedCount += 1;
          return true;
        }

        const changed =
          existing.open !== bar.open ||
          existing.high !== bar.high ||
          existing.low !== bar.low ||
          existing.close !== bar.close ||
          normalizeOptionalNumber(existing.volume) !== normalizeOptionalNumber(bar.volume);

        if (changed) {
          updatedCount += 1;
          return true;
        }

        skippedExistingCount += 1;
        return false;
      })
      .map((bar) => ({
      index_slug: input.slug,
      date: bar.normalizedDate,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume ?? null,
      source_label: input.sourceLabel,
      source_code: input.sourceCode ?? null,
      refresh_run_id: runId,
      payload: {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? null,
      },
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("benchmark_ohlcv_history")
        .upsert(rows, { onConflict: "index_slug,date,source_label" });

      if (error) {
        throw wrapSupabaseTableError(
          "benchmark_ohlcv_history",
          `Failed to persist benchmark OHLCV history for "${input.slug}"`,
          error,
        );
      }
    }

    const sortedTimes = [...dedupedBars.rows.map((bar) => bar.normalizedDate)].sort(
      (left, right) => left.localeCompare(right),
    );
    const latestPointAt = sortedTimes[sortedTimes.length - 1] ?? normalizeDate(input.lastUpdated, input.lastUpdated);
    const latestBar = [...dedupedBars.rows].sort((left, right) => left.time.localeCompare(right.time)).at(-1);
    const retained = await countRows("benchmark_ohlcv_history", {
      index_slug: input.slug,
      source_label: input.sourceLabel,
    });

    await finishMarketRefreshRun(runId, {
      recordsWritten: rows.length,
      recordsRetained: retained,
      latestPointAt,
      metadata: {
        ...(input.metadata ?? {}),
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedBars.duplicateDetectedCount,
      },
    });
    await upsertSeriesStatus({
      seriesType: "benchmark_ohlcv",
      assetSlug: input.slug,
      timeframe,
      sourceLabel: input.sourceLabel,
      sourceCode: input.sourceCode ?? null,
      ingestMode: input.ingestMode,
      refreshStatus: "live",
      lastRefreshRunId: runId,
      lastSuccessfulRunId: runId,
      latestPointAt,
      coverageStart: sortedTimes[0] ?? latestPointAt,
      coverageEnd: latestPointAt,
      recordsRetained: retained,
      latestValue: latestBar?.close ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        lastUpdated: normalizeTimestamp(input.lastUpdated),
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedBars.duplicateDetectedCount,
      },
    });
    await insertAuditSnapshot(
      `benchmark:${input.slug}:ohlcv:${timeframe.toLowerCase()}`,
      {
        source: input.sourceLabel,
        sourceCode: input.sourceCode ?? null,
        isDemo: false,
        scope: "benchmark-chart",
        timeframe,
        bars: dedupedBars.rows.map(({ normalizedDate, ...bar }) => bar),
        lastUpdated: normalizeTimestamp(input.lastUpdated),
        durable: true,
        ingestMode: input.ingestMode,
        refreshRunId: runId,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedBars.duplicateDetectedCount,
      },
      new Date().toISOString(),
    );

    return { runId, recordsRetained: retained, latestPointAt };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Unknown benchmark OHLCV failure for "${input.slug}".`;
    await failMarketRefreshRun(runId, message, input.metadata);
    throw error;
  }
}

export async function persistFundNavSeriesHistory(input: PersistFundNavSeriesInput) {
  const runId = await startMarketRefreshRun({
    seriesType: "fund_nav",
    assetSlug: input.slug,
    triggerSource: input.triggerSource,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    ingestMode: input.ingestMode,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: input.metadata,
  });

  const lastUpdated = normalizeTimestamp(input.lastUpdated);

  try {
    ensureAdminMarketDataReady();
    const supabase = createSupabaseAdminClient();
    const dedupedEntries = dedupeRowsByKey(
      input.entries.map((entry) => ({
        ...entry,
        normalizedNavDate: normalizeDate(entry.navDate, input.lastUpdated),
      })),
      (entry) => coerceText(entry.normalizedNavDate, ""),
    );
    const existingRows = await loadExistingFundNavRows({
      slug: input.slug,
      sourceLabel: input.sourceLabel,
      navDates: dedupedEntries.rows.map((entry) => coerceText(entry.normalizedNavDate, "")),
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedExistingCount = 0;

    const rows = dedupedEntries.rows
      .filter((entry) => {
        const existing = existingRows.get(coerceText(entry.normalizedNavDate, ""));
        if (!existing) {
          insertedCount += 1;
          return true;
        }

        const changed =
          existing.nav !== entry.nav ||
          normalizeOptionalNumber(existing.returns1Y) !== normalizeOptionalNumber(entry.returns1Y);

        if (changed) {
          updatedCount += 1;
          return true;
        }

        skippedExistingCount += 1;
        return false;
      })
      .map((entry) => {
      const navDate = entry.normalizedNavDate;
      return {
        slug: input.slug,
        source_label: input.sourceLabel,
        source_code: input.sourceCode ?? null,
        nav_date: navDate,
        nav: entry.nav,
        returns_1y: entry.returns1Y ?? null,
        refresh_run_id: runId,
        payload: {
          source: input.sourceLabel,
          sourceCode: input.sourceCode ?? null,
          nav: entry.nav,
          returns1Y: entry.returns1Y ?? null,
          navDate,
          lastUpdated,
          ingestMode: input.ingestMode,
        },
        updated_at: new Date().toISOString(),
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("fund_nav_history").upsert(rows, {
        onConflict: "slug,nav_date,source_label",
      });

      if (error) {
        throw wrapSupabaseTableError(
          "fund_nav_history",
          `Failed to persist fund NAV history for "${input.slug}"`,
          error,
        );
      }
    }

    const sortedDates = dedupedEntries.rows
      .map((entry) => entry.normalizedNavDate)
      .sort((left, right) => left.localeCompare(right));
    const latestNavDate =
      sortedDates[sortedDates.length - 1] ?? normalizeDate(input.lastUpdated, input.lastUpdated);
    const latestEntry = [...dedupedEntries.rows]
      .sort((left, right) => left.navDate.localeCompare(right.navDate))
      .at(-1);
    const retained = await countRows("fund_nav_history", {
      slug: input.slug,
      source_label: input.sourceLabel,
    });
    await finishMarketRefreshRun(runId, {
      recordsWritten: rows.length,
      recordsRetained: retained,
      latestPointAt: latestNavDate,
      metadata: {
        ...(input.metadata ?? {}),
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedEntries.duplicateDetectedCount,
      },
    });
    await upsertSeriesStatus({
      seriesType: "fund_nav",
      assetSlug: input.slug,
      sourceLabel: input.sourceLabel,
      sourceCode: input.sourceCode ?? null,
      ingestMode: input.ingestMode,
      refreshStatus: "live",
      lastRefreshRunId: runId,
      lastSuccessfulRunId: runId,
      latestPointAt: latestNavDate,
      coverageStart: sortedDates[0] ?? latestNavDate,
      coverageEnd: latestNavDate,
      recordsRetained: retained,
      latestValue: latestEntry?.nav ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        lastUpdated,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedEntries.duplicateDetectedCount,
      },
    });
    await insertAuditSnapshot(
      `fund:${input.slug}:nav`,
      {
        source: input.sourceLabel,
        sourceCode: input.sourceCode ?? null,
        isDemo: false,
        scope: "fund-nav",
        nav: latestEntry?.nav ?? null,
        returns1Y: latestEntry?.returns1Y ?? null,
        navDate: latestNavDate,
        lastUpdated,
        durable: true,
        ingestMode: input.ingestMode,
        refreshRunId: runId,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_existing_count: skippedExistingCount,
        duplicate_detected_count: dedupedEntries.duplicateDetectedCount,
      },
      new Date().toISOString(),
    );

    return { runId, recordsRetained: retained, navDate: latestNavDate };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown fund NAV failure for "${input.slug}".`;
    await failMarketRefreshRun(runId, message, input.metadata);
    throw error;
  }
}

export async function persistFundNavHistory(input: PersistFundNavInput) {
  return persistFundNavSeriesHistory({
    slug: input.slug,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    entries: [
      {
        navDate: input.navDate,
        nav: input.nav,
        returns1Y: input.returns1Y ?? null,
      },
    ],
    lastUpdated: input.lastUpdated,
    ingestMode: input.ingestMode,
    triggerSource: input.triggerSource,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: input.metadata,
  });
}

export async function refreshLatestStockQuoteFromOhlcvHistory(input: {
  slug: string;
  sourceLabel: string;
  sourceCode?: string | null;
  ingestMode: MarketIngestMode;
  triggerSource: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  metadata?: Record<string, unknown>;
}) {
  ensureAdminMarketDataReady();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock_ohlcv_history")
    .select("bar_time, close")
    .eq("slug", input.slug)
    .eq("timeframe", "1D")
    .eq("source_label", input.sourceLabel)
    .order("bar_time", { ascending: false })
    .limit(2);

  if (error) {
    throw wrapSupabaseTableError(
      "stock_ohlcv_history",
      `Failed to refresh latest stock quote from OHLCV for "${input.slug}"`,
      error,
    );
  }

  const latestRow = data?.[0];
  if (!latestRow) {
    return null;
  }

  const previousClose =
    typeof data?.[1]?.close === "number" && Number.isFinite(data[1].close) ? data[1].close : null;
  const latestClose =
    typeof latestRow.close === "number" && Number.isFinite(latestRow.close) ? latestRow.close : null;

  if (latestClose === null) {
    return null;
  }

  const changePercent =
    previousClose && previousClose !== 0 ? ((latestClose - previousClose) / previousClose) * 100 : 0;
  const quotedAt = latestRow.bar_time.includes("T")
    ? latestRow.bar_time
    : `${latestRow.bar_time}T15:30:00+05:30`;

  return persistStockQuoteHistory({
    slug: input.slug,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    price: latestClose,
    changePercent,
    quotedAt,
    ingestMode: input.ingestMode,
    triggerSource: input.triggerSource,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      refreshedFrom: "stock_ohlcv_history",
    },
  });
}

export async function persistIndexSnapshotHistory(input: PersistIndexSnapshotInput) {
  const runId = await startMarketRefreshRun({
    seriesType: "index_snapshot",
    assetSlug: input.slug,
    triggerSource: input.triggerSource,
    sourceLabel: input.sourceLabel,
    sourceCode: input.sourceCode ?? null,
    ingestMode: input.ingestMode,
    requestedBy: input.requestedBy ?? null,
    taskIdentifier: input.taskIdentifier ?? null,
    metadata: input.metadata,
  });

  const snapshotAt = normalizeTimestamp(input.snapshotAt);

  try {
    ensureAdminMarketDataReady();
    const supabase = createSupabaseAdminClient();
    await ensureTrackedIndexFoundationData(supabase);
    const { data: trackedIndex, error: trackedIndexError } = await supabase
      .from("tracked_indexes")
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle();

    if (trackedIndexError || !trackedIndex?.id) {
      if (trackedIndexError) {
        throw wrapSupabaseTableError(
          "tracked_indexes",
          `Tracked index lookup failed for slug "${input.slug}"`,
          trackedIndexError,
        );
      }

      throw new Error(`Tracked index not found for slug "${input.slug}".`);
    }

    const { error: trackedIndexUpdateError } = await supabase
      .from("tracked_indexes")
      .update({
        primary_source_code: input.sourceCode ?? null,
        status: "live",
        updated_at: new Date().toISOString(),
      })
      .eq("id", trackedIndex.id);

    if (trackedIndexUpdateError) {
      throw wrapSupabaseTableError(
        "tracked_indexes",
        `Failed to update tracked index "${input.slug}"`,
        trackedIndexUpdateError,
      );
    }

    const { data: snapshotRow, error: snapshotError } = await supabase
      .from("index_tracker_snapshots")
      .upsert(
        {
          tracked_index_id: trackedIndex.id,
          snapshot_at: snapshotAt,
          session_phase: input.sessionPhase ?? null,
          move_percent: input.movePercent,
          weighted_breadth_score: input.weightedBreadthScore,
          advancing_count: input.advancingCount,
          declining_count: input.decliningCount,
          positive_weight_share: input.positiveWeightShare,
          negative_weight_share: input.negativeWeightShare,
          market_mood: input.marketMood ?? null,
          dominance_label: input.dominanceLabel ?? null,
          trend_label: input.trendLabel ?? null,
          source_code: input.sourceCode ?? null,
          source_label: input.sourceLabel,
          ingest_mode: input.ingestMode,
          refresh_run_id: runId,
          payload: {
            slug: input.slug,
            source: input.sourceLabel,
            sourceCode: input.sourceCode ?? null,
            snapshotAt,
            components: input.components,
            coverage:
              input.metadata && typeof input.metadata === "object" && "coverage" in input.metadata
                ? input.metadata.coverage
                : null,
          },
          component_count: 0,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "tracked_index_id,snapshot_at" },
      )
      .select("id")
      .single();

    if (snapshotError || !snapshotRow?.id) {
      throw wrapSupabaseTableError(
        "index_tracker_snapshots",
        `Failed to persist index snapshot for "${input.slug}"`,
        snapshotError,
      );
    }

    const { error: deleteExistingComponentsError } = await supabase
      .from("index_component_snapshots")
      .delete()
      .eq("index_snapshot_id", snapshotRow.id);

    if (deleteExistingComponentsError) {
      throw wrapSupabaseTableError(
        "index_component_snapshots",
        `Failed to replace existing index components for "${input.slug}"`,
        deleteExistingComponentsError,
      );
    }

    const componentRows = input.components.map((component) => ({
      index_snapshot_id: snapshotRow.id,
      component_symbol: component.symbol,
      component_name: component.name,
      weight: component.weight,
      change_percent: component.changePercent,
      contribution: component.contribution,
      signal: component.signal ?? null,
    }));

    const { error: componentError } = await supabase
      .from("index_component_snapshots")
      .insert(componentRows);

    if (componentError) {
      throw wrapSupabaseTableError(
        "index_component_snapshots",
        `Failed to persist index components for "${input.slug}"`,
        componentError,
      );
    }

    const { error: finalizeSnapshotError } = await supabase
      .from("index_tracker_snapshots")
      .update({
        component_count: componentRows.length,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotRow.id);

    if (finalizeSnapshotError) {
      throw wrapSupabaseTableError(
        "index_tracker_snapshots",
        `Failed to finalize index snapshot for "${input.slug}"`,
        finalizeSnapshotError,
      );
    }

    await finishMarketRefreshRun(runId, {
      recordsWritten: 1 + componentRows.length,
      recordsRetained: 1,
      latestPointAt: snapshotAt,
      metadata: input.metadata,
    });
    await upsertSeriesStatus({
      seriesType: "index_snapshot",
      assetSlug: input.slug,
      sourceLabel: input.sourceLabel,
      sourceCode: input.sourceCode ?? null,
      ingestMode: input.ingestMode,
      refreshStatus: "live",
      lastRefreshRunId: runId,
      lastSuccessfulRunId: runId,
      latestPointAt: snapshotAt,
      coverageStart: snapshotAt,
      coverageEnd: snapshotAt,
      recordsRetained: 1,
      latestValue: input.weightedBreadthScore,
      latestChangePercent: input.movePercent,
      metadata: {
        ...(input.metadata ?? {}),
        componentCount: componentRows.length,
      },
    });
    await insertAuditSnapshot(
      `index:${input.slug}:snapshot`,
      {
        source: input.sourceLabel,
        sourceCode: input.sourceCode ?? null,
        isDemo: false,
        scope: "index-snapshot",
        snapshotAt,
        movePercent: input.movePercent,
        weightedBreadthScore: input.weightedBreadthScore,
        advancingCount: input.advancingCount,
        decliningCount: input.decliningCount,
        positiveWeightShare: input.positiveWeightShare,
        negativeWeightShare: input.negativeWeightShare,
        marketMood: input.marketMood ?? null,
        dominanceLabel: input.dominanceLabel ?? null,
        trendLabel: input.trendLabel ?? null,
        componentCount: input.components.length,
        durable: true,
        ingestMode: input.ingestMode,
        refreshRunId: runId,
      },
      new Date().toISOString(),
    );

    return { runId, componentCount: componentRows.length, snapshotAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown index snapshot failure for "${input.slug}".`;
    await failMarketRefreshRun(runId, message, input.metadata);
    throw error;
  }
}

async function getActiveSeriesStatus(seriesType: MarketSeriesType, assetSlug: string, timeframe?: string) {
  if (!hasRuntimeSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseMarketReadClient();
  const { data, error } = await supabase
    .from("market_series_status")
    .select(
      "source_label, source_code, ingest_mode, latest_point_at, last_successful_at, records_retained, latest_value, latest_change_percent",
    )
    .eq("series_type", seriesType)
    .eq("asset_slug", assetSlug)
    .eq("timeframe", normalizeTimeframe(timeframe))
    .eq("refresh_status", "live")
    .maybeSingle();

  if (error) {
    throw buildDurableReadError(
      `Durable market-series read failed for ${seriesType}:${assetSlug}.`,
      error,
    );
  }

  return data ?? null;
}

export async function getDurableStockQuoteSnapshot(
  slug: string,
): Promise<DurableStockQuoteSnapshot | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const batch = await getDurableStockQuoteSnapshots([normalizedSlug]);
  const readFailure = batch.readFailures.get(normalizedSlug);

  if (readFailure) {
    throw readFailure;
  }

  return batch.snapshots.get(normalizedSlug) ?? null;
}

export async function getDurableStockQuoteSnapshots(
  slugs: readonly string[],
): Promise<DurableStockQuoteBatchResult> {
  const normalizedSlugs = normalizeDurableAssetSlugs(slugs);
  const snapshots = new Map<string, DurableStockQuoteSnapshot>();
  const readFailures = new Map<string, DurableMarketDataReadError>();

  if (normalizedSlugs.length === 0) {
    return { snapshots, readFailures };
  }

  const misses: string[] = [];

  for (const slug of normalizedSlugs) {
    const cached = readTimedCache(durableStockQuoteSnapshotCache, slug);

    if (!cached.hit) {
      misses.push(slug);
      continue;
    }

    if (cached.value) {
      snapshots.set(slug, cached.value);
    }
  }

  if (misses.length === 0 || !hasRuntimeSupabaseEnv()) {
    return { snapshots, readFailures };
  }

  try {
    const supabase = await createSupabaseMarketReadClient();
    const [statusResult, latestQuoteResult] = await Promise.all([
      supabase
        .from("market_series_status")
        .select(
          "asset_slug, source_label, source_code, ingest_mode, latest_point_at, last_successful_at, records_retained, latest_value, latest_change_percent",
        )
        .eq("series_type", "stock_quote")
        .eq("timeframe", "SPOT")
        .eq("refresh_status", "live")
        .gt("records_retained", 0)
        .in("asset_slug", misses),
      supabase
        .from("stock_quote_history")
        .select("slug, source_label, source_code, quoted_at, price, change_percent")
        .in("slug", misses)
        .order("quoted_at", { ascending: false }),
    ]);

    if (statusResult.error) {
      const readFailure = buildDurableReadError(
        "Durable stock-quote status batch read failed.",
        statusResult.error,
      );

      for (const slug of misses) {
        readFailures.set(slug, readFailure);
      }

      return { snapshots, readFailures };
    }

    if (latestQuoteResult.error) {
      const readFailure = buildDurableReadError(
        "Durable stock-quote history batch read failed.",
        latestQuoteResult.error,
      );

      for (const slug of misses) {
        readFailures.set(slug, readFailure);
      }

      return { snapshots, readFailures };
    }

    const statusBySlug = new Map(
      (statusResult.data ?? []).map((row) => [row.asset_slug as string, row]),
    );
    const latestQuoteBySlug = new Map<string, NonNullable<typeof latestQuoteResult.data>[number]>();

    for (const row of latestQuoteResult.data ?? []) {
      if (!latestQuoteBySlug.has(row.slug)) {
        latestQuoteBySlug.set(row.slug, row);
      }
    }

    for (const slug of misses) {
      const status = statusBySlug.get(slug);
      const latestQuote = latestQuoteBySlug.get(slug);

      if (!status && !latestQuote) {
        writeTimedCache(durableStockQuoteSnapshotCache, slug, null);
        continue;
      }

      if (!status || !latestQuote) {
        readFailures.set(
          slug,
          buildDurableReadError(
            `Durable stock-quote data is inconsistent for "${slug}". Expected both live status and quote history rows.`,
          ),
        );
        continue;
      }

      const snapshot: DurableStockQuoteSnapshot = {
        slug: latestQuote.slug,
        source: latestQuote.source_label,
        sourceCode: latestQuote.source_code ?? status.source_code ?? null,
        ingestMode: (status.ingest_mode as MarketIngestMode) ?? "provider_sync",
        lastUpdated: latestQuote.quoted_at,
        price: Number(latestQuote.price),
        changePercent: Number(latestQuote.change_percent),
      };

      snapshots.set(slug, snapshot);
      writeTimedCache(durableStockQuoteSnapshotCache, slug, snapshot);
    }

    return { snapshots, readFailures };
  } catch (error) {
    const readFailure =
      error instanceof DurableMarketDataReadError
        ? error
        : buildDurableReadError("Durable stock-quote batch read failed.", error);

    for (const slug of misses) {
      readFailures.set(slug, readFailure);
    }

    return { snapshots, readFailures };
  }
}

export async function getDurableFundNavSnapshot(
  slug: string,
): Promise<DurableFundNavSnapshot | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const batch = await getDurableFundNavSnapshots([normalizedSlug]);
  const readFailure = batch.readFailures.get(normalizedSlug);

  if (readFailure) {
    throw readFailure;
  }

  return batch.snapshots.get(normalizedSlug) ?? null;
}

export async function getDurableFundNavSnapshots(
  slugs: readonly string[],
): Promise<DurableFundNavBatchResult> {
  const normalizedSlugs = normalizeDurableAssetSlugs(slugs);
  const snapshots = new Map<string, DurableFundNavSnapshot>();
  const readFailures = new Map<string, DurableMarketDataReadError>();

  if (normalizedSlugs.length === 0) {
    return { snapshots, readFailures };
  }

  const misses: string[] = [];

  for (const slug of normalizedSlugs) {
    const cached = readTimedCache(durableFundNavSnapshotCache, slug);

    if (!cached.hit) {
      misses.push(slug);
      continue;
    }

    if (cached.value) {
      snapshots.set(slug, cached.value);
    }
  }

  if (misses.length === 0 || !hasRuntimeSupabaseEnv()) {
    return { snapshots, readFailures };
  }

  try {
    const supabase = await createSupabaseMarketReadClient();
    const [statusResult, historyResult] = await Promise.all([
      supabase
        .from("market_series_status")
        .select(
          "asset_slug, source_label, source_code, ingest_mode, latest_point_at, last_successful_at, records_retained, latest_value, latest_change_percent",
        )
        .eq("series_type", "fund_nav")
        .eq("timeframe", "SPOT")
        .eq("refresh_status", "live")
        .gt("records_retained", 0)
        .in("asset_slug", misses),
      supabase
        .from("fund_nav_history")
        .select("slug, source_label, source_code, nav_date, nav, returns_1y")
        .in("slug", misses)
        .order("nav_date", { ascending: false }),
    ]);

    if (statusResult.error) {
      const readFailure = buildDurableReadError(
        "Durable fund-NAV status batch read failed.",
        statusResult.error,
      );

      for (const slug of misses) {
        readFailures.set(slug, readFailure);
      }

      return { snapshots, readFailures };
    }

    if (historyResult.error) {
      const readFailure = buildDurableReadError(
        "Durable fund-NAV history batch read failed.",
        historyResult.error,
      );

      for (const slug of misses) {
        readFailures.set(slug, readFailure);
      }

      return { snapshots, readFailures };
    }

    const statusBySlug = new Map(
      (statusResult.data ?? []).map((row) => [row.asset_slug as string, row]),
    );
    const latestHistoryBySlug = new Map<string, NonNullable<typeof historyResult.data>[number]>();

    for (const row of historyResult.data ?? []) {
      if (!latestHistoryBySlug.has(row.slug)) {
        latestHistoryBySlug.set(row.slug, row);
      }
    }

    for (const slug of misses) {
      const status = statusBySlug.get(slug);
      const latestHistory = latestHistoryBySlug.get(slug);

      if (!status && !latestHistory) {
        writeTimedCache(durableFundNavSnapshotCache, slug, null);
        continue;
      }

      if (!status || !latestHistory) {
        readFailures.set(
          slug,
          buildDurableReadError(
            `Durable fund-NAV data is inconsistent for "${slug}". Expected both live status and NAV history rows.`,
          ),
        );
        continue;
      }

      const snapshot: DurableFundNavSnapshot = {
        slug: latestHistory.slug,
        source: latestHistory.source_label,
        sourceCode: latestHistory.source_code ?? status.source_code ?? null,
        ingestMode: (status.ingest_mode as MarketIngestMode) ?? "provider_sync",
        lastUpdated: latestHistory.nav_date,
        nav: Number(latestHistory.nav),
        returns1Y: latestHistory.returns_1y === null ? null : Number(latestHistory.returns_1y),
      };

      snapshots.set(slug, snapshot);
      writeTimedCache(durableFundNavSnapshotCache, slug, snapshot);
    }

    return { snapshots, readFailures };
  } catch (error) {
    const readFailure =
      error instanceof DurableMarketDataReadError
        ? error
        : buildDurableReadError("Durable fund-NAV batch read failed.", error);

    for (const slug of misses) {
      readFailures.set(slug, readFailure);
    }

    return { snapshots, readFailures };
  }
}

export async function getDurableStockChartSeries(
  slug: string,
  timeframe = "1D",
): Promise<DurableStockChartSeries | null> {
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const status = await getActiveSeriesStatus("stock_ohlcv", slug, normalizedTimeframe);
  if (!status || !hasRuntimeSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createSupabaseMarketReadClient();
    const { data, error } = await supabase
      .from("stock_ohlcv_history")
      .select("slug, source_label, source_code, bar_time, open, high, low, close, volume")
      .eq("slug", slug)
      .eq("timeframe", normalizedTimeframe)
      .eq("source_label", status.source_label)
      .order("bar_time", { ascending: true });

    if (error || !data || data.length < 2) return null;

    return {
      slug,
      source: status.source_label,
      sourceCode: status.source_code ?? null,
      ingestMode: (status.ingest_mode as MarketIngestMode) ?? "provider_sync",
      timeframe: normalizedTimeframe,
      lastUpdated:
        typeof status.latest_point_at === "string" && status.latest_point_at.length > 0
          ? status.latest_point_at
          : status.last_successful_at ?? new Date().toISOString(),
      bars: data.map((row) => ({
        time: row.bar_time,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: row.volume === null ? undefined : Number(row.volume),
      })),
    };
  } catch {
    return null;
  }
}

export async function getDurableMarketHistoryTelemetry(): Promise<DurableMarketHistoryTelemetry | null> {
  if (!hasRuntimeSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createSupabaseMarketReadClient();
    const { data, error } = await supabase
      .from("market_series_status")
      .select("series_type, ingest_mode, records_retained")
      .eq("refresh_status", "live");

    if (error || !data) {
      return null;
    }

    const summarize = (seriesTypes: MarketSeriesType[]) => {
      const rows = data.filter((row) => seriesTypes.includes(row.series_type as MarketSeriesType));
      return {
        retainedSeries: rows.reduce((sum, row) => sum + Math.max(0, Number(row.records_retained ?? 0)), 0),
        verifiedSeries: rows.filter((row) => !isManualIngestMode(row.ingest_mode)).length,
        previewSeries: rows.filter((row) => isManualIngestMode(row.ingest_mode)).length,
      };
    };

    return {
      stockHistory: summarize(["stock_quote", "stock_ohlcv"]),
      indexHistory: summarize(["index_snapshot"]),
      fundHistory: summarize(["fund_nav"]),
    };
  } catch {
    return null;
  }
}
