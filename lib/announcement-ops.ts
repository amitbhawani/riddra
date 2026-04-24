export const announcementSummary = {
  totalTracked: 6,
  readyToPublish: 2,
  awaitingReview: 3,
};

export const announcementSamples = [
  {
    headline: "Tata Motors quarterly results preview",
    assetRef: "stock:tata-motors",
    announcementType: "results",
    workflowState: "review",
    sourceLabel: "Editorial desk",
    importance: "High",
    note: "Manual preview note that should later sit alongside exchange-led result updates and company filings.",
  },
  {
    headline: "Hero Fincorp listing-status update",
    assetRef: "ipo:hero-fincorp",
    announcementType: "listing",
    workflowState: "draft",
    sourceLabel: "Editorial desk",
    importance: "High",
    note: "Shows how IPO lifecycle announcements can be manually published before automation is fully live.",
  },
  {
    headline: "HDFC Mid Cap fund manager commentary refresh",
    assetRef: "mutual_fund:hdfc-mid-cap-opportunities",
    announcementType: "commentary",
    workflowState: "publish_ready",
    sourceLabel: "Funds team",
    importance: "Normal",
    note: "Evergreen investor pages should support manual context updates even when the underlying numeric data remains source-owned.",
  },
];

export const announcementRules = [
  "Announcements should become first-class CMS records, not just free-text notes inside a page editor.",
  "Each announcement should keep source context, workflow state, importance, and asset linkage so it can power public pages, alerts, and search.",
  "Manual announcements should coexist with official filings and source imports without blurring editorial ownership.",
];
