export const publishingCalendarSummary = {
  scheduledToday: 5,
  highPriority: 2,
  releaseWindows: 3,
};

export const publishingCalendarItems = [
  {
    title: "Tata Motors results commentary refresh",
    assetRef: "stock:tata-motors",
    publishWindow: "Apr 13, 2026 • 6:30 PM",
    priority: "High",
    owner: "editor@riddra.com",
    note: "Used to model how event-led stock commentary should be queued before a live results update cycle.",
  },
  {
    title: "Hero Fincorp IPO listing watch note",
    assetRef: "ipo:hero-fincorp",
    publishWindow: "Apr 14, 2026 • 8:00 AM",
    priority: "High",
    owner: "newsdesk@riddra.com",
    note: "Illustrates time-sensitive IPO lifecycle publishing before listing transition logic is fully automated.",
  },
  {
    title: "HDFC Mid Cap fund review refresh",
    assetRef: "mutual_fund:hdfc-mid-cap-opportunities",
    publishWindow: "Apr 15, 2026 • 11:00 AM",
    priority: "Normal",
    owner: "funds@riddra.com",
    note: "Evergreen investor pages should also use scheduled refreshes, not only breaking-event workflows.",
  },
];

export const publishingReleaseRules = [
  "Scheduled publishing should work across route families, not just in learn or blog-style content.",
  "Release windows should eventually support event-based publishing for results, IPO milestones, fund updates, and major company announcements.",
  "Publishing calendar, workflow states, revisions, and overrides should all connect so staff can understand what is live, what is queued, and what is blocked.",
];
