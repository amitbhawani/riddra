"use client";

import type { CandlePoint, LinePoint } from "@/lib/advanced-chart-data";
import { ChartFallbackNotice } from "@/components/chart-fallback-notice";
import { NativeStockChartPanel } from "@/components/native-stock-chart-panel";
import { TradingviewEmbed } from "@/components/tradingview-embed";
import { GlowCard } from "@/components/ui";
import {
  chartControlRows,
  chartPresets,
  chartSignalNotes,
  indicatorPresetGroups,
} from "@/lib/advanced-chart-data";

type AdvancedChartWorkspaceProps = {
  title?: string;
  description?: string;
  presets?: string[];
  tradingviewSymbol?: string | null;
  dataStatus?: {
    mode: "verified" | "source_entry" | "pending" | "demo";
    source: string;
    lastUpdated: string;
    timeframe?: string;
    marketLabel?: string;
    marketDetail?: string;
  };
  nativeChartData?: {
    bars: CandlePoint[];
    trendSeries: LinePoint[];
    signalSeries: LinePoint[];
  } | null;
  fallbackNotice?: {
    eyebrow: string;
    title: string;
    description: string;
    statusLabel?: string;
    hints?: string[];
    href?: string;
    hrefLabel?: string;
  } | null;
};

export function AdvancedChartWorkspace({
  title = "TradingView chart workspace",
  description = "Review price structure, trend context, and market posture in one chart workspace built for stock and index follow-through.",
  presets = ["1D", "5D", "1M", "3M"],
  tradingviewSymbol,
  dataStatus = {
    mode: "demo",
    source: "TradingView reference layer",
    lastUpdated: "Not available yet",
    timeframe: presets[0],
    marketLabel: "Chart reference mode",
    marketDetail: "This chart is using TradingView for the front-end experience while the verified market-data path keeps getting hardened.",
  },
  nativeChartData = null,
  fallbackNotice = null,
}: AdvancedChartWorkspaceProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <GlowCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, index) => (
              <div
                key={preset}
                className={
                  index === 0
                    ? "rounded-full border border-aurora/35 bg-aurora/12 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white"
                    : "rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/82"
                }
              >
                <span>{preset}</span>
                {index === 0 ? <span className="ml-2 text-[10px] tracking-[0.2em] text-aurora">Default</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm text-mist/74">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-mist/62">
                {dataStatus.mode === "verified"
                  ? "Data mode: verified chart route"
                  : dataStatus.mode === "source_entry"
                    ? "Data mode: source-entry OHLCV while full verification continues"
                  : dataStatus.mode === "pending"
                    ? "Data mode: TradingView front-end chart with verified feed still being prepared"
                    : "Data mode: TradingView reference chart"}
              </p>
              <p className="mt-2 text-sm text-white">Source: {dataStatus.source}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-mist/62">Timeframe</p>
              <p className="mt-2 text-sm text-white">{dataStatus.timeframe ?? presets[0] ?? "1D"}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-mist/68">Updated: {dataStatus.lastUpdated}</p>
          <p className="mt-3 text-sm font-medium text-white">{dataStatus.marketLabel}</p>
          <p className="mt-2 text-sm leading-7 text-mist/68">{dataStatus.marketDetail}</p>
        </div>
        {nativeChartData?.bars?.length ? (
          <div className="mt-5 overflow-hidden rounded-[28px] border border-white/8 bg-[#07111a] p-3">
            <NativeStockChartPanel
              bars={nativeChartData.bars}
              trendSeries={nativeChartData.trendSeries}
              signalSeries={nativeChartData.signalSeries}
              height={460}
            />
          </div>
        ) : fallbackNotice ? (
          <div className="mt-5">
            <ChartFallbackNotice {...fallbackNotice} />
          </div>
        ) : tradingviewSymbol ? (
          <div className="mt-5 overflow-hidden rounded-[28px] border border-white/8 bg-[#07111a]">
            <TradingviewEmbed symbol={tradingviewSymbol} height={460} allowSymbolChange={false} />
          </div>
        ) : (
          <div className="mt-5 rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] px-6 py-12 text-center text-sm leading-7 text-mist/72">
            TradingView symbol mapping is not available for this route yet. Once the symbol registry is verified, this workspace will switch from fallback messaging into the full chart.
          </div>
        )}
      </GlowCard>

      <div className="grid gap-6">
        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Workspace presets</h2>
          <div className="mt-5 space-y-3">
            {chartPresets.map((preset) => (
              <div key={preset.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="text-sm font-medium text-white">{preset.title}</div>
                <p className="mt-2 text-sm leading-7 text-mist/72">{preset.description}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Indicator integration notes</h2>
          <div className="mt-5 space-y-3">
            {chartSignalNotes.map((note) => (
              <div
                key={note}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {note}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Indicator and control map</h2>
          <div className="mt-5 grid gap-4">
            {indicatorPresetGroups.map((group) => (
              <div key={group.title} className="rounded-3xl border border-white/8 bg-black/15 p-4">
                <p className="text-sm font-semibold text-white">{group.title}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.14em] text-mist/78"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="grid gap-3">
              {chartControlRows.map((row) => (
                <div key={row.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{row.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{row.description}</p>
                </div>
              ))}
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
