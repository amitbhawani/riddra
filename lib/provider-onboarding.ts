import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
} from "@/lib/runtime-launch-config";
import {
  firstTrustedFundTargets,
  firstTrustedIndexTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";

export type ProviderOnboardingItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  detail: string;
};

export const providerOnboardingTargets = [
  ...firstTrustedStockTargets.map((target) => `${target.name} quote snapshot`),
  ...firstTrustedStockTargets.map((target) => `${target.name} OHLCV chart payload`),
  ...firstTrustedFundTargets.map((target) => `${target.name} NAV snapshot`),
  ...firstTrustedIndexTargets.map((target) => `${target.name} index snapshot`),
];

export function getProviderOnboardingItems(): ProviderOnboardingItem[] {
  const config = getRuntimeLaunchConfig();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasProviderUrl = Boolean(config.marketDataProviderUrl);
  const hasProviderToken = Boolean(config.marketDataProviderToken);
  const hasSignedAuth = Boolean(
    config.marketDataRefreshSecret || config.cronSecret,
  );

  return [
    {
      title: "Visual provider and credential console",
      status: "Ready",
      detail:
        "The admin now has a launch-config console where provider URL, token, refresh secret, cron secret, and related launch settings can be entered from a form instead of code edits.",
    },
    {
      title: "Supabase service-role and verified write path",
      status: hasAdminSupabase ? "In progress" : "Blocked",
      detail: hasAdminSupabase
        ? "Service-role access is present, so the remaining work is proving verified writes end to end with legitimate provider payloads instead of operator-seeded fallback alone."
        : "Verified market-data writes, delayed snapshot persistence, and admin-side source execution still stop here until the service-role key is configured.",
    },
    {
      title: "Admin write-target connection",
      status: hasAdminSupabase ? "Ready" : "Blocked",
      detail: hasAdminSupabase
        ? "Verified market-data writes can now target the configured Supabase project."
        : "Provider onboarding cannot move past validation until service-role Supabase access is configured.",
    },
    {
      title: "Provider endpoint configuration",
      status: hasProviderUrl && hasProviderToken ? "In progress" : "Blocked",
      detail: hasProviderUrl && hasProviderToken
        ? "Provider URL and token are configured. The remaining job is proving recurring quote, index, and OHLCV payloads against the launch-critical routes."
        : hasProviderUrl
          ? "A provider URL exists, but token or access details are still incomplete, so quote sync cannot yet be treated as real."
          : "A normalized provider URL still needs to be configured before server-side sync can fetch live payloads.",
    },
    {
      title: "Signed execution auth",
      status: hasSignedAuth ? "In progress" : "Blocked",
      detail: hasSignedAuth
        ? "Signed ingest or cron auth is present, but recurring execution still needs to be exercised on live payloads before freshness can be trusted."
        : "The routes exist, but signed auth still needs to be configured before recurring execution should be trusted.",
    },
    {
      title: "Payload validation workflow",
      status: "Ready",
      detail:
        "Operators can already validate provider JSON for stock quotes, stock OHLCV, fund NAV snapshots, and index payloads through the sample payload plus the market-data tester before anything touches verified writes.",
    },
    {
      title: "NSE symbol and stock-chart stabilization",
      status: "Blocked",
      detail: "Sensex is the clean control case, but the Nifty 50, Bank Nifty, Fin Nifty, and several NSE stock-detail chart routes still need accepted symbols, stable embeds, and route-by-route verification before the visual market layer can be treated as launch-safe.",
    },
    {
      title: "First live rollout set",
      status: "In progress",
      detail:
        "The public routes are waiting on the first trusted stock-set quotes, first trusted stock-chart OHLCV payloads, first trusted mutual-fund NAV snapshots, and tracked index snapshots listed below; Sensex is currently the strongest visual anchor, while the broader stock-chart lane, completed stock detail pages, fund NAV verification, and NSE index verification still need more accepted payloads before the visual layer feels fully stable.",
    },
    {
      title: "Mutual-fund NAV and factsheet activation",
      status: hasProviderUrl && hasAdminSupabase ? "In progress" : "Blocked",
      detail:
        hasProviderUrl && hasAdminSupabase
          ? "Verified ingestion now accepts provider-backed mutual-fund NAV snapshots, so the remaining work is exercising that path against legitimate delayed NAV payloads and widening it beyond the first trusted fund set."
          : "Fund routes and factsheet surfaces are still waiting on a real AMFI or provider-backed NAV flow, so mutual-fund pages remain behind the equity and index launch lane.",
    },
  ];
}

export const providerOnboardingRules = [
  "Use the normalized Riddra payload shape, not raw third-party response formats, when posting into signed ingest or provider sync.",
  "Use the Launch Config Console as the first place to enter provider URL, token, refresh secret, and cron secret before testing live ingestion.",
  "Validate payloads in the tester before switching the first trusted stock-set or index routes from pending states to verified states.",
  "Do not claim realtime coverage until approved-source, latency, and disclosure rules are explicitly decided.",
  "Treat the completed stock-set quotes, first trusted stock-chart routes, first trusted fund NAV routes, and the tracked indices as the first trusted launch set before widening to more symbols and fund families.",
];
