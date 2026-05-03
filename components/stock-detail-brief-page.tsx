"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import {
  AnnualReturnsBlock,
  ProductBulletListCard,
  ProductDataTableCard,
  HeroPriceBlock,
  ProductInsightGridCard,
  ProductCard,
  ProductRouteGrid,
  ProductEditorialCluster,
  ProductPageShell,
  ProductSectionTitle,
  StickyTabBar,
  TrailingReturnsTable,
} from "@/components/product-page-system";
import { UserContentActionCard } from "@/components/user-content-action-card";
import type { StockChartSnapshot } from "@/lib/chart-content";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import { getExternalLinkProps, getInternalLinkProps } from "@/lib/link-utils";
import type { StockSnapshot } from "@/lib/mock-data";
import { formatBenchmarkLabel } from "@/lib/benchmark-labels";
import {
  formatProductDate,
  formatProductPercent,
  getPublicDataStateMeta,
  getTrendColor,
  getTruthStateMeta,
  parseDesignNumericValue,
  type ProductTruthState,
} from "@/lib/product-page-design";
import type { SharedSidebarRailData } from "@/lib/shared-sidebar-config";
import { getLocalStockPreviewData } from "@/lib/stock-preview-data";
import type { BenchmarkHistoryEntry } from "@/lib/benchmark-history-store";

type SimilarStockCard = {
  name: string;
  price: string;
  change1Y: string;
  ratioLabel: string;
  ratioValue: string;
  marketCap?: string;
  sparklinePoints?: number[];
  href?: string;
  hrefLabel: string;
};

const stockPlaceholderCopy = {
  notConnected: "Data pending",
  extended: "More data coming soon",
  soon: "Will be enabled soon",
} as const;

function isRenderableStockNewsItem(item: StockSnapshot["newsItems"][number]) {
  const combined = `${item.title} ${item.source} ${item.type}`.toLowerCase();

  return ![
    "will stack here",
    "should cluster here",
    "should be linked here",
    "should appear here",
    "will render here",
    "not connected yet",
    "pending",
  ].some((token) => combined.includes(token));
}

function readStockStat(stock: StockSnapshot, label: string) {
  return stock.stats.find((item) => item.label === label)?.value ?? "Data pending";
}

function readOptionalPeRatio(stock: StockSnapshot) {
  const fromStats = stock.stats.find((item) =>
    ["P/E", "PE", "P/E Ratio", "PE Ratio"].includes(item.label),
  )?.value;

  return fromStats ?? "Data pending";
}

function isUnavailableLike(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return (
    !normalized ||
    normalized === "unavailable" ||
    normalized.startsWith("awaiting verified") ||
    normalized.startsWith("awaiting extended") ||
    normalized.startsWith("pending") ||
    normalized === "not exposed yet"
  );
}

function presentStockValue(
  value: string | null | undefined,
  fallback: (typeof stockPlaceholderCopy)[keyof typeof stockPlaceholderCopy] = stockPlaceholderCopy.notConnected,
) {
  return isUnavailableLike(value) ? fallback : value ?? fallback;
}

function isPreviewFallbackCandidate(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return (
    isUnavailableLike(value) ||
    normalized === "unclassified" ||
    normalized === "retained daily ohlcv is unavailable"
  );
}

function formatCompactVolume(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return stockPlaceholderCopy.notConnected;
  }

  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function readVerifiedStockStat(stock: StockSnapshot, label: string) {
  const value = readStockStat(stock, label);
  return isUnavailableLike(value) ? null : value;
}

function readVerifiedPeRatio(stock: StockSnapshot) {
  const value = readOptionalPeRatio(stock);
  return isUnavailableLike(value) ? null : value;
}

function mapStockTruthState(stock: StockSnapshot): ProductTruthState {
  const sourceLabel = stock.snapshotMeta?.marketLabel?.toLowerCase() ?? "";

  if (sourceLabel.includes("verified")) {
    return "verified";
  }

  if (stock.snapshotMeta?.mode === "delayed_snapshot") {
    return "delayed_snapshot";
  }

  if (stock.snapshotMeta?.mode === "manual_close") {
    return "delayed_snapshot";
  }

  if (stock.snapshotMeta?.marketDetail?.toLowerCase().includes("failed")) {
    return "read_failed";
  }

  return "unavailable";
}

function computeChartReturn(
  chartSnapshot: StockChartSnapshot,
  sessions: number,
  fallback?: string,
) {
  const bars = chartSnapshot.bars;

  if (bars.length <= sessions) {
    return fallback ?? "Data pending";
  }

  const current = bars[bars.length - 1]?.close;
  const previous = bars[bars.length - 1 - sessions]?.close;

  if (typeof current !== "number" || typeof previous !== "number" || previous === 0) {
    return fallback ?? "Data pending";
  }

  const percent = ((current - previous) / previous) * 100;
  return formatProductPercent(percent);
}

function describeChartWindow(chartSnapshot: StockChartSnapshot) {
  const bars = chartSnapshot.bars;

  if (bars.length < 2) {
    return "Retained daily OHLCV is unavailable";
  }

  const first = bars[0]?.time;
  const last = bars[bars.length - 1]?.time;

  return `${formatProductDate(first)} to ${formatProductDate(last)}`;
}

function describeChartCoverage(chartSnapshot: StockChartSnapshot) {
  if (chartSnapshot.bars.length < 2) {
    return "Data pending";
  }

  return `${chartSnapshot.bars.length} retained daily bars`;
}

function describeChartTruth(chartSnapshot: StockChartSnapshot) {
  if (chartSnapshot.mode === "verified") {
    return "Verified";
  }

  if (chartSnapshot.mode === "source_entry") {
    return "Delayed Snapshot";
  }

  return "Data pending";
}

function buildStockChartEmptyState(chartSnapshot: StockChartSnapshot) {
  if (chartSnapshot.mode === "source_entry") {
    return {
      state: "delayed_snapshot" as const,
      title: "Delayed chart snapshot available",
      description:
        "A retained delayed daily-bar series is available for this stock. It is useful for context, but it is not a fully verified live chart feed.",
    };
  }

  const unavailableMeta = getPublicDataStateMeta("unavailable");

  return {
    state: "unavailable" as const,
    title: unavailableMeta.title,
    description:
      "No retained daily OHLCV bars have been written for this stock yet, so the page withholds the chart instead of drawing an implied price path.",
  };
}

function buildTrailingRows(
  stock: StockSnapshot,
  chartSnapshot: StockChartSnapshot,
  benchmark: IndexSnapshot | null,
  peerOneYearAverage: string,
  benchmarkReturns?: Partial<Record<"1D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y", string>> | null,
) {
  return [
    {
      period: "Latest move",
      asset: stock.change,
      categoryAverage: stockPlaceholderCopy.notConnected,
      benchmarkIndex:
        benchmarkReturns?.["1D"] ??
        (benchmark
          ? formatProductPercent(benchmark.movePercent, 2, stockPlaceholderCopy.notConnected)
          : stockPlaceholderCopy.notConnected),
    },
    {
      period: "1 Month",
      asset: computeChartReturn(chartSnapshot, 22, stockPlaceholderCopy.extended),
      categoryAverage: stockPlaceholderCopy.extended,
      benchmarkIndex: benchmarkReturns?.["1M"] ?? "Awaiting benchmark history",
    },
    {
      period: "3 Month",
      asset: computeChartReturn(chartSnapshot, 66, stockPlaceholderCopy.extended),
      categoryAverage: stockPlaceholderCopy.extended,
      benchmarkIndex: benchmarkReturns?.["3M"] ?? "Awaiting benchmark history",
    },
    {
      period: "6 Month",
      asset: computeChartReturn(chartSnapshot, 132, stockPlaceholderCopy.extended),
      categoryAverage: stockPlaceholderCopy.extended,
      benchmarkIndex: benchmarkReturns?.["6M"] ?? "Awaiting benchmark history",
    },
    {
      period: "1 Year",
      asset: computeChartReturn(chartSnapshot, 252, stockPlaceholderCopy.extended),
      categoryAverage: peerOneYearAverage,
      benchmarkIndex: benchmarkReturns?.["1Y"] ?? "Awaiting benchmark history",
    },
    {
      period: "3 Year",
      asset: computeChartReturn(chartSnapshot, 756, stockPlaceholderCopy.extended),
      categoryAverage: stockPlaceholderCopy.extended,
      benchmarkIndex: benchmarkReturns?.["3Y"] ?? "Awaiting benchmark history",
    },
    {
      period: "5 Year",
      asset: computeChartReturn(chartSnapshot, 1260, stockPlaceholderCopy.extended),
      categoryAverage: stockPlaceholderCopy.extended,
      benchmarkIndex: benchmarkReturns?.["5Y"] ?? "Awaiting benchmark history",
    },
  ].map((row) => ({
    ...row,
    asset: presentStockValue(
      row.asset,
      row.period === "Latest move" ? stockPlaceholderCopy.notConnected : stockPlaceholderCopy.extended,
    ),
    categoryAverage: presentStockValue(
      row.categoryAverage,
      row.period === "Latest move" ? stockPlaceholderCopy.notConnected : stockPlaceholderCopy.extended,
    ),
    benchmarkIndex: presentStockValue(
      row.benchmarkIndex,
      row.period === "Latest move" ? stockPlaceholderCopy.notConnected : stockPlaceholderCopy.extended,
    ),
    outperform:
      !isUnavailableLike(row.categoryAverage) &&
      parseDesignNumericValue(row.asset) !== null &&
      parseDesignNumericValue(row.categoryAverage) !== null &&
      (parseDesignNumericValue(row.asset) ?? 0) > (parseDesignNumericValue(row.categoryAverage) ?? 0),
  }));
}

function buildAnnualRows(chartSnapshot: StockChartSnapshot) {
  const currentYear = new Date().getFullYear();
  const grouped = new Map<number, Array<{ close: number }>>();

  chartSnapshot.bars.forEach((bar) => {
    const year = new Date(bar.time).getFullYear();

    if (!Number.isFinite(year)) {
      return;
    }

    const bucket = grouped.get(year) ?? [];
    bucket.push({ close: bar.close });
    grouped.set(year, bucket);
  });

  return Array.from({ length: 7 }, (_, index) => {
    const year = currentYear - 6 + index;
    const rows = grouped.get(year);

    if (!rows || rows.length < 2) {
      return { year: String(year), value: stockPlaceholderCopy.extended };
    }

    const first = rows[0]?.close;
    const last = rows[rows.length - 1]?.close;

    if (typeof first !== "number" || typeof last !== "number" || first === 0) {
      return { year: String(year), value: stockPlaceholderCopy.extended };
    }

    return {
      year: String(year),
      value: Number((((last - first) / first) * 100).toFixed(2)),
    };
  });
}

function buildChartPoints(chartSnapshot: StockChartSnapshot) {
  return chartSnapshot.bars.map((bar) => ({
    label: formatProductDate(bar.time),
    value: bar.close,
  }));
}

function buildPeerDailyAverage(peers: SimilarStockCard[]) {
  const numericValues = peers
    .map((peer) => parseDesignNumericValue(peer.change1Y))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!numericValues.length) {
    return stockPlaceholderCopy.extended;
  }

  const average = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
  return formatProductPercent(average);
}

function buildSessionRows(stock: StockSnapshot, chartSnapshot: StockChartSnapshot) {
  const latestBar = chartSnapshot.bars[chartSnapshot.bars.length - 1];

  return [
    {
      label: "Open",
      value:
        latestBar && Number.isFinite(latestBar.open)
          ? `₹${latestBar.open.toFixed(2)}`
          : stockPlaceholderCopy.notConnected,
      helper: "Last retained session open.",
    },
    {
      label: "High",
      value:
        latestBar && Number.isFinite(latestBar.high)
          ? `₹${latestBar.high.toFixed(2)}`
          : stockPlaceholderCopy.notConnected,
      helper: "Highest retained print in the last session window.",
    },
    {
      label: "Low",
      value:
        latestBar && Number.isFinite(latestBar.low)
          ? `₹${latestBar.low.toFixed(2)}`
          : stockPlaceholderCopy.notConnected,
      helper: "Lowest retained print in the same session window.",
    },
    {
      label: "Close",
      value:
        latestBar && Number.isFinite(latestBar.close)
          ? `₹${latestBar.close.toFixed(2)}`
          : presentStockValue(stock.price, stockPlaceholderCopy.notConnected),
      helper: "Close from the latest retained daily bar or the active route quote.",
    },
    {
      label: "Volume",
      value: formatCompactVolume(latestBar?.volume),
      helper: "Retained bar volume when the current source wrote it.",
    },
  ];
}

function derive52WeekRange(chartSnapshot: StockChartSnapshot) {
  if (chartSnapshot.bars.length < 252) {
    return null;
  }

  const trailingYearBars = chartSnapshot.bars.slice(-252);
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;

  for (const bar of trailingYearBars) {
    if (Number.isFinite(bar.high)) {
      high = Math.max(high, bar.high);
    }

    if (Number.isFinite(bar.low)) {
      low = Math.min(low, bar.low);
    }
  }

  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return null;
  }

  return {
    low: `₹${low.toFixed(2)}`,
    high: `₹${high.toFixed(2)}`,
  };
}

function buildPeerComparisonRows(peers: SimilarStockCard[]) {
  return peers.slice(0, 5).map((peer) => ({
    label: peer.name,
    price: presentStockValue(peer.price, stockPlaceholderCopy.notConnected),
    change1Y: presentStockValue(peer.change1Y, stockPlaceholderCopy.extended),
    ratioValue: presentStockValue(peer.ratioValue, stockPlaceholderCopy.extended),
    href: peer.href,
  }));
}

function mergeSessionRowsWithPreview(
  rows: Array<{ label: string; value: string; helper: string }>,
  previewData: ReturnType<typeof getLocalStockPreviewData> | undefined,
) {
  if (!previewData) {
    return rows;
  }

  const previewRows: Record<string, { value: string; helper: string }> = {
    Open: {
      value: previewData.session.open,
      helper: "Indicative session open while the full market-session feed is still filling in.",
    },
    High: {
      value: previewData.session.high,
      helper: "Indicative session high until the fuller session feed is available.",
    },
    Low: {
      value: previewData.session.low,
      helper: "Indicative session low until the fuller session feed is available.",
    },
    Close: {
      value: previewData.session.close,
      helper: "Indicative close aligned with the latest route snapshot.",
    },
    Volume: {
      value: previewData.session.volume,
      helper: "Indicative turnover while exchange volume is still being connected.",
    },
  };

  return rows.map((row) => {
    const previewRow = previewRows[row.label];

    if (!previewRow) {
      return row;
    }

    return isUnavailableLike(row.value) ? { ...row, ...previewRow } : row;
  });
}

function slugifyRouteToken(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDisplayDash(value: string | null | undefined) {
  if (
    isUnavailableLike(value) ||
    value === stockPlaceholderCopy.notConnected ||
    value === stockPlaceholderCopy.extended ||
    value === stockPlaceholderCopy.soon
  ) {
    return "--";
  }

  return value ?? "--";
}

function splitRangeValue(value: string | null | undefined) {
  if (!value || isUnavailableLike(value)) {
    return { low: "--", high: "--" };
  }

  const [low, high] = value.split("-").map((item) => item.trim());
  return {
    low: low || "--",
    high: high || "--",
  };
}

function normalizeChartBars(chartSnapshot: StockChartSnapshot, sessions: number) {
  if (chartSnapshot.bars.length <= sessions) {
    return chartSnapshot.bars;
  }

  return chartSnapshot.bars.slice(-sessions);
}

function buildInlineChartGeometry(values: number[], width: number, height: number, padding: number) {
  const safeValues = values.length ? values : [0, 0];
  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const range = maxValue - minValue || 1;
  const xStep = safeValues.length > 1 ? (width - padding * 2) / (safeValues.length - 1) : 0;

  const points = safeValues.map((value, index) => {
    const x = padding + xStep * index;
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);

    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return { linePath, points };
}

type ChartOverlayLine = {
  label: string;
  tone: string;
  values: number[];
  dashed?: boolean;
  returnLabel?: string;
};

function normalizeSeriesValue(price: number, startPrice: number) {
  if (!Number.isFinite(price) || !Number.isFinite(startPrice) || startPrice === 0) {
    return null;
  }

  return Number(((price / startPrice) * 100).toFixed(2));
}

function buildChartComparisonData(
  stockBars: StockChartSnapshot["bars"],
  benchmarkHistory: BenchmarkHistoryEntry[],
  sectorBenchmarkHistory: BenchmarkHistoryEntry[],
) {
  if (stockBars.length < 2) {
    return {
      chartPoints: [] as Array<{ label: string; value: number }>,
      overlayLines: [] as ChartOverlayLine[],
      benchmarkAvailable: false,
    };
  }

  const stockMap = new Map(stockBars.map((bar) => [bar.time, bar.close]));
  const benchmarkMap = new Map(benchmarkHistory.map((bar) => [bar.date, bar.close]));
  const sectorMap = new Map(sectorBenchmarkHistory.map((bar) => [bar.date, bar.close]));

  const benchmarkDates = stockBars
    .map((bar) => bar.time)
    .filter((date) => benchmarkMap.has(date));

  if (benchmarkDates.length < 2) {
    const stockStart = stockBars[0]?.close ?? 0;
    return {
      chartPoints: stockBars.map((bar) => ({
        label: formatProductDate(bar.time),
        value: normalizeSeriesValue(bar.close, stockStart) ?? 100,
      })),
      overlayLines: [] as ChartOverlayLine[],
      benchmarkAvailable: false,
    };
  }

  const sectorDates = benchmarkDates.filter((date) => sectorMap.has(date));
  const activeDates = sectorDates.length >= 2 ? sectorDates : benchmarkDates;

  const stockStart = stockMap.get(activeDates[0] ?? "") ?? 0;
  const benchmarkStart = benchmarkMap.get(activeDates[0] ?? "") ?? 0;
  const sectorStart = sectorMap.get(activeDates[0] ?? "") ?? 0;

  const chartPoints = activeDates.map((date) => ({
    label: formatProductDate(date),
    value: normalizeSeriesValue(stockMap.get(date) ?? 0, stockStart) ?? 100,
  }));

  const overlayLines: ChartOverlayLine[] = [
    {
      label: "Benchmark",
      tone: "#D4853B",
      values: activeDates.map((date) => normalizeSeriesValue(benchmarkMap.get(date) ?? 0, benchmarkStart) ?? 100),
    },
  ];

  if (sectorDates.length >= 2) {
    overlayLines.push({
      label: "Sector",
      tone: "#6B7280",
      values: activeDates.map((date) => normalizeSeriesValue(sectorMap.get(date) ?? 0, sectorStart) ?? 100),
      dashed: true,
    });
  }

  return {
    chartPoints,
    overlayLines,
    benchmarkAvailable: true,
  };
}

function computeSelectedReturn(values: number[]) {
  if (values.length < 2) {
    return null;
  }

  const first = values[0];
  const last = values[values.length - 1];

  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) {
    return null;
  }

  return ((last / first) - 1) * 100;
}

function computeMaxDrawdown(values: number[]) {
  if (values.length < 2) {
    return null;
  }

  let peak = values[0] ?? 0;
  let maxDrawdown = 0;

  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }

    if (value > peak) {
      peak = value;
    }

    if (peak !== 0) {
      const drawdown = ((value / peak) - 1) * 100;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown;
}

function buildTradingViewHref(symbol: string) {
  return `https://www.tradingview.com/chart/?symbol=NSE%3A${encodeURIComponent(symbol)}`;
}

function derivePeerCompareHref(stockSlug: string, primaryPeerHref?: string) {
  if (!primaryPeerHref?.startsWith("/stocks/")) {
    return "/compare/stocks";
  }

  const peerSlug = primaryPeerHref.replace("/stocks/", "").trim();
  return peerSlug ? `/compare/stocks/${stockSlug}/${peerSlug}` : "/compare/stocks";
}

function StockCardSource({
  label = "Source",
  value,
}: {
  label?: string;
  value: string;
}) {
  return (
    <p className="riddra-product-body border-t border-[rgba(226,222,217,0.82)] pt-2 text-[11px] text-[rgba(107,114,128,0.78)]">
      {label}: {value}
    </p>
  );
}

function FusedBoardSection({
  title,
  description,
  children,
  sourceLine,
  className,
  muted = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  sourceLine: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={[
        "space-y-3 px-3 py-3",
        muted ? "bg-[rgba(248,246,242,0.55)]" : "bg-[rgba(255,255,255,0.72)]",
        className ?? "",
      ].join(" ")}
    >
      <div className="space-y-1">
        <h3 className="riddra-product-display text-[16px] font-semibold text-[#1B3A6B]">{title}</h3>
        {description ? (
          <p className="riddra-product-body text-[13px] leading-5 text-[rgba(107,114,128,0.84)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      <StockCardSource value={sourceLine} />
    </section>
  );
}

export function StockDetailBriefPage({
  stock,
  chartSnapshot,
  benchmark,
  benchmarkSlug,
  benchmarkReturns,
  benchmarkHistory,
  sectorBenchmarkSlug,
  sectorBenchmarkHistory,
  similarAssets,
  sharedSidebarRailData,
  viewerSignedIn,
  stockForecastsUnlocked,
}: {
  stock: StockSnapshot;
  chartSnapshot: StockChartSnapshot;
  benchmark: IndexSnapshot | null;
  benchmarkSlug: string;
  benchmarkReturns?: Partial<Record<"1D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y", string>> | null;
  benchmarkHistory: BenchmarkHistoryEntry[];
  sectorBenchmarkSlug: string | null;
  sectorBenchmarkHistory: BenchmarkHistoryEntry[];
  similarAssets: SimilarStockCard[];
  sharedSidebarRailData: SharedSidebarRailData;
  viewerSignedIn: boolean;
  stockForecastsUnlocked: boolean;
}) {
  const [activeSection, setActiveSection] = useState<
    "summary" | "performance" | "quality" | "ratings" | "news" | "analyst"
  >("summary");
  const [activeTimeframe, setActiveTimeframe] = useState<"1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y">(
    "1Y",
  );

  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (
        hash === "summary" ||
        hash === "performance" ||
        hash === "quality" ||
        hash === "ratings" ||
        hash === "news" ||
        hash === "analyst"
      ) {
        setActiveSection(hash);
      } else {
        setActiveSection("summary");
      }
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);
  const truthState = mapStockTruthState(stock);
  const truthMeta = getTruthStateMeta(truthState);
  const peerOneYearAverage = buildPeerDailyAverage(similarAssets);
  const trailingRows = buildTrailingRows(
    stock,
    chartSnapshot,
    benchmark,
    peerOneYearAverage,
    benchmarkReturns,
  );
  const annualRows = buildAnnualRows(chartSnapshot);
  const chartCoverage = describeChartCoverage(chartSnapshot);
  const chartWindow = describeChartWindow(chartSnapshot);
  const verifiedMarketCap = readVerifiedStockStat(stock, "Market Cap");
  const verifiedPe = readVerifiedPeRatio(stock);
  const verifiedPb = readVerifiedStockStat(stock, "P/B");
  const verifiedRoe = readVerifiedStockStat(stock, "ROE");
  const verifiedRoce = readVerifiedStockStat(stock, "ROCE");
  const verifiedDividendYield = readVerifiedStockStat(stock, "Dividend Yield");
  const primaryPeer = similarAssets[0] ?? null;
  const previewData = getLocalStockPreviewData(stock.slug);
  const displaySector =
    previewData && isPreviewFallbackCandidate(stock.sector)
      ? previewData.fundamentals.sector
      : stock.sector;
  const sessionRows = buildSessionRows(stock, chartSnapshot);
  const peerComparisonRows = buildPeerComparisonRows(similarAssets);
  const fundamentalsOverviewItems = [
    {
      label: "Market cap",
      value: presentStockValue(verifiedMarketCap, stockPlaceholderCopy.extended),
      note: verifiedMarketCap
        ? "Verified market-cap field carried into this route."
        : "Awaiting the extended fundamentals dataset for market-value coverage.",
    },
    {
      label: "P/E",
      value: presentStockValue(verifiedPe, stockPlaceholderCopy.extended),
      note: verifiedPe
        ? "Verified valuation field carried into this route."
        : "Awaiting the extended dataset for valuation ratios.",
    },
    {
      label: "Sector",
      value: presentStockValue(displaySector, stockPlaceholderCopy.notConnected),
      note: "Current category route used for peer and hub handoffs.",
    },
    {
      label: "Industry",
      value: stockPlaceholderCopy.soon,
      note: "Industry-level mapping is not connected on this route yet.",
    },
  ];
  const stockResearchChecklistItems = [
    {
      title: "Chart coverage",
      body:
        chartSnapshot.bars.length > 1
          ? `Retained daily bars currently cover ${chartWindow}. Use that window before leaning on longer-history claims.`
          : "Retained daily OHLCV has not been written for this route yet, so the chart remains intentionally unavailable.",
      meta: "Data coverage",
    },
    {
      title: "Quote posture",
      body: stock.snapshotMeta?.marketDetail ?? "Quote-source posture is still unavailable on this route.",
      meta: "Truth",
    },
    {
      title: "Peer comparison",
      body: primaryPeer
        ? `${primaryPeer.name} is the nearest peer route currently available for a quick adjacent read.`
        : "Peer comparison is not available yet on this stock route.",
      meta: "Peer route",
    },
    {
      title: "Benchmark handoff",
      body: benchmark
        ? `${benchmark.title} is the closest broad-market context for reading this move against breadth and leadership.`
        : "Benchmark context is still unavailable on this route.",
      meta: "Index context",
      href: "/nifty50",
      hrefLabel: "Open benchmark",
    },
  ];
  const sidebarWatchpointItems = [
    {
      title: "Benchmark context",
      body: benchmark
        ? `${benchmark.title} remains the quickest market check before reading the move in isolation.`
        : "Benchmark context will appear here when the linked index route is available.",
      meta: "Market context",
      href: benchmark ? "/nifty50" : undefined,
      hrefLabel: benchmark ? "Open benchmark" : undefined,
    },
    {
      title: "Peer cluster",
      body: primaryPeer
        ? `${primaryPeer.name} is the cleanest adjacent stock route for a like-for-like check.`
        : "Peer routes will appear here once a stronger adjacent stock match is connected.",
      meta: "Peers",
      href: primaryPeer?.href,
      hrefLabel: primaryPeer?.href ? "Open peer route" : undefined,
    },
    {
      title: "Route handoff",
      body: "Use the broader market board and sector hub from the sidebar when the single-name read needs context rather than more raw detail.",
      meta: "Workflow",
      href: "/markets",
      hrefLabel: "Open market board",
    },
  ];
  const sidebarQuickStatItems = [
    {
      label: "Truth posture",
      value: truthMeta.label,
      helper: stock.snapshotMeta?.marketLabel ?? "--",
    },
    {
      label: "Quote source",
      value: formatDisplayDash(stock.snapshotMeta?.source),
      helper: formatDisplayDash(stock.snapshotMeta?.lastUpdated),
    },
    {
      label: "Chart window",
      value: formatDisplayDash(chartWindow),
      helper: formatDisplayDash(chartCoverage),
    },
    {
      label: "Benchmark",
      value: formatDisplayDash(benchmark?.title),
      helper: "Primary market comparison route.",
    },
    {
      label: "Primary peer",
      value: formatDisplayDash(primaryPeer?.name),
      helper: "Closest adjacent stock route.",
    },
    {
      label: "Sector route",
      value: formatDisplayDash(displaySector),
      helper: "Main category handoff for grouped discovery.",
    },
  ];
  const stockRouteLinks = [
    {
      eyebrow: "Sector",
      title: `${displaySector} sector hub`,
      description:
        "Move from one company into the broader same-theme route when you want peer context, leaders, and grouped stock discovery.",
      href: `/sectors/${slugifyRouteToken(displaySector)}`,
      hrefLabel: "Open sector hub",
      meta: displaySector,
    },
    {
      eyebrow: "Peer route",
      title: primaryPeer?.name ?? "Peer routes",
      description: primaryPeer
        ? "Use the strongest adjacent stock handoff when you want a quicker like-for-like read before a deeper compare workflow."
        : "Peer routes will appear here once an adjacent stock handoff is available for this name.",
      href: primaryPeer?.href ?? "/stocks",
      hrefLabel: primaryPeer ? "Open peer stock" : "Open stocks hub",
      meta: primaryPeer?.ratioLabel ?? "Peers",
    },
    {
      eyebrow: "Index context",
      title: "Nifty 50 benchmark",
      description:
        "Step back into the index route when the single-name move needs breadth, leadership, and broader market mood context.",
      href: "/nifty50",
      hrefLabel: "Open Nifty 50",
      meta: benchmark?.title ?? "Index",
    },
    {
      eyebrow: "Market board",
      title: "Market intelligence",
      description:
        "Use the broader market board for indices, metals, currency, and route handoffs while staying inside the same product system.",
      href: "/markets",
      hrefLabel: "Open markets",
      meta: "Context",
    },
    {
      eyebrow: "Learning",
      title: "Courses and investor context",
      description:
        "Open the approved learning layer when the research journey should widen into frameworks, investor process, or a beginner refresher.",
      href: "/courses",
      hrefLabel: "Open courses",
      meta: "Education",
    },
  ];
  const renderableNewsItems = stock.newsItems.filter(isRenderableStockNewsItem).slice(0, 4);
  const hasRenderableNews = renderableNewsItems.length > 0;
  const stockContextItems = hasRenderableNews
    ? renderableNewsItems.slice(0, 3).map((item) => ({
        title: item.type,
        body: item.title,
        meta: item.source,
      }))
    : stock.faqItems.slice(0, 3).map((item) => ({
        title: item.question,
        body: item.answer,
        meta: "FAQ context",
      }));
  const stockResearchNoteItems = stock.keyPoints.slice(0, 3).map((item) => ({
    body: item,
  }));
  const displaySessionRows = mergeSessionRowsWithPreview(sessionRows, previewData);
  const displayTrailingRows = previewData
    ? trailingRows.map((row) => {
        const simulatedValueByPeriod: Record<string, string> = {
          "Latest move": previewData.trailing.latestMove,
          "1 Month": previewData.trailing.month1,
          "3 Month": previewData.trailing.month3,
          "6 Month": previewData.trailing.month6,
          "1 Year": previewData.trailing.year1,
          "3 Year": previewData.trailing.year3,
          "5 Year": previewData.trailing.year5,
        };

        return {
          ...row,
          asset: isUnavailableLike(row.asset) ? simulatedValueByPeriod[row.period] ?? row.asset : row.asset,
          categoryAverage:
            row.period === "1 Year" && isUnavailableLike(row.categoryAverage)
              ? previewData.performance.peerOneYearAverage
              : formatDisplayDash(row.categoryAverage),
          benchmarkIndex:
            row.period !== "Latest move" && isUnavailableLike(row.benchmarkIndex)
              ? "Benchmark history pending"
              : formatDisplayDash(row.benchmarkIndex),
          outperform:
            row.period === "1 Year"
              ? false
              : row.outperform,
        };
      })
    : trailingRows.map((row) => ({
        ...row,
        categoryAverage: formatDisplayDash(row.categoryAverage),
        benchmarkIndex: formatDisplayDash(row.benchmarkIndex),
      }));
  const displayFundamentalsOverviewItems = previewData
    ? fundamentalsOverviewItems.map((item) => {
        if (item.label === "Market cap" && isUnavailableLike(item.value)) {
          return {
            ...item,
            value: previewData.fundamentals.marketCap,
            note: "Indicative value while verified market-cap coverage is still being connected.",
          };
        }

        if (item.label === "P/E" && isUnavailableLike(item.value)) {
          return {
            ...item,
            value: previewData.fundamentals.pe,
            note: "Indicative valuation read until the verified ratio feed is available.",
          };
        }

        if (item.label === "Sector" && isPreviewFallbackCandidate(item.value)) {
          return {
            ...item,
            value: previewData.fundamentals.sector,
            note: "Route-level sector mapping while deeper classification coverage is still being connected.",
          };
        }

        if (item.label === "Industry") {
          return {
            ...item,
            value: previewData.fundamentals.industry,
            note: "Route-level industry mapping until the fuller industry feed is available.",
          };
        }

        return item;
      })
    : fundamentalsOverviewItems;
  const displayPeerComparisonRows = previewData
    ? previewData.peers.map((peer) => {
        const matchingPeer = similarAssets.find(
          (item) => item.name.toLowerCase() === peer.label.toLowerCase(),
        );

        return {
          label: peer.label,
          price: peer.price,
          change1Y: peer.change1Y,
          ratioValue: peer.ratioValue,
          marketCap:
            matchingPeer?.marketCap ??
            peer.marketCap ??
            (peer.label === stock.name ? previewData.fundamentals.marketCap : "--"),
          href: peer.href,
        };
      })
    : peerComparisonRows.map((peer) => ({
        ...peer,
        marketCap:
          similarAssets.find((item) => item.name === peer.label)?.marketCap ?? "--",
      }));

  const timeframeOptions = [
    { id: "1W" as const, label: "1W", sessions: 5 },
    { id: "1M" as const, label: "1M", sessions: 22 },
    { id: "3M" as const, label: "3M", sessions: 66 },
    { id: "6M" as const, label: "6M", sessions: 132 },
    { id: "1Y" as const, label: "1Y", sessions: 252 },
    { id: "3Y" as const, label: "3Y", sessions: 756 },
    { id: "5Y" as const, label: "5Y", sessions: 1260 },
  ];
  const activeTimeframeConfig =
    timeframeOptions.find((option) => option.id === activeTimeframe) ?? timeframeOptions[4];
  const timeframeAvailability = useMemo(
    () =>
      timeframeOptions.map((option) => ({
        ...option,
        disabled: chartSnapshot.bars.length <= option.sessions,
      })),
    [chartSnapshot.bars.length],
  );
  useEffect(() => {
    const activeOption = timeframeAvailability.find((option) => option.id === activeTimeframe);

    if (!activeOption?.disabled) {
      return;
    }

    const fallbackOption =
      timeframeAvailability.find((option) => option.id === "1Y" && !option.disabled) ??
      timeframeAvailability.find((option) => !option.disabled);

    if (fallbackOption && fallbackOption.id !== activeTimeframe) {
      setActiveTimeframe(fallbackOption.id);
    }
  }, [activeTimeframe, timeframeAvailability]);
  const visibleBars = useMemo(
    () => normalizeChartBars(chartSnapshot, activeTimeframeConfig.sessions),
    [activeTimeframeConfig.sessions, chartSnapshot],
  );
  const visibleChartPoints = useMemo(
    () => buildChartComparisonData(visibleBars, benchmarkHistory, sectorBenchmarkHistory),
    [benchmarkHistory, sectorBenchmarkHistory, visibleBars],
  );
  const chartPoints = visibleChartPoints.chartPoints;
  const overlayLines = visibleChartPoints.overlayLines;
  const benchmarkComparisonAvailable = visibleChartPoints.benchmarkAvailable;
  const benchmarkLabel = formatBenchmarkLabel(benchmarkSlug);
  const sectorLabel = sectorBenchmarkSlug ? formatBenchmarkLabel(sectorBenchmarkSlug) : "";
  const displayOverlayLines = overlayLines.map((line, index) => ({
    ...line,
    label: index === 0 ? benchmarkLabel : sectorLabel || line.label,
  }));
  const stockSelectedReturn = computeSelectedReturn(chartPoints.map((point) => point.value));
  const benchmarkSelectedReturn = computeSelectedReturn(overlayLines[0]?.values ?? []);
  const outperformance =
    stockSelectedReturn !== null && benchmarkSelectedReturn !== null
      ? stockSelectedReturn - benchmarkSelectedReturn
      : null;
  const stockDrawdown = computeMaxDrawdown(chartPoints.map((point) => point.value));
  const benchmarkDrawdown = computeMaxDrawdown(overlayLines[0]?.values ?? []);

  const detailsRange =
    derive52WeekRange(chartSnapshot) ?? splitRangeValue(readStockStat(stock, "52W Range"));
  const marketSourceLine = stock.primarySourceCode === "nse_equities" ? "NSE / BSE" : "NSE / BSE";
  const quoteSourceLine = [
    formatDisplayDash(stock.snapshotMeta?.source),
    formatDisplayDash(stock.snapshotMeta?.lastUpdated),
  ].join(" • ");
  const chartSourceLine = [
    formatDisplayDash(chartSnapshot.source),
    describeChartTruth(chartSnapshot),
    formatDisplayDash(chartSnapshot.lastUpdated),
  ].join(" • ");
  const shareholdingSourceLine = stock.shareholdingMeta
    ? `${stock.shareholdingMeta.source} • ${stock.shareholdingMeta.sourceDate}`
    : "Company filings";
  const compareHref = derivePeerCompareHref(stock.slug, primaryPeer?.href);
  const tradingViewHref = buildTradingViewHref(stock.symbol);
  const sidebarActionLinks = [
    {
      eyebrow: "Primary chart",
      title: "Open in TradingView",
      description: "Launch the external chart for deeper drawing tools and benchmark overlays.",
      href: tradingViewHref,
      hrefLabel: "Open in TradingView",
      meta: "Chart",
    },
    {
      eyebrow: "Alerts",
      title: "Set Price Alert",
      description: "Keep this route actionable when the next move matters more than more reading.",
      href: "/alerts",
      hrefLabel: "Set Price Alert",
      meta: "Alert",
    },
    {
      eyebrow: "Compare",
      title: "Compare with Peers",
      description: "Jump into the structured peer-compare flow without rebuilding the symbol pair yourself.",
      href: compareHref,
      hrefLabel: "Compare with Peers",
      meta: "Peer compare",
    },
    {
      eyebrow: "Filings",
      title: "View Filings",
      description: "Open the filing archive and keep the fundamental read tied to primary disclosures.",
      href: "/reports",
      hrefLabel: "View Filings",
      meta: "Docs",
    },
    {
      eyebrow: "Watchlist",
      title: "Add to Watchlist",
      description: "Save the stock into the account workflow when the page has enough context for follow-up.",
      href: "/account/watchlists",
      hrefLabel: "Add to Watchlist",
      meta: "Workspace",
    },
  ];
  const compactReturnStrip = [
    { label: "1D", value: formatDisplayDash(stock.change) },
    { label: "1W", value: formatDisplayDash(computeChartReturn(chartSnapshot, 5, "--")) },
    { label: "1M", value: formatDisplayDash(displayTrailingRows[1]?.asset) },
    { label: "1Y", value: formatDisplayDash(displayTrailingRows[4]?.asset) },
    { label: "3Y", value: formatDisplayDash(displayTrailingRows[5]?.asset) },
  ];
  const glanceItems = [
    { label: "Exchange symbol", value: stock.symbol || "--", mono: false },
    { label: "Sector", value: formatDisplayDash(displaySector), mono: false },
    { label: "Benchmark", value: formatDisplayDash(benchmark?.title), mono: false },
    {
      label: "Last close",
      value: formatDisplayDash(displaySessionRows.find((row) => row.label === "Close")?.value),
      mono: true,
    },
    { label: "Current mode", value: truthMeta.label, mono: false },
    {
      label: "Last trusted update",
      value: presentStockValue(stock.snapshotMeta?.lastUpdated, stockPlaceholderCopy.notConnected),
      mono: false,
    },
  ];
  const stockDetailRows = [
    { label: "Market cap", value: formatDisplayDash(displayFundamentalsOverviewItems[0]?.value) },
    { label: "P/E", value: formatDisplayDash(displayFundamentalsOverviewItems[1]?.value) },
    { label: "P/B", value: formatDisplayDash(verifiedPb) },
    { label: "ROE", value: formatDisplayDash(verifiedRoe) },
    { label: "ROCE", value: formatDisplayDash(verifiedRoce) },
    { label: "52W High", value: formatDisplayDash(detailsRange.high) },
    { label: "52W Low", value: formatDisplayDash(detailsRange.low) },
    { label: "Dividend yield", value: formatDisplayDash(verifiedDividendYield) },
    { label: "Sector", value: formatDisplayDash(displaySector) },
    { label: "Exchange", value: "NSE" },
  ];
  const shareholdingLookup = new Map(
    stock.shareholding.map((item) => [item.label.toLowerCase(), item]),
  );
  const shareholdingRows = ["Promoters", "FIIs", "DIIs", "Public"].map((label) => {
    const existing = shareholdingLookup.get(label.toLowerCase());

    return {
      label,
      value: formatDisplayDash(existing?.value),
      helper:
        existing?.note ??
        "Ownership coverage will expand here once the durable holdings source is connected.",
    };
  });
  const performanceRows = [
    {
      label: "Latest move",
      value: formatDisplayDash(stock.change),
      helper: "Most recent trusted route move.",
    },
    {
      label: "Benchmark move",
      value: benchmarkReturns?.["1D"] ?? (benchmark ? formatProductPercent(benchmark.movePercent, 2, "--") : "--"),
      helper: benchmark?.title ?? "Nifty 50 benchmark route",
    },
    {
      label: "1 Week",
      value: formatDisplayDash(computeChartReturn(chartSnapshot, 5, "--")),
      helper: "Short retained window from daily bars.",
    },
    {
      label: "1 Month",
      value: formatDisplayDash(displayTrailingRows[1]?.asset),
      helper: "Stock path over the current retained month window.",
    },
    {
      label: "1 Year",
      value: formatDisplayDash(displayTrailingRows[4]?.asset),
      helper: "Retained one-year path when the bar history supports it.",
    },
    {
      label: "Peer context",
      value: formatDisplayDash(peerOneYearAverage),
      helper: "Average one-year move across the visible peer row.",
    },
  ];
  const routeDetailsRows = [
    { label: "Truth posture", value: truthMeta.label, helper: stock.snapshotMeta?.marketLabel ?? "--" },
    {
      label: "Quote source",
      value: formatDisplayDash(stock.snapshotMeta?.source),
      helper: formatDisplayDash(stock.snapshotMeta?.lastUpdated),
    },
    {
      label: "Chart source",
      value: formatDisplayDash(chartSnapshot.source),
      helper: `${describeChartTruth(chartSnapshot)} • ${formatDisplayDash(chartSnapshot.lastUpdated)}`,
    },
    { label: "Chart window", value: formatDisplayDash(chartWindow), helper: formatDisplayDash(chartCoverage) },
    { label: "Benchmark", value: formatDisplayDash(benchmark?.title), helper: "Primary market comparison route." },
    { label: "Primary peer", value: formatDisplayDash(primaryPeer?.name), helper: "Best adjacent stock handoff." },
  ];
  const profitabilityRows = stock.fundamentals.map((item) => ({
    label: item.label,
    value: formatDisplayDash(item.value),
    helper: item.note,
  }));
  const chartEmptyState = buildStockChartEmptyState(chartSnapshot);
  const boardChartWidth = 760;
  const boardChartHeight = 260;
  const boardChartPadding = 24;
  const boardLineGeometry = buildInlineChartGeometry(
    chartPoints.map((point) => point.value),
    boardChartWidth,
    boardChartHeight,
    boardChartPadding,
  );
  const boardComparisonPaths = displayOverlayLines.map((series) => ({
    ...series,
    ...buildInlineChartGeometry(series.values, boardChartWidth, boardChartHeight, boardChartPadding),
  }));
  const hasBoardChart = chartPoints.length > 1;
  const stockStartMarker = boardLineGeometry.points[0]
    ? { x: boardLineGeometry.points[0].x, y: boardLineGeometry.points[0].y, value: "100" }
    : null;
  const lineEndMarkers = [
    {
      label: stock.name,
      tone: "#1B3A6B",
      point: boardLineGeometry.points[boardLineGeometry.points.length - 1],
      value: chartPoints[chartPoints.length - 1]?.value,
    },
    ...boardComparisonPaths.map((series) => ({
      label: series.label,
      tone: series.tone,
      point: series.points[series.points.length - 1],
      value: series.values[series.values.length - 1],
    })),
  ].filter((item) => item.point && typeof item.value === "number");

  const summaryContent = (
    <section id="summary" className="scroll-mt-20 space-y-3">
      <ProductCard tone="primary" className="overflow-hidden p-0">
        <div className="border-b border-[rgba(226,222,217,0.82)] px-3 py-2.5">
          <div className="grid gap-3 sm:grid-cols-5 sm:gap-4">
            {compactReturnStrip.map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.08em] text-[rgba(107,114,128,0.78)]">
                  {item.label}
                </p>
                <p className="riddra-product-number mt-1 text-[16px] font-medium text-[#1B3A6B]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,28%)_minmax(0,44%)_minmax(0,28%)] xl:gap-3">
          <div className="divide-y divide-[rgba(226,222,217,0.82)] border-b border-[rgba(226,222,217,0.82)] xl:border-b-0 xl:border-r">
            <FusedBoardSection
              title="Stock details"
              description="Key fundamentals and listing context."
              sourceLine={quoteSourceLine}
            >
              <div className="grid gap-1.5 sm:grid-cols-2">
                {stockDetailRows.map((row) => (
                  <div key={row.label} className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-2.5 py-2">
                    <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.82)]">
                      {row.label}
                    </p>
                    <p className="riddra-product-number mt-1 text-[16px] text-[#1B3A6B]">{row.value}</p>
                  </div>
                ))}
              </div>
            </FusedBoardSection>
            <FusedBoardSection
              title="Shareholding"
              description="Current ownership mix."
              sourceLine={shareholdingSourceLine}
              muted
            >
              <div className="space-y-1.5">
                {shareholdingRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.84)]">
                        {row.label}
                      </p>
                      <p className="riddra-product-body mt-1 text-[12px] leading-5 text-[rgba(107,114,128,0.76)]">
                        {row.helper}
                      </p>
                    </div>
                    <p className="riddra-product-number text-[15px] text-[#1B3A6B]">{row.value}</p>
                  </div>
                ))}
              </div>
            </FusedBoardSection>
          </div>

          <div className="divide-y divide-[rgba(226,222,217,0.82)] border-b border-[rgba(226,222,217,0.82)] xl:border-b-0 xl:border-r">
            <FusedBoardSection
              title={`${stock.name} price chart`}
              description="Normalized stock line against the linked benchmark and sector index where retained comparison history is available."
              sourceLine={chartSourceLine}
            >
              <div className="flex flex-col gap-2.5 border-b border-[rgba(226,222,217,0.72)] pb-2.5">
                <div className="flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-[8px] border border-[rgba(226,222,217,0.88)] bg-[rgba(250,250,250,0.88)] p-1">
                  {timeframeAvailability.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setActiveTimeframe(option.id)}
                      disabled={option.disabled}
                      className={[
                        "riddra-product-body inline-flex h-7 shrink-0 items-center justify-center rounded-[6px] border px-2.5 text-[12px] font-medium",
                        option.id === activeTimeframe
                          ? "border-[#1B3A6B] bg-[#1B3A6B] text-white"
                          : option.disabled
                            ? "cursor-not-allowed border-transparent bg-transparent text-[rgba(107,114,128,0.45)]"
                            : "border-transparent bg-transparent text-[#1B3A6B]",
                      ].join(" ")}
                      title={option.disabled ? "Insufficient history for this timeframe" : undefined}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {timeframeAvailability.find((option) => option.id === activeTimeframe)?.disabled ? (
                  <p className="riddra-product-body text-[12px] text-[rgba(107,114,128,0.78)]">
                    Insufficient history for this timeframe
                  </p>
                ) : null}
                <div className="grid gap-1 rounded-[8px] border border-[rgba(226,222,217,0.82)] bg-white px-2.5 py-2 text-[12px] text-[rgba(107,114,128,0.82)] min-[520px]:grid-cols-2">
                  <p className="riddra-product-body">
                    <span className="font-medium text-[#1B3A6B]">Benchmark:</span> {benchmarkLabel || "--"}
                  </p>
                  {sectorBenchmarkSlug ? (
                    <p className="riddra-product-body">
                      <span className="font-medium text-[#1B3A6B]">Sector:</span> {sectorLabel || "--"}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: stock.name,
                      tone: "#1B3A6B",
                      returnLabel: formatProductPercent(stockSelectedReturn, 2, "--"),
                    },
                    ...displayOverlayLines.map((line) => ({
                      ...line,
                      returnLabel: formatProductPercent(computeSelectedReturn(line.values), 2, "--"),
                    })),
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(226,222,217,0.82)] bg-white px-2.5 py-1"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.tone }} />
                      <span className="riddra-product-body text-[12px] font-medium text-[#1B3A6B]">
                        {item.label}{" "}
                        <span className="text-[rgba(107,114,128,0.78)]">({item.returnLabel})</span>
                      </span>
                    </div>
                  ))}
                </div>
                {!benchmarkComparisonAvailable ? (
                  <p className="riddra-product-body text-[12px] text-[rgba(107,114,128,0.78)]">
                    Benchmark comparison not available
                  </p>
                ) : null}
              </div>
              {hasBoardChart ? (
                <div className="rounded-[10px] border border-[rgba(221,215,207,0.92)] bg-[linear-gradient(180deg,rgba(27,58,107,0.04),rgba(27,58,107,0.01))] px-2 py-2.5">
                  <svg
                    viewBox={`0 0 ${boardChartWidth} ${boardChartHeight}`}
                    className="h-[260px] w-full"
                    role="img"
                    aria-label={`${stock.name} price chart`}
                  >
                    {[0, 1, 2, 3].map((line) => (
                      <line
                        key={line}
                        x1={boardChartPadding}
                        x2={boardChartWidth - boardChartPadding}
                        y1={boardChartPadding + ((boardChartHeight - boardChartPadding * 2) / 3) * line}
                        y2={boardChartPadding + ((boardChartHeight - boardChartPadding * 2) / 3) * line}
                        stroke="#E2DED9"
                      />
                    ))}
                    {boardComparisonPaths.map((series) => (
                      <path
                        key={series.label}
                        d={series.linePath}
                        fill="none"
                        stroke={series.tone}
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeDasharray={series.dashed ? "7 6" : undefined}
                        opacity={0.92}
                      />
                    ))}
                    <path
                      d={boardLineGeometry.linePath}
                      fill="none"
                      stroke="#1B3A6B"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    {stockStartMarker ? (
                      <g>
                        <text
                          x={Math.max(stockStartMarker.x - 10, 8)}
                          y={Math.max(stockStartMarker.y - 10, 14)}
                          fontSize="11"
                          fill="#1B3A6B"
                        >
                          {stockStartMarker.value}
                        </text>
                      </g>
                    ) : null}
                    {boardLineGeometry.points.map((point, index) => (
                      <circle
                        key={`${point.x}-${point.y}`}
                        cx={point.x}
                        cy={point.y}
                        r="3.5"
                        fill="#FFFFFF"
                        stroke="#1B3A6B"
                        strokeWidth="1.8"
                      >
                        <title>{`${chartPoints[index]?.label ?? `Point ${index + 1}`} • ${chartPoints[index]?.value.toFixed(2)}`}</title>
                      </circle>
                    ))}
                    {lineEndMarkers.map((marker) => (
                      <g key={`${marker.label}-${marker.value}`}>
                        <text
                          x={Math.min((marker.point?.x ?? 0) + 8, boardChartWidth - 52)}
                          y={Math.max((marker.point?.y ?? 0) - 6, 14)}
                          fontSize="11"
                          fill={marker.tone}
                        >
                          {Number(marker.value).toFixed(1)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="rounded-[10px] border border-dashed border-[rgba(221,215,207,0.92)] bg-[rgba(250,250,250,0.72)] px-4 py-8">
                  <p className="riddra-product-display text-[18px] font-semibold text-[#1B3A6B]">
                    {chartEmptyState.title}
                  </p>
                  <p className="riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(107,114,128,0.9)]">
                    {chartEmptyState.description}
                  </p>
                </div>
              )}
              <div className="space-y-2.5 border-t border-[rgba(226,222,217,0.72)] pt-2.5">
                <div className="grid gap-2.5 min-[520px]:grid-cols-3">
                  <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
                      Stock return
                    </p>
                    <p className="riddra-product-number mt-1 text-[15px] text-[#1B3A6B]">
                      {formatProductPercent(stockSelectedReturn, 2, "--")}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
                      Benchmark return
                    </p>
                    <p className="riddra-product-number mt-1 text-[15px] text-[#1B3A6B]">
                      {formatProductPercent(benchmarkSelectedReturn, 2, benchmarkComparisonAvailable ? "--" : "Awaiting benchmark history")}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
                      Outperformance
                    </p>
                    <p className="riddra-product-number mt-1 text-[15px] text-[#1B3A6B]">
                      {formatProductPercent(outperformance, 2, benchmarkComparisonAvailable ? "--" : "Awaiting benchmark history")}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[rgba(226,222,217,0.72)]" />
                <div className="grid gap-2.5 min-[520px]:grid-cols-2">
                  <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
                      Stock max drawdown
                    </p>
                    <p className="riddra-product-number mt-1 text-[15px] text-[#1B3A6B]">
                      {formatProductPercent(stockDrawdown, 2, "--")}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
                      Benchmark max drawdown
                    </p>
                    <p className="riddra-product-number mt-1 text-[15px] text-[#1B3A6B]">
                      {formatProductPercent(benchmarkDrawdown, 2, benchmarkComparisonAvailable ? "--" : "Awaiting benchmark history")}
                    </p>
                  </div>
                </div>
              </div>
            </FusedBoardSection>
            <FusedBoardSection
              title="Trailing returns"
              description="Stock versus peers and benchmark context."
              sourceLine={`${chartSourceLine}${previewData ? " • preview values fill only missing long-window lanes" : ""}`}
              muted
            >
              <div className="overflow-x-auto rounded-[8px] border border-[rgba(226,222,217,0.82)] bg-white">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr className="bg-[linear-gradient(180deg,rgba(226,222,217,0.32),rgba(226,222,217,0.12))] text-left">
                      <th className="px-3 py-2 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">Period</th>
                      <th className="px-3 py-2 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">Stock</th>
                      <th className="px-3 py-2 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">Category</th>
                      <th className="px-3 py-2 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTrailingRows.map((row, index) => (
                      <tr
                        key={row.period}
                        className={index > 0 ? "border-t border-[rgba(226,222,217,0.78)]" : ""}
                      >
                        <td className="px-3 py-2 text-[13px] font-medium text-[#1B3A6B]">{row.period}</td>
                        <td className="riddra-product-number px-3 py-2 text-[14px] text-[#1B3A6B]">
                          {formatDisplayDash(row.asset)}
                        </td>
                        <td className="riddra-product-number px-3 py-2 text-[14px] text-[rgba(107,114,128,0.86)]">
                          {formatDisplayDash(row.categoryAverage)}
                        </td>
                        <td className="riddra-product-number px-3 py-2 text-[14px] text-[rgba(107,114,128,0.86)]">
                          {formatDisplayDash(row.benchmarkIndex)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FusedBoardSection>
          </div>

          <div className="divide-y divide-[rgba(226,222,217,0.82)]">
            <FusedBoardSection
              title="Quick stats"
              description="The fastest route-level checks while reading the stock board."
              sourceLine={quoteSourceLine}
            >
              <div className="overflow-hidden rounded-[8px] border border-[rgba(226,222,217,0.82)] bg-white">
                {sidebarQuickStatItems.map((item, index) => (
                  <div
                    key={item.label}
                    className={[
                      "space-y-1 px-3 py-2",
                      index > 0 ? "border-t border-[rgba(226,222,217,0.78)]" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.82)]">
                        {item.label}
                      </p>
                      <p className="riddra-product-number max-w-[56%] break-words text-right text-[14px] text-[#1B3A6B]">
                        {item.value}
                      </p>
                    </div>
                    {item.helper ? (
                      <p className="riddra-product-body text-[11px] leading-5 text-[rgba(107,114,128,0.78)]">
                        {item.helper}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </FusedBoardSection>
            {sharedSidebarRailData.enabledOnPageType ? (
              <div className="px-0 py-3">
                <SharedMarketSidebarRail
                  visibleBlocks={sharedSidebarRailData.visibleBlocks}
                  marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
                  topGainers={sharedSidebarRailData.topGainers}
                  topLosers={sharedSidebarRailData.topLosers}
                  popularStocks={sharedSidebarRailData.popularStocks}
                />
              </div>
            ) : null}
            {sharedSidebarRailData.enabledOnPageType ? (
              <FusedBoardSection
                title="Actions & docs"
                description="Keep the stock route practical."
                sourceLine={marketSourceLine}
              >
                <div className="space-y-1.5">
                  {sidebarActionLinks.map((item, index) =>
                    index === 0 ? (
                      <a
                        key={item.title}
                        href={item.href}
                        {...getExternalLinkProps()}
                        className="riddra-product-body inline-flex min-h-[38px] w-full items-center justify-center rounded-[8px] bg-[#1B3A6B] px-3 text-[13px] font-medium text-white transition hover:bg-[#264a83]"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <Link
                        key={item.title}
                        href={item.href}
                        {...getInternalLinkProps()}
                        className="flex items-center justify-between gap-3 rounded-[8px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2 transition hover:border-[rgba(27,58,107,0.18)]"
                      >
                        <div className="min-w-0">
                          <p className="riddra-product-body text-[13px] font-medium text-[#1B3A6B]">{item.title}</p>
                          <p className="riddra-product-body text-[11px] text-[rgba(107,114,128,0.74)]">{item.meta}</p>
                        </div>
                        <span className="riddra-product-body text-[12px] text-[rgba(107,114,128,0.7)]">Open</span>
                      </Link>
                    ),
                  )}
                </div>
              </FusedBoardSection>
            ) : null}
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AnnualReturnsBlock
          title="Annual returns"
          description="Calendar-year rows stay visible only where the retained bar window supports them."
          rows={annualRows}
        />
        <ProductInsightGridCard
          title="Fundamentals snapshot"
          description="The core business snapshot shows up here first, while missing deeper fields stay clearly marked instead of guessed."
          items={displayFundamentalsOverviewItems.map((item) => ({
            label: item.label,
            value: formatDisplayDash(item.value),
            note: item.note,
          }))}
          variant="quality"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductDataTableCard
          title="Profitability & balance-sheet lens"
          description="Use the currently available operating fields without stretching beyond what this route can support."
          rows={profitabilityRows}
          variant="analysis"
        />
        <ProductBulletListCard
          title="Research watchpoints"
          description="Compact market and workflow cues that are still useful while reading the stock page."
          items={sidebarWatchpointItems}
          tone="secondary"
          variant="checklist"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductCard tone="secondary" className="space-y-3">
        <ProductSectionTitle
          title="Top peer stocks"
          description="Quick compare row for nearby large-cap peers."
          />
          <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[540px] border-collapse overflow-hidden rounded-[10px] border border-[rgba(226,222,217,0.82)] bg-white">
              <thead>
                <tr className="bg-[linear-gradient(180deg,rgba(226,222,217,0.4),rgba(226,222,217,0.18))] text-left">
                  <th className="px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">Name</th>
                  <th className="px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">CMP</th>
                  <th className="px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">1Y Return</th>
                  <th className="px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">P/E</th>
                  <th className="px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)]">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {displayPeerComparisonRows.slice(0, 5).map((peer, index) => (
                  <tr key={peer.label} className={index === 0 ? "bg-[linear-gradient(180deg,rgba(248,250,252,0.9),#FFFFFF)]" : "border-t border-[#E2DED9] bg-white"}>
                    <td className="px-3 py-2.5">
                      {peer.href ? (
                        <Link href={peer.href} className="riddra-product-body text-sm font-medium text-[#1B3A6B] transition hover:text-[#D4853B]">
                          {peer.label}
                        </Link>
                      ) : (
                        <span className="riddra-product-body text-sm font-medium text-[#1B3A6B]">{peer.label}</span>
                      )}
                    </td>
                    <td className="riddra-product-number px-3 py-2.5 text-[14px] text-[#1B3A6B]">{formatDisplayDash(peer.price)}</td>
                    <td className="riddra-product-number px-3 py-2.5 text-[14px]" style={{ color: getTrendColor(peer.change1Y) }}>
                      {formatDisplayDash(peer.change1Y)}
                    </td>
                    <td className="riddra-product-number px-3 py-2.5 text-[14px] text-[#1B3A6B]">{formatDisplayDash(peer.ratioValue)}</td>
                    <td className="riddra-product-number px-3 py-2.5 text-[14px] text-[#1B3A6B]">
                      {formatDisplayDash(peer.marketCap)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <StockCardSource value={marketSourceLine} />
        </ProductCard>
        <ProductRouteGrid
          title="Related routes"
          description="Keep the next step inside one connected research journey."
          items={stockRouteLinks}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductBulletListCard
          title="Research notes"
          description="Keep the main stock route useful even before every deeper source lane is live."
          items={stockResearchNoteItems}
          tone="secondary"
          variant="context"
        />
        <ProductBulletListCard
          title="Route context"
          description={
            hasRenderableNews
              ? "Recent route hooks and contextual reading cues."
              : "Use the FAQ and route framing here until the connected stock-news lane is live."
          }
          items={stockContextItems}
          tone="secondary"
          variant="context"
        />
      </div>
      <StockCardSource value={marketSourceLine} />
    </section>
  );

  const performanceContent = (
    <ProductEditorialCluster
      id="performance"
      title="Performance & Risk"
      description="Follow the chart with available performance windows, the latest session read, and a benchmark comparison that stays honest when longer history is missing."
      variant="performance"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <TrailingReturnsTable
          title="Trailing returns"
          description="Use the available return windows first. Longer gaps stay clearly labeled until more history is ready."
          rows={displayTrailingRows}
          assetLabel="Stock"
          categoryLabel="Category"
          benchmarkLabel="Benchmark"
        />
        <AnnualReturnsBlock
          title="Annual returns"
          description="Calendar-year rows stay visible only where the retained bar window supports them."
          rows={annualRows}
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ProductDataTableCard
          title="Last trading session"
          description="Compact read of the latest available trading session."
          rows={displaySessionRows.map((row) => ({
            label: row.label,
            value: formatDisplayDash(row.value),
            helper: row.helper,
          }))}
          variant="analysis"
        />
        <ProductDataTableCard
          title="Move and benchmark read"
          description="Use the shorter history windows first, then compare the move with the primary benchmark and peer context."
          rows={performanceRows}
          variant="analysis"
        />
      </div>
      <StockCardSource value={chartSourceLine} />
    </ProductEditorialCluster>
  );

  const qualityContent = (
    <ProductEditorialCluster
      id="quality"
      title="Quality & Ownership"
      description="A tighter read on fundamentals, profitability, and ownership so the page still feels useful even before every extended dataset is connected."
      variant="quality"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductInsightGridCard
          title="Fundamentals snapshot"
          description="The core business snapshot shows up here first, while missing deeper fields stay clearly marked instead of guessed."
          items={displayFundamentalsOverviewItems.map((item) => ({
            label: item.label,
            value: formatDisplayDash(item.value),
            note: item.note,
          }))}
          variant="quality"
        />
        <ProductDataTableCard
          title="Shareholding pattern"
          description="Ownership mix and commentary from the current route."
          rows={shareholdingRows}
          variant="composition"
        />
      </div>
      <ProductDataTableCard
        title="Profitability & balance-sheet lens"
        description="Use the currently available operating fields without stretching beyond what this route can support."
        rows={profitabilityRows}
        variant="analysis"
      />
      <StockCardSource value="Company filings" />
    </ProductEditorialCluster>
  );

  const ratingsContent = (
    <ProductEditorialCluster
      id="ratings"
      title="Ratings & Content"
      description="Route writing, recent headlines, and the key source details that explain what this stock page currently knows."
      variant="routes"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <ProductCard tone="secondary" className="space-y-3">
          <ProductSectionTitle
            title="Opening brief"
            description="The core narrative stays short and investor-readable."
          />
          <blockquote className="border-l-2 border-[#E2DED9] pl-5">
            <p className="riddra-product-body italic text-base leading-8 text-[rgba(107,114,128,0.95)]">
              {stock.summary}
            </p>
            <p className="riddra-product-body mt-4 italic text-base leading-8 text-[rgba(107,114,128,0.95)]">
              {stock.thesis}
            </p>
          </blockquote>
          <StockCardSource value="Research route summary" />
        </ProductCard>
        <ProductBulletListCard
          title="Recent route context"
          description={
            hasRenderableNews
              ? "Surface the current content hooks without turning the stock page into a news feed."
              : "Keep the route readable with research framing and FAQ context until the connected news lane exists."
          }
          items={stockContextItems}
          tone="secondary"
          variant="context"
        />
      </div>
      <ProductDataTableCard
        title="Research details"
        description="Route-level identifiers, source posture, and benchmark context."
        rows={routeDetailsRows}
        variant="context"
      />
      <StockCardSource value={marketSourceLine} />
    </ProductEditorialCluster>
  );

  const analystContent = (
    <ProductEditorialCluster
      id="analyst"
      title="Analyst"
      description="Finish with checklists, next routes, and action paths that are useful on a single-name research page."
      variant="signals"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ProductBulletListCard
          title="Analyst checklist"
          description="Short watchpoints before leaving the page."
          items={stockResearchChecklistItems}
          tone="secondary"
          variant="checklist"
        />
        <ProductDataTableCard
          title="Source and docs"
          description="Current trust posture and where document coverage will land."
          rows={[
            {
              label: "Source posture",
              value: formatDisplayDash(stock.snapshotMeta?.source),
              helper: stock.snapshotMeta?.marketLabel ?? "--",
            },
            {
              label: "Last trusted update",
              value: formatDisplayDash(stock.snapshotMeta?.lastUpdated),
              helper: "Latest route timestamp.",
            },
            {
              label: "Filings coverage",
              value: "--",
              helper: "Company filings will appear here once verified records are attached.",
            },
          ]}
          variant="context"
        />
      </div>
      <ProductRouteGrid
        title="Related routes"
        description="Keep the next step inside one connected research journey."
        items={stockRouteLinks}
      />
      <StockCardSource value={marketSourceLine} />
    </ProductEditorialCluster>
  );

  const latestNewsContent = hasRenderableNews ? (
    <ProductEditorialCluster
      id="news"
      title="Latest News"
      description="Connected stock-news items render here only when the route carries concrete headline coverage."
      variant="routes"
    >
      <ProductBulletListCard
        title="Current news lane"
        description="Headline-level stock news stays hidden until the route has actual article-ready items."
        items={renderableNewsItems.map((item) => ({
          title: item.type,
          body: item.title,
          meta: item.source,
        }))}
        variant="context"
      />
      <StockCardSource value="Market coverage" />
    </ProductEditorialCluster>
  ) : null;

  return (
    <ProductPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Stocks", href: "/stocks" },
        { label: stock.name, href: `/stocks/${stock.slug}` },
      ]}
      hero={
        <HeroPriceBlock
          title={stock.name}
          categoryBadge={displaySector}
          subtitle={`${stock.symbol} • NSE equities route`}
          metaLine={stock.snapshotMeta?.source ?? "NSE / BSE"}
          price={stock.price}
          change={stock.change}
          asOf={presentStockValue(stock.snapshotMeta?.lastUpdated, stockPlaceholderCopy.notConnected)}
          truthState={truthState}
          supportingNote={stock.snapshotMeta?.marketDetail ?? stock.summary}
          cta={
            <div className="w-full max-w-[260px] space-y-3">
              <ProductCard tone="secondary" className="space-y-0 overflow-hidden">
                <div className="space-y-2.5 px-3 py-2.5">
                  <div>
                    <p className="riddra-product-display text-[16px] font-semibold text-[#1B3A6B]">At a glance</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {glanceItems.map((item) => (
                      <div key={item.label} className="min-w-0 rounded-[8px] border border-[rgba(226,222,217,0.82)] bg-white px-2.5 py-2">
                        <p className="riddra-product-body text-[11px] leading-4 text-[rgba(107,114,128,0.78)]">
                          {item.label}
                        </p>
                        <p
                          className={[
                            item.mono ? "riddra-product-number" : "riddra-product-body",
                            "mt-1 truncate text-[13px] font-medium text-[#1B3A6B]",
                          ].join(" ")}
                          title={item.value}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </ProductCard>
              <UserContentActionCard
                pageType="stock"
                slug={stock.slug}
                title={stock.name}
                href={`/stocks/${stock.slug}`}
                isSignedIn={viewerSignedIn}
                allowWatchlist
                watchlistPageType="stock"
                featureGate={{
                  label: "Forecasts",
                  enabled: stockForecastsUnlocked,
                  lockedReason:
                    "Forecast-style stock guidance is available on higher tiers so the basic page stays open while deeper interpretation stays upgrade-led.",
                  ctaHref: "/pricing",
                  ctaLabel: "Upgrade for forecasts",
                }}
              />
            </div>
          }
        />
      }
      stickyTabs={
        <StickyTabBar
          tabs={[
            { id: "summary", label: "Summary", href: "#summary", active: activeSection === "summary" },
            {
              id: "performance",
              label: "Performance & Risk",
              href: "#performance",
              active: activeSection === "performance",
            },
            {
              id: "quality",
              label: "Quality & Ownership",
              href: "#quality",
              active: activeSection === "quality",
            },
            {
              id: "ratings",
              label: "Ratings & Content",
              href: "#ratings",
              active: activeSection === "ratings",
            },
            {
              id: "news",
              label: "Latest News",
              href: "#news",
              active: activeSection === "news",
            },
            { id: "analyst", label: "Analyst", href: "#analyst", active: activeSection === "analyst" },
          ].filter((tab) => (tab.id === "news" ? hasRenderableNews : true))}
        />
      }
      summary={
        <div className="space-y-4">
          {summaryContent}
          {performanceContent}
          {qualityContent}
          {ratingsContent}
          {latestNewsContent}
          {analystContent}
        </div>
      }
    />
  );
}
