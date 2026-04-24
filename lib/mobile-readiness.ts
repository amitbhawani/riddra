export const mobileReadinessSummary = {
  appSurfaces: 5,
  pushContracts: 4,
  syncPriorities: 6,
};

export const mobileReadinessTracks = [
  {
    title: "Account and alert contracts",
    status: "In progress",
    summary:
      "Account identity, alert preferences, inbox items, and notification readiness should later expose stable mobile-friendly contracts instead of relying on web-only assumptions.",
  },
  {
    title: "Portfolio and watchlist sync",
    status: "In progress",
    summary:
      "Portfolio review, watchlists, saved screens, and broker-linked actions should later be reusable across iOS and Android without redesigning the product model.",
  },
  {
    title: "Offline-safe content layers",
    status: "Queued",
    summary:
      "Learn, courses, newsletters, and saved market views should later have a mobile-aware caching and offline strategy for repeat-use workflows.",
  },
  {
    title: "Push and journey triggers",
    status: "Queued",
    summary:
      "Alerts, lifecycle campaigns, user-success nudges, and learning reminders should later connect to push-ready delivery rules instead of assuming email or WhatsApp only.",
  },
];

export const mobileReadinessRules = [
  "Mobile readiness should reuse the same product contracts instead of cloning web behavior page by page.",
  "Push is part of the lifecycle system, not a separate notification toy.",
  "Saved user context should move cleanly between web and app experiences.",
];
