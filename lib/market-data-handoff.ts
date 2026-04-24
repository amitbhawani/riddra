import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

export type MarketDataHandoffItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  detail: string;
};

export function getMarketDataHandoffItems(): MarketDataHandoffItem[] {
  const config = getRuntimeLaunchConfig();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasProviderUrl = Boolean(config.marketDataProviderUrl);
  const hasRefreshSecret = Boolean(config.marketDataRefreshSecret);
  const hasCronSecret = Boolean(config.cronSecret);
  const hasProviderToken = Boolean(config.marketDataProviderToken);

  return [
    {
      title: "Payload validation desk",
      status: "Ready",
      detail:
        "Operators can now load the first trusted stock, fund, and tracked-index sample payload and validate provider JSON safely before any verified writes happen.",
    },
    {
      title: "Verified ingestion auth",
      status: hasAdminSupabase && hasRefreshSecret ? "Ready" : hasAdminSupabase ? "In progress" : "Blocked",
      detail:
        hasAdminSupabase && hasRefreshSecret
          ? "The signed ingest route can now accept verified writes into persisted stock, fund, chart, and index layers."
          : hasAdminSupabase
            ? "Service-role access is active, but MARKET_DATA_REFRESH_SECRET still needs to be configured for signed verified ingestion."
            : "Service-role access plus signed ingest authorization are still required before verified writes can run safely.",
    },
    {
      title: "Provider sync configuration",
      status:
        hasAdminSupabase && hasProviderUrl && (hasRefreshSecret || hasCronSecret)
          ? "Ready"
          : hasProviderUrl || hasAdminSupabase
            ? "In progress"
            : "Blocked",
      detail:
        hasAdminSupabase && hasProviderUrl && (hasRefreshSecret || hasCronSecret)
          ? `Provider sync can fetch a normalized upstream payload${hasProviderToken ? " with token support enabled" : ""} and feed it into verified ingestion.`
          : hasProviderUrl || hasAdminSupabase
            ? "Part of the provider-sync bridge is wired, but the remaining URL, auth secret, or admin env still needs to be finalized."
            : "Provider URL, execution auth, and admin Supabase env are all still required before server-side sync can run.",
    },
    {
      title: "Cron posture",
      status: hasCronSecret ? "Ready" : "In progress",
      detail: hasCronSecret
        ? "Signed cron execution can now be used for end-of-day close refreshes and later expanded to more frequent delayed updates."
        : "The default Vercel cron is in the repo, but CRON_SECRET still needs to be configured before scheduled execution should be trusted.",
    },
  ];
}
