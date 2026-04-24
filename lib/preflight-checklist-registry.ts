import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { getChartVerificationSummary } from "@/lib/chart-verification-registry";
import { getLiveSmokeTestRegistrySummary } from "@/lib/live-smoke-tests";
import { getPlaceholderHonestySummary } from "@/lib/placeholder-honesty-registry";
import { preflightChecklistItems, preflightChecklistRules } from "@/lib/preflight-checklist";

export type PreflightRegistryStatus = "Ready" | "In progress" | "Blocked";

export type PreflightChecklistRegistryRow = {
  lane: "Checklist group" | "Route checkpoint" | "Rule";
  label: string;
  status: PreflightRegistryStatus;
  href: string;
  note: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function mapChecklistStatus(status: string): PreflightRegistryStatus {
  if (status === "Required") {
    return "In progress";
  }

  return "Ready";
}

export function getPreflightChecklistRegistryRows(): PreflightChecklistRegistryRow[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const hasAuth = hasRuntimeSupabaseEnv();
  const hasProviderStack = Boolean(
    (config.marketDataProviderUrl && config.marketDataProviderToken) ||
      (config.razorpayKeyId && config.razorpayWebhookSecret) ||
      resend.configured,
  );
  const hasOpsPosture = Boolean(config.statusPageUrl || config.feedbackInbox);
  const hasOwnerInputs = Boolean(
    config.supportEmail || config.contactEmail || config.privacyOwner || config.termsOwner,
  );
  const chartSummary = getChartVerificationSummary();
  const smokeSummary = getLiveSmokeTestRegistrySummary();
  const placeholderSummary = getPlaceholderHonestySummary();

  const checklistRows: PreflightChecklistRegistryRow[] = preflightChecklistItems.map((item) => ({
    lane: "Checklist group",
    label: item.group,
    status: mapChecklistStatus(item.status),
    href: "/admin/preflight-checklist",
    note: item.summary,
    source: "Preflight checklist desk",
  }));

  const routeRows: PreflightChecklistRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Homepage and public shell review",
      status: "In progress",
      href: "/",
      note: "The public shell is broad enough for preflight review, but it still needs a deliberate end-to-end human check before broad promotion.",
      source: "Public route verification",
    },
    {
      lane: "Route checkpoint",
      label: "Auth and account verification",
      status: hasAuth ? "In progress" : "Blocked",
      href: "/login",
      note: hasAuth
        ? "Supabase runtime values exist, so auth and account routes can move into real preflight verification."
        : "Auth verification is still blocked until runtime Supabase values are configured.",
      source: "Auth preflight",
    },
    {
      lane: "Route checkpoint",
      label: "Provider-linked launch checks",
      status: hasProviderStack ? "In progress" : "Blocked",
      href: "/admin/provider-onboarding",
      note: hasProviderStack
        ? "Provider-linked flows have enough runtime config to begin real launch-side verification."
        : "Provider-linked checks are still mostly theoretical until credentials or endpoints are configured.",
      source: "Provider preflight",
    },
    {
      lane: "Route checkpoint",
      label: "Ops and rollback confidence",
      status: hasOpsPosture ? "In progress" : "Blocked",
      href: "/admin/reliability-ops",
      note: hasOpsPosture
        ? "Feedback or status routing is configured, so incident and rollback posture can be reviewed more credibly."
        : "Rollback and incident preflight still need more explicit runtime ops posture before launch confidence is real.",
      source: "Ops preflight",
    },
    {
      lane: "Route checkpoint",
      label: "Owner signoff readiness",
      status: hasOwnerInputs ? "In progress" : "Blocked",
      href: "/admin/launch-approvals",
      note: hasOwnerInputs
        ? "Support or owner-signoff inputs are configured, so final preflight signoff can be grounded in real launch commitments."
        : "Owner signoff is still blocked by missing support or policy ownership inputs.",
      source: "Launch signoff preflight",
    },
    {
      lane: "Route checkpoint",
      label: "Live smoke-test journeys",
      status:
        smokeSummary.blockedJourneys > 0
          ? "Blocked"
          : smokeSummary.optionalJourneys > 0
            ? "In progress"
            : "Ready",
      href: "/admin/live-smoke-tests",
      note:
        smokeSummary.blockedJourneys > 0
          ? "Some launch-critical smoke-test journeys are still blocked by missing auth, billing, support, or provider activation inputs."
          : smokeSummary.optionalJourneys > 0
            ? "The smoke-test route sequences now live in one registry, but some lanes are still only partially runnable until activation inputs are stronger."
            : "The smoke-test route sequences are fully available for a clean preflight rehearsal.",
      source: "Smoke-test preflight",
    },
    {
      lane: "Route checkpoint",
      label: "Placeholder-state honesty sweep",
      status: placeholderSummary.blocked > 0 ? "Blocked" : placeholderSummary.inProgress > 0 ? "In progress" : "Ready",
      href: "/admin/public-launch-qa",
      note:
        placeholderSummary.blocked > 0
          ? "Some fake-looking or overly staged routes are still blocked in the placeholder-honesty registry, so preflight should not treat public trust as clean yet."
          : placeholderSummary.inProgress > 0
            ? "Placeholder risks are now centralized in one registry, but the sweep still needs further conversion into real data or stricter coming-soon states."
            : "Placeholder and preview-backed public trust issues are currently under control.",
      source: "Placeholder honesty preflight",
    },
    {
      lane: "Route checkpoint",
      label: "Chart-backed route verification",
      status: chartSummary.blocked > 0 ? "Blocked" : chartSummary.inProgress > 0 ? "In progress" : "Ready",
      href: "/admin/release-checks",
      note:
        chartSummary.blocked > 0
          ? "Some chart-backed public routes are still blocked in the chart-verification registry, so preflight should not treat the visual market layer as launch-safe."
          : chartSummary.inProgress > 0
            ? "Chart verification is now centralized in one registry, but the public routes still need more route-by-route visual confirmation."
            : "Chart-backed public routes are currently in a stable enough posture for preflight review.",
      source: "Chart verification preflight",
    },
  ];

  const ruleRows: PreflightChecklistRegistryRow[] = preflightChecklistRules.map((rule, index) => ({
    lane: "Rule",
    label: `Preflight rule ${index + 1}`,
    status: "Ready",
    href: "/admin/preflight-checklist",
    note: rule,
    source: "Preflight policy",
  }));

  return [...checklistRows, ...routeRows, ...ruleRows];
}

export function getPreflightChecklistRegistrySummary() {
  const rows = getPreflightChecklistRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toPreflightChecklistRegistryCsv(rows: PreflightChecklistRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
