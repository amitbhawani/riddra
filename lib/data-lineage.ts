export const dataLineageSummary = {
  trackedLayers: 4,
  lineageRecords: 12,
  auditDomains: 5,
};

export const dataLineageItems = [
  {
    title: "Source ingestion lineage",
    status: "Live",
    summary:
      "Official-source pulls, manual imports, and refresh jobs should always leave behind a traceable record of what was fetched, when it was fetched, and which canonical assets it touched.",
  },
  {
    title: "Editorial mutation lineage",
    status: "Live",
    summary:
      "Manual blocks, announcements, document changes, and overrides should keep editor identity, previous state, and rollback-safe history rather than overwriting silently.",
  },
  {
    title: "Derived data lineage",
    status: "Live",
    summary:
      "Coverage scores, AI-ready knowledge views, search answer inputs, and comparison outputs should be attributable to underlying source and editorial records.",
  },
  {
    title: "Delivery artifact lineage",
    status: "In progress",
    summary:
      "Cached responses, page-ready snapshots, structured search artifacts, and notification payloads should stay tied back to the upstream records they were generated from.",
  },
  {
    title: "User-impact audit lineage",
    status: "In progress",
    summary:
      "Access changes, billing events, broker-review outcomes, and alert-trigger decisions should be reviewable as business-critical audit trails instead of scattered logs.",
  },
];

export const dataLineageRules = [
  "Every important record should be explainable by upstream lineage rather than only by current state.",
  "Canonical source data, editorial changes, derived outputs, and delivery artifacts should each keep their own audit boundary.",
  "The goal is durable memory with controlled traceability, not an unbounded event swamp that nobody can operate later.",
];
