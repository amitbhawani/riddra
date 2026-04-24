export const replayMemorySummary = {
  replayChains: 5,
  distributionLoops: 4,
  archiveLinkedAssets: 7,
};

export const replayMemoryChains = [
  {
    title: "IPO workshop replay chain",
    source: "Live IPO analysis session",
    continuity: "Replay clip -> IPO article updates -> issue page -> allotment reminders -> archive note",
    status: "In progress",
  },
  {
    title: "Chart bootcamp replay chain",
    source: "Trader chart-reading webinar",
    continuity: "Replay snippets -> learn recap -> charts onboarding -> workstation presets -> newsletter recap",
    status: "In progress",
  },
  {
    title: "Fund clinic continuity chain",
    source: "Mutual fund selection clinic",
    continuity: "Replay asset -> fund compare guide -> category page links -> investor digest -> archive commentary",
    status: "In progress",
  },
  {
    title: "Mentor cohort memory chain",
    source: "Guided cohort sessions and office hours",
    continuity: "Assignments -> replays -> community notes -> support handoff -> progression memory",
    status: "Planned",
  },
];

export const replayMemoryRules = [
  "Every major webinar or guided session should create a replay chain instead of ending as a one-time event.",
  "Replay assets should feed newsletter, learn, archive, and product-surface continuity wherever possible.",
  "Archive memory should preserve what was taught, what changed, and where the user should continue next.",
];
