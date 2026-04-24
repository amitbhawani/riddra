import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getTrustSignoffItems } from "@/lib/trust-signoff";

export type TrustSignoffRegistryStatus = "Ready" | "In progress" | "Blocked";

export type TrustSignoffRegistryRow = {
  lane: "Trust checklist" | "Route checkpoint";
  label: string;
  status: TrustSignoffRegistryStatus;
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

export function getTrustSignoffRegistryRows(): TrustSignoffRegistryRow[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const items = getTrustSignoffItems();
  const hasCanonicalHost = Boolean(config.canonicalHost || config.siteUrl);
  const hasSupportLayer = Boolean(config.supportEmail || config.contactEmail);
  const hasDelivery = resend.configured;
  const hasComplianceOwners = Boolean(config.privacyOwner && config.termsOwner);
  const hasRiskDisclosure = Boolean(config.riskDisclosureUrl);
  const hasStatusPage = Boolean(config.statusPageUrl);

  const checklistRows: TrustSignoffRegistryRow[] = items.map((item) => ({
    lane: "Trust checklist",
    label: item.title,
    status: item.status,
    href: item.href,
    note: item.detail,
    source: "Trust signoff surface",
  }));

  const routeRows: TrustSignoffRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Public trust pages",
      status: hasComplianceOwners ? "In progress" : "Blocked",
      href: "/launch-readiness",
      note: hasComplianceOwners
        ? "Public trust pages now have named legal owners behind them, but the copy still needs final launch review."
        : "Launch-readiness, privacy, and terms still need named owners before the public trust layer can be signed off confidently.",
      source: "Public trust routes",
    },
    {
      lane: "Route checkpoint",
      label: "Contact and support promise path",
      status: hasSupportLayer && hasDelivery ? "In progress" : "Blocked",
      href: "/contact",
      note:
        hasSupportLayer && hasDelivery
          ? "Support contact and delivery credentials are configured enough for recovery and reassurance flows to be verified."
          : "Support promise discipline is still blocked until both contact visibility and delivery capability are configured.",
      source: "Support and recovery routes",
    },
    {
      lane: "Route checkpoint",
      label: "Launch-domain and canonical posture",
      status: hasCanonicalHost ? "In progress" : "Blocked",
      href: "/admin/domain-readiness",
      note: hasCanonicalHost
        ? "Canonical host or site URL is configured, so final launch posture can be reviewed against a real destination."
        : "Trust signoff is still missing a stable public host or canonical domain reference.",
      source: "Domain and announcement posture",
    },
    {
      lane: "Route checkpoint",
      label: "Risk and grievance visibility",
      status: hasRiskDisclosure ? "In progress" : "Blocked",
      href: "/admin/launch-config-console",
      note: hasRiskDisclosure
        ? "Risk-disclosure wiring exists, so launch copy can be checked against an explicit disclosure destination."
        : "Trust-sensitive product language should stay conservative until risk disclosure is configured visibly.",
      source: "Compliance posture",
    },
    {
      lane: "Route checkpoint",
      label: "Status and incident confidence",
      status: hasStatusPage ? "Ready" : "In progress",
      href: "/admin/incident-response",
      note: hasStatusPage
        ? "A status destination is configured, which strengthens external trust during incidents and launch-day communication."
        : "A dedicated status page is optional today, but adding one would make external trust and outage communication stronger later.",
      source: "Incident and public messaging posture",
    },
  ];

  return [...checklistRows, ...routeRows];
}

export function getTrustSignoffRegistrySummary() {
  const rows = getTrustSignoffRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toTrustSignoffRegistryCsv(rows: TrustSignoffRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
