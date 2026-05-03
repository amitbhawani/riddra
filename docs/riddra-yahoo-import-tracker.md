# Riddra Yahoo Import Tracker

Last updated: 2026-04-28

## Status Snapshot

| Area | Completion |
|---|---:|
| Overall project | 89% |
| Phase 1: Data Planning + Database Foundation | 86% |
| Phase 2: Backend Import + Admin System | 99% |
| Phase 3: Frontend Display | 58% |

Note:
- Percentages now reflect the current audited codebase, not only the original planning documents.
- Stock-level Yahoo price/history foundations already exist in the shared market-data pipeline.
- The remaining work is mainly deeper Yahoo bucket coverage and schema expansion.

## Phase Overview

| Phase | Status | Completion | Notes |
|---|---|---:|---|
| Phase 1: Data Planning + Database Foundation | In progress | 86% | strategy + audit now exist, and the additive Yahoo schema foundation migration has been created in `db/migrations/0044_yahoo_finance_schema_foundation.sql` |
| Phase 2: Backend Import + Admin System | In progress | 99% | shared Yahoo stock OHLCV import, dedicated typed historical importer, typed quote/statistics normalization, typed annual/quarterly financial statement imports, raw-response capture service, sample stock import runner, durable batch queue/worker controls, stock-level batch tracking, admin stock import dashboard, stock-edit import tabs, admin-safe trigger paths, Yahoo operational safety guardrails, and importer reconciliation/activity logging now exist |
| Phase 3: Frontend Display | In progress | 58% | public stock detail pages now render normalized Riddra stock sections for header, chart, key stats, financials, performance, corporate actions, holders, news, and Riddra score, while broader QA and remaining bucket polish are still pending |

## Phase 1 Acceptance Criteria

Phase 1 is complete only when:
- Yahoo data scope is finalized across all selected buckets
- storage destination is defined for each bucket
- DB schema review is complete
- any required new durable tables/indexes are specified
- source registry contract is finalized
- symbol and asset mapping rules are documented
- validation and deduplication rules are documented

## Phase 1 Checklist

| Task | Status | Notes |
|---|---|---|
| Create Yahoo strategy document | Done | strategy doc created |
| Create Yahoo tracker document | Done | tracker doc created |
| Confirm 3-phase rollout structure | Done | documented in strategy |
| Confirm 10 Yahoo data buckets | Done | documented in strategy |
| Review current durable tables for Yahoo compatibility | Done | documented in `riddra-current-data-system-audit.md` |
| Decide which buckets go into existing market-data tables | Done | audit now maps current reusable tables for price/history/snapshot buckets |
| Decide which buckets need new durable tables | Done | audit identifies profile, statements, analyst, actions, and holder gaps |
| Create additive Yahoo schema foundation migration | Done | `db/migrations/0044_yahoo_finance_schema_foundation.sql` now adds raw import, master/profile, price, valuation, statement, action, earnings, holder, options/news, calculated, and import-monitoring tables |
| Define field-level source-of-truth ownership | In progress | stock field registry exists, but a full Yahoo bucket ownership matrix is still not finalized |
| Define import/update cadence per bucket | In progress | current refresh cadences exist in admin job seeds, but Yahoo bucket cadence is not finalized end to end |
| Define source metadata contract for Yahoo rows | In progress | `market_data_sources` and import metadata exist, but final bucket-specific contract still needs to be locked |
| Define symbol normalization and slug mapping rules | In progress | initial stock-first Yahoo mapping exists for Reliance/Tata/Infosys/HDFC Bank, broader coverage pending |
| Define data quality warning policy | In progress | current source preview and import warnings exist, Yahoo-wide policy still needs final approval |
| Define acceptance test dataset | In progress | Reliance is already the first proof stock, but full multi-bucket acceptance coverage is not finished |

## Phase 2 Acceptance Criteria

Phase 2 is complete only when:
- Yahoo source ingestion runs through the unified ingestion pipeline
- admin can preview and save Yahoo sources
- incremental sync works without duplicates
- durable batch tracking works
- activity logs are complete and human-readable
- source health, timeout, cooldown, and retry controls are in place
- importer passes end-to-end tests for at least one stock

## Phase 2 Checklist

| Task | Status | Notes |
|---|---|---|
| Build Yahoo source fetch layer using chart API | Done | current code uses the Yahoo chart API and explicitly avoids HTML scraping |
| Normalize Yahoo symbol input and quote URLs | Done | direct symbol and finance.yahoo.com quote URL normalization already exist |
| Reuse unified market-data import pipeline | Done | Yahoo flows use the shared `market-data-imports.ts` engine |
| Map Yahoo symbol to existing stock slug | In progress | first-wave mappings exist, but full-market coverage is still pending |
| Preview Yahoo source before save | Done | source wizard already previews Yahoo candidates before save |
| Save Yahoo source into market_data_sources | Done | source registry path already exists |
| Run incremental sync from Yahoo source | Done | current source sync imports only missing rows |
| Update latest stock snapshot after Yahoo sync | Done | latest quote refresh from OHLCV lane is already wired |
| Add timeout / retry / cooldown controls | Done | sync engine already has timeout, cooldown, and retry behavior |
| Build reusable Yahoo fetch service with throttling and backoff | Done | `lib/yahoo-finance-service.ts` now handles throttled Yahoo requests, raw capture, retries, and error logging |
| Store every raw Yahoo response before normalization | Done | raw responses now persist into `raw_yahoo_imports` via the Yahoo service before downstream normalization |
| Log Yahoo import failures into stock_import_errors | Done | Yahoo fetch failures now write durable rows into `stock_import_errors` |
| Persist Yahoo provider errors to source metadata | Done | source sync state stores sync error / provider error metadata |
| Log sync_started / sync_completed / sync_failed | Done | activity log actions already exist in current code |
| Add batch result visibility in admin UI | Done | source dashboard and import lanes already expose batch/sync outcomes |
| Add sample stock import command for RELIANCE.NS | Done | `npm run yahoo:sample:reliance` now runs the Yahoo sample stock import runner |
| Build dedicated Yahoo historical OHLCV importer into `stock_price_history` | Done | `runYahooHistoricalOhlcvImport(...)` now writes typed daily history with raw capture, duplicate control, job tracking, and coverage updates |
| Track historical import coverage for first/last date and completion | Done | `stock_import_coverage` is now updated for the historical price bucket after each import run |
| Add one-stock and selected-batch historical import runners | Done | `npm run yahoo:history` and `npm run yahoo:history:reliance` now exist, and the admin route supports single or `stocks[]` batch payloads |
| Normalize latest market snapshot into `stock_market_snapshot` with field-fill coverage reporting | Done | `runYahooQuoteStatisticsImport(...)` now writes the typed snapshot row, stores raw Yahoo payloads, and records a field-level fill report in `stock_import_coverage` |
| Normalize valuation, share statistics, and financial highlights with field-fill coverage reporting | Done | `runYahooQuoteStatisticsImport(...)` now writes `stock_valuation_metrics`, `stock_share_statistics`, and `stock_financial_highlights`, while persisting mapped/filled/missing counts and fill percentage |
| Add script runner for quote/statistics normalization | Done | `npm run yahoo:quote-stats` and `npm run yahoo:quote-stats:reliance` now exist |
| Normalize annual and quarterly financial statements into typed statement tables | Done | `runYahooFinancialStatementsImport(...)` now writes `stock_income_statement`, `stock_balance_sheet`, and `stock_cash_flow` for both `annual` and `quarterly` periods, with missing Yahoo fields saved as `NULL` |
| Track financial statement import coverage percentage | Done | financial statement imports now persist bucket-level field-fill coverage into `stock_import_coverage` for annual and quarterly statement buckets |
| Add script runner for financial statement normalization | Done | `npm run yahoo:financials` and `npm run yahoo:financials:reliance` now exist |
| Build admin stock import dashboard with summary cards, bulk actions, raw-response view, and missing-fields view | Done | `/admin/market-data/stocks` now shows stock-level Yahoo completion, failures, pending imports, import percentage, and durable raw/missing-field drill-downs |
| Add stock editor tabs for imported Yahoo buckets and logs | Done | stock editor now includes tabs for price history, snapshot, valuation, financials, dividends/splits, earnings/analyst, holders, options, news, import logs, and raw Yahoo data |
| Build durable Yahoo batch importer for up to 2,000 stocks | Done | `lib/yahoo-finance-batch-import.ts` now uses `stock_import_jobs` + `stock_import_job_items` as a controlled queue/worker layer over the existing Yahoo module importers |
| Support batch pause, resume, retry, stop, module selection, and missing-only mode | Done | the batch worker supports `pause`, `resume`, `retry`, `stop`, `modules[]`, and `importOnlyMissingData`, with admin-safe routes and CLI controls |
| Track batch ETA, completed/failed/skipped stocks, historical completion, module completion, and final reports | Done | durable batch reports now expose stock counts, item counts, ETA, module completion percentages, historical coverage averages, affected routes, and a persisted final report summary |
| Add admin-safe batch routes and CLI runner | Done | `/api/admin/market-data/import/yahoo-batch`, `/api/admin/market-data/import/yahoo-batch/[jobId]`, and `npm run yahoo:batch` now create, run, control, and inspect Yahoo batch jobs |
| Add Yahoo operational guardrails for request caps, worker caps, repeated-failure cooldowns, and safer batch defaults | Done | Yahoo now defaults to `1 req/sec`, `2000/hour`, `15000/day`, `1` active worker, `45` minute cooldown after repeated provider failures, `3` max retries, and batch-safe default modules without historical reimport unless explicitly requested |
| Surface Yahoo guardrail telemetry in the admin stock import dashboard | Done | `/admin/market-data/stocks` now shows current request pace, hour/day usage, cooldown status, and the last Yahoo error |
| Document Yahoo operating rules for non-developer admins | Done | `/admin/market-data/yahoo-import-guide` now explains import modes, control actions, safe usage rules, schedule guidance, and troubleshooting |
| Add durable Yahoo importer activity log and reconciliation tables | Done | `stock_import_activity_log` and `stock_import_reconciliation` are now part of the Yahoo schema plan in `db/migrations/0048_yahoo_import_activity_and_reconciliation.sql` |
| Write per-step importer activity and reconciliation rows during Yahoo imports | Done | the historical, quote/statistics, and financial-statement Yahoo importers now emit step checkpoints for fetch, raw-save, normalization, coverage, reconciliation, and failure paths |
| Surface latest Yahoo activity, per-stock activity timeline, and reconciliation status in the admin dashboard | Done | `/admin/market-data/stocks` now reads the durable activity and reconciliation tables and shows raw-vs-normalized counts plus retry guidance |
| Verify no local file writes | In progress | durable hosted behavior is designed in, but broader Yahoo bucket expansion still needs the same audit discipline |

## Phase 3 Acceptance Criteria

Phase 3 is complete only when:
- imported Yahoo-backed data is visible on the correct stock pages
- latest snapshot and chart history read from durable imported data
- frontend labels match backend mapping
- incomplete Yahoo data does not create misleading public UI
- editor/admin can confirm affected route and latest imported values

## Phase 3 Checklist

| Task | Status | Notes |
|---|---|---|
| Wire imported history into stock chart surfaces | Done | stock detail now renders a normalized price chart from `stock_price_history` with 1M / 6M / 1Y / 5Y / Max range controls |
| Wire latest Yahoo snapshot into stock hero/summary | Done | stock detail now reads the normalized latest snapshot and key-stat surfaces from durable Riddra stock tables instead of frontend Yahoo calls |
| Show freshness-safe fallback rules | Done | the new normalized sections show clear empty states when buckets are missing instead of crashing or rendering misleading placeholders |
| Ensure field parity with admin/editor mapping | In progress | stock field registry and operator field map already exist, and the stock editor now exposes bucket-specific Yahoo import tabs for internal review |
| Verify affected frontend routes after sync | In progress | the public stock detail route is now wired to normalized data, with final live-route QA still pending across multiple stocks |
| QA public rendering with Yahoo-backed data | In progress | normalized public stock sections are now implemented, but broader visual/runtime QA is still needed across real imported stocks |

## Yahoo Data Bucket Tracker

| Yahoo bucket | Phase target | Status | Notes |
|---|---|---|---|
| Identity and Company Profile | Phase 1 / 2 | In progress | new `stocks_master` and `stock_company_profile` tables now exist, but live Yahoo profile ingestion is still pending |
| Historical Price Data | Phase 1 / 2 / 3 | In progress | the repo now has a dedicated Yahoo daily-history importer into `stock_price_history`, raw response capture, import coverage tracking, and admin/CLI runners; broader frontend adoption is still pending |
| Latest Market Snapshot | Phase 1 / 2 / 3 | In progress | the repo now has a dedicated Yahoo normalization runner into `stock_market_snapshot`, with raw-response capture and field-level fill reporting; frontend adoption is still pending |
| Valuation and Key Statistics | Phase 1 / 2 / 3 | In progress | typed Yahoo normalization now writes `stock_valuation_metrics`, `stock_share_statistics`, and `stock_financial_highlights`, with field-level fill reporting and coverage tracking |
| Financial Statements | Phase 1 / 2 | In progress | typed annual and quarterly Yahoo normalization now writes `stock_income_statement`, `stock_balance_sheet`, and `stock_cash_flow`, with field-fill coverage tracking; live DB execution and broader QA are still pending |
| Profitability, Growth and Health Ratios | Phase 1 / 2 / 3 | In progress | dedicated calculated-layer tables now exist, but calculation jobs and frontend usage are still pending |
| Dividends, Splits and Corporate Actions | Phase 1 / 2 | In progress | dedicated action tables now exist, but Yahoo ingestion is not built yet |
| Earnings, Calendar and Analyst Data | Phase 1 / 2 / 3 | In progress | dedicated earnings and analyst tables now exist, but importer support is still pending |
| Holders and Ownership | Phase 1 / 2 / 3 | In progress | new holders summary/detail tables now exist alongside older shareholding snapshots |
| Options, News and Riddra Calculated Layer | Phase 1 / 2 / 3 | In progress | options and news tables now surface through the stock editor import tabs, but full Yahoo normalization and broader public rendering are still pending |

## Immediate Next Tasks

| Priority | Task | Status | Notes |
|---|---|---|---|
| P1 | Apply `0044_yahoo_finance_schema_foundation.sql` to the durable database | Not started | schema file exists in repo, but it still needs to be applied and verified in Supabase/local DBs |
| P1 | Lock v1 Yahoo bucket scope for the first stock rollout | In progress | historical price + latest snapshot are already strongest candidates |
| P1 | Expand normalization beyond profile, snapshot, valuation, typed price history, financial statements, dividends/splits, and news | In progress | holders, options, earnings/analyst, and deeper calculated-layer normalization are still pending |
| P1 | QA the new stock import dashboard and stock editor tabs against a fuller multi-stock Yahoo dataset | In progress | Reliance is the working proof stock, but the new admin surfaces still need broader stock coverage verification |
| P1 | Run the new durable Yahoo batch worker against a real multi-stock dataset after schema application | In progress | the queue/worker, API routes, CLI runner, and final report layer now exist, but live 100+ or 2,000-stock execution still needs DB-backed proving |
| P1 | Apply `0046_stock_price_history_yahoo_daily_unique.sql` to the durable database | Not started | repo now contains the Yahoo daily-history duplicate-safety index for `stock_price_history` |
| P1 | Apply `0047_stock_market_snapshot_nullable_price.sql` to the durable database | Not started | quote/statistics normalization now expects `stock_market_snapshot.price` to allow `NULL` when Yahoo omits that field |
| P1 | Apply `0048_yahoo_import_activity_and_reconciliation.sql` to the durable database | Not started | importer activity and reconciliation views now depend on the new durable observability tables |
| P1 | Decide whether to extend or supersede `stock_fundamental_snapshots` | In progress | the new typed valuation/statistics tables reduce pressure on the old text-first snapshot model, but the coexistence plan still needs to be finalized |
| P1 | Resolve overlapping NAV models (`fund_nav_history` vs `mutual_fund_nav_history`) | Not started | avoid repeating the same pattern for Yahoo stock buckets |

## Execution Notes

- This tracker is for the Yahoo Finance import program only.
- Google Sheet import work already exists separately and should not be confused with this tracker.
- The tracker now reflects the real audited codebase, where a shared Yahoo-compatible stock price/sync foundation already exists.
- Full Yahoo bucket coverage is still not built.
