export const rollbackSummary = {
  rollbackReadyAssets: 8,
  highRiskChanges: 2,
  archivedVersions: 24,
};

export const rollbackSamples = [
  {
    asset: "Hero FinCorp IPO",
    change: "Issue review and GMP explanation updated",
    fallback: "Restore previous editorial block version",
    risk: "Medium",
  },
  {
    asset: "Tata Motors",
    change: "Pinned filings summary adjusted for homepage cross-linking",
    fallback: "Revert block content and re-run announcement sync",
    risk: "Low",
  },
  {
    asset: "Nifty50",
    change: "Sentiment wording override modified intraday",
    fallback: "Return to source-backed sentiment description",
    risk: "High",
  },
];

export const rollbackRules = [
  "Rollback should restore the prior revision without deleting the newer one from audit history.",
  "Source-fed fields should support return-to-source actions separately from editorial block rollback.",
  "High-risk changes should require explicit reason tracking before publish and before rollback.",
];
