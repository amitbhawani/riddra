import { cache } from "react";

import { getFundCategoryHubs, getStockSectorHubs } from "@/lib/hubs";
import { getDurableSectorPerformanceSnapshots } from "@/lib/sector-performance-store";
import { getFunds, getIpos, getStocks } from "@/lib/content";

export type MarketStat = {
  label: string;
  value: string;
  note: string;
};

export type DiscoveryCard = {
  title: string;
  href: string;
  description: string;
  badge: string;
};

const MARKET_OVERVIEW_CACHE_TTL_MS = 30_000;

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export type SectorPerformanceCard = {
  sectorSlug: string;
  sectorName: string;
  return1D: string;
  sourceLabel: string;
  sourceDate: string;
  referenceUrl?: string;
  href?: string;
};

let marketOverviewCache:
  | TimedCacheEntry<{
      stats: MarketStat[];
      discovery: DiscoveryCard[];
      topGainers: Awaited<ReturnType<typeof getStocks>>;
      topLosers: Awaited<ReturnType<typeof getStocks>>;
      topFundIdeas: Awaited<ReturnType<typeof getFunds>>;
      topIpos: Awaited<ReturnType<typeof getIpos>>;
      sectorPerformance: SectorPerformanceCard[];
    }>
  | null = null;

function readMarketOverviewCache() {
  if (!marketOverviewCache) {
    return null;
  }

  if (marketOverviewCache.expiresAt <= Date.now()) {
    marketOverviewCache = null;
    return null;
  }

  return marketOverviewCache.value;
}

function toNumber(change: string) {
  const cleaned = change.replace("%", "").replace("+", "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export const getMarketOverview = cache(async () => {
  const cached = readMarketOverviewCache();
  if (cached) {
    return cached;
  }

  const [stocks, ipos, funds, sectors, fundCategories, sectorPerformanceRows] = await Promise.all([
    getStocks(),
    getIpos(),
    getFunds(),
    getStockSectorHubs(),
    getFundCategoryHubs(),
    getDurableSectorPerformanceSnapshots(),
  ]);

  const topGainers = [...stocks]
    .filter((stock) => stock.snapshotMeta?.mode === "delayed_snapshot" || stock.snapshotMeta?.mode === "manual_close")
    .sort((a, b) => toNumber(b.change) - toNumber(a.change))
    .slice(0, 5);
  const topLosers = [...stocks]
    .filter((stock) => stock.snapshotMeta?.mode === "delayed_snapshot" || stock.snapshotMeta?.mode === "manual_close")
    .sort((a, b) => toNumber(a.change) - toNumber(b.change))
    .slice(0, 5);
  const topFundIdeas = [...funds]
    .filter((fund) => fund.snapshotMeta?.mode === "delayed_snapshot" || fund.snapshotMeta?.mode === "manual_nav")
    .slice(0, 3);
  const topIpos = [...ipos].slice(0, 3);

  const stats: MarketStat[] = [
    {
      label: "Tracked stocks",
      value: String(stocks.length),
      note: "Reusable equity route templates",
    },
    {
      label: "Tracked IPOs",
      value: String(ipos.length),
      note: "Lifecycle-driven issue coverage",
    },
    {
      label: "Tracked funds",
      value: String(funds.length),
      note: "Investor discovery templates",
    },
    {
      label: "Sector hubs",
      value: String(sectors.length),
      note: "Cluster authority pages",
    },
    {
      label: "Fund category hubs",
      value: String(fundCategories.length),
      note: "Grouped investor navigation",
    },
  ];

  const discovery: DiscoveryCard[] = [
    {
      title: "Stock sectors",
      href: "/sectors",
      description: "Explore grouped equity themes and sector-led discovery.",
      badge: `${sectors.length} hubs`,
    },
    {
      title: "Mutual fund categories",
      href: "/fund-categories",
      description: "Browse category-level fund entry points and compare flows.",
      badge: `${fundCategories.length} hubs`,
    },
    {
      title: "IPO hub",
      href: "/ipo",
      description: "Follow upcoming offers, listing timelines, and issue pages.",
      badge: `${ipos.length} issues`,
    },
    {
      title: "Stock screener",
      href: "/screener",
      description: "Move from research pages into filtering and decision workflows.",
      badge: "Workflow",
    },
  ];

  const sectorHubMap = new Map(sectors.map((sector) => [sector.slug, sector]));
  const sectorPerformance = sectorPerformanceRows.slice(0, 6).map((row) => ({
    sectorSlug: row.sectorSlug,
    sectorName: row.sectorName,
    return1D: formatPercent(row.return1D),
    sourceLabel: row.sourceLabel,
    sourceDate: row.sourceDate,
    referenceUrl: row.referenceUrl,
    href: sectorHubMap.has(row.sectorSlug) ? `/sectors/${row.sectorSlug}` : undefined,
  }));

  const overview = {
    stats,
    discovery,
    topGainers,
    topLosers,
    topFundIdeas,
    topIpos,
    sectorPerformance,
  };

  marketOverviewCache = {
    value: overview,
    expiresAt: Date.now() + MARKET_OVERVIEW_CACHE_TTL_MS,
  };

  return overview;
});
