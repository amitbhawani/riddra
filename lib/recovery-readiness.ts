export const recoveryReadinessSummary = {
  recoveryTracks: 4,
  protectedAssets: 7,
  readinessChecks: 6,
};

export const recoveryReadinessItems = [
  {
    title: "Content and CMS recovery",
    status: "In progress",
    summary:
      "Editorial blocks, announcements, documents, overrides, and lifecycle edits should stay reversible so operator mistakes do not become permanent production damage.",
  },
  {
    title: "Provider and billing rollback",
    status: "In progress",
    summary:
      "Provider rollouts, billing settings, entitlement events, and communication switches should later have documented rollback steps before more live traffic depends on them.",
  },
  {
    title: "Search, crawl, and performance health",
    status: "Queued",
    summary:
      "Acquisition routes should later have recovery playbooks for crawl regressions, schema breakage, cache issues, and performance drops so traffic losses are easier to contain.",
  },
  {
    title: "Operational drill discipline",
    status: "Queued",
    summary:
      "The team should eventually rehearse key recovery paths for content mistakes, provider outages, broken imports, and release regressions instead of assuming rollback will be intuitive.",
  },
];

export const recoveryReadinessRules = [
  "A rollback plan is part of the feature, not an afterthought.",
  "Recovery readiness should cover trust, revenue, content, and traffic together.",
  "The platform should preserve enough memory to recover from both data issues and operator mistakes.",
];
