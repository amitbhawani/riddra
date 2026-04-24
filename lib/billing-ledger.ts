export const billingLedgerSummary = {
  activeSubscriptions: 12,
  renewalsThisWeek: 4,
  failuresNeedReview: 1,
};

export const accountInvoiceSamples = [
  {
    invoiceId: "inv_riddra_1001",
    planName: "Elite Monthly",
    amount: "Rs. 999",
    status: "Paid",
    billedAt: "Apr 12, 2026",
    paidAt: "Apr 12, 2026",
    note: "Access stays on track with full charts, alerts, and portfolio workflows.",
  },
  {
    invoiceId: "inv_riddra_0986",
    planName: "Elite Monthly",
    amount: "Rs. 999",
    status: "Paid",
    billedAt: "Mar 12, 2026",
    paidAt: "Mar 12, 2026",
    note: "Renewal completed without any entitlement interruption.",
  },
  {
    invoiceId: "inv_riddra_0944",
    planName: "Elite Monthly",
    amount: "Rs. 999",
    status: "Upcoming",
    billedAt: "May 12, 2026",
    paidAt: "Pending",
    note: "This should later convert into a real next-renewal card with retry and grace-period messaging.",
  },
];

export const billingLedgerSamples = [
  {
    userRef: "amit@riddra.com",
    planName: "Elite Monthly",
    status: "Active",
    renewalState: "Healthy",
    latestInvoice: "inv_riddra_1001",
    note: "Everything is in good standing and entitlement access should remain stable.",
  },
  {
    userRef: "subscriber@example.com",
    planName: "Elite Monthly",
    status: "Active",
    renewalState: "Healthy",
    latestInvoice: "inv_riddra_0992",
    note: "Recent charge succeeded, so no intervention is needed.",
  },
  {
    userRef: "review@riddra.com",
    planName: "Pro Monthly",
    status: "Grace period",
    renewalState: "Needs review",
    latestInvoice: "inv_riddra_0978",
    note: "Payment failed. Support and alert systems should coordinate downgrade timing carefully.",
  },
];

export const billingLedgerRules = [
  "Subscriber billing history should be simple and reassuring, while the staff ledger should expose edge cases and renewal risk clearly.",
  "Invoice state, subscription state, webhook events, and entitlement state should always reconcile to the same truth.",
  "Every failed renewal should have a clear next action: retry, notify, grace period, or downgrade.",
];
