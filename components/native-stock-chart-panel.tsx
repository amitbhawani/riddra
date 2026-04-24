"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, LineSeries, createChart, type IChartApi, type ISeriesApi, type WhitespaceData } from "lightweight-charts";

import type { CandlePoint, LinePoint } from "@/lib/advanced-chart-data";

type NativeStockChartPanelProps = {
  bars: CandlePoint[];
  trendSeries: LinePoint[];
  signalSeries: LinePoint[];
  height?: number;
};

export function NativeStockChartPanel({
  bars,
  trendSeries,
  signalSeries,
  height = 460,
}: NativeStockChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const trendSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#7df0d3",
      downColor: "#ff7f7f",
      borderVisible: false,
      wickUpColor: "#7df0d3",
      wickDownColor: "#ff7f7f",
      priceLineVisible: false,
    });

    const trend = chart.addSeries(LineSeries, {
      color: "#7df0d3",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const signal = chart.addSeries(LineSeries, {
      color: "#f2c879",
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    candleSeries.setData(
      bars.map((bar) => ({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    );

    trend.setData(trendSeries as Array<WhitespaceData<string> | { time: string; value: number }>);
    signal.setData(signalSeries as Array<WhitespaceData<string> | { time: string; value: number }>);

    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    trendSeriesRef.current = trend;
    signalSeriesRef.current = signal;

    return () => {
      signalSeriesRef.current = null;
      trendSeriesRef.current = null;
      candleSeriesRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [bars, trendSeries, signalSeries, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
