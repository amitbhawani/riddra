import {
  firstTrustedFundTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

type SnapshotInsert = {
  snapshot_key: string;
  fetched_at: string;
  status: "captured";
  payload: Record<string, unknown>;
};

const demoStockQuoteMap: Record<string, { price: number; changePercent: number }> = {
  "tata-motors": { price: 345.1, changePercent: 0.74 },
  "reliance-industries": { price: 1314.0, changePercent: -2.68 },
  infosys: { price: 1276.0, changePercent: -1.28 },
  tcs: { price: 2470.5, changePercent: -2.13 },
  "hdfc-bank": { price: 793.0, changePercent: -2.14 },
  "icici-bank": { price: 1349.7, changePercent: 2.1 },
  "axis-bank": { price: 1352.8, changePercent: 0.15 },
  "state-bank-of-india": { price: 1061.85, changePercent: -0.45 },
  itc: { price: 298.8, changePercent: -1.79 },
};

const demoFundNavMap: Record<string, { nav: number; returns1Y: number }> = {
  "hdfc-mid-cap-opportunities": { nav: 189.44, returns1Y: 23.6 },
  "sbi-bluechip-fund": { nav: 79.11, returns1Y: 18.2 },
};

const demoStockSnapshots = firstTrustedStockTargets.map((target) => ({
  snapshot_key: `stock:${target.slug}:quote`,
  payload: {
    source: "demo-nse-delayed-feed",
    isDemo: true,
    scope: "stock-quote",
    price: demoStockQuoteMap[target.slug]?.price ?? 0,
    changePercent: demoStockQuoteMap[target.slug]?.changePercent ?? 0,
    lastUpdated: "2026-04-13T15:30:00+05:30",
  },
})) satisfies Array<Omit<SnapshotInsert, "fetched_at" | "status">>;

const demoFundSnapshots = firstTrustedFundTargets.map((target) => ({
  snapshot_key: `fund:${target.slug}:nav`,
  payload: {
    source: "demo-amfi-nav-feed",
    isDemo: true,
    scope: "fund-nav",
    nav: demoFundNavMap[target.slug]?.nav ?? 0,
    returns1Y: demoFundNavMap[target.slug]?.returns1Y ?? 0,
    lastUpdated: "2026-04-13T21:00:00+05:30",
  },
})) satisfies Array<Omit<SnapshotInsert, "fetched_at" | "status">>;

export function getMarketDataRefreshReadiness() {
      const config = getRuntimeLaunchConfig();

  return {
    adminSupabaseReady: hasRuntimeSupabaseAdminEnv(),
    refreshSecretReady: Boolean(config.marketDataRefreshSecret),
    demoStockSnapshotCount: demoStockSnapshots.length,
    demoFundSnapshotCount: demoFundSnapshots.length,
    stockTargetCoverage: `${demoStockSnapshots.length} / ${firstTrustedStockTargets.length}`,
    fundTargetCoverage: `${demoFundSnapshots.length} / ${firstTrustedFundTargets.length}`,
    mode: hasRuntimeSupabaseAdminEnv() ? "refresh_ready" : "configuration_pending",
  };
}

export async function runMarketDataSnapshotRefresh() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are required for snapshot refresh.");
  }

  const fetchedAt = new Date().toISOString();
  const rows: SnapshotInsert[] = [...demoStockSnapshots, ...demoFundSnapshots].map((item) => ({
    snapshot_key: item.snapshot_key,
    fetched_at: fetchedAt,
    status: "captured",
    payload: item.payload,
  }));

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("source_snapshots").insert(rows);

  if (error) {
    throw new Error(error.message);
  }

  return {
    inserted: rows.length,
    stockSnapshots: demoStockSnapshots.length,
    fundSnapshots: demoFundSnapshots.length,
    stockTargetCoverage: `${demoStockSnapshots.length} / ${firstTrustedStockTargets.length}`,
    fundTargetCoverage: `${demoFundSnapshots.length} / ${firstTrustedFundTargets.length}`,
    fetchedAt,
    snapshotKeys: rows.map((row) => row.snapshot_key),
  };
}
