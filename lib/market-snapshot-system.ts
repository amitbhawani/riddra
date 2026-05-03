import { cache } from "react";

import { getCommodityHistory } from "@/lib/commodity-history";
import { getCommodityQuotes, type CommodityQuote } from "@/lib/commodity-prices";
import { getIndexSnapshots } from "@/lib/index-content";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import {
  formatProductCurrency,
  formatProductDateTime,
  formatProductNumber,
  formatProductPercent,
  type ProductMarketSnapshotFamily,
  type ProductTruthState,
} from "@/lib/product-page-design";
import { getSourceByCode } from "@/lib/source-registry";

export type MarketSnapshotMetadataItem = {
  label: string;
  value: string;
};

export type MarketSnapshotItem = {
  id: string;
  family: ProductMarketSnapshotFamily;
  label: string;
  value: string;
  change: string;
  sourceLabel: string;
  freshnessLabel: string;
  truthState: ProductTruthState;
  summary?: string;
  metadata?: MarketSnapshotMetadataItem[];
  href?: string;
  hrefLabel?: string;
};

export type MarketSnapshotGroup = {
  id: string;
  family: ProductMarketSnapshotFamily;
  title: string;
  description: string;
  items: MarketSnapshotItem[];
};

function formatFreshness(value: string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  const formatted = formatProductDateTime(value, "__INVALID__");
  return formatted === "__INVALID__" ? value : formatted;
}

function computePercentChange(current: number | null | undefined, previous: number | null | undefined) {
  if (
    typeof current !== "number" ||
    !Number.isFinite(current) ||
    typeof previous !== "number" ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return "Unavailable";
  }

  return formatProductPercent(((current - previous) / previous) * 100, 2, "Unavailable");
}

function mapIndexTruthState(snapshot: IndexSnapshot): ProductTruthState {
  const detail = `${snapshot.marketDetail} ${snapshot.officialSyncNote}`.toLowerCase();

  if (detail.includes("only reflects") || detail.includes("partial live component coverage")) {
    return "partial";
  }

  if (snapshot.dataMode === "manual") {
    return "delayed_snapshot";
  }

  if (snapshot.dataMode === "verified") {
    return "verified";
  }

  return "unavailable";
}

async function mapIndexSnapshotToItem(snapshot: IndexSnapshot): Promise<MarketSnapshotItem> {
  const source = await getSourceByCode(snapshot.sourceCode);

  return {
    id: `index-${snapshot.slug}`,
    family: "index",
    label: snapshot.title,
    value: `${snapshot.weightedBreadthScore >= 0 ? "+" : ""}${snapshot.weightedBreadthScore.toFixed(2)}`,
    change: formatProductPercent(snapshot.movePercent, 2, "Unavailable"),
    sourceLabel: source?.sourceName ?? snapshot.marketLabel ?? "Verified source unavailable",
    freshnessLabel: formatFreshness(snapshot.lastUpdated),
    truthState: mapIndexTruthState(snapshot),
    summary: snapshot.narrative,
    metadata: [
      { label: "Market mood", value: snapshot.marketMood },
      { label: "Breadth", value: snapshot.breadthLabel },
      { label: "Dominance", value: snapshot.dominanceLabel },
      { label: "Session phase", value: snapshot.sessionPhase },
    ],
    href:
      snapshot.slug === "nifty50"
        ? "/nifty50"
        : snapshot.slug === "sensex"
          ? "/sensex"
          : snapshot.slug === "banknifty"
            ? "/banknifty"
            : snapshot.slug === "finnifty"
              ? "/finnifty"
              : undefined,
    hrefLabel: snapshot.title,
  };
}

function mapMetalTruthState(quote: CommodityQuote): ProductTruthState {
  if (quote.inrValue !== null && quote.updatedAt) {
    return "verified";
  }

  if (quote.inrValue !== null) {
    return "partial";
  }

  return "unavailable";
}

function mapCommodityQuoteToItem(
  quote: CommodityQuote,
  previousValue: number | null,
): MarketSnapshotItem {
  return {
    id: `metal-${quote.symbol}`,
    family: "metal",
    label: quote.title,
    value: formatProductCurrency(quote.inrValue, "Unavailable"),
    change: computePercentChange(quote.inrValue, previousValue),
    sourceLabel: quote.source || "Verified source unavailable",
    freshnessLabel: formatFreshness(quote.updatedAt),
    truthState: mapMetalTruthState(quote),
    summary: `Last trusted ${quote.title.toLowerCase()} rate in INR ${quote.unitLabel}.`,
    metadata: [
      { label: "USD quote", value: formatProductNumber(quote.usdValue, "Unavailable") },
      { label: "USD / INR", value: formatProductNumber(quote.usdinr, "Unavailable") },
      { label: "Unit", value: quote.unitLabel },
    ],
  };
}

function mapCurrencyItem(
  commodityQuotes: CommodityQuote[],
  previousUsdInr: number | null,
): MarketSnapshotItem {
  const anchor = commodityQuotes.find((quote) => quote.usdinr !== null) ?? null;
  const truthState: ProductTruthState =
    anchor?.usdinr !== null && anchor?.updatedAt
      ? "verified"
      : anchor?.usdinr !== null
        ? "partial"
        : "unavailable";

  return {
    id: "currency-usd-inr",
    family: "currency",
    label: "USD / INR",
    value: formatProductNumber(anchor?.usdinr, "Unavailable"),
    change: computePercentChange(anchor?.usdinr ?? null, previousUsdInr),
    sourceLabel: anchor?.source ?? "Verified source unavailable",
    freshnessLabel: formatFreshness(anchor?.updatedAt ?? null),
    truthState,
    summary: "Last trusted FX anchor used across metals and broader market context.",
    metadata: [
      { label: "Pair", value: "US Dollar / Indian Rupee" },
      { label: "Use case", value: "FX anchor for cross-market context" },
    ],
  };
}

export async function buildMarketSnapshotGroups(
  indexSnapshots: IndexSnapshot[],
  commodityQuotes: CommodityQuote[],
): Promise<MarketSnapshotGroup[]> {
  const [goldHistory, silverHistory, indexItems] = await Promise.all([
    getCommodityHistory("gold", 2),
    getCommodityHistory("silver", 2),
    Promise.all(indexSnapshots.map((snapshot) => mapIndexSnapshotToItem(snapshot))),
  ]);

  const goldQuote = commodityQuotes.find((quote) => quote.symbol === "gold") ?? null;
  const silverQuote = commodityQuotes.find((quote) => quote.symbol === "silver") ?? null;
  const goldPrevious = goldHistory[goldHistory.length - 1]?.gold24 ?? null;
  const silverPrevious = silverHistory[silverHistory.length - 1]?.silver999 ?? null;
  const usdInrPrevious =
    goldHistory[goldHistory.length - 1]?.usdinr ??
    silverHistory[silverHistory.length - 1]?.usdinr ??
    null;

  const metalItems = [goldQuote, silverQuote]
    .filter((quote): quote is CommodityQuote => Boolean(quote))
    .map((quote) =>
      mapCommodityQuoteToItem(
        quote,
        quote.symbol === "gold" ? goldPrevious : silverPrevious,
      ),
    );

  return [
    {
      id: "indices",
      family: "index" as const,
      title: "Indices snapshot",
      description:
        "Last trusted index breadth and market-move context, kept explicit about source and freshness.",
      items: indexItems,
    },
    {
      id: "metals",
      family: "metal" as const,
      title: "Metals snapshot",
      description:
        "Last trusted landed metal quotes, shown with source-backed freshness and real change percentages only.",
      items: metalItems,
    },
    {
      id: "currency",
      family: "currency" as const,
      title: "Currency snapshot",
      description:
        "A single trusted FX anchor for the rest of the product experience.",
      items: [mapCurrencyItem(commodityQuotes, usdInrPrevious)],
    },
  ].filter((group) => group.items.length > 0);
}

export const getMarketSnapshotGroups = cache(async (): Promise<MarketSnapshotGroup[]> => {
  const [indexSnapshots, commodityQuotes] = await Promise.all([
    getIndexSnapshots().catch(() => []),
    getCommodityQuotes(),
  ]);

  return buildMarketSnapshotGroups(indexSnapshots, commodityQuotes);
});
