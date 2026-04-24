export const indexReplaySummary = {
  trackedIndexes: 4,
  replayViews: 3,
  sessionModes: 3,
};

export const indexReplayRows = [
  {
    title: "Opening hour replay",
    note: "Review how weighted breadth, pullers, and draggers evolved during the first hour instead of relying on end-of-day memory.",
  },
  {
    title: "Trend-shift replay",
    note: "Study the moment an index moved from bearish to bullish tone, or the reverse, with contribution context intact.",
  },
  {
    title: "Expiry-day review",
    note: "Combine index mood, option-chain concentration, and intraday trend labels to understand high-volatility sessions later.",
  },
];

export const indexReplayRules = [
  "Replay should explain how the index got there, not just what the final close looked like.",
  "Weighted breadth, top pullers, and top draggers should remain visible in archive mode so users can learn from session structure.",
  "Once real snapshots are connected, replay should read from stored tracker history rather than editorial approximations.",
];
