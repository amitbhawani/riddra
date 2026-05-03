# Riddra Same-Day-Only Full Stale Completion Report

Date: 2026-04-30  
Mode: `daily_same_day_only`  
Target date: `2026-04-30`

## Scope

Attempt to complete the remaining stale universe after the successful `500`-stock staged same-day-only run.

Rules used:

- only stocks still missing target-date price or snapshot
- `targetDate = 2026-04-30`
- chart/history only
- no backfill
- no protected modules
- one worker
- batch size `250`
- `10` minute pause between batches
- stop on cooldown or DB/write spike

## Outcome

This run completed the fillable part of the remaining stale universe, but it did **not** drive stale count to zero.

The remaining stale set is now dominated by symbols where Yahoo did **not** expose a direct `2026-04-30` bar and only returned the latest available trading date, typically `2026-04-29`. In strict same-day-only mode, those do **not** count as fresh for `2026-04-30`.

## Summary

1. Stale before: `1400`
2. Attempted: `1267`
3. Completed: `1267`
   - completed cleanly: `947`
   - completed with latest-available-date warnings: `320`
4. Still stale: `470`
5. `no_data` symbols: `0`
6. Failed symbols: `0`
7. Provider issues:
   - distinct symbols with latest-available-date fallback warnings: `232`
   - these are not hard failures; they are Yahoo chart responses without a direct `2026-04-30` bar
8. DB issues:
   - DB write issues: `0`
   - duplicate-key issues: `0`
   - cooldown alerts: `0`
9. Final freshness count:
   - active stocks: `2157`
   - fresh: `1687`
   - stale: `470`
   - missing today price: `470`
   - missing today snapshot: `470`

## What Happened

The strict same-day-only mode behaved correctly:

- it did not drift into backfill or broader history repair
- it did not call protected Yahoo modules
- it wrote same-day rows when Yahoo exposed a direct `2026-04-30` candle
- it recorded warning completions when Yahoo only exposed `2026-04-29`
- it avoided DB spikes and duplicate-key failures

So the remaining stale set is primarily a **provider-availability** problem, not an importer or database problem.

## Provider-Issue Pattern

Representative warning pattern:

- `Target date 2026-04-30 had no direct Yahoo bar for <SYMBOL>. Used latest available trading date 2026-04-29.`

This happened repeatedly across the tail of the stale universe.

Examples seen in the final run:

- `SASTASUNDR`
- `KIRANVYPAR`
- `BRIGADE`
- `LICHSGFIN`
- `JUBLFOOD`
- `MCX`
- `COALINDIA`
- `TATAELXSI`

## Final Interpretation

This run effectively completed the **fillable same-day universe** for `2026-04-30`.

The remaining `470` stale stocks are not explained by:

- duplicate-key write bugs
- DB write spikes
- cooldown triggers
- quoteSummary/protected-module failures

They are explained by Yahoo not offering a direct target-date bar for those symbols in this runtime.
