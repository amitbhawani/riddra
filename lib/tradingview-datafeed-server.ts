import { cache } from "react";

import { getDurableStockChartSeries } from "@/lib/market-data-durable-store";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TradingviewSymbolRegistryEntry = {
  tvSymbol: string;
  assetKind: "stock";
  assetSlug: string;
  nativeSymbol: string;
  displayName: string;
  exchange: string;
  listedExchange: string;
  sourceCode: string | null;
  session: string;
  timezone: string;
  minmov: number;
  pricescale: number;
  volumePrecision: number;
  supportedResolutions: string[];
  lifecycleState: string;
  sourceLabel: string;
  latestPointAt: string | null;
  recordsRetained: number;
  metadata: Record<string, unknown>;
};

export type TradingviewSearchSymbolResult = {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: "stock";
};

export type TradingviewResolvedSymbol = {
  ticker: string;
  name: string;
  full_name: string;
  description: string;
  type: "stock";
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: false;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: "endofday";
};

type TradingviewDailyBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

const TRADINGVIEW_DATAFEED_CONFIG = {
  supported_resolutions: ["1D"],
  supports_search: true,
  supports_group_request: false,
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: false,
};

type RegistryRow = {
  tv_symbol: string;
  asset_kind: string;
  asset_slug: string;
  native_symbol: string;
  display_name: string;
  exchange: string;
  listed_exchange: string;
  source_code: string | null;
  session: string;
  timezone: string;
  minmov: number;
  pricescale: number;
  volume_precision: number;
  supported_resolutions: string[] | null;
  lifecycle_state: string;
  source_label: string;
  latest_point_at: string | null;
  records_retained: number | null;
  metadata: Record<string, unknown> | null;
};

type FallbackRegistryRow = {
  slug: string;
  symbol: string | null;
  name: string;
  exchange: string | null;
  primary_source_code: string | null;
  source_label: string;
  latest_point_at: string | null;
  records_retained: number | null;
  ingest_mode: string | null;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function normalizeResolution(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "D" ? "1D" : normalized;
}

function epochSecondsToIsoDate(value: number) {
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis).toISOString().slice(0, 10);
}

function buildRegistryEntry(row: RegistryRow): TradingviewSymbolRegistryEntry {
  return {
    tvSymbol: row.tv_symbol,
    assetKind: "stock",
    assetSlug: row.asset_slug,
    nativeSymbol: row.native_symbol,
    displayName: row.display_name,
    exchange: row.exchange,
    listedExchange: row.listed_exchange,
    sourceCode: row.source_code,
    session: row.session,
    timezone: row.timezone,
    minmov: Number(row.minmov) || 1,
    pricescale: Number(row.pricescale) || 100,
    volumePrecision: Number(row.volume_precision) || 0,
    supportedResolutions:
      Array.isArray(row.supported_resolutions) && row.supported_resolutions.length
        ? row.supported_resolutions
        : ["1D"],
    lifecycleState: row.lifecycle_state,
    sourceLabel: row.source_label,
    latestPointAt: row.latest_point_at,
    recordsRetained: Number(row.records_retained) || 0,
    metadata: row.metadata ?? {},
  };
}

async function createTradingviewDatafeedClient() {
  if (!hasRuntimeSupabaseEnv()) {
    throw new Error("Supabase runtime environment is required for TradingView datafeed reads.");
  }

  if (hasRuntimeSupabaseAdminEnv()) {
    return createSupabaseAdminClient();
  }

  return createSupabaseServerClient();
}

function buildFallbackRegistryEntry(row: FallbackRegistryRow): TradingviewSymbolRegistryEntry {
  const exchange = row.exchange?.trim() || "NSE";
  const nativeSymbol = row.symbol?.trim() || row.slug.toUpperCase().replace(/-/g, "");
  const tvSymbol = `${exchange}:${nativeSymbol}`;

  return {
    tvSymbol,
    assetKind: "stock",
    assetSlug: row.slug,
    nativeSymbol,
    displayName: row.name,
    exchange,
    listedExchange: exchange,
    sourceCode: row.primary_source_code,
    session: "0915-1530",
    timezone: "Asia/Kolkata",
    minmov: 1,
    pricescale: 100,
    volumePrecision: 0,
    supportedResolutions: ["1D"],
    lifecycleState: "active",
    sourceLabel: row.source_label,
    latestPointAt: row.latest_point_at,
    recordsRetained: Number(row.records_retained) || 0,
    metadata: {
      timeframe: "1D",
      ingestMode: row.ingest_mode,
      fallbackRegistry: true,
    },
  };
}

async function readFallbackRegistryRows() {
  const supabase = await createTradingviewDatafeedClient();
  const { data: statusRows, error: statusError } = await supabase
    .from("market_series_status")
    .select("asset_slug, source_label, latest_point_at, records_retained, ingest_mode")
    .eq("series_type", "stock_ohlcv")
    .eq("timeframe", "1D")
    .eq("refresh_status", "live")
    .gt("records_retained", 1);

  if (statusError) {
    throw new Error(`TradingView fallback status read failed. ${statusError.message}`);
  }

  const slugs = (statusRows ?? [])
    .map((row) => row.asset_slug)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!slugs.length) {
    return [];
  }

  const statusBySlug = new Map(
    (statusRows ?? []).map((row) => [
      row.asset_slug,
      {
        source_label: row.source_label,
        latest_point_at: row.latest_point_at,
        records_retained: row.records_retained,
        ingest_mode: row.ingest_mode,
      },
    ]),
  );

  const { data: instrumentRows, error: instrumentError } = await supabase
    .from("instruments")
    .select("slug, symbol, name, exchange, primary_source_code")
    .eq("instrument_type", "stock")
    .eq("status", "active")
    .in("slug", slugs)
    .order("name", { ascending: true });

  if (instrumentError) {
    throw new Error(`TradingView fallback instrument read failed. ${instrumentError.message}`);
  }

  return (instrumentRows ?? []).map((row) => {
    const statusRow = statusBySlug.get(row.slug) ?? null;

    return buildFallbackRegistryEntry({
      slug: row.slug,
      symbol: row.symbol,
      name: row.name,
      exchange: row.exchange,
      primary_source_code: row.primary_source_code,
      source_label: statusRow?.source_label ?? "Verified OHLCV",
      latest_point_at: statusRow?.latest_point_at ?? null,
      records_retained: statusRow?.records_retained ?? null,
      ingest_mode: statusRow?.ingest_mode ?? null,
    });
  });
}

export function getTradingviewDatafeedConfig() {
  return TRADINGVIEW_DATAFEED_CONFIG;
}

export const getTradingviewSymbolRegistry = cache(
  async (): Promise<TradingviewSymbolRegistryEntry[]> => {
    const publishableStockSlugs = await getPublishableCmsSlugSet("stock");

    if (publishableStockSlugs.size === 0) {
      return [];
    }

    const supabase = await createTradingviewDatafeedClient();
    const { data, error } = await supabase
      .from("tradingview_daily_symbol_registry")
      .select(
        "tv_symbol, asset_kind, asset_slug, native_symbol, display_name, exchange, listed_exchange, source_code, session, timezone, minmov, pricescale, volume_precision, supported_resolutions, lifecycle_state, source_label, latest_point_at, records_retained, metadata",
      )
      .order("display_name", { ascending: true });

    if (error) {
      return (await readFallbackRegistryRows()).filter((row) =>
        publishableStockSlugs.has(row.assetSlug),
      );
    }

    return (data ?? [])
      .map((row) => buildRegistryEntry(row as RegistryRow))
      .filter((row) => publishableStockSlugs.has(row.assetSlug));
  },
);

export async function searchTradingviewSymbols(
  query: string,
  limit = 20,
): Promise<TradingviewSearchSymbolResult[]> {
  const registry = await getTradingviewSymbolRegistry();
  const normalizedQuery = normalizeQuery(query);
  const shortlist = normalizedQuery
    ? registry.filter((entry) => {
        const searchTarget = `${entry.tvSymbol} ${entry.nativeSymbol} ${entry.displayName} ${entry.exchange}`.toLowerCase();
        return searchTarget.includes(normalizedQuery);
      })
    : registry;

  return shortlist.slice(0, Math.max(1, Math.min(limit, 50))).map((entry) => ({
    symbol: entry.tvSymbol,
    full_name: entry.tvSymbol,
    description: entry.displayName,
    exchange: entry.exchange,
    ticker: entry.tvSymbol,
    type: "stock",
  }));
}

export async function resolveTradingviewSymbol(
  symbol: string,
): Promise<TradingviewResolvedSymbol | null> {
  const registry = await getTradingviewSymbolRegistry();
  const normalized = normalizeQuery(symbol);
  const entry =
    registry.find((item) => normalizeQuery(item.tvSymbol) === normalized) ??
    registry.find((item) => normalizeQuery(item.nativeSymbol) === normalized) ??
    registry.find((item) => normalizeQuery(item.assetSlug) === normalized);

  if (!entry) {
    return null;
  }

  return {
    ticker: entry.tvSymbol,
    name: entry.nativeSymbol,
    full_name: entry.tvSymbol,
    description: entry.displayName,
    type: "stock",
    session: entry.session,
    timezone: entry.timezone,
    exchange: entry.exchange,
    listed_exchange: entry.listedExchange,
    minmov: entry.minmov,
    pricescale: entry.pricescale,
    has_intraday: false,
    supported_resolutions: entry.supportedResolutions,
    volume_precision: entry.volumePrecision,
    data_status: "endofday",
  };
}

export async function getTradingviewDailyBars(input: {
  symbol: string;
  resolution: string;
  from?: number;
  to?: number;
}): Promise<{
  bars: TradingviewDailyBar[];
  meta: { noData: boolean };
}> {
  const resolution = normalizeResolution(input.resolution);

  if (resolution !== "1D") {
    throw new Error("TradingView Phase 1 supports daily bars only.");
  }

  const registry = await getTradingviewSymbolRegistry();
  const normalizedSymbol = normalizeQuery(input.symbol);
  const entry =
    registry.find((item) => normalizeQuery(item.tvSymbol) === normalizedSymbol) ??
    registry.find((item) => normalizeQuery(item.nativeSymbol) === normalizedSymbol);

  if (!entry) {
    return { bars: [], meta: { noData: true } };
  }

  const series = await getDurableStockChartSeries(entry.assetSlug, "1D");

  if (!series || !series.bars.length) {
    return { bars: [], meta: { noData: true } };
  }

  const fromDate =
    typeof input.from === "number" && Number.isFinite(input.from)
      ? epochSecondsToIsoDate(input.from)
      : null;
  const toDate =
    typeof input.to === "number" && Number.isFinite(input.to)
      ? epochSecondsToIsoDate(input.to)
      : null;

  const bars = series.bars
    .filter(
      (bar) =>
        typeof bar.time === "string" &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close),
    )
    .sort((left, right) => left.time.localeCompare(right.time))
    .filter((bar) => {
      if (fromDate && bar.time < fromDate) {
        return false;
      }

      if (toDate && bar.time > toDate) {
        return false;
      }

      return true;
    })
    .filter((bar, index, allBars) => index === 0 || allBars[index - 1]?.time !== bar.time)
    .map((bar) => ({
      time: new Date(`${bar.time}T00:00:00+05:30`).getTime(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));

  return {
    bars,
    meta: {
      noData: bars.length === 0,
    },
  };
}
