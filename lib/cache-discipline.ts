export const cacheDisciplineSummary = {
  cacheZones: 5,
  refreshPolicies: 7,
  invalidationPaths: 4,
};

export const cacheDisciplineItems = [
  {
    title: "Public-route refresh policy",
    status: "In progress",
    summary:
      "Stocks, IPOs, funds, tools, learning pages, and public hubs should eventually declare how often they refresh so users do not see conflicting states across the platform.",
  },
  {
    title: "Near-live and source-driven invalidation",
    status: "In progress",
    summary:
      "Index trackers, charts, alerts, source jobs, and override-sensitive content should later expose invalidation rules instead of relying on accidental freshness.",
  },
  {
    title: "CMS publish revalidation",
    status: "Queued",
    summary:
      "Manual editorial updates, documents, announcements, and lifecycle transitions should later have a clean publish-to-refresh pathway before the backend becomes heavily used.",
  },
  {
    title: "Operator-visible cache safety",
    status: "Queued",
    summary:
      "The team should eventually be able to understand when content is static, cached, stale, or regenerated without reading code or guessing production behavior.",
  },
];

export const cacheDisciplineRules = [
  "Freshness rules should be explicit, not implied by whichever route was built last.",
  "Near-live and editorial flows need different invalidation behavior and should be treated separately.",
  "Operator visibility into cache state is part of launch confidence, not a post-scale luxury.",
];
