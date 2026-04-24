export const lifecycleCampaignsSummary = {
  journeyFamilies: 6,
  activeMoments: 8,
  recoveryLoops: 4,
};

export const lifecycleCampaignItems = [
  {
    title: "Signup and onboarding journeys",
    status: "In progress",
    summary:
      "New users should later receive guided paths based on whether they care most about stocks, IPOs, trading, portfolio tracking, or wealth planning.",
  },
  {
    title: "Retention and habit loops",
    status: "In progress",
    summary:
      "Daily market briefs, watchlist reminders, portfolio nudges, and webinar/course reminders should become structured lifecycle journeys rather than isolated notifications.",
  },
  {
    title: "Upgrade and value-reveal journeys",
    status: "Queued",
    summary:
      "Starter-to-Pro and Pro-to-Elite upgrade prompts should later be tied to real usage signals and feature discovery, not only generic pricing pushes.",
  },
  {
    title: "Churn prevention and win-back",
    status: "Queued",
    summary:
      "Inactive or downgraded users should later move through recovery journeys tied to alerts, saved workspaces, and content value instead of blind remarketing.",
  },
  {
    title: "Portfolio trust recovery",
    status: "In progress",
    summary:
      "Failed imports, mismatch reviews, and broker conflicts should trigger reassurance, re-verification, and success follow-up instead of leaving the user stranded.",
  },
];

export const lifecycleCampaignRules = [
  "Lifecycle journeys should respect consent, plan state, and real user intent before sending anything.",
  "The platform should favor helpful timing and context over campaign volume.",
  "Every journey should eventually map to a measurable user outcome such as activation, retention, recovery, or upgrade readiness.",
];
