export const mobileJourneySummary = {
  entryJourneys: 5,
  savedContexts: 6,
  handoffStates: 4,
};

export const mobileJourneyItems = [
  {
    title: "Deep-link destination mapping",
    status: "In progress",
    summary:
      "Alerts, watchlists, portfolio exceptions, mentorship reminders, and support recovery should later know which in-app destination they want to open instead of dumping users into generic mobile states.",
  },
  {
    title: "Saved-state continuity",
    status: "In progress",
    summary:
      "Charts, watchlists, screeners, inbox items, and learning progress should later carry the same user context across web and mobile sessions without feeling reset.",
  },
  {
    title: "Cross-channel handoff rules",
    status: "Queued",
    summary:
      "Email, WhatsApp, push, and in-app journeys should later share routing rules so user intent survives across channels instead of fragmenting into separate funnels.",
  },
  {
    title: "Mobile-first recovery entry",
    status: "Queued",
    summary:
      "Portfolio mismatch review, billing recovery, and support escalation flows should later have mobile entry states that preserve urgency without losing clarity.",
  },
];

export const mobileJourneyRules = [
  "A mobile notification should know both its destination and its user intent.",
  "Saved state is part of product trust when users move between web and app.",
  "Channel handoff should feel continuous, not like separate products stapled together.",
];
