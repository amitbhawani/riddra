export const scannerPresetSummary = {
  livePresets: 5,
  intradayStacks: 3,
  shareableViews: 2,
};

export const scannerPresetRows = [
  {
    title: "Breakout continuation",
    type: "Intraday",
    note: "Combines price strength, volume expansion, and sector context for fast-moving setups.",
  },
  {
    title: "Bullish index support",
    type: "Index-linked",
    note: "Cross-checks stock strength with Nifty or BankNifty breadth and weighted sentiment.",
  },
  {
    title: "IPO momentum shortlist",
    type: "Event-led",
    note: "Tracks GMP, subscription pace, and listing readiness in one reusable workflow.",
  },
];

export const scannerPresetRules = [
  "Presets should be saved workflows with clear logic and repeatability, not one-off filter piles.",
  "Scanner presets should later connect to alerts, watchlists, and trader-workstation memory so users can act on them without rebuilding the setup.",
  "Public views can educate, but serious scanner execution should eventually live inside premium workstation flows.",
];
