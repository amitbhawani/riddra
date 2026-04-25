"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";

import { EntityNewsSection } from "@/components/entity-news-section";
import {
  MainChartContainer,
  ProductCard,
  ProductPageShell,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { UserContentActionCard } from "@/components/user-content-action-card";
import type { StockChartSnapshot } from "@/lib/chart-content";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";
import type { StockSnapshot } from "@/lib/mock-data";
import { formatBenchmarkLabel } from "@/lib/benchmark-labels";
import {
  formatProductDate,
  formatProductPercent,
  getTrendColor,
  parseDesignNumericValue,
  type ProductTruthState,
} from "@/lib/product-page-design";
import type { BenchmarkHistoryEntry } from "@/lib/benchmark-history-store";
import type { SharedSidebarRailData } from "@/lib/shared-sidebar-config";

type SimilarStockCard = {
  name: string;
  price: string;
  change1Y: string;
  ratioLabel: string;
  ratioValue: string;
  marketCap?: string;
  href?: string;
  hrefLabel: string;
};

type MutualFundOwner = {
  fundSlug: string;
  fundName: string;
  weight: string;
  sourceDate: string;
};

type DemoTopShareholder = {
  name: string;
  currentHolding: string;
  previousQuarter: string;
  priorQuarter: string;
  earlierQuarter: string;
};

type DemoInvestorQuarterRow = {
  label: string;
  dec2024: string;
  mar2025: string;
  jun2025: string;
  sep2025: string;
  dec2025: string;
};

type DemoShareholdingBucket = {
  label: string;
  shortLabel?: string;
  value: string;
  color: string;
};

type TestStockDetailDemoData = {
  heroBadgeLabel?: string;
  heroSectorLabel?: string;
  industryLabel?: string | null;
  sectorLabel?: string;
  investorDetails?: Array<{ label: string; value: string; helper: string }>;
  performanceRows?: Array<{ period: string; stock: string; benchmark: string }>;
  chartSummary?: {
    stockReturn: string;
    benchmarkReturn: string;
    outperformance: string;
  };
  topShareholders: DemoTopShareholder[];
  mutualFundOwners: MutualFundOwner[];
  investorDetailRows?: DemoInvestorQuarterRow[];
  shareholdingBuckets?: DemoShareholdingBucket[];
};

type TestStockDetailPageProps = {
  stock: StockSnapshot;
  chartSnapshot: StockChartSnapshot;
  benchmarkSlug: string;
  benchmarkReturns?: Partial<Record<"1D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y", string>> | null;
  benchmarkHistory: BenchmarkHistoryEntry[];
  sectorBenchmarkSlug: string | null;
  sectorBenchmarkHistory: BenchmarkHistoryEntry[];
  similarAssets: SimilarStockCard[];
  mutualFundOwners: MutualFundOwner[];
  demoData: TestStockDetailDemoData;
  marketNews: MarketNewsArticleWithRelations[];
  marketNewsUsedSectorFallback?: boolean;
  marketNewsFallbackSectorLabel?: string | null;
  viewerSignedIn: boolean;
  sharedSidebarRailData: SharedSidebarRailData;
  pageContext?: {
    label: string;
    href: string;
    routeSlug: string;
    title?: string;
    watchlistQuery?: string;
  };
};

type ChartOverlayLine = {
  label: string;
  tone: string;
  values: number[];
  dashed?: boolean;
};

const timeframeSessions: Record<TimeframeId, number> = {
  "1W": 5,
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  "3Y": 756,
  "5Y": 1260,
};

type TimeframeId = "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";

const sectionHeadingClass = "riddra-product-display text-[1.32rem] font-semibold tracking-tight text-[#1F2937]";
const subSectionHeadingClass = "riddra-product-display text-[0.98rem] font-semibold tracking-tight text-[#4B5563]";
const sectionScrollAnchorClass = "scroll-mt-[104px] lg:scroll-mt-[148px]";
const desktopStickyBarEstimatedHeight = 74;
const calculatorReferencePrices: Record<1 | 3 | 5, number> = {
  1: 630,
  3: 481,
  5: 294,
};
const heroPriceAnimationDurationMs = 1400;
const heroScoreAnimationDurationMs = 1100;
const rScoreRingRadius = 33;
const rScoreRingCircumference = 2 * Math.PI * rScoreRingRadius;

type PageSectionTab = {
  id: string;
  label: string;
  onClick: () => void;
  active: boolean;
};

function handleSectionTabClick(event: MouseEvent<HTMLAnchorElement>, onClick: () => void) {
  event.preventDefault();
  onClick();
}

function InlineSectionTabBar({ tabs }: { tabs: PageSectionTab[] }) {
  return (
    <nav
      aria-label="Page sections"
      role="tablist"
      className="relative z-20 inline-flex max-w-full items-center justify-center gap-0.5 rounded-[12px] border border-[rgba(203,213,225,0.9)] bg-[rgba(255,255,255,0.98)] px-2 py-1.5 shadow-[0_10px_22px_rgba(15,23,42,0.055)]"
    >
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          onClick={(event) => handleSectionTabClick(event, tab.onClick)}
          role="tab"
          aria-controls={tab.id}
          aria-selected={tab.active}
          aria-current={tab.active ? "page" : undefined}
          className={[
            "inline-flex h-9 min-w-[124px] items-center justify-center rounded-[10px] px-3.5 text-[13px] font-medium transition sm:h-10 sm:min-w-[132px] sm:px-4 sm:text-[14px]",
            tab.active
              ? "bg-[#1B3A6B] text-white shadow-[0_10px_20px_rgba(27,58,107,0.18)]"
              : "text-[rgba(107,114,128,0.92)] hover:bg-white hover:text-[#1B3A6B]",
          ].join(" ")}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

function TestHeroActionButton({
  label,
  tone = "secondary",
}: {
  label: string;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-10 items-center justify-center rounded-[11px] border px-3.5 text-[13px] font-semibold transition",
        tone === "primary"
          ? "border-[rgba(27,58,107,0.16)] bg-[#2F4A83] text-white shadow-[0_8px_18px_rgba(47,74,131,0.18)]"
          : "border-[rgba(221,215,207,0.96)] bg-white text-[#355286] hover:border-[rgba(27,58,107,0.16)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function buildFallbackForecastSeries(currentPrice: number) {
  const oneYearReference = calculatorReferencePrices[1];
  const start = Number.isFinite(oneYearReference) && oneYearReference > 0 ? oneYearReference : currentPrice * 0.92;
  const weeklyAnchors = [0, 0.04, 0.02, 0.08, 0.11, 0.07, 0.14, 0.18, 0.15, 0.12, 0.09, 0.05, 0.01];

  return weeklyAnchors.map((offset, index) => {
    const progress = index / Math.max(weeklyAnchors.length - 1, 1);
    const baseline = start + (currentPrice - start) * progress;
    const swing = start * offset * (index % 2 === 0 ? 1 : -0.55);

    return Number((baseline + swing).toFixed(2));
  });
}

function isUnavailableLike(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return !normalized || normalized === "unavailable" || normalized.includes("awaiting") || normalized.includes("pending");
}

function readStockStat(stock: StockSnapshot, label: string) {
  return stock.stats.find((item) => item.label === label)?.value ?? "Unavailable";
}

function readShareholdingValue(stock: StockSnapshot, label: string) {
  return stock.shareholding.find((item) => item.label === label)?.value ?? "Unavailable";
}

function formatDisplay(value: string | null | undefined, fallback = "--") {
  return isUnavailableLike(value) ? fallback : value ?? fallback;
}

function mapTruthState(stock: StockSnapshot): ProductTruthState {
  if (stock.snapshotMeta?.mode === "delayed_snapshot") {
    return "delayed_snapshot";
  }

  if (stock.snapshotMeta?.mode === "manual_close") {
    return "delayed_snapshot";
  }

  return "unavailable";
}

function computeReturnLabel(bars: StockChartSnapshot["bars"], sessions: number) {
  if (bars.length <= sessions) {
    return "Awaiting extended history";
  }

  const latest = bars[bars.length - 1]?.close;
  const previous = bars[bars.length - 1 - sessions]?.close;

  if (typeof latest !== "number" || typeof previous !== "number" || previous === 0) {
    return "Awaiting extended history";
  }

  return formatProductPercent(((latest - previous) / previous) * 100, 2, "Awaiting extended history");
}

function derive52WeekRange(chartSnapshot: StockChartSnapshot) {
  if (chartSnapshot.bars.length < 252) {
    return null;
  }

  const bars = chartSnapshot.bars.slice(-252);
  const highs = bars.map((bar) => bar.high).filter(Number.isFinite);
  const lows = bars.map((bar) => bar.low).filter(Number.isFinite);

  if (!highs.length || !lows.length) {
    return null;
  }

  return {
    high: Math.max(...highs),
    low: Math.min(...lows),
  };
}

function deriveTodayRange(chartSnapshot: StockChartSnapshot) {
  const latest = chartSnapshot.bars[chartSnapshot.bars.length - 1];

  if (!latest) {
    return null;
  }

  return {
    high: latest.high,
    low: latest.low,
  };
}

function buildPathGeometry(values: number[], width: number, height: number, padding: number) {
  const safeValues = values.length ? values : [100, 100];
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

function normalizeSeriesValue(price: number, startPrice: number) {
  if (!Number.isFinite(price) || !Number.isFinite(startPrice) || startPrice === 0) {
    return null;
  }

  return Number(((price / startPrice) * 100).toFixed(2));
}

function buildComparisonSeries(
  stockBars: StockChartSnapshot["bars"],
  benchmarkHistory: BenchmarkHistoryEntry[],
  sectorHistory: BenchmarkHistoryEntry[],
  benchmarkSlug: string,
  sectorBenchmarkSlug: string | null,
  timeframe: TimeframeId,
) {
  const sessions = timeframeSessions[timeframe];
  const visibleStockBars = stockBars.length > sessions ? stockBars.slice(-sessions) : stockBars;

  if (visibleStockBars.length < 2) {
    return {
      labels: [] as string[],
      stockValues: [] as number[],
      overlays: [] as ChartOverlayLine[],
      benchmarkAvailable: false,
    };
  }

  const stockMap = new Map(visibleStockBars.map((bar) => [bar.time, bar.close]));
  const benchmarkMap = new Map(benchmarkHistory.map((entry) => [entry.date, entry.close]));
  const sectorMap = new Map(sectorHistory.map((entry) => [entry.date, entry.close]));

  const benchmarkDates = visibleStockBars.map((bar) => bar.time).filter((date) => benchmarkMap.has(date));

  if (benchmarkDates.length < 2) {
    const startPrice = visibleStockBars[0]?.close ?? 0;
    return {
      labels: visibleStockBars.map((bar) => formatProductDate(bar.time)),
      stockValues: visibleStockBars.map((bar) => normalizeSeriesValue(bar.close, startPrice) ?? 100),
      overlays: [] as ChartOverlayLine[],
      benchmarkAvailable: false,
    };
  }

  const sectorDates = benchmarkDates.filter((date) => sectorMap.has(date));
  const activeDates = sectorDates.length >= 2 ? sectorDates : benchmarkDates;
  const stockStart = stockMap.get(activeDates[0] ?? "") ?? 0;
  const benchmarkStart = benchmarkMap.get(activeDates[0] ?? "") ?? 0;
  const sectorStart = sectorMap.get(activeDates[0] ?? "") ?? 0;

  const stockValues = activeDates.map((date) => normalizeSeriesValue(stockMap.get(date) ?? 0, stockStart) ?? 100);
  const overlays: ChartOverlayLine[] = [
    {
      label: formatBenchmarkLabel(benchmarkSlug),
      tone: "#D4853B",
      values: activeDates.map((date) => normalizeSeriesValue(benchmarkMap.get(date) ?? 0, benchmarkStart) ?? 100),
    },
  ];

  if (sectorDates.length >= 2) {
    overlays.push({
      label: formatBenchmarkLabel(sectorBenchmarkSlug ?? "sector"),
      tone: "#6B7280",
      dashed: true,
      values: activeDates.map((date) => normalizeSeriesValue(sectorMap.get(date) ?? 0, sectorStart) ?? 100),
    });
  }

  return {
    labels: activeDates.map((date) => formatProductDate(date)),
    stockValues,
    overlays,
    benchmarkAvailable: true,
  };
}

function computeSeriesReturn(values: number[]) {
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

function computeRScore(stock: StockSnapshot, chartSnapshot: StockChartSnapshot, benchmarkReturns?: TestStockDetailPageProps["benchmarkReturns"]) {
  const qualitySignals = [
    parseDesignNumericValue(readStockStat(stock, "ROE")) ?? 0,
    parseDesignNumericValue(readStockStat(stock, "ROCE")) ?? 0,
  ];
  const ownershipSignals = [
    parseDesignNumericValue(readShareholdingValue(stock, "Promoters")) ?? 0,
    (parseDesignNumericValue(readShareholdingValue(stock, "FIIs")) ?? 0) +
      (parseDesignNumericValue(readShareholdingValue(stock, "DIIs")) ?? 0),
  ];
  const oneYearReturn = parseDesignNumericValue(computeReturnLabel(chartSnapshot.bars, 252)) ?? 0;
  const benchmarkOneYear = parseDesignNumericValue(benchmarkReturns?.["1Y"] ?? "") ?? 0;
  const hasFundamentals = Boolean(stock.fundamentalsMeta?.source);
  const hasShareholding = Boolean(stock.shareholdingMeta?.source);
  const hasDeepHistory = chartSnapshot.bars.length >= 252;

  let score = 38;
  score += Math.max(Math.min(qualitySignals[0] / 2, 14), -6);
  score += Math.max(Math.min(qualitySignals[1] / 2, 12), -6);
  score += Math.max(Math.min((ownershipSignals[0] - 30) / 2, 10), 0);
  score += Math.max(Math.min((ownershipSignals[1] - 20) / 2.5, 10), 0);
  score += Math.max(Math.min((oneYearReturn - benchmarkOneYear) / 2.5, 12), -8);
  score += hasFundamentals ? 5 : 0;
  score += hasShareholding ? 5 : 0;
  score += hasDeepHistory ? 4 : 0;

  const finalScore = Math.round(Math.min(Math.max(score, 15), 92));

  return {
    score: finalScore,
    label:
      finalScore >= 75 ? "Strong" : finalScore >= 60 ? "Constructive" : finalScore >= 45 ? "Watchlist" : "Cautious",
  };
}

function buildForecastValues(chartSnapshot: StockChartSnapshot, currentPrice: number | null) {
  const oneYearBars = chartSnapshot.bars.length >= 252 ? chartSnapshot.bars.slice(-252) : chartSnapshot.bars;
  const closes = oneYearBars.map((bar) => bar.close).filter(Number.isFinite);
  const usableCloses =
    closes.length >= 20
      ? closes
      : currentPrice && Number.isFinite(currentPrice)
        ? buildFallbackForecastSeries(currentPrice)
        : buildFallbackForecastSeries(calculatorReferencePrices[1]);

  const averagePrice = usableCloses.reduce((sum, value) => sum + value, 0) / usableCloses.length;
  const low = averagePrice * 1.08;
  const base = averagePrice * 1.12;
  const high = averagePrice * 1.18;

  return {
    low,
    base,
    high,
    averagePrice,
  };
}

function buildFaqItems(stock: StockSnapshot, chartSnapshot: StockChartSnapshot, rScore: { score: number; label: string }, benchmarkLabel: string, benchmarkReturns?: TestStockDetailPageProps["benchmarkReturns"]) {
  const range52 =
    derive52WeekRange(chartSnapshot) ??
    (chartSnapshot.bars.length
      ? {
          low: Math.min(...chartSnapshot.bars.map((bar) => bar.low)),
          high: Math.max(...chartSnapshot.bars.map((bar) => bar.high)),
        }
      : null);
  const oneYearReturnRaw = computeReturnLabel(chartSnapshot.bars, 252);
  const oneYearReturn = oneYearReturnRaw.includes("Awaiting") ? "+38.75%" : oneYearReturnRaw;
  const benchmarkOneYearReturn = benchmarkReturns?.["1Y"] ?? "+16.20%";

  return [
    {
      question: `What is the current ${stock.name} share price?`,
      answer: `${stock.name} is currently shown at ${stock.price} on this route, with the latest trusted update noted in the header.`,
    },
    {
      question: `How has ${stock.name} performed against ${benchmarkLabel}?`,
      answer: `${stock.name} is showing ${oneYearReturn} over the last one year on this route, while ${benchmarkLabel} is shown at ${benchmarkOneYearReturn}.`,
    },
    {
      question: `What is the 52-week range for ${stock.name}?`,
      answer: range52
        ? `The current 52-week range on this route runs from Rs. ${range52.low.toFixed(2)} to Rs. ${range52.high.toFixed(2)} based on retained OHLCV history.`
        : "The page is still building its longer retained history window, so the displayed range is currently using the recent visible market band.",
    },
    {
      question: `What does the R Score for ${stock.name} mean?`,
      answer: `The current R Score is ${rScore.score}/100, which the page labels as ${rScore.label.toLowerCase()}. It is a route-level composite built from momentum, quality, ownership, and data coverage signals rather than analyst recommendations.`,
    },
  ];
}

function buildRangePosition(current: number | null, low: number | null, high: number | null) {
  if (
    current === null ||
    low === null ||
    high === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(low) ||
    !Number.isFinite(high) ||
    high <= low
  ) {
    return 50;
  }

  return Math.min(Math.max(((current - low) / (high - low)) * 100, 0), 100);
}

function toRupeeNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function buildForecastChartData(
  chartSnapshot: StockChartSnapshot,
  forecast: { low: number; base: number; high: number; averagePrice: number },
  currentPrice: number | null,
) {
  const oneYearBars = chartSnapshot.bars.length >= 252 ? chartSnapshot.bars.slice(-252) : chartSnapshot.bars;
  const weeklyBars = oneYearBars.filter((_, index) => index % 5 === 0);
  const retained = weeklyBars.length >= 12 ? weeklyBars : oneYearBars;
  const prices = retained.map((bar) => bar.close).filter(Number.isFinite);

  const fallbackSeries =
    prices.length >= 10
      ? prices
      : buildFallbackForecastSeries(
          currentPrice && Number.isFinite(currentPrice) ? currentPrice : forecast.averagePrice,
        );
  const series = fallbackSeries.length ? fallbackSeries : [forecast.averagePrice];

  const values = [...series, forecast.low, forecast.base, forecast.high];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const height = 250;
  const width = 620;
  const paddingX = 34;
  const paddingY = 20;
  const historicalWidth = 300;
  const forecastStartX = historicalWidth;
  const forecastEndX = width - 60;
  const scaleY = (price: number) =>
    height - paddingY - ((price - min) / (max - min || 1)) * (height - paddingY * 2);
  const historicalStep = series.length > 1 ? (historicalWidth - paddingX) / (series.length - 1) : 0;
  const historicalPath = series
    .map((price, index) => `${index === 0 ? "M" : "L"} ${(paddingX + historicalStep * index).toFixed(1)} ${scaleY(price).toFixed(1)}`)
    .join(" ");
  const historicalPoints = series.map((price, index) => ({
    x: paddingX + historicalStep * index,
    y: scaleY(price),
  }));
  const lastPrice = series[series.length - 1] ?? forecast.base;
  const startY = scaleY(lastPrice);
  const lastHistoricalDate = retained[retained.length - 1]?.time ? new Date(retained[retained.length - 1].time) : new Date();
  const labels = [0, Math.floor(series.length * 0.25), Math.floor(series.length * 0.5), Math.floor(series.length * 0.75), series.length - 1]
    .filter((index, position, array) => index >= 0 && index < series.length && array.indexOf(index) === position)
    .map((index) => ({
      x: paddingX + historicalStep * index,
      label: retained[index]?.time
        ? formatProductDate(retained[index].time).replace(/\s\d{4}$/, "")
        : formatProductDate(new Date(lastHistoricalDate.getTime() - (series.length - 1 - index) * 7 * 24 * 60 * 60 * 1000)).replace(/\s\d{4}$/, ""),
    }));

  return {
    width,
    height,
    forecastStartX,
    forecastEndX,
    startY,
    lowY: scaleY(forecast.low),
    baseY: scaleY(forecast.base),
    highY: scaleY(forecast.high),
    averageY: scaleY(forecast.averagePrice),
    historicalPath,
    historicalPoints,
    labels,
  };
}

function getInvestorTrendMeta(current: string, previous: string) {
  const currentValue = parseDesignNumericValue(current);
  const previousValue = parseDesignNumericValue(previous);

  if (currentValue === null || previousValue === null) {
    return {
      deltaLabel: "--",
      toneClassName: "bg-[rgba(107,114,128,0.08)] text-[rgba(75,85,99,0.9)]",
      arrow: "•",
    };
  }

  const delta = currentValue - previousValue;

  if (delta > 0) {
    return {
      deltaLabel: `+${delta.toFixed(2)}%`,
      toneClassName: "bg-[rgba(22,163,74,0.12)] text-[#166534]",
      arrow: "↑",
    };
  }

  if (delta < 0) {
    return {
      deltaLabel: `${delta.toFixed(2)}%`,
      toneClassName: "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]",
      arrow: "↓",
    };
  }

  return {
    deltaLabel: "0.00%",
    toneClassName: "bg-[rgba(107,114,128,0.08)] text-[rgba(75,85,99,0.9)]",
    arrow: "→",
  };
}

export function TestStockDetailPage({
  stock,
  chartSnapshot,
  benchmarkSlug,
  benchmarkReturns,
  benchmarkHistory,
  sectorBenchmarkSlug,
  sectorBenchmarkHistory,
  similarAssets,
  mutualFundOwners,
  demoData,
  marketNews,
  marketNewsUsedSectorFallback = false,
  marketNewsFallbackSectorLabel = null,
  viewerSignedIn,
  sharedSidebarRailData,
  pageContext,
}: TestStockDetailPageProps) {
  const showSharedSidebar = sharedSidebarRailData.enabledOnPageType;
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeId>("1Y");
  const [calculatorAmount, setCalculatorAmount] = useState("100000");
  const [calculatorYears, setCalculatorYears] = useState<1 | 3 | 5>(1);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [showStickyPriceBar, setShowStickyPriceBar] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("summary");
  const [showAllMutualFunds, setShowAllMutualFunds] = useState(false);
  const [showAllShareholders, setShowAllShareholders] = useState(false);
  const [animatedHeroPriceValue, setAnimatedHeroPriceValue] = useState(0);
  const [animatedRScoreValue, setAnimatedRScoreValue] = useState(0);
  const stickyPriceBarRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionTargetRef = useRef<string | null>(null);
  const pendingSectionUnlockTimeoutRef = useRef<number | null>(null);
  const pendingSectionAlignTimeoutsRef = useRef<number[]>([]);

  const getResolvedHeaderOffset = () => {
    if (typeof window === "undefined") {
      return 80;
    }

    const shell = document.querySelector(".public-site-shell");
    const computedValue = window
      .getComputedStyle((shell as Element | null) ?? document.documentElement)
      .getPropertyValue("--site-header-offset")
      .trim();
    const parsedValue = Number.parseFloat(computedValue);

    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 80;
  };

  const getSectionChromeOffset = (targetAbsoluteTop?: number) => {
    if (typeof window === "undefined") {
      return 148;
    }

    const headerOffset = getResolvedHeaderOffset();
    const isDesktop = window.innerWidth >= 1024;
    const stickyWillShow =
      isDesktop &&
      (typeof targetAbsoluteTop === "number" ? targetAbsoluteTop > 360 : window.scrollY > 360);
    const stickyBarHeight = stickyPriceBarRef.current?.getBoundingClientRect().height ?? desktopStickyBarEstimatedHeight;

    return headerOffset + (stickyWillShow ? stickyBarHeight + 10 : 12);
  };

  const alignSectionToViewport = (sectionId: string, behavior: ScrollBehavior) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    const sectionAbsoluteTop = window.scrollY + section.getBoundingClientRect().top;
    const chromeOffset = getSectionChromeOffset(sectionAbsoluteTop);
    const targetTop = Math.max(sectionAbsoluteTop - chromeOffset, 0);

    window.scrollTo({ top: targetTop, behavior });
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    if (pendingSectionUnlockTimeoutRef.current !== null) {
      window.clearTimeout(pendingSectionUnlockTimeoutRef.current);
    }
    pendingSectionAlignTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pendingSectionAlignTimeoutsRef.current = [];

    pendingSectionTargetRef.current = sectionId;
    setActiveSectionId(sectionId);
    if (window.location.hash !== `#${sectionId}`) {
      window.history.pushState(null, "", `#${sectionId}`);
    }
    alignSectionToViewport(sectionId, "smooth");
    pendingSectionAlignTimeoutsRef.current = [
      window.setTimeout(() => alignSectionToViewport(sectionId, "auto"), 120),
      window.setTimeout(() => alignSectionToViewport(sectionId, "auto"), 420),
    ];

    pendingSectionUnlockTimeoutRef.current = window.setTimeout(() => {
      pendingSectionTargetRef.current = null;
      pendingSectionUnlockTimeoutRef.current = null;
      pendingSectionAlignTimeoutsRef.current = [];
    }, 1700);
  };

  useEffect(() => {
    const syncDesktopViewport = () => {
      setIsDesktopViewport(window.matchMedia("(min-width: 1024px)").matches);
    };

    syncDesktopViewport();
    window.addEventListener("resize", syncDesktopViewport);

    return () => {
      window.removeEventListener("resize", syncDesktopViewport);
    };
  }, []);

  useEffect(() => {
    const hashSectionId = window.location.hash.replace("#", "");

    if (!["summary", "performance", "ownership", "latest-news", "forecast"].includes(hashSectionId)) {
      return;
    }

    setActiveSectionId(hashSectionId);
    window.requestAnimationFrame(() => alignSectionToViewport(hashSectionId, "auto"));
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("riddra-site-content-theme") ?? window.localStorage.getItem("riddra-test-stock-theme");
    setIsNightMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    const nextTheme = isNightMode ? "dark" : "light";
    document.documentElement.dataset.riddraContentTheme = nextTheme;
    window.localStorage.setItem("riddra-test-stock-theme", nextTheme);
    window.localStorage.setItem("riddra-site-content-theme", nextTheme);
  }, [isNightMode]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme?: "dark" | "light" }>).detail?.theme;
      if (theme === "dark" || theme === "light") {
        setIsNightMode(theme === "dark");
      }
    };

    window.addEventListener("riddra-content-theme-change", handleThemeChange as EventListener);
    return () => {
      window.removeEventListener("riddra-content-theme-change", handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncFromRoot = () => {
      setIsNightMode(root.dataset.riddraContentTheme === "dark");
    };

    syncFromRoot();
    const observer = new MutationObserver(syncFromRoot);
    observer.observe(root, { attributes: true, attributeFilter: ["data-riddra-content-theme"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  function toggleNightMode() {
    const next = !isNightMode;
    setIsNightMode(next);
    window.dispatchEvent(new CustomEvent("riddra-content-theme-change", { detail: { theme: next ? "dark" : "light" } }));
  }

  useEffect(() => {
    const syncStickyPriceBar = () => {
      setShowStickyPriceBar(window.scrollY > 360);
    };

    syncStickyPriceBar();
    window.addEventListener("scroll", syncStickyPriceBar, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncStickyPriceBar);
    };
  }, []);

  useEffect(() => {
    const sectionIds = ["summary", "performance", "ownership", "latest-news", "forecast"] as const;
    const sectionIdSet = new Set<string>(sectionIds);

    const clearPendingAlignment = () => {
      if (pendingSectionUnlockTimeoutRef.current !== null) {
        window.clearTimeout(pendingSectionUnlockTimeoutRef.current);
        pendingSectionUnlockTimeoutRef.current = null;
      }

      pendingSectionAlignTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingSectionAlignTimeoutsRef.current = [];
    };

    const syncHashTarget = () => {
      const hashSectionId = window.location.hash.replace("#", "");

      if (!sectionIdSet.has(hashSectionId)) {
        return false;
      }

      clearPendingAlignment();
      pendingSectionTargetRef.current = hashSectionId;
      setActiveSectionId(hashSectionId);
      window.requestAnimationFrame(() => alignSectionToViewport(hashSectionId, "auto"));
      pendingSectionAlignTimeoutsRef.current = [
        window.setTimeout(() => alignSectionToViewport(hashSectionId, "auto"), 120),
        window.setTimeout(() => alignSectionToViewport(hashSectionId, "auto"), 420),
      ];
      pendingSectionUnlockTimeoutRef.current = window.setTimeout(() => {
        pendingSectionTargetRef.current = null;
        pendingSectionUnlockTimeoutRef.current = null;
        pendingSectionAlignTimeoutsRef.current = [];
      }, 1700);

      return true;
    };

    const syncActiveSection = () => {
      const activationOffset = getSectionChromeOffset() + 20;
      const pendingSectionId = pendingSectionTargetRef.current;

      if (pendingSectionId) {
        setActiveSectionId(pendingSectionId);
        return;
      }

      let nextActive: (typeof sectionIds)[number] = sectionIds[0];

      for (const id of sectionIds) {
        const section = document.getElementById(id);

        if (!section) {
          continue;
        }

        const rect = section.getBoundingClientRect();
        if (rect.top <= activationOffset) {
          nextActive = id;
        }
      }

      setActiveSectionId(nextActive);
    };

    if (!syncHashTarget()) {
      syncActiveSection();
    }
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);
    window.addEventListener("hashchange", syncHashTarget);

    return () => {
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
      window.removeEventListener("hashchange", syncHashTarget);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pendingSectionUnlockTimeoutRef.current !== null) {
        window.clearTimeout(pendingSectionUnlockTimeoutRef.current);
      }
      pendingSectionAlignTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingSectionAlignTimeoutsRef.current = [];
    };
  }, []);

  const truthState = mapTruthState(stock);
  const latestPriceValue = parseDesignNumericValue(stock.price);
  const rScore = useMemo(() => computeRScore(stock, chartSnapshot, benchmarkReturns), [stock, chartSnapshot, benchmarkReturns]);
  const forecast = useMemo(() => buildForecastValues(chartSnapshot, latestPriceValue), [chartSnapshot, latestPriceValue]);
  const comparisonSeries = useMemo(
    () =>
      buildComparisonSeries(
        chartSnapshot.bars,
        benchmarkHistory,
        sectorBenchmarkHistory,
        benchmarkSlug,
        sectorBenchmarkSlug,
        activeTimeframe,
      ),
    [activeTimeframe, benchmarkHistory, benchmarkSlug, chartSnapshot.bars, sectorBenchmarkHistory, sectorBenchmarkSlug],
  );

  const chartWidth = 760;
  const chartHeight = 300;
  const chartPadding = 24;
  const stockGeometry = buildPathGeometry(comparisonSeries.stockValues, chartWidth, chartHeight, chartPadding);
  const overlayGeometries = comparisonSeries.overlays.map((line) => ({
    ...line,
    geometry: buildPathGeometry(line.values, chartWidth, chartHeight, chartPadding),
  }));

  const stockReturn = computeSeriesReturn(comparisonSeries.stockValues);
  const benchmarkReturn = computeSeriesReturn(comparisonSeries.overlays[0]?.values ?? []);
  const outperformance =
    stockReturn !== null && benchmarkReturn !== null ? stockReturn - benchmarkReturn : null;

  const todayRange = deriveTodayRange(chartSnapshot);
  const week52Range = derive52WeekRange(chartSnapshot);
  const benchmarkLabel = formatBenchmarkLabel(benchmarkSlug);
  const sectorLabel = demoData.sectorLabel ?? (sectorBenchmarkSlug ? formatBenchmarkLabel(sectorBenchmarkSlug) : null);
  const displaySectorName = demoData.heroSectorLabel ?? stock.sector;
  const displayIndustryLabel = demoData.industryLabel ?? null;
  const heroBadgeLabel = demoData.heroBadgeLabel ?? stock.symbol;
  const isNegativeChange = stock.change.trim().startsWith("-");
  const priceChangePillClass = isNegativeChange
    ? "border-[rgba(220,38,38,0.14)] bg-[rgba(239,68,68,0.1)] text-[#DC2626]"
    : "border-[rgba(22,163,74,0.14)] bg-[rgba(22,163,74,0.1)] text-[#16A34A]";
  const benchmarkReturnFallbacks: Record<"1D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y", string> = {
    "1D": "+0.74%",
    "1M": "+3.11%",
    "3M": "+8.66%",
    "6M": "+12.84%",
    "1Y": "+16.20%",
    "3Y": "+58.40%",
    "5Y": "+112.60%",
  };
  const faqItems = buildFaqItems(stock, chartSnapshot, rScore, benchmarkLabel, benchmarkReturns);
  const availableYears: Array<1 | 3 | 5> = [1, 3, 5];
  const calculatorWindowBars = chartSnapshot.bars.length >= calculatorYears * 252 ? chartSnapshot.bars.slice(-(calculatorYears * 252 + 1)) : [];
  const calculatorStart = calculatorWindowBars[0]?.close ?? calculatorReferencePrices[calculatorYears] ?? null;
  const calculatorEnd = latestPriceValue ?? calculatorWindowBars[calculatorWindowBars.length - 1]?.close ?? null;
  const calculatorAmountNumber = Number(calculatorAmount.replace(/[^0-9.]/g, ""));
  const calculatorProjectedValue =
    calculatorStart && calculatorEnd && calculatorAmountNumber > 0
      ? (calculatorAmountNumber * calculatorEnd) / calculatorStart
      : null;
  const calculatorDisplayValue = calculatorProjectedValue;
  const calculatorProfitValue =
    calculatorDisplayValue !== null && calculatorAmountNumber > 0 ? calculatorDisplayValue - calculatorAmountNumber : null;
  const calculatorProfitPercent =
    calculatorProfitValue !== null && calculatorAmountNumber > 0 ? (calculatorProfitValue / calculatorAmountNumber) * 100 : null;
  const calculatorResultTone =
    calculatorProfitValue === null ? "#1F2937" : calculatorProfitValue >= 0 ? "#6DA544" : "#C84B4B";
  const resolvedPageContext = pageContext ?? {
    label: "Test Motors Page",
    href: "/stocks/test-motors",
    routeSlug: "test-motors",
    title: `${stock.name} Test Page`,
    watchlistQuery: stock.slug,
  };
  const latestBar = chartSnapshot.bars[chartSnapshot.bars.length - 1];
  const previousBar = chartSnapshot.bars[chartSnapshot.bars.length - 2];
  const intradayAverage =
    latestBar && Number.isFinite(latestBar.high) && Number.isFinite(latestBar.low) && Number.isFinite(latestBar.close)
      ? (latestBar.high + latestBar.low + latestBar.close) / 3
      : null;
  const threeMonthBars = chartSnapshot.bars.length >= 66 ? chartSnapshot.bars.slice(-66) : chartSnapshot.bars;
  const oneYearBars = chartSnapshot.bars.length >= 252 ? chartSnapshot.bars.slice(-252) : chartSnapshot.bars;
  const threeYearBars = chartSnapshot.bars.length >= 756 ? chartSnapshot.bars.slice(-756) : chartSnapshot.bars;
  const fiveYearBars = chartSnapshot.bars.length >= 1260 ? chartSnapshot.bars.slice(-1260) : chartSnapshot.bars;
  const historicalStats = {
    threeMonthHigh: threeMonthBars.length ? Math.max(...threeMonthBars.map((bar) => bar.high)) : null,
    threeMonthLow: threeMonthBars.length ? Math.min(...threeMonthBars.map((bar) => bar.low)) : null,
    oneYearHigh: oneYearBars.length ? Math.max(...oneYearBars.map((bar) => bar.high)) : null,
    oneYearLow: oneYearBars.length ? Math.min(...oneYearBars.map((bar) => bar.low)) : null,
    threeYearHigh: threeYearBars.length ? Math.max(...threeYearBars.map((bar) => bar.high)) : null,
    threeYearLow: threeYearBars.length ? Math.min(...threeYearBars.map((bar) => bar.low)) : null,
    fiveYearHigh: fiveYearBars.length ? Math.max(...fiveYearBars.map((bar) => bar.high)) : null,
    fiveYearLow: fiveYearBars.length ? Math.min(...fiveYearBars.map((bar) => bar.low)) : null,
  };
  const resolvedWeek52Range =
    week52Range ??
    (historicalStats.oneYearLow !== null && historicalStats.oneYearHigh !== null
      ? { low: historicalStats.oneYearLow, high: historicalStats.oneYearHigh }
      : null);
  const performanceRows = demoData.performanceRows ?? [
    { period: "1D", stock: stock.change, benchmark: benchmarkReturns?.["1D"] ?? benchmarkReturnFallbacks["1D"] },
    { period: "1M", stock: computeReturnLabel(chartSnapshot.bars, 22), benchmark: benchmarkReturns?.["1M"] ?? benchmarkReturnFallbacks["1M"] },
    { period: "3M", stock: computeReturnLabel(chartSnapshot.bars, 66), benchmark: benchmarkReturns?.["3M"] ?? benchmarkReturnFallbacks["3M"] },
    { period: "6M", stock: computeReturnLabel(chartSnapshot.bars, 132), benchmark: benchmarkReturns?.["6M"] ?? benchmarkReturnFallbacks["6M"] },
    { period: "1Y", stock: computeReturnLabel(chartSnapshot.bars, 252), benchmark: benchmarkReturns?.["1Y"] ?? benchmarkReturnFallbacks["1Y"] },
    { period: "3Y", stock: computeReturnLabel(chartSnapshot.bars, 756), benchmark: benchmarkReturns?.["3Y"] ?? benchmarkReturnFallbacks["3Y"] },
  ];
  const chartSummary = demoData.chartSummary ?? {
    stockReturn: stockReturn !== null ? formatProductPercent(stockReturn ?? 0, 2, "Awaiting extended history") : "+38.75%",
    benchmarkReturn:
      benchmarkReturn !== null
        ? formatProductPercent(benchmarkReturn ?? 0, 2, benchmarkReturnFallbacks["1Y"])
        : benchmarkReturnFallbacks["1Y"],
    outperformance:
      outperformance !== null
        ? formatProductPercent(outperformance ?? 0, 2, "+22.55%")
        : "+22.55%",
  };
  const investorDetailRows = demoData.investorDetails ?? [
    { label: "Symbol", value: stock.symbol, helper: "" },
    { label: "Sector", value: stock.sector, helper: "" },
    { label: "Market cap", value: formatDisplay(readStockStat(stock, "Market Cap")), helper: "" },
    { label: "P/E", value: formatDisplay(readStockStat(stock, "P/E")), helper: "" },
    { label: "P/B", value: formatDisplay(readStockStat(stock, "P/B")), helper: "" },
    { label: "ROE", value: formatDisplay(readStockStat(stock, "ROE")), helper: "" },
    { label: "ROCE", value: formatDisplay(readStockStat(stock, "ROCE")), helper: "" },
    { label: "Dividend yield", value: formatDisplay(readStockStat(stock, "Dividend Yield")), helper: "" },
  ];
  const displayMutualFundOwners = mutualFundOwners.length ? mutualFundOwners : demoData.mutualFundOwners;
  const visibleMutualFundOwners = showAllMutualFunds ? displayMutualFundOwners : displayMutualFundOwners.slice(0, 3);
  const investorTimelineRows = demoData.investorDetailRows ?? [];
  const visibleTopShareholders = showAllShareholders ? demoData.topShareholders : demoData.topShareholders.slice(0, 3);
  const shareholdingBuckets = demoData.shareholdingBuckets ?? [
    { label: "Promoters", shortLabel: "Promoters", value: "46.36%", color: "#E85D75" },
    { label: "DIIs", shortLabel: "DIIs", value: "16.42%", color: "#0EA5E9" },
    { label: "Mutual Funds", shortLabel: "MF", value: "11.08%", color: "#F59E0B" },
    { label: "FIIs", shortLabel: "FIIs", value: "19.77%", color: "#7C3AED" },
    { label: "Public", shortLabel: "Public", value: "6.37%", color: "#374151" },
  ];
  const shareholdingTotal = shareholdingBuckets.reduce(
    (sum, bucket) => sum + (parseDesignNumericValue(bucket.value) ?? 0),
    0,
  );
  const maxMutualFundWeight = Math.max(
    ...displayMutualFundOwners.map((item) => parseDesignNumericValue(item.weight) ?? 0),
    1,
  );
  const forecastChart = buildForecastChartData(chartSnapshot, forecast, latestPriceValue);
  const oneYearRangePosition = buildRangePosition(
    latestPriceValue,
    resolvedWeek52Range?.low ?? historicalStats.oneYearLow,
    resolvedWeek52Range?.high ?? historicalStats.oneYearHigh,
  );
  const todayRangePosition = buildRangePosition(latestPriceValue, todayRange?.low ?? null, todayRange?.high ?? null);
  const investorDetailLookup = new Map(
    investorDetailRows.map((row) => [row.label.trim().toLowerCase(), row.value]),
  );
  const previousCloseValue = previousBar?.close ?? latestPriceValue ?? null;
  const lowerCircuitValue = typeof previousCloseValue === "number" ? previousCloseValue * 0.9 : null;
  const upperCircuitValue = typeof previousCloseValue === "number" ? previousCloseValue * 1.1 : null;
  const allTimeHighValue = chartSnapshot.bars.length
    ? Math.max(...chartSnapshot.bars.map((bar) => bar.high))
    : null;
  const allTimeLowValue = chartSnapshot.bars.length
    ? Math.min(...chartSnapshot.bars.map((bar) => bar.low))
    : null;
  const oneYearReturn = computeReturnLabel(chartSnapshot.bars, 252);
  const fairValueUpside =
    typeof latestPriceValue === "number" && latestPriceValue > 0
      ? ((forecast.base - latestPriceValue) / latestPriceValue) * 100
      : null;
  const nextCatalystDate = "28 Apr 2026";
  const relativeStrengthRank = "81 / 100";
  const chartHeaderStats = [
    {
      label: "Alpha",
      value: chartSummary.outperformance,
    },
    {
      label: "RS rank",
      value: relativeStrengthRank,
    },
  ];
  const summaryQuickDetailRows = [
    { label: "Symbol", value: investorDetailLookup.get("symbol") ?? stock.symbol },
    { label: "Sector", value: investorDetailLookup.get("sector") ?? displaySectorName },
    { label: "Market cap", value: investorDetailLookup.get("market cap") ?? "₹3,39,480 Cr" },
    { label: "P/E", value: investorDetailLookup.get("p/e") ?? "13.80" },
    { label: "ROE", value: investorDetailLookup.get("roe") ?? "22.40%" },
    { label: "Dividend yield", value: investorDetailLookup.get("dividend yield") ?? "0.62%" },
  ];
  const summaryPerformanceRows = [
    { label: "Analyst target", value: toRupeeNumber(forecast.base) },
    { label: "Fair value gap", value: formatProductPercent(fairValueUpside ?? 0, 2, "--") },
    { label: "Next catalyst", value: nextCatalystDate },
    { label: "RS rank", value: relativeStrengthRank },
  ];
  const sectionTabs = [
    { id: "summary", label: "Summary", onClick: () => scrollToSection("summary"), active: activeSectionId === "summary" },
    {
      id: "performance",
      label: "Performance",
      onClick: () => scrollToSection("performance"),
      active: activeSectionId === "performance",
    },
    {
      id: "ownership",
      label: "Ownership",
      onClick: () => scrollToSection("ownership"),
      active: activeSectionId === "ownership",
    },
    {
      id: "latest-news",
      label: "News",
      onClick: () => scrollToSection("latest-news"),
      active: activeSectionId === "latest-news",
    },
    { id: "forecast", label: "Forecast", onClick: () => scrollToSection("forecast"), active: activeSectionId === "forecast" },
  ];
  const pageThemeClass = isNightMode ? "test-stock-night" : "";

  useEffect(() => {
    if (!Number.isFinite(latestPriceValue ?? NaN) || latestPriceValue === null) {
      setAnimatedHeroPriceValue(0);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedHeroPriceValue(latestPriceValue);
      return;
    }

    let animationFrame = 0;
    const animationStart = performance.now();

    setAnimatedHeroPriceValue(0);

    const animatePrice = (now: number) => {
      const progress = Math.min((now - animationStart) / heroPriceAnimationDurationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedHeroPriceValue(Number((latestPriceValue * easedProgress).toFixed(2)));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animatePrice);
      }
    };

    animationFrame = window.requestAnimationFrame(animatePrice);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [latestPriceValue, stock.slug]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedRScoreValue(rScore.score);
      return;
    }

    let animationFrame = 0;
    const animationStart = performance.now();

    setAnimatedRScoreValue(0);

    const animateScore = (now: number) => {
      const progress = Math.min((now - animationStart) / heroScoreAnimationDurationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedRScoreValue(Math.round(rScore.score * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animateScore);
      }
    };

    animationFrame = window.requestAnimationFrame(animateScore);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [rScore.score, stock.slug]);

  const animatedHeroPriceLabel =
    latestPriceValue !== null ? toRupeeNumber(animatedHeroPriceValue) : stock.price;
  const animatedRScoreDisplay = Math.max(0, Math.min(animatedRScoreValue, 100));
  const animatedRScoreOffset =
    rScoreRingCircumference - (animatedRScoreDisplay / 100) * rScoreRingCircumference;

  useEffect(() => {
    if (!availableYears.includes(calculatorYears)) {
      setCalculatorYears(availableYears[0] ?? 1);
    }
  }, [availableYears, calculatorYears]);

  return (
    <>
      <style jsx global>{`
        .test-stock-surface-refresh.riddra-product-page {
          background: linear-gradient(180deg, #eef3f7 0%, #e8edf2 100%) !important;
          border-color: rgba(203, 213, 225, 0.9) !important;
        }

        .test-stock-surface-refresh .riddra-product-card,
        .test-stock-surface-refresh .riddra-product-tabbar,
        .test-stock-surface-refresh .test-sticky-hero-bar {
          background: #ffffff !important;
          border-color: rgba(203, 213, 225, 0.9) !important;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.07) !important;
        }

        .test-stock-surface-refresh .riddra-product-card::before,
        .test-stock-surface-refresh .riddra-product-tabbar::before {
          opacity: 0.72;
        }

        .test-stock-surface-refresh .riddra-product-tabbar {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .test-stock-night {
          color-scheme: dark;
        }

        .test-stock-night.riddra-product-page {
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
          border-color: rgba(71, 85, 105, 0.34) !important;
        }

        .test-stock-night .riddra-product-card,
        .test-stock-night .riddra-product-tabbar,
        .test-stock-night .test-sidebar-heading,
        .test-stock-night .test-sticky-hero-bar {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(17, 24, 39, 0.98) 100%) !important;
          border-color: rgba(100, 116, 139, 0.42) !important;
          box-shadow: 0 14px 28px rgba(2, 6, 23, 0.38) !important;
        }

        .test-stock-night .test-sidebar-heading [class*="bg-[#242424]"] {
          background: rgba(51, 65, 85, 0.92) !important;
        }

        .test-stock-night [class*="text-[#111827]"],
        .test-stock-night [class*="text-[#1F2937]"],
        .test-stock-night [class*="text-[#374151]"] {
          color: #f8fafc !important;
        }

        .test-stock-night [class*="text-[#1B3A6B]"],
        .test-stock-night [class*="text-[#355286]"],
        .test-stock-night [class*="text-[#2A62B7]"],
        .test-stock-night [class*="text-[#4361EE]"] {
          color: #bfdbfe !important;
        }

        .test-stock-night [class*="text-[#4B5563]"],
        .test-stock-night [class*="text-[rgba(107,114,128"],
        .test-stock-night [class*="text-[rgba(75,85,99"] {
          color: #cbd5e1 !important;
        }

        .test-stock-night [class*="text-[#8E5723]"] {
          color: #fbbf24 !important;
        }

        .test-stock-night [class*="bg-white"],
        .test-stock-night [class*="bg-[#FFFDF9]"],
        .test-stock-night [class*="bg-[#FCFDFF]"],
        .test-stock-night [class*="bg-[#FAFBFD]"],
        .test-stock-night [class*="bg-[#F7F7F7]"],
        .test-stock-night [class*="bg-[#FCFCFD]"] {
          background: rgba(15, 23, 42, 0.9) !important;
        }

        .test-stock-night [class*="bg-[#EFF5FF]"],
        .test-stock-night [class*="bg-[#EAF1FC]"],
        .test-stock-night [class*="bg-[#F8FBFF]"],
        .test-stock-night [class*="bg-[rgba(27,58,107,0.04)]"],
        .test-stock-night [class*="bg-[rgba(27,58,107,0.03)]"] {
          background: rgba(30, 41, 59, 0.94) !important;
        }

        .test-stock-night [class*="bg-[rgba(239,245,255"],
        .test-stock-night [class*="bg-[rgba(251,244,236"],
        .test-stock-night [class*="bg-[rgba(250,246,240"],
        .test-stock-night [class*="bg-[rgba(246,246,244"],
        .test-stock-night [class*="bg-[rgba(247,249,253"],
        .test-stock-night [class*="bg-[linear-gradient"] {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(17, 24, 39, 0.98) 100%) !important;
        }

        .test-stock-night [class*="bg-[rgba(240,253,244"] {
          background: rgba(20, 83, 45, 0.3) !important;
        }

        .test-stock-night [class*="bg-[rgba(254,242,242"] {
          background: rgba(127, 29, 29, 0.28) !important;
        }

        .test-stock-night [class*="bg-[rgba(27,58,107,0.08)]"] {
          background: rgba(30, 41, 59, 0.94) !important;
        }

        .test-stock-night [class*="border-[rgba(226,222,217"],
        .test-stock-night [class*="border-[rgba(221,215,207"],
        .test-stock-night [class*="border-[rgba(27,58,107"],
        .test-stock-night [class*="border-[rgba(212,133,59"],
        .test-stock-night [class*="border-[rgba(107,114,128"],
        .test-stock-night [class*="border-[rgba(148,163,184"],
        .test-stock-night [class*="border-[#EBA633]"] {
          border-color: rgba(100, 116, 139, 0.42) !important;
        }

        .test-stock-night .riddra-product-tabbar {
          background: rgba(15, 23, 42, 0.94) !important;
        }

        .test-stock-night .riddra-product-tabbar a,
        .test-stock-night .riddra-product-tabbar button,
        .test-stock-night .riddra-product-tabbar span {
          color: #cbd5e1 !important;
        }

        .test-stock-night .riddra-product-tabbar [aria-current="page"] {
          background: #1d4ed8 !important;
          color: #ffffff !important;
          border-color: rgba(96, 165, 250, 0.48) !important;
        }

        .test-stock-night .test-hero-utility a,
        .test-stock-night .test-hero-utility button {
          border-color: rgba(100, 116, 139, 0.48) !important;
        }

        .test-stock-night .test-hero-utility a[href="/account"] {
          background: #1d4ed8 !important;
          color: #ffffff !important;
          border-color: rgba(96, 165, 250, 0.48) !important;
        }

        .test-stock-night .test-hero-utility button,
        .test-stock-night .test-hero-utility a:not([href="/account"]) {
          background: rgba(15, 23, 42, 0.88) !important;
          color: #e2e8f0 !important;
        }

        .test-stock-night input,
        .test-stock-night summary,
        .test-stock-night button {
          color: #e5e7eb;
        }

        .test-stock-night thead tr,
        .test-stock-night tr[class*="bg-[#FAFBFD]"] {
          background: rgba(30, 41, 59, 0.94) !important;
        }

        .test-stock-night svg text {
          fill: #cbd5e1 !important;
        }

        .test-stock-night svg [fill="#FCFCFD"],
        .test-stock-night svg [fill="#FFFDF7"] {
          fill: rgba(15, 23, 42, 0.94) !important;
        }

        .test-stock-night svg [stroke="#E5E7EB"],
        .test-stock-night svg [stroke="#111827"],
        .test-stock-night svg [stroke="#9CA3AF"],
        .test-stock-night svg [stroke="#94A3B8"] {
          stroke: rgba(148, 163, 184, 0.38) !important;
        }

        .test-stock-night svg [fill="#111827"] {
          fill: #e2e8f0 !important;
        }

      `}</style>
      <ProductPageShell
        className={`test-stock-surface-refresh [&>div]:max-w-[1220px] [&>div]:space-y-3 ${pageThemeClass}`}
        hero={
        showStickyPriceBar && isDesktopViewport ? (
          <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--site-header-offset)+2px)] z-[45] hidden lg:block">
            <div className="mx-auto grid w-full max-w-[1220px] gap-3 px-3 sm:px-4 lg:px-4 lg:grid-cols-[minmax(0,76.25%)_minmax(246px,23.75%)] xl:gap-3 xl:grid-cols-[minmax(0,76.9%)_minmax(252px,23.1%)] xl:px-5">
                <div
                  ref={stickyPriceBarRef}
                  className="test-sticky-hero-bar pointer-events-auto ml-0 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[13px] border border-[rgba(27,58,107,0.14)] bg-[rgba(255,255,255,0.96)] px-3.5 py-2 shadow-[0_14px_24px_rgba(27,58,107,0.12)] backdrop-blur"
                >
                  <div className="min-w-0 pr-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(107,114,128,0.7)]">
                    {stock.symbol} · {displaySectorName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-end gap-2">
                    <p className="truncate text-[1rem] font-semibold text-[#111827]">{stock.name}</p>
                    <p className="text-[1rem] font-semibold text-[#1B3A6B]">{stock.price}</p>
                    <p className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.83rem] font-semibold ${priceChangePillClass}`}>
                      {stock.change}
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 items-center justify-end">
                  <div className="flex items-center gap-1.5 rounded-[11px] border border-[rgba(27,58,107,0.1)] bg-[rgba(248,250,252,0.98)] p-1">
                    {sectionTabs.map((tab) => (
                      <a
                        key={tab.id}
                        href={`#${tab.id}`}
                        onClick={(event) => handleSectionTabClick(event, tab.onClick)}
                        role="tab"
                        aria-controls={tab.id}
                        aria-selected={tab.active}
                        aria-current={tab.active ? "page" : undefined}
                        className={[
                          "inline-flex h-9 items-center justify-center rounded-[9px] px-3 text-[13px] font-medium transition",
                          tab.active
                            ? "bg-[#1B3A6B] text-white shadow-[0_8px_16px_rgba(27,58,107,0.16)]"
                            : "text-[rgba(107,114,128,0.92)] hover:bg-white hover:text-[#1B3A6B]",
                        ].join(" ")}
                      >
                        {tab.label}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>
        ) : null
      }
      stickyTabs={null}
      summary={
        <ProductPageTwoColumnLayout
          className="gap-3 xl:gap-3 lg:items-start lg:grid-cols-[minmax(0,76.25%)_minmax(246px,23.75%)] xl:grid-cols-[minmax(0,76.9%)_minmax(252px,23.1%)] [&>div:first-child]:space-y-3 sm:[&>div:first-child]:space-y-3 [&>aside]:gap-3"
          left={
            <div className="space-y-3">
              <ProductCard tone="primary" className="space-y-1.5 overflow-hidden border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFD_100%)]">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[rgba(27,58,107,0.1)] px-3.5 pb-2.5 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {["NSE", "BSE", "Future", "Options"].map((tab, index) => (
                      <button
                        key={tab}
                        type="button"
                        className={[
                          "inline-flex items-center rounded-full border px-3 py-1.25 text-[11px] font-semibold transition",
                          index === 0
                            ? "border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] text-white shadow-[0_10px_20px_rgba(27,58,107,0.12)]"
                            : "border-transparent bg-[rgba(27,58,107,0.03)] text-[rgba(75,85,99,0.9)] hover:border-[rgba(27,58,107,0.1)] hover:bg-white",
                        ].join(" ")}
                      >
                        {index === 0 ? <span className="mr-1.5 h-2 w-2 rounded-full bg-[#F4C542]" /> : null}
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="riddra-product-body text-[12px] text-[rgba(107,114,128,0.86)]">
                      As on {formatDisplay(stock.snapshotMeta?.lastUpdated)} IST • All values in ₹
                    </p>
                    <button
                      type="button"
                      onClick={toggleNightMode}
                      className="inline-flex h-8 items-center justify-center rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1B3A6B]"
                    >
                      {isNightMode ? "Light" : "Night"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 px-3.5 pb-3 lg:grid-cols-[minmax(0,1fr)_146px] lg:items-start">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[9px] bg-[#433C8B] px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.04em] text-white">
                          {heroBadgeLabel}
                        </span>
                      </div>
                      <h1 className="riddra-product-display text-[1.48rem] font-semibold leading-tight tracking-[-0.03em] text-[#1F2937] sm:text-[1.82rem]">
                        {stock.name}
                      </h1>
                      <p className="riddra-product-body text-[13px] text-[rgba(107,114,128,0.9)]">
                        {displayIndustryLabel
                          ? `Sector: ${displaySectorName} | Industry: ${displayIndustryLabel}`
                          : `Sector: ${displaySectorName}`}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-end gap-2.5">
                        <p className="riddra-product-number text-[2.08rem] font-semibold tracking-[-0.05em] text-[#111827] sm:text-[2.42rem]">
                          {animatedHeroPriceLabel}
                        </p>
                        <p
                          className="riddra-product-number text-[0.92rem] font-semibold"
                          style={{ color: getTrendColor(stock.change) }}
                        >
                          {stock.change}
                        </p>
                      </div>
                      <p className="riddra-product-body text-[12px] text-[rgba(107,114,128,0.82)]">
                        {stock.symbol} • {benchmarkLabel} • {sectorLabel ?? benchmarkLabel}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-4">
                        {[
                          { label: "Benchmark", value: benchmarkLabel },
                          { label: "Sector index", value: sectorLabel ?? "Benchmark only" },
                          { label: "Market cap", value: investorDetailLookup.get("market cap") ?? "₹3,39,480 Cr" },
                          { label: "ROE", value: investorDetailLookup.get("roe") ?? "22.40%" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-[11px] border border-[rgba(27,58,107,0.1)] bg-white px-2.5 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">{item.label}</p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#1F2937]">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative rounded-[16px] border border-[rgba(27,58,107,0.14)] bg-white px-3 py-3 text-center shadow-[0_10px_20px_rgba(27,58,107,0.05)]">
                    <div className="relative inline-flex justify-center group/rscore">
                      <Link
                        href="/stocks/r-score-methodology"
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)] hover:text-[#1B3A6B]"
                      >
                        R Score
                      </Link>
                      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-[220px] -translate-x-1/2 rounded-[12px] bg-[#1F2937] px-3 py-2 text-[11px] leading-5 text-white shadow-[0_12px_24px_rgba(17,24,39,0.18)] group-hover/rscore:block">
                        Project Riddra composite score for momentum, quality, ownership, and coverage depth.
                      </div>
                    </div>
                    <div className="relative mx-auto mt-2 h-[82px] w-[82px]">
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 82 82" aria-hidden="true">
                        <defs>
                          <linearGradient id={`r-score-progress-${resolvedPageContext.routeSlug}`} x1="0%" x2="100%" y1="0%" y2="0%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="55%" stopColor="#E4B638" />
                            <stop offset="100%" stopColor="#16A34A" />
                          </linearGradient>
                        </defs>
                        <circle cx="41" cy="41" r={rScoreRingRadius} fill="none" stroke="#E8EDF5" strokeWidth="8" />
                        <circle
                          cx="41"
                          cy="41"
                          r={rScoreRingRadius}
                          fill="none"
                          stroke={`url(#r-score-progress-${resolvedPageContext.routeSlug})`}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={rScoreRingCircumference}
                          strokeDashoffset={animatedRScoreOffset}
                        />
                      </svg>
                      <div className="absolute inset-[12px] flex items-center justify-center rounded-full border-[6px] border-[#E4B638] bg-[#FFFDF7] text-[1.28rem] font-semibold text-[#1B3A6B]">
                        {animatedRScoreDisplay}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[12px] font-medium text-[#1B3A6B]">{rScore.label} <span className="text-[rgba(107,114,128,0.76)]">/100</span></p>
                    <div className="mx-auto mt-1.5 h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-[#E8EDF5]">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#F59E0B,#E4B638,#16A34A)]" style={{ width: `${animatedRScoreDisplay}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-[rgba(107,114,128,0.76)]">Composite conviction scale across quality, momentum, and ownership.</p>
                  </div>

                  <div className="grid gap-1.5 rounded-[14px] bg-[rgba(237,242,248,0.8)] p-1.5 md:grid-cols-4 lg:col-span-2">
                    {[
                      { label: "Prev. Close", value: previousBar ? toRupeeNumber(previousBar.close) : stock.price },
                      { label: "Open", value: latestBar ? toRupeeNumber(latestBar.open) : "--" },
                      { label: "High", value: latestBar ? toRupeeNumber(latestBar.high) : "--" },
                      { label: "Low", value: latestBar ? toRupeeNumber(latestBar.low) : "--" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[11px] bg-white px-2.5 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.74)]">{item.label}</p>
                        <p className="mt-0.5 text-[0.94rem] font-semibold text-[#1B3A6B]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </ProductCard>

              <div
                className={[
                  "relative z-20 flex w-full justify-center pt-1.5 sm:pt-2",
                ].join(" ")}
              >
                {showStickyPriceBar && isDesktopViewport ? null : <InlineSectionTabBar tabs={sectionTabs} />}
              </div>

              <div className="space-y-3">
              <section id="summary" className={sectionScrollAnchorClass}>
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.58fr)_minmax(260px,0.92fr)] xl:items-start">
                  <MainChartContainer
                    chartId={`${resolvedPageContext.routeSlug}-comparison`}
                    title="Price vs benchmark"
                    attribution={undefined}
                    truthState={truthState}
                    showTruthBadge={false}
                    points={comparisonSeries.stockValues.map((value, index) => ({
                      label: comparisonSeries.labels[index] ?? `Point ${index + 1}`,
                      value,
                    }))}
                    timeframes={(Object.keys(timeframeSessions) as TimeframeId[]).map((timeframe) => ({
                      id: timeframe,
                      label: timeframe,
                      active: activeTimeframe === timeframe,
                      onClick: () => setActiveTimeframe(timeframe),
                    }))}
                    supportingStats={[
                      {
                        label: "Stock return",
                        value: chartSummary.stockReturn,
                        helper: "",
                      },
                      {
                        label: "Benchmark return",
                        value: chartSummary.benchmarkReturn,
                        helper: "",
                      },
                      {
                        label: "Outperformance",
                        value: chartSummary.outperformance,
                        helper: "",
                      },
                    ]}
                    chartContent={
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap gap-2">
                          {chartHeaderStats.map((item) => (
                            <div
                              key={item.label}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(221,215,207,0.92)] bg-[#F3F4F6] px-3 py-1.5"
                            >
                              <span className="text-[11px] font-medium text-[rgba(75,85,99,0.9)]">
                                {item.label}
                              </span>
                              <span className="text-[11px] font-semibold text-[#1B3A6B]">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: stock.name, tone: "#1B3A6B", value: formatProductPercent(stockReturn ?? 0, 2, "--") },
                              ...comparisonSeries.overlays.map((line) => ({
                                label: line.label,
                                tone: line.tone,
                                value: formatProductPercent(computeSeriesReturn(line.values) ?? 0, 2, "--"),
                              })),
                            ].map((item) => (
                              <div key={item.label} className="inline-flex items-center gap-2 rounded-full border border-[rgba(226,222,217,0.82)] bg-white px-2.5 py-1">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.tone }} />
                                <span className="riddra-product-body text-[11px] font-medium text-[#1B3A6B]">
                                  {item.label} <span className="text-[rgba(107,114,128,0.76)]">({item.value})</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[10px] border border-[rgba(221,215,207,0.92)] bg-[linear-gradient(180deg,rgba(27,58,107,0.04),rgba(27,58,107,0.01))] px-2 py-2">
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[206px] w-full sm:h-[220px]" role="img" aria-label={`${stock.name} comparison chart`}>
                            {[0, 1, 2, 3].map((line) => (
                              <line
                                key={line}
                                x1={chartPadding}
                                x2={chartWidth - chartPadding}
                                y1={chartPadding + ((chartHeight - chartPadding * 2) / 3) * line}
                                y2={chartPadding + ((chartHeight - chartPadding * 2) / 3) * line}
                                stroke="#E2DED9"
                              />
                            ))}
                            {overlayGeometries.map((line) => (
                              <path
                                key={line.label}
                                d={line.geometry.linePath}
                                fill="none"
                                stroke={line.tone}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeDasharray={line.dashed ? "7 6" : undefined}
                              />
                            ))}
                            <path d={stockGeometry.linePath} fill="none" stroke="#1B3A6B" strokeWidth="2.8" strokeLinecap="round" />
                            <text x={chartPadding} y={18} fontSize="11" fill="#1B3A6B">100</text>
                            {[
                              { tone: "#1B3A6B", value: comparisonSeries.stockValues[comparisonSeries.stockValues.length - 1], point: stockGeometry.points[stockGeometry.points.length - 1] },
                              ...overlayGeometries.map((line) => ({
                                tone: line.tone,
                                value: line.values[line.values.length - 1],
                                point: line.geometry.points[line.geometry.points.length - 1],
                              })),
                            ].map((marker) =>
                              marker.point ? (
                                <text
                                  key={`${marker.tone}-${marker.value}`}
                                  x={Math.min(marker.point.x + 8, chartWidth - 56)}
                                  y={Math.max(marker.point.y - 6, 14)}
                                  fontSize="11"
                                  fill={marker.tone}
                                >
                                  {Number(marker.value ?? 100).toFixed(1)}
                                </text>
                              ) : null,
                            )}
                          </svg>
                        </div>
                      </div>
                    }
                  />

                  <div className="space-y-3">
                    <ProductCard id="details" tone="secondary" className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <ProductSectionTitle
                          title="Quick details"
                          eyebrow="Snapshot"
                        />
                        <Link
                          href="#performance"
                          className="shrink-0 text-[12px] font-semibold text-[#1B3A6B] underline-offset-4 hover:underline"
                        >
                          More data
                        </Link>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {summaryQuickDetailRows.map((row) => (
                          <div key={row.label} className="rounded-[11px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5">
                            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.58)]">{row.label}</p>
                            <p className="mt-1 text-[0.98rem] font-semibold text-[#111827]">{row.value}</p>
                          </div>
                        ))}
                      </div>
                    </ProductCard>

                    <ProductCard tone="secondary" className="space-y-3">
                      <ProductSectionTitle
                        title="Forward view"
                      />
                      <div className="overflow-hidden rounded-[12px] border border-[rgba(27,58,107,0.1)] bg-[rgba(27,58,107,0.04)]">
                        <div className="grid sm:grid-cols-2">
                          {summaryPerformanceRows.slice(0, 2).map((row, index) => (
                            <div
                              key={row.label}
                              className={[
                                "px-3 py-2.5",
                                index === 0 ? "sm:border-r sm:border-[rgba(0,0,0,0.06)]" : "",
                              ].join(" ")}
                            >
                              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">{row.label}</p>
                              <p className={`mt-1 text-[1.02rem] font-semibold ${row.label === "Fair value gap" && row.value.trim().startsWith("-") ? "text-[#DC2626]" : "text-[#1B3A6B]"}`}>
                                {row.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[11px] border border-[rgba(226,222,217,0.82)] border-l-[3px] border-l-[#D4853B] bg-white px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">{summaryPerformanceRows[2]?.label}</p>
                        <p className="mt-1 text-[1.02rem] font-semibold text-[#1B3A6B]">{summaryPerformanceRows[2]?.value}</p>
                      </div>
                      <div className="rounded-[11px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">
                          <span>52W band</span>
                          <span>{toRupeeNumber(resolvedWeek52Range?.low ?? null)} - {toRupeeNumber(resolvedWeek52Range?.high ?? null)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-3">
                          <p className="text-[13px] font-medium text-[#1F2937]">{Math.round(oneYearRangePosition)}% of 52W range</p>
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 w-[60px] rounded-full bg-[rgba(27,58,107,0.12)]">
                              <span
                                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#1B3A6B]"
                                style={{ left: `calc(${Math.min(Math.max(oneYearRangePosition, 0), 100)}% - 5px)` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </ProductCard>
                  </div>
                </div>
              </section>
              </div>

              <section id="performance" className={`${sectionScrollAnchorClass} space-y-3`}>
                <ProductCard tone="secondary" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Performance</p>
                      <h2 className={`mt-1 ${sectionHeadingClass}`}>Stock Performance</h2>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                    <div className="grid gap-3 border-r-0 lg:grid-rows-[minmax(0,1fr)_auto] lg:border-r lg:border-[rgba(226,222,217,0.82)] lg:pr-4">
                      <div className="h-full">
                        <div className="rounded-[13px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3.5 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B3A6B]">Markets today</p>
                        </div>
                        <div className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                          {[
                            { label: "High", value: toRupeeNumber(todayRange?.high ?? null) },
                            { label: "Low", value: toRupeeNumber(todayRange?.low ?? null) },
                            { label: "Open at", value: latestBar ? toRupeeNumber(latestBar.open) : "--" },
                            { label: "Prev Close", value: previousBar ? toRupeeNumber(previousBar.close) : "--" },
                            { label: "Volumes", value: "82,46,318" },
                            { label: "Avg Price", value: intradayAverage ? toRupeeNumber(intradayAverage) : "--" },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between gap-3 border-b border-[rgba(238,238,238,0.9)] pb-2">
                              <span className="text-[13px] text-[rgba(107,114,128,0.9)]">{row.label}</span>
                              <span className="text-[1rem] font-semibold text-[#1F2937]">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className={subSectionHeadingClass}>Price Movement</p>
                          <span className="rounded-full bg-[rgba(27,58,107,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B3A6B]">
                            Today’s intraday band
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="relative h-3">
                            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#E77B6C,#E9C45B,#79B641)]" />
                            <span
                              className="absolute top-1/2 block h-3.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-white/85 bg-[#D48C2A] shadow-[0_1px_3px_rgba(17,24,39,0.22)]"
                              style={{ left: `${todayRangePosition}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[1rem] font-semibold text-[#4B5563]">
                            <span>{toRupeeNumber(todayRange?.low ?? null)}</span>
                            <span>{toRupeeNumber(todayRange?.high ?? null)}</span>
                          </div>
                        </div>
                        <details className="mt-3 rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white px-3.5 py-2.5">
                          <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#1B3A6B]">
                            Advanced market bands →
                          </summary>
                          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            {[
                              { label: "Lower Circuit", value: toRupeeNumber(lowerCircuitValue) },
                              { label: "Upper Circuit", value: toRupeeNumber(upperCircuitValue) },
                            ].map((row) => (
                              <div key={row.label} className="rounded-[11px] border border-[rgba(226,222,217,0.82)] bg-[#FAFBFD] px-3 py-2.5">
                                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">{row.label}</p>
                                <p className="mt-0.5 text-[0.94rem] font-semibold text-[#1F2937]">{row.value}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
                      <div className="h-full">
                        <div className="rounded-[13px] border border-[rgba(212,133,59,0.14)] bg-[rgba(250,246,240,0.82)] px-3.5 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E5723]">Historical performance</p>
                        </div>
                        <div className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                          {[
                            { label: "3 M High", value: toRupeeNumber(historicalStats.threeMonthHigh) },
                            { label: "3 M Low", value: toRupeeNumber(historicalStats.threeMonthLow) },
                            { label: "1 Yr High", value: toRupeeNumber(historicalStats.oneYearHigh) },
                            { label: "1 Yr Low", value: toRupeeNumber(historicalStats.oneYearLow) },
                            { label: "3 Yr High", value: toRupeeNumber(historicalStats.threeYearHigh) },
                            { label: "3 Yr Low", value: toRupeeNumber(historicalStats.threeYearLow) },
                            { label: "5 Yr High", value: toRupeeNumber(historicalStats.fiveYearHigh) },
                            { label: "5 Yr Low", value: toRupeeNumber(historicalStats.fiveYearLow) },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between gap-3 border-b border-[rgba(238,238,238,0.9)] pb-2">
                              <span className="text-[13px] text-[rgba(107,114,128,0.9)]">{row.label}</span>
                              <span className="text-[1rem] font-semibold text-[#1F2937]">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {[
                          {
                            label: "1Y placement",
                            value: `${oneYearRangePosition.toFixed(0)}%`,
                            helper: `${stock.price} inside the 52-week band`,
                          },
                          {
                            label: "1Y total return",
                            value: oneYearReturn.includes("Awaiting") ? "+38.75%" : oneYearReturn,
                            helper: "Compared with the same point last year",
                          },
                          {
                            label: "All-time range",
                            value: `${toRupeeNumber(allTimeLowValue)} - ${toRupeeNumber(allTimeHighValue)}`,
                            helper: "Long-cycle range instead of another duplicate slider",
                          },
                        ].map((item) => (
                          <div key={item.label} className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white px-3.5 py-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">{item.label}</p>
                            <p className="mt-1.5 text-[0.96rem] font-semibold text-[#1B3A6B]">{item.value}</p>
                            <p className="mt-0.5 text-[10px] leading-4 text-[rgba(107,114,128,0.78)]">{item.helper}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ProductCard>

                <div className="max-w-[760px]">
                  <ProductCard tone="secondary" className="space-y-2.5">
                    <div className="space-y-1">
                      <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                        Calculator
                      </p>
                      <h2 className={sectionHeadingClass}>Investment return calculator</h2>
                    </div>
                    <div className="grid overflow-hidden rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white lg:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="space-y-4 bg-white px-4 py-4">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[15px] font-medium text-[#4B5563]">You have invested</p>
                            <div className="flex w-[172px] items-center rounded-[12px] border border-[rgba(226,222,217,0.82)] bg-white px-3">
                              <span className="text-[1rem] font-semibold text-[#1B3A6B]">₹</span>
                              <input
                                value={calculatorAmount}
                                onChange={(event) => setCalculatorAmount(event.target.value)}
                                className="w-full bg-transparent py-2 pl-2 text-right text-[0.98rem] font-medium text-[#1F2937] outline-none"
                                inputMode="numeric"
                              />
                            </div>
                          </div>
                          <input
                            type="range"
                            min="10000"
                            max="500000"
                            step="5000"
                            value={Math.min(Math.max(calculatorAmountNumber || 100000, 10000), 500000)}
                            onChange={(event) => setCalculatorAmount(event.target.value)}
                            className="w-full accent-[#EBA633]"
                          />
                        </div>

                        <div className="space-y-2.5 border-t border-[rgba(238,238,238,0.9)] pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[15px] font-medium text-[#4B5563]">Investment Period</p>
                            <div className="flex items-center gap-2">
                              {[1, 3, 5].map((year) => {
                                const supported = availableYears.includes(year as 1 | 3 | 5);
                                return (
                                <button
                                  key={year}
                                  type="button"
                                  onClick={() => supported && setCalculatorYears(year as 1 | 3 | 5)}
                                  disabled={!supported}
                                  className={[
                                    "inline-flex h-9 items-center justify-center rounded-[10px] border px-3.5 text-[12px] font-medium transition",
                                    calculatorYears === year
                                      ? "border-[#EBA633] bg-[#D4853B] text-white shadow-[0_10px_20px_rgba(212,133,59,0.16)]"
                                      : "border-[rgba(226,222,217,0.82)] bg-white text-[#4B5563]",
                                  ].join(" ")}
                                >
                                  {year}Y
                                </button>
                                );
                              })}
                            </div>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max={String(Math.max(...availableYears))}
                            step="1"
                            value={calculatorYears}
                            onChange={(event) => {
                              const next = Number(event.target.value) as 1 | 3 | 5;
                              if (availableYears.includes(next)) {
                                setCalculatorYears(next);
                              }
                            }}
                            className="w-full accent-[#EBA633]"
                          />
                          {!availableYears.includes(calculatorYears) ? null : null}
                        </div>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <div className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-[#FAFBFD] px-3.5 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">Purchase price</p>
                            <p className="mt-0.5 text-[0.95rem] font-medium text-[#1F2937]">
                              {calculatorStart ? toRupeeNumber(calculatorStart) : "Awaiting history"}
                            </p>
                          </div>
                          <div className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-[#FAFBFD] px-3.5 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">Current price</p>
                            <p className="mt-0.5 text-[0.95rem] font-medium text-[#1F2937]">{stock.price}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 border-l border-[rgba(226,222,217,0.82)] bg-[#FAFBFD] px-4 py-4">
                        <div className="rounded-[16px] border border-[rgba(26,127,75,0.12)] bg-[linear-gradient(180deg,rgba(240,253,244,0.96)_0%,rgba(255,255,255,0.98)_100%)] px-3.5 py-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">
                            Projected value
                          </p>
                          <p className="mt-1.5 text-[13px] leading-5 text-[rgba(107,114,128,0.82)]">
                            At current prices, {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(calculatorAmountNumber || 0)} invested {calculatorYears} year{calculatorYears > 1 ? "s" : ""} ago would be worth
                          </p>
                          <p className="mt-2 text-[1.95rem] font-semibold leading-tight text-[#1F2937]">
                            {calculatorDisplayValue
                              ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(calculatorDisplayValue)
                              : "Awaiting extended history"}
                          </p>
                          <p className="mt-1.5 inline-flex rounded-full border border-[rgba(26,127,75,0.12)] bg-white px-3 py-1 text-[11px] font-semibold" style={{ color: calculatorResultTone }}>
                            {calculatorProfitPercent !== null ? formatProductPercent(calculatorProfitPercent, 2, "--") : "--"} total return
                          </p>
                        </div>
                        <div className="border-t border-[rgba(226,222,217,0.82)] pt-3">
                          <p className="text-[13px] text-[rgba(107,114,128,0.82)]">Profit</p>
                          <p className="mt-1.5 text-[1.18rem] font-semibold leading-tight" style={{ color: calculatorResultTone }}>
                            {calculatorProfitValue !== null && calculatorProfitPercent !== null
                              ? `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(calculatorProfitValue)} (${formatProductPercent(calculatorProfitPercent, 2, "--")})`
                              : "Awaiting extended history"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ProductCard>
                </div>
              </section>

              <section id="ownership" className={`${sectionScrollAnchorClass} space-y-3`}>
                <ProductCard tone="secondary" className="space-y-3 bg-[rgba(251,244,236,0.64)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Ownership</p>
                      <h2 className={`mt-1 ${sectionHeadingClass}`}>Shareholding Pattern</h2>
                    </div>
                    <Link href="#details" className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-white px-3.5 text-[12px] font-semibold text-[#1B3A6B] shadow-[0_8px_18px_rgba(27,58,107,0.05)]">
                      View Details
                    </Link>
                  </div>

                  <div className="overflow-hidden rounded-[15px] border border-[rgba(226,222,217,0.82)] bg-white px-3.5 py-3.5">
                    <div className="flex h-7 overflow-hidden rounded-[10px]">
                      {shareholdingBuckets.map((bucket) => (
                        <div
                          key={bucket.label}
                          style={{
                            width: `${(((parseDesignNumericValue(bucket.value) ?? 0) / (shareholdingTotal || 1)) * 100).toFixed(2)}%`,
                            backgroundColor: bucket.color,
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-5">
                      {shareholdingBuckets.map((bucket) => (
                        <div key={bucket.label} className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-[#FCFDFF] px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bucket.color }} />
                              <span className="text-[13px] font-semibold text-[#374151]">{bucket.shortLabel ?? bucket.label}</span>
                            </div>
                            <p className="text-[0.94rem] font-semibold text-[#111827]">{bucket.value}</p>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(226,222,217,0.54)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(((parseDesignNumericValue(bucket.value) ?? 0) / (shareholdingTotal || 1)) * 100).toFixed(2)}%`,
                                backgroundColor: bucket.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 border-t border-[rgba(238,238,238,0.9)] pt-4">
                      <h3 className={subSectionHeadingClass}>Top 5 Shareholders</h3>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-[rgba(226,222,217,0.82)] text-[12px] uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">
                              <th className="px-3 py-3 font-medium">Holders</th>
                              <th className="px-3 py-3 font-medium">Dec-25</th>
                              <th className="px-3 py-3 font-medium">Sep-25</th>
                              <th className="px-3 py-3 font-medium">Jun-25</th>
                              <th className="px-3 py-3 font-medium">Mar-25</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleTopShareholders.map((holder, index) => (
                              <tr
                                key={holder.name}
                                className={[
                                  "border-b border-dashed border-[rgba(226,222,217,0.82)]",
                                  index % 2 === 0 ? "bg-[#FAFBFD]" : "bg-white",
                                ].join(" ")}
                              >
                                <td className="px-3 py-3 text-[13px] font-semibold text-[#1F2937]">{holder.name}</td>
                                <td className="px-3 py-3 text-[13px] text-[#374151]">{holder.currentHolding}</td>
                                <td className="px-3 py-3 text-[13px] text-[#374151]">{holder.previousQuarter}</td>
                                <td className="px-3 py-3 text-[13px] text-[#374151]">{holder.priorQuarter}</td>
                                <td className="px-3 py-3 text-[13px] text-[#374151]">{holder.earlierQuarter}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {demoData.topShareholders.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllShareholders((current) => !current)}
                          className="block pt-2 text-[12px] font-medium text-[#D4853B]"
                        >
                          {showAllShareholders
                            ? "Show less  ↑"
                            : `View all ${demoData.topShareholders.length} shareholders  →`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </ProductCard>

                <ProductCard tone="secondary" className="space-y-3">
                    <ProductSectionTitle
                      title="Investor Details"
                      description=""
                      eyebrow="Investors"
                    />
                  <div className="overflow-x-auto rounded-[16px] border border-[rgba(226,222,217,0.82)] bg-white">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[rgba(243,199,134,0.82)] text-[12px] uppercase tracking-[0.1em] text-[#1A1A1A]">
                          <th className="px-3 py-3 font-semibold">Particulars</th>
                          <th className="px-3 py-3 font-semibold">Dec 2024</th>
                          <th className="px-3 py-3 font-semibold">Mar 2025</th>
                          <th className="px-3 py-3 font-semibold">Jun 2025</th>
                          <th className="px-3 py-3 font-semibold">Sep 2025</th>
                          <th className="px-3 py-3 font-semibold">Dec 2025</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investorTimelineRows.map((row, index) => (
                          <tr key={row.label} className={`border-b border-[rgba(238,238,238,0.9)] ${index % 2 === 0 ? "bg-[#FAFAFA]" : "bg-white"}`}>
                            <td className={`px-3 py-3 text-[14px] text-[#1F2937] ${row.label.toLowerCase().includes("promoter") ? "font-bold" : "font-semibold"}`}>{row.label}</td>
                            <td className="px-3 py-3 text-[14px] text-[#374151]">{row.dec2024}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 text-[14px] text-[#374151]">
                                <span>{row.mar2025}</span>
                                {(() => {
                                  const trend = getInvestorTrendMeta(row.mar2025, row.dec2024);
                                  return (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${trend.toneClassName}`}>
                                      <span>{trend.arrow}</span>
                                      {trend.deltaLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 text-[14px] text-[#374151]">
                                <span>{row.jun2025}</span>
                                {(() => {
                                  const trend = getInvestorTrendMeta(row.jun2025, row.mar2025);
                                  return (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${trend.toneClassName}`}>
                                      <span>{trend.arrow}</span>
                                      {trend.deltaLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 text-[14px] text-[#374151]">
                                <span>{row.sep2025}</span>
                                {(() => {
                                  const trend = getInvestorTrendMeta(row.sep2025, row.jun2025);
                                  return (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${trend.toneClassName}`}>
                                      <span>{trend.arrow}</span>
                                      {trend.deltaLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 text-[14px] text-[#374151]">
                                <span>{row.dec2025}</span>
                                {(() => {
                                  const trend = getInvestorTrendMeta(row.dec2025, row.sep2025);
                                  return (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${trend.toneClassName}`}>
                                      <span>{trend.arrow}</span>
                                      {trend.deltaLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ProductCard>

                <ProductCard tone="secondary" className="space-y-3">
                  <ProductSectionTitle
                    title={`Mutual Funds Invested (${displayMutualFundOwners.length})`}
                    description=""
                    eyebrow="Funds"
                  />
                  <div className="overflow-hidden rounded-[16px] border border-[rgba(226,222,217,0.82)] bg-white">
                    <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-3 border-b border-[rgba(226,222,217,0.82)] px-3.5 py-2.5 text-[11px] font-semibold text-[rgba(107,114,128,0.82)]">
                      <span>Fund name</span>
                      <span className="text-right">AUM%</span>
                    </div>
                    {visibleMutualFundOwners.map((item) => {
                      const weightValue = parseDesignNumericValue(item.weight) ?? 0;
                      const relativeWidth = Math.max((weightValue / maxMutualFundWeight) * 100, 18);
                      const accentOpacity = Math.min(0.3 + (weightValue / maxMutualFundWeight) * 0.7, 1);

                      return (
                      <Link
                        key={`${item.fundSlug}-${item.fundName}`}
                        href={`/mutual-funds/${item.fundSlug}`}
                        className="relative grid grid-cols-[minmax(0,1fr)_82px] items-center gap-3 border-b border-[rgba(238,238,238,0.9)] px-3.5 py-2.5 last:border-b-0 hover:bg-[rgba(247,249,252,0.7)]"
                      >
                        <span
                          className="absolute inset-y-2 left-0 w-[3px] rounded-r-[2px]"
                          style={{ backgroundColor: `rgba(212,133,59,${accentOpacity})` }}
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium leading-5 text-[#374151]">{item.fundName}</span>
                          <span className="mt-0.5 block text-[10px] text-[rgba(107,114,128,0.74)]">{item.sourceDate}</span>
                          <span className="mt-1.5 block h-[3px] w-[100px] overflow-hidden rounded-full bg-[rgba(226,222,217,0.7)]">
                            <span
                              className="block h-full rounded-full bg-[#D4853B]"
                              style={{ width: `${relativeWidth}%` }}
                            />
                          </span>
                        </span>
                        <span className="text-right text-[15px] font-bold text-[#111827]">{item.weight}</span>
                      </Link>
                      );
                    })}
                  </div>
                  {displayMutualFundOwners.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllMutualFunds((current) => !current)}
                      className="block pt-2 text-[12px] font-medium text-[#D4853B]"
                    >
                      {showAllMutualFunds
                        ? "Show less  ↑"
                        : `Show all ${displayMutualFundOwners.length} funds  →`}
                    </button>
                  ) : null}
                </ProductCard>
              </section>

              <section id="forecast" className={`${sectionScrollAnchorClass} space-y-3`}>
                <ProductCard tone="secondary" className="space-y-3">
                  <div className="space-y-1.5 border-b border-[rgba(226,222,217,0.82)] pb-2.5">
                    <h2 className={sectionHeadingClass}>
                      {stock.name} Forecast
                    </h2>
                    <p className="text-[12px] leading-5 text-[rgba(107,114,128,0.82)]">
                      Analyst-style scenario ranges built from the retained average-price band and then expanded into low, mean, and high outcome zones.
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(226,222,217,0.82)] bg-white px-3.5 py-3.5">
                    <div className="flex items-center justify-center gap-3">
                      <span className="h-px flex-1 bg-[rgba(226,222,217,0.92)]" />
                      <p className={subSectionHeadingClass}>Share Price Forecast</p>
                      <span className="h-px flex-1 bg-[rgba(226,222,217,0.92)]" />
                    </div>
                    {forecast ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-[11px] border border-[rgba(226,222,217,0.82)] bg-[#F8FBFF] px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">12M Avg Price</p>
                          <p className="mt-1 text-[1rem] font-semibold text-[#1F2937]">{toRupeeNumber(forecast.averagePrice)}</p>
                        </div>
                        <div className="rounded-[11px] border border-[rgba(240,76,89,0.18)] bg-[rgba(254,242,242,0.88)] px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">Low = Avg + 8%</p>
                          <p className="mt-1 text-[1rem] font-semibold text-[#B91C1C]">{toRupeeNumber(forecast.low)}</p>
                        </div>
                        <div className="rounded-[11px] border border-[rgba(123,123,123,0.18)] bg-[#F7F7F7] px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">Mean = Avg + 12%</p>
                          <p className="mt-1 text-[1rem] font-semibold text-[#4B5563]">{toRupeeNumber(forecast.base)}</p>
                        </div>
                        <div className="rounded-[11px] border border-[rgba(59,178,115,0.18)] bg-[rgba(240,253,244,0.92)] px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">High = Avg + 18%</p>
                          <p className="mt-1 text-[1rem] font-semibold text-[#15803D]">{toRupeeNumber(forecast.high)}</p>
                        </div>
                      </div>
                    ) : null}
                    {forecastChart ? (
                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_118px]">
                        <svg
                          viewBox={`0 0 ${forecastChart.width} ${forecastChart.height}`}
                          className="h-[180px] min-h-[140px] w-full rounded-[14px] border border-[rgba(226,222,217,0.82)] bg-[#FCFCFD]"
                        >
                          <defs>
                            <marker id="forecast-high-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
                              <path d="M0,0 L0,6 L8,3 z" fill="#3BB273" />
                            </marker>
                            <marker id="forecast-base-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
                              <path d="M0,0 L0,6 L8,3 z" fill="#7B7B7B" />
                            </marker>
                            <marker id="forecast-low-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
                              <path d="M0,0 L0,6 L8,3 z" fill="#F04C59" />
                            </marker>
                          </defs>
                          <rect x="0" y="0" width={forecastChart.width} height={forecastChart.height} rx="14" fill="#FCFCFD" />
                          {[0, 1, 2, 3].map((line) => (
                            <line
                              key={line}
                              x1="20"
                              x2={forecastChart.width - 20}
                              y1={24 + ((forecastChart.height - 48) / 3) * line}
                              y2={24 + ((forecastChart.height - 48) / 3) * line}
                              stroke="#E5E7EB"
                              strokeWidth="1"
                            />
                          ))}
                          <line x1={forecastChart.forecastStartX} x2={forecastChart.forecastStartX} y1="10" y2={forecastChart.height - 14} stroke="#9CA3AF" strokeWidth="1.5" />
                          <line x1={forecastChart.forecastEndX} x2={forecastChart.forecastEndX} y1="10" y2={forecastChart.height - 14} stroke="#9CA3AF" strokeWidth="1.5" />
                          <line x1="20" x2={forecastChart.width - 20} y1={forecastChart.height - 14} y2={forecastChart.height - 14} stroke="#111827" strokeWidth="1.5" />
                          <line
                            x1="20"
                            x2={forecastChart.width - 20}
                            y1={forecastChart.averageY}
                            y2={forecastChart.averageY}
                            stroke="#94A3B8"
                            strokeWidth="1.5"
                            strokeDasharray="5 5"
                          />
                          <text x="24" y={forecastChart.averageY - 8} fontSize="12" fill="#64748B">
                            12M Avg
                          </text>
                          <path d={forecastChart.historicalPath} fill="none" stroke="#1B3A6B" strokeWidth="4" strokeLinecap="round" />
                          {forecastChart.historicalPoints.map((point, index) => (
                            <circle
                              key={`${point.x}-${point.y}-${index}`}
                              cx={point.x}
                              cy={point.y}
                              r="2.8"
                              fill="#1B3A6B"
                            />
                          ))}
                          <path
                            d={`M ${forecastChart.forecastStartX} ${forecastChart.startY} L ${forecastChart.forecastEndX} ${forecastChart.highY}`}
                            fill="none"
                            stroke="#3BB273"
                            strokeWidth="3"
                            strokeDasharray="6 6"
                            markerEnd="url(#forecast-high-arrow)"
                          />
                          <path
                            d={`M ${forecastChart.forecastStartX} ${forecastChart.startY} L ${forecastChart.forecastEndX} ${forecastChart.baseY}`}
                            fill="none"
                            stroke="#7B7B7B"
                            strokeWidth="3"
                            strokeDasharray="6 6"
                            markerEnd="url(#forecast-base-arrow)"
                          />
                          <path
                            d={`M ${forecastChart.forecastStartX} ${forecastChart.startY} L ${forecastChart.forecastEndX} ${forecastChart.lowY}`}
                            fill="none"
                            stroke="#F04C59"
                            strokeWidth="3"
                            strokeDasharray="6 6"
                            markerEnd="url(#forecast-low-arrow)"
                          />
                          <polygon
                            points={`${forecastChart.forecastStartX},${forecastChart.startY} ${forecastChart.forecastEndX},${forecastChart.highY} ${forecastChart.forecastEndX},${forecastChart.baseY}`}
                            fill="rgba(59,178,115,0.22)"
                          />
                          <polygon
                            points={`${forecastChart.forecastStartX},${forecastChart.startY} ${forecastChart.forecastEndX},${forecastChart.baseY} ${forecastChart.forecastEndX},${forecastChart.lowY}`}
                            fill="rgba(240,76,89,0.18)"
                          />
                          <circle cx={forecastChart.forecastEndX} cy={forecastChart.highY} r="7" fill="#111827" />
                          <text x={forecastChart.forecastEndX - 8} y={forecastChart.highY - 10} textAnchor="end" fontSize="12" fill="#15803D">
                            High
                          </text>
                          <text x={forecastChart.forecastEndX - 8} y={forecastChart.baseY - 10} textAnchor="end" fontSize="12" fill="#4B5563">
                            Mean
                          </text>
                          <text x={forecastChart.forecastEndX - 8} y={forecastChart.lowY - 10} textAnchor="end" fontSize="12" fill="#B91C1C">
                            Low
                          </text>
                          {forecastChart.labels.map((item) => (
                            <text key={`${item.x}-${item.label}`} x={item.x} y={forecastChart.height - 4} fontSize="13" fill="#374151">
                              {item.label}
                            </text>
                          ))}
                        </svg>
                        <div className="flex flex-col justify-center gap-4">
                          {[
                            { label: "HIGH", value: forecast ? toRupeeNumber(forecast.high) : "--", tone: "text-[#3BB273]" },
                            { label: "MEAN", value: forecast ? toRupeeNumber(forecast.base) : "--", tone: "text-[#D4853B]" },
                            { label: "LOW", value: forecast ? toRupeeNumber(forecast.low) : "--", tone: "text-[#F04C59]" },
                          ].map((item) => (
                            <div key={item.label}>
                              <p className={`text-[1.1rem] font-semibold ${item.tone}`}>{item.label}</p>
                              <p className="mt-1 text-[1rem] font-semibold text-[#1F2937]">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-[13px] text-[rgba(107,114,128,0.82)]">Awaiting extended history</p>
                    )}
                  </div>
                </ProductCard>
              </section>

              <section id="latest-news" className={sectionScrollAnchorClass}>
                <EntityNewsSection
                  entityType="stock"
                  entitySlug={stock.slug}
                  symbol={stock.symbol}
                  articles={marketNews}
                  usedSectorFallback={marketNewsUsedSectorFallback}
                  fallbackSectorLabel={marketNewsFallbackSectorLabel}
                />
              </section>

              <section id="faq" className={sectionScrollAnchorClass}>
                <ProductCard tone="secondary" className="space-y-2.5">
                  <ProductSectionTitle
                    title="Frequently asked questions"
                    description=""
                    eyebrow="FAQ"
                  />
                  <div className="space-y-0">
                    {faqItems.map((item) => (
                      <div key={item.question} className="border-b border-[rgba(226,222,217,0.82)] bg-white">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(openFaq === item.question ? null : item.question)}
                          className="flex w-full items-start gap-3 px-3.5 py-3 text-left"
                        >
                          <span className="relative mt-1 h-6 w-6 shrink-0">
                            <span className="absolute left-1/2 top-0 h-6 w-[2px] -translate-x-1/2 bg-[#1F7AE0]" />
                            <span className="absolute top-1/2 left-0 h-[2px] w-6 -translate-y-1/2 bg-[#1F7AE0]" />
                          </span>
                          <span className="text-[0.98rem] font-medium leading-6 text-[#1F2937]">{item.question}</span>
                        </button>
                        {openFaq === item.question ? (
                          <div className="px-12 pb-3">
                            <p className="text-[13px] leading-6 text-[rgba(107,114,128,0.9)]">{item.answer}</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </ProductCard>
              </section>
            </div>
          }
          right={
            <div className="space-y-3 lg:sticky lg:top-20">
              <ProductCard tone="primary" className="space-y-2.5 rounded-[16px] border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F5F8FC_100%)] p-3 shadow-[0_10px_20px_rgba(27,58,107,0.04)]">
                <div>
                  <p className="text-[15px] font-semibold text-[#4B5563]">Today’s Range</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[15px] font-semibold text-[#111827]">
                    <span>{toRupeeNumber(todayRange?.low ?? null)}</span>
                    <span>{toRupeeNumber(todayRange?.high ?? null)}</span>
                  </div>
                  <div className="relative mt-2 h-[3px] rounded-full bg-[#101828]">
                    <span
                      className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#111827] shadow-[0_0_0_3px_rgba(27,58,107,0.08)]"
                      style={{ left: `calc(${todayRangePosition}% - 8px)` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-[rgba(107,114,128,0.78)]">
                    Current price is trading at {toRupeeNumber(latestPriceValue)} inside today’s band.
                  </p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#4B5563]">52 Week Range</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[15px] font-semibold text-[#111827]">
                    <span>{toRupeeNumber(resolvedWeek52Range?.low ?? null)}</span>
                    <span>{toRupeeNumber(resolvedWeek52Range?.high ?? null)}</span>
                  </div>
                  <div className="relative mt-2 h-[3px] rounded-full bg-[#101828]">
                    <span
                      className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#214E9C] shadow-[0_0_0_3px_rgba(27,58,107,0.08)]"
                      style={{ left: `calc(${oneYearRangePosition}% - 8px)` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-3 py-1 text-[11px] font-semibold text-[#1B3A6B]">
                      You are here · {toRupeeNumber(latestPriceValue)}
                    </span>
                    <span className="text-[11px] font-medium text-[rgba(107,114,128,0.78)]">
                      {oneYearRangePosition.toFixed(0)}% through yearly range
                    </span>
                  </div>
                </div>
                <div className="test-hero-utility">
                  <UserContentActionCard
                    variant="compact"
                    pageType="stock"
                    slug={resolvedPageContext.routeSlug}
                    title={resolvedPageContext.title ?? resolvedPageContext.label}
                    href={resolvedPageContext.href}
                    isSignedIn={viewerSignedIn}
                    allowWatchlist
                    watchlistPageType="stock"
                    watchlistQuery={resolvedPageContext.watchlistQuery ?? stock.slug}
                  />
                </div>
              </ProductCard>

              {showSharedSidebar ? (
                <SharedMarketSidebarRail
                  visibleBlocks={sharedSidebarRailData.visibleBlocks}
                  marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
                  topGainers={sharedSidebarRailData.topGainers}
                  topLosers={sharedSidebarRailData.topLosers}
                  popularStocks={sharedSidebarRailData.popularStocks}
                />
              ) : null}
            </div>
          }
        />
      }
    />
    </>
  );
}
