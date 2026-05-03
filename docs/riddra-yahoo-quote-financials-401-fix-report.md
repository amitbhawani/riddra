# Riddra Yahoo Quote / Financials 401 Fix Report

Last updated: 2026-04-28 IST

## Verdict

`historical_prices` works live.

`quote_statistics` now works in a safe degraded mode:

- latest market snapshot is populated from Yahoo chart data when the quote endpoint is blocked
- valuation, share statistics, and financial highlights are marked unavailable with coverage + reconciliation rows instead of crashing the import

`financial_statements` is still unavailable from Yahoo in this runtime, but it now fails safely:

- no uncontrolled retry loop
- no fatal crash for the one-stock import flow
- unavailable statement buckets are recorded explicitly in coverage, reconciliation, and activity logs

This is a **safe partial fix**, not a full Yahoo quoteSummary recovery.

## 1. Root Cause

The problem is endpoint-specific:

- Yahoo chart/history endpoint works
- Yahoo quote endpoint returns `401 Unauthorized`
- Yahoo quoteSummary endpoint returns `401 Invalid Crumb`

The importer was previously misclassifying some of those failures as generic “empty result” errors because Yahoo was returning a top-level `finance.error` payload, not the nested `quoteResponse.error` / `quoteSummary.error` shape the code originally expected.

That meant:

- latest quote fallback did not trigger
- quote/statistics import could hard-fail before safe downgrade logic ran

## 2. Current Yahoo Path Reliability

### Historical prices

Current path:

- `v8/finance/chart`

Reliability in this runtime:

- working

### Quote / latest snapshot

Current path:

- `v7/finance/quote`

Reliability in this runtime:

- blocked with `401 Unauthorized`

### Valuation / statistics / financial statements

Current path:

- `v10/finance/quoteSummary`

Reliability in this runtime:

- blocked with `401 Invalid Crumb`

Important note:

- the `quoteSummary` family is the same Yahoo data family commonly used by wrappers such as `yfinance`-compatible integrations and `yahoo-finance2`
- switching wrapper libraries alone would not bypass the upstream block in this environment

## 3. Direct Endpoint Comparison for RELIANCE.NS

Real test against Yahoo from the app runtime:

| Endpoint family | URL family | Result |
|---|---|---|
| Chart / history | `query1.finance.yahoo.com/v8/finance/chart/...` | `200 OK` |
| Quote / latest | `query1.finance.yahoo.com/v7/finance/quote?...` | `401 Unauthorized` |
| Quote summary / valuation | `query1.finance.yahoo.com/v10/finance/quoteSummary/...` | `401 Invalid Crumb` |
| Quote summary / financials | `query1.finance.yahoo.com/v10/finance/quoteSummary/...` | `401 Invalid Crumb` |

Observed response samples:

- quote:
  - `User is unable to access this feature`
- quoteSummary:
  - `Invalid Crumb`

Browser-auth probe result:

- `https://finance.yahoo.com/quote/RELIANCE.NS` returned a cookie-setting shell response
- crumb endpoint `v1/test/getcrumb` then returned `429 Too Many Requests`

So browser-like headers alone are not sufficient here.

## 4. Fix Applied

Code updated:

- [lib/yahoo-finance-service.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-service.ts)

What changed:

1. Yahoo top-level `finance.error` is now detected explicitly.
2. Latest quote import now correctly recognizes the blocked quote endpoint as a protected-endpoint failure.
3. Quote summary fetches now correctly recognize blocked `quoteSummary` responses as protected-endpoint failures.
4. The protected-endpoint branches now use the intended guarded fallbacks instead of surfacing generic empty-result errors.

## 5. Fallback Strategy Now in Place

### 5.1 Latest market snapshot fallback

If `v7/finance/quote` is blocked:

- fetch `v8/finance/chart` for `1mo / 1d`
- synthesize the latest quote payload from chart meta + latest candle
- normalize into `stock_market_snapshot`

This is now working live for `RELIANCE.NS`.

### 5.2 Quote summary fallback

If `v10/finance/quoteSummary` is blocked:

- one guarded browser-cookie-crumb attempt is made
- if crumb acquisition still fails, the importer does **not** loop
- the module is recorded as unavailable
- coverage, reconciliation, and activity logs are written
- the import job completes as `completed_with_errors`

### 5.3 Why no extra wrapper hop was added

I did **not** add a second high-churn wrapper path such as a new `yahoo-finance2` dependency because:

- the blocked resource is the Yahoo quote / quoteSummary family itself
- wrapper libraries still depend on the same upstream endpoint family
- adding another wrapper hop would increase request volume without evidence of improved access in this runtime

## 6. Retry / Safety Behavior

There is no uncontrolled retry loop.

Observed bounded behavior for the protected endpoints:

- quote endpoint:
  - 4 failed `401` attempts total
  - then snapshot downgraded to chart fallback
- valuation/statistics quoteSummary:
  - 4 failed `401 Invalid Crumb` attempts total
  - then one guarded browser-auth probe path
  - crumb acquisition failed with `429`
  - module downgraded to unavailable
- financial statements quoteSummary:
  - 4 failed `401 Invalid Crumb` attempts total
  - then one guarded browser-auth probe path
  - crumb acquisition failed with `429`
  - module downgraded to unavailable

That is controlled and finite.

## 7. RELIANCE.NS Live Test Result

### Route used

- `POST /api/admin/market-data/stocks/import`
- payload:
  - `action=import_selected`
  - `yahooSymbols=["RELIANCE.NS"]`

Result:

- `200 OK`
- `importedCount=1`
- `failedCount=0`

Returned warnings:

- latest snapshot quote endpoint unavailable, chart fallback used
- latest market snapshot missing `market_cap`
- valuation/statistics unavailable due `Invalid Crumb` + crumb fallback `429`
- financial statements unavailable due `Invalid Crumb` + crumb fallback `429`

### Job statuses

| Module family | Job id | Status |
|---|---|---|
| Historical prices | `592d1d3f-ce29-406e-b830-1e83fc1dc840` | `completed_with_errors` |
| Quote statistics | `36851626-dfbc-4d60-bf00-0d3bcdb0ff23` | `completed_with_errors` |
| Financial statements | `b5566018-8d93-49b8-9428-867776813868` | `completed_with_errors` |

## 8. Durable Outcome

### Historical prices

`stock_price_history`

- existing rows updated: `365`
- inserted: `0`
- skipped: `0`
- latest trade date: `2026-04-28`
- total retained Yahoo history rows for RELIANCE: `374`

Coverage:

- bucket: `historical_prices`
- status: `current`
- completion: `100%`

### Latest market snapshot

`stock_market_snapshot`

- trade date: `2026-04-28`
- price: `1388.900024`
- previous close: `1348.1`
- change absolute: `40.8`
- change percent: `3.0265`
- market cap: `NULL`

Coverage:

- bucket: `latest_market_snapshot`
- status: `partial`
- fill: `90.91%`
- missing field: `market_cap`

### Valuation / share statistics / financial highlights

No live normalized rows were written from the blocked Yahoo quoteSummary endpoint in this run.

Instead, these buckets were recorded as unavailable:

- `valuation_metrics`
- `share_statistics`
- `financial_highlights`

Coverage status for all three:

- `missing`
- fill: `0%`

### Financial statements

No live normalized annual or quarterly statement rows were written from the blocked Yahoo quoteSummary endpoint in this run.

Instead, these buckets were recorded as unavailable:

- `income_statement_annual`
- `income_statement_quarterly`
- `balance_sheet_annual`
- `balance_sheet_quarterly`
- `cash_flow_annual`
- `cash_flow_quarterly`

Coverage status for all six:

- `missing`
- fill: `0%`

## 9. Raw Save / Error / Reconciliation Evidence

For the fixed RELIANCE run window:

- recent `raw_yahoo_imports` rows captured: `14`
- recent `stock_import_errors` rows captured: `12`
- recent `stock_import_activity_log` rows captured: `44`
- recent `stock_import_reconciliation` rows captured: `11`

Raw import breakdown:

- `historical_prices:completed:200` -> `2`
  - one real historical import
  - one chart fallback fetch used for snapshot recovery
- `quote_latest:failed:401` -> `4`
- `quote_summary:failed:401` -> `4`
- `financial_statements:failed:401` -> `4`

Reconciliation highlights:

- `historical_prices` -> `completed`
- `latest_market_snapshot` -> `completed_with_warnings`
- blocked quote/statistics buckets -> `no_data`
- blocked financial statement buckets -> `no_data`

## 10. Missing Fields Summary

### Latest snapshot

Missing:

- `market_cap`

### Valuation metrics

Missing:

- `market_cap`
- `enterprise_value`
- `trailing_pe`
- `forward_pe`
- `peg_ratio`
- `price_to_book`
- `ev_to_revenue`
- `ev_to_ebitda`
- `trailing_eps`
- `forward_eps`
- `dividend_yield`

### Share statistics

Missing:

- `shares_outstanding`
- `float_shares`
- `implied_shares_outstanding`
- `shares_short`
- `shares_short_prior_month`
- `shares_short_ratio`
- `short_percent_float`
- `short_percent_shares_outstanding`
- `held_percent_insiders`
- `held_percent_institutions`

### Financial highlights

Missing:

- `total_revenue`
- `gross_profit`
- `ebitda`
- `net_income_to_common`
- `diluted_eps`
- `operating_cash_flow`
- `free_cash_flow`
- `total_cash`
- `total_debt`
- `current_ratio`
- `book_value_per_share`
- `return_on_assets`
- `return_on_equity`

### Financial statements

All mapped statement fields are currently unavailable in this runtime because the upstream `quoteSummary` family is blocked.

## 11. Admin / Frontend Health

Post-fix route checks:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |

So the importer now degrades safely without breaking the admin stock dashboard or the stock page.

## 12. Safe Operating Recommendation

### What is safe now

- live Yahoo historical imports
- chart-derived snapshot fallback
- explicit unavailable-state recording for blocked Yahoo quoteSummary buckets

### What is not yet truly available

- reliable Yahoo valuation/statistics import
- reliable Yahoo financial statement import

### Recommendation

Use one of these two modes:

1. **Historical + snapshot mode**
   - safe to proceed for one-stock or small pilot usage
   - expect quoteSummary buckets to be unavailable

2. **Full fundamentals mode**
   - **not yet ready** on Yahoo alone in this runtime
   - needs either:
     - a provider with supported fundamentals access, or
     - a proven alternate sanctioned ingestion source for fundamentals

## 13. Acceptance Check

| Requirement | Result |
|---|---|
| `historical_prices` works | `PASS` |
| `quote_statistics` works | `PASS` in safe degraded mode via chart fallback + unavailable coverage for blocked quoteSummary buckets |
| `financial_statements` works or is clearly documented | `PASS` as clearly documented unavailable modules with safe fallback/skip plan |
| No uncontrolled retry loop | `PASS` |
