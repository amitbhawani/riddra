# Riddra Full-Universe Daily Update Manual Run Report

Date: 2026-04-30  
Scope: Manual staged Yahoo daily chart update for remaining stale stocks only  
Mode: Live run, manually supervised, intentionally halted before full completion  
Cron status: Not enabled

## Executive Summary

The staged full-universe manual run was started, validated, and then intentionally stopped before completion.

Two live approaches were exercised:

1. An initial batch run using the existing `daily_chart_update` batch profile.
2. A corrected recent-only runner intended to fill just `2026-04-30` price and snapshot gaps.

Both runs proved that the chart-only Yahoo path is healthy, but both also exposed an important operational issue:

- the historical importer still drifted into `backfill_missing` behavior instead of staying strictly recent-only for a freshness catch-up run
- this makes a same-day freshness sweep far heavier and slower than intended

Because of that, I stopped the manual run instead of leaving a multi-hour live import running unsupervised.

## Run Rules Used

- only stale stocks targeted
- chart/history only
- snapshot fallback only
- no `quoteSummary`
- no valuation modules
- no financial statements
- 1 worker
- 1 request every 3 seconds
- staged in 250-stock batches
- stop on Yahoo cooldown, DB write spike, or duplicate-key errors

## Initial Freshness Before Prompt 78

- Active NSE stocks: `2157`
- Stocks with `2026-04-30` price: `63`
- Stocks with `2026-04-30` snapshot: `63`
- Stale stocks: `2094`

## Batch Report

### Batch 1A

- Batch number: `1`
- Runner: `Yahoo Full Universe Daily Update Manual Run`
- Stocks attempted: `250`
- Stocks completed: `28`
- Stocks still mid-flight when halted: `1`
- Inserted rows: `87773`
- Skipped rows: `5105`
- Failed stocks: `0` hard failures
- Errors: `0` rows in `stock_import_errors`
- Cooldown status: `Not triggered`
- Freshness after batch: not regenerated at this checkpoint

Notes:

- This first attempt used the existing `daily_chart_update` profile through batch job `8e193518-7c53-4b8e-89ac-f2c8907c849c`.
- That profile turned out to be too heavy for same-day freshness completion because it was still running large historical imports under `backfill_missing`.
- The parent batch row remains marked `running` in durable job state even though the local runner process was stopped. This is a stale control-state issue, not an active importer process.

### Batch 1B

- Batch number: `1` restart
- Runner: `Yahoo Recent-Only Daily Freshness Run`
- Stocks attempted: `64`
- Stocks completed: `63`
- Stocks still mid-flight when halted: `1`
- Inserted rows: `112777`
- Skipped rows: `11646`
- Failed stocks: `0` hard failures
- Errors: `0` rows in `stock_import_errors`
- Cooldown status: `Not triggered`
- Freshness after regeneration:
  - stocks with `2026-04-30` price: `149`
  - stocks with `2026-04-30` snapshot: `126`
  - stale stocks: `2031`

Notes:

- This second run used a purpose-built recent-only runner intended to update only missing `2026-04-30` rows.
- In practice, the historical path still inserted large numbers of older rows because the importer continued choosing `backfill_missing` for some stocks.
- Even so, the run did improve freshness materially before it was halted.

## Freshness Change During Prompt 78

Before any Prompt 78 work:

- today price: `63`
- today snapshot: `63`
- stale: `2094`

After the halted recent-only pass and freshness regeneration:

- today price: `149`
- today snapshot: `126`
- stale: `2031`

Net improvement:

- today price coverage: `+86`
- today snapshot coverage: `+63`
- stale count reduction: `-63`

## Health Checks

- Yahoo cooldown triggered: `No`
- Duplicate-key errors observed: `0`
- DB write-timeout spike observed: `No`
- `stock_import_errors` rows for these Prompt 78 runs: `0`

Sample verification from the first stale-stock slice:

- `ADROITINFO.NS` price: present for `2026-04-30`
- `ADROITINFO.NS` snapshot: present for `2026-04-30`
- `ADSL.NS` price: present for `2026-04-30`
- `ADSL.NS` snapshot: present for `2026-04-30`
- `ADVAIT.NS` price: present for `2026-04-30`
- `ADVAIT.NS` snapshot: present for `2026-04-30`
- `ADVANCE.NS` price: present for `2026-04-30`
- `ADVANCE.NS` snapshot: present for `2026-04-30`
- `ADVANIHOTR.NS` price: present for `2026-04-30`
- `ADVANIHOTR.NS` snapshot: present for `2026-04-30`

## What This Proves

- The chart-only Yahoo path is stable.
- Same-day price and snapshot rows can be added successfully for stale stocks.
- The post-fix duplicate-key bug did not recur.
- The post-fix logging/error path did not show hard failures in this manual run window.

## What Still Blocks a True Full-Universe Completion Run

The main blocker is now importer behavior, not Yahoo:

- the daily freshness path is still too eager to treat stale stocks as `backfill_missing`
- this inflates row volume dramatically
- it makes a 250-stock batch far slower than a true same-day refresh should be
- it is not practical to keep running the full `2094`-stock stale set manually in-session under the current logic

## Recommendation

Status: **Partial success, intentionally halted**

Do not treat Prompt 78 as a completed full-universe freshness run.

Recommended next step before resuming:

1. Force the freshness runner’s historical branch to stay in `update_recent` mode only for stale daily updates.
2. Re-run the remaining stale universe in the same 250-stock staged pattern.
3. Regenerate freshness after each completed batch.

Until that change is made, a full-universe manual daily catch-up remains operationally too heavy even though the Yahoo provider path itself is healthy.
