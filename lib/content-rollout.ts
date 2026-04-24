export type ContentRolloutItem = {
  routeFamily: string;
  currentMode: "Fallback-first" | "DB-first with fallback" | "DB-ready";
  backingTables: string[];
  nextStep: string;
};

export const contentRolloutItems: ContentRolloutItem[] = [
  {
    routeFamily: "Stocks",
    currentMode: "DB-first with fallback",
    backingTables: ["instruments", "companies", "stock_pages", "content_sections"],
    nextStep: "Connect real seeded records, then add editable block workflows for fundamentals, filings, and page overrides.",
  },
  {
    routeFamily: "IPOs and SME IPOs",
    currentMode: "DB-first with fallback",
    backingTables: ["ipos", "ipo_pages", "content_sections"],
    nextStep: "Wire real IPO records, then automate lifecycle changes from IPO mode into listed-stock mode.",
  },
  {
    routeFamily: "Mutual Funds",
    currentMode: "DB-first with fallback",
    backingTables: ["mutual_funds", "mutual_fund_pages", "content_sections"],
    nextStep: "Connect seeded fund records, then expand category depth and holdings-driven content blocks.",
  },
  {
    routeFamily: "Index trackers",
    currentMode: "DB-ready",
    backingTables: ["tracked_indexes", "index_component_weights", "index_tracker_snapshots", "index_component_snapshots"],
    nextStep: "Activate real snapshot writes once the data-source and refresh pipeline are finalized.",
  },
  {
    routeFamily: "Portfolio",
    currentMode: "DB-ready",
    backingTables: ["portfolios", "portfolio_holdings", "portfolio_import_runs", "broker_connections"],
    nextStep: "Move import-review and manual-entry flows from UI-only previews into real persisted writes after Supabase activation.",
  },
  {
    routeFamily: "Account and entitlements",
    currentMode: "DB-first with fallback",
    backingTables: ["profiles", "subscriptions", "entitlements"],
    nextStep: "Read real subscription and entitlement records after auth activation and initial plan mapping.",
  },
];
