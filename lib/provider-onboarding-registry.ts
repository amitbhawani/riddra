import { getMarketDataTargetStatuses } from "@/lib/market-data-targets";
import { getIndexChartSymbolAuditSummary } from "@/lib/index-chart-symbol-audit";
import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
} from "@/lib/runtime-launch-config";

export type ProviderOnboardingRegistryStatus = "Ready" | "In progress" | "Blocked";

export type ProviderOnboardingRegistryRow = {
  lane: "Configuration" | "Execution" | "Target rollout";
  label: string;
  status: ProviderOnboardingRegistryStatus;
  href: string;
  detail: string;
  source: string;
  updated: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function toRegistryStatus(
  status: "verified" | "pending" | "seeded",
): ProviderOnboardingRegistryStatus {
  if (status === "verified") {
    return "Ready";
  }

  if (status === "seeded") {
    return "In progress";
  }

  return "Blocked";
}

export async function getProviderOnboardingRegistryRows(): Promise<
  ProviderOnboardingRegistryRow[]
> {
  const config = getRuntimeLaunchConfig();
  const targetStatuses = await getMarketDataTargetStatuses();
  const hasSupabaseAdmin = hasRuntimeSupabaseAdminEnv();
  const hasProviderUrl = Boolean(config.marketDataProviderUrl);
  const hasProviderToken = Boolean(config.marketDataProviderToken);
  const hasSignedAuth = Boolean(
    config.marketDataRefreshSecret || config.cronSecret,
  );
  const chartSymbolAuditSummary = getIndexChartSymbolAuditSummary();

  const configRows: ProviderOnboardingRegistryRow[] = [
    {
      lane: "Configuration",
      label: "Supabase service-role activation",
      status: hasSupabaseAdmin ? "Ready" : "Blocked",
      href: "/admin/launch-config-console",
      detail: hasSupabaseAdmin
        ? "Service-role access is present for verified market-data writes."
        : "Provider onboarding remains blocked until service-role Supabase access is configured.",
      source: hasSupabaseAdmin ? "Launch config or env" : "Pending setup",
      updated: config.supabaseServiceRoleKey ? "Configured" : "Pending",
    },
    {
      lane: "Configuration",
      label: "Provider base configuration",
      status: hasProviderUrl ? "In progress" : "Blocked",
      href: "/admin/launch-config-console",
      detail: hasProviderUrl
        ? `Provider base URL is configured${hasProviderToken ? " with token support" : ""}, so activation can move into trusted payload execution.`
        : "A normalized provider URL still needs to be configured before live provider sync can run.",
      source: hasProviderUrl ? config.marketDataProviderUrl : "Pending setup",
      updated: hasProviderUrl ? "Configured" : "Pending",
    },
    {
      lane: "Configuration",
      label: "Signed execution auth",
      status: hasSignedAuth ? "Ready" : "In progress",
      href: "/admin/launch-config-console",
      detail: hasSignedAuth
        ? "Signed refresh or cron auth is present for recurring provider execution."
        : "Signed execution auth is still missing, so recurring sync should not be trusted yet.",
      source: hasSignedAuth ? "Launch config or env" : "Pending setup",
      updated: hasSignedAuth ? "Configured" : "Pending",
    },
    {
      lane: "Configuration",
      label: "Index chart symbol normalization",
      status: chartSymbolAuditSummary.blocked === 0 ? "Ready" : chartSymbolAuditSummary.overrides > 0 ? "In progress" : "Blocked",
      href: "/admin/market-data",
      detail:
        chartSymbolAuditSummary.blocked === 0
          ? "Index chart symbol mappings are now explicitly configured and the remaining work is route-level visual verification."
          : chartSymbolAuditSummary.overrides > 0
            ? "At least one index chart override is now set, but the NSE routes still need more symbol verification before the visual layer is trustworthy."
            : "Sensex is the clean control case, but the NSE index routes are still relying on default symbol guesses and need override testing plus route verification.",
      source: chartSymbolAuditSummary.overrides > 0 ? "Launch config overrides" : "Default symbol map",
      updated: `${chartSymbolAuditSummary.overrides} override(s) configured`,
    },
  ];

  const executionRows: ProviderOnboardingRegistryRow[] = [
    {
      lane: "Execution",
      label: "Sample payload route",
      status: "Ready",
      href: "/api/admin/market-data/sample-payload",
      detail: "Normalized sample payload is available for the first trusted stock, fund, and index rollout set.",
      source: "Internal normalized sample",
      updated: "Route live",
    },
    {
      lane: "Execution",
      label: "Validation route",
      status: "Ready",
      href: "/api/admin/market-data/validate",
      detail: "Provider payloads can be validated before any verified write is attempted.",
      source: "Internal validation route",
      updated: "Route live",
    },
    {
      lane: "Execution",
      label: "Verified ingest route",
      status: hasSupabaseAdmin ? "In progress" : "Blocked",
      href: "/api/admin/market-data/ingest",
      detail: hasSupabaseAdmin
        ? "The signed ingest route is ready for trusted payload testing against the configured backend."
        : "Verified ingest is blocked until Supabase admin access is configured.",
      source: "Internal signed ingest route",
      updated: hasSupabaseAdmin ? "Execution-ready" : "Pending backend activation",
    },
    {
      lane: "Execution",
      label: "Provider sync route",
      status: hasProviderUrl && hasSignedAuth ? "In progress" : "Blocked",
      href: "/api/admin/market-data/provider-sync",
      detail:
        hasProviderUrl && hasSignedAuth
          ? "Provider sync can now be exercised against the configured provider path and signed auth setup."
          : "Provider sync remains blocked until both provider URL and signed execution auth are configured.",
      source: "Internal provider-sync route",
      updated:
        hasProviderUrl && hasSignedAuth
          ? "Execution-ready"
          : "Pending activation",
    },
  ];

  const rolloutRows: ProviderOnboardingRegistryRow[] = targetStatuses.map((target) => ({
    lane: "Target rollout",
    label: target.title,
    status: toRegistryStatus(target.status),
    href: target.route,
    detail: target.detail,
    source: target.source,
    updated: target.updated,
  }));

  return [...configRows, ...executionRows, ...rolloutRows];
}

export async function getProviderOnboardingRegistrySummary() {
  const rows = await getProviderOnboardingRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toProviderOnboardingCsv(rows: ProviderOnboardingRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "detail", "source", "updated"];

  const lines = rows.map((row) =>
    [
      row.lane,
      row.label,
      row.status,
      row.href,
      row.detail,
      row.source,
      row.updated,
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
