export const journeyGovernanceSummary = {
  governedJourneys: 6,
  handoffLayers: 5,
  reviewCycles: 4,
};

export const journeyGovernanceItems = [
  {
    title: "Support-to-success handoff",
    status: "Complete",
    summary:
      "Support incidents should resolve into structured user-success follow-up instead of ending as isolated tickets with no downstream recovery path.",
  },
  {
    title: "Campaign-to-outcome review",
    status: "Complete",
    summary:
      "Lifecycle campaigns should now be judged against activation, retention, and trust-repair outcomes rather than only delivery or open rates.",
  },
  {
    title: "Consent-aware journey governance",
    status: "Complete",
    summary:
      "Growth, support, and recovery workflows should stay inside a shared governance layer so messaging permissions and sensitive states remain aligned.",
  },
  {
    title: "Recovery escalation policy",
    status: "In progress",
    summary:
      "High-risk billing, broker, and portfolio failures should later escalate through more explicit recovery policies before they become reputation damage.",
  },
];

export const journeyGovernanceRules = [
  "Every lifecycle journey should have a clear owner, success signal, and next-step path.",
  "Support, growth, and trust-repair systems should connect through governed handoffs instead of parallel silos.",
  "Journeys that affect billing, brokers, or portfolios should bias toward explainability and recovery clarity over automation volume.",
];
