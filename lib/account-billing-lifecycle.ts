import { supportedPaymentEvents } from "@/lib/payment-events";

export type AccountBillingLifecycleRow = {
  event: string;
  subscriberRead: string;
  operatorMeaning: string;
};

export const accountBillingLifecycleRows: AccountBillingLifecycleRow[] = supportedPaymentEvents.map((item) => ({
  event: item.event,
  subscriberRead:
    item.event === "subscription.activated"
      ? "Plan access should begin clearly, with invoice truth and entitlement posture lining up in the account."
      : item.event === "subscription.charged"
        ? "Renewal should feel quiet and trustworthy, with no surprise loss of access or missing invoice continuity."
        : item.event === "subscription.halted"
          ? "The subscriber should understand the warning state, grace period, and next step before premium access changes."
          : item.event === "subscription.cancelled"
            ? "Fallback access should be understandable, and the user should still see what happened to their prior plan."
            : "Failed charges should trigger a clear warning, a recovery path, and a support handoff instead of silent confusion.",
  operatorMeaning: item.action,
}));

export const accountBillingLifecycleRules = [
  "Do not present lifecycle stages as live subscriber truth until checkout, webhook verification, and entitlement syncing are all working together.",
  "Billing lifecycle language should tell the user what they experience next, not only what internal event name the backend receives.",
  "Activation, renewal, failure, and fallback routes should stay connected to support and entitlement review instead of becoming isolated billing jargon.",
];
