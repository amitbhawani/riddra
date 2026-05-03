# Riddra Stock Reset Execution Report

Last updated: 2026-04-29 IST

## Scope Executed

This reset followed the safe execution direction from [docs/riddra-clean-stock-database-reset-plan.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-clean-stock-database-reset-plan.md):

- cleared generated Yahoo normalized stock data
- cleared legacy stock public-market data
- preserved users
- preserved admin/editorial config
- preserved migration history
- preserved source registry
- preserved raw Yahoo archive and useful import logs

This reset was executed **after** the backup/export documented in [docs/riddra-pre-reset-backup-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-pre-reset-backup-report.md).

## Environment

- Connected Supabase project: `https://jawojjmapxnevywrmmiq.supabase.co`
- Reset script: [scripts/reset-clean-stock-data.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/reset-clean-stock-data.mjs)
- Reset started: `2026-04-29T00:56:32.685Z`
- Reset completed: `2026-04-29T00:56:59.271Z`

## Tables Cleared

### Generated Yahoo stock data

- `stock_company_profile`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_share_statistics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_dividends`
- `stock_splits`
- `stock_corporate_actions`
- `stock_earnings_events`
- `stock_earnings_trend`
- `stock_analyst_ratings`
- `stock_holders_summary`
- `stock_holders_detail`
- `stock_options_contracts`
- `stock_news`
- `stock_technical_indicators`
- `stock_performance_metrics`
- `stock_growth_metrics`
- `stock_health_ratios`
- `stock_riddra_scores`
- `stock_import_coverage`

### Legacy stock public-market data

- `stock_quote_history`
- `stock_ohlcv_history`
- `stock_fundamental_snapshots`
- `stock_shareholding_snapshots`

## Tables Preserved

- `instruments`
- `companies`
- `stocks_master`
- `raw_yahoo_imports`
- `stock_import_jobs`
- `stock_import_job_items`
- `stock_import_errors`
- `stock_import_activity_log`
- `stock_import_reconciliation`
- `market_data_sources`
- `cms_admin_records`
- `cms_admin_record_revisions`
- `cms_admin_pending_approvals`

## Before / After Counts

| Table | Before | After | Result |
|---|---:|---:|---|
| `stock_price_history` | 374 | 0 | cleared |
| `stock_market_snapshot` | 2 | 0 | cleared |
| `stock_valuation_metrics` | 1 | 0 | cleared |
| `stock_share_statistics` | 1 | 0 | cleared |
| `stock_financial_highlights` | 1 | 0 | cleared |
| `stock_income_statement` | 4 | 0 | cleared |
| `stock_balance_sheet` | 4 | 0 | cleared |
| `stock_cash_flow` | 4 | 0 | cleared |
| `stock_import_coverage` | 11 | 0 | cleared |
| `stock_quote_history` | 31 | 0 | cleared |
| `stock_ohlcv_history` | 19 | 0 | cleared |
| `stock_company_profile` | 0 | 0 | already empty |
| `stock_dividends` | 0 | 0 | already empty |
| `stock_splits` | 0 | 0 | already empty |
| `stock_corporate_actions` | 0 | 0 | already empty |
| `stock_earnings_events` | 0 | 0 | already empty |
| `stock_earnings_trend` | 0 | 0 | already empty |
| `stock_analyst_ratings` | 0 | 0 | already empty |
| `stock_holders_summary` | 0 | 0 | already empty |
| `stock_holders_detail` | 0 | 0 | already empty |
| `stock_options_contracts` | 0 | 0 | already empty |
| `stock_news` | 0 | 0 | already empty |
| `stock_technical_indicators` | 0 | 0 | already empty |
| `stock_performance_metrics` | 0 | 0 | already empty |
| `stock_growth_metrics` | 0 | 0 | already empty |
| `stock_health_ratios` | 0 | 0 | already empty |
| `stock_riddra_scores` | 0 | 0 | already empty |
| `stock_fundamental_snapshots` | 0 | 0 | already empty |
| `stock_shareholding_snapshots` | 0 | 0 | already empty |

## Preserved Counts After Reset

| Table | Count | Status |
|---|---:|---|
| `instruments` | 22 | preserved |
| `companies` | 2 | preserved |
| `stocks_master` | 22 | preserved |
| `raw_yahoo_imports` | 65 | preserved |
| `stock_import_jobs` | 27 | preserved |
| `stock_import_job_items` | 65 | preserved |
| `stock_import_errors` | 48 | preserved |
| `stock_import_activity_log` | 251 | preserved |
| `stock_import_reconciliation` | 57 | preserved |
| `market_data_sources` | 1 | preserved |
| `cms_admin_records` | 9 | preserved |
| `cms_admin_record_revisions` | 63 | preserved |
| `cms_admin_pending_approvals` | 18 | preserved |

## Schema Integrity Check

All reset-scope and preserved tables remained queryable after the reset.

Important note:

- A few delete calls for tables that were already empty briefly returned PostgREST schema-cache “not found” messages during the destructive step.
- The final verification pass immediately after reset showed those tables as present and queryable with `0` rows.
- So the final schema state is intact.

## Auto-Increment / ID Reset

No auto-increment sequence reset was needed.

Reason:

- the reset-scope stock tables use UUID primary keys rather than serial integer sequences

## Duplicate Verification

Duplicate check result:

- reset-scope tables with remaining rows: `0`
- duplicate risk status: `none`

Because every cleared stock-data table now has `0` rows, there are no remaining duplicate entries in the reset scope.

## Admin Dashboard Verification

Runtime verification after reset:

- `GET http://127.0.0.1:3000/admin/market-data/stocks` -> `200`

Browser-level verification also succeeded:

- the admin stock dashboard opened in the in-app browser
- the rendered page still showed the CMS admin shell and `Market Data` heading
- no crash blocked the page from loading after the reset

## Final State

The reset completed successfully for the intended clean-stock-data scope:

- generated Yahoo stock data is empty
- legacy stock market history is empty
- source registry is intact
- raw archive is intact
- import logs are intact
- canonical stock catalog is intact
- admin stock dashboard still loads

## Conclusion

The clean stock database reset has been executed successfully without deleting users, admin configuration, migration history, source registry, or useful import evidence.
