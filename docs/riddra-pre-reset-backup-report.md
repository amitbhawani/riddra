# Riddra Pre-Reset Stock Backup Report

Last updated: 2026-04-29 IST

## Summary

A full pre-reset stock backup export was created from the live Supabase project currently configured in the app:

- Project URL: `https://jawojjmapxnevywrmmiq.supabase.co`
- Backup date: `2026-04-29`
- Backup folder: [riddra-pre-reset-stock-backup-2026-04-29](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29)
- Backup manifest: [manifest.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/manifest.json)

No deletion or reset SQL was executed in this step.

## Export Result

- Exported tables: `25`
- Tables not exportable from the connected database: `18`
- Total exported rows: `1101`
- Format: per-table `.csv` files plus a manifest

## What Was Exported

| Table | Rows | Notes |
|---|---:|---|
| `instruments` | 22 | Filtered to `instrument_type in ('stock', 'equity')` |
| `companies` | 2 | Matched to exported stock/equity instruments |
| `stock_pages` | 0 | No legacy `stock_pages` rows currently present |
| `stocks_master` | 22 | Yahoo stock master mapping rows |
| `raw_yahoo_imports` | 65 | Raw Yahoo payload archive |
| `stock_price_history` | 374 | Normalized Yahoo daily history |
| `stock_market_snapshot` | 2 | Latest normalized snapshot rows |
| `stock_valuation_metrics` | 1 | Valuation coverage currently sparse |
| `stock_share_statistics` | 1 | Share-statistics coverage currently sparse |
| `stock_financial_highlights` | 1 | Financial highlights coverage currently sparse |
| `stock_income_statement` | 4 | Annual/quarterly statement rows present |
| `stock_balance_sheet` | 4 | Annual/quarterly statement rows present |
| `stock_cash_flow` | 4 | Annual/quarterly statement rows present |
| `stock_quote_history` | 31 | Legacy public stock quote history |
| `stock_ohlcv_history` | 19 | Legacy public stock OHLCV history |
| `stock_import_jobs` | 27 | Parent import jobs |
| `stock_import_job_items` | 65 | Per-stock/per-module job items |
| `stock_import_errors` | 48 | Durable Yahoo error rows |
| `stock_import_coverage` | 11 | Module-wise coverage rows |
| `stock_import_activity_log` | 251 | Step-level activity log rows |
| `stock_import_reconciliation` | 57 | Raw-vs-normalized reconciliation rows |
| `market_data_sources` | 1 | Source registry preserved for post-reset sync |
| `cms_admin_records` | 9 | Stock-family CMS records only |
| `cms_admin_record_revisions` | 62 | Stock-family CMS revisions only |
| `cms_admin_pending_approvals` | 18 | Stock-family CMS approvals only |

## Stock Import Logs Coverage

There is no physical table named `stock_import_logs` in the current schema.

To preserve the actual durable import history, the backup includes the current log-equivalent tables:

- `stock_import_errors`
- `stock_import_activity_log`
- `stock_import_reconciliation`
- `stock_import_job_items`
- `stock_import_jobs`

## Existing Stock-Related CMS Content Included

The backup includes stock-family CMS/editorial content from:

- `cms_admin_records`
- `cms_admin_record_revisions`
- `cms_admin_pending_approvals`

These were exported with `family = 'stocks'` only.

## Tables Not Exportable From The Connected Database

These tables returned PostgREST schema-cache “not found” errors during export, so no CSV was created for them in this backup run:

- `stock_company_profile`
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
- `stock_fundamental_snapshots`
- `stock_shareholding_snapshots`

This does not mean data was deleted. It means those tables were not visible in the current app-connected Supabase REST schema at the time of export.

## Backup Artifacts

Primary artifact location:

- [backups/riddra-pre-reset-stock-backup-2026-04-29](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29)

Key files inside:

- [instruments.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/instruments.csv)
- [companies.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/companies.csv)
- [stocks_master.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/stocks_master.csv)
- [raw_yahoo_imports.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/raw_yahoo_imports.csv)
- [stock_price_history.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/stock_price_history.csv)
- [stock_market_snapshot.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/stock_market_snapshot.csv)
- [stock_import_jobs.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/stock_import_jobs.csv)
- [stock_import_activity_log.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/stock_import_activity_log.csv)
- [stock_import_reconciliation.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/stock_import_reconciliation.csv)
- [cms_admin_records.csv](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/backups/riddra-pre-reset-stock-backup-2026-04-29/cms_admin_records.csv)

## Operational Notes

- The export script used the current `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- The backup is CSV-based so it is easy to inspect and restore selectively before or after reset.
- Because several optional/derived stock tables are still missing from REST visibility, this backup should be treated as a strong pre-reset checkpoint for the current live stock core, but not as proof that every planned Yahoo table already exists in the connected database.

## Verification

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Conclusion

The requested pre-reset backup/export has been created successfully, and no reset or deletion was performed.

Before the actual reset step, use this backup set as the manual rollback checkpoint for:

- stock catalog rows
- current Yahoo raw and normalized core data
- import jobs and logs
- stock CMS/editorial content
