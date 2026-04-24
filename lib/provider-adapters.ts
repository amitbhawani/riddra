export const providerAdaptersSummary = {
  adapterDomains: 6,
  interchangeableProfiles: 5,
  rolloutStates: 4,
};

export const providerAdapterItems = [
  {
    title: "Authentication adapters",
    status: "In progress",
    summary:
      "Auth should remain adapter-driven so Google, email-link, and future provider families can change without rewriting login, callback, or account-state logic.",
  },
  {
    title: "Billing adapters",
    status: "In progress",
    summary:
      "Payments and subscription events should stay behind a billing-adapter layer so invoice, entitlement, and webhook logic remain portable across providers.",
  },
  {
    title: "Communication adapters",
    status: "In progress",
    summary:
      "Email, WhatsApp, SMS, and push should later operate through adapters so campaign orchestration stays stable even if delivery vendors change.",
  },
  {
    title: "Broker adapters",
    status: "Queued",
    summary:
      "Broker connectivity should move through adapter contracts so Zerodha, ICICIdirect, and future brokers fit the same sync and reconciliation framework.",
  },
  {
    title: "AI and storage adapters",
    status: "Queued",
    summary:
      "Optional live AI and media/storage providers should remain swappable so cost controls and portability stay intact as the platform grows.",
  },
];

export const providerAdapterRules = [
  "Adapters should normalize provider behavior before product logic touches it.",
  "Every adapter domain should expose stable contracts for setup, failure handling, and rollback.",
  "Operator controls should toggle adapters through configuration, not through page-level code edits.",
];
