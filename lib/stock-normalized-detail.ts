import { cache } from "react";

import { resolveCanonicalStockBySlug } from "@/lib/canonical-stock-resolver";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import {
  classifyStockFreshness,
  isAcceptedProviderNoDataSymbol,
  resolveIndianTradingDatePolicy,
  type StockFreshnessReasonCategory,
} from "@/lib/stock-freshness-policy";
import { createSupabaseReadClient } from "@/lib/supabase/admin";
import { withDevelopmentTiming } from "@/lib/supabase/shared";

type JsonRecord = Record<string, unknown>;
type QueryResult<TData, TError extends { message: string } | null = { message: string } | null> = {
  data: TData;
  error: TError;
};
type CountQueryResult = { count: number | null; error: { message: string } | null };
type QueryFactory<T> = PromiseLike<T> | (() => PromiseLike<T>);

export type NormalizedStockPricePoint = {
  tradeDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
  importedAt: string | null;
};

export type NormalizedStockSnapshot = {
  tradeDate: string | null;
  snapshotAt: string | null;
  importedAt: string | null;
  sourceName: string | null;
  price: number | null;
  previousClose: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  changeAbsolute: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
};

export type NormalizedStockMetrics = {
  pe: number | null;
  eps: number | null;
  marketCap: number | null;
  bookValue: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
};

export type NormalizedStatementRow = {
  periodLabel: string;
  fiscalDate: string;
  fields: Record<string, number | null>;
};

export type NormalizedCorporateActionRow = {
  date: string;
  label: string;
  amount: number | null;
  details: string | null;
};

export type NormalizedHolderRow = {
  name: string;
  holderType: string;
  percentOut: number | null;
  sharesHeld: number | null;
  valueHeld: number | null;
  asOfDate: string;
};

export type NormalizedStockNewsRow = {
  id: string;
  title: string;
  publisher: string | null;
  summary: string | null;
  linkUrl: string | null;
  publishedAt: string;
};

export type NormalizedStockRiddraScores = {
  overall: number | null;
  valuation: number | null;
  growth: number | null;
  profitability: number | null;
  risk: number | null;
  note: string;
};

export type NormalizedStockPerformance = {
  sevenDay: number | null;
  oneMonth: number | null;
  threeMonth: number | null;
  sixMonth: number | null;
  oneYear: number | null;
  fiveYear: number | null;
  ytd: number | null;
  fiveYearCagr: number | null;
  fromWeek52High: number | null;
  fromWeek52Low: number | null;
};

export type NormalizedStockDataStatus = {
  historicalRowCount: number;
  historicalFirstDate: string | null;
  historicalLastDate: string | null;
  latestSnapshotStatus: "available" | "missing";
  latestSnapshotTradeDate: string | null;
  expectedTradingDate: string | null;
  evaluationDate: string | null;
  reasonCategory: StockFreshnessReasonCategory;
  marketSessionState: string | null;
  isStale: boolean;
  acceptedProviderException: boolean;
  lastSuccessfulImportAt: string | null;
};

export type NormalizedStockDetailData = {
  stockId: string;
  slug: string;
  symbol: string;
  exchange: string | null;
  companyName: string;
  yahooSymbol: string | null;
  sector: string | null;
  industry: string | null;
  latestSnapshot: NormalizedStockSnapshot | null;
  priceHistory: NormalizedStockPricePoint[];
  keyStatistics: NormalizedStockMetrics;
  performance: NormalizedStockPerformance;
  financials: {
    annual: {
      incomeStatement: NormalizedStatementRow[];
      balanceSheet: NormalizedStatementRow[];
      cashFlow: NormalizedStatementRow[];
    };
    quarterly: {
      incomeStatement: NormalizedStatementRow[];
      balanceSheet: NormalizedStatementRow[];
      cashFlow: NormalizedStatementRow[];
    };
  };
  corporateActions: {
    dividends: NormalizedCorporateActionRow[];
    splits: NormalizedCorporateActionRow[];
  };
  holders: {
    asOfDate: string | null;
    summary: {
      insiderPercentHeld: number | null;
      institutionPercentHeld: number | null;
      mutualFundPercentHeld: number | null;
      floatPercent: number | null;
      topInstitutionalPercent: number | null;
      topInsiderPercent: number | null;
    } | null;
    major: NormalizedHolderRow[];
    institutional: NormalizedHolderRow[];
    mutualFund: NormalizedHolderRow[];
  };
  news: NormalizedStockNewsRow[];
  riddraScores: NormalizedStockRiddraScores;
  dataStatus: NormalizedStockDataStatus;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

const warnedMissingOptionalTables = new Set<string>();
const unavailableOptionalTables = new Set<string>();
const NORMALIZED_STOCK_DETAIL_CACHE_TTL_MS = 120_000;
const SHOULD_LOG_OPTIONAL_TABLE_WARNINGS =
  process.env.NODE_ENV !== "production" ||
  process.env.RIDDRA_LOG_OPTIONAL_NORMALIZED_TABLES === "true";
type TimedCacheEntry<T> = { expiresAt: number; value: T };
const normalizedStockDetailCache = new Map<
  string,
  TimedCacheEntry<NormalizedStockDetailData | null>
>();
const OPTIONAL_STOCK_DETAIL_TABLES = new Set([
  "stock_company_profile",
  "stock_valuation_metrics",
  "stock_financial_highlights",
  "stock_performance_metrics",
  "stock_growth_metrics",
  "stock_health_ratios",
  "stock_riddra_scores",
  "stock_income_statement",
  "stock_balance_sheet",
  "stock_cash_flow",
  "stock_dividends",
  "stock_splits",
  "stock_holders_summary",
  "stock_holders_detail",
  "stock_news",
]);

function getOptionalStockDetailTableName(label: string) {
  const [tableName] = cleanString(label, 160).split(".");
  return OPTIONAL_STOCK_DETAIL_TABLES.has(tableName) ? tableName : null;
}

function isKnownUnavailableOptionalTable(label: string) {
  const tableName = getOptionalStockDetailTableName(label);
  return Boolean(tableName && unavailableOptionalTables.has(tableName));
}

function markOptionalTableUnavailable(label: string) {
  const tableName = getOptionalStockDetailTableName(label);
  if (tableName) {
    unavailableOptionalTables.add(tableName);
  }
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

function isMissingOptionalTableMessage(message: string | null | undefined) {
  const normalized = cleanString(message, 4000).toLowerCase();

  return (
    normalized.includes("could not find the table 'public.") ||
    normalized.includes('relation "public.') && normalized.includes('" does not exist')
  );
}

function logDurableReadFailure(
  kind: "single" | "rows" | "count",
  label: string,
  message: string,
) {
  if (isMissingOptionalTableMessage(message)) {
    markOptionalTableUnavailable(label);
    if (!SHOULD_LOG_OPTIONAL_TABLE_WARNINGS) {
      return;
    }

    const warningKey = `${kind}:${label}:${message}`;
    if (warnedMissingOptionalTables.has(warningKey)) {
      return;
    }

    warnedMissingOptionalTables.add(warningKey);
    console.warn("[stock-normalized-detail] optional durable table unavailable", {
      label,
      error: message,
    });
    return;
  }

  const logPayload = { label, error: message };
  if (kind === "single") {
    console.error("[stock-normalized-detail] durable read failed", logPayload);
    return;
  }

  if (kind === "count") {
    console.error("[stock-normalized-detail] durable count read failed", logPayload);
    return;
  }

  console.error("[stock-normalized-detail] durable row read failed", logPayload);
}

async function resolveQuery<T>(query: QueryFactory<T>) {
  if (typeof query === "function") {
    return query();
  }

  return query;
}

async function safeMaybeSingle(
  label: string,
  query: QueryFactory<QueryResult<unknown>>,
) {
  if (isKnownUnavailableOptionalTable(label)) {
    return null;
  }

  try {
    const { data, error } = await resolveQuery(query);
    if (error) {
      logDurableReadFailure("single", label, error.message);
      return null;
    }
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingOptionalTableMessage(message)) {
      logDurableReadFailure("single", label, message);
      return null;
    }
    console.error("[stock-normalized-detail] durable read threw", {
      label,
      error: message,
    });
    return null;
  }
}

async function safeRows(
  label: string,
  query: QueryFactory<QueryResult<unknown>>,
) {
  if (isKnownUnavailableOptionalTable(label)) {
    return [] as JsonRecord[];
  }

  try {
    const { data, error } = await resolveQuery(query);
    if (error) {
      logDurableReadFailure("rows", label, error.message);
      return [] as JsonRecord[];
    }
    return Array.isArray(data) ? (data as JsonRecord[]) : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingOptionalTableMessage(message)) {
      logDurableReadFailure("rows", label, message);
      return [] as JsonRecord[];
    }
    console.error("[stock-normalized-detail] durable row read threw", {
      label,
      error: message,
    });
    return [] as JsonRecord[];
  }
}

async function safeCount(
  label: string,
  query: QueryFactory<CountQueryResult>,
) {
  if (isKnownUnavailableOptionalTable(label)) {
    return null;
  }

  try {
    const { count, error } = await resolveQuery(query);
    if (error) {
      logDurableReadFailure("count", label, error.message);
      return null;
    }
    return typeof count === "number" && Number.isFinite(count) ? count : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingOptionalTableMessage(message)) {
      logDurableReadFailure("count", label, message);
      return null;
    }
    console.error("[stock-normalized-detail] durable count read threw", {
      label,
      error: message,
    });
    return null;
  }
}

function formatPeriodLabel(value: string | null, index: number) {
  const date = cleanString(value, 40);
  if (!date) {
    return `Period ${index + 1}`;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function computeReturn(latest: number | null, previous: number | null) {
  if (latest === null || previous === null || previous === 0) {
    return null;
  }
  return ((latest - previous) / previous) * 100;
}

function parseIsoDate(value: string | null | undefined) {
  const normalized = cleanString(value, 40);
  if (!normalized) {
    return null;
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shiftIsoDate(
  value: string,
  input: {
    days?: number;
    months?: number;
    years?: number;
  },
) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  parsed.setUTCDate(parsed.getUTCDate() + (input.days ?? 0));
  parsed.setUTCMonth(parsed.getUTCMonth() + (input.months ?? 0));
  parsed.setUTCFullYear(parsed.getUTCFullYear() + (input.years ?? 0));

  return parsed.toISOString().slice(0, 10);
}

function findPointOnOrBefore(points: NormalizedStockPricePoint[], targetDate: string) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point && point.tradeDate <= targetDate) {
      return point;
    }
  }
  return null;
}

function computeReturnFromCalendarWindow(
  points: NormalizedStockPricePoint[],
  input: {
    days?: number;
    months?: number;
    years?: number;
  },
) {
  const latestPoint = points[points.length - 1];
  if (!latestPoint?.tradeDate) {
    return null;
  }

  const targetDate = shiftIsoDate(latestPoint.tradeDate, {
    days: -(input.days ?? 0),
    months: -(input.months ?? 0),
    years: -(input.years ?? 0),
  });
  const referencePoint = findPointOnOrBefore(points, targetDate);
  return computeReturn(latestPoint.close ?? null, referencePoint?.close ?? null);
}

function computeYtdReturn(points: NormalizedStockPricePoint[]) {
  if (!points.length) {
    return null;
  }

  const latest = points[points.length - 1];
  const latestYear = new Date(`${latest.tradeDate}T00:00:00Z`).getUTCFullYear();
  const firstThisYear = points.find((point) => {
    const year = new Date(`${point.tradeDate}T00:00:00Z`).getUTCFullYear();
    return year === latestYear;
  });

  return computeReturn(latest.close ?? null, firstThisYear?.close ?? null);
}

function computeFiveYearCagr(points: NormalizedStockPricePoint[]) {
  const latestPoint = points[points.length - 1];
  if (!latestPoint?.tradeDate || latestPoint.close === null) {
    return null;
  }

  const targetDate = shiftIsoDate(latestPoint.tradeDate, { years: -5 });
  const fiveYearStartPoint = findPointOnOrBefore(points, targetDate);
  const latest = latestPoint.close;
  const fiveYearStart = fiveYearStartPoint?.close ?? null;
  if (fiveYearStart === null || fiveYearStart <= 0) {
    return null;
  }

  return (Math.pow(latest / fiveYearStart, 1 / 5) - 1) * 100;
}

function maxIsoDate(...values: Array<string | null | undefined>) {
  return values
    .map((value) => cleanString(value, 120) || null)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function buildStatementRows(rows: JsonRecord[], fieldKeys: string[]) {
  return rows.map((row, index) => ({
    periodLabel: formatPeriodLabel(cleanString(row.fiscal_date, 40) || null, index),
    fiscalDate: cleanString(row.fiscal_date, 40),
    fields: Object.fromEntries(fieldKeys.map((fieldKey) => [fieldKey, safeNumber(row[fieldKey])])),
  }));
}

function clampScore(value: number | null) {
  if (value === null) {
    return null;
  }
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function deriveProfitabilityScore(input: {
  healthRatios: JsonRecord | null;
  financialHighlights: JsonRecord | null;
}) {
  const healthRatios = normalizeRecord(input.healthRatios);
  const financialHighlights = normalizeRecord(input.financialHighlights);
  const components = [
    safeNumber(healthRatios.roe),
    safeNumber(healthRatios.roce),
    safeNumber(healthRatios.net_margin),
    safeNumber(healthRatios.operating_margin),
    safeNumber(financialHighlights.return_on_equity),
  ].filter((value): value is number => value !== null);

  if (!components.length) {
    return null;
  }

  const normalized = components.map((value) => {
    if (value >= 30) return 100;
    if (value >= 20) return 85;
    if (value >= 12) return 70;
    if (value >= 6) return 55;
    if (value >= 0) return 40;
    return 20;
  });

  return clampScore(normalized.reduce((sum, value) => sum + value, 0) / normalized.length);
}

function deriveRiskScore(input: {
  performanceMetrics: JsonRecord | null;
  healthRatios: JsonRecord | null;
}) {
  const performanceMetrics = normalizeRecord(input.performanceMetrics);
  const healthRatios = normalizeRecord(input.healthRatios);
  const values: number[] = [];

  const volatility = safeNumber(performanceMetrics.volatility_1y);
  if (volatility !== null) {
    values.push(
      volatility <= 0.2 ? 90 : volatility <= 0.3 ? 75 : volatility <= 0.45 ? 60 : 40,
    );
  }

  const drawdown = safeNumber(performanceMetrics.drawdown_52w);
  if (drawdown !== null) {
    const absoluteDrawdown = Math.abs(drawdown);
    values.push(
      absoluteDrawdown <= 10 ? 90 : absoluteDrawdown <= 20 ? 75 : absoluteDrawdown <= 35 ? 60 : 40,
    );
  }

  const debtToEquity = safeNumber(healthRatios.debt_to_equity);
  if (debtToEquity !== null) {
    values.push(debtToEquity <= 0.5 ? 90 : debtToEquity <= 1 ? 75 : debtToEquity <= 2 ? 55 : 35);
  }

  const currentRatio = safeNumber(healthRatios.current_ratio);
  if (currentRatio !== null) {
    values.push(currentRatio >= 1.5 ? 85 : currentRatio >= 1.1 ? 70 : currentRatio >= 0.9 ? 55 : 35);
  }

  if (!values.length) {
    return null;
  }

  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function deriveGrowthScore(growthMetrics: JsonRecord | null, fallback: number | null) {
  if (fallback !== null) {
    return clampScore(fallback);
  }

  const growth = normalizeRecord(growthMetrics);
  const values = [
    safeNumber(growth.revenue_growth_yoy),
    safeNumber(growth.net_income_growth_yoy),
    safeNumber(growth.eps_growth_yoy),
    safeNumber(growth.ebitda_growth_yoy),
  ].filter((value): value is number => value !== null);

  if (!values.length) {
    return null;
  }

  const normalized = values.map((value) => {
    if (value >= 25) return 90;
    if (value >= 15) return 75;
    if (value >= 8) return 65;
    if (value >= 0) return 50;
    return 30;
  });

  return clampScore(normalized.reduce((sum, value) => sum + value, 0) / normalized.length);
}

export const getNormalizedStockDetailData = cache(
  async (slug: string): Promise<NormalizedStockDetailData | null> => {
    return withDevelopmentTiming(`getNormalizedStockDetailData(${cleanString(slug, 160)})`, async () => {
      const normalizedSlug = cleanString(slug, 160).toLowerCase();
      const cached = normalizedSlug
        ? readTimedCache(normalizedStockDetailCache, normalizedSlug)
        : null;
      if (cached !== null) {
        return cached;
      }

      try {
        if (!hasRuntimeSupabaseEnv()) {
          return null;
        }

        const supabase = createSupabaseReadClient();
        const canonicalStock = await resolveCanonicalStockBySlug(cleanString(slug, 160)).catch(
          (error) => {
            console.error("[stock-normalized-detail] canonical resolver failed", {
              slug,
              error,
            });
            return null;
          },
        );
        const canonicalStockId = cleanString(canonicalStock?.stocksMasterId, 160);
        const canonicalSlug = cleanString(canonicalStock?.slug, 160);
        const stockMasterRaw = await safeMaybeSingle(
          "stocks_master",
          canonicalStockId
            ? supabase
                .from("stocks_master")
                .select("id, slug, symbol, exchange, company_name, yahoo_symbol, metadata")
                .eq("id", canonicalStockId)
                .limit(1)
                .maybeSingle()
            : supabase
                .from("stocks_master")
                .select("id, slug, symbol, exchange, company_name, yahoo_symbol, metadata")
                .eq("slug", canonicalSlug || cleanString(slug, 160))
                .limit(1)
                .maybeSingle(),
        );

        if (!stockMasterRaw) {
          return null;
        }

        const stockMaster = normalizeRecord(stockMasterRaw);
        const stockId = cleanString(stockMaster.id, 160);
        if (!stockId) {
          return null;
        }

        const [
          profileRows,
          snapshotRows,
          valuationRows,
          financialHighlightRows,
          performanceMetricRows,
          growthMetricRows,
          healthRatioRows,
          riddraScoreRows,
          priceHistoryRowsDesc,
          priceHistoryOldestRows,
          priceHistoryExactCount,
          annualIncomeRows,
          quarterlyIncomeRows,
          annualBalanceRows,
          quarterlyBalanceRows,
          annualCashRows,
          quarterlyCashRows,
          dividendRows,
          splitRows,
          holderSummaryRows,
          holderDetailRows,
          newsRows,
        ] = await Promise.all([
          safeRows(
            "stock_company_profile",
            () =>
              supabase
                .from("stock_company_profile")
                .select("company_name, sector, industry")
                .eq("stock_id", stockId)
                .order("profile_date", { ascending: false })
                .order("imported_at", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_market_snapshot",
            supabase
              .from("stock_market_snapshot")
              .select(
                "trade_date, snapshot_at, imported_at, source_name, price, previous_close, open, day_high, day_low, change_absolute, change_percent, volume, market_cap",
              )
              .eq("stock_id", stockId)
              .order("trade_date", { ascending: false })
              .order("snapshot_at", { ascending: false })
              .limit(1),
          ),
          safeRows(
            "stock_valuation_metrics",
            () =>
              supabase
                .from("stock_valuation_metrics")
                .select("trailing_pe, trailing_eps, market_cap, price_to_book, dividend_yield")
                .eq("stock_id", stockId)
                .order("trade_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_financial_highlights",
            () =>
              supabase
                .from("stock_financial_highlights")
                .select("fiscal_date, diluted_eps, book_value_per_share, return_on_equity")
                .eq("stock_id", stockId)
                .order("fiscal_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_performance_metrics",
            () =>
              supabase
                .from("stock_performance_metrics")
                .select(
                  "trade_date, return_1m, return_3m, return_6m, return_1y, volatility_1y, drawdown_52w",
                )
                .eq("stock_id", stockId)
                .order("trade_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_growth_metrics",
            () =>
              supabase
                .from("stock_growth_metrics")
                .select(
                  "fiscal_date, revenue_growth_yoy, net_income_growth_yoy, eps_growth_yoy, ebitda_growth_yoy",
                )
                .eq("stock_id", stockId)
                .order("fiscal_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_health_ratios",
            () =>
              supabase
                .from("stock_health_ratios")
                .select(
                  "fiscal_date, roe, roce, net_margin, operating_margin, debt_to_equity, current_ratio",
                )
                .eq("stock_id", stockId)
                .order("fiscal_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_riddra_scores",
            () =>
              supabase
                .from("stock_riddra_scores")
                .select("trade_date, valuation_score, growth_score, r_score")
                .eq("stock_id", stockId)
                .order("trade_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_price_history",
            supabase
              .from("stock_price_history")
              .select("trade_date, open, high, low, close, adj_close, volume, imported_at")
              .eq("stock_id", stockId)
              .eq("interval_type", "1d")
              .order("trade_date", { ascending: false })
              .limit(2600),
          ),
          safeRows(
            "stock_price_history.oldest",
            supabase
              .from("stock_price_history")
              .select("trade_date")
              .eq("stock_id", stockId)
              .eq("interval_type", "1d")
              .order("trade_date", { ascending: true })
              .limit(1),
          ),
          safeCount(
            "stock_price_history.count",
            supabase
              .from("stock_price_history")
              .select("stock_id", { count: "exact", head: true })
              .eq("stock_id", stockId)
              .eq("interval_type", "1d"),
          ),
          safeRows(
            "stock_income_statement.annual",
            () =>
              supabase
                .from("stock_income_statement")
                .select(
                  "fiscal_date, total_revenue, gross_profit, operating_income, net_income, basic_eps",
                )
                .eq("stock_id", stockId)
                .eq("period_type", "annual")
                .order("fiscal_date", { ascending: false })
                .limit(4),
          ),
          safeRows(
            "stock_income_statement.quarterly",
            () =>
              supabase
                .from("stock_income_statement")
                .select(
                  "fiscal_date, total_revenue, gross_profit, operating_income, net_income, basic_eps",
                )
                .eq("stock_id", stockId)
                .eq("period_type", "quarterly")
                .order("fiscal_date", { ascending: false })
                .limit(4),
          ),
          safeRows(
            "stock_balance_sheet.annual",
            () =>
              supabase
                .from("stock_balance_sheet")
                .select(
                  "fiscal_date, total_assets, total_liabilities, stockholders_equity, cash_and_equivalents, long_term_debt",
                )
                .eq("stock_id", stockId)
                .eq("period_type", "annual")
                .order("fiscal_date", { ascending: false })
                .limit(4),
          ),
          safeRows(
            "stock_balance_sheet.quarterly",
            () =>
              supabase
                .from("stock_balance_sheet")
                .select(
                  "fiscal_date, total_assets, total_liabilities, stockholders_equity, cash_and_equivalents, long_term_debt",
                )
                .eq("stock_id", stockId)
                .eq("period_type", "quarterly")
                .order("fiscal_date", { ascending: false })
                .limit(4),
          ),
          safeRows(
            "stock_cash_flow.annual",
            () =>
              supabase
                .from("stock_cash_flow")
                .select(
                  "fiscal_date, operating_cash_flow, investing_cash_flow, financing_cash_flow, capital_expenditure, free_cash_flow",
                )
                .eq("stock_id", stockId)
                .eq("period_type", "annual")
                .order("fiscal_date", { ascending: false })
                .limit(4),
          ),
          safeRows(
            "stock_cash_flow.quarterly",
            () =>
              supabase
                .from("stock_cash_flow")
                .select(
                  "fiscal_date, operating_cash_flow, investing_cash_flow, financing_cash_flow, capital_expenditure, free_cash_flow",
                )
                .eq("stock_id", stockId)
                .eq("period_type", "quarterly")
                .order("fiscal_date", { ascending: false })
                .limit(4),
          ),
          safeRows(
            "stock_dividends",
            () =>
              supabase
                .from("stock_dividends")
                .select("ex_dividend_date, dividend_amount, frequency, dividend_type")
                .eq("stock_id", stockId)
                .order("ex_dividend_date", { ascending: false })
                .limit(8),
          ),
          safeRows(
            "stock_splits",
            () =>
              supabase
                .from("stock_splits")
                .select("split_date, split_ratio_text")
                .eq("stock_id", stockId)
                .order("split_date", { ascending: false })
                .limit(8),
          ),
          safeRows(
            "stock_holders_summary",
            () =>
              supabase
                .from("stock_holders_summary")
                .select(
                  "as_of_date, insider_percent_held, institution_percent_held, mutual_fund_percent_held, float_percent, top_institutional_percent, top_insider_percent",
                )
                .eq("stock_id", stockId)
                .order("as_of_date", { ascending: false })
                .limit(1),
          ),
          safeRows(
            "stock_holders_detail",
            () =>
              supabase
                .from("stock_holders_detail")
                .select("holder_type, holder_name, percent_out, shares_held, value_held, as_of_date, rank")
                .eq("stock_id", stockId)
                .order("as_of_date", { ascending: false })
                .order("rank", { ascending: true })
                .limit(40),
          ),
          safeRows(
            "stock_news",
            () =>
              supabase
                .from("stock_news")
                .select("id, title, publisher, provider_name, summary, link_url, published_at")
                .eq("stock_id", stockId)
                .order("published_at", { ascending: false })
                .limit(6),
          ),
        ]);

        const profile = normalizeRecord(profileRows[0]);
        const snapshot = normalizeRecord(snapshotRows[0]);
        const valuation = normalizeRecord(valuationRows[0]);
        const financialHighlights = normalizeRecord(financialHighlightRows[0]);
        const performanceMetrics = normalizeRecord(performanceMetricRows[0]);
        const growthMetrics = normalizeRecord(growthMetricRows[0]);
        const healthRatios = normalizeRecord(healthRatioRows[0]);
        const riddraScores = normalizeRecord(riddraScoreRows[0]);

        const priceHistory = [...priceHistoryRowsDesc]
          .reverse()
          .map((row) => ({
            tradeDate: cleanString(row.trade_date, 40),
            open: safeNumber(row.open),
            high: safeNumber(row.high),
            low: safeNumber(row.low),
            close: safeNumber(row.close),
            adjustedClose: safeNumber(row.adj_close),
            volume: safeNumber(row.volume),
            importedAt: cleanString(row.imported_at, 120) || null,
          }))
          .filter((row) => row.tradeDate);

        const oldestHistoryRow = normalizeRecord(priceHistoryOldestRows[0]);
        const historicalFirstDate =
          cleanString(oldestHistoryRow.trade_date, 40) || priceHistory[0]?.tradeDate || null;
        const historicalLastDate = priceHistory[priceHistory.length - 1]?.tradeDate ?? null;
        const historicalRowCount = priceHistoryExactCount ?? priceHistory.length;

        const oneYearWindow = priceHistory.length > 252 ? priceHistory.slice(-252) : priceHistory;
        const week52High = oneYearWindow.length
          ? Math.max(
              ...oneYearWindow
                .map((point) => point.high ?? Number.NEGATIVE_INFINITY)
                .filter(Number.isFinite),
            )
          : null;
        const week52Low = oneYearWindow.length
          ? Math.min(
              ...oneYearWindow
                .map((point) => point.low ?? Number.POSITIVE_INFINITY)
                .filter(Number.isFinite),
            )
          : null;

        const latestClose = priceHistory[priceHistory.length - 1]?.close ?? null;
        const latestSnapshot: NormalizedStockSnapshot | null =
          snapshotRows.length || latestClose !== null
            ? {
                tradeDate:
                  cleanString(snapshot.trade_date, 40) ||
                  priceHistory[priceHistory.length - 1]?.tradeDate ||
                  null,
                snapshotAt: cleanString(snapshot.snapshot_at, 120) || null,
                importedAt: cleanString(snapshot.imported_at, 120) || null,
                sourceName: cleanString(snapshot.source_name, 160) || null,
                price: safeNumber(snapshot.price) ?? latestClose,
                previousClose: safeNumber(snapshot.previous_close),
                open: safeNumber(snapshot.open),
                dayHigh: safeNumber(snapshot.day_high),
                dayLow: safeNumber(snapshot.day_low),
                changeAbsolute: safeNumber(snapshot.change_absolute),
                changePercent: safeNumber(snapshot.change_percent),
                volume: safeNumber(snapshot.volume),
                marketCap: safeNumber(snapshot.market_cap),
              }
            : null;

        const derivedProfitabilityScore = deriveProfitabilityScore({
          healthRatios,
          financialHighlights,
        });
        const derivedRiskScore = deriveRiskScore({
          performanceMetrics,
          healthRatios,
        });
        const valuationScore = clampScore(safeNumber(riddraScores.valuation_score));
        const growthScore = deriveGrowthScore(growthMetrics, safeNumber(riddraScores.growth_score));
        const overallScore = clampScore(safeNumber(riddraScores.r_score));
        const profitabilityScore = clampScore(derivedProfitabilityScore);
        const riskScore = clampScore(derivedRiskScore);
        const availableScoreValues = [
          overallScore,
          valuationScore,
          growthScore,
          profitabilityScore,
          riskScore,
        ].filter((value): value is number => value !== null);

        const normalizedOverallScore =
          overallScore ??
          (availableScoreValues.length
            ? clampScore(
                availableScoreValues.reduce((sum, value) => sum + value, 0) /
                  availableScoreValues.length,
              )
            : null);

        const holderSummary = normalizeRecord(holderSummaryRows[0]);
        const latestHolderDate =
          cleanString(holderSummary.as_of_date, 40) ||
          cleanString(holderDetailRows[0]?.as_of_date, 40) ||
          null;
        const filteredHolderDetails = latestHolderDate
          ? holderDetailRows.filter((row) => cleanString(row.as_of_date, 40) === latestHolderDate)
          : holderDetailRows;

        const tradingDatePolicy = resolveIndianTradingDatePolicy({
          globalLatestTradingDate: historicalLastDate || latestSnapshot?.tradeDate || null,
        });
        const freshnessClassification = classifyStockFreshness({
          yahooSymbol: cleanString(stockMaster.yahoo_symbol, 160) || null,
          expectedTradingDate: tradingDatePolicy.expectedTradingDate,
          policyReason: tradingDatePolicy.policyReason,
          hasExpectedPrice: historicalLastDate === tradingDatePolicy.expectedTradingDate,
          hasExpectedSnapshot: latestSnapshot?.tradeDate === tradingDatePolicy.expectedTradingDate,
          lastPriceDate: historicalLastDate,
          lastSnapshotDate: latestSnapshot?.tradeDate ?? null,
        });
        const lastSuccessfulImportAt = maxIsoDate(
          latestSnapshot?.importedAt,
          priceHistoryRowsDesc[0] ? cleanString(priceHistoryRowsDesc[0]?.imported_at, 120) : null,
          latestSnapshot?.snapshotAt,
        );

        const mapHolderRows = (holderType: string) =>
          filteredHolderDetails
            .filter((row) => cleanString(row.holder_type, 160) === holderType)
            .slice(0, 6)
            .map((row) => ({
              name: cleanString(row.holder_name, 240),
              holderType,
              percentOut: safeNumber(row.percent_out),
              sharesHeld: safeNumber(row.shares_held),
              valueHeld: safeNumber(row.value_held),
              asOfDate: cleanString(row.as_of_date, 40),
            }));

        const payload = {
          stockId,
          slug: cleanString(stockMaster.slug, 160),
          symbol: cleanString(stockMaster.symbol, 160),
          exchange: cleanString(stockMaster.exchange, 120) || null,
          companyName:
            cleanString(profile.company_name, 240) ||
            cleanString(stockMaster.company_name, 240) ||
            cleanString(stockMaster.symbol, 160),
          yahooSymbol: cleanString(stockMaster.yahoo_symbol, 160) || null,
          sector:
            cleanString(profile.sector, 240) ||
            cleanString(normalizeRecord(stockMaster.metadata).sector, 240) ||
            null,
          industry:
            cleanString(profile.industry, 240) ||
            cleanString(normalizeRecord(stockMaster.metadata).industry, 240) ||
            null,
          latestSnapshot,
          priceHistory,
          keyStatistics: {
            pe: safeNumber(valuation.trailing_pe),
            eps:
              safeNumber(valuation.trailing_eps) ??
              safeNumber(financialHighlights.diluted_eps),
            marketCap: safeNumber(valuation.market_cap) ?? safeNumber(snapshot.market_cap),
            bookValue: safeNumber(financialHighlights.book_value_per_share),
            priceToBook: safeNumber(valuation.price_to_book),
            dividendYield: safeNumber(valuation.dividend_yield),
            week52High: Number.isFinite(week52High ?? NaN) ? week52High : null,
            week52Low: Number.isFinite(week52Low ?? NaN) ? week52Low : null,
          },
          performance: {
            sevenDay: computeReturnFromCalendarWindow(priceHistory, { days: 7 }),
            oneMonth:
              safeNumber(performanceMetrics.return_1m) ??
              computeReturnFromCalendarWindow(priceHistory, { months: 1 }),
            threeMonth:
              safeNumber(performanceMetrics.return_3m) ??
              computeReturnFromCalendarWindow(priceHistory, { months: 3 }),
            sixMonth:
              safeNumber(performanceMetrics.return_6m) ??
              computeReturnFromCalendarWindow(priceHistory, { months: 6 }),
            oneYear:
              safeNumber(performanceMetrics.return_1y) ??
              computeReturnFromCalendarWindow(priceHistory, { years: 1 }),
            fiveYear: computeReturnFromCalendarWindow(priceHistory, { years: 5 }),
            ytd: computeYtdReturn(priceHistory),
            fiveYearCagr: computeFiveYearCagr(priceHistory),
            fromWeek52High: computeReturn(latestClose, week52High),
            fromWeek52Low: computeReturn(latestClose, week52Low),
          },
          financials: {
            annual: {
              incomeStatement: buildStatementRows(annualIncomeRows, [
                "total_revenue",
                "gross_profit",
                "operating_income",
                "net_income",
                "basic_eps",
              ]),
              balanceSheet: buildStatementRows(annualBalanceRows, [
                "total_assets",
                "total_liabilities",
                "stockholders_equity",
                "cash_and_equivalents",
                "long_term_debt",
              ]),
              cashFlow: buildStatementRows(annualCashRows, [
                "operating_cash_flow",
                "investing_cash_flow",
                "financing_cash_flow",
                "capital_expenditure",
                "free_cash_flow",
              ]),
            },
            quarterly: {
              incomeStatement: buildStatementRows(quarterlyIncomeRows, [
                "total_revenue",
                "gross_profit",
                "operating_income",
                "net_income",
                "basic_eps",
              ]),
              balanceSheet: buildStatementRows(quarterlyBalanceRows, [
                "total_assets",
                "total_liabilities",
                "stockholders_equity",
                "cash_and_equivalents",
                "long_term_debt",
              ]),
              cashFlow: buildStatementRows(quarterlyCashRows, [
                "operating_cash_flow",
                "investing_cash_flow",
                "financing_cash_flow",
                "capital_expenditure",
                "free_cash_flow",
              ]),
            },
          },
          corporateActions: {
            dividends: dividendRows.map((row) => ({
              date: cleanString(row.ex_dividend_date, 40),
              label: "Dividend",
              amount: safeNumber(row.dividend_amount),
              details:
                cleanString(row.frequency, 120) ||
                cleanString(row.dividend_type, 120) ||
                null,
            })),
            splits: splitRows.map((row) => ({
              date: cleanString(row.split_date, 40),
              label: "Split",
              amount: null,
              details: cleanString(row.split_ratio_text, 120) || null,
            })),
          },
          holders: {
            asOfDate: latestHolderDate,
            summary:
              holderSummaryRows.length > 0
                ? {
                    insiderPercentHeld: safeNumber(holderSummary.insider_percent_held),
                    institutionPercentHeld: safeNumber(holderSummary.institution_percent_held),
                    mutualFundPercentHeld: safeNumber(
                      holderSummary.mutual_fund_percent_held,
                    ),
                    floatPercent: safeNumber(holderSummary.float_percent),
                    topInstitutionalPercent: safeNumber(
                      holderSummary.top_institutional_percent,
                    ),
                    topInsiderPercent: safeNumber(holderSummary.top_insider_percent),
                  }
                : null,
            major: mapHolderRows("major"),
            institutional: mapHolderRows("institutional"),
            mutualFund: mapHolderRows("mutual_fund"),
          },
          news: newsRows.map((row) => ({
            id: cleanString(row.id, 160),
            title: cleanString(row.title, 400),
            publisher:
              cleanString(row.publisher, 240) ||
              cleanString(row.provider_name, 240) ||
              null,
            summary: cleanString(row.summary, 1200) || null,
            linkUrl: cleanString(row.link_url, 1000) || null,
            publishedAt: cleanString(row.published_at, 120),
          })),
          riddraScores: {
            overall: normalizedOverallScore,
            valuation: valuationScore,
            growth: growthScore,
            profitability: profitabilityScore,
            risk: riskScore,
            note:
              overallScore !== null
                ? "Uses stored Riddra score rows where available."
                : availableScoreValues.length
                ? "Uses stored normalized ratios to derive a fallback Riddra score view."
                  : "Riddra score data is not available yet for this stock.",
          },
          dataStatus: {
            historicalRowCount,
            historicalFirstDate,
            historicalLastDate,
            latestSnapshotStatus: latestSnapshot ? "available" : "missing",
            latestSnapshotTradeDate: latestSnapshot?.tradeDate ?? null,
            expectedTradingDate: tradingDatePolicy.expectedTradingDate,
            evaluationDate: tradingDatePolicy.evaluationDate,
            reasonCategory: freshnessClassification.reasonCategory,
            marketSessionState: tradingDatePolicy.marketSessionState,
            isStale: freshnessClassification.isStale,
            acceptedProviderException:
              freshnessClassification.reasonCategory === "provider_no_data" ||
              isAcceptedProviderNoDataSymbol(cleanString(stockMaster.yahoo_symbol, 160) || null),
            lastSuccessfulImportAt,
          },
        } satisfies NormalizedStockDetailData;
        if (normalizedSlug) {
          writeTimedCache(
            normalizedStockDetailCache,
            normalizedSlug,
            payload,
            NORMALIZED_STOCK_DETAIL_CACHE_TTL_MS,
          );
        }
        return payload;
      } catch (error) {
        console.error("[stock-normalized-detail] unable to build normalized stock detail payload", {
          slug,
          error,
        });
        if (normalizedSlug) {
          writeTimedCache(
            normalizedStockDetailCache,
            normalizedSlug,
            null,
            NORMALIZED_STOCK_DETAIL_CACHE_TTL_MS,
          );
        }
        return null;
      }
    });
  },
);
