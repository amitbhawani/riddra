export type FiiDiiParticipantRow = {
  participant: string;
  buyValue: string;
  sellValue: string;
  netValue: string;
  status: string;
};

export const fiiDiiReport = {
  sourceLabel: "NSE FII / DII activity report",
  sourceUrl: "https://www.nseindia.com/reports/fii-dii",
  syncMode: "Source-inspired preview",
  lastSyncLabel: "Verified source sync pending",
  reportCoverage: "NSE-exclusive and combined exchange activity layout",
  nseExclusiveRows: [
    {
      participant: "FII / FPI",
      buyValue: "--",
      sellValue: "--",
      netValue: "--",
      status: "Waiting for verified NSE pull",
    },
    {
      participant: "DII",
      buyValue: "--",
      sellValue: "--",
      netValue: "--",
      status: "Waiting for verified NSE pull",
    },
  ] satisfies FiiDiiParticipantRow[],
  combinedExchangeRows: [
    {
      participant: "FII / FPI",
      buyValue: "--",
      sellValue: "--",
      netValue: "--",
      status: "Combined exchange sync pending",
    },
    {
      participant: "DII",
      buyValue: "--",
      sellValue: "--",
      netValue: "--",
      status: "Combined exchange sync pending",
    },
  ] satisfies FiiDiiParticipantRow[],
  notes: [
    "NSE publishes both NSE-exclusive and combined exchange institutional activity views for the capital-market segment.",
    "FII / FPI figures are provisional and can change after custodial confirmation and expiry-day obligations are finalized.",
    "DII figures depend on member-side client category classification, so this page should stay explicit about sync timing and verification status.",
  ],
  workflow: [
    "Use this route as the public explanation layer for institutional flow instead of burying FII / DII context in stock-only pages.",
    "Keep the source reference visible so operators know the intended benchmark and users understand why values may lag until a verified pull exists.",
    "Upgrade this page from preview to live only after verified NSE or operator-backed ingestion is wired into the source-entry flow.",
  ],
};
