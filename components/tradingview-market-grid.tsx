"use client";

import { useEffect, useMemo, useRef } from "react";
import { AreaSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type LineData, type UTCTimestamp } from "lightweight-charts";

import { NativeStockChartPanel } from "@/components/native-stock-chart-panel";
import type { StockChartSnapshot } from "@/lib/chart-content";
import { buildIndexIntradaySeries } from "@/lib/index-chart-series";
import type { IndexSnapshot } from "@/lib/index-intelligence";

export type TradingviewMarketGridItem = {
  title: string;
  note?: string;
  symbol?: string;
  nativeSnapshot?: IndexSnapshot;
  nativeStockChart?: StockChartSnapshot;
};

type TradingviewMarketGridProps = {
  items?: TradingviewMarketGridItem[];
  height?: number;
  eyebrow?: string;
  badge?: string;
};

const defaultCharts: TradingviewMarketGridItem[] = [
  { title: "Nifty 50", symbol: "NSE:NIFTY", note: "Retained benchmark chart" },
  { title: "Sensex", symbol: "BSE:SENSEX", note: "Retained benchmark chart" },
  { title: "Bank Nifty", symbol: "NSE:BANKNIFTY", note: "Retained benchmark chart" },
  { title: "Tata Motors", symbol: "NSE:TATAMOTORS", note: "Retained stock chart" },
];

function NativeIndexChartTile({
  snapshot,
  title,
  note,
  height,
  eyebrow,
  badge,
}: {
  snapshot: IndexSnapshot;
  title: string;
  note?: string;
  height: number;
  eyebrow: string;
  badge: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const series = useMemo(() => buildIndexIntradaySeries(snapshot), [snapshot]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#07111a" },
        textColor: "rgba(232, 240, 255, 0.72)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#7df0d3",
      topColor: "rgba(125,240,211,0.26)",
      bottomColor: "rgba(125,240,211,0.04)",
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    areaSeries.setData(
      series.map(
        (point): LineData<UTCTimestamp> => ({
          time: point.time,
          value: point.movePercent,
        }),
      ),
    );

    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    return () => {
      seriesRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [height, series]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-3 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{eyebrow}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-mist/62">{note ?? "Retained session view for the current benchmark route."}</p>
        </div>
        <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/58">
          {badge}
        </span>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[#07111a] p-3">
        <div ref={containerRef} className="w-full" style={{ height }} />
      </div>
      <div className="mt-3 rounded-[22px] border border-white/8 bg-black/15 px-4 py-3 text-xs leading-6 text-mist/68">
        <span className="text-mist/52">Source posture:</span> {snapshot.marketMood} · {snapshot.trendLabel} · {snapshot.sessionPhase}
      </div>
    </div>
  );
}

function NativeStockChartTile({
  snapshot,
  title,
  note,
  height,
}: {
  snapshot: StockChartSnapshot;
  title: string;
  note?: string;
  height: number;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-3 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">Retained market chart</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-mist/62">
            {note ?? "Retained candlestick chart backed by symbol-bound delayed OHLCV rows."}
          </p>
        </div>
        <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/58">
          {snapshot.mode === "verified" ? "Verified bars" : "Source-entry bars"}
        </span>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[#07111a] p-3">
        <NativeStockChartPanel
          bars={snapshot.bars}
          trendSeries={snapshot.trendSeries}
          signalSeries={snapshot.signalSeries}
          height={height}
        />
      </div>
      <div className="mt-3 rounded-[22px] border border-white/8 bg-black/15 px-4 py-3 text-xs leading-6 text-mist/68">
        <span className="text-mist/52">Source:</span> {snapshot.source} · <span className="text-mist/52">Updated:</span> {snapshot.lastUpdated} · <span className="text-mist/52">Window:</span> {snapshot.timeframe}
      </div>
    </div>
  );
}

export function TradingviewMarketGrid({
  items = defaultCharts,
  height = 360,
  eyebrow = "Market chart",
  badge = "Retained view",
}: TradingviewMarketGridProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((chart) => (
        chart.nativeSnapshot ? (
          <NativeIndexChartTile
            key={`${chart.nativeSnapshot.slug}-${chart.title}`}
            snapshot={chart.nativeSnapshot}
            title={chart.title}
            note={chart.note}
            height={height}
            eyebrow="Retained market chart"
            badge={badge}
          />
        ) : chart.nativeStockChart?.mode && chart.nativeStockChart.mode !== "pending" ? (
          <NativeStockChartTile
            key={`${chart.nativeStockChart.slug}-${chart.title}`}
            snapshot={chart.nativeStockChart}
            title={chart.title}
            note={chart.note}
            height={height}
          />
        ) : (
          <div key={chart.symbol ?? chart.title} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-3 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{chart.title}</h3>
                <p className="mt-2 text-sm text-mist/62">
                  This market tile is waiting for a retained chart snapshot, so the page keeps the state explicit instead of implying live coverage.
                </p>
              </div>
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/58">
                Unavailable
              </span>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-dashed border-amber-400/20 bg-[#1a1207] p-6">
              <p className="text-sm font-medium text-white">Retained market chart unavailable</p>
              <p className="mt-3 text-sm leading-7 text-mist/72">
                No retained benchmark or stock chart snapshot has been written for {chart.title} yet.
              </p>
              <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-mist/74">
                Once a retained index timeline or symbol-bound OHLCV write exists, this tile will render it here.
              </div>
            </div>
          </div>
        )
      ))}
    </div>
  );
}
