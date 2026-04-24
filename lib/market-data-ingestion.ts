import type { MarketIngestMode, MarketSeriesType } from "@/lib/market-data-durable-store";
import {
  persistFundNavHistory,
  persistIndexSnapshotHistory,
  persistStockOhlcvHistory,
  persistStockQuoteHistory,
} from "@/lib/market-data-durable-store";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

type StockQuoteInput = {
  slug: string;
  source: string;
  sourceCode?: string;
  price: number;
  changePercent: number;
  lastUpdated: string;
};

type CandleInput = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type StockChartInput = {
  slug: string;
  source: string;
  sourceCode?: string;
  timeframe?: string;
  lastUpdated: string;
  bars: CandleInput[];
};

type FundNavInput = {
  slug: string;
  source: string;
  sourceCode?: string;
  nav: number;
  returns1Y?: number;
  navDate?: string;
  lastUpdated: string;
};

type IndexComponentInput = {
  symbol: string;
  name: string;
  weight: number;
  changePercent: number;
  contribution: number;
  signal?: string;
};

type IndexSnapshotInput = {
  slug: string;
  sourceCode?: string;
  source?: string;
  snapshotAt: string;
  sessionPhase?: string;
  movePercent: number;
  weightedBreadthScore: number;
  advancingCount: number;
  decliningCount: number;
  positiveWeightShare: number;
  negativeWeightShare: number;
  marketMood?: string;
  dominanceLabel?: string;
  trendLabel?: string;
  components: IndexComponentInput[];
  metadata?: Record<string, unknown>;
};

export type MarketDataIngestionPayload = {
  stockQuotes?: StockQuoteInput[];
  stockCharts?: StockChartInput[];
  fundNavs?: FundNavInput[];
  indexSnapshots?: IndexSnapshotInput[];
};

export type MarketDataIngestionFailure = {
  seriesType: MarketSeriesType;
  assetSlug: string;
  message: string;
};

export type MarketDataIngestionOptions = {
  triggerSource?: string;
  requestedBy?: string | null;
  taskIdentifier?: string | null;
  ingestMode?: MarketIngestMode;
};

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isCandleInput(value: unknown): value is CandleInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.time) &&
    isFiniteNumber(candidate.open) &&
    isFiniteNumber(candidate.high) &&
    isFiniteNumber(candidate.low) &&
    isFiniteNumber(candidate.close) &&
    (candidate.volume === undefined || isFiniteNumber(candidate.volume))
  );
}

function isStockQuoteInput(value: unknown): value is StockQuoteInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.slug) &&
    isNonEmptyString(candidate.source) &&
    (candidate.sourceCode === undefined || isNonEmptyString(candidate.sourceCode)) &&
    isFiniteNumber(candidate.price) &&
    isFiniteNumber(candidate.changePercent) &&
    isNonEmptyString(candidate.lastUpdated)
  );
}

function isStockChartInput(value: unknown): value is StockChartInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.slug) &&
    isNonEmptyString(candidate.source) &&
    (candidate.sourceCode === undefined || isNonEmptyString(candidate.sourceCode)) &&
    isNonEmptyString(candidate.lastUpdated) &&
    Array.isArray(candidate.bars) &&
    candidate.bars.length > 1 &&
    candidate.bars.every(isCandleInput)
  );
}

function isFundNavInput(value: unknown): value is FundNavInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.slug) &&
    isNonEmptyString(candidate.source) &&
    (candidate.sourceCode === undefined || isNonEmptyString(candidate.sourceCode)) &&
    isFiniteNumber(candidate.nav) &&
    (candidate.returns1Y === undefined || isFiniteNumber(candidate.returns1Y)) &&
    (candidate.navDate === undefined || isNonEmptyString(candidate.navDate)) &&
    isNonEmptyString(candidate.lastUpdated)
  );
}

function isIndexComponentInput(value: unknown): value is IndexComponentInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.symbol) &&
    isNonEmptyString(candidate.name) &&
    isFiniteNumber(candidate.weight) &&
    isFiniteNumber(candidate.changePercent) &&
    isFiniteNumber(candidate.contribution)
  );
}

function isIndexSnapshotInput(value: unknown): value is IndexSnapshotInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.slug) &&
    isNonEmptyString(candidate.snapshotAt) &&
    isFiniteNumber(candidate.movePercent) &&
    isFiniteNumber(candidate.weightedBreadthScore) &&
    isFiniteNumber(candidate.advancingCount) &&
    isFiniteNumber(candidate.decliningCount) &&
    isFiniteNumber(candidate.positiveWeightShare) &&
    isFiniteNumber(candidate.negativeWeightShare) &&
    Array.isArray(candidate.components) &&
    candidate.components.length > 0 &&
    candidate.components.every(isIndexComponentInput)
  );
}

export function validateMarketDataPayload(payload: unknown): MarketDataIngestionPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Market-data ingestion payload must be a JSON object.");
  }

  const candidate = payload as Record<string, unknown>;
  const stockQuotes = candidate.stockQuotes;
  const stockCharts = candidate.stockCharts;
  const fundNavs = candidate.fundNavs;
  const indexSnapshots = candidate.indexSnapshots;

  if (stockQuotes && (!Array.isArray(stockQuotes) || !stockQuotes.every(isStockQuoteInput))) {
    throw new Error("stockQuotes must be an array of quote payloads with slug, source, price, changePercent, and lastUpdated.");
  }

  if (stockCharts && (!Array.isArray(stockCharts) || !stockCharts.every(isStockChartInput))) {
    throw new Error("stockCharts must be an array of chart payloads with slug, source, lastUpdated, and at least two OHLC bars.");
  }

  if (fundNavs && (!Array.isArray(fundNavs) || !fundNavs.every(isFundNavInput))) {
    throw new Error("fundNavs must be an array of NAV payloads with slug, source, nav, optional returns1Y, optional navDate, and lastUpdated.");
  }

  if (
    indexSnapshots &&
    (!Array.isArray(indexSnapshots) || !indexSnapshots.every(isIndexSnapshotInput))
  ) {
    throw new Error("indexSnapshots must be an array of index snapshot payloads with numeric breadth data and component rows.");
  }

  return {
    stockQuotes: stockQuotes as StockQuoteInput[] | undefined,
    stockCharts: stockCharts as StockChartInput[] | undefined,
    fundNavs: fundNavs as FundNavInput[] | undefined,
    indexSnapshots: indexSnapshots as IndexSnapshotInput[] | undefined,
  };
}

export function getMarketDataIngestionReadiness() {
  return {
    adminSupabaseReady: hasRuntimeSupabaseAdminEnv(),
    acceptedPayloads: ["stockQuotes", "stockCharts", "fundNavs", "indexSnapshots"],
    storageTargets: [
      "stock_quote_history",
      "stock_ohlcv_history",
      "fund_nav_history",
      "index_tracker_snapshots",
      "market_series_status",
      "market_refresh_runs",
    ],
    mode: hasRuntimeSupabaseAdminEnv() ? "durable_ingestion_ready" : "configuration_pending",
  };
}

export async function ingestMarketDataPayload(
  rawPayload: unknown,
  options: MarketDataIngestionOptions = {},
) {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are required for durable market-data ingestion.");
  }

  const payload = validateMarketDataPayload(rawPayload);
  const triggerSource = options.triggerSource ?? "manual_ingest";
  const ingestMode = options.ingestMode ?? "provider_sync";
  const failures: MarketDataIngestionFailure[] = [];
  let insertedQuoteSnapshots = 0;
  let insertedChartSnapshots = 0;
  let insertedFundSnapshots = 0;
  let insertedIndexSnapshots = 0;
  let insertedIndexComponents = 0;
  let writtenChartBars = 0;

  for (const quote of payload.stockQuotes ?? []) {
    try {
      await persistStockQuoteHistory({
        slug: quote.slug,
        sourceLabel: quote.source,
        sourceCode: quote.sourceCode ?? null,
        price: quote.price,
        changePercent: quote.changePercent,
        quotedAt: quote.lastUpdated,
        ingestMode,
        triggerSource,
        requestedBy: options.requestedBy ?? null,
        taskIdentifier: options.taskIdentifier ?? null,
      });
      insertedQuoteSnapshots += 1;
    } catch (error) {
      failures.push({
        seriesType: "stock_quote",
        assetSlug: quote.slug,
        message: error instanceof Error ? error.message : `Unknown stock quote failure for "${quote.slug}".`,
      });
    }
  }

  for (const chart of payload.stockCharts ?? []) {
    try {
      await persistStockOhlcvHistory({
        slug: chart.slug,
        sourceLabel: chart.source,
        sourceCode: chart.sourceCode ?? null,
        timeframe: chart.timeframe ?? "1D",
        bars: chart.bars,
        lastUpdated: chart.lastUpdated,
        ingestMode,
        triggerSource,
        requestedBy: options.requestedBy ?? null,
        taskIdentifier: options.taskIdentifier ?? null,
      });
      insertedChartSnapshots += 1;
      writtenChartBars += chart.bars.length;
    } catch (error) {
      failures.push({
        seriesType: "stock_ohlcv",
        assetSlug: chart.slug,
        message: error instanceof Error ? error.message : `Unknown stock chart failure for "${chart.slug}".`,
      });
    }
  }

  for (const fund of payload.fundNavs ?? []) {
    try {
      await persistFundNavHistory({
        slug: fund.slug,
        sourceLabel: fund.source,
        sourceCode: fund.sourceCode ?? null,
        nav: fund.nav,
        returns1Y: fund.returns1Y ?? null,
        navDate: fund.navDate ?? fund.lastUpdated,
        lastUpdated: fund.lastUpdated,
        ingestMode,
        triggerSource,
        requestedBy: options.requestedBy ?? null,
        taskIdentifier: options.taskIdentifier ?? null,
      });
      insertedFundSnapshots += 1;
    } catch (error) {
      failures.push({
        seriesType: "fund_nav",
        assetSlug: fund.slug,
        message: error instanceof Error ? error.message : `Unknown fund NAV failure for "${fund.slug}".`,
      });
    }
  }

  for (const snapshot of payload.indexSnapshots ?? []) {
    try {
      await persistIndexSnapshotHistory({
        slug: snapshot.slug,
        sourceLabel: snapshot.source ?? snapshot.sourceCode ?? "index_provider",
        sourceCode: snapshot.sourceCode ?? snapshot.source ?? null,
        snapshotAt: snapshot.snapshotAt,
        sessionPhase: snapshot.sessionPhase ?? null,
        movePercent: snapshot.movePercent,
        weightedBreadthScore: snapshot.weightedBreadthScore,
        advancingCount: snapshot.advancingCount,
        decliningCount: snapshot.decliningCount,
        positiveWeightShare: snapshot.positiveWeightShare,
        negativeWeightShare: snapshot.negativeWeightShare,
        marketMood: snapshot.marketMood ?? null,
        dominanceLabel: snapshot.dominanceLabel ?? null,
        trendLabel: snapshot.trendLabel ?? null,
        components: snapshot.components,
        metadata: snapshot.metadata,
        ingestMode,
        triggerSource,
        requestedBy: options.requestedBy ?? null,
        taskIdentifier: options.taskIdentifier ?? null,
      });
      insertedIndexSnapshots += 1;
      insertedIndexComponents += snapshot.components.length;
    } catch (error) {
      failures.push({
        seriesType: "index_snapshot",
        assetSlug: snapshot.slug,
        message: error instanceof Error ? error.message : `Unknown index snapshot failure for "${snapshot.slug}".`,
      });
    }
  }

  return {
    ok: failures.length === 0,
    triggerSource,
    ingestMode,
    failures,
    insertedQuoteSnapshots,
    insertedChartSnapshots,
    insertedFundSnapshots,
    insertedIndexSnapshots,
    insertedIndexComponents,
    writtenChartBars,
  };
}
