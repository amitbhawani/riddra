export const providerRolloutsSummary = {
  rolloutTracks: 5,
  stagedEnvironments: 4,
  rollbackWindows: 3,
};

export const providerRolloutItems = [
  {
    title: "Provider rollout staging",
    status: "In progress",
    summary:
      "Provider changes should move through local, preview, limited rollout, and production states instead of going live in one risky jump.",
  },
  {
    title: "Health checks before switching",
    status: "In progress",
    summary:
      "Auth, billing, communications, and broker-provider changes should later require health checks before the operator can promote them as primaries.",
  },
  {
    title: "Rollback timing windows",
    status: "Queued",
    summary:
      "Provider changes should eventually define rollback windows so the team knows when reversals are safe before state drift becomes expensive.",
  },
  {
    title: "Cross-provider audit memory",
    status: "Queued",
    summary:
      "Every rollout should eventually keep an audit trail of what changed, who promoted it, and which fallback path was armed at the time.",
  },
];

export const providerRolloutRules = [
  "Provider switching should be treated like staged operations, not a hidden settings flip.",
  "Every rollout should define health checks, rollback intent, and blast-radius awareness before promotion.",
  "If a rollout cannot be safely reversed, it should not be considered production-ready.",
];
