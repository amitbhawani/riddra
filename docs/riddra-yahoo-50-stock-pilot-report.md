# Riddra Yahoo 50-Stock Pilot Report

Last verified: 2026-04-28

## Scope

Requested pilot:

- 50 active NSE-style Yahoo symbols ending in `.NS`
- use the production-safe Yahoo batch importer
- safe settings:
  - `1 request per second`
  - `1 worker only`
  - `importOnlyMissingData = true`
- modules:
  - `historical_prices`
  - `quote_statistics`
  - `financial_statements`

## Preflight Verdict

The 50-stock Yahoo pilot batch import was **not run**.

There are two separate blockers:

1. the Yahoo import schema is still not queryable through the live Supabase API path used by the app
2. the current active NSE stock universe visible from `instruments` contains only **22** eligible active symbols, not 50

Because of that, a real 50-stock pilot cannot start safely or truthfully from the current system state.

## Live Yahoo Schema Check

The following required Yahoo tables still return `PGRST205`:

- `stocks_master`
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
- `stock_import_jobs`
- `stock_import_job_items`

Interpretation:

- either migrations `0044` to `0047` are not applied to the target DB
- or the tables exist in Postgres but are still not visible through the current Supabase/PostgREST schema path

For production-safe batch execution, this must be treated as **not ready**.

## Eligible Stock Universe Check

Active NSE stocks currently visible from the existing stock universe:

- total eligible active NSE instruments: **22**

So the system cannot currently satisfy a 50-stock pilot request from the visible active NSE universe alone.

### Eligible symbols currently visible

- `ASIANPAINT.NS`
- `AXISBANK.NS`
- `BAJAJ-AUTO.NS`
- `BAJFINANCE.NS`
- `BHARTIARTL.NS`
- `HCLTECH.NS`
- `HDFCBANK.NS`
- `HINDUNILVR.NS`
- `ICICIBANK.NS`
- `INFY.NS`
- `ITC.NS`
- `KOTAKBANK.NS`
- `LT.NS`
- `MARUTI.NS`
- `NTPC.NS`
- `POWERGRID.NS`
- `RELIANCE.NS`
- `SBIN.NS`
- `SUNPHARMA.NS`
- `TCS.NS`
- `TMCV.NS`
- `WIPRO.NS`

## Requested Report Metrics

Because the batch was not run, all pilot-import metrics below are either `0` or `N/A`.

## 1. Total Duration

| Metric | Result |
|---|---|
| Total pilot duration | `0` write time |
| Preflight duration | short validation only |

## 2. Average Time Per Stock

| Metric | Result |
|---|---|
| Average time per stock | `N/A` |

Reason:

- no stock import execution started

## 3. Average Requests Per Stock

| Metric | Result |
|---|---|
| Average requests per stock | `N/A` |

Reason:

- no Yahoo requests were executed in this pilot run

## 4. Estimated Time for 2,000 Stocks

| Metric | Result |
|---|---|
| Estimated time for 2,000 stocks | `Not safely computable from this blocked pilot` |

Reason:

- no actual 50-stock timing baseline was produced
- a trustworthy estimate should come from a successful pilot, not a blocked run

## 5. Success Count

| Metric | Result |
|---|---:|
| Success count | `0` |

## 6. Failure Count

| Metric | Result |
|---|---:|
| Failure count | `0` import executions |
| Blocking preflight failures | `2` categories |

Blocking categories:

1. Yahoo schema not app-visible
2. only 22 eligible active NSE symbols available instead of 50

## 7. Most Common Missing Fields

| Metric | Result |
|---|---|
| Most common missing fields | `N/A` |

Reason:

- no module normalization was run

## 8. Most Common Failed Modules

| Metric | Result |
|---|---|
| Most common failed modules | `N/A` |

Reason:

- no module execution was started

## 9. Any Yahoo Rate-Limit / Block Signals

| Metric | Result |
|---|---|
| Yahoo rate-limit or block signals during this run | `None observed in this run` |

Reason:

- no Yahoo network calls were made
- the run stopped before fetch execution

## 10. Database Growth Estimate

| Metric | Result |
|---|---|
| Database growth estimate | `N/A from this run` |

Reason:

- no rows were written
- no live sample growth baseline exists from this blocked pilot

## 11. Admin Dashboard Accuracy

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |

Interpretation:

- the admin stock import dashboard route is reachable on the current local server
- however, because the Yahoo durable tables are still not queryable, the dashboard cannot be treated as proof of live Yahoo batch readiness

## 12. Frontend Rendering Status

| Route | Result |
|---|---|
| `/stocks/reliance-industries` | `500` |

Interpretation:

- at least one core pilot stock route is currently not healthy on the local server
- frontend rendering status therefore cannot be approved for a larger Yahoo batch rollout

## 13. Final Recommendation Before 2,000-Stock Import

**Do not proceed to a 2,000-stock import.**

Required next steps:

1. Apply or reapply Yahoo migrations `0044` through `0047`.
2. Refresh Supabase/PostgREST schema visibility so Yahoo tables are queryable through the app path.
3. Re-run live verification using real `select('*').limit(1)` checks.
4. Expand the visible active NSE stock universe from 22 symbols to the actual intended pilot pool.
5. Re-run a 5-stock live pilot successfully.
6. Re-run a true 50-stock pilot successfully.
7. Only then estimate and approve a 2,000-stock batch.

## Final Verdict

- 50-stock Yahoo pilot executed: **No**
- Yahoo schema app-ready: **No**
- Eligible active NSE stock count available: **22**
- Admin stock dashboard reachable: **Yes**
- Frontend pilot stock rendering healthy: **No**
- Safe to proceed to 2,000 stocks: **No**
