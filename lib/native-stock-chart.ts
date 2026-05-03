import { resolveCanonicalStockBySlug } from "@/lib/canonical-stock-resolver";
import {
  buildActiveMarketDataRowQuarantineLookup,
  isMarketDataRowQuarantined,
  loadActiveMarketDataRowQuarantines,
  type MarketDataRowQuarantineLookup,
} from "@/lib/market-data-row-quarantine";
import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

export const STOCK_CHART_RANGES = [
  "1D",
  "7D",
  "1M",
  "6M",
  "1Y",
  "5Y",
  "MAX",
] as const;

export type StockChartRange = (typeof STOCK_CHART_RANGES)[number];
export type StockChartInterval = "1d";

type StockPriceHistoryRow = {
  id: string;
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adj_close: number | null;
  volume: number | null;
};

export type NativeStockChartPoint = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
};

export type NativeStockChartResponse = {
  ok: true;
  points: NativeStockChartPoint[];
  meta: {
    symbol: string | null;
    companyName: string | null;
    firstDate: string | null;
    lastDate: string | null;
    pointCount: number;
    source: "stock_price_history";
    range: StockChartRange;
    interval: StockChartInterval;
  };
};

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const HISTORY_SELECT =
  "id, trade_date, open, high, low, close, adj_close, volume";
const HISTORY_PAGE_SIZE = 1000;
const NATIVE_STOCK_CHART_CACHE_TTL_MS = 120_000;
const nativeStockChartResponseCache = new Map<string, TimedCacheEntry<NativeStockChartResponse>>();

function readTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string) {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function writeTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function getChartReadClient() {
  if (hasRuntimeSupabaseAdminEnv()) {
    return createSupabaseAdminClient();
  }

  return createSupabaseReadClient();
}

function normalizeRange(input: string | null | undefined): StockChartRange {
  const normalized = typeof input === "string" ? input.trim().toUpperCase() : "";
  if (STOCK_CHART_RANGES.includes(normalized as StockChartRange)) {
    return normalized as StockChartRange;
  }

  return "1Y";
}

function subtractFromDate(dateText: string, range: Exclude<StockChartRange, "1D" | "MAX">) {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (range === "7D") {
    date.setUTCDate(date.getUTCDate() - 6);
    return date.toISOString().slice(0, 10);
  }

  if (range === "1M") {
    date.setUTCMonth(date.getUTCMonth() - 1);
    return date.toISOString().slice(0, 10);
  }

  if (range === "6M") {
    date.setUTCMonth(date.getUTCMonth() - 6);
    return date.toISOString().slice(0, 10);
  }

  if (range === "1Y") {
    date.setUTCFullYear(date.getUTCFullYear() - 1);
    return date.toISOString().slice(0, 10);
  }

  date.setUTCFullYear(date.getUTCFullYear() - 5);
  return date.toISOString().slice(0, 10);
}

function toChartPoint(row: StockPriceHistoryRow): NativeStockChartPoint {
  return {
    date: row.trade_date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    adjustedClose: row.adj_close,
    volume: row.volume,
  };
}

function buildEmptyResponse(
  range: StockChartRange,
  interval: StockChartInterval,
  meta?: {
    symbol?: string | null;
    companyName?: string | null;
  },
): NativeStockChartResponse {
  return {
    ok: true,
    points: [],
    meta: {
      symbol: meta?.symbol ?? null,
      companyName: meta?.companyName ?? null,
      firstDate: null,
      lastDate: null,
      pointCount: 0,
      source: "stock_price_history",
      range,
      interval,
    },
  };
}

function buildResponseFromRows(
  rows: StockPriceHistoryRow[],
  input: {
    symbol: string | null;
    companyName: string | null;
    range: StockChartRange;
    interval: StockChartInterval;
  },
): NativeStockChartResponse {
  if (!rows.length) {
    return buildEmptyResponse(input.range, input.interval, {
      symbol: input.symbol,
      companyName: input.companyName,
    });
  }

  return {
    ok: true,
    points: rows.map(toChartPoint),
    meta: {
      symbol: input.symbol,
      companyName: input.companyName,
      firstDate: rows[0]?.trade_date ?? null,
      lastDate: rows[rows.length - 1]?.trade_date ?? null,
      pointCount: rows.length,
      source: "stock_price_history",
      range: input.range,
      interval: input.interval,
    },
  };
}

export function buildNativeStockChartResponseFromPoints(input: {
  symbol: string | null;
  companyName: string | null;
  range?: string | null;
  interval?: string | null;
  points: NativeStockChartPoint[];
}): NativeStockChartResponse {
  const range = normalizeRange(input.range);
  const interval: StockChartInterval = "1d";
  const sortedRows = [...input.points]
    .map((point) => ({
      id: point.date,
      trade_date: point.date,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      adj_close: point.adjustedClose,
      volume: point.volume,
    }))
    .filter((row) => row.trade_date)
    .sort((left, right) => left.trade_date.localeCompare(right.trade_date));

  if (!sortedRows.length) {
    return buildEmptyResponse(range, interval, {
      symbol: input.symbol,
      companyName: input.companyName,
    });
  }

  const latestRow = sortedRows[sortedRows.length - 1];
  let visibleRows = sortedRows;

  if (range === "1D") {
    visibleRows = [latestRow];
  } else if (range !== "MAX") {
    const cutoff = subtractFromDate(latestRow.trade_date, range);
    if (cutoff) {
      visibleRows = sortedRows.filter((row) => row.trade_date >= cutoff);
    }
  }

  return buildResponseFromRows(visibleRows, {
    symbol: input.symbol,
    companyName: input.companyName,
    range,
    interval,
  });
}

async function fetchAllPriceHistoryRows(
  stockId: string,
  interval: StockChartInterval,
) {
  const supabase = getChartReadClient();
  const rows: StockPriceHistoryRow[] = [];
  let from = 0;

  while (true) {
    const to = from + HISTORY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("stock_price_history")
      .select(HISTORY_SELECT)
      .eq("stock_id", stockId)
      .eq("interval_type", interval)
      .order("trade_date", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as StockPriceHistoryRow[];
    rows.push(...page);

    if (page.length < HISTORY_PAGE_SIZE) {
      break;
    }

    from += HISTORY_PAGE_SIZE;
  }

  return rows;
}

async function fetchLatestPriceHistoryRow(
  stockId: string,
  interval: StockChartInterval,
  quarantineLookup: MarketDataRowQuarantineLookup,
) {
  const supabase = getChartReadClient();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("stock_price_history")
      .select(HISTORY_SELECT)
      .eq("stock_id", stockId)
      .eq("interval_type", interval)
      .order("trade_date", { ascending: false })
      .range(from, from + HISTORY_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as StockPriceHistoryRow[];
    if (!page.length) {
      return null;
    }

    const safeRow = page.find(
      (row) =>
        !isMarketDataRowQuarantined(quarantineLookup, {
          rowId: row.id,
          stockId,
          rowDate: row.trade_date,
        }),
    );
    if (safeRow) {
      return safeRow;
    }

    if (page.length < HISTORY_PAGE_SIZE) {
      return null;
    }

    from += HISTORY_PAGE_SIZE;
  }
}

async function fetchPriceHistoryRowsSince(
  stockId: string,
  interval: StockChartInterval,
  cutoffDate: string,
) {
  const supabase = getChartReadClient();
  const rows: StockPriceHistoryRow[] = [];
  let from = 0;

  while (true) {
    const to = from + HISTORY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("stock_price_history")
      .select(HISTORY_SELECT)
      .eq("stock_id", stockId)
      .eq("interval_type", interval)
      .gte("trade_date", cutoffDate)
      .order("trade_date", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as StockPriceHistoryRow[];
    rows.push(...page);

    if (page.length < HISTORY_PAGE_SIZE) {
      break;
    }

    from += HISTORY_PAGE_SIZE;
  }

  return rows;
}

export async function getNativeStockChartData(input: {
  slug: string;
  range?: string | null;
  interval?: string | null;
}): Promise<NativeStockChartResponse> {
  const slug = input.slug.trim();
  const range = normalizeRange(input.range);
  const interval: StockChartInterval = "1d";
  const cacheKey = `${slug}|${range}|${interval}`;
  const cached = readTimedCache(nativeStockChartResponseCache, cacheKey);
  if (cached) {
    return cached;
  }

  const resolved = await resolveCanonicalStockBySlug(slug);
  if (!resolved?.stocksMasterId) {
    const empty = buildEmptyResponse(range, interval);
    writeTimedCache(nativeStockChartResponseCache, cacheKey, empty, NATIVE_STOCK_CHART_CACHE_TTL_MS);
    return empty;
  }

  const activeQuarantineRows = await loadActiveMarketDataRowQuarantines({
    tableName: "stock_price_history",
    stockIds: [resolved.stocksMasterId],
    limit: 200,
  });
  const quarantineLookup = buildActiveMarketDataRowQuarantineLookup(activeQuarantineRows);

  const latestRow = await fetchLatestPriceHistoryRow(
    resolved.stocksMasterId,
    interval,
    quarantineLookup,
  );
  if (!latestRow) {
    const empty = buildEmptyResponse(range, interval, {
      symbol: resolved.symbol,
      companyName: resolved.companyName,
    });
    writeTimedCache(nativeStockChartResponseCache, cacheKey, empty, NATIVE_STOCK_CHART_CACHE_TTL_MS);
    return empty;
  }

  let rows: StockPriceHistoryRow[];
  if (range === "1D") {
    rows = [latestRow];
  } else if (range === "MAX") {
    rows = await fetchAllPriceHistoryRows(resolved.stocksMasterId, interval);
  } else {
    const cutoff = subtractFromDate(latestRow.trade_date, range);
    rows = cutoff
      ? await fetchPriceHistoryRowsSince(resolved.stocksMasterId, interval, cutoff)
      : await fetchAllPriceHistoryRows(resolved.stocksMasterId, interval);
  }

  rows = rows.filter(
    (row) =>
      !isMarketDataRowQuarantined(quarantineLookup, {
        rowId: row.id,
        stockId: resolved.stocksMasterId,
        rowDate: row.trade_date,
      }),
  );

  if (!rows.length) {
    const empty = buildEmptyResponse(range, interval, {
      symbol: resolved.symbol,
      companyName: resolved.companyName,
    });
    writeTimedCache(nativeStockChartResponseCache, cacheKey, empty, NATIVE_STOCK_CHART_CACHE_TTL_MS);
    return empty;
  }

  const response = buildResponseFromRows(rows, {
    symbol: resolved.symbol,
    companyName: resolved.companyName,
    range,
    interval,
  });
  writeTimedCache(nativeStockChartResponseCache, cacheKey, response, NATIVE_STOCK_CHART_CACHE_TTL_MS);
  return response;
}
