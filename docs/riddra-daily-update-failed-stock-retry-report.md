# Riddra Daily Update Failed Stock Retry Report

Last updated: 2026-04-30

## Scope

This report covers the two failed stocks from the 25-stock Yahoo daily chart-update pilot:

- `3MINDIA.NS`
- `ABBOTINDIA.NS`

The reported failure was a Supabase write timeout on `stock_price_history`, not Yahoo blocking.

## Root finding

The historical writer in [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts) was still doing one large `insert(newRows)` for missing daily history rows in `skip_existing_dates` mode, and one large `upsert(payloadRows)` in replace mode.

That is safe logically, but it is vulnerable to write timeouts when the missing window is still large enough.

## Fix applied

I changed the historical persistence path to write in smaller chunks instead of one large insert/upsert:

- added `chunkArray(...)`
- added `getYahooHistoricalWriteBatchSize()`
- default batch size: `250`
- env override supported: `YAHOO_HISTORICAL_WRITE_BATCH_SIZE`

For the targeted recovery, I used:

- `YAHOO_HISTORICAL_WRITE_BATCH_SIZE=100`

## Before retry

### 3MINDIA.NS

- stock slug: `3m-india-limited`
- historical rows before retry: `6017`
- earliest historical date: `2002-07-01`
- latest historical date before retry: `2026-04-29`
- recent 1-month missing dates: `1`
  - `2026-04-30`
- duplicate `stock_price_history` dates: `0`
- snapshots already present:
  - `2026-04-28`
  - `2026-04-29`

Interpretation:

- this was effectively a near-complete historical set
- the failed pilot left only the newest daily bar missing

### ABBOTINDIA.NS

- stock slug: `abbott-india-limited`
- historical rows before retry: `285`
- earliest historical date: `2002-09-01`
- latest historical date before retry: `2026-04-28`
- recent 1-month window had only `2` stored dates:
  - `2026-04-01`
  - `2026-04-28`
- recent 1-month missing dates: `19`
- duplicate `stock_price_history` dates: `0`
- snapshots already present:
  - `2026-04-28`
  - `2026-04-29`

Interpretation:

- this stock had a genuinely incomplete recent historical window
- the failure was not a duplicate issue
- it was a partial historical freshness gap

## Retry executed

I ran a targeted missing-only historical repair for just these two stocks:

- `3MINDIA.NS`
- `ABBOTINDIA.NS`

Behavior:

- chart/history endpoint only
- no quoteSummary
- no financial statements
- no larger batch
- missing-only insert logic
- small write batches of `100`

Inserted rows:

- `3MINDIA.NS` -> `1`
- `ABBOTINDIA.NS` -> `19`

## After retry

### 3MINDIA.NS

- historical rows after retry: `6018`
- earliest historical date: `2002-07-01`
- latest historical date after retry: `2026-04-30`
- recent 1-month window rows: `21`
- duplicate recent-window dates: `0`
- snapshots still present:
  - `2026-04-28`
  - `2026-04-29`

### ABBOTINDIA.NS

- historical rows after retry: `304`
- earliest historical date: `2002-09-01`
- latest historical date after retry: `2026-04-30`
- recent 1-month window rows: `21`
- duplicate recent-window dates: `0`
- snapshots still present:
  - `2026-04-28`
  - `2026-04-29`

## Duplicate protection verification

Confirmed:

- no duplicate `stock_price_history` rows were created for the repaired recent window
- no duplicate `stock_market_snapshot` dates exist for either stock

## Notes

### Partial rows

- `3MINDIA.NS` had effectively completed historical data already, with only the latest recent bar missing
- `ABBOTINDIA.NS` had incomplete recent history before retry and is now repaired for the daily-update window

### Snapshot status

Both stocks already had snapshot rows before the retry, so the recovery work focused on `stock_price_history`.

### Batch script issue

The direct CLI batch script path is currently broken in this environment because Node is trying to execute the TypeScript batch module directly and cannot resolve the `@/` alias outside the Next runtime. The historical data repair itself is complete, but that script should be fixed separately before it is relied on for manual operator reruns.

## Files changed

- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [docs/riddra-daily-update-failed-stock-retry-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-daily-update-failed-stock-retry-report.md)

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Conclusion

The two-stock retry is successful.

- the Supabase write-timeout risk has been reduced by chunked historical writes
- `3MINDIA.NS` is now current through `2026-04-30`
- `ABBOTINDIA.NS` now has a repaired recent 1-month daily window through `2026-04-30`
- no duplicate daily history rows were created
- snapshots exist for both stocks
