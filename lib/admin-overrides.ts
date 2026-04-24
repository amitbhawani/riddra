export type OverrideSeverity = "Critical" | "Review" | "Stable";

export type OverrideItem = {
  asset: string;
  assetType: string;
  field: string;
  value: string;
  sourceStatus: string;
  owner: string;
  updatedAt: string;
  expiresAt: string;
  severity: OverrideSeverity;
  note: string;
};

export const overrideItems: OverrideItem[] = [
  {
    asset: "Hero Fincorp IPO",
    assetType: "IPO page",
    field: "Grey market premium note",
    value: "₹118 indicative placeholder",
    sourceStatus: "Unofficial signal only",
    owner: "Admin",
    updatedAt: "April 12, 2026 • 6:10 PM IST",
    expiresAt: "Review when official issue window opens",
    severity: "Review",
    note: "Keep it clearly separated from official filing-backed fields and remove once a stricter policy is finalized.",
  },
  {
    asset: "Tata Motors",
    assetType: "Stock page",
    field: "Hero summary",
    value: "Manual editorial override active",
    sourceStatus: "Editorial block",
    owner: "Staff Editor",
    updatedAt: "April 12, 2026 • 5:40 PM IST",
    expiresAt: "No expiry",
    severity: "Stable",
    note: "This is a valid long-term editorial override and should stay independent of source-fed market data.",
  },
  {
    asset: "Nifty50",
    assetType: "Index tracker",
    field: "Sentiment label copy",
    value: "Bullish breadth with financials leadership",
    sourceStatus: "Needs live-feed validation",
    owner: "Staff Editor",
    updatedAt: "April 12, 2026 • 4:55 PM IST",
    expiresAt: "Next live-feed connection",
    severity: "Critical",
    note: "Once realtime component refresh is connected, this wording should come from the tracker engine instead of a manual phrase.",
  },
];

export const overrideRules = [
  "Manual overrides should be field-level, not whole-page switches, so source-fed data and editorial content remain clearly separated.",
  "Every override should carry owner, timestamp, reason, expiry or review date, and a rollback path.",
  "Critical overrides should surface first so staff can clear temporary patches as soon as source systems recover.",
];

export function getOverrideTone(severity: OverrideSeverity) {
  if (severity === "Critical") return "bg-flare/12 text-flare";
  if (severity === "Review") return "bg-sky/12 text-sky";
  return "bg-aurora/12 text-aurora";
}
