export const pushReadinessSummary = {
  channelModes: 4,
  triggerFamilies: 6,
  permissionLayers: 3,
};

export const pushReadinessItems = [
  {
    title: "Alert and portfolio triggers",
    status: "In progress",
    summary:
      "Market alerts, portfolio changes, broker exceptions, and watchlist events should later reuse one push-safe trigger model instead of fragmenting across separate notification systems.",
  },
  {
    title: "Lifecycle and learning reminders",
    status: "In progress",
    summary:
      "Onboarding nudges, course reminders, webinar follow-ups, and mentorship touchpoints should later fit into the same mobile-ready notification stack with consent-aware timing.",
  },
  {
    title: "Permission-aware delivery",
    status: "Queued",
    summary:
      "Push preferences, consent state, user success journeys, and alert-criticality should later determine what can be sent and when it should stay quiet.",
  },
  {
    title: "App-entry routing",
    status: "Queued",
    summary:
      "Push actions should later know whether to open alerts, portfolio review, learning content, or support-recovery paths instead of dumping users into generic landing states.",
  },
];

export const pushReadinessRules = [
  "Push should extend the lifecycle system, not bypass it.",
  "Permission logic should be part of trigger design before delivery is switched on.",
  "A mobile notification should know where it wants the user to land next.",
];
