import { supportedPaymentEvents } from "@/lib/payment-events";

export const recentPaymentEventSamples = [
  {
    id: "evt_riddra_001",
    event: "subscription.activated",
    status: "Processed",
    subject: "elite-monthly-plan",
    userRef: "amit@riddra.com",
    occurredAt: "Apr 13, 2026 • 8:12 AM",
    note: "Subscriber should move from build-mode fallback toward real Elite entitlements.",
  },
  {
    id: "evt_riddra_002",
    event: "subscription.charged",
    status: "Processed",
    subject: "elite-monthly-plan",
    userRef: "subscriber@example.com",
    occurredAt: "Apr 12, 2026 • 10:04 PM",
    note: "Renewal success should preserve alerts, charts, and portfolio access without interruption.",
  },
  {
    id: "evt_riddra_003",
    event: "payment.failed",
    status: "Needs follow-up",
    subject: "pro-monthly-plan",
    userRef: "review@riddra.com",
    occurredAt: "Apr 12, 2026 • 5:36 PM",
    note: "Queue billing-warning communication and mark the account for grace-period review.",
  },
];

export const paymentOpsRules = [
  "Webhook receipt is not enough. Every payment event should map to a user-facing billing state and a clear entitlement action.",
  "Grace periods, renewal warnings, and downgrade rules should be explicit so support can explain plan state confidently.",
  "Payment events, revision logs, and future notifications should converge into one accountable operations trail.",
];

export const paymentOpsSummary = {
  supported: supportedPaymentEvents.length,
  processed: recentPaymentEventSamples.filter((item) => item.status === "Processed").length,
  followUp: recentPaymentEventSamples.filter((item) => item.status !== "Processed").length,
};
