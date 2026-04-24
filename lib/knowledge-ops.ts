export const knowledgeOpsSummary = {
  retrievalSources: 5,
  structuredFeeds: 5,
  pendingPipelines: 2,
};

export const knowledgeSourceSamples = [
  {
    source: "editorial_blocks",
    role: "Human-authored context",
    status: "In progress",
    note: "Editorial reviews, FAQs, strengths, risks, and premium prompts should become reliable retrieval chunks for search and AI summaries.",
  },
  {
    source: "asset_documents",
    role: "Document-backed evidence",
    status: "In progress",
    note: "Prospectuses, annual reports, and factsheets now have a first persisted retrieval-memory lane so extracted highlights and reference-aware answer packets stop living only in planning copy.",
  },
  {
    source: "asset_announcements",
    role: "Fresh event context",
    status: "In progress",
    note: "Manual company updates, IPO notes, and commentary should help search and AI stay timely without guessing from stale page copy.",
  },
  {
    source: "asset_relationships",
    role: "Context graph",
    status: "In progress",
    note: "Related pages, compare candidates, sectors, and learning links should guide retrieval toward the right connected context.",
  },
  {
    source: "source_snapshots",
    role: "Structured numeric truth",
    status: "In progress",
    note: "Trusted metric snapshots now have a first persisted AI-memory lane so grounded quantitative answers can point at retained internal records instead of inferring live numbers from prose.",
  },
];

export const knowledgeOpsRules = [
  "AI and smart search should read from structured internal sources first, then use editorial content and documents as supporting context.",
  "Retrieval inputs should stay source-aware so answers can explain whether a point came from editorial review, official data, or document extraction.",
  "A single knowledge pipeline should support search, AI summaries, alerts, and future app experiences rather than building separate data silos.",
];
