import { getMarketDataIngestionReadiness } from "@/lib/market-data-ingestion";
import {
  firstTrustedFundTargets,
  firstTrustedIndexTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";
import { getMarketDataProviderSyncReadiness } from "@/lib/market-data-provider-sync";
import { getMarketDataRefreshReadiness } from "@/lib/market-data-refresh";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

export function getMarketDataPlaybook() {
  const config = getRuntimeLaunchConfig();
  const ingestion = getMarketDataIngestionReadiness();
  const providerSync = getMarketDataProviderSyncReadiness();
  const refresh = getMarketDataRefreshReadiness();

  return {
    readiness: [
      {
        title: "Supabase admin access",
        status: hasRuntimeSupabaseAdminEnv() ? "Ready" : "Missing",
        detail: hasRuntimeSupabaseAdminEnv()
          ? "Verified market-data writes can reach production tables."
          : "Service-role access is still required for verified writes.",
      },
      {
        title: "Signed execution secret",
        status: config.marketDataRefreshSecret || config.cronSecret ? "Ready" : "Missing",
        detail:
          config.marketDataRefreshSecret || config.cronSecret
            ? "Manual and scheduled sync routes can be authorized."
            : "Add MARKET_DATA_REFRESH_SECRET or CRON_SECRET before provider sync can be executed safely.",
      },
      {
        title: "Provider URL",
        status: config.marketDataProviderUrl ? "Ready" : "Missing",
        detail: config.marketDataProviderUrl
          ? "Provider sync can fetch a normalized upstream payload."
          : "Add MARKET_DATA_PROVIDER_URL to enable server-side provider sync.",
      },
    ],
    endpoints: [
      {
        path: "/api/admin/market-data/sample-payload",
        purpose: "Reference first-rollout stock, fund, and index payload for provider handoff.",
      },
      {
        path: "/api/admin/market-data/validate",
        purpose: "Validate payload structure without writing anything to Supabase.",
      },
      {
        path: "/api/admin/market-data/ingest",
        purpose: "Persist verified market payloads directly into stock, fund, chart, and index layers.",
      },
      {
        path: "/api/admin/market-data/provider-sync",
        purpose: "Fetch one normalized upstream payload and push it through verified ingestion.",
      },
    ],
    targets: [
      ...firstTrustedStockTargets.map((target) => `${target.slug} quote`),
      ...firstTrustedStockTargets.map((target) => `${target.slug} OHLCV`),
      ...firstTrustedFundTargets.map((target) => `${target.slug} NAV`),
      ...firstTrustedIndexTargets.map((target) => `${target.slug} snapshot`),
    ],
    statusLine: {
      ingestion: ingestion.mode,
      providerSync: providerSync.mode,
      refresh: refresh.mode,
    },
    rules: [
      "Validate payloads first before writing them into production tables.",
      "Only treat data as verified when it reaches the persisted Supabase layers without demo markers.",
      "Use end-of-day cron as the safe default, then increase sync frequency only after the provider path proves stable.",
    ],
  };
}
