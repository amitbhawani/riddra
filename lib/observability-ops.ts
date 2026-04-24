export const observabilitySummary = {
  signalFamilies: 5,
  monitoredJourneys: 8,
  alertDestinations: 4,
};

export const observabilityItems = [
  {
    title: "Runtime and route health",
    status: "In progress",
    summary:
      "Critical public pages, admin routes, auth callbacks, and billing endpoints should emit visible health signals instead of depending on manual spot checks.",
  },
  {
    title: "Source-job and notification failures",
    status: "In progress",
    summary:
      "Broken source refreshes, failed alerts, campaign-delivery issues, and broker-sync gaps should eventually surface in one operator-visible layer with escalation paths.",
  },
  {
    title: "Launch and release telemetry",
    status: "Queued",
    summary:
      "Release windows should later include a compact view of build outcomes, route smoke checks, and high-risk workflow exceptions before promotion decisions are made.",
  },
  {
    title: "Trust and revenue exceptions",
    status: "Queued",
    summary:
      "Billing failures, entitlement drift, portfolio mismatches, and user-success escalations should later join the same observability model so trust issues are not discovered too late.",
  },
];

export const observabilityRules = [
  "A platform should not rely on users to discover its failures first.",
  "Observability should connect runtime, source, billing, and trust signals instead of treating them as separate problems.",
  "The operator layer should make escalation obvious before incidents become reputational damage.",
];
