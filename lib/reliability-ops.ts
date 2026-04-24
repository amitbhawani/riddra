export const reliabilityOpsSummary = {
  controlAreas: 6,
  launchChecks: 11,
  queuedMonitors: 5,
};

export const reliabilityOpsItems = [
  {
    title: "Release QA and regression checks",
    status: "In progress",
    summary:
      "Critical public journeys, admin routes, auth flows, billing surfaces, and core market pages should be covered by repeatable release checks before every launch window.",
  },
  {
    title: "Observability and failure visibility",
    status: "In progress",
    summary:
      "Runtime errors, broken source jobs, failed notifications, and billing exceptions should feed into one visible operator layer instead of being discovered ad hoc.",
  },
  {
    title: "Caching and revalidation discipline",
    status: "Queued",
    summary:
      "Static, cached, and near-live surfaces should declare refresh behavior and invalidation rules so scale does not create stale or contradictory outputs.",
  },
  {
    title: "Security and operator access control",
    status: "Queued",
    summary:
      "Admin access, staff roles, sensitive provider settings, and document workflows should later move into a stricter RBAC and audit-aware operating model.",
  },
  {
    title: "Backup and recovery readiness",
    status: "In progress",
    summary:
      "Critical CMS edits, provider settings, billing events, and lifecycle transitions should be reversible and recoverable under a documented reliability plan.",
  },
  {
    title: "Performance and crawl health",
    status: "Queued",
    summary:
      "Core acquisition routes should be checked for crawlability, structured-data integrity, and production performance so traffic growth does not erode trust.",
  },
];

export const reliabilityOpsRules = [
  "A phase should not be considered production-safe just because routes exist; it should also declare how breakage is detected and recovered.",
  "Observability, QA, security, and recovery are platform features, not post-launch chores.",
  "Release confidence should come from repeatable checks and operator visibility rather than memory.",
];
