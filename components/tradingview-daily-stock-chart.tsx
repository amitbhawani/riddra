"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import {
  createRiddraTradingviewDatafeed,
  type TradingviewHistoryBar,
  type TradingviewLibraryConfig,
  type TradingviewResolvedSymbol,
  type TradingviewSearchResult,
} from "@/lib/tradingview-datafeed";
import { getPublicDataStateMeta } from "@/lib/product-page-design";

type TradingviewDailyStockChartProps = {
  symbolQuery: string;
  slug: string;
  displayName: string;
  height?: number;
};

type ChartLoadState =
  | {
      status: "loading";
    }
  | {
      status: "ready";
      symbol: TradingviewResolvedSymbol;
      bars: TradingviewHistoryBar[];
    }
  | {
      status: "unavailable";
      reason: string;
    };

function loadDatafeedConfig(datafeed: ReturnType<typeof createRiddraTradingviewDatafeed>) {
  return new Promise<TradingviewLibraryConfig>((resolve) => {
    void datafeed.onReady(resolve);
  });
}

function searchDatafeedSymbols(
  datafeed: ReturnType<typeof createRiddraTradingviewDatafeed>,
  query: string,
) {
  return new Promise<TradingviewSearchResult[]>((resolve) => {
    void datafeed.searchSymbols(query, "", "stock", resolve);
  });
}

function resolveDatafeedSymbol(
  datafeed: ReturnType<typeof createRiddraTradingviewDatafeed>,
  symbol: string,
) {
  return new Promise<TradingviewResolvedSymbol>((resolve, reject) => {
    void datafeed.resolveSymbol(symbol, resolve, reject);
  });
}

function loadDailyBars(
  datafeed: ReturnType<typeof createRiddraTradingviewDatafeed>,
  symbolInfo: TradingviewResolvedSymbol,
) {
  return new Promise<{ bars: TradingviewHistoryBar[]; noData: boolean }>((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    const tenYearsAgo = now - 60 * 60 * 24 * 365 * 10;

    void datafeed.getBars(
      symbolInfo,
      "1D",
      {
        from: tenYearsAgo,
        to: now,
        firstDataRequest: true,
      },
      (bars, meta) => {
        resolve({ bars, noData: meta.noData });
      },
      reject,
    );
  });
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function pickBestSymbolCandidate(
  results: TradingviewSearchResult[],
  symbolQuery: string,
  slug: string,
  displayName: string,
) {
  if (!results.length) {
    return null;
  }

  const normalizedSymbol = normalizeLookupValue(symbolQuery);
  const normalizedSlug = normalizeLookupValue(slug);
  const normalizedDisplayName = normalizeLookupValue(displayName);

  return (
    results.find((result) => normalizeLookupValue(result.symbol).includes(normalizedSymbol)) ??
    results.find((result) => normalizeLookupValue(result.ticker).includes(normalizedSymbol)) ??
    results.find((result) => normalizeLookupValue(result.description) === normalizedDisplayName) ??
    results.find((result) => normalizeLookupValue(result.description).includes(normalizedDisplayName)) ??
    results.find((result) => normalizeLookupValue(result.symbol).includes(normalizedSlug)) ??
    results[0]
  );
}

export function TradingviewDailyStockChart({
  symbolQuery,
  slug,
  displayName,
  height = 320,
}: TradingviewDailyStockChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loadState, setLoadState] = useState<ChartLoadState>({ status: "loading" });
  const [resolvedHeight, setResolvedHeight] = useState(height);
  const refreshingMeta = getPublicDataStateMeta("refreshing");
  const unavailableMeta = getPublicDataStateMeta("unavailable");

  useEffect(() => {
    function syncHeight() {
      if (window.innerWidth < 640) {
        setResolvedHeight(248);
        return;
      }

      if (window.innerWidth < 1024) {
        setResolvedHeight(280);
        return;
      }

      setResolvedHeight(height);
    }

    syncHeight();
    window.addEventListener("resize", syncHeight);

    return () => {
      window.removeEventListener("resize", syncHeight);
    };
  }, [height]);

  useEffect(() => {
    let active = true;

    async function hydrateChart() {
      try {
        setLoadState({ status: "loading" });
        const datafeed = createRiddraTradingviewDatafeed();
        const config = await loadDatafeedConfig(datafeed);

        if (!config.supported_resolutions.includes("1D")) {
          throw new Error("The backend TradingView datafeed is not exposing daily bars.");
        }

        const lookupInputs = [symbolQuery, slug, displayName].filter(
          (value, index, values) => value.trim().length > 0 && values.indexOf(value) === index,
        );

        let candidate: TradingviewSearchResult | null = null;

        for (const lookup of lookupInputs) {
          const results = await searchDatafeedSymbols(datafeed, lookup);
          candidate = pickBestSymbolCandidate(results, symbolQuery, slug, displayName);

          if (candidate) {
            break;
          }
        }

        const resolved = await resolveDatafeedSymbol(
          datafeed,
          candidate?.symbol ?? slug ?? symbolQuery,
        );
        const { bars, noData } = await loadDailyBars(datafeed, resolved);

        if (!active) {
          return;
        }

        if (noData || bars.length < 2) {
          setLoadState({
            status: "unavailable",
            reason:
              "The backend daily-bar registry resolved this stock, but no durable 1D bar history is currently available to draw the chart.",
          });
          return;
        }

        setLoadState({
          status: "ready",
          symbol: resolved,
          bars,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadState({
          status: "unavailable",
          reason:
            "The retained daily-bar source could not be read for this stock right now, so the chart is staying withheld.",
        });
      }
    }

    void hydrateChart();

    return () => {
      active = false;
    };
  }, [displayName, slug, symbolQuery]);

  useEffect(() => {
    if (loadState.status !== "ready") {
      chartRef.current?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      height: resolvedHeight,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#FFFFFF",
        },
        textColor: "rgba(107,114,128,0.88)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#E2DED9" },
      },
      crosshair: {
        vertLine: { color: "rgba(27,58,107,0.18)" },
        horzLine: { color: "rgba(27,58,107,0.16)" },
      },
      rightPriceScale: {
        borderColor: "#E2DED9",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#E2DED9",
        timeVisible: false,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        vertTouchDrag: false,
        horzTouchDrag: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#1A7F4B",
      downColor: "#C0392B",
      borderUpColor: "#1A7F4B",
      borderDownColor: "#C0392B",
      wickUpColor: "#1A7F4B",
      wickDownColor: "#C0392B",
      priceLineColor: "#1B3A6B",
      lastValueVisible: true,
    });

    candleSeries.setData(
      loadState.bars.map((bar) => ({
        time: Math.floor(bar.time / 1000) as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    );

    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      candleSeriesRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [loadState, resolvedHeight]);

  if (loadState.status === "loading") {
    return (
      <div className="rounded-[8px] bg-[linear-gradient(180deg,rgba(27,58,107,0.03),rgba(27,58,107,0.01))] px-2 py-3 sm:py-4">
        <div
          className="flex flex-col justify-between rounded-[8px] border border-[#E2DED9] bg-white px-4 py-4 sm:px-5 sm:py-5"
          style={{ minHeight: resolvedHeight }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                TradingView datafeed
              </p>
              <p className="riddra-product-body mt-2 text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                {refreshingMeta.description}
              </p>
            </div>
            <div className="rounded-full border border-[#E2DED9] px-3 py-1">
              <span className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[#1B3A6B]">
                {refreshingMeta.label}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-40 animate-pulse rounded-full bg-[rgba(27,58,107,0.08)]" />
            <div
              className="animate-pulse rounded-[8px] border border-[#E2DED9] bg-[rgba(27,58,107,0.03)]"
              style={{ height: Math.max(resolvedHeight - 120, 132) }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (loadState.status === "unavailable") {
    return (
      <div className="rounded-[8px] border border-dashed border-[#E2DED9] px-5 py-10">
        <p className="riddra-product-display text-xl font-semibold text-[#1B3A6B]">
          {unavailableMeta.title}
        </p>
        <p className="riddra-product-body mt-3 text-sm leading-7 text-[rgba(107,114,128,0.92)]">
          {loadState.reason}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] bg-[linear-gradient(180deg,rgba(27,58,107,0.03),rgba(27,58,107,0.01))] px-2 py-3 sm:py-4">
      <div className="rounded-[8px] border border-[#E2DED9] bg-white px-3 py-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#E2DED9] pb-3">
          <div>
            <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
              TradingView datafeed
            </p>
            <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.9)]">
              {loadState.symbol.full_name} • Daily durable bars only
            </p>
          </div>
          <div className="rounded-full border border-[#E2DED9] px-3 py-1">
            <span className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[#1B3A6B]">
              1D only
            </span>
          </div>
        </div>
        <div ref={containerRef} className="w-full" style={{ height: resolvedHeight }} />
      </div>
    </div>
  );
}
