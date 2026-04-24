export const preflightChecklistSummary = {
  checklistGroups: 5,
  criticalChecks: 8,
  ownerReviews: 4,
};

export const preflightChecklistItems = [
  {
    group: "Product shell",
    status: "Required",
    summary:
      "Confirm homepage, pricing, search, markets, stock pages, IPO pages, fund pages, and trust pages load cleanly in the final environment.",
  },
  {
    group: "Auth and account access",
    status: "Required",
    summary:
      "Confirm Google and email sign-in, callback completion, protected account routes, and admin access behavior with real project auth.",
  },
  {
    group: "Provider-linked workflows",
    status: "Required",
    summary:
      "Confirm payments, alerts, support delivery, and any live provider-backed account flows only if real credentials and endpoints are configured.",
  },
  {
    group: "Operations and rollback",
    status: "Required",
    summary:
      "Confirm observability, incident response, recovery readiness, and rollback-safe release discipline before public promotion begins.",
  },
  {
    group: "Owner signoff",
    status: "Required",
    summary:
      "Confirm launch copy, support contact, legal comfort, and public-scope decisions so the product matches what the business is willing to promise.",
  },
];

export const preflightChecklistRules = [
  "A successful production build is one checkpoint, not the whole launch decision.",
  "Anything without owner signoff should be treated as not launch-cleared.",
  "Preflight should happen after credentials are applied and before public promotion starts.",
];
