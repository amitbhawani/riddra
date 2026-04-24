export const watchlistSummary = {
  activeLists: 3,
  trackedAssets: 18,
  alertsAttached: 7,
};

export const watchlistSamples = [
  {
    title: "High-conviction stocks",
    count: "8 assets",
    note: "Long-term watchlist for core Indian stocks with follow-up alerts and chart shortcuts.",
  },
  {
    title: "IPO radar",
    count: "5 assets",
    note: "Upcoming and active IPOs tracked for GMP, subscription, allotment, and listing follow-up.",
  },
  {
    title: "Funds to compare",
    count: "5 assets",
    note: "Mutual funds grouped for return-table review, allocation checks, and eventual overlap analysis.",
  },
];

export const savedScreenSummary = {
  savedScreens: 4,
  repeatRuns: 2,
  sharedLayouts: 2,
};

export const savedScreenSamples = [
  {
    title: "Momentum shortlist",
    type: "Stock screener",
    note: "Repeatable stock scan for price strength, sector support, and chart follow-up.",
  },
  {
    title: "IPO quality filter",
    type: "IPO workflow",
    note: "Tracks issue size, GMP, lot size, and subscription momentum in one reusable view.",
  },
  {
    title: "Fund benchmark review",
    type: "Mutual fund compare",
    note: "Reusable workspace for category, benchmark, risk, and top-holdings review.",
  },
];

export const brokerConnectionSummary = {
  priorityBrokers: 2,
  plannedBrokers: 2,
  syncModes: 3,
};

export const brokerConnectionModes = [
  "CSV import remains the universal fallback when broker APIs are unavailable or mismatch confidence is low.",
  "Connected brokers should support periodic holdings refresh, mismatch review, and user approval before overwriting saved positions.",
  "Broker sync should stay provider-agnostic so Zerodha, ICICI Direct, and later brokers can plug into the same review pipeline.",
];
