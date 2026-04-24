import { cache } from "react";

import type { CandlePoint, HistogramPoint, LinePoint } from "@/lib/advanced-chart-data";
import { getDurableStockChartSeries } from "@/lib/market-data-durable-store";
import { getSourceEntryStore } from "@/lib/source-entry-store";

type ChartSnapshotPayload = {
  source?: string | null;
  isDemo?: boolean | null;
  ingestMode?: string | null;
  lastUpdated?: string | null;
  timeframe?: string | null;
  bars?: CandlePoint[] | null;
};

export type StockChartSnapshotMode = "verified" | "source_entry" | "pending";

export type StockChartSnapshot = {
  slug: string;
  source: string;
  lastUpdated: string;
  timeframe: string;
  bars: CandlePoint[];
  trendSeries: LinePoint[];
  signalSeries: LinePoint[];
  volumeSeries: HistogramPoint[];
  mode: StockChartSnapshotMode;
};

function formatSnapshotTimestamp(value: string | null | undefined) {
  if (!value) return "Awaiting verified OHLCV";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Awaiting verified OHLCV";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function hasRenderableChartPayload(payload: ChartSnapshotPayload | null | undefined) {
  return Array.isArray(payload?.bars) && payload.bars.length > 1;
}

function isVerifiedChartPayload(payload: ChartSnapshotPayload | null | undefined) {
  if (!payload) return false;
  if (payload.isDemo) return false;
  if (typeof payload.source === "string" && payload.source.toLowerCase().startsWith("demo-")) {
    return false;
  }
  return hasRenderableChartPayload(payload);
}

function buildTrendSeries(bars: CandlePoint[]): LinePoint[] {
  return bars.map((bar, index) => {
    const window = bars.slice(Math.max(0, index - 2), index + 1);
    const averageClose =
      window.reduce((sum, item) => sum + item.close, 0) / Math.max(window.length, 1);

    return {
      time: bar.time,
      value: Number(averageClose.toFixed(2)),
    };
  });
}

function buildSignalSeries(bars: CandlePoint[]): LinePoint[] {
  return bars.map((bar, index) => ({
    time: bar.time,
    value: Number((bar.low + (bar.close - bar.open) * 0.35 + index * 0.05).toFixed(2)),
  }));
}

function buildVolumeSeries(bars: CandlePoint[]): HistogramPoint[] {
  return bars.map((bar, index) => ({
    time: bar.time,
    value:
      typeof bar.volume === "number" && Number.isFinite(bar.volume)
        ? Number(bar.volume.toFixed(2))
        : Number((Math.abs(bar.close - bar.open) * 1.8 + 8 + index * 0.2).toFixed(2)),
    color: bar.close >= bar.open ? "rgba(90, 230, 198, 0.75)" : "rgba(255, 107, 107, 0.75)",
  }));
}

function resolveDurableChartMode(source: string, ingestMode?: string | null): StockChartSnapshotMode {
  if (ingestMode === "admin_source_entry" || ingestMode === "manual_entry") {
    return "source_entry";
  }

  if (source.toLowerCase().includes("source-entry")) {
    return "source_entry";
  }

  return "verified";
}

async function getVerifiedChartPayload(slug: string): Promise<ChartSnapshotPayload | null> {
  const durableSeries = await getDurableStockChartSeries(slug, "1D");

  if (durableSeries && durableSeries.bars.length > 1) {
    return {
      source: durableSeries.source,
      isDemo: false,
      ingestMode: durableSeries.ingestMode,
      lastUpdated: durableSeries.lastUpdated,
      timeframe: durableSeries.timeframe,
      bars: durableSeries.bars,
    };
  }

  return null;
}

async function getSourceEntryChartPayload(slug: string): Promise<ChartSnapshotPayload | null> {
  const sourceStore = await getSourceEntryStore();
  const entry = sourceStore.stockChartEntries.find((item) => item.slug === slug);

  if (!entry || entry.bars.length < 2) {
    return null;
  }

  return {
    source: `${entry.source} (source-entry OHLCV)`,
    lastUpdated: entry.sourceDate,
    timeframe: entry.timeframe,
    bars: entry.bars,
  };
}

export const getStockChartSnapshot = cache(async (slug: string): Promise<StockChartSnapshot> => {
  const verifiedPayload = await getVerifiedChartPayload(slug);

  if (isVerifiedChartPayload(verifiedPayload)) {
    const finalPayload = verifiedPayload as ChartSnapshotPayload;
    const bars = finalPayload.bars ?? [];

    return {
      slug,
      source: finalPayload.source ?? "Verified market feed",
      lastUpdated: formatSnapshotTimestamp(finalPayload.lastUpdated),
      timeframe: finalPayload.timeframe ?? "1D",
      bars,
      trendSeries: buildTrendSeries(bars),
      signalSeries: buildSignalSeries(bars),
      volumeSeries: buildVolumeSeries(bars),
      mode: resolveDurableChartMode(finalPayload.source ?? "Verified market feed", finalPayload.ingestMode),
    };
  }

  const sourceEntryPayload = await getSourceEntryChartPayload(slug);

  if (!hasRenderableChartPayload(sourceEntryPayload)) {
    return {
      slug,
      source: "Verified OHLCV pending",
      lastUpdated: "Awaiting verified OHLCV",
      timeframe: "1D",
      bars: [],
      trendSeries: [],
      signalSeries: [],
      volumeSeries: [],
      mode: "pending",
    };
  }

  const finalPayload = sourceEntryPayload as ChartSnapshotPayload;
  const bars = finalPayload.bars ?? [];

  return {
    slug,
    source: finalPayload.source ?? "Source-entry OHLCV",
    lastUpdated: formatSnapshotTimestamp(finalPayload.lastUpdated),
    timeframe: finalPayload.timeframe ?? "1D",
    bars,
    trendSeries: buildTrendSeries(bars),
    signalSeries: buildSignalSeries(bars),
    volumeSeries: buildVolumeSeries(bars),
    mode: "source_entry",
  };
});
