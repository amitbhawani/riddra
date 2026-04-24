export type DbActivationGroup = {
  title: string;
  summary: string;
  steps: string[];
};

export const dbActivationGroups: DbActivationGroup[] = [
  {
    title: "Core foundation",
    summary: "Profiles, subscriptions, entitlements, instruments, companies, stock pages, IPO pages, mutual fund pages, and source registry.",
    steps: [
      "Run db/migrations/0001_phase_0_1_foundation.sql",
      "Run db/seeds/0001_seed_foundation.sql",
      "Verify profiles, entitlements, and source registry tables are visible in Supabase",
    ],
  },
  {
    title: "Structured content blocks",
    summary: "Reusable content sections for richer stock, IPO, and fund page composition.",
    steps: [
      "Run db/migrations/0002_content_sections.sql",
      "Run db/seeds/0002_content_sections.sql",
      "Verify content-section rows are available for the public page system",
    ],
  },
  {
    title: "Index tracker foundation",
    summary: "Tracked indexes, component weights, snapshots, component snapshots, and refresh runs for Nifty50, BankNifty, FinNifty, and Sensex.",
    steps: [
      "Run db/migrations/0003_index_tracker_foundation.sql",
      "Run db/seeds/0003_index_tracker_foundation.sql",
      "Verify tracked_indexes, index_tracker_snapshots, and component snapshot tables",
    ],
  },
  {
    title: "Portfolio foundation",
    summary: "Portfolios, holdings, import runs, and broker connections for CSV import and future sync flows.",
    steps: [
      "Run db/migrations/0004_portfolio_foundation.sql",
      "Verify portfolios, holdings, imports, and broker_connections tables",
      "Prepare the next write-path work for real import review and manual entry persistence",
    ],
  },
  {
    title: "Billing foundation",
    summary: "Billing customers, plans, subscription events, invoices, and entitlement audit log for Razorpay-backed subscriptions.",
    steps: [
      "Run db/migrations/0005_billing_foundation.sql",
      "Run db/seeds/0004_billing_foundation.sql",
      "Verify billing_plans, billing_invoices, subscription_events, and entitlement_audit_log tables",
    ],
  },
  {
    title: "Editorial CMS foundation",
    summary: "Editorial blocks, manual announcements, document metadata, and workflow assignments for large-scale CMS operations.",
    steps: [
      "Run db/migrations/0006_editorial_cms_foundation.sql",
      "Run db/seeds/0005_editorial_cms_foundation.sql",
      "Verify editorial_blocks, asset_announcements, asset_documents, and editorial_workflows tables",
    ],
  },
  {
    title: "Asset relationships foundation",
    summary: "Taxonomies, asset-taxonomy mappings, and relationship graph records for related pages, lifecycle links, and plugin-style expansion.",
    steps: [
      "Run db/migrations/0007_asset_relationships_foundation.sql",
      "Run db/seeds/0006_asset_relationships_foundation.sql",
      "Verify taxonomies, asset_taxonomies, and asset_relationships tables",
    ],
  },
  {
    title: "Asset registry foundation",
    summary: "Canonical asset records and alias mappings for durable identity, route continuity, and IPO-to-listed-stock lifecycle handoff.",
    steps: [
      "Run db/migrations/0008_asset_registry_foundation.sql",
      "Run db/seeds/0007_asset_registry_foundation.sql",
      "Verify asset_registry and asset_aliases tables plus lifecycle-state coverage",
    ],
  },
  {
    title: "Phase 2 execution foundation",
    summary: "Source contracts, ingest jobs, lifecycle transitions, override execution, and market-data readiness for honest activation planning.",
    steps: [
      "Run db/migrations/0009_phase_2_execution_foundation.sql",
      "Run db/seeds/0008_phase_2_execution_foundation.sql",
      "Verify source_contracts, ingest_jobs, asset_lifecycle_transitions, override_executions, and market_data_readiness tables",
    ],
  },
  {
    title: "Phase 8 architecture foundation",
    summary: "Lineage records, delivery artifacts, operator settings, and provider registry for platform-scale memory and plugin-style expansion.",
    steps: [
      "Run db/migrations/0010_phase_8_architecture_foundation.sql",
      "Run db/seeds/0009_phase_8_architecture_foundation.sql",
      "Verify source_snapshots, record_lineage, delivery_artifacts, operator_settings, and provider_registry tables",
    ],
  },
];
