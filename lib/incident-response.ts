export const incidentResponseSummary = {
  responseLanes: 4,
  incidentClasses: 6,
  escalationWindows: 5,
};

export const incidentResponseItems = [
  {
    title: "Runtime and source incidents",
    status: "In progress",
    summary:
      "Route failures, broken source jobs, chart/data issues, and notification delivery problems should later move through a clear incident lane instead of informal ad hoc debugging.",
  },
  {
    title: "Trust and revenue incidents",
    status: "In progress",
    summary:
      "Billing exceptions, entitlement drift, portfolio mismatches, and high-severity support escalations should eventually share a faster, more visible trust-repair workflow.",
  },
  {
    title: "Rollback and communication response",
    status: "Queued",
    summary:
      "Major incidents should later connect rollback decisions, operator ownership, and user-facing status communication instead of relying on memory under pressure.",
  },
  {
    title: "Post-incident learning loop",
    status: "Queued",
    summary:
      "The platform should eventually preserve what failed, how it was contained, and what changed after the fact so reliability improves instead of repeating the same issues.",
  },
];

export const incidentResponseRules = [
  "An incident lane should reduce ambiguity, not create another dashboard nobody uses.",
  "Revenue, trust, and source failures should be visible quickly enough to contain user impact.",
  "Rollback, communication, and follow-up learning should be part of the same response system.",
];
