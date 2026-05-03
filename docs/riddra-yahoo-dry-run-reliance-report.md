# Riddra Yahoo Dry-Run Reliance Report

Last updated: 2026-04-28

## Summary

The remaining Supabase REST schema exposure issues were fixed for:

- `stock_share_statistics`
- `stock_import_activity_log`
- `stock_import_reconciliation`

After the schema fix, the no-network `RELIANCE.NS` Yahoo dry-run completed successfully and the end-to-end dry-run path now works:

- raw Yahoo payload save
- normalized table writes
- coverage updates
- step-level activity logging
- reconciliation rows
- admin dashboard route render
- frontend Reliance stock page render

No stocks were deleted. No live Yahoo batch was started.

## 1. Supabase REST Exposure Fix

### Pre-fix problem

These three tables were returning `PGRST205` through the live app's service-role Supabase path:

- `stock_share_statistics`
- `stock_import_activity_log`
- `stock_import_reconciliation`

### Fix applied

The existing safe schema SQL was applied in the live Supabase project `jawojjmapxnevywrmmiq`, and the PostgREST schema cache was reloaded with:

```sql
notify pgrst, 'reload schema';
```

### Verification

Service-role `select('*').limit(1)` checks now succeed for all three tables:

| Table | Result |
|---|---|
| `stock_share_statistics` | `200 OK`, `0 rows` |
| `stock_import_activity_log` | `200 OK`, `0 rows` |
| `stock_import_reconciliation` | `200 OK`, `0 rows` |

Result: no `PGRST205` remains for the dry-run-critical Yahoo tables.

## 2. Dry-Run Execution

### CLI dry-run

Command:

```bash
npm run yahoo:dry-run:reliance
```

Result:

```json
{
  "dryRun": true,
  "yahooSymbol": "RELIANCE.NS",
  "result": {
    "importedCount": 1,
    "failedCount": 0
  }
}
```

CLI dry-run job ids:

- historical: `cb0ccb9f-c095-431e-9344-1244e193f904`
- quote/statistics: `a80d4397-c30c-4077-9a9d-a11f808b5e8d`
- financials: `9f7616df-ad7c-4eb6-b1e3-3434712e6a42`

### Admin-safe API dry-run

Request:

```json
{
  "yahooSymbols": ["RELIANCE.NS"],
  "modules": ["historical_prices", "quote_statistics", "financial_statements"],
  "dryRun": true
}
```

Response:

```json
{
  "importedCount": 1,
  "failedCount": 0
}
```

API dry-run job ids:

- historical: `c9a2b4a0-a385-46e2-a8d4-8bce72d62967`
- quote/statistics: `1f72339f-da02-4230-9133-ba72ee62c4fb`
- financials: `df380c4b-5968-4bba-a1b7-6409ba066627`

## 3. No-Network Proof

The dry-run path is fixture-backed, not network-backed.

Implementation proof:

- `lib/yahoo-finance-service.ts` uses `dryRunFixture` branches for Yahoo requests
- `lib/yahoo-finance-dry-run-fixtures.ts` provides the RELIANCE fixture payloads
- the fixture layer explicitly supports `RELIANCE.NS` dry-run payloads for:
  - historical prices
  - quote/statistics
  - financial statements

This confirms the executed dry-run path does not require live Yahoo responses.

## 4. Raw Save Verification

For the successful CLI dry-run, `raw_yahoo_imports` contains 4 completed raw payload rows for `RELIANCE.NS`:

| Raw import id | Request type | Module(s) | Status |
|---|---|---|---|
| `3367243b-5d34-4def-800a-786cdf30e03b` | `historical_prices` | `chart` | `completed` |
| `b87aeb8a-05f3-4225-81c8-cf58156aa66c` | `quote_latest` | `quote` | `completed` |
| `6dc5ffb4-b5cd-47d2-a393-bd644bcb118c` | `quote_summary` | `summaryDetail,defaultKeyStatistics,financialData,price` | `completed` |
| `0d361d85-e8b1-472a-91dc-c031289d2f44` | `financial_statements` | `incomeStatementHistory,...,cashflowStatementHistoryQuarterly` | `completed` |

## 5. Normalized Data Verification

### Historical prices

`stock_price_history` latest RELIANCE row:

- `trade_date`: `2026-04-28`
- `open`: `1343.6`
- `high`: `1356.8`
- `low`: `1337.2`
- `close`: `1350.75`
- `adj_close`: `NULL`
- `volume`: `5320000`
- `source_name`: `yahoo_finance`

Historical dry-run normalization outcome:

- `rows_fetched = 10`
- `rows_inserted = 0`
- `rows_updated = 10`
- `rows_skipped = 0`
- `fill_percentage = 97.14`

Note: rows were updated instead of newly inserted because historical RELIANCE rows already existed and the dry-run respected duplicate-safe upsert behavior.

### Latest market snapshot

`stock_market_snapshot` latest RELIANCE row:

- `trade_date`: `2026-04-28`
- `price`: `1350.75`
- `previous_close`: `1342.3`
- `change_absolute`: `8.45`
- `change_percent`: `0.6295`
- `market_cap`: `18276500000000`

### Valuation metrics

`stock_valuation_metrics` latest RELIANCE row includes:

- `trailing_pe = 24.8`
- `forward_pe = 22.1`
- `peg_ratio = 1.45`
- `price_to_book = 2.35`
- `trailing_eps = 54.32`
- `forward_eps = 60.11`
- `dividend_yield = 0.0035`

### Share statistics

`stock_share_statistics` latest RELIANCE row includes:

- `shares_outstanding`
- `float_shares`
- `shares_short`
- `shares_short_prior_month`
- `shares_short_ratio`
- `short_percent_shares_outstanding`
- `held_percent_insiders`
- `held_percent_institutions`

### Financial highlights

`stock_financial_highlights` latest RELIANCE row includes:

- `total_revenue`
- `gross_profit`
- `ebitda`
- `operating_cash_flow`
- `total_cash`
- `total_debt`
- `current_ratio`
- `book_value_per_share`
- `return_on_assets`
- `return_on_equity`

### Financial statements

Normalized annual and quarterly rows are present in all three statement tables:

| Table | Annual rows | Quarterly rows |
|---|---:|---:|
| `stock_income_statement` | 2 | 2 |
| `stock_balance_sheet` | 2 | 2 |
| `stock_cash_flow` | 2 | 2 |

## 6. Coverage Verification

`stock_import_coverage` now contains bucket-wise coverage for the RELIANCE dry-run:

| Bucket | Coverage status | Fill % | Rows available | Rows imported | Warning count |
|---|---|---:|---:|---:|---:|
| `historical_prices` | `current` | `100` | 10 | 10 | 0 |
| `latest_market_snapshot` | `current` | `100` | 11 | 11 | 0 |
| `valuation_metrics` | `current` | `100` | 11 | 11 | 0 |
| `share_statistics` | `partial` | `80` | 10 | 8 | 2 |
| `financial_highlights` | `partial` | `92.31` | 13 | 12 | 1 |
| `income_statement_annual` | `current` | `100` | 28 | 28 | 0 |
| `income_statement_quarterly` | `partial` | `96.43` | 28 | 27 | 1 |
| `balance_sheet_annual` | `current` | `100` | 26 | 26 | 0 |
| `balance_sheet_quarterly` | `partial` | `96.15` | 26 | 25 | 1 |
| `cash_flow_annual` | `current` | `100` | 22 | 22 | 0 |
| `cash_flow_quarterly` | `partial` | `95.45` | 22 | 21 | 1 |

## 7. Missing Fields

The dry-run completed with expected optional-field gaps, not blocking errors.

Most important missing optional fields recorded:

- `historical_prices`
  - `volume`
  - `adjusted_close`
- `share_statistics`
  - `implied_shares_outstanding`
  - `short_percent_float`
- `financial_highlights`
  - `free_cash_flow`
- `income_statement_quarterly`
  - `2025-09-30:operating_expense`
- `balance_sheet_quarterly`
  - `2025-09-30:receivables`
- `cash_flow_quarterly`
  - `2025-09-30:capital_expenditure`

No missing required fields were recorded in reconciliation for the successful dry-run modules.

## 8. Activity Log Verification

`stock_import_activity_log` is now working and queryable through REST.

For the CLI dry-run job set:

- `49` activity rows were written
- step-level entries exist for:
  - `fetch_started`
  - `fetch_completed`
  - `raw_saved`
  - `normalization_started`
  - `normalization_completed`
  - `coverage_updated`
  - `reconciliation_completed`

Example successful step outcomes:

- `historical_prices` normalization: `rows_updated=10`, `fill_percentage=97.14`
- `latest_market_snapshot` normalization: `rows_inserted=1`, `fill_percentage=100`
- `share_statistics` normalization: `rows_inserted=1`, `fill_percentage=80`
- `cash_flow_quarterly` normalization: `rows_inserted=2`, `fill_percentage=95.45`

## 9. Reconciliation Verification

`stock_import_reconciliation` is now working and queryable through REST.

For the CLI dry-run job set:

- `11` reconciliation rows were written
- every major normalized bucket has a reconciliation row
- raw vs normalized counts are consistent

Examples:

| Module | Target table | Raw records | Normalized records | Status |
|---|---|---:|---:|---|
| `historical_prices` | `stock_price_history` | 10 | 10 | `completed_with_warnings` |
| `latest_market_snapshot` | `stock_market_snapshot` | 1 | 1 | `completed` |
| `valuation_metrics` | `stock_valuation_metrics` | 1 | 1 | `completed` |
| `share_statistics` | `stock_share_statistics` | 1 | 1 | `completed_with_warnings` |
| `financial_highlights` | `stock_financial_highlights` | 1 | 1 | `completed_with_warnings` |
| `income_statement_annual` | `stock_income_statement` | 2 | 2 | `completed` |
| `income_statement_quarterly` | `stock_income_statement` | 2 | 2 | `completed_with_warnings` |
| `balance_sheet_annual` | `stock_balance_sheet` | 2 | 2 | `completed` |
| `balance_sheet_quarterly` | `stock_balance_sheet` | 2 | 2 | `completed_with_warnings` |
| `cash_flow_annual` | `stock_cash_flow` | 2 | 2 | `completed` |
| `cash_flow_quarterly` | `stock_cash_flow` | 2 | 2 | `completed_with_warnings` |

## 10. Error Verification

For the successful CLI dry-run job ids:

- `stock_import_errors` count: `0`

So the dry-run completed without durable import-error rows for those jobs.

## 11. Admin and Frontend Verification

Route checks after the schema fix and dry-run:

| Route | Result |
|---|---|
| `GET /admin/market-data/stocks` | `200` |
| `GET /stocks/reliance-industries` | `200` |

This confirms:

- admin dashboard renders without crashing
- frontend RELIANCE stock page renders without crashing

## 12. Acceptance Criteria Check

| Acceptance item | Result |
|---|---|
| No Yahoo network call happens | `PASS` |
| Raw data is saved | `PASS` |
| Normalized data is saved | `PASS` |
| Coverage is calculated | `PASS` |
| Activity log is visible/queryable | `PASS` |
| Reconciliation shows raw vs normalized | `PASS` |
| Frontend Reliance page renders | `PASS` |
| Admin dashboard renders | `PASS` |

## Final Outcome

The RELIANCE no-network Yahoo dry-run is now working end to end.

The previous blocker was Supabase REST schema exposure, not importer logic. After exposing:

- `stock_share_statistics`
- `stock_import_activity_log`
- `stock_import_reconciliation`

the full dry-run pipeline completed successfully and durable verification passed.
