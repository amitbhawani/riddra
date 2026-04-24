export const launchScopeSummary = {
  launchVisible: 6,
  gatedOrHidden: 5,
  reviewLanes: 4,
};

export const launchScopeItems = [
  {
    title: "Public discovery and trust routes",
    status: "Launch visible",
    area: "Public",
    summary:
      "Homepage, pricing, markets, stocks, IPOs, funds, learn, tools, legal, and trust pages should form the public launch shell because they already support a strong SEO and trust-first experience.",
  },
  {
    title: "Account and workspace basics",
    status: "Launch visible",
    area: "Signed-in",
    summary:
      "Login, signup, account setup, inbox, alerts, and workspace basics can remain visible if auth activation is complete and the connected provider flows are verified.",
  },
  {
    title: "Provider-linked monetization flows",
    status: "Review before launch",
    area: "Signed-in",
    summary:
      "Billing, entitlement, and payment-linked paths should only be promoted if real provider configuration and webhook validation are complete in production.",
  },
  {
    title: "Advanced charts and differentiated intelligence",
    status: "Review before launch",
    area: "Premium",
    summary:
      "Premium charting, proprietary indicator messaging, and high-trust AI explanations should stay conservative until source inputs, Pine Script, and provider readiness are confirmed.",
  },
  {
    title: "Large admin and operator surface",
    status: "Hidden from public",
    area: "Admin",
    summary:
      "The admin system should remain internal-only and operational, with no public discovery paths beyond signed-in protected access.",
  },
  {
    title: "Future mobile and community expansion",
    status: "Roadmap visible",
    area: "Expansion",
    summary:
      "Mobile, mentorship, and community can stay visible as platform depth, but they should not be marketed as fully live app ecosystems before activation and content cadence are ready.",
  },
];

export const launchScopeRules = [
  "If a route depends on unconfirmed providers or sensitive trust promises, it should be gated, hidden, or soft-positioned.",
  "Launch-visible should mean trustworthy today, not just structurally built.",
  "A smaller honest launch scope is better than a larger unstable one.",
];
