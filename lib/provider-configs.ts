export const providerConfigsSummary = {
  activeProfiles: 5,
  switchableClasses: 6,
  blockedProviders: 3,
};

export const providerConfigItems = [
  {
    title: "Auth provider profile",
    status: "Live",
    summary:
      "Google and email-link auth are already treated as configurable provider-backed capabilities with callback and env requirements separated from page logic.",
  },
  {
    title: "Payment provider profile",
    status: "Live",
    summary:
      "Razorpay readiness, billing events, invoices, and entitlements now sit behind a provider-aware operations model rather than leaking into product pages.",
  },
  {
    title: "Communication provider profile",
    status: "In progress",
    summary:
      "Email, WhatsApp, SMS, and push should share event contracts, consent assumptions, and fallback behavior so channels stay swappable later.",
  },
  {
    title: "Broker adapter profile",
    status: "Queued",
    summary:
      "Broker sync, reconciliation, and review workflows should be driven by provider profiles instead of special-casing each broker directly inside portfolio flows.",
  },
  {
    title: "AI provider profile",
    status: "Live",
    summary:
      "Formula-first AI remains the default, while optional live providers should attach through a budget-aware provider profile with explicit mode controls.",
  },
  {
    title: "Storage and media profile",
    status: "Queued",
    summary:
      "Documents, derived assets, webinar media, and future uploads should live behind a provider profile so storage can change without breaking the CMS.",
  },
];

export const providerConfigRules = [
  "Every provider profile should define env keys, callbacks, limits, and rollback conditions outside the product surface.",
  "Switchable provider classes should map to stable internal contracts before operators are allowed to toggle them.",
  "The integration layer should lower coupling, not multiply vendor-specific behavior.",
];
