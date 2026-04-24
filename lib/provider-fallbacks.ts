export const providerFallbacksSummary = {
  domainsWithFallbacks: 6,
  testedFallbackPaths: 4,
  rollbackProfiles: 5,
};

export const providerFallbackItems = [
  {
    title: "Authentication fallback routes",
    status: "In progress",
    summary:
      "Google and email-link auth should stay primary, but fallback behavior should still preserve callback safety, session continuity, and operator rollback options.",
  },
  {
    title: "Billing and entitlement fallbacks",
    status: "In progress",
    summary:
      "Subscription and invoice flows should define fallback-ready provider behavior so payment incidents do not break billing visibility or access-state continuity.",
  },
  {
    title: "Communication channel fallbacks",
    status: "In progress",
    summary:
      "Email, WhatsApp, SMS, and push should eventually degrade through safe channel hierarchies while still respecting consent and campaign intent.",
  },
  {
    title: "AI and formula-mode fallback",
    status: "Live",
    summary:
      "The platform already treats formula-first intelligence as the baseline fallback, so low-cost smart behavior survives even when live AI is disabled.",
  },
  {
    title: "Broker sync fallback profiles",
    status: "Queued",
    summary:
      "Broker connectivity should later expose adapter-specific fallback profiles so statement imports, reconciliation, and exception reviews remain usable during outages.",
  },
];

export const providerFallbackRules = [
  "Every provider domain should document what happens when the primary service fails, slows down, or is intentionally disabled.",
  "Fallbacks should preserve user trust first: keep access, preserve saved state, and surface operator visibility before adding automation.",
  "Rollback paths should be versioned and explicit so provider swaps never become invisible product risk.",
];
