export const crmOpsSummary = {
  activeSegments: 8,
  leadStages: 5,
  retainedJourneys: 6,
};

export const crmOpsItems = [
  {
    title: "Intent and lifecycle segments",
    status: "In progress",
    summary:
      "Visitors, signed-up users, portfolio builders, active traders, wealth users, and churn-risk subscribers should eventually move through structured CRM segments instead of generic mailing lists.",
  },
  {
    title: "Lead scoring and plan-readiness",
    status: "Queued",
    summary:
      "Pricing intent, watchlist depth, alert usage, tool usage, and course engagement should later feed into clear upgrade-readiness signals.",
  },
  {
    title: "Subscriber recovery and win-back",
    status: "Queued",
    summary:
      "Expired plans, inactive subscribers, and incomplete onboarding journeys should be recoverable through targeted CRM states rather than one-off campaigns.",
  },
  {
    title: "Operator-safe segmentation rules",
    status: "In progress",
    summary:
      "Segments should be editable by operators through controlled rules without letting campaign logic leak into core product code.",
  },
];

export const crmOpsRules = [
  "CRM segments should be driven by trusted product events and consent-aware user state rather than ad hoc exports.",
  "Lead scoring should help operators prioritize useful journeys, not create spam-heavy behavior.",
  "Growth operations should remain modular so provider changes do not break subscriber lifecycle logic.",
];
