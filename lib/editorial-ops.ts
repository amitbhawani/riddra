export const editorialWorkflowSummary = {
  drafts: 9,
  inReview: 4,
  publishReady: 3,
};

export const editorialWorkflowSamples = [
  {
    entityType: "editorial_block",
    entityLabel: "stock:tata-motors/editorial_review",
    workflowState: "review",
    assignedTo: "editor@riddra.com",
    reviewer: "amit@riddra.com",
    dueAt: "Apr 14, 2026",
    note: "Company review block should be verified before it becomes the default editorial layer for listed stocks.",
  },
  {
    entityType: "announcement",
    entityLabel: "ipo:hero-fincorp/listing_update",
    workflowState: "draft",
    assignedTo: "newsdesk@riddra.com",
    reviewer: "pending",
    dueAt: "Apr 15, 2026",
    note: "IPO lifecycle announcement should be ready for manual publication if listing details change before source automation is live.",
  },
  {
    entityType: "document",
    entityLabel: "stock:tata-motors/annual_report",
    workflowState: "publish_ready",
    assignedTo: "docs@riddra.com",
    reviewer: "amit@riddra.com",
    dueAt: "Apr 13, 2026",
    note: "Annual report metadata and document visibility are ready to move live after final review.",
  },
];

export const editorialWorkflowRules = [
  "Every editorial entity should move through a clear state like draft, review, publish-ready, or archived instead of being edited directly on live pages.",
  "Assignments and reviewer names should exist for content blocks, announcements, and documents so staff accountability stays clear.",
  "The same workflow system should eventually power thousands of stock, IPO, fund, and wealth-product records without creating a separate tool for each domain.",
];
