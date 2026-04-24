export type PortfolioHolding = {
  symbol: string;
  assetName: string;
  quantity: string;
  avgCost: string;
  currentPrice: string;
  marketValue: string;
  pnl: string;
  weight: string;
};

export type BrokerOption = {
  brokerName: string;
  status: "Planned" | "Priority" | "Later";
  note: string;
};

export type PortfolioValidationItem = {
  check: string;
  aiRole: string;
  userFeedback: string;
};

export type NotificationChannel = {
  channel: string;
  status: "Now" | "Prepared" | "Later";
  note: string;
};

export type PortfolioImportReviewItem = {
  importedValue: string;
  suggestedMatch: string;
  issue: string;
  action: string;
};

export type ManualPortfolioField = {
  label: string;
  placeholder: string;
  note: string;
};

export const samplePortfolioHoldings: PortfolioHolding[] = [
  {
    symbol: "TATAMOTORS",
    assetName: "Tata Motors",
    quantity: "120",
    avgCost: "₹925.40",
    currentPrice: "₹948.20",
    marketValue: "₹1,13,784",
    pnl: "+₹2,736",
    weight: "34.8%",
  },
  {
    symbol: "RELIANCE",
    assetName: "Reliance Industries",
    quantity: "24",
    avgCost: "₹2,921.00",
    currentPrice: "₹2,987.50",
    marketValue: "₹71,700",
    pnl: "+₹1,596",
    weight: "21.9%",
  },
  {
    symbol: "HDFCBANK",
    assetName: "HDFC Bank",
    quantity: "40",
    avgCost: "₹1,612.25",
    currentPrice: "₹1,645.10",
    marketValue: "₹65,804",
    pnl: "+₹1,314",
    weight: "20.1%",
  },
];

export const csvImportSteps = [
  "Upload CSV from broker export, Google Finance, or a manually maintained sheet.",
  "Map symbol, quantity, average price, and transaction columns intelligently.",
  "Match instruments to Riddra records and flag unresolved symbols for review.",
  "Create a persistent portfolio tied to the user profile and subscription entitlements.",
];

export const portfolioValidationChecks: PortfolioValidationItem[] = [
  {
    check: "Symbol and instrument matching",
    aiRole: "Normalize ticker names, broker codes, and common CSV quirks into canonical Riddra instrument records.",
    userFeedback: "Ask the user to confirm anything unmatched or ambiguous before the portfolio is finalized.",
  },
  {
    check: "Quantity and average-cost sanity",
    aiRole: "Detect impossible or suspicious quantities, decimals, or cost values and compare them to the imported broker pattern.",
    userFeedback: "Prompt the user to recheck with broker or demat records when the imported values look inconsistent.",
  },
  {
    check: "Duplicate and mismatch detection",
    aiRole: "Flag repeated holdings, merged rows, or inconsistent symbols that appear to represent the same asset.",
    userFeedback: "Show a review queue so the user can accept, merge, or reject suspicious matches.",
  },
  {
    check: "Portfolio change audit",
    aiRole: "Compare the new import with the last saved portfolio and summarize what changed rather than silently overwriting data.",
    userFeedback: "Present adds, exits, quantity changes, and price changes before saving.",
  },
];

export const notificationChannels: NotificationChannel[] = [
  {
    channel: "Email newsletters",
    status: "Prepared",
    note: "The backend should be ready for digest campaigns, product updates, and alert summaries once a provider is connected.",
  },
  {
    channel: "WhatsApp alerts",
    status: "Prepared",
    note: "Useful for high-intent alerts like IPO dates, portfolio mismatch reminders, and important market notifications.",
  },
  {
    channel: "SMS alerts",
    status: "Prepared",
    note: "Good fallback for urgent short alerts, but should be used selectively due to cost and signal quality.",
  },
  {
    channel: "App push notifications",
    status: "Later",
    note: "Should align with future iOS and Android apps while sharing the same notification-preference backend.",
  },
];

export const importReviewItems: PortfolioImportReviewItem[] = [
  {
    importedValue: "TATA MOTR",
    suggestedMatch: "Tata Motors / TATAMOTORS",
    issue: "Ticker text appears truncated in the uploaded file.",
    action: "Ask user to confirm the suggested match before saving.",
  },
  {
    importedValue: "HDFC Bk",
    suggestedMatch: "HDFC Bank / HDFCBANK",
    issue: "Broker shorthand does not match the canonical instrument name directly.",
    action: "Show a review queue item with one-click accept or manual correction.",
  },
  {
    importedValue: "Qty 400 @ ₹0",
    suggestedMatch: "Needs broker verification",
    issue: "Average price appears invalid or missing for the imported row.",
    action: "Prompt user to recheck against broker contract note or demat statement.",
  },
];

export const manualPortfolioFields: ManualPortfolioField[] = [
  {
    label: "Stock or instrument",
    placeholder: "Search Tata Motors, Reliance, HDFC Bank...",
    note: "This should eventually use the same canonical search and symbol-matching engine as CSV import review.",
  },
  {
    label: "Quantity",
    placeholder: "120",
    note: "The entry should validate decimal/whole-number rules based on the asset type.",
  },
  {
    label: "Average buy price",
    placeholder: "925.40",
    note: "Used for P&L and position-review flows later.",
  },
  {
    label: "Portfolio tag",
    placeholder: "Long term, swing, family account...",
    note: "Lets users organize multiple portfolios or strategies under one account in the future.",
  },
];

export const brokerOptions: BrokerOption[] = [
  {
    brokerName: "Zerodha",
    status: "Priority",
    note: "Strong fit for retail traders and the first broker-connectivity candidate.",
  },
  {
    brokerName: "ICICI Direct",
    status: "Priority",
    note: "Important for full-service investor workflows and long-term portfolio users.",
  },
  {
    brokerName: "Upstox",
    status: "Planned",
    note: "Useful once the import pipeline and account linking model are stable.",
  },
  {
    brokerName: "Groww",
    status: "Later",
    note: "Good future addition once the initial brokerage connectivity path is proven.",
  },
];

export const portfolioFeatureRows = [
  {
    feature: "CSV import",
    publicLayer: "Product page and workflow education",
    paidLayer: "Guided import and saved portfolio access",
  },
  {
    feature: "Broker connectivity",
    publicLayer: "Availability visibility",
    paidLayer: "Connected portfolio sync",
  },
  {
    feature: "Holdings analytics",
    publicLayer: "Sample views",
    paidLayer: "Live position and P&L analysis",
  },
  {
    feature: "AI portfolio summaries",
    publicLayer: "Future roadmap visibility",
    paidLayer: "Subscriber insight layer",
  },
];
