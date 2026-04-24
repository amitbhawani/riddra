export type DocumentStatus = "Live" | "Review" | "Draft";

export type AdminDocumentItem = {
  title: string;
  asset: string;
  assetType: string;
  category: string;
  source: string;
  owner: string;
  updatedAt: string;
  status: DocumentStatus;
  note: string;
};

export const adminDocuments: AdminDocumentItem[] = [
  {
    title: "Hero Fincorp DRHP",
    asset: "Hero Fincorp IPO",
    assetType: "IPO page",
    category: "Prospectus",
    source: "SEBI filing",
    owner: "Admin",
    updatedAt: "April 12, 2026 • 6:25 PM IST",
    status: "Live",
    note: "Primary issue document that should remain pinned on the IPO page and future archive route.",
  },
  {
    title: "Tata Motors Annual Report 2025",
    asset: "Tata Motors",
    assetType: "Stock page",
    category: "Annual report",
    source: "Company filing",
    owner: "Staff Editor",
    updatedAt: "April 12, 2026 • 5:55 PM IST",
    status: "Review",
    note: "Useful for long-term research blocks, but metadata extraction and chapter links are still pending.",
  },
  {
    title: "HDFC Mid-Cap Opportunities Factsheet",
    asset: "HDFC Mid-Cap Opportunities Fund",
    assetType: "Mutual fund page",
    category: "Factsheet",
    source: "AMC website",
    owner: "Staff Editor",
    updatedAt: "April 12, 2026 • 5:10 PM IST",
    status: "Draft",
    note: "Should become part of the fund document set once upload tagging and version rules are finalized.",
  },
];

export const documentOpsRules = [
  "Every uploaded document should belong to a specific asset and category so it can be reused across stock, IPO, fund, and archive pages.",
  "Primary-source documents should be distinguished from internal notes or editorial attachments.",
  "Document metadata should eventually support versioning, extracted summaries, and direct linking into page blocks.",
];

export function getDocumentTone(status: DocumentStatus) {
  if (status === "Live") return "bg-aurora/12 text-aurora";
  if (status === "Review") return "bg-sky/12 text-sky";
  return "bg-white/10 text-white";
}
