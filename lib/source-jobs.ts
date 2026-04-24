export const sourceJobSummary = {
  activeAdapters: 5,
  plannedJobs: 7,
  blockedFeeds: 1,
};

export const sourceJobSamples = [
  {
    adapter: "nse_equity_snapshot",
    domain: "stocks",
    cadence: "End of day",
    status: "In progress",
    nextStep: "Provider sync and verified ingestion are now ready; the next step is connecting a legitimate upstream payload for Tata Motors and the first stock set.",
  },
  {
    adapter: "amfi_nav_refresh",
    domain: "mutual_funds",
    cadence: "Daily",
    status: "Planned",
    nextStep: "Bring NAV and category refresh into the same asset registry instead of page-only data loading.",
  },
  {
    adapter: "ipo_document_ingest",
    domain: "ipo",
    cadence: "Event-based",
    status: "In progress",
    nextStep: "Combine manual uploads with official issue-document references and lifecycle metadata.",
  },
  {
    adapter: "index_snapshot_refresh",
    domain: "indices",
    cadence: "Intraday-ready",
    status: "In progress",
    nextStep: "Persisted index tracker ingestion is ready; the next step is feeding Nifty 50, Sensex, Bank Nifty, and Fin Nifty snapshots into the verified sync path.",
  },
  {
    adapter: "provider_sync_bridge",
    domain: "shared_market_data",
    cadence: "Cron or signed manual run",
    status: "In progress",
    nextStep: "Use the sample payload contract and `/api/admin/market-data/provider-sync` to hook one normalized upstream provider into quotes, OHLCV, and tracked indexes.",
  },
];

export const sourceJobRules = [
  "Every adapter should declare source, cadence, target tables, fallback behavior, and override expectations before it becomes a production promise.",
  "Ingest jobs should write into canonical and historical tables first, then let public pages and subscriber tools consume derived views.",
  "Blocked or expensive feeds should remain visible in the ops layer so roadmap decisions stay honest.",
  "Provider integrations should first prove their payload against `/api/admin/market-data/sample-payload` before they are trusted for scheduled production sync.",
];
