"use client";

import { useEffect, useState } from "react";

import { getPublicDataStateMeta } from "@/lib/product-page-design";

type TradingviewEmbedProps = {
  symbol: string;
  height?: number;
  allowSymbolChange?: boolean;
  hideTopToolbar?: boolean;
  interval?: string;
};

function buildTradingviewChartUrl({
  symbol,
  allowSymbolChange,
  hideTopToolbar,
  interval,
}: {
  symbol: string;
  allowSymbolChange: boolean;
  hideTopToolbar: boolean;
  interval: string;
}) {
  const params = new URLSearchParams({
    symbol,
    interval,
    symboledit: allowSymbolChange ? "1" : "0",
    saveimage: "1",
    toolbarbg: "#07111a",
    hide_top_toolbar: hideTopToolbar ? "1" : "0",
    hide_legend: "0",
    withdateranges: "1",
    hide_side_toolbar: "0",
    allow_symbol_change: allowSymbolChange ? "1" : "0",
    details: "0",
    hotlist: "0",
    calendar: "0",
    show_popup_button: "0",
    popup_width: "1280",
    popup_height: "720",
    theme: "dark",
    style: "1",
    locale: "en",
    timezone: "Asia/Kolkata",
    studies: "[]",
    backgroundColor: "#07111a",
    gridColor: "rgba(255,255,255,0.06)",
    watchlist: "[]",
    studies_overrides: "{}",
    overrides: "{}",
    enabled_features: "[]",
    disabled_features: "[]",
  });

  return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
}

export function TradingviewEmbed({
  symbol,
  height = 500,
  allowSymbolChange = true,
  hideTopToolbar = false,
  interval = "D",
}: TradingviewEmbedProps) {
  const src = buildTradingviewChartUrl({
    symbol,
    allowSymbolChange,
    hideTopToolbar,
    interval,
  });
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const refreshingMeta = getPublicDataStateMeta("refreshing");

  useEffect(() => {
    setIframeLoaded(false);
    setShowChart(false);
  }, [src]);

  useEffect(() => {
    if (!iframeLoaded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowChart(true);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [iframeLoaded]);

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] bg-[#07111a]">
      {!showChart ? (
        <div
          className="absolute inset-0 z-10 flex flex-col justify-between bg-[radial-gradient(circle_at_top,_rgba(125,240,211,0.12),_transparent_45%),linear-gradient(180deg,#07111a_0%,#0c1723_100%)] p-5"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-mint/70">Chart loading</p>
              <p className="mt-2 text-sm text-white/78">{refreshingMeta.description}</p>
            </div>
            <div className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/58">
              {refreshingMeta.label}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)]">
              <div className="h-40 rounded-[22px] border border-white/8 bg-white/[0.04]" />
              <div className="space-y-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
                <div className="h-32 animate-pulse rounded-[18px] bg-white/[0.05]" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <iframe
        title={`TradingView chart for ${symbol}`}
        src={src}
        className="block w-full border-0 bg-[#07111a] transition-opacity duration-300"
        loading="lazy"
        onLoad={() => setIframeLoaded(true)}
        aria-busy={!showChart}
        style={{ height, opacity: showChart ? 1 : 0 }}
      />
    </div>
  );
}
