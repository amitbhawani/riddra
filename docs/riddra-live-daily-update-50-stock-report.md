# Riddra Live Daily Update 50-Stock Report

Date: 2026-04-30
Job ID: `46fbfe76-7115-496d-b822-f335adc05edb`
Scope: `50` active NSE stocks from `stocks_master`
Mode: live Yahoo daily chart update

## Run Configuration

- Endpoint scope: `chart/history` only
- Snapshot mode: chart fallback only
- Protected modules: disabled
- Workers: `1`
- Request pacing: `1 request every 3 seconds`
- Same-day skip mode: enabled
- History write batching: hardened smaller-batch path active
- Auto-stop triggers monitored:
  - Yahoo cooldown
  - write-timeout spike

## Final Outcome

- Job status: `completed_with_errors`
- Completed at: `2026-04-30T10:26:52.05+00:00`
- Duration: about `20m 18s`
- Cooldown triggered: `No`
- Yahoo block signal: `No`
- Requests avoided: `0`
- Existing data reused: `7251`

## Processed Stocks

- Total stocks in pilot: `50`
- Historical item results:
  - `4` imported
  - `28` warning
  - `18` failed
- Snapshot item results:
  - `50` warning
  - `0` failed

Stock-level rollup:
- Completed stocks: `32`
- Failed stocks: `18`
- Skipped stocks: `0`

## Row-Level Results

Aggregated from durable `stock_import_job_items.normalized_row`:

- Total inserted rows: `67592`
- Total skipped rows: `7251`
- Total updated rows: `0`

Historical rows:
- Inserted: `67592`
- Skipped/reused: `7251`
- Updated: `0`

Snapshot rows:
- Same-day snapshot coverage after pilot: `50 / 50` pilot stocks
- Snapshot warning items: `50`
- Snapshot failures: `0`

Note:
- The quote/snapshot lane records field-fill reports and warning state, but this pilot’s durable item payloads did not expose inserted/skipped row counts for `stock_market_snapshot` the same way the historical lane did.
- Same-day snapshot presence was verified directly in `stock_market_snapshot` for all `50` pilot stocks.

## Write Errors

- Total write-error rows: `18`
- Error type: duplicate-key write failure, not Yahoo blocking
- Cooldown status: not triggered
- Timeout spike: not observed in this run

Exact historical failures:

1. `3MINDIA`
2. `21STCENMGM`
3. `AAATECH`
4. `360ONE`
5. `3PLAND`
6. `5PAISA`
7. `AAVAS`
8. `AARVI`
9. `AARTIDRUGS`
10. `63MOONS`
11. `AARON`
12. `20MICRONS`
13. `3IINFOLTD`
14. `AAREYDRUGS`
15. `ABCAPITAL`
16. `AARTIIND`
17. `AARTISURF`
18. `ABB`

Representative error:

`Could not insert stock_price_history rows. duplicate key value violates unique constraint "stock_price_history_unique"`

## Duplicate Check

Post-run verification for the 50-stock pilot scope:

- Duplicate `stock_price_history` groups by `stock_id + trade_date`: `0`
- Duplicate `stock_market_snapshot` groups by `stock_id + trade_date`: `0`

Interpretation:
- The database remains clean.
- The bug is in the importer write path attempting to insert duplicate daily-history rows before the database rejects them.

## Observability Gap Found

The pilot also surfaced an observability issue:

- `stock_import_activity_log` rows for this job: `0`
- `stock_import_reconciliation` rows for this job: `0`

During the run, the importer emitted warnings consistent with a check-constraint mismatch on `stock_import_activity_log.step_name`. That means the actual market-data writes proceeded, but activity/reconciliation evidence for this job was not durably recorded.

## Route Health

- `/admin/market-data/import-control-center` -> `200`
- `/stocks/reliance-industries` -> `200`

## Operational Interpretation

What worked:

- Yahoo chart/history access stayed stable.
- Snapshot fallback path completed for all `50` stocks.
- No cooldown was triggered.
- No Yahoo `401` / `429` problem affected this chart-only run.
- Hardened write batching appears to have prevented the earlier timeout-style failure mode.

What still blocks production cron:

- `18` historical items still failed on duplicate-key writes.
- The importer is not yet fully delta-safe for this daily history lane under live mixed existing-data conditions.
- Activity log and reconciliation writes for this job were not durable, so monitoring evidence is incomplete.

## Recommendation For Cron

Cron recommendation: **NO-GO**

Reason:

1. The hardened batching fixed the earlier timeout pattern, but a duplicate-history insert bug is still active.
2. The monitoring layer is incomplete for this run because activity/reconciliation writes did not persist.
3. A production daily cron should not be enabled while the importer can still fail a large subset of stocks on duplicate-key historical writes.

## Required Fixes Before Cron Enablement

1. Fix historical daily delta logic so existing same-day history rows are skipped before insert/upsert batching reaches the database.
2. Fix the `stock_import_activity_log.step_name` constraint mismatch so live jobs write durable activity evidence again.
3. Re-run a clean daily chart pilot after both fixes.
4. Enable cron only after:
   - historical duplicate-write failures are `0`
   - activity/reconciliation rows are durably present
   - no new write-spike alert is active
