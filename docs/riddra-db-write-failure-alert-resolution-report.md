# Riddra DB Write-Failure Alert Resolution Report

Date: 2026-04-30
Project: `jawojjmapxnevywrmmiq`

## Objective

Investigate the recent DB write-timeout condition that is currently blocking cron readiness for the Yahoo daily chart update lane.

Focus:

- recent `stock_import_errors` in the last 24 hours
- write-timeout style failures
- affected stocks and modules
- whether the failures are still active or already repaired
- whether `ABBOTINDIA.NS` and `3MINDIA.NS` retries cleared the issue
- whether activity and reconciliation now show completion

## Summary

The recent DB write-timeout condition is **not an active live outage anymore**.

What remains is a **monitoring false-positive / stale-error gating problem**:

- only `4` relevant write-timeout error rows exist in the last 24 hours
- all `4` belong to the two known pilot stocks:
  - `3MINDIA.NS`
  - `ABBOTINDIA.NS`
- both stocks now have repaired historical data with latest date `2026-04-30`
- both stocks also have snapshot rows present
- there are **no active durable `stock_import_alerts` rows** to resolve

The current cron blocker is therefore **not an unresolved DB write failure**, but the fact that the control-center logic still treats any recent timeout row as active even after the stock was successfully repaired.

## Recent error audit

Window checked:

- last 24 hours

Recent `stock_import_errors` count:

- `4`

Write-timeout style failures found:

- `4`

Grouped result:

```json
[
  {
    "symbol": "ABBOTINDIA",
    "bucketKey": "historical_prices",
    "errorStage": "batch_worker",
    "count": 1,
    "latestCreatedAt": "2026-04-30T02:33:04.612+00:00"
  },
  {
    "symbol": "ABBOTINDIA",
    "bucketKey": "historical_prices",
    "errorStage": "historical_import",
    "count": 1,
    "latestCreatedAt": "2026-04-30T02:33:01.510+00:00"
  },
  {
    "symbol": "3MINDIA",
    "bucketKey": "historical_prices",
    "errorStage": "batch_worker",
    "count": 1,
    "latestCreatedAt": "2026-04-30T02:29:04.071+00:00"
  },
  {
    "symbol": "3MINDIA",
    "bucketKey": "historical_prices",
    "errorStage": "historical_import",
    "count": 1,
    "latestCreatedAt": "2026-04-30T02:29:03.199+00:00"
  }
]
```

Error message pattern:

- `Could not insert stock_price_history rows. Error: Supabase admin request timed out after 8000ms.`

## Durable alerts audit

Current `stock_import_alerts` rows:

- `0`

Meaning:

- there are no open durable alert rows to resolve
- the cron block is coming from computed monitoring logic, not from an unresolved alert record stored in the table

## Stock-level repair verification

### 3MINDIA.NS

Current state:

- `stock_price_history` latest dates include:
  - `2026-04-30`
  - `2026-04-29`
  - `2026-04-28`
- historical row count: `6018`
- `stock_market_snapshot` rows present for:
  - `2026-04-29`
  - `2026-04-28`

Observed outcome:

- the earlier historical write timeout occurred around `2026-04-30T02:29:03Z`
- data is now repaired at the table level
- latest snapshot fallback also completed successfully later

Activity / reconciliation:

- latest snapshot shows clean completion and reconciliation
- historical repair is visible in table data
- but there is **no newer historical completion activity/reconciliation row after the timeout** in the durable activity stream

### ABBOTINDIA.NS

Current state:

- `stock_price_history` latest dates include:
  - `2026-04-30`
  - `2026-04-29`
  - `2026-04-28`
- historical row count: `304`
- `stock_market_snapshot` rows present for:
  - `2026-04-29`
  - `2026-04-28`

Observed outcome:

- the earlier historical write timeout occurred around `2026-04-30T02:33:01Z`
- data is now repaired at the table level
- latest snapshot fallback completed successfully later

Activity / reconciliation:

- latest snapshot shows clean completion and reconciliation
- historical repair is visible in table data
- but there is **no newer historical completion activity/reconciliation row after the timeout** in the durable activity stream

## What this means

From a real operational perspective:

- the two failing stocks were repaired
- no broader Yahoo block or DB outage is visible in these results
- no new write-timeout cluster beyond those two stocks exists in the last 24 hours

So the DB write-failure condition is **stale at the data layer**.

However, from the current control-center logic perspective, the condition still reads as unhealthy because the code currently uses recent raw error presence as a direct red flag.

## Why cron is still blocked

Current logic in:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`

Current behavior:

- recent `stock_import_errors` are scanned
- if the message includes patterns like:
  - `could not insert stock_price_history`
  - `timed out`
  - `write`
- then `hasDbWriteFailures` becomes `true`

That logic does **not** check whether:

- the same stock was later repaired
- the missing rows were later inserted
- a follow-up activity or reconciliation completed
- the error is only historical evidence, not an active condition

## Exact fix needed

### Fix 1: compute unresolved DB write failures, not raw recent failures

Update the control-center health logic so DB write failure alerts only stay active when the failure is unresolved.

Recommended rule:

1. Group recent write-timeout errors by:
   - `stock_id`
   - `bucket_key`
   - `error_stage`
2. For each grouped failure, check for recovery evidence after the error timestamp:
   - a later successful historical completion activity row for that stock
   - or a later reconciliation row
   - or the required target data now exists in `stock_price_history`
3. Only count the error as active if no later repair evidence exists.

For the current chart-only lane, practical recovery evidence can be:

- `stock_price_history` has the expected latest date for that stock after the failure window
- or a later `historical_prices` `normalization_completed` / `coverage_updated` / `reconciliation_completed` activity exists

### Fix 2: ensure repair paths emit durable completion evidence

The targeted repair path that fixed `3MINDIA.NS` and `ABBOTINDIA.NS` repaired the data successfully, but it did not fully update the historical activity/reconciliation evidence in a way that supersedes the older failure rows.

Recommended improvement:

- make the repair/retry path always write:
  - historical completion activity
  - coverage update
  - reconciliation completion

That way, recovery is visible in the durable operator timeline and health logic can reason from explicit success events instead of only raw table state.

## Resolve / mark alerts

Result:

- no `stock_import_alerts` rows existed for this condition
- therefore there was nothing to mark resolved in the durable alert table

So the correct resolution for this investigation is:

- **do not mutate `stock_import_alerts`**
- fix the control-center resolution logic instead

## Final conclusion

### DB write-failure status

- **Resolved at the data level**

### Durable alert status

- **No open alert rows exist**

### Monitoring status

- **Still incorrectly treated as active by current control-center logic**

### Cron recommendation from this specific issue

- **This DB write-failure condition alone should no longer block cron**

### But before enabling cron

The control-center health logic should be updated so it:

- ignores stale resolved write-timeout rows
- or marks them resolved when later repair evidence exists

Without that fix, cron readiness can still show false `No-Go` signals even though the underlying data problem has already been repaired.
