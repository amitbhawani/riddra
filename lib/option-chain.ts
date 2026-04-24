export const optionChainSummary = {
  currentMode: "Premium preview",
  derivativesFeed: "Not connected",
  nextActivation: "Verified OI source",
};

export const optionChainLayoutColumns = [
  {
    title: "Strike ladder",
    description: "ATM-to-OTM rows grouped by expiry once the derivatives source is connected cleanly.",
  },
  {
    title: "Call side",
    description: "Call LTP, OI, change in OI, volume, and IV once live chain payloads are verified.",
  },
  {
    title: "Put side",
    description: "Put LTP, OI, change in OI, volume, and IV for the same strike ladder and expiry view.",
  },
  {
    title: "Interpretation layer",
    description: "Support, resistance, writing, covering, PCR, and max-pain framing instead of raw rows alone.",
  },
];

export const optionChainRules = [
  "Option-chain interpretation should combine OI, change-in-OI, price context, and index sentiment instead of presenting raw numbers without guidance.",
  "The workstation version should later support strike clustering, expiry switching, and trader-friendly call-vs-put dominance views.",
  "Realtime derivatives promises should only follow once the source, refresh cadence, and licensing path are confirmed.",
];

export const optionAnalyticsCards = [
  {
    title: "PCR and breadth",
    description: "Use PCR as a positioning clue, then cross-check with whether OI is getting added on the put or call side while price is moving.",
  },
  {
    title: "Max-pain context",
    description: "Useful near expiry as a magnet zone, but only when read with gamma-heavy strikes and intraday volatility structure.",
  },
  {
    title: "Change-in-OI map",
    description: "Fresh call writing, short covering, put writing, and long unwinding should be readable without forcing users to decode raw tables alone.",
  },
];

export const optionWorkflowLanes = [
  "Expiry selection, strike clustering, and ATM-to-OTM navigation should feel fast enough for traders scanning multiple symbols.",
  "The chain should connect to chart, index mood, and scanner context so options are not read in isolation from underlying price action.",
  "Serious users will expect OI change, volume, IV, Greeks, PCR, and max-pain framing in one workflow rather than spread across separate tools.",
];
