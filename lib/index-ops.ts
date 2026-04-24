export type IndexOpsCard = {
  slug: string;
  title: string;
  sourceCode: string;
  refreshTarget: string;
  publicLayer: string;
  premiumLayer: string;
  status: string;
  nextMilestone: string;
};

export const indexOpsCards: IndexOpsCard[] = [
  {
    slug: "nifty50",
    title: "Nifty 50",
    sourceCode: "nse_index",
    refreshTarget: "15s snapshot target after licensed feed approval",
    publicLayer: "Delayed mood, pullers, draggers, recent tracker rhythm",
    premiumLayer: "Near-live breadth, archive replay, alerting, AI explanation",
    status: "Architecture ready",
    nextMilestone: "Persist snapshot history and connect official refresh pipeline",
  },
  {
    slug: "banknifty",
    title: "Bank Nifty",
    sourceCode: "nse_bank_index",
    refreshTarget: "15s snapshot target after licensed feed approval",
    publicLayer: "Delayed breadth and key bank contribution view",
    premiumLayer: "Intraday ranked movers, alerting, archive replay",
    status: "Architecture ready",
    nextMilestone: "Add banking-session history storage and refresh monitoring",
  },
  {
    slug: "finnifty",
    title: "Fin Nifty",
    sourceCode: "nse_financial_services_index",
    refreshTarget: "15s snapshot target after licensed feed approval",
    publicLayer: "Delayed financial-services sentiment tracker",
    premiumLayer: "Near-live breadth, insurer/NBFC depth, AI summaries",
    status: "Architecture ready",
    nextMilestone: "Expand component coverage and time-series capture",
  },
  {
    slug: "sensex",
    title: "Sensex",
    sourceCode: "bse_sensex",
    refreshTarget: "15s snapshot target after licensed feed approval",
    publicLayer: "Delayed broad-market mood and dragger/puller view",
    premiumLayer: "Near-live tracker history and heavyweight alerts",
    status: "Architecture ready",
    nextMilestone: "Mirror BSE refresh behavior and historical archive model",
  },
];

export const indexPipelineSteps = [
  "Official source entitlement and commercial usage confirmation",
  "Component-weight sync for each tracked index",
  "Snapshot ingestion every refresh cycle with write deduplication",
  "Component contribution persistence for every stored snapshot",
  "Public delayed cache and premium intraday access layer",
  "Run monitoring for failed refreshes and stale data detection",
];
