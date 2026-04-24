export const blockEditorSummary = {
  editableBlocks: 12,
  sourceProtectedBlocks: 6,
  hybridBlocks: 4,
};

export const blockEditorSamples = [
  {
    asset: "Hero FinCorp IPO",
    block: "hero_summary",
    mode: "Editorial",
    note: "Manual company overview, issue framing, and decision-support copy should be editable without touching source-fed cards.",
  },
  {
    asset: "Tata Motors",
    block: "news_filings",
    mode: "Hybrid",
    note: "Editors should be able to pin or enrich important updates while keeping the feed-backed chronology separate.",
  },
  {
    asset: "HDFC Mid-Cap Opportunities",
    block: "fund_manager",
    mode: "Hybrid",
    note: "Fund-manager notes can be enriched manually, but benchmark and category context should stay tied to structured records.",
  },
];

export const blockEditorRules = [
  "Editors should only change the block they intend to update, not the whole page payload.",
  "Source-backed values must remain read-only in the editor unless an override workflow is explicitly started.",
  "Every publish action should create a revision entry and keep the previous block version available for rollback.",
];
