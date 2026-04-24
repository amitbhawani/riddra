export const providerSwitchboardSummary = {
  switchableDomains: 6,
  activePrimaryProviders: 4,
  fallbackPaths: 5,
};

export const providerSwitchboardItems = [
  {
    title: "Auth switchboard",
    status: "Live",
    summary:
      "Google and email-link auth should remain the primary combination, but the platform should still treat auth as a switchable provider domain with stable callbacks and user-state rules.",
  },
  {
    title: "Payments switchboard",
    status: "In progress",
    summary:
      "Billing, invoices, subscriptions, and entitlement flows should stay behind a provider switchboard so Razorpay is an adapter choice, not a permanent coupling.",
  },
  {
    title: "Communications switchboard",
    status: "In progress",
    summary:
      "Email, WhatsApp, SMS, and push should later switch by domain and fallback behavior without changing campaign logic or consent state design.",
  },
  {
    title: "AI switchboard",
    status: "Live",
    summary:
      "Formula-first mode remains the default, while optional live AI should stay behind a provider switchboard with clear budget and guardrail behavior.",
  },
  {
    title: "Broker adapter switchboard",
    status: "Queued",
    summary:
      "Broker connectivity should later move through a broker adapter switchboard instead of directly coupling every sync path to one broker family.",
  },
  {
    title: "Storage and media switchboard",
    status: "Queued",
    summary:
      "Uploads, documents, media assets, and derived files should remain portable across providers without breaking CMS or delivery flows.",
  },
];

export const providerSwitchboardRules = [
  "Every switchable domain should define a primary provider, fallback path, and rollback-safe operator control before it is considered launch-ready.",
  "Switching providers should not require page-level code changes or user-state rewrites.",
  "The switchboard should reduce coupling, not hide vendor-specific complexity without documenting it.",
];
