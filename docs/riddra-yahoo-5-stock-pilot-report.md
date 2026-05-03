# Riddra Yahoo 5-Stock Pilot Report

Last verified: 2026-04-28

## Scope

Requested 5-stock controlled Yahoo Finance pilot:

- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`
- `HDFCBANK.NS`
- `ICICIBANK.NS`

Requested modules:

1. `historical_prices`
2. `quote_statistics`
3. `financial_statements`

Requested safety settings:

- `1 request/second`
- `1 worker only`
- import only missing data where possible
- no repeated full reimport if rows already exist

## Preflight Result

### Pilot execution decision

The live 5-stock Yahoo import was **not run**.

Reason:

- the target Yahoo tables are still not queryable through the live Supabase API path used by the app
- running a write test in this state would not be production-safe

### Blocking database errors

All of these live checks returned `PGRST205`:

- `public.stocks_master`
- `public.raw_yahoo_imports`
- `public.stock_price_history`
- `public.stock_market_snapshot`
- `public.stock_valuation_metrics`
- `public.stock_financial_highlights`
- `public.stock_income_statement`
- `public.stock_balance_sheet`
- `public.stock_cash_flow`
- `public.stock_import_coverage`
- `public.stock_import_errors`
- `public.stock_import_jobs`
- `public.stock_import_job_items`

Interpretation:

- either migrations `0044` to `0047` have not been applied to the target database
- or the tables exist in Postgres but are not exposed through the current Supabase/PostgREST schema cache

For this pilot, both cases must be treated as **not ready**.

## Symbol Mapping Readiness

The five pilot symbols do resolve in the existing durable `instruments` table:

| Yahoo symbol | Core symbol | Instrument slug | Instrument status |
|---|---|---|---|
| `RELIANCE.NS` | `RELIANCE` | `reliance-industries` | `active` |
| `TCS.NS` | `TCS` | `tcs` | `active` |
| `INFY.NS` | `INFY` | `infosys` | `active` |
| `HDFCBANK.NS` | `HDFCBANK` | `hdfc-bank` | `active` |
| `ICICIBANK.NS` | `ICICIBANK` | `icici-bank` | `active` |

So symbol mapping is available at the instrument layer, but the Yahoo-specific durable schema is still not app-visible.

## 1. Import Duration

| Metric | Result |
|---|---|
| Pilot import duration | `0` write time |
| Preflight duration | short preflight only |

Notes:

- no Yahoo write phase started
- no batch worker was started
- no retries were consumed

## 2. Success / Failure Per Stock

| Stock | Result | Reason |
|---|---|---|
| `RELIANCE.NS` | Not run | Yahoo schema preflight failed |
| `TCS.NS` | Not run | Yahoo schema preflight failed |
| `INFY.NS` | Not run | Yahoo schema preflight failed |
| `HDFCBANK.NS` | Not run | Yahoo schema preflight failed |
| `ICICIBANK.NS` | Not run | Yahoo schema preflight failed |

## 3. Rows Imported Per Table

No pilot rows were imported.

| Table | Rows imported in this pilot |
|---|---:|
| `raw_yahoo_imports` | `0` |
| `stock_price_history` | `0` |
| `stock_market_snapshot` | `0` |
| `stock_valuation_metrics` | `0` |
| `stock_financial_highlights` | `0` |
| `stock_income_statement` | `0` |
| `stock_balance_sheet` | `0` |
| `stock_cash_flow` | `0` |
| `stock_import_coverage` | `0` |
| `stock_import_errors` | `0` |
| `stock_import_jobs` | `0` |
| `stock_import_job_items` | `0` |

## 4. Raw Response Count Per Stock

No pilot fetches were started, so no raw Yahoo responses were written for this pilot.

| Stock | Raw response count in this pilot |
|---|---:|
| `RELIANCE.NS` | `0` |
| `TCS.NS` | `0` |
| `INFY.NS` | `0` |
| `HDFCBANK.NS` | `0` |
| `ICICIBANK.NS` | `0` |

## 5. Coverage Percentage Per Module

Not available for this pilot run, because the import did not start.

| Module | Coverage result |
|---|---|
| `historical_prices` | Not run |
| `quote_statistics` | Not run |
| `financial_statements` | Not run |

## 6. Missing Fields Per Module

Not available for this pilot run, because the import did not start.

| Module | Missing fields result |
|---|---|
| `historical_prices` | Not available |
| `quote_statistics` | Not available |
| `financial_statements` | Not available |

## 7. Errors and Retries

### Pilot import errors

- no importer retries were executed
- no Yahoo network requests were made
- no Yahoo job rows were created

### Blocking preflight error

- `PGRST205`: `Could not find the table 'public.<table>' in the schema cache`

This is the only reason the pilot did not proceed.

## 8. Admin Dashboard Check

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `500` |
| `/admin/market-data/yahoo-import-guide` | `200` |

Dashboard verdict:

- the Yahoo guide/help page is reachable
- the stock import dashboard itself is currently not healthy on the local server
- because of that, pilot percentage visibility could not be verified in the UI

## 9. Frontend Route Check

| Route | Result |
|---|---|
| `/stocks/reliance-industries` | `500` |
| `/stocks/tcs` | `500` |
| `/stocks/infosys` | `500` |
| `/stocks/hdfc-bank` | `500` |
| `/stocks/icici-bank` | `500` |

Frontend verdict:

- none of the checked pilot stock pages were healthy on the current local server
- frontend rendering therefore cannot be approved as part of this pilot

## 10. Recommendation Before Moving to a 50-Stock Batch

**Do not proceed to a 50-stock batch yet.**

Required next steps:

1. Apply or reapply Yahoo migrations `0044` through `0047` in the target database.
2. Refresh the Supabase/PostgREST schema visibility so the Yahoo tables are queryable by the app.
3. Re-run the Yahoo DB verification using real `select('*').limit(1)` checks.
4. Fix the local stock import dashboard route (`/admin/market-data/stocks`) so it returns `200`.
5. Fix the pilot stock frontend routes so they render without `500`.
6. Re-run a **one-stock** live Yahoo pilot first.
7. Only after that succeeds, re-run this 5-stock pilot.
8. Only after the 5-stock pilot succeeds, consider a 50-stock batch.

## Final Verdict

- 5-stock Yahoo pilot import executed: **No**
- Database ready for Yahoo writes: **No**
- Admin dashboard healthy: **No**
- Frontend pilot stock pages healthy: **No**
- Safe to move to 50 stocks: **No**
