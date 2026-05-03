# Riddra Live Daily Update 50-Stock After-Fix Report

Date: 2026-04-30
Parent Job ID: `c59508ab-e07b-4905-905a-33800a17b019`
Scope: same `50`-stock live daily chart update pilot rerun after:

- duplicate-key historical write fix
- activity/reconciliation logging fix

## Run Configuration

- chart/history endpoint only
- snapshot fallback only
- no `quoteSummary`
- no valuation/fundamentals
- `1` worker
- `1` request every `3` seconds
- skip existing same-day rows
- stop on cooldown or write spike

## Final Status

- Job status: `completed_with_errors`
- Completed at: `2026-04-30T11:22:00.311+00:00`
- Cooldown triggered: `No`
- Cooldown reason: `None`
- Total import errors on this batch job: `0`

Important note:

- the final batch status is `completed_with_errors` only because one historical item kept a non-fatal weekday-gap warning
- this was **not** a duplicate-key failure
- this was **not** a cooldown/block event

## 1. Duplicate-Key Errors

- Duplicate-key errors: `0`
- Total `stock_import_errors` rows for this batch: `0`

This is the key success criterion from the retry:

- the earlier `stock_price_history_unique` failures did **not** recur

## 2. Inserted Rows

Aggregated from durable job item normalized payloads:

- Inserted rows: `5`
- Updated rows: `0`

Interpretation:

- this rerun was almost entirely delta-skip/reuse, which is the desired behavior for a same-day daily update
- only `5` genuinely missing historical rows needed to be inserted

## 3. Skipped Rows

- Skipped/reused rows: `123812`
- Existing data reused: `123862`

Batch item outcome:

- `99` skipped
- `1` warning
- `0` failed

By module:

- `historical_prices`
  - `49` skipped
  - `1` warning
- `quote_statistics`
  - `50` skipped

Skip breakdown from final batch report:

- skipped existing history: `123812`
- skipped existing snapshot: `50`
- skipped blocked module: `0`
- skipped duplicate raw response: `0`

## 4. Requests Avoided

- Saved requests avoided: `50`

Interpretation:

- all `50` snapshot requests were avoided because same-day snapshots already existed
- this is the desired anti-waste behavior for the daily snapshot lane

## 5. Activity Rows Created

Activity rows created in the pilot window across the 50 pilot stock ids:

- `550`

Step coverage:

- `fetch_started` -> `50`
- `fetch_completed` -> `50`
- `raw_saved` -> `50`
- `normalization_started` -> `50`
- `skipped_existing_history_rows` -> `50`
- `history_write_completed` -> `50`
- `normalization_completed` -> `50`
- `coverage_updated` -> `50`
- `reconciliation_completed` -> `100`
- `skipped_existing_snapshot` -> `50`

Notes:

- these counts are read using `metadata.intendedStepName` where compatibility fallback was used
- this confirms the logging mismatch from the earlier failed pilot is now resolved operationally

## 6. Reconciliation Rows Created

Reconciliation rows created in the pilot window across the 50 pilot stock ids:

- `100`

Reconciliation summary:

- `historical_prices::stock_price_history` -> `50`
- `latest_market_snapshot::stock_market_snapshot` -> `50`

This satisfies the acceptance requirement that reconciliation rows are being written again.

## 7. Freshness Impact

### Pilot-scope freshness

After regenerating durable freshness:

- pilot stocks checked: `50`
- pilot stocks with today price: `50`
- pilot stocks with today snapshot: `50`
- pilot stale count: `0`

So for the actual 50-stock pilot scope, freshness is fully healthy after the rerun.

### Global freshness

After the full-universe freshness refresh:

- total stocks: `2157`
- fresh stocks: `63`
- stale stocks: `2094`

Important interpretation:

- the pilot rerun itself succeeded
- but the refreshed global freshness view shows the overall universe is still far from daily-complete
- that means the pilot is now operationally clean, but the full daily rollout still has broad freshness work remaining

## 8. Cron Recommendation

Cron recommendation: **NO-GO**

Why:

### What passed

1. duplicate-key errors = `0`
2. activity rows > `0`
3. reconciliation rows > `0`
4. no Yahoo cooldown
5. no write-spike errors on the rerun
6. the 50-stock pilot scope is fresh for today

### What still blocks cron

1. refreshed full-universe freshness is still poor:
   - only `63 / 2157` stocks are fresh
   - `2094` are stale
2. the system is now clean for the pilot path, but not yet proven across the full daily universe at current freshness expectations
3. `0056_extend_stock_import_activity_steps.sql` should still be applied so activity rows store the exact new step names directly instead of relying on compatibility fallback metadata

## Acceptance Check

- duplicate-key errors = `0` -> PASS
- activity rows > `0` -> PASS (`550`)
- reconciliation rows > `0` -> PASS (`100`)
- no Yahoo cooldown -> PASS

## Final Conclusion

The two key application-layer fixes worked:

1. historical duplicate-key write failures were eliminated
2. activity/reconciliation logging is now durable again

So this rerun is a clear success at the 50-stock pilot level.

However, cron should still remain disabled until the team is comfortable with the current global freshness gap and the full-universe daily rollout plan.
