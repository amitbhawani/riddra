export const platformArchitectureLayers = [
  {
    title: "Canonical asset registry",
    points: [
      "Every stock, IPO, fund, ETF, PMS, AIF, SIF, index, course, tool, and learn article should have a durable primary record with slug, lifecycle state, and source ownership.",
      "Corporate identity should survive lifecycle transitions like upcoming IPO to listed stock, or fund-plan changes, without breaking URLs or history.",
      "The database should separate canonical identity from page presentation so future redesigns do not force structural rewrites.",
    ],
  },
  {
    title: "Structured market data layer",
    points: [
      "Numeric and source-fed fields should live in dedicated snapshot or metric tables, not mixed directly into editorial content blocks.",
      "Each field should know its source, refresh cadence, confidence, and whether it is currently under manual override.",
      "History tables should exist wherever trend, audit, or replay might matter later, especially for billing, tracker, and lifecycle systems.",
    ],
  },
  {
    title: "Editorial CMS layer",
    points: [
      "Manual content like company reviews, IPO notes, news summaries, FAQs, strengths, risks, and premium prompts should live in editable block records.",
      "Blocks should be reusable and template-driven so new asset families can be launched without inventing a new CMS every time.",
      "This is the closest Riddra equivalent to WordPress plugin-style flexibility: standard block types, standard workflows, and route-family templates.",
    ],
  },
  {
    title: "Workflow and audit layer",
    points: [
      "Every manual edit, override, document upload, entitlement change, and lifecycle transition should leave a timestamped audit trail.",
      "Staff actions should support draft, review, publish, rollback, and ownership assignment so scaling the team does not create chaos.",
      "System events from auth, payments, imports, and source refreshes should join the same operational record instead of living in separate silos.",
    ],
  },
  {
    title: "Derived delivery layer",
    points: [
      "Search indexes, sitemap generation, smart summaries, AI retrieval datasets, notification payloads, and cached public page views should be treated as derived outputs.",
      "That keeps the canonical database clean while still allowing fast traffic pages and high-scale public delivery.",
      "The same approach will help later when mobile apps, newsletters, alerts, and AI copilots need the same data in different formats.",
    ],
  },
];

export const platformArchitectureModules = [
  {
    title: "Route-family templates",
    summary: "Stocks, IPOs, SME IPOs, funds, ETFs, PMS, AIF, SIF, and future asset classes should share a pluggable page-system model instead of one-off route logic.",
  },
  {
    title: "Block registry",
    summary: "Every reusable content card, document section, compare block, review block, chart block, and announcement block should be registered as a known CMS type.",
  },
  {
    title: "Source adapters",
    summary: "Official-source imports should be added as adapters with field maps, refresh cadence, and fallback behavior rather than ad hoc fetch scripts.",
  },
  {
    title: "Lifecycle automation",
    summary: "Upcoming IPO to listed stock, plan state to entitlements, source failure to override mode, and import mismatch to review queue should all become standard workflows.",
  },
  {
    title: "Plugin-like feature packs",
    summary: "Tools, calculators, wealth-product families, learning packs, alerts, and AI modules should plug into the same architecture without needing a fresh subsystem each time.",
  },
];

export const platformArchitectureSqlRules = [
  "Prefer normalized source-of-truth tables for canonical identity and critical state, then create derived or cached tables only where delivery speed or analytics really needs them.",
  "Store editorial content separately from live market data so manual and automated ownership are always clear.",
  "Use audit tables for anything that changes access, money, lifecycle state, or public information quality.",
  "Design every major table with future backfill, import replay, and external-system reconciliation in mind.",
  "Treat documents, announcements, filings, reviews, metrics, and page blocks as first-class entities instead of burying them in generic blobs.",
];

export const platformArchitectureNextMoves = [
  "Add first-class tables for editorial blocks, manual announcements, document metadata, and review workflows where needed beyond the current blueprint layer.",
  "Define a plugin-style module contract for future route families like ETFs, PMS, AIF, and SIF.",
  "Extend the DB activation map so future migrations are grouped by architecture layer, not just by feature release.",
  "Keep the build tracker honest by treating scale architecture as a real roadmap phase, not a hidden assumption.",
];
