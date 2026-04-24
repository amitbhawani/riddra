import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { supportOpsItems, supportOpsRules } from "@/lib/support-ops";

export type SupportOpsRegistryStatus = "Ready" | "In progress" | "Blocked";

export type SupportOpsRegistryRow = {
  lane: "Ops surface" | "Route checkpoint" | "Operating rule";
  label: string;
  status: SupportOpsRegistryStatus;
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

function mapSupportStatus(status: string): SupportOpsRegistryStatus {
  if (status === "In progress") {
    return "In progress";
  }

  if (status === "Queued") {
    return "Blocked";
  }

  return "Ready";
}

type SupportOpsRegistryScope = "account" | "admin";

function getSupportOpsHref(scope: SupportOpsRegistryScope) {
  return scope === "admin" ? "/admin/support-ops" : "/account/support";
}

export function getSupportOpsRegistryRows(scope: SupportOpsRegistryScope = "admin"): SupportOpsRegistryRow[] {
  const config = getRuntimeLaunchConfig();
  const hasSupportContact = Boolean(config.supportEmail || config.contactEmail);
  const hasBillingContact = Boolean(config.billingSupportEmail);
  const hasFeedbackInbox = Boolean(config.feedbackInbox);
  const hasHelpContentChannel = Boolean(config.supportEmail || config.contactEmail || config.canonicalHost);
  const supportOpsHref = getSupportOpsHref(scope);

  const opsRows: SupportOpsRegistryRow[] = supportOpsItems.map((item) => ({
    lane: "Ops surface",
    label: item.title,
    status: mapSupportStatus(item.status),
    href: supportOpsHref,
    note: item.summary,
    source: "Support ops desk",
  }));

  const routeRows: SupportOpsRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Public help and contact trust",
      status: hasSupportContact ? "In progress" : "Blocked",
      href: "/contact",
      note: hasSupportContact
        ? "A support destination is configured, so public trust and help-center posture can be tested more credibly."
        : "Support ops still need a configured support destination before the public help promise is trustworthy.",
      source: "Contact and help surfaces",
    },
    {
      lane: "Route checkpoint",
      label: "Billing recovery support",
      status: hasBillingContact ? "In progress" : "Blocked",
      href: "/account/billing",
      note: hasBillingContact
        ? "Billing-specific support can now be routed with a dedicated contact path for recovery and escalation."
        : "Billing support still needs a dedicated contact path before recovery journeys can feel reliable.",
      source: "Billing workspace",
    },
    {
      lane: "Route checkpoint",
      label: "Launch-day feedback triage",
      status: hasFeedbackInbox ? "In progress" : "Blocked",
      href: scope === "admin" ? "/admin/launch-day-console" : supportOpsHref,
      note: hasFeedbackInbox
        ? "Feedback intake is configured, so launch-day support observations can be consolidated into one queue."
        : "Launch-day support still needs a configured feedback inbox before issues can be triaged consistently.",
      source: "Launch-day console",
    },
    {
      lane: "Route checkpoint",
      label: "Help-content publishing confidence",
      status: hasHelpContentChannel ? "Ready" : "Blocked",
      href: scope === "admin" ? "/admin/content-rollout" : supportOpsHref,
      note: hasHelpContentChannel
        ? "The support lane has enough contact or publishing context to keep help content visible while the broader content system scales."
        : "Support content still needs either a stable contact route, helpdesk URL, or canonical host context before it can behave like a dependable help layer.",
      source: "Support content rollout",
    },
  ];

  const ruleRows: SupportOpsRegistryRow[] = supportOpsRules.map((rule, index) => ({
    lane: "Operating rule",
    label: `Support rule ${index + 1}`,
    status: "Ready",
    href: supportOpsHref,
    note: rule,
    source: "Support ops policy",
  }));

  return [...opsRows, ...routeRows, ...ruleRows];
}

export function getSupportOpsRegistrySummary(scope: SupportOpsRegistryScope = "admin") {
  const rows = getSupportOpsRegistryRows(scope);

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toSupportOpsRegistryCsv(rows: SupportOpsRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
