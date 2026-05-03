import { randomUUID } from "crypto";

import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MarketDataImportDuplicateMode,
  MarketDataImportExecutionMode,
  MarketDataImportSourceType,
  MarketDataImportType,
} from "@/lib/market-data-imports";
import {
  buildGoogleSheetCsvExportUrl,
  normalizeYahooSymbolForStockLookup,
} from "@/lib/market-data-imports";

export type MarketDataSourceSyncStatus = "active" | "paused" | "error";

export type MarketDataSourceRecord = {
  id: string;
  sourceType: Extract<
    MarketDataImportSourceType,
    "google_sheet" | "yahoo_finance" | "provider_api"
  >;
  sourceUrl: string;
  assetSlug: string | null;
  symbol: string | null;
  schemeCode: string | null;
  benchmarkSlug: string | null;
  timeframe: string;
  lastSyncedAt: string | null;
  lastSyncedDate: string | null;
  syncStatus: MarketDataSourceSyncStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MarketDataSourceLatestRow = {
  tradeDate: string;
  sourceLabel: string | null;
  timeframe: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  nav: number | null;
  updatedAt: string | null;
};

export type SaveMarketDataSourceInput = {
  id?: string | null;
  sourceType: MarketDataSourceRecord["sourceType"];
  sourceUrl: string;
  assetSlug?: string | null;
  symbol?: string | null;
  schemeCode?: string | null;
  benchmarkSlug?: string | null;
  timeframe?: string | null;
  syncStatus?: MarketDataSourceSyncStatus | null;
  metadata?: Record<string, unknown> | null;
};

export type FindExistingMarketDataSourceIdentityInput = {
  sourceType: MarketDataSourceRecord["sourceType"];
  sourceUrl: string;
  timeframe: string;
  assetSlug: string | null;
  symbol: string | null;
  schemeCode: string | null;
  benchmarkSlug: string | null;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function ensureMarketDataSourceRegistryReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Market-data source registry requires durable Supabase admin credentials in this environment.",
    );
  }
}

function normalizeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeTimeframe(value: unknown) {
  return cleanString(value, 20).toUpperCase() || "1D";
}

function normalizeSourceType(
  value: unknown,
): MarketDataSourceRecord["sourceType"] | null {
  const normalized = cleanString(value, 120);
  if (
    normalized === "google_sheet" ||
    normalized === "yahoo_finance" ||
    normalized === "provider_api"
  ) {
    return normalized;
  }

  return null;
}

function normalizeSyncStatus(value: unknown): MarketDataSourceSyncStatus {
  const normalized = cleanString(value, 120);
  if (normalized === "paused" || normalized === "error") {
    return normalized;
  }

  return "active";
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferImportTypeFromSource(source: {
  symbol?: string | null;
  schemeCode?: string | null;
  benchmarkSlug?: string | null;
  assetSlug?: string | null;
  metadata?: Record<string, unknown> | null;
}): MarketDataImportType {
  const metadataImportType = cleanString(source.metadata?.importType, 120);
  if (
    metadataImportType === "stock_ohlcv" ||
    metadataImportType === "benchmark_ohlcv" ||
    metadataImportType === "fund_nav"
  ) {
    return metadataImportType;
  }

  if (cleanString(source.schemeCode, 160)) {
    return "fund_nav";
  }

  if (cleanString(source.benchmarkSlug, 160)) {
    return "benchmark_ohlcv";
  }

  if (cleanString(source.symbol, 160) || cleanString(source.assetSlug, 160)) {
    return "stock_ohlcv";
  }

  throw new Error(
    "Could not infer the import type for this source. Add symbol, benchmark slug, scheme code, or metadata.importType.",
  );
}

export function getMarketDataSourceImportType(source: MarketDataSourceRecord) {
  return inferImportTypeFromSource(source);
}

function normalizeSourceRow(value: Record<string, unknown>): MarketDataSourceRecord {
  return {
    id: cleanString(value.id, 160),
    sourceType: normalizeSourceType(value.source_type) ?? "google_sheet",
    sourceUrl: cleanString(value.source_url, 2000),
    assetSlug: cleanString(value.asset_slug, 160) || null,
    symbol: cleanString(value.symbol, 160) || null,
    schemeCode: cleanString(value.scheme_code, 160) || null,
    benchmarkSlug: cleanString(value.benchmark_slug, 160) || null,
    timeframe: normalizeTimeframe(value.timeframe),
    lastSyncedAt: cleanString(value.last_synced_at, 120) || null,
    lastSyncedDate: cleanString(value.last_synced_date, 120) || null,
    syncStatus: normalizeSyncStatus(value.sync_status),
    metadata: normalizeMetadata(value.metadata),
    createdAt: cleanString(value.created_at, 120),
    updatedAt: cleanString(value.updated_at, 120),
  };
}

function buildDefaultSourceUrl(input: {
  sourceType: MarketDataSourceRecord["sourceType"];
  symbol?: string | null;
  sourceUrl?: string | null;
}) {
  const explicit = cleanString(input.sourceUrl, 2000);
  if (explicit) {
    return explicit;
  }

  if (input.sourceType === "yahoo_finance") {
    const symbol = cleanString(input.symbol, 160);
    if (symbol) {
      return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    }
  }

  return "";
}

function validateSourceInput(input: SaveMarketDataSourceInput) {
  const sourceType = normalizeSourceType(input.sourceType);
  if (!sourceType) {
    throw new Error("Choose a supported market-data source type.");
  }

  const sourceUrl = buildDefaultSourceUrl({
    sourceType,
    symbol: input.symbol,
    sourceUrl: input.sourceUrl,
  });

  if (!sourceUrl) {
    throw new Error("Source URL is required.");
  }

  const assetSlug = cleanString(input.assetSlug, 160) || null;
  const symbol = cleanString(input.symbol, 160) || null;
  const schemeCode = cleanString(input.schemeCode, 160) || null;
  const benchmarkSlug = cleanString(input.benchmarkSlug, 160) || null;

  inferImportTypeFromSource({
    assetSlug,
    symbol,
    schemeCode,
    benchmarkSlug,
    metadata: input.metadata ?? {},
  });

  return {
    id: cleanString(input.id, 160) || randomUUID(),
    sourceType,
    sourceUrl,
    assetSlug,
    symbol,
    schemeCode,
    benchmarkSlug,
    timeframe: normalizeTimeframe(input.timeframe),
    syncStatus: normalizeSyncStatus(input.syncStatus),
    metadata: normalizeMetadata(input.metadata),
  };
}

export async function findExistingMarketDataSourceByIdentity(
  input: FindExistingMarketDataSourceIdentityInput,
) {
  const sources = await listMarketDataSources();

  const normalizeComparableSourceUrl = (
    sourceType: MarketDataSourceRecord["sourceType"],
    sourceUrl: string,
  ) => {
    if (sourceType === "google_sheet") {
      try {
        return buildGoogleSheetCsvExportUrl(sourceUrl).exportUrl;
      } catch {
        return cleanString(sourceUrl, 2000);
      }
    }

    return cleanString(sourceUrl, 2000);
  };

  const normalizeComparableSymbol = (symbol: string | null) => {
    return symbol ? normalizeYahooSymbolForStockLookup(symbol) : "";
  };

  const comparableSourceUrl = normalizeComparableSourceUrl(input.sourceType, input.sourceUrl);
  const comparableSymbol = normalizeComparableSymbol(input.symbol);

  const matches = sources.filter((source) => {
    return (
      source.sourceType === input.sourceType &&
      source.timeframe === input.timeframe &&
      normalizeComparableSourceUrl(source.sourceType, source.sourceUrl) ===
        comparableSourceUrl &&
      cleanString(source.assetSlug, 160) === cleanString(input.assetSlug, 160) &&
      cleanString(source.schemeCode, 160) === cleanString(input.schemeCode, 160) &&
      cleanString(source.benchmarkSlug, 160) === cleanString(input.benchmarkSlug, 160) &&
      normalizeComparableSymbol(source.symbol) === comparableSymbol
    );
  });

  if (!matches.length) {
    return null;
  }

  return matches.sort((left, right) => {
    const leftExactScore =
      (cleanString(left.sourceUrl, 2000) === cleanString(input.sourceUrl, 2000) ? 1000 : 0) +
      (cleanString(left.assetSlug, 160) === cleanString(input.assetSlug, 160) ? 200 : 0) +
      (cleanString(left.symbol, 160) === cleanString(input.symbol, 160) ? 100 : 0) +
      (cleanString(left.schemeCode, 160) === cleanString(input.schemeCode, 160) ? 50 : 0) +
      (cleanString(left.benchmarkSlug, 160) === cleanString(input.benchmarkSlug, 160) ? 50 : 0);
    const rightExactScore =
      (cleanString(right.sourceUrl, 2000) === cleanString(input.sourceUrl, 2000) ? 1000 : 0) +
      (cleanString(right.assetSlug, 160) === cleanString(input.assetSlug, 160) ? 200 : 0) +
      (cleanString(right.symbol, 160) === cleanString(input.symbol, 160) ? 100 : 0) +
      (cleanString(right.schemeCode, 160) === cleanString(input.schemeCode, 160) ? 50 : 0) +
      (cleanString(right.benchmarkSlug, 160) === cleanString(input.benchmarkSlug, 160) ? 50 : 0);
    const leftScore =
      (left.lastSyncedAt ? 100 : 0) +
      (left.lastSyncedDate ? 10 : 0) +
      (cleanString(left.metadata.last_batch_id, 160) ? 5 : 0);
    const rightScore =
      (right.lastSyncedAt ? 100 : 0) +
      (right.lastSyncedDate ? 10 : 0) +
      (cleanString(right.metadata.last_batch_id, 160) ? 5 : 0);

    return (
      rightExactScore - leftExactScore ||
      rightScore - leftScore ||
      left.createdAt.localeCompare(right.createdAt)
    );
  })[0];
}

export async function listMarketDataSources() {
  ensureMarketDataSourceRegistryReady();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("market_data_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load market-data sources. ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeSourceRow(row as Record<string, unknown>));
}

export async function getMarketDataSourceById(id: string) {
  ensureMarketDataSourceRegistryReady();
  const sourceId = cleanString(id, 160);
  if (!sourceId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("market_data_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load market-data source. ${error.message}`);
  }

  return data ? normalizeSourceRow(data as Record<string, unknown>) : null;
}

export async function saveMarketDataSource(input: SaveMarketDataSourceInput) {
  ensureMarketDataSourceRegistryReady();
  const normalized = validateSourceInput(input);
  const existing = cleanString(input.id, 160)
    ? null
    : await findExistingMarketDataSourceByIdentity({
        sourceType: normalized.sourceType,
        sourceUrl: normalized.sourceUrl,
        timeframe: normalized.timeframe,
        assetSlug: normalized.assetSlug,
        symbol: normalized.symbol,
        schemeCode: normalized.schemeCode,
        benchmarkSlug: normalized.benchmarkSlug,
      }).catch(() => null);
  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("market_data_sources")
    .upsert(
      {
        id: existing?.id ?? normalized.id,
        source_type: normalized.sourceType,
        source_url: normalized.sourceUrl,
        asset_slug: normalized.assetSlug,
        symbol: normalized.symbol,
        scheme_code: normalized.schemeCode,
        benchmark_slug: normalized.benchmarkSlug,
        timeframe: normalized.timeframe,
        sync_status: normalized.syncStatus,
        metadata: normalized.metadata,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not save market-data source. ${error.message}`);
  }

  return normalizeSourceRow((data ?? {}) as Record<string, unknown>);
}

export async function updateMarketDataSourceSyncResult(input: {
  id: string;
  syncStatus: MarketDataSourceSyncStatus;
  lastSyncedAt?: string | null;
  lastSyncedDate?: string | null;
  metadataPatch?: Record<string, unknown>;
}) {
  ensureMarketDataSourceRegistryReady();
  const existing = await getMarketDataSourceById(input.id);
  if (!existing) {
    throw new Error("Market-data source not found.");
  }

  return saveMarketDataSource({
    id: existing.id,
    sourceType: existing.sourceType,
    sourceUrl: existing.sourceUrl,
    assetSlug: existing.assetSlug,
    symbol: existing.symbol,
    schemeCode: existing.schemeCode,
    benchmarkSlug: existing.benchmarkSlug,
    timeframe: existing.timeframe,
    syncStatus: input.syncStatus,
    metadata: {
      ...existing.metadata,
      ...(input.metadataPatch ?? {}),
      ...(input.lastSyncedAt ? { lastSyncedAt: input.lastSyncedAt } : {}),
      ...(input.lastSyncedDate ? { lastSyncedDate: input.lastSyncedDate } : {}),
    },
  }).then(async (saved) => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("market_data_sources")
      .update({
        last_synced_at: input.lastSyncedAt ?? saved.lastSyncedAt,
        last_synced_date: input.lastSyncedDate ?? saved.lastSyncedDate,
        sync_status: input.syncStatus,
        metadata: {
          ...saved.metadata,
          ...(input.metadataPatch ?? {}),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", saved.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Could not update market-data sync result. ${error.message}`);
    }

    return normalizeSourceRow((data ?? {}) as Record<string, unknown>);
  });
}

export async function listActiveMarketDataSources() {
  const sources = await listMarketDataSources();
  return sources.filter((source) => source.syncStatus === "active");
}

export function getMarketDataSourceDefaultExecutionMode(
  source: Pick<MarketDataSourceRecord, "metadata">,
): MarketDataImportExecutionMode {
  return cleanString(source.metadata?.executionMode, 120) === "validate_only"
    ? "validate_only"
    : "import_valid_rows";
}

export function getMarketDataSourceDefaultDuplicateMode(
  source: Pick<MarketDataSourceRecord, "metadata">,
): MarketDataImportDuplicateMode {
  return cleanString(source.metadata?.duplicateMode, 160) === "skip_existing_dates"
    ? "skip_existing_dates"
    : "replace_matching_dates";
}

export async function listLatestMarketDataSourceRows(id: string, limit = 5) {
  ensureMarketDataSourceRegistryReady();
  const source = await getMarketDataSourceById(id);
  if (!source) {
    throw new Error("Market-data source not found.");
  }

  const supabase = createSupabaseAdminClient();
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
  const importType = getMarketDataSourceImportType(source);

  if (importType === "stock_ohlcv") {
    const slug = cleanString(source.assetSlug, 160);
    if (!slug) {
      throw new Error("Stock sources need an asset slug to read latest rows.");
    }

    const { data, error } = await supabase
      .from("stock_ohlcv_history")
      .select("bar_time, source_label, timeframe, open, high, low, close, volume, updated_at")
      .eq("slug", slug)
      .eq("timeframe", source.timeframe)
      .order("bar_time", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new Error(`Could not load latest source rows. ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      tradeDate: cleanString(row.bar_time, 120).slice(0, 10),
      sourceLabel: cleanString(row.source_label, 240) || null,
      timeframe: cleanString(row.timeframe, 40) || source.timeframe,
      open: numericOrNull(row.open),
      high: numericOrNull(row.high),
      low: numericOrNull(row.low),
      close: numericOrNull(row.close),
      volume: numericOrNull(row.volume),
      nav: null,
      updatedAt: cleanString(row.updated_at, 120) || null,
    })) as MarketDataSourceLatestRow[];
  }

  if (importType === "benchmark_ohlcv") {
    const benchmarkSlug = cleanString(source.benchmarkSlug, 160);
    if (!benchmarkSlug) {
      throw new Error("Benchmark sources need a benchmark slug to read latest rows.");
    }

    const { data, error } = await supabase
      .from("benchmark_ohlcv_history")
      .select("date, source_label, open, high, low, close, volume, updated_at")
      .eq("index_slug", benchmarkSlug)
      .order("date", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new Error(`Could not load latest source rows. ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      tradeDate: cleanString(row.date, 120).slice(0, 10),
      sourceLabel: cleanString(row.source_label, 240) || null,
      timeframe: source.timeframe,
      open: numericOrNull(row.open),
      high: numericOrNull(row.high),
      low: numericOrNull(row.low),
      close: numericOrNull(row.close),
      volume: numericOrNull(row.volume),
      nav: null,
      updatedAt: cleanString(row.updated_at, 120) || null,
    })) as MarketDataSourceLatestRow[];
  }

  const slug = cleanString(source.assetSlug, 160);
  if (!slug) {
    throw new Error("Fund sources need an asset slug to read latest rows.");
  }

  const { data, error } = await supabase
    .from("fund_nav_history")
    .select("nav_date, source_label, nav, updated_at")
    .eq("slug", slug)
    .order("nav_date", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Could not load latest source rows. ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    tradeDate: cleanString(row.nav_date, 120).slice(0, 10),
    sourceLabel: cleanString(row.source_label, 240) || null,
      timeframe: source.timeframe,
    open: null,
    high: null,
    low: null,
    close: null,
    volume: null,
      nav: numericOrNull(row.nav),
    updatedAt: cleanString(row.updated_at, 120) || null,
  })) as MarketDataSourceLatestRow[];
}
