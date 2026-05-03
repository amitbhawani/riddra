# Riddra Daily Update Stale Remainder Retry Report

Date: 2026-04-30  
Mode: Live retry, bounded manual slice  
Cron status: Not enabled

## Executive Summary

This retry pass targeted only stocks that were still stale after the earlier staged manual daily update work.

A full one-worker retry across the entire stale remainder was not practical to complete in-session because the remainder was still very large. So this was run as a safe bounded live retry slice, then stopped manually to avoid leaving another long-running process unsupervised.

## Rules Used

- only stocks still missing today's price or snapshot
- max 1 retry per stock
- 1 worker
- 1 request every 4 seconds
- chart-only
- no protected modules
- stop on cooldown

## Results

1. Stale before retry: `2031`
2. Attempted: `12`
3. Completed: `11`
4. Still stale after freshness regeneration: `2020`

## What Actually Happened

- `22` retry jobs were written under `requested_by = "Yahoo Stale Remainder Retry Run"`
- job mix:
  - `11` `historical_ohlcv_import`
  - `11` `quote_statistics_import`
- status mix:
  - `21` `completed_with_errors`
  - `1` `running` at the moment the local process was stopped

Important note:

- the `completed_with_errors` status here was warning-driven, not hard-failure-driven
- no durable `stock_import_errors` rows were recorded for this retry slice
- no Yahoo cooldown was triggered

## Progress Made

Aggregate retry totals:

- inserted rows: `38892`
- skipped rows: `1561`
- existing data reused: `1561`
- saved requests avoided: `0`

Freshness movement:

- before retry: `2031` stale
- after retry + regeneration: `2020` stale
- net stale reduction: `11`

## Reason Categories

These categories reflect the live retry slice outcomes:

- provider no data: `0`
- symbol issue: `0`
- DB write issue: `0`
- skipped existing: `0`
- unknown: `1`

Why `unknown = 1`:

- `ANGELONE.NS` was mid-flight on its historical leg when the local manual retry process was stopped
- that was an operator stop decision, not a provider error or a database write failure

## Stocks Completed in This Retry Slice

The following symbols completed both historical and snapshot retry legs in this run:

- `AMBIKCO.NS`
- `AMBUJACEM.NS`
- `AMIRCHAND.NS`
- `AMJLAND.NS`
- `AMNPLST.NS`
- `AMRUTANJAN.NS`
- `ANANDRATHI.NS`
- `ANANTRAJ.NS`
- `ANDHRAPAP.NS`
- `ANDHRSUGAR.NS`

Additional symbol state:

- `AMDIND.NS` completed its snapshot leg in this retry window
- `ANGELONE.NS` was interrupted mid-run

## Operational Finding

This retry pass confirmed the same issue seen in the prior staged daily update:

- the retry lane is still not behaving like a lightweight same-day-only refresh
- the historical path continues inserting large older windows for some stocks
- that makes the stale-remainder cleanup much heavier than intended

So while this retry did improve freshness, it does **not** yet prove that the remaining `2020` stale stocks can be safely cleared with a fast chart-only retry sweep under current importer behavior.

## Recommendation

Status: **Partial retry completed**

Next step before another large stale-remainder pass:

1. Force the retry/daily freshness historical path to remain strictly recent-only.
2. Re-run the remaining stale set in smaller controlled windows.
3. Regenerate freshness after each window.

Do not treat this as a completed full stale-remainder retry. It was a safe bounded live retry slice with real progress and no provider/write failure signals.
