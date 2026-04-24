"use client";

import { useEffect, useMemo, useRef } from "react";
import { AreaSeries, ColorType, LineSeries, createChart, type IChartApi, type ISeriesApi, type LineData, type UTCTimestamp } from "lightweight-charts";

import { GlowCard } from "@/components/ui";
import { buildIndexIntradaySeries } from "@/lib/index-chart-series";
import type { IndexSnapshot } from "@/lib/index-intelligence";

type IndexLightweightChartCardProps = {
  snapshot: IndexSnapshot;
  title: string;
  description: string;
  eyebrow?: string;
  height?: number;
};

export function IndexLightweightChartCard({
  snapshot,
  title,
  description,
  eyebrow = "TradingView chart library",
  height = 420,
}: IndexLightweightChartCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
        textColor: "rgba(232, 240, 255, 0.74)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: {
        vertLine: { color: "rgba(125,240,211,0.24)" },
        horzLine: { color: "rgba(125,240,211,0.2)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.18, bottom: 0.18 },
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
      topColor: "rgba(125,240,211,0.28)",
      bottomColor: "rgba(125,240,211,0.04)",
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const breadthSeries = chart.addSeries(LineSeries, {
      color: "#f2c879",
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    areaSeries.setData(series.map((point): LineData<UTCTimestamp> => ({
      time: point.time,
      value: point.movePercent,
    })));
    breadthSeries.setData(series.map((point): LineData<UTCTimestamp> => ({
      time: point.time,
      value: point.weightedBreadthScore,
    })));

    chart.timeScale().fitContent();

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;
    lineSeriesRef.current = breadthSeries;

    return () => {
      lineSeriesRef.current = null;
      areaSeriesRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [height, series]);

  return (
    <GlowCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/80">
          Native index chart
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-[28px] border border-white/8 bg-[#07111a] p-3">
        <div ref={containerRef} className="w-full" style={{ height }} />
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">Price line</p>
          <p className="mt-3 text-sm leading-7 text-mist/76">
            The mint area line tracks the index move progression across the last session snapshot.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">Breadth line</p>
          <p className="mt-3 text-sm leading-7 text-mist/76">
            The gold line overlays weighted breadth so leadership concentration is visible without leaving the page.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">Current posture</p>
          <p className="mt-3 text-sm leading-7 text-mist/76">
            {snapshot.marketMood} · {snapshot.trendLabel} · {snapshot.sessionPhase}
          </p>
        </div>
      </div>
    </GlowCard>
  );
}
