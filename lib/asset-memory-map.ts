export const assetMemorySummary = {
  trackedFamilies: 5,
  memoryChains: 9,
  continuityModes: 4,
};

export const assetMemoryFamilies = [
  {
    title: "Listed stocks",
    continuity: "Results, corporate actions, filings, ownership shifts, chart context, and research updates should accumulate into one long-lived memory chain.",
    anchor: "/stocks/tata-motors",
  },
  {
    title: "IPO and SME IPOs",
    continuity: "Issue discovery, subscription, allotment, listing, and post-listing handoff should stay preserved as event history instead of vanishing after listing day.",
    anchor: "/ipo",
  },
  {
    title: "Mutual funds",
    continuity: "NAV refreshes, manager commentary, category drift, benchmark context, and suitability changes should form a durable investor memory layer.",
    anchor: "/mutual-funds",
  },
  {
    title: "Wealth products",
    continuity: "ETF, PMS, AIF, and SIF pages should preserve strategy updates, holdings commentary, lock-in/cost changes, and compare notes over time.",
    anchor: "/wealth",
  },
  {
    title: "Learning and creator assets",
    continuity: "Courses, webinars, mentorship, newsletters, and replay chains should preserve what was taught, where it was reused, and what the next step is.",
    anchor: "/learn",
  },
];

export const assetMemoryRules = [
  "Every archive-worthy update should tie back to an asset family and a canonical asset or learning entity.",
  "Asset memory should help users understand what changed, why it mattered, and where to continue next.",
  "Public pages should become stronger over time because memory accumulates, not because old context is silently replaced.",
];
