export const appReleaseControlSummary = {
  releaseTracks: 4,
  readinessSignals: 6,
  handoffChecks: 5,
};

export const appReleaseControlItems = [
  {
    title: "Web-to-app contract review",
    status: "In progress",
    summary:
      "Account, alerts, portfolio, push triggers, and saved-state behavior should later be reviewed as one cross-platform contract before any native build is treated as launchable.",
  },
  {
    title: "Notification and deep-link handoff",
    status: "In progress",
    summary:
      "Push delivery, mobile journeys, cohort reminders, and support-recovery entry points should later pass through one release-control lens before app rollout.",
  },
  {
    title: "Release packaging checklist",
    status: "Queued",
    summary:
      "App-store metadata, permission disclosures, launch copy, and support escalation notes should later be organized into one packaging checklist instead of being assembled ad hoc.",
  },
  {
    title: "Cross-platform signoff",
    status: "Queued",
    summary:
      "Mobile readiness should later conclude with one signoff layer that ties product, content, support, and growth expectations together before native launch.",
  },
];

export const appReleaseControlRules = [
  "App readiness should be treated as a product-contract problem, not only a UI port.",
  "Push, deep links, and saved state must be reviewed together before mobile rollout.",
  "Release packaging and support readiness are part of app launch confidence.",
];
