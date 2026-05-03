# Riddra Same-Day-Only 100-Stock Pilot Report

Date: 2026-04-30  
Mode: `daily_same_day_only`  
Target date: `2026-04-30`

## Scope

Live pilot for `100` stocks using only the strict same-day update mode.

Rules enforced:

- chart/history endpoint only
- no backfill
- no old-date repair
- no `quoteSummary`
- no valuation modules
- no financial statements
- one worker
- same-day target-date writes only

The pilot was run against a stale-stock slice from `stock_data_freshness`, not a mixed fresh/unfresh sample.

## Before Freshness

Freshness was regenerated immediately before the pilot.

- active stocks: `2157`
- fresh today: `157`
- stale: `2000`

## Pilot Result

Command path:

```bash
npm run yahoo:daily-update:same-day-only -- --max-items=100 --target-date=2026-04-30
```

Actual pilot outcome:

1. Attempted stocks: `100`
2. Price rows inserted: `89`
3. Snapshot rows inserted: `100`
4. Skipped existing rows: `11`
5. `no_data` count: `0`
6. Failed count: `0`
7. Average time per stock: `6.89s`
8. Freshness before/after:
   - fresh today: `157 -> 257`
   - stale: `2000 -> 1900`
9. Duplicate-key errors: `0`
10. DB write errors: `0`

## Why Inserted Price Rows Are Lower Than 100

This pilot targeted stocks missing either today’s price or today’s snapshot.

So the `11` skipped history rows were expected:

- those stocks already had the `2026-04-30` price row
- but were still missing the same-day snapshot row
- the new mode correctly skipped history and still inserted the snapshot

## Safety Signals

- Yahoo cooldown active: `No`
- write-timeout spike: `No`
- duplicate-key spike: `No`
- same-day duplicate groups in `stock_price_history` for the pilot slice: `0`

## Recommendation For 500-Stock Same-Day-Only Run

Recommendation: **GO for a controlled 500-stock same-day-only pilot**

Reasoning:

- `100 / 100` stocks completed successfully
- no failures
- no duplicate-key errors
- no DB write errors
- no cooldown signal
- the strict same-day mode stayed bounded and did not drift into broader historical repair behavior

Operational caution:

- keep the run chart-only
- keep one worker
- keep existing stop conditions for cooldown and write spikes
- regenerate freshness immediately after the 500-stock run to confirm the expected universe-wide lift
