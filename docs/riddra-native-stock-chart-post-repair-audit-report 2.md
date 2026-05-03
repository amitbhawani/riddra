# Riddra Native Stock Chart Post-Repair Audit Report

Date: 2026-05-01  
Scope: post-quarantine / post-repair verification attempt for the known `2026-04-30` same-day candle corruption

## Executive Summary

The intended post-repair native chart audit could not complete because the quarantine-first repair flow could not start.

Reason:

- the connected Supabase REST runtime still reports `public.market_data_row_quarantine` as missing from schema cache

As a result:

- no quarantine rows were inserted
- no `daily_same_day_only` repair reimport was run
- no repaired rows exist yet to audit

## Quarantine Runtime Check

Direct service-role runtime verification returned:

```json
{
  "error": "Could not find the table 'public.market_data_row_quarantine' in the schema cache",
  "count": null,
  "sample": null
}
```

Because quarantine is a hard prerequisite for this repair lane, the repair flow was not run unsafely.

## Native Chart Recheck

I reran narrow `1D` native chart checks against localhost for three of the known affected symbols:

1. `/api/stocks/reliance-industries/chart?range=1D`
2. `/api/stocks/tcs/chart?range=1D`
3. `/api/stocks/20-microns-limited/chart?range=1D`

All three still returned the same suspicious `2026-04-30` candle:

- `open = 1343.6`
- `high = 1356.8`
- `low = 1337.2`
- `close = 1350.75`
- `adjustedClose = null`
- `volume = 5320000`

Observed symbols still sharing the same returned candle:

- `RELIANCE`
- `TCS`
- `20MICRONS`

## Current Verdict

- quarantine system code path: ready
- live quarantine table visibility through app/runtime: blocked
- repair execution: not performed
- suspicious shared RELIANCE fixture candle removed: no
- native chart post-repair audit status: blocked / fail

## Required Unblock

Before the real 40-symbol quarantine-and-repair flow can proceed, the connected runtime must be able to query:

- `public.market_data_row_quarantine`

After that, rerun:

- [scripts/quarantine-and-repair-same-day-candles.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/quarantine-and-repair-same-day-candles.mjs)

Then repeat the native chart audit to confirm:

1. quarantined rows are hidden from chart reads
2. repaired rows are symbol-specific
3. no suspicious shared RELIANCE fixture candle remains
