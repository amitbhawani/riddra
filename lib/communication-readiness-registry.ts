import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getCommunicationReadinessItems } from "@/lib/communication-readiness";

export type CommunicationRegistryStatus = "Ready" | "In progress" | "Blocked";

export type CommunicationRegistryRow = {
  lane: "Readiness" | "Route checkpoint";
  label: string;
  status: CommunicationRegistryStatus;
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

export function getCommunicationRegistryRows(): CommunicationRegistryRow[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const items = getCommunicationReadinessItems();
  const hasCoreEmail = Boolean(config.supportEmail || config.contactEmail);
  const hasTransactional = resend.configured;
  const hasOperatorChannel = Boolean(
    config.supportWhatsapp || config.telegramHandle || config.xHandle || config.discordInviteUrl,
  );
  const hasFeedbackInbox = Boolean(config.feedbackInbox);

  const readinessRows: CommunicationRegistryRow[] = items.map((item) => ({
    lane: "Readiness",
    label: item.title,
    status: item.status,
    href: item.href,
    note: item.note,
    source: "Communication readiness surface",
  }));

  const routeRows: CommunicationRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Contact route",
      status: hasCoreEmail ? "Ready" : "Blocked",
      href: "/contact",
      note: hasCoreEmail
        ? "Public contact flow now has a configured operator email behind it."
        : "Public contact flow still needs a configured operator email before it can be trusted for launch traffic.",
      source: "Public trust route",
    },
    {
      lane: "Route checkpoint",
      label: "Signup and recovery email path",
      status: hasTransactional ? "In progress" : "Blocked",
      href: "/signup",
      note: hasTransactional
        ? "Signup and future recovery emails can now move into delivery verification because transactional credentials are present."
        : "Signup can be visited, but delivery trust is still blocked until transactional email credentials are configured.",
      source: "Auth and transactional delivery",
    },
    {
      lane: "Route checkpoint",
      label: "Billing communication path",
      status: config.billingSupportEmail && hasTransactional ? "In progress" : "Blocked",
      href: "/account/billing",
      note:
        config.billingSupportEmail && hasTransactional
          ? "Billing support and delivery credentials are configured enough for invoice and payment recovery communication testing."
          : "Billing communication still needs a dedicated support address plus transactional delivery configuration.",
      source: "Billing and support handoff",
    },
    {
      lane: "Route checkpoint",
      label: "Alerts and notification preferences",
      status: hasOperatorChannel || config.pushProviderKey ? "In progress" : "Ready",
      href: "/alerts",
      note:
        hasOperatorChannel || config.pushProviderKey
          ? "Alert preferences can now be mapped more credibly onto configured operator or push channels."
          : "Alert preference surfaces are built, but channel delivery is still mostly product-side scaffolding rather than activated communication plumbing.",
      source: "Alerts workspace",
    },
    {
      lane: "Route checkpoint",
      label: "Launch-day feedback intake",
      status: hasFeedbackInbox ? "In progress" : "Blocked",
      href: "/admin/launch-day-console",
      note: hasFeedbackInbox
        ? "Launch-day observations can now be consolidated through a configured feedback inbox."
        : "Launch-day feedback still needs a configured inbox before issues can be triaged consistently.",
      source: "Launch-day operations",
    },
  ];

  return [...readinessRows, ...routeRows];
}

export function getCommunicationRegistrySummary() {
  const rows = getCommunicationRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toCommunicationRegistryCsv(rows: CommunicationRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
