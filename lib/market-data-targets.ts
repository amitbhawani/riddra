import { getStockChartSnapshot } from "@/lib/chart-content";
import { getFund, getStock } from "@/lib/content";
import { getIndexSnapshot } from "@/lib/index-content";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import {
  firstTrustedFundTargets,
  firstTrustedIndexTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";

export type MarketDataTargetStatus = {
  title: string;
  route: string;
  type: "stock_quote" | "stock_chart" | "fund_nav" | "index_snapshot";
  status: "verified" | "pending" | "seeded";
  source: string;
  updated: string;
  detail: string;
};

export async function getMarketDataTargetStatuses(): Promise<MarketDataTargetStatus[]> {
  const [stockTargets, stockChartTargets, fundTargets, indexTargets] = await Promise.all([
    Promise.all(
      firstTrustedStockTargets.map(async (target) => ({
        target,
        stock: await getStock(target.slug),
      })),
    ),
    Promise.all(
      firstTrustedStockTargets.map(async (target) => ({
        target,
        chart: await getStockChartSnapshot(target.slug),
      })),
    ),
    Promise.all(
      firstTrustedFundTargets.map(async (target) => ({
        target,
        fund: await getFund(target.slug),
      })),
    ),
    Promise.all(
      firstTrustedIndexTargets.map(async (target) => ({
        target,
        snapshot: await getIndexSnapshot(target.slug),
      })),
    ),
  ]);

  const stockStatuses: MarketDataTargetStatus[] = stockTargets.map(({ target, stock }) => ({
    title: `${target.name} quote`,
    route: target.route,
    type: "stock_quote",
    status:
      stock?.snapshotMeta?.mode === "delayed_snapshot" ||
      stock?.snapshotMeta?.mode === "manual_close"
        ? "verified"
        : stock?.snapshotMeta?.mode === "fallback"
          ? "seeded"
          : "pending",
    source: stock?.snapshotMeta?.source ?? "Pending",
    updated: stock?.snapshotMeta?.lastUpdated ?? "Pending",
    detail:
      stock?.snapshotMeta?.marketDetail ??
      `Verified delayed quote data is still pending for ${target.name}.`,
  }));

  const indexStatuses: MarketDataTargetStatus[] = indexTargets
    .map(({ snapshot, target }) => ({ snapshot, target }))
    .filter(
      (
        entry,
      ): entry is {
        snapshot: IndexSnapshot;
        target: (typeof firstTrustedIndexTargets)[number];
      } => Boolean(entry.snapshot),
    )
    .map(({ snapshot, target }) => ({
      title: `${snapshot.title} snapshot`,
      route: target.route,
      type: "index_snapshot",
      status: snapshot.dataMode === "verified" ? "verified" : "seeded",
      source: snapshot.sourceCode,
      updated: snapshot.lastUpdated,
      detail: snapshot.marketDetail,
    }));

  const stockChartStatuses: MarketDataTargetStatus[] = stockChartTargets.map(({ target, chart }) => ({
    title: `${target.name} chart`,
    route: `${target.route}/chart`,
    type: "stock_chart",
    status:
      chart.mode === "verified"
        ? "verified"
        : chart.mode === "source_entry"
          ? "seeded"
          : "pending",
    source: chart.source,
    updated: chart.lastUpdated,
    detail:
      chart.mode === "verified"
        ? `Symbol-bound ${target.name} OHLCV is available for the dedicated chart route.`
        : chart.mode === "source_entry"
          ? `Source-entry ${target.name} OHLCV is powering the dedicated chart route while verified provider bars are still pending.`
          : `Verified ${target.name} OHLCV is still pending for the dedicated chart route.`,
  }));

  const fundStatuses: MarketDataTargetStatus[] = fundTargets.map(({ target, fund }) => ({
    title: `${target.name} NAV`,
    route: target.route,
    type: "fund_nav",
    status:
      fund?.snapshotMeta?.mode === "delayed_snapshot" ||
      fund?.snapshotMeta?.mode === "manual_nav"
        ? "verified"
        : fund?.snapshotMeta?.mode === "fallback"
          ? "seeded"
          : "pending",
    source: fund?.snapshotMeta?.source ?? "Pending",
    updated: fund?.snapshotMeta?.lastUpdated ?? "Pending",
    detail:
      fund?.snapshotMeta?.marketDetail ??
      `Verified delayed NAV data is still pending for ${target.name}.`,
  }));

  return [
    ...stockStatuses,
    ...stockChartStatuses,
    ...fundStatuses,
    ...indexStatuses,
  ];
}
