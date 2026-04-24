"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPublicDataStateMeta } from "@/lib/product-page-design";

type CommodityQuote = {
  symbol: "gold" | "silver";
  title: string;
  unitLabel: string;
  inrValue: number | null;
  usdValue: number | null;
  usdinr: number | null;
  source: string;
  updatedAt: string | null;
};

function formatInr(value: number | null) {
  if (value == null) {
    return "Loading...";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CommodityMarketCards() {
  const [quotes, setQuotes] = useState<CommodityQuote[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const refreshingMeta = getPublicDataStateMeta("refreshing");
  const readFailedMeta = getPublicDataStateMeta("read_failed");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/commodity-prices");
        const data = (await response.json()) as { quotes?: CommodityQuote[] };

        if (!cancelled) {
          setQuotes(data.quotes ?? []);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {quotes.map((quote) => (
        <div key={quote.symbol} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-mist/56">Live commodity</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{quote.title}</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
              {quote.unitLabel}
            </span>
          </div>

          <p className="mt-5 text-3xl font-semibold text-white">{formatInr(quote.inrValue)}</p>

          <div className="mt-5 grid gap-2 text-sm text-mist/70">
            <p>USD spot: {quote.usdValue ? `$${quote.usdValue.toFixed(2)} / oz` : "Awaiting quote"}</p>
            <p>USD/INR: {quote.usdinr ? quote.usdinr.toFixed(2) : "Awaiting FX feed"}</p>
            <p>Source: {quote.source || "Awaiting source"}</p>
            <p>Updated: {quote.updatedAt ? new Date(quote.updatedAt).toLocaleString("en-IN") : "Refresh in progress"}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={quote.symbol === "gold" ? "/tools/gold-price-tracker" : "/tools/silver-price-tracker"}
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08]"
            >
              Open {quote.title} tool
            </Link>
            <Link
              href="/markets"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm text-mist/78 transition hover:text-white"
            >
              Refresh market view
            </Link>
          </div>
        </div>
      ))}

      {status === "loading" && quotes.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-mist/70 lg:col-span-2">
          {refreshingMeta.title}. {refreshingMeta.description}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-mist/70 lg:col-span-2">
          {readFailedMeta.title}. The commodity source could not be read right now, but the dedicated tool pages remain available.
        </div>
      ) : null}
    </div>
  );
}
