export const operatorControlsSummary = {
  configurablePanels: 6,
  moduleToggles: 5,
  rolloutModes: 4,
};

export const operatorControlGroups = [
  {
    title: "Module activation controls",
    status: "Live",
    summary:
      "Future product families should be enabled through controlled panels for route groups, field packs, default blocks, and search visibility instead of code edits alone.",
  },
  {
    title: "Publishing behavior controls",
    status: "Live",
    summary:
      "Operators should later tune archive behavior, CTA visibility, publish cadence, and creator-surface linking from structured settings.",
  },
  {
    title: "Alert and notification controls",
    status: "In progress",
    summary:
      "Alert-channel visibility, campaign eligibility, and event-trigger behavior should be driven by admin-side settings and consent-aware rules.",
  },
  {
    title: "AI mode controls",
    status: "Live",
    summary:
      "Formula-first mode, live AI eligibility, and budget profiles should stay operator-controlled and visible without touching application logic.",
  },
  {
    title: "Search and discovery controls",
    status: "In progress",
    summary:
      "Route-family discoverability, hub inclusion, compare visibility, and search-answer layering should eventually be adjustable through admin controls.",
  },
  {
    title: "Provider switching controls",
    status: "Queued",
    summary:
      "Email, payments, analytics, alerts, and future AI providers should be replaceable behind stable settings so vendor changes do not force product rewrites.",
  },
];

export const operatorControlRules = [
  "Operator controls should change behavior safely without mutating canonical data directly.",
  "Every major setting should declare scope, default, owner, and rollback behavior before it is allowed to affect public pages.",
  "The goal is not unlimited flexibility; it is controlled expansion so the platform feels WordPress-like for operators without becoming unstructured.",
];
