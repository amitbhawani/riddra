import { billingWorkspaceItems, getPaymentReadinessItems } from "@/lib/payment-readiness";
import { supportedPaymentEvents } from "@/lib/payment-events";
import { subscriptionMatrixFeatures } from "@/lib/subscription-matrix";

export type PaymentReadinessRegistryStatus =
  | "Preview / internal"
  | "Blocked"
  | "Deferred";

export type PaymentReadinessRegistryRow = {
  lane: "Activation" | "Webhook event" | "Plan mapping";
  label: string;
  status: PaymentReadinessRegistryStatus;
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

function mapFeatureStatus(
  feature: (typeof subscriptionMatrixFeatures)[number],
): PaymentReadinessRegistryStatus {
  if (feature.pro === "Included" || feature.elite === "Included") {
    return "Preview / internal";
  }

  if (feature.pro === "Planned" || feature.elite === "Planned") {
    return "Deferred";
  }

  return "Deferred";
}

export const paymentReadinessRegistryRows: PaymentReadinessRegistryRow[] = [
  ...getPaymentReadinessItems().map((item) => ({
    lane: "Activation" as const,
    label: item.title,
    status: item.status,
    href:
      item.title === "Webhook route and event parsing"
        ? "/admin/payment-events"
        : item.title === "Subscriber billing workspace"
          ? "/account/billing"
          : "/admin/payment-readiness",
    note: item.note,
    source: "Payment readiness surface",
  })),
  ...billingWorkspaceItems.map((item) => ({
    lane: "Activation" as const,
    label: item.title,
    status: "Preview / internal" as const,
    href: "/account/billing",
    note: `${item.value} — ${item.note}`,
    source: "Billing workspace notes",
  })),
  ...supportedPaymentEvents.map((event) => ({
    lane: "Webhook event" as const,
    label: event.event,
    status: "Preview / internal" as const,
    href: "/admin/payment-events",
    note: `${event.purpose} ${event.action}`,
    source: "Webhook event catalog",
  })),
  ...subscriptionMatrixFeatures.map((feature) => ({
    lane: "Plan mapping" as const,
    label: feature.feature,
    status: mapFeatureStatus(feature),
    href: "/admin/subscription-matrix",
    note: `Starter ${feature.starter} · Pro ${feature.pro} · Elite ${feature.elite}. ${feature.note}`,
    source: "Subscription matrix",
  })),
];

export const paymentReadinessRegistrySummary = {
  rows: paymentReadinessRegistryRows.length,
  previewInternal: paymentReadinessRegistryRows.filter((row) => row.status === "Preview / internal").length,
  deferred: paymentReadinessRegistryRows.filter((row) => row.status === "Deferred").length,
  blocked: paymentReadinessRegistryRows.filter((row) => row.status === "Blocked").length,
};

export function toPaymentReadinessCsv(rows: PaymentReadinessRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];
  const dataRows = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...dataRows].join("\n");
}
