export const contentModelEntities = [
  {
    name: "asset_registry",
    title: "Asset registry",
    status: "In progress",
    summary: "Canonical record for stocks, IPOs, funds, wealth products, indexes, tools, courses, and learn pages with durable identity and lifecycle state.",
  },
  {
    name: "editorial_blocks",
    title: "Editorial blocks",
    status: "Planned",
    summary: "Reusable block records for hero copy, reviews, announcements, FAQs, strengths, risks, premium prompts, and explainer sections.",
  },
  {
    name: "document_metadata",
    title: "Document metadata",
    status: "In progress",
    summary: "Structured metadata for filings, DRHP, RHP, annual reports, factsheets, prospectuses, and internal editorial references.",
  },
  {
    name: "announcement_stream",
    title: "Announcement stream",
    status: "Planned",
    summary: "Manual or imported company announcements, updates, listing notices, and market-relevant events tied to each asset.",
  },
  {
    name: "source_snapshots",
    title: "Source snapshots",
    status: "In progress",
    summary: "Time-based storage for source-fed numeric records, tracker values, billing events, and lifecycle changes.",
  },
  {
    name: "override_records",
    title: "Override records",
    status: "In progress",
    summary: "Field-level manual override entries with owner, reason, review date, and return-to-source behavior.",
  },
  {
    name: "relationship_graph",
    title: "Relationship graph",
    status: "In progress",
    summary: "Map peers, sectors, categories, promoters, issuers, AMCs, brokers, and related educational or tool content without hardcoding page links.",
  },
  {
    name: "workflow_states",
    title: "Workflow states",
    status: "Planned",
    summary: "Draft, review, publish, archive, override, and lifecycle states for editorial and data operations across every route family.",
  },
];

export const contentModelRules = [
  "Every important entity should be modeled directly instead of being hidden inside generic JSON whenever we know it will drive search, audit, SEO, or user workflows.",
  "Dynamic data, editorial content, document metadata, and user-facing derived outputs should stay in separate layers with explicit relationships.",
  "If a future product area can be imagined today, its base entity and lifecycle should be reserved now even if the page UI ships later.",
];

export const contentModelExpansionQueue = [
  "Canonical asset and alias tables so symbols, old slugs, IPO transitions, and route continuity stay tied to one record spine.",
  "Announcements and filings as first-class records with asset linkage, importance score, source, and editorial note.",
  "Editorial block instances tied to blueprints so CMS editing can become a real data model instead of only a planning surface.",
  "Asset relationship tables for compare, related pages, lifecycle handoff, and smart-search linking.",
  "Workflow assignment and review-state tables so multi-person editorial operations scale safely.",
];
