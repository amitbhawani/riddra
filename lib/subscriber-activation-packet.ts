import { getCommunicationReadinessItems } from "@/lib/communication-readiness";
import { getPaymentReadinessItems } from "@/lib/payment-readiness";
import { getSubscriberLaunchReadinessItems } from "@/lib/subscriber-launch-readiness";
import { getSystemStatusItems } from "@/lib/system-status";

export type SubscriberActivationStatus =
  | "Ready"
  | "Needs config"
  | "Needs verification";

export type SubscriberActivationPacketRow = {
  lane:
    | "Auth"
    | "Entitlements"
    | "Billing"
    | "Webhook"
    | "Support"
    | "Workspace"
    | "Conversion";
  label: string;
  status: SubscriberActivationStatus;
  href: string;
  detail: string;
  evidence: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getSubscriberActivationPacketRows(): SubscriberActivationPacketRow[] {
  const readinessItems = getSubscriberLaunchReadinessItems();
  const paymentItems = getPaymentReadinessItems();
  const systemItems = getSystemStatusItems();
  const communicationItems = getCommunicationReadinessItems();

  const authRuntime = systemItems.find((item) => item.title === "Supabase public env");
  const paymentEnv = systemItems.find((item) => item.title === "Payments env");
  const deliveryEnv = systemItems.find((item) => item.title === "Transactional delivery");
  const webhookItem = paymentItems.find((item) => item.title === "Webhook verification");
  const supportItem = communicationItems.find((item) => item.title === "Support email");

  return [
    {
      lane: "Auth",
      label: "Public auth and subscriber identity",
      status:
        authRuntime?.status === "Configured" ? "Needs verification" : "Needs config",
      href: "/account",
      detail:
        authRuntime?.status === "Configured"
          ? "The auth runtime is configured, so the remaining work is verifying real signup, login, and plan-linked account continuity outside the local admin bypass."
          : "Public signup and subscriber identity cannot be treated as real until the Supabase auth runtime is configured end to end.",
      evidence: "Protected account routes, auth shell, and subscriber readiness lane are already built.",
    },
    {
      lane: "Entitlements",
      label: "Plan gating and entitlement truth",
      status: "Needs verification",
      href: "/admin/entitlements",
      detail:
        "The access-model route, protected entitlement-audit route, and workspace gating surfaces now exist; the remaining work is exercising real Starter, Pro, and Elite transitions against subscriber records.",
      evidence: "Entitlement audit, billing lifecycle, billing recovery, and account support routes are all live.",
    },
    {
      lane: "Billing",
      label: "Checkout and billing core",
      status:
        paymentEnv?.status === "Configured" ? "Needs verification" : "Needs config",
      href: "/admin/payment-readiness",
      detail:
        paymentEnv?.status === "Configured"
          ? "Razorpay keys are present, but checkout, billing-state sync, and invoice truth remain part of the deferred commercial lane rather than the private-beta gate."
          : "Pricing, billing workspace, and lifecycle views are built, and live checkout can stay deferred until the later commercial lane resumes.",
      evidence: "Billing workspace, billing lifecycle, and billing recovery routes now exist and use more honest preview-vs-verified framing.",
    },
    {
      lane: "Webhook",
      label: "Webhook-confirmed subscription state",
      status:
        paymentEnv?.status === "Configured" && webhookItem?.status === "Preview / internal"
          ? "Needs verification"
          : "Needs config",
      href: "/admin/payment-events",
      detail:
        paymentEnv?.status === "Configured" && webhookItem?.status === "Preview / internal"
          ? "Webhook secrets are present, so the remaining task is proving subscription events and entitlement updates end to end."
          : "The signed webhook route is coded, but production subscription truth still needs webhook secret configuration and an exercised lifecycle pass.",
      evidence: "Webhook route, event parsing, and payment-event surfaces are already in place.",
    },
    {
      lane: "Support",
      label: "Transactional delivery and support handoff",
      status:
        deliveryEnv?.status === "Configured" && supportItem?.status === "Ready"
          ? "Needs verification"
          : "Needs config",
      href: "/admin/communication-readiness",
      detail:
        deliveryEnv?.status === "Configured" && supportItem?.status === "Ready"
          ? "Support contact and transactional delivery are configured, so onboarding, billing, and recovery sends now need a real send-and-receive verification pass."
          : "The communication and support surfaces are built, but support contact and delivery credentials still need to be configured together before subscriber trust can be exercised.",
      evidence: "Communication-readiness, support-ops, public help, and protected account-support surfaces are already live.",
    },
    {
      lane: "Workspace",
      label: "Workspace continuity and memory truth",
      status: "Needs verification",
      href: "/account/workspace",
      detail:
        "Portfolio, watchlists, alerts, brokers, inbox, setup, consent, and saved-screen surfaces now have clearer preview-state honesty, and the remaining step is replacing preview continuity with durable subscriber memory and linkage.",
      evidence: "Workspace hub, protected account routes, preview-honesty sweep, and subscriber launch registry are already built.",
    },
    {
      lane: "Conversion",
      label: "Landing-to-subscriber conversion path",
      status: "Needs verification",
      href: "/admin/conversion-path-audit",
      detail:
        "The full landing, pricing, signup, onboarding, billing, entitlement, and support route graph now exists, and the final step is a real outside-user rehearsal once auth and billing credentials are active.",
      evidence: "Conversion-path audit and subscriber-launch registry already map the whole route sequence.",
    },
  ];
}

export function getSubscriberActivationPacketSummary() {
  const rows = getSubscriberActivationPacketRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    needsConfig: rows.filter((row) => row.status === "Needs config").length,
    needsVerification: rows.filter((row) => row.status === "Needs verification").length,
  };
}

export function toSubscriberActivationPacketCsv(
  rows: SubscriberActivationPacketRow[],
) {
  const header = ["lane", "label", "status", "href", "detail", "evidence"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.detail, row.evidence]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
