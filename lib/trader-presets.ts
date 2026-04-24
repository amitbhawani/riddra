export const traderPresetSummary = {
  activePresets: 5,
  alertPresets: 3,
  workflowModes: 4,
};

export const traderPresetRows = [
  {
    title: "Index momentum pack",
    note: "Combines Nifty or BankNifty sentiment checks, index replay links, and option-chain follow-up in one repeatable flow.",
  },
  {
    title: "Breakout with confirmation",
    note: "Pairs scanner shortlist, chart layout, and alert rules so traders can move from discovery to execution without rebuilding the flow.",
  },
  {
    title: "Expiry-week defense",
    note: "Reserved preset for high-volatility sessions where option-chain dominance and index breadth both matter.",
  },
];

export const traderPresetRules = [
  "Trader presets should connect charts, scanners, option-chain reads, and alerts into one saved workflow.",
  "Presets should stay feature-based so future entitlements can unlock advanced workflows without splitting the product into disconnected pages.",
  "High-signal preset alerts should later route into inbox, WhatsApp, email, or push without creating separate logic for each channel.",
];
