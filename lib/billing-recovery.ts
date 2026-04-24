export type BillingRecoveryStage = {
  title: string;
  event: string;
  subscriberRead: string;
  operatorExpectation: string;
};

export const billingRecoveryStages: BillingRecoveryStage[] = [
  {
    title: "Activation and first charge",
    event: "subscription.activated",
    subscriberRead: "The user should see plan access, billing status, and a clean first invoice once activation is real.",
    operatorExpectation: "Confirm the payment provider, webhook listener, and entitlement updater all agree before access expands.",
  },
  {
    title: "Renewal continuity",
    event: "subscription.charged",
    subscriberRead: "Successful renewals should keep access steady and add trustworthy invoice history without confusion.",
    operatorExpectation: "Renewal success should update invoice continuity and avoid duplicate or stale account states.",
  },
  {
    title: "Failure and warning state",
    event: "payment.failed",
    subscriberRead: "A failed charge should explain what happened, what still works, and what the subscriber should do next.",
    operatorExpectation: "Queue a warning message, support handoff, and downgrade review before the user discovers the issue elsewhere.",
  },
  {
    title: "Grace-period review",
    event: "subscription.halted",
    subscriberRead: "Access should shift deliberately instead of vanishing without explanation if payment or renewal is halted.",
    operatorExpectation: "Preserve billing history, mark the account for review, and prepare downgrade or recovery decisions cleanly.",
  },
  {
    title: "Cancellation and fallback access",
    event: "subscription.cancelled",
    subscriberRead: "The account should retain understandable history while premium access falls back safely.",
    operatorExpectation: "Move the user toward fallback access without losing the record of prior plan state or invoices.",
  },
];

export const billingRecoveryRules = [
  "Do not promise automated billing recovery until checkout, webhook verification, and support delivery are all active together.",
  "A recovery route should explain what the user sees next, not only what the backend event name was.",
  "Support and billing channels should stay visible here because failed payments are partly an operations problem, not only a code path.",
];
