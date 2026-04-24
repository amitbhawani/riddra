export const fieldDictionarySummary = {
  fieldFamilies: 5,
  sourceBackedFields: 9,
  editorialFields: 7,
};

export const fieldDictionaryFamilies = [
  {
    family: "Market metrics",
    status: "Structured",
    note: "Price, market cap, issue size, GMP, NAV, AUM, returns, and volume should stay source-backed with refresh cadence and unit rules.",
  },
  {
    family: "Editorial context",
    status: "Hybrid",
    note: "Reviews, strengths, risks, FAQs, and commentary should be editable by staff while still linking back to canonical assets and revision history.",
  },
  {
    family: "Lifecycle state",
    status: "Structured",
    note: "IPO stage, listing status, archive state, merger history, and slug continuity should live in controlled enums rather than free-text fields.",
  },
  {
    family: "Documents and announcements",
    status: "Hybrid",
    note: "Files, release dates, importance, announcement notes, and citations should preserve editorial control with source-aware metadata.",
  },
  {
    family: "Alerts and AI outputs",
    status: "Derived",
    note: "Signals, summaries, notifications, and smart-search answers should be generated from source-backed or editorial inputs, not stored as uncontrolled truth.",
  },
];

export const fieldDictionaryRules = [
  "Every field should have a clear owner: source-backed, editorial, system-derived, or user-generated.",
  "Numeric fields that affect trust or money decisions should keep units, timestamps, and source lineage instead of being flattened into plain text.",
  "The CMS should prefer reusable field families and validation rules so new route families can plug into standard patterns instead of inventing custom tables every time.",
];
