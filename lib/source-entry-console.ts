export type SourceEntryLane = {
  title: string;
  owner: string;
  summary: string;
  status: "Ready" | "Needs real source";
  fields: string[];
  routes: string[];
};

export const sourceEntryConsoleSummary = {
  liveForms: 7,
  sourceFamilies: 8,
  currentPriority: "Index rosters, first trusted stock-set closes plus OHLCV, mutual-fund NAV, factsheet evidence, and metals history",
};

export const sourceEntryConsoleLanes: SourceEntryLane[] = [
  {
    title: "Index constituent roster entry",
    owner: "Research and market-data ops",
    summary:
      "Use this lane when official factsheets change and the public Nifty, Bank Nifty, Fin Nifty, or Sensex pages need a trusted roster and weight refresh.",
    status: "Ready",
    fields: ["Index slug", "Company name", "Symbol", "Weight %", "Daily move %", "Source date"],
    routes: ["/nifty50", "/banknifty", "/finnifty", "/sensex"],
  },
  {
    title: "Stock delayed-close entry",
    owner: "Market-data ops",
    summary:
      "Use this lane when completed stock pages need a trustworthy delayed close; this is now the active operator-managed fallback path instead of hardcoded code-side overrides.",
    status: "Ready",
    fields: ["Stock slug", "Company name", "Symbol", "Last close", "Daily move %", "Source date", "Source label"],
    routes: ["/stocks", "/stocks/tata-motors", "/stocks/reliance-industries", "/compare/stocks/tata-motors/reliance-industries"],
  },
  {
    title: "Stock OHLCV entry",
    owner: "Market-data ops",
    summary:
      "Use this lane when a first trusted stock route needs a source-backed delayed candlestick series and native chart render before the canonical provider feed is fully automated.",
    status: "Ready",
    fields: ["Stock slug", "Company name", "Symbol", "Timeframe", "Source date", "Source label", "OHLCV bars JSON"],
    routes: [
      "/stocks/tata-motors/chart",
      "/stocks/reliance-industries/chart",
      "/stocks/infosys/chart",
      "/stocks/tcs/chart",
    ],
  },
  {
    title: "Mutual fund NAV entry",
    owner: "Market-data ops and research",
    summary:
      "Use this lane when key mutual-fund pages need a trustworthy delayed NAV and return snapshot before the AMFI and factsheet pipeline is fully automated.",
    status: "Ready",
    fields: ["Fund slug", "Fund name", "Category", "Latest NAV", "1Y return %", "Source date", "Source label"],
    routes: ["/mutual-funds", "/mutual-funds/hdfc-mid-cap-opportunities", "/compare/mutual-funds/hdfc-mid-cap-opportunities/sbi-bluechip-fund"],
  },
  {
    title: "Mutual fund factsheet evidence entry",
    owner: "Fund research and ops",
    summary:
      "Use this lane when tracked fund pages need AMC-level factsheet evidence, document labels, and review dates before the full AMFI plus AMC document workflow is automated.",
    status: "Ready",
    fields: ["Fund slug", "Fund name", "AMC name", "Document label", "Source date", "Source label", "Optional reference URL"],
    routes: ["/mutual-funds/hdfc-mid-cap-opportunities", "/mutual-funds/sbi-bluechip-fund", "/admin/source-entry-console"],
  },
  {
    title: "Metals history entry",
    owner: "Tools and commodity ops",
    summary:
      "Use this lane for real gold and silver history rows so the commodity tools stop relying on local-only history and become visibly trustworthy.",
    status: "Needs real source",
    fields: ["Date", "XAU/XAG USD", "USDINR", "Derived landed rate", "Purity outputs", "Source label"],
    routes: ["/tools/gold-price-tracker", "/tools/silver-price-tracker", "/markets"],
  },
  {
    title: "Verified snapshot override",
    owner: "Admin and launch ops",
    summary:
      "Use this lane when a public route should be corrected immediately for launch or demo quality before the automated source path is fully hardened.",
    status: "Ready",
    fields: ["Route", "Field", "Current value", "Corrected value", "Reason", "Review date"],
    routes: ["/indices", "/stocks", "/mutual-funds", "/markets"],
  },
];

export const sourceEntryConsoleRules = [
  "Only official source rows or clearly labeled temporary overrides should flow into public market pages.",
  "If a roster, weight, or history series is not source-backed yet, the page should stay honest instead of looking fully verified.",
  "Every manual correction should include a route target, source date, and review owner so temporary launch fixes can be cleaned up later.",
];
