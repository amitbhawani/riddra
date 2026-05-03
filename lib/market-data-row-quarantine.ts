import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

export type MarketDataRowQuarantineTableName =
  | "stock_price_history"
  | "stock_market_snapshot";

export type MarketDataRowQuarantineItem = {
  id: string;
  rowId: string | null;
  stockId: string | null;
  yahooSymbol: string | null;
  tableName: MarketDataRowQuarantineTableName;
  rowDate: string | null;
  reason: string;
  evidence: Record<string, unknown>;
  status: "active" | "resolved";
  createdAt: string | null;
  resolvedAt: string | null;
};

export type MarketDataRowQuarantineLookup = {
  rowIds: Set<string>;
  rowDatesByStockId: Map<string, Set<string>>;
};

const QUARANTINE_SELECT =
  "id, row_id, stock_id, yahoo_symbol, table_name, row_date, reason, evidence, status, created_at, resolved_at";
const QUARANTINE_PAGE_SIZE = 1000;
const QUARANTINE_STOCK_BATCH_SIZE = 250;
const QUARANTINE_CACHE_TTL_MS = 30_000;
let hasWarnedAboutMissingQuarantineTable = false;
type TimedCacheEntry<T> = { expiresAt: number; value: T };
const activeQuarantineCache = new Map<string, TimedCacheEntry<MarketDataRowQuarantineItem[]>>();

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeEvidence(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isMissingQuarantineTableError(error: { message?: string | null; code?: string | null }) {
  const code = cleanString(error.code, 120).toUpperCase();
  const message = cleanString(error.message, 4000).toLowerCase();

  return (
    code === "PGRST205" ||
    message.includes("could not find the table 'public.market_data_row_quarantine'") ||
    message.includes('relation "public.market_data_row_quarantine" does not exist')
  );
}

function warnOnceAboutMissingQuarantineTable() {
  if (hasWarnedAboutMissingQuarantineTable) {
    return;
  }

  hasWarnedAboutMissingQuarantineTable = true;
  console.warn(
    "market_data_row_quarantine is unavailable in the current runtime schema; quarantine-aware reads are temporarily bypassed until migration 0064 is live and PostgREST is reloaded.",
  );
}

function normalizeMarketDataRowQuarantineItem(
  row: JsonRecord,
): MarketDataRowQuarantineItem | null {
  const tableName = cleanString(row.table_name, 120);
  if (tableName !== "stock_price_history" && tableName !== "stock_market_snapshot") {
    return null;
  }

  const status = cleanString(row.status, 80);
  if (status !== "active" && status !== "resolved") {
    return null;
  }

  return {
    id: cleanString(row.id, 160),
    rowId: cleanString(row.row_id, 160) || null,
    stockId: cleanString(row.stock_id, 160) || null,
    yahooSymbol: cleanString(row.yahoo_symbol, 160) || null,
    tableName,
    rowDate: cleanString(row.row_date, 120) || null,
    reason: cleanString(row.reason, 4000) || "Unknown quarantine reason",
    evidence: normalizeEvidence(row.evidence),
    status,
    createdAt: cleanString(row.created_at, 160) || null,
    resolvedAt: cleanString(row.resolved_at, 160) || null,
  };
}

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

export async function loadActiveMarketDataRowQuarantines(input?: {
  tableName?: MarketDataRowQuarantineTableName;
  stockIds?: string[];
  limit?: number;
}) {
  if (!hasRuntimeSupabaseAdminEnv()) {
    return [] as MarketDataRowQuarantineItem[];
  }

  const supabase = createSupabaseAdminClient();
  const normalizedStockIds = Array.from(
    new Set(
      (input?.stockIds ?? [])
        .map((value) => cleanString(value, 160))
        .filter(Boolean),
    ),
  );
  const cacheKey = JSON.stringify({
    tableName: input?.tableName ?? null,
    stockIds: normalizedStockIds,
    limit: Math.max(0, Math.trunc(input?.limit ?? 5000)),
  });
  const cached = readTimedCache(activeQuarantineCache, cacheKey);
  if (cached) {
    return cached;
  }
  const stockIdBatches = normalizedStockIds.length
    ? Array.from(
        { length: Math.ceil(normalizedStockIds.length / QUARANTINE_STOCK_BATCH_SIZE) },
        (_, index) =>
          normalizedStockIds.slice(
            index * QUARANTINE_STOCK_BATCH_SIZE,
            index * QUARANTINE_STOCK_BATCH_SIZE + QUARANTINE_STOCK_BATCH_SIZE,
          ),
      )
    : [null];
  const rows: MarketDataRowQuarantineItem[] = [];
  const seenIds = new Set<string>();
  const maxRows = Math.max(0, Math.trunc(input?.limit ?? 5000));

  for (const stockIdBatch of stockIdBatches) {
    for (let from = 0; from < maxRows; from += QUARANTINE_PAGE_SIZE) {
      let query: any = supabase
        .from("market_data_row_quarantine")
        .select(QUARANTINE_SELECT)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, from + QUARANTINE_PAGE_SIZE - 1);

      if (input?.tableName) {
        query = query.eq("table_name", input.tableName);
      }

      if (stockIdBatch?.length) {
        query = query.in("stock_id", stockIdBatch);
      }

      const { data, error } = await query;
      if (error) {
        if (isMissingQuarantineTableError(error)) {
          warnOnceAboutMissingQuarantineTable();
          writeTimedCache(activeQuarantineCache, cacheKey, [], QUARANTINE_CACHE_TTL_MS);
          return [] as MarketDataRowQuarantineItem[];
        }
        throw new Error(`market_data_row_quarantine: ${error.message}`);
      }

      const page = Array.isArray(data) ? (data as JsonRecord[]) : [];
      if (!page.length) {
        break;
      }

      for (const row of page) {
        const normalized = normalizeMarketDataRowQuarantineItem(row);
        if (!normalized || seenIds.has(normalized.id)) {
          continue;
        }
        seenIds.add(normalized.id);
        rows.push(normalized);
        if (rows.length >= maxRows) {
          writeTimedCache(activeQuarantineCache, cacheKey, rows, QUARANTINE_CACHE_TTL_MS);
          return rows;
        }
      }

      if (page.length < QUARANTINE_PAGE_SIZE) {
        break;
      }
    }
  }

  writeTimedCache(activeQuarantineCache, cacheKey, rows, QUARANTINE_CACHE_TTL_MS);
  return rows;
}

export function buildActiveMarketDataRowQuarantineLookup(
  rows: MarketDataRowQuarantineItem[],
): MarketDataRowQuarantineLookup {
  const rowIds = new Set<string>();
  const rowDatesByStockId = new Map<string, Set<string>>();

  for (const row of rows) {
    if (row.rowId) {
      rowIds.add(row.rowId);
    }
    if (!row.stockId || !row.rowDate) {
      continue;
    }
    const bucket = rowDatesByStockId.get(row.stockId) ?? new Set<string>();
    bucket.add(row.rowDate);
    rowDatesByStockId.set(row.stockId, bucket);
  }

  return { rowIds, rowDatesByStockId };
}

export function isMarketDataRowQuarantined(
  lookup: MarketDataRowQuarantineLookup,
  input: {
    rowId?: string | null;
    stockId?: string | null;
    rowDate?: string | null;
  },
) {
  const normalizedRowId = cleanString(input.rowId, 160);
  if (normalizedRowId && lookup.rowIds.has(normalizedRowId)) {
    return true;
  }

  const normalizedStockId = cleanString(input.stockId, 160);
  const normalizedRowDate = cleanString(input.rowDate, 120);
  if (!normalizedStockId || !normalizedRowDate) {
    return false;
  }

  return lookup.rowDatesByStockId.get(normalizedStockId)?.has(normalizedRowDate) ?? false;
}
