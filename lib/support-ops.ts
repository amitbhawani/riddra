export const supportOpsSummary = {
  helpFamilies: 5,
  supportQueues: 4,
  successJourneys: 6,
};

export const supportOpsItems = [
  {
    title: "Help center and support content",
    status: "In progress",
    summary:
      "Help articles, onboarding guides, billing explanations, and portfolio troubleshooting should become a reusable support layer instead of staying hidden across product pages.",
  },
  {
    title: "Issue triage queues",
    status: "Queued",
    summary:
      "Portfolio mismatches, billing confusion, login issues, and source-data complaints should later route into structured support queues with clear ownership.",
  },
  {
    title: "Subscriber success interventions",
    status: "Queued",
    summary:
      "Incomplete onboarding, unused premium features, and failed imports should trigger guided recovery or success workflows before churn sets in.",
  },
  {
    title: "Operator-facing support rules",
    status: "In progress",
    summary:
      "Support operations should live behind clear policies for escalation, rollback, customer messaging, and auditability rather than informal fixes.",
  },
];

export const supportOpsRules = [
  "Support should be treated as a first-class operating system, not an afterthought after growth starts.",
  "Help surfaces should reduce confusion before tickets are needed.",
  "Every manual support action should remain auditable and reversible when it affects user state.",
];
