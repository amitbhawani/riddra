# Riddra Yahoo Real Import Report: RELIANCE.NS

Last updated: 2026-04-28 IST

## Verdict

**NO-GO** for the 5-stock Yahoo pilot right now.

The first real live RELIANCE Yahoo test proved that:

- live historical Yahoo daily import works
- raw Yahoo responses are being saved durably
- duplicate-safe history writes and coverage updates work
- admin and frontend routes stay up during and after the import attempt

But it also proved two production blockers:

- live `quote_statistics` and `financial_statements` requests for `RELIANCE.NS` are currently failing upstream with Yahoo `401` / empty-result behavior
- `stock_import_activity_log` and `stock_import_reconciliation` still return `PGRST205` from the real service-role app path, so the new observability layer is not live yet

## 1. Scope

Controlled live Yahoo import for one stock only:

- Yahoo symbol: `RELIANCE.NS`
- stock id: `1e0fab79-e038-4b74-a135-af61999090cd`
- stock slug: `reliance-industries`

Requested modules:

1. `historical_prices`
2. `quote_statistics`
3. `financial_statements`

## 2. Pre-check Result

### 2.1 Core Yahoo table visibility

Core import tables used by the live write path were queryable from the real service-role client:

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

Result:

- no `PGRST205` on those core Yahoo tables

### 2.2 Activity / reconciliation visibility

These two required observability tables are **still not available** to the live app runtime:

- `stock_import_activity_log`
- `stock_import_reconciliation`

Real service-role result:

- `PGRST205: Could not find the table 'public.stock_import_activity_log' in the schema cache`
- `PGRST205: Could not find the table 'public.stock_import_reconciliation' in the schema cache`

Result:

- pre-check = **partial pass**
- core writes were safe enough to proceed for a one-stock test
- observability acceptance was **not fully green**

### 2.3 Admin / frontend route health

Verified before and after the live attempt:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |

### 2.4 Yahoo safety guardrails

Guardrails were active with safe defaults:

- throttle: `1 request / second`
- max concurrent workers: `1`
- import only missing data: `true`
- max requests per hour: `2000`
- max requests per day: `15000`
- max retries: `3`
- failure cooldown: `45 minutes`

The batch metadata confirmed those active values during the live run.

## 3. Execution Summary

Two real live paths were exercised:

1. direct one-stock import path
2. production-safe batch path for the same stock

What happened:

- `historical_prices` completed successfully in the live path
- later batch execution saw historical coverage as current and skipped reimport, which is the correct missing-only behavior
- `quote_statistics` failed after repeated Yahoo fetch failures
- `financial_statements` failed after repeated Yahoo fetch failures
- the batch importer correctly moved into cooldown instead of continuing aggressively

## 4. Request Count

Total real Yahoo request attempts captured for this RELIANCE live test set: **9**

Breakdown:

- historical chart request: `1`
- quote latest requests: `4`
- financial statement module requests: `4`

## 5. Import Duration

| Run | Duration | Result |
|---|---:|---|
| Direct one-stock import attempt | `22.151s` | `500` because later Yahoo modules failed |
| Production-safe batch run | `42.139s` | `200` with cooldown + module failures recorded |

Batch timing notes from durable metadata:

- processed items: `3`
- processed duration total: `32324ms`
- per-item durations: `15792ms`, `713ms`, `15819ms`

## 6. Raw Responses Saved

### 6.1 Real raw imports created

`raw_yahoo_imports` rows created during the live RELIANCE test set: **9**

Breakdown:

- historical raw import: `1` successful raw response
- quote latest raw imports: `4` failed raw responses
- financial statements raw imports: `4` failed raw responses

### 6.2 Failed raw import patterns

Quote latest raw rows:

- `response_status = 401`
- `status = failed`
- message: `Yahoo Finance did not return a quote result for "RELIANCE.NS".`

Financial statement raw rows:

- `response_status = 401`
- `status = failed`
- message: `Yahoo Finance did not return quote summary modules for "RELIANCE.NS".`

## 7. Rows Inserted / Updated / Skipped Per Table

### 7.1 Historical prices

Source: `stock_import_coverage.metadata` and live historical job metadata.

| Table | Inserted | Updated | Skipped | Notes |
|---|---:|---:|---:|---|
| `stock_price_history` | `364` | `1` | `0` | Successful live historical import |
| `stock_import_coverage` | `1` coverage row updated | `-` | `-` | Bucket `historical_prices` marked current |

Live historical coverage result:

- first available date: `1996-01-01`
- last available date: `2026-04-28`
- total rows available: `365`
- total rows imported in this historical run: `365`
- total retained rows for this stock in `stock_price_history`: `374`

### 7.2 Batch follow-up behavior

The later batch run correctly skipped historical reimport:

| Module | Result | Reason |
|---|---|---|
| `historical_prices` | `skipped` | `coverage_current` |

### 7.3 Quote/statistics and financial statements

No live normalized writes completed for these target tables in this run:

| Table | Inserted | Updated | Skipped | Notes |
|---|---:|---:|---:|---|
| `stock_market_snapshot` | `0` | `0` | `0` | Yahoo quote fetch failed before normalization |
| `stock_valuation_metrics` | `0` | `0` | `0` | Yahoo quote fetch failed before normalization |
| `stock_financial_highlights` | `0` | `0` | `0` | Yahoo quote fetch failed before normalization |
| `stock_income_statement` | `0` | `0` | `0` | Yahoo financial statement fetch failed before normalization |
| `stock_balance_sheet` | `0` | `0` | `0` | Yahoo financial statement fetch failed before normalization |
| `stock_cash_flow` | `0` | `0` | `0` | Yahoo financial statement fetch failed before normalization |

### 7.4 Activity and reconciliation tables

Because these tables still fail schema lookup in the app runtime:

| Table | Result |
|---|---|
| `stock_import_activity_log` | `0` live rows written in this run via app runtime; table unavailable to PostgREST |
| `stock_import_reconciliation` | `0` live rows written in this run via app runtime; table unavailable to PostgREST |

## 8. Field Fill Percentage Per Module

### 8.1 Historical prices

Historical coverage completion from durable metadata:

- completion percentage: **100%**

Note:

- this is a coverage completion percentage, not a quote-stat field-fill report

### 8.2 Quote statistics

Live field-fill report: **not generated**

Reason:

- fetch failed before normalization
- no live `stock_market_snapshot`, `stock_valuation_metrics`, or `stock_financial_highlights` write completed

### 8.3 Financial statements

Live field-fill report: **not generated**

Reason:

- fetch failed before normalization
- no live annual or quarterly statements were normalized

## 9. Missing Fields

### 9.1 Historical prices

No required OHLCV field mapping failure occurred in the successful live historical run.

Warning recorded:

- `7547` weekday gaps detected in the Yahoo historical series

This was logged as a warning, not a hard failure.

### 9.2 Quote statistics

Missing-field output is effectively blocked by the upstream fetch failure:

- no quote result returned
- no module payload available for field mapping

### 9.3 Financial statements

Missing-field output is effectively blocked by the upstream fetch failure:

- no statement module payload returned
- no annual/quarterly payload available for field mapping

## 10. Reconciliation Status

Reconciliation is **not production-ready yet**.

Expected:

- raw count vs normalized count
- unmapped records
- missing required vs optional fields

Actual live state:

- `stock_import_reconciliation` is still missing from the PostgREST schema cache for the real app runtime
- live reconciliation rows could not be written

Status:

- **failed / unavailable**

## 11. Errors and Retries

### 11.1 Total error rows recorded

`stock_import_errors` rows for this live RELIANCE test window: **12**

Breakdown:

- financial statements:
  - `4` fetch errors (`401`)
  - `1` normalize-stage error
  - `1` batch worker error
- quote statistics:
  - `4` fetch errors (`401`)
  - `1` normalize-stage error
  - `1` batch worker error

### 11.2 Retry behavior

The importer retried safely instead of failing hard on the first provider issue.

Observed live retries:

- financial statements: `4` total fetch attempts captured
- quote latest/statistics: `4` total fetch attempts captured

### 11.3 Cooldown behavior

The batch importer correctly auto-paused after repeated Yahoo/provider failures.

Durable batch state:

- batch job id: `f2f940aa-0ec5-47fe-965b-a663825564c2`
- status: `cooling_down`
- control state: `paused`
- cooldown until: `2026-04-28T18:01:56.988Z`
- cooldown reason: `Repeated Yahoo/provider failures while importing RELIANCE.NS · quote_statistics.`
- last Yahoo error: `Yahoo Finance did not return a quote result for "RELIANCE.NS".`

## 12. Frontend Page Check

| Route | Result |
|---|---|
| `/stocks/reliance-industries` | `200` |

Observed outcome:

- page rendered without crashing
- Reliance page content was present
- missing normalized Yahoo buckets degraded gracefully into empty states instead of `500`

## 13. Admin Dashboard Check

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |

Observed outcome:

- dashboard route rendered successfully
- batch/cooldown/job metadata exists and is readable
- historical completion state is represented in durable coverage

Limitation:

- activity timeline and reconciliation detail cannot be considered complete because `stock_import_activity_log` and `stock_import_reconciliation` still return `PGRST205`

## 14. Module-by-Module Outcome

| Module | Result | Notes |
|---|---|---|
| `historical_prices` | **PASS** | Live import succeeded, `364` inserted, `1` updated, coverage current |
| `quote_statistics` | **FAIL** | Yahoo returned no quote result / `401`; no normalized writes |
| `financial_statements` | **FAIL** | Yahoo returned no statement modules / `401`; no normalized writes |

## 15. Production Readiness Assessment

### What is proven

- live Yahoo historical import works for `RELIANCE.NS`
- `raw_yahoo_imports` is capturing real live provider responses
- `stock_price_history` writes are durable and duplicate-safe
- `stock_import_coverage` updates correctly
- safety throttling, retries, and cooldown work
- frontend and admin surfaces remain up

### What is not yet proven

- live quote/statistics normalization
- live financial statement normalization
- live activity log persistence for Yahoo imports
- live reconciliation persistence for Yahoo imports

### Blocking issues before a 5-stock pilot

1. Fix `PGRST205` for:
   - `stock_import_activity_log`
   - `stock_import_reconciliation`
2. Resolve Yahoo live failures for:
   - quote result fetches for `RELIANCE.NS`
   - quote summary module fetches for `RELIANCE.NS`
3. Re-run one-stock live RELIANCE test until:
   - quote/statistics normalize successfully
   - financial statements normalize successfully
   - activity log writes succeed
   - reconciliation writes succeed

## 16. Final Recommendation

**GO** for:

- continuing controlled one-stock debugging only

**NO-GO** for:

- 5-stock pilot
- 50-stock pilot
- any larger Yahoo production rollout

Reason:

- the current live test is only partially successful
- historical import is production-usable
- quote/statistics and financial statements are not yet stable
- observability tables are still not visible from the live app runtime
