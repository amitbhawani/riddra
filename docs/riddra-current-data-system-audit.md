# Riddra Current Data System Audit

Last updated: 2026-04-28

## Scope

This audit reviews the current Riddra codebase and durable database structure for:

- stock catalog and stock page data
- market-data durability and refresh systems
- fundamentals / shareholding / adjacent financial snapshot layers
- import, sync, batch, and job orchestration
- admin/editor stock management
- existing Yahoo Finance, NSE, and generic market-data code paths

This document is descriptive only. It does not propose live schema changes in code during this pass.

## Executive Summary

Riddra already has a meaningful production foundation for stock and market data, but it is split across several layers that serve different purposes:

1. Canonical asset and page foundation
   - `instruments`, `companies`, `stock_pages`
   - plus the newer CMS/admin overlay in `cms_admin_records`

2. Durable market-data lane
   - `stock_quote_history`
   - `stock_ohlcv_history`
   - `benchmark_ohlcv_history`
   - `fund_nav_history`
   - import batches, import rows, source registry, sync state

3. Snapshot and editorial overlays
   - `stock_fundamental_snapshots`
   - `stock_shareholding_snapshots`
   - CMS record sections and publishable content

4. Orchestration and operations
   - Trigger.dev durable jobs
   - Vercel cron
   - source registry incremental sync
   - generic provider-sync / ingest routes
   - operator/admin job visibility

Current strongest area:
- stock OHLCV + latest quote ingestion, incremental source sync, batch tracking, and admin controls

Current biggest gaps versus the Yahoo Finance strategy:
- no dedicated typed tables yet for company-profile snapshots, statements, dividends/corporate actions, earnings/analyst data, or granular holders
- partial overlap / ambiguity between older execution tables and the current active source-sync path
- some financial snapshot storage is still text-first rather than typed numeric fact storage
- mutual fund NAV has overlapping models: `fund_nav_history` and `mutual_fund_nav_history`

## 1. Existing Stock-Related Tables / Models

### 1.1 Core durable tables

| Table / model | Location | Current role | Audit note |
|---|---|---|---|
| `public.instruments` | [db/migrations/0001_phase_0_1_foundation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0001_phase_0_1_foundation.sql) | Canonical asset row for stocks, funds, IPOs, indices via `instrument_type` | Good asset backbone; useful as the long-term canonical symbol/slug anchor |
| `public.companies` | [db/migrations/0001_phase_0_1_foundation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0001_phase_0_1_foundation.sql) | Company metadata tied to `instrument_id` | Holds sector, industry, description, headquarters, but not a full Yahoo company-profile snapshot model |
| `public.stock_pages` | [db/migrations/0001_phase_0_1_foundation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0001_phase_0_1_foundation.sql) | Early stock page content layer | Looks legacy compared with the newer CMS admin record system |
| `public.cms_admin_records` | [db/migrations/0027_operator_backbone_durable_state.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0027_operator_backbone_durable_state.sql) | Current structured admin record store for stocks and other families | This is the real admin/editor content layer today |
| `public.cms_admin_record_revisions` | [db/migrations/0027_operator_backbone_durable_state.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0027_operator_backbone_durable_state.sql) | Revision history for admin-managed records | Used for editor/admin audit trail |
| `public.cms_admin_pending_approvals` | [db/migrations/0034_cms_admin_pending_approvals.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0034_cms_admin_pending_approvals.sql) | Editor approval queue | Important for approval-first stock editing workflow |
| `public.cms_admin_import_batches` / `public.cms_admin_import_rows` | [db/migrations/0035_cms_admin_import_batches.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0035_cms_admin_import_batches.sql) | CMS-style stock/fund/index CSV import tracking | Separate from market-data import; this is correct and should stay separate |

### 1.2 Current stock code model

| Code model | Location | Current role | Audit note |
|---|---|---|---|
| `StockSnapshot` | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) | Public stock-page read model | Merges durable quotes, fundamentals, shareholding, publishable CMS content, and fallback logic |
| `AdminEditorRecord` for stocks | [lib/admin-content-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-content-registry.ts) | Admin record editor structure | Real backend/editor representation for stock sections |
| Stock field registry | [lib/stock-field-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-field-registry.ts) | Shared frontend/backend field parity | Strong foundation for future Yahoo field mapping |

### 1.3 Stock data reality today

The stock layer is already separated into:

- canonical asset identity: `instruments` + `companies`
- admin/editor content truth: `cms_admin_records`
- public assembled stock route: `lib/content.ts`
- market-data truth: durable quote/history tables

This is a good direction, but it means Yahoo integration should not write directly into CMS stock sections except where a specific field is intentionally source-backed.

## 2. Existing Market Data Tables / Models

### 2.1 Core durable market-data tables

| Table / model | Location | Current role | Audit note |
|---|---|---|---|
| `public.market_refresh_runs` | [db/migrations/0011_market_data_durability.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0011_market_data_durability.sql) | Durable refresh execution log | Useful for operational history and provider-run auditing |
| `public.market_series_status` | [db/migrations/0011_market_data_durability.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0011_market_data_durability.sql) | Latest coverage/status row per market series | Good for freshness and health state |
| `public.stock_quote_history` | [db/migrations/0011_market_data_durability.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0011_market_data_durability.sql) | Latest quote snapshots over time | Strong fit for Yahoo latest snapshot bucket |
| `public.stock_ohlcv_history` | [db/migrations/0011_market_data_durability.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0011_market_data_durability.sql) | Durable historical OHLCV | Strong fit for Yahoo historical price bucket |
| `public.benchmark_ohlcv_history` | [db/migrations/0016_benchmark_ohlcv_history.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0016_benchmark_ohlcv_history.sql) | Benchmark/index OHLCV history | Good index history lane |
| `public.fund_nav_history` | [db/migrations/0011_market_data_durability.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0011_market_data_durability.sql) | Durable mutual fund NAV history | This is the active source-registry import target |
| `public.market_data_import_batches` | [db/migrations/0042_market_data_imports_and_field_parity.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0042_market_data_imports_and_field_parity.sql) | Durable batch-level tracking for market-data imports | Production-grade import backbone |
| `public.market_data_import_rows` | [db/migrations/0042_market_data_imports_and_field_parity.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0042_market_data_imports_and_field_parity.sql) | Durable row-level tracking for market-data imports | Good row-level error and mapping visibility |
| `public.market_data_sources` | [db/migrations/0043_market_data_sources.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0043_market_data_sources.sql) | Incremental source registry | Current active source-sync registry |

### 2.2 Adjacent snapshot / financial tables already present

| Table | Location | Current role | Audit note |
|---|---|---|---|
| `public.stock_fundamental_snapshots` | [db/migrations/0023_public_data_snapshot_tables.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0023_public_data_snapshot_tables.sql) | Snapshot fundamentals for stocks | Useful starting point, but narrow and text-typed |
| `public.stock_shareholding_snapshots` | [db/migrations/0023_public_data_snapshot_tables.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0023_public_data_snapshot_tables.sql) | Promoter/FII/DII/public ownership snapshot | Partial Yahoo ownership coverage only |
| `public.fund_factsheet_snapshots` | [db/migrations/0023_public_data_snapshot_tables.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0023_public_data_snapshot_tables.sql) | Mutual-fund factsheet snapshot | Useful adjacent pattern for future stock-profile snapshot design |
| `public.fund_holding_snapshots` | [db/migrations/0018_fund_composition_snapshots.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0018_fund_composition_snapshots.sql) | Fund holdings snapshots | Not directly Yahoo stock work, but shows snapshot-table pattern |
| `public.fund_sector_allocation_snapshots` | [db/migrations/0018_fund_composition_snapshots.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0018_fund_composition_snapshots.sql) | Fund sector mix snapshots | Adjacent market-data layer |
| `public.sector_performance_snapshots` | [db/migrations/0019_sector_performance_snapshots.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0019_sector_performance_snapshots.sql) | Sector return snapshots | Useful for broader market dashboards |
| `public.index_component_weight_snapshots` | [db/migrations/0020_index_component_weight_snapshots.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0020_index_component_weight_snapshots.sql) | Index composition weights | Relevant for benchmark/index expansion |
| `public.mutual_fund_nav_history` | [db/migrations/0022_mutual_fund_nav_history.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0022_mutual_fund_nav_history.sql) | Older mutual-fund NAV table | Overlaps with `fund_nav_history`; this duplication should be resolved in a later cleanup plan |

### 2.3 Key market-data code layers

| File | Current role |
|---|---|
| [lib/market-data-durable-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-durable-store.ts) | Durable write/read logic for quote, OHLCV, benchmark history, fund NAV, index snapshots, refresh runs, and series status |
| [lib/market-data-imports.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-imports.ts) | Shared import engine for manual CSV, Google Sheets, Yahoo Finance, and provider-style rows |
| [lib/market-data-sync.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-sync.ts) | Incremental source sync engine with cooldown, retry, no-new-rows handling, and activity logging |
| [lib/market-data-source-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-source-registry.ts) | Durable source CRUD and sync-state updates |
| [lib/market-data-ingestion.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-ingestion.ts) | Generic provider payload validator + writer |
| [lib/market-data-refresh.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-refresh.ts) | NSE/all-indices/quote refresh logic for the current refresh controller path |
| [lib/market-data-provider-sync.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-provider-sync.ts) | Generic provider URL fetch -> ingest path |

## 3. Existing Import / Job / Cron Systems

### 3.1 Active import and sync systems

| System | Current path | Durable storage | Audit note |
|---|---|---|---|
| Manual market-data import | `/admin/market-data/import` | `market_data_import_batches`, `market_data_import_rows`, history tables | Active and purpose-built for OHLCV / NAV imports |
| Source registry incremental sync | `/admin/market-data/sources` | `market_data_sources` + same batch/history tables | Active current path for Google Sheet and Yahoo source sync |
| Yahoo admin import route | `/api/admin/market-data/import/yahoo` | Same shared import engine | Already implemented for stock OHLCV bucket |
| Google Sheet admin import route | `/api/admin/market-data/import/google-sheet` | Same shared import engine | Already implemented |
| Generic provider ingest | `/api/market-data/ingest` and `/api/admin/market-data/ingest` | `market-data-ingestion` -> durable writes | More generic adapter path, separate from source wizard |
| Generic provider sync queue | `/api/market-data/provider-sync` and admin mirror | Trigger.dev durable job -> provider fetch -> ingest | Architectural shared-provider path, not specifically Yahoo |

### 3.2 Durable jobs and cron

| System | Location | Current role | Audit note |
|---|---|---|---|
| Trigger.dev durable jobs | [lib/durable-jobs.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/durable-jobs.ts) | Defines `market-data-provider-sync` and `market-data-snapshot-refresh` task families | Real current durable orchestration layer |
| Vercel cron | [vercel.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/vercel.json) | Schedules `/api/market-data/provider-sync` daily | Scheduler exists, but it targets the generic provider-sync route rather than the new source registry |
| CMS refresh jobs | `cms_admin_refresh_jobs` in [db/migrations/0027_operator_backbone_durable_state.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0027_operator_backbone_durable_state.sql) | Operator-visible job/readiness table | Good admin control surface, but not itself the execution engine |
| Seeded market-data refresh job definitions | [lib/admin-operator-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-operator-store.ts) | Defines lanes like stock quote refresh, fundamentals refresh, shareholding refresh | Helpful operational model; not the same as the source registry scheduler |

### 3.3 Older execution foundation still in the repo

| Table | Location | Audit note |
|---|---|---|
| `public.source_contracts` | [db/migrations/0009_phase_2_execution_foundation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0009_phase_2_execution_foundation.sql) | Earlier execution planning layer |
| `public.ingest_jobs` | [db/migrations/0009_phase_2_execution_foundation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0009_phase_2_execution_foundation.sql) | Earlier ingest-job registry |
| `public.market_data_readiness` | [db/migrations/0009_phase_2_execution_foundation.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0009_phase_2_execution_foundation.sql) | Readiness-state layer |

Audit note:
- these tables are still valid historical foundation work
- but the currently active incremental sync path is `market_data_sources` + `runMarketDataSync()`
- this means the repo currently has more than one orchestration abstraction for market-data execution

That overlap should be acknowledged before any bigger Yahoo expansion.

## 4. Existing Admin / Editor Pages for Stocks

### 4.1 Stock content management

| Route | Current role |
|---|---|
| [/admin/content/stocks](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/content/%5Bfamily%5D/page.tsx) | Stock content family listing |
| [/admin/content/stocks/new](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/content/%5Bfamily%5D/new/page.tsx) | Manual stock record creation |
| [/admin/content/stocks/[slug]](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/content/%5Bfamily%5D/%5Bslug%5D/page.tsx) | Full structured stock editor |
| [/admin/content/stocks/import](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/content/%5Bfamily%5D/import/page.tsx) | CMS-style stock metadata import only |
| [/admin/approvals](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/approvals/page.tsx) | Editor approval workflow |
| [/admin/activity-log](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/activity-log/page.tsx) | Durable admin activity feed |

Important current boundary:
- stock CMS import is explicitly not the lane for OHLCV / NAV / candle history
- that boundary is correctly called out in the stock content import UI

### 4.2 Market-data management surfaces

| Route | Current role |
|---|---|
| [/admin/market-data](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/page.tsx) | Market-data ops / readiness / source-stack page |
| [/admin/market-data/import](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import/page.tsx) | Dedicated historical market-data import lane |
| [/admin/market-data/sources](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/sources/page.tsx) | Source registry and sync dashboard |
| [/admin/market-data/sources/new](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/sources/new/page.tsx) | Source wizard with auto-detect and preview |
| [/admin/market-data/sources/import](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/sources/import/page.tsx) | Bulk source onboarding |

### 4.3 Inline editor/admin stock-page controls

Current frontend editing foundations exist for stocks:

- stock field parity registry: [lib/stock-field-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-field-registry.ts)
- field-map UI: `StockFieldMapCard`
- inline operator tools on stock pages: `components/stock-page-operator-tools.tsx`

This means frontend/backend parity work is already partially in place for future Yahoo-backed field rollout.

## 5. Existing APIs Related to Market Data

### 5.1 Public / shared execution APIs

| Endpoint | Purpose |
|---|---|
| `/api/market-data/refresh` | Queue durable market-data snapshot refresh |
| `/api/market-data/provider-sync` | Queue generic provider sync through Trigger.dev |
| `/api/market-data/ingest` | Accept validated provider payloads and persist them |
| `/api/market-data/validate` | Validation surface for market-data payload checks |
| `/api/market-data/sample-payload` | Sample payload helper for provider ingest |
| `/api/market-data-target-registry` | Market-data target registry / readiness surface |

### 5.2 Admin market-data APIs

| Endpoint | Purpose |
|---|---|
| `/api/admin/market-data/import` | Execute market-data CSV import |
| `/api/admin/market-data/import/preview` | Preview market-data CSV import |
| `/api/admin/market-data/import/google-sheet` | Preview / execute Google Sheet import |
| `/api/admin/market-data/import/yahoo` | Preview / execute Yahoo Finance stock OHLCV import |
| `/api/admin/market-data/import/templates/[type]` | Download sample import templates |
| `/api/admin/market-data/sources` | Source registry list + save |
| `/api/admin/market-data/sources/detect` | Source wizard preview / auto-detect |
| `/api/admin/market-data/sources/import` | Bulk source onboarding preview/save |
| `/api/admin/market-data/sources/sync` | Sync all active sources |
| `/api/admin/market-data/sources/[id]/sync` | Sync one source |
| `/api/admin/market-data/sources/[id]/rows` | Latest source-vs-DB row inspection |
| `/api/admin/market-data/refresh` | Admin refresh queue trigger |
| `/api/admin/market-data/provider-sync` | Admin provider-sync queue trigger |
| `/api/admin/market-data/ingest` | Admin provider-ingest route |

### 5.3 Existing Yahoo / NSE / provider code already present

| Integration | Current location | Audit note |
|---|---|---|
| Yahoo Finance | [lib/market-data-imports.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-imports.ts), [app/api/admin/market-data/import/yahoo/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/market-data/import/yahoo/route.ts) | Uses Yahoo chart API, not HTML scraping |
| Yahoo source wizard / normalization | [lib/market-data-source-wizard.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-source-wizard.ts) | Detects `finance.yahoo.com/quote/...` or direct `RELIANCE.NS` style input |
| Yahoo incremental sync | [lib/market-data-sync.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-sync.ts) | Reuses shared import engine and source registry |
| NSE quote/index refresh | [lib/market-data-refresh.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-refresh.ts) | Contains NSE-specific headers and quote/index refresh logic |
| Generic provider adapter | [lib/market-data-provider-sync.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-provider-sync.ts) | Fetches `MARKET_DATA_PROVIDER_URL` and sends payload into the shared ingest path |

## 6. Existing Calculated Metrics or Score Systems

### 6.1 Stock-page computed layer already present

| Metric / layer | Location | Current behavior |
|---|---|---|
| R Score | [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx), [app/stocks/r-score-methodology/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/r-score-methodology/page.tsx) | Frontend-computed composite from ROE, ROCE, ownership, 1Y relative return, and data coverage depth |
| Forecast low/base/high | [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx) | Derived from retained history / fallback series on the page |
| 52-week range / range position | Stock page computation | Derived from retained OHLCV bars when available |
| Benchmark / sector fallback mapping | [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) | Resolves benchmark and sector index slugs with explicit fallback rules |

### 6.2 Important audit note about computed systems

These are presentation-layer computations today, not durable imported fact tables.

That is good for:
- keeping imported raw data separate from Riddra’s opinionated layer

But it also means:
- Yahoo expansion should continue storing raw facts first
- then compute Riddra metrics in code or separate derived tables later
- not mix imported data and editorial/computed claims in one JSON section blindly

## 7. Missing Tables Compared to the Yahoo Finance Import Strategy

### 7.1 Bucket-by-bucket gap map

| Yahoo bucket | Current support | Current tables / code | Main gap |
|---|---|---|---|
| 1. Identity and Company Profile | Partial | `instruments`, `companies`, `cms_admin_records` | No dedicated company-profile snapshot/history table for Yahoo profile data |
| 2. Historical Price Data | Strong | `stock_ohlcv_history`, `benchmark_ohlcv_history`, `stock_quote_history` refresh path | Mostly present; adjusted-price/corporate-action normalization still future work |
| 3. Latest Market Snapshot | Strong | `stock_quote_history`, `refreshLatestStockQuoteFromOhlcvHistory()` | Good enough for v1 stock lane |
| 4. Valuation and Key Statistics | Partial | `stock_fundamental_snapshots` | Too narrow and text-typed; missing enterprise value, forward PE, PEG, EV/revenue, EV/EBITDA, shares outstanding |
| 5. Financial Statements | Missing | None dedicated | No income statement / balance sheet / cash flow schema |
| 6. Profitability, Growth and Health Ratios | Partial | `stock_fundamental_snapshots`, UI calculations | Missing typed ratio history or periodic ratio snapshot tables |
| 7. Dividends, Splits and Corporate Actions | Missing | None dedicated | No durable stock corporate-actions table |
| 8. Earnings, Calendar and Analyst Data | Missing | None dedicated | No earnings-event or analyst-consensus tables |
| 9. Holders and Ownership | Partial | `stock_shareholding_snapshots` | Only coarse promoter/FII/DII/public snapshot; no granular holder rows / insider / institution detail |
| 10. Options, News and Riddra Calculated Layer | Partial | News module exists; R Score exists in UI; options routes exist separately | No Yahoo options ingest tables and no durable calculated layer tables |

### 7.2 Specific missing or weak schema areas

Recommended future schema additions, based on the current strategy:

| Recommended future table family | Why it is needed |
|---|---|
| `stock_company_profile_snapshots` | Normalize Yahoo company profile / quote metadata separately from CMS editorial copy |
| `stock_valuation_snapshots` | Store typed valuation/statistics fields without overloading the current text snapshot table |
| `stock_financial_statement_periods` + statement detail rows | Needed for annual / quarterly income statement, balance sheet, and cash flow |
| `stock_ratio_snapshots` | Cleaner home for derived profitability, leverage, growth, and health ratios over time |
| `stock_corporate_action_events` | Dividends, splits, and other corporate actions |
| `stock_earnings_events` | Earnings date, EPS actual/estimate/surprise |
| `stock_analyst_consensus_snapshots` | Targets, recommendation trend, estimate aggregates |
| `stock_holder_snapshots` / `stock_holder_rows` | Major holders, institutional holders, insider holders, ownership detail |

### 7.3 Structural issue already visible

There is already one overlapping area that should be addressed before wider Yahoo expansion:

- `fund_nav_history` is the active durable source-registry target
- `mutual_fund_nav_history` still exists as an older separate table

That is a useful warning sign:
- before adding many more Yahoo bucket tables, Riddra should keep one canonical table per fact family wherever possible

## 8. Recommended Migration Plan

No migrations are being implemented in this audit pass. This is the recommended next sequence only.

### Phase A — Consolidate current truth boundaries

1. Treat these as the existing durable v1 truth for market time series:
   - `stock_quote_history`
   - `stock_ohlcv_history`
   - `benchmark_ohlcv_history`
   - `fund_nav_history`

2. Treat these as the existing editorial/admin truth:
   - `cms_admin_records`
   - `cms_admin_record_revisions`
   - `cms_admin_pending_approvals`

3. Decide whether these older or overlapping layers are:
   - retained
   - deprecated
   - read-only legacy
   - or upgraded into the new plan
   - especially `stock_pages`, `ingest_jobs`, and `mutual_fund_nav_history`

### Phase B — Add missing Yahoo stock data buckets with additive migrations only

Recommended first additive migration group:

1. `stock_company_profile_snapshots`
2. `stock_valuation_snapshots`
3. `stock_financial_statement_periods`
4. `stock_income_statement_rows`
5. `stock_balance_sheet_rows`
6. `stock_cash_flow_rows`
7. `stock_ratio_snapshots`

Recommended second additive migration group:

1. `stock_corporate_action_events`
2. `stock_earnings_events`
3. `stock_analyst_consensus_snapshots`
4. `stock_holder_snapshots`
5. `stock_holder_rows`

### Phase C — Wire new tables into existing code paths instead of creating parallel ones

Reuse the current architecture:

- source registry: [lib/market-data-source-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-source-registry.ts)
- sync engine: [lib/market-data-sync.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-sync.ts)
- shared import engine: [lib/market-data-imports.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-imports.ts)
- public content assembly: [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts)
- field parity layer: [lib/stock-field-registry.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-field-registry.ts)

Do not create:
- one-off Yahoo-only storage tables that bypass the registry/import engine
- direct frontend fetches from Yahoo
- page-local raw provider logic

### Phase D — Cut over bucket by bucket

Recommended order:

1. Historical Price Data
2. Latest Market Snapshot
3. Identity and Company Profile
4. Valuation and Key Statistics
5. Profitability / Growth / Health Ratios
6. Financial Statements
7. Ownership
8. Dividends / Corporate Actions
9. Earnings / Analyst
10. Optional options/news enrichments

This order matches the current codebase:
- price/history is already the strongest durable lane
- frontend already knows how to consume quotes, charts, fundamentals, and ownership summaries
- company profile and richer financials can be layered in later without disturbing the existing import backbone

## Final Audit Verdict

Riddra already has a real market-data platform foundation, not just mock planning:

- durable market-data history exists
- batch tracking exists
- source registry exists
- incremental sync exists
- Yahoo stock OHLCV import code already exists
- admin stock/editor workflows already exist

What is missing is not the entire platform foundation. What is missing is the next schema wave for the deeper Yahoo buckets.

The recommended next step is:
- additive schema design for the missing Yahoo buckets
- while preserving the existing shared import/sync architecture

That is the safest path to scale without rebuilding the working stock/market-data foundation.
