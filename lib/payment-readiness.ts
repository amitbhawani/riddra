import { env } from "@/lib/env";
import { pricingPlans } from "@/lib/site";

export type PaymentReadinessItem = {
  title: string;
  status: "Preview / internal" | "Blocked" | "Deferred";
  note: string;
};

export const billingWorkspaceItems = [
  {
    title: "Current beta rule",
    value: "Account-led access",
    note: "Private beta access is still governed by signed-in continuity and entitlement placeholders, not by live purchase proof.",
  },
  {
    title: "Deferred commercial lane",
    value: "Razorpay subscriptions later",
    note: "Use Razorpay for recurring plans, payment retries, and subscription lifecycle events only after the commercial lane resumes.",
  },
  {
    title: "Current account control",
    value: "Read-only billing placeholders",
    note: "Users can inspect stored billing posture and support paths now, while real checkout and invoice control remain intentionally unavailable.",
  },
];

export const planActivationNotes = pricingPlans.map((plan) => ({
  ...plan,
  activationNote:
    plan.name === "Elite"
      ? "Private beta can keep signed-in users on the broadest access posture while commercial checkout and renewals stay disabled."
      : "Show this plan as future commercial shape only. Do not imply live purchase or downgrade control until billing resumes.",
}));

export function getPaymentReadinessItems(): PaymentReadinessItem[] {
  const hasKeys = Boolean(env.razorpayKeyId && env.razorpayKeySecret);
  const hasWebhook = Boolean(env.razorpayWebhookSecret);

  return [
    {
      title: "Pricing model and plan architecture",
      status: "Preview / internal",
      note: "The three-plan structure is visible in-product, but private beta still treats access as account-led until commercial boundaries and purchase proof are deliberately activated.",
    },
    {
      title: "Razorpay API credentials",
      status: "Deferred",
      note: hasKeys
        ? "Razorpay key ID and secret are present, but the commercial billing lane is still intentionally deferred outside private beta."
        : "Razorpay key ID and secret remain a deferred commercial input. Keep them visible, but do not treat them as a private-beta deployment blocker.",
    },
    {
      title: "Test-mode checkout and receipt verification",
      status: "Deferred",
      note: hasKeys
        ? "Credentials exist, but checkout, subscription lifecycle, and receipt verification remain intentionally deferred until the commercial lane resumes."
        : "No payment validation should start yet because private beta does not depend on live commercial billing.",
    },
    {
      title: "Webhook verification",
      status: "Deferred",
      note: hasWebhook
        ? "Webhook signing inputs are present, but live billing verification remains intentionally deferred outside the private-beta gate."
        : "Webhook signing matters for the later commercial lane, but it is intentionally outside the private-beta deployment gate.",
    },
    {
      title: "Webhook route and event parsing",
      status: "Preview / internal",
      note: "A signed Razorpay webhook endpoint and shared event catalog exist as backend groundwork, but they remain internal preparation until the commercial lane resumes.",
    },
    {
      title: "Subscriber billing workspace",
      status: "Preview / internal",
      note: "The billing route now presents a read-only private-beta billing posture instead of implying live checkout, but it remains a placeholder workspace until commercial billing resumes.",
    },
    {
      title: "Seeded invoice retirement and verified empty states",
      status: "Preview / internal",
      note: "Preview invoice examples are now labeled more honestly, but this lane remains internal and placeholder until commercial billing resumes.",
    },
    {
      title: "Entitlement-to-plan mapping",
      status: "Deferred",
      note: "Once live plans are activated, billing events should update entitlements automatically instead of relying on build-mode access assumptions.",
    },
  ];
}
