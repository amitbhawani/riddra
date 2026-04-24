import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export type PaymentEventDefinition = {
  event: string;
  purpose: string;
  action: string;
};

export const supportedPaymentEvents: PaymentEventDefinition[] = [
  {
    event: "subscription.activated",
    purpose: "Mark a subscriber as live once the recurring plan becomes active.",
    action: "Promote the user from build-mode fallback toward real paid-plan state.",
  },
  {
    event: "subscription.charged",
    purpose: "Track recurring successful renewals and invoice continuity.",
    action: "Keep entitlements active and record the latest successful billing cycle.",
  },
  {
    event: "subscription.halted",
    purpose: "Detect payment failure or subscription pause before the user is surprised.",
    action: "Flag the account for grace-period messaging and downgrade review.",
  },
  {
    event: "subscription.cancelled",
    purpose: "Handle intentional or involuntary subscription end states clearly.",
    action: "Move the account toward fallback access and preserve billing history.",
  },
  {
    event: "payment.failed",
    purpose: "Catch failed charges early so reminders and account-state transitions stay trustworthy.",
    action: "Queue billing-warning communication and review renewal risk.",
  },
];

export function getPaymentEventSummary(event: string) {
  return supportedPaymentEvents.find((item) => item.event === event);
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string | null) {
  if (!env.razorpayWebhookSecret || !signature) {
    return false;
  }

  const digest = createHmac("sha256", env.razorpayWebhookSecret).update(payload).digest("hex");

  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}
