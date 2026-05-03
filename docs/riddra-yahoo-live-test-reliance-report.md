# Riddra Yahoo Live Test Report: RELIANCE.NS

Last verified: 2026-04-28

## Scope

This report covers a controlled live Yahoo Finance import test request for one stock only:

- Yahoo symbol: `RELIANCE.NS`

Requested paths:

1. Historical daily price import
2. Quote/statistics import
3. Financial statements import
4. Full sample stock import if safe

This report documents the preflight outcome and whether the live import was actually run.

## Preflight Requirement

Before running the live import, the Yahoo schema had to be confirmed as applied and queryable by the app.

The live check used the target Supabase API path with the service-role client and real:

- `select('*').limit(1)`

queries against the Yahoo tables required by the importer.

## Preflight Result

### Yahoo schema readiness

**Failed**

The target DB is still not app-ready for Yahoo imports.

These tables all returned `PGRST205` (`Could not find the table 'public.<table>' in the schema cache`):

- `raw_yahoo_imports`
- `stock_price_history`
- `stock_market_snapshot`
- `stock_valuation_metrics`
- `stock_financial_highlights`
- `stock_income_statement`
- `stock_balance_sheet`
- `stock_cash_flow`
- `stock_import_coverage`
- `stock_import_errors`

### Preflight decision

Because the Yahoo schema is not queryable through the live app path, the controlled live Yahoo import was **not run**.

This is intentional and production-safe:

- no partial import attempt
- no false success
- no write attempt into an unready schema

## Import Execution Status

| Path | Status | Reason |
|---|---|---|
| Historical daily price import | Not run | Preflight schema check failed |
| Quote/statistics import | Not run | Preflight schema check failed |
| Financial statements import | Not run | Preflight schema check failed |
| Full sample stock import | Not run | Not safe while Yahoo schema is not queryable |

## Post-Import Verification

Because the live import was not run, the following verification targets remain **not testable in this run**:

1. `raw_yahoo_imports` contains raw responses
2. `stock_price_history` has historical rows
3. `stock_market_snapshot` has latest data
4. `stock_valuation_metrics` has mapped fields
5. `stock_financial_highlights` has mapped fields
6. `stock_income_statement` has annual and/or quarterly rows
7. `stock_balance_sheet` has annual and/or quarterly rows
8. `stock_cash_flow` has annual and/or quarterly rows
9. `stock_import_coverage` has bucket-wise coverage percentages
10. `stock_import_errors` has no critical failures

## Live Test Metrics

| Metric | Result |
|---|---|
| Total rows imported | `0` |
| Missing Yahoo fields | `N/A` |
| Module-wise fill percentage | `N/A` |
| Null-heavy buckets | `N/A` |
| Critical import failures recorded | `N/A` because import was not run |

## Frontend Route Check

| Route | Result |
|---|---|
| `/stocks/reliance-industries` | `500` on the current local server |

Notes:

- This route check was performed separately from the Yahoo import preflight.
- The `500` result means the local frontend runtime is not currently healthy for this stock page check.
- This does **not** change the Yahoo import preflight result, which was already blocked by missing/unqueryable Yahoo tables.

## Admin Dashboard Check

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |

Notes:

- The admin stock import dashboard route is reachable on the current local server.

## Safety Verdict

The requested live Yahoo import test for `RELIANCE.NS` was **not executed** because the schema precondition failed.

That is the correct safe behavior.

## What Must Happen Before Retesting

1. Apply or reapply Yahoo migrations:
   - `0044_yahoo_finance_schema_foundation.sql`
   - `0045_yahoo_raw_import_metadata_columns.sql`
   - `0046_stock_price_history_yahoo_daily_unique.sql`
   - `0047_stock_market_snapshot_nullable_price.sql`
2. Refresh Supabase/PostgREST schema visibility if the tables already exist in Postgres.
3. Re-run a live readiness check using real `select('*').limit(1)` table reads.
4. Only after that, run the one-stock live Yahoo import for `RELIANCE.NS`.
5. Re-check `/stocks/reliance-industries` after the local frontend runtime issue is resolved.

## Final Verdict

- Yahoo schema preflight passed: **No**
- Live RELIANCE Yahoo import run: **No**
- Post-import Yahoo normalization verified: **No**
- Admin dashboard reachable: **Yes**
- Reliance frontend route healthy on current local server: **No**

Live Yahoo import testing for `RELIANCE.NS` should be retried only after the Yahoo schema becomes queryable through the app’s target database path.
