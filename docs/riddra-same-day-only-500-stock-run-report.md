# Riddra Same-Day-Only 500-Stock Staged Run Report

Date: 2026-04-30  
Mode: `daily_same_day_only`  
Target date: `2026-04-30`

## Scope

Staged same-day-only Yahoo update for `500` stale stocks with:

- only stocks missing target-date price or snapshot
- `daily_same_day_only` mode only
- one worker
- chart/history only
- no quoteSummary
- no fundamentals
- batch size `100`
- `5` minute pause between batches
- stop on cooldown or write spike

## Before Freshness

- total stocks: `2157`
- fresh: `257`
- stale: `1900`
- missing today price: `1889`
- missing today snapshot: `1900`

## Batch Results

### Batch 1

1. Attempted: `100`
2. Completed: `100`
3. Skipped: `10`
4. `no_data`: `0`
5. Failed: `0`
6. Freshness count:
   - fresh: `357`
   - stale: `1800`
   - missing today price: `1799`
   - missing today snapshot: `1800`
7. Errors: `0`
8. Cooldown status: `No`

### Batch 2

1. Attempted: `100`
2. Completed: `100`
3. Skipped: `1`
4. `no_data`: `0`
5. Failed: `0`
6. Freshness count:
   - fresh: `457`
   - stale: `1700`
   - missing today price: `1700`
   - missing today snapshot: `1700`
7. Errors: `0`
8. Cooldown status: `No`

### Batch 3

1. Attempted: `100`
2. Completed: `100`
3. Skipped: `0`
4. `no_data`: `0`
5. Failed: `0`
6. Freshness count:
   - fresh: `557`
   - stale: `1600`
   - missing today price: `1600`
   - missing today snapshot: `1600`
7. Errors: `0`
8. Cooldown status: `No`

### Batch 4

1. Attempted: `100`
2. Completed: `100`
3. Skipped: `0`
4. `no_data`: `0`
5. Failed: `0`
6. Freshness count:
   - fresh: `657`
   - stale: `1500`
   - missing today price: `1500`
   - missing today snapshot: `1500`
7. Errors: `0`
8. Cooldown status: `No`

### Batch 5

1. Attempted: `100`
2. Completed: `100`
3. Skipped: `0`
4. `no_data`: `0`
5. Failed: `0`
6. Freshness count:
   - fresh: `757`
   - stale: `1400`
   - missing today price: `1400`
   - missing today snapshot: `1400`
7. Errors: `0`
8. Cooldown status: `No`

## Overall Result

- batches run: `5 / 5`
- attempted stocks: `500`
- completed stocks: `500`
- failed stocks: `0`
- skipped existing history rows: `11`
- inserted price rows: `489`
- inserted snapshots: `500`
- duplicate-key errors: `0`
- DB write errors: `0`
- Yahoo cooldown active: `No`
- stopped early: `No`

## Freshness Improvement

- fresh stocks: `257 -> 757`
- stale stocks: `1900 -> 1400`
- missing today price: `1889 -> 1400`
- missing today snapshot: `1900 -> 1400`

## Conclusion

The staged `500`-stock same-day-only run completed successfully and stayed inside all requested safety limits.

The strict same-day mode is now proving stable at:

- `100`-stock live pilot scale
- `500`-stock staged live scale

Most important signal:

- the system improved freshness by exactly `500` stocks without triggering cooldowns, duplicate-key failures, or DB write spikes.
