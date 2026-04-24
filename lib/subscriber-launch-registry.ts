import { getCurrentPlanTier } from "@/lib/plan-gating";
import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberLaunchReadinessItems } from "@/lib/subscriber-launch-readiness";

export type SubscriberLaunchRegistryStatus = "Ready" | "In progress" | "Blocked";

export type SubscriberLaunchRegistryRow = {
  lane: "Readiness" | "Route checkpoint";
  label: string;
  status: SubscriberLaunchRegistryStatus;
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

export async function getSubscriberLaunchRegistryRows(): Promise<
  SubscriberLaunchRegistryRow[]
> {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const currentPlan = await getCurrentPlanTier();
  const readinessItems = getSubscriberLaunchReadinessItems();
  const hasBillingCore = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
  const hasWebhook = Boolean(config.razorpayWebhookSecret);
  const hasSupportDelivery = delivery.configured;

  const readinessRows: SubscriberLaunchRegistryRow[] = readinessItems.map((item) => ({
    lane: "Readiness",
    label: item.title,
    status: item.status,
    href: item.href,
    note: item.note,
    source: "Subscriber readiness surface",
  }));

  const routeRows: SubscriberLaunchRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Pricing route",
      status: hasBillingCore ? "In progress" : "Blocked",
      href: "/pricing",
      note: hasBillingCore
        ? "Pricing can now move into real checkout validation because billing core credentials are configured."
        : "Pricing is present, but real paid conversion remains blocked until billing core credentials are configured.",
      source: "Route and billing config",
    },
    {
      lane: "Route checkpoint",
      label: "Signup and login routes",
      status: "Ready",
      href: "/signup",
      note: "Signup and login are healthy public entry points for conversion-path testing.",
      source: "Public auth routes",
    },
    {
      lane: "Route checkpoint",
      label: "Account access route",
      status: "Ready",
      href: "/account/access",
      note: `The access route now reflects real plan-gating handoffs, and the current local access posture resolves as ${currentPlan.isAdmin ? "Admin access" : currentPlan.label}.`,
      source: "Account access and plan gating",
    },
    {
      lane: "Route checkpoint",
      label: "Entitlement audit route",
      status: "Ready",
      href: "/account/access/entitlements",
      note: "The protected entitlement-audit route now gives subscriber-facing access review more depth than the account summary alone, even though live billing-linked entitlement sync is still pending.",
      source: "Account entitlement audit",
    },
    {
      lane: "Route checkpoint",
      label: "Billing workspace",
      status: hasBillingCore ? "In progress" : "Blocked",
      href: "/account/billing",
      note: hasBillingCore
        ? "Billing workspace can now be validated against real checkout and webhook lifecycle events."
        : "Billing workspace exists, but it still needs real billing credentials before truth can be trusted.",
      source: "Billing workspace",
    },
    {
      lane: "Route checkpoint",
      label: "Billing lifecycle route",
      status: hasBillingCore && hasWebhook ? "In progress" : "Ready",
      href: "/account/billing/lifecycle",
      note: hasBillingCore && hasWebhook
        ? "The billing-lifecycle route can now participate in event-driven subscriber validation because billing core and webhook posture are configured."
        : "The billing-lifecycle route now explains activation, renewal, and fallback posture even before billing credentials and webhooks are fully configured.",
      source: "Billing lifecycle route",
    },
    {
      lane: "Route checkpoint",
      label: "Billing recovery route",
      status: hasBillingCore ? "In progress" : "Blocked",
      href: "/account/billing/recovery",
      note: hasBillingCore
        ? "The recovery route now gives subscriber-facing failed-charge and downgrade posture a real protected destination for validation."
        : "The recovery route exists, but it still describes preview-backed lifecycle posture until billing credentials are configured.",
      source: "Billing recovery route",
    },
    {
      lane: "Route checkpoint",
      label: "Webhook lifecycle truth",
      status: hasBillingCore && hasWebhook ? "In progress" : "Blocked",
      href: "/admin/payment-events",
      note: hasBillingCore && hasWebhook
        ? "Webhook lifecycle truth is configured enough to move into end-to-end subscription testing."
        : "Subscriber lifecycle truth is still blocked until webhook signing is configured.",
      source: "Webhook readiness",
    },
    {
      lane: "Route checkpoint",
      label: "Support and transactional delivery",
      status: hasSupportDelivery ? "In progress" : "Blocked",
      href: "/admin/communication-readiness",
      note: hasSupportDelivery
        ? "Support contact and transactional delivery are configured enough for onboarding and billing communication testing."
        : "Support and delivery still need production-ready configuration before subscriber trust can be treated as launch-grade.",
      source: "Support and delivery config",
    },
    {
      lane: "Route checkpoint",
      label: "Account support route",
      status: hasSupportDelivery ? "In progress" : "Ready",
      href: "/account/support",
      note: hasSupportDelivery
        ? "The account-support route can now be used as the subscriber-facing handoff surface while recovery, onboarding, and billing communication flows are tested."
        : "The protected account-support route now centralizes subscriber-safe help posture even before delivery channels are fully configured.",
      source: "Account support route",
    },
    {
      lane: "Route checkpoint",
      label: "Gated workspace route",
      status: "In progress",
      href: "/trader-workstation",
      note: "Premium route gating is active now, but full Starter, Pro, and Elite boundary coverage still needs wider enforcement.",
      source: "Plan-gated workspace",
    },
  ];

  return [...readinessRows, ...routeRows];
}

export async function getSubscriberLaunchRegistrySummary() {
  const rows = await getSubscriberLaunchRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toSubscriberLaunchCsv(rows: SubscriberLaunchRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
