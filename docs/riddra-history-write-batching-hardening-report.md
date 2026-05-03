# Riddra History Write Batching Hardening Report

Last updated: 2026-04-30

## Goal

Harden Yahoo historical daily writes into `stock_price_history` so large missing-date inserts are less likely to fail on Supabase write timeouts.

## What changed

Updated [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts).

### 1. Smaller historical write batches

The historical importer no longer sends one large `insert(...)` or `upsert(...)` payload for the whole missing window.

It now:

- chunks `stock_price_history` writes
- applies the chunking in both:
  - `skip_existing_dates`
  - `replace_matching_dates`

### 2. Configurable batch size

New preferred env variable:

- `YAHOO_HISTORY_WRITE_BATCH_SIZE`

Default:

- `250`

Compatibility:

- the importer also still accepts the older `YAHOO_HISTORICAL_WRITE_BATCH_SIZE` if present

### 3. Retry only the failed write batch

On a retriable timeout-style write failure, the importer now retries only the failed chunk, not the whole stock.

Retry behavior:

- per-batch retries only
- retry count uses existing `YAHOO_FINANCE_MAX_RETRIES`
- exponential backoff capped at `10s`

### 4. Dedupe behavior preserved

The historical dedupe logic is unchanged:

- existing date detection still happens before insert in `skip_existing_dates` mode
- conflict protection still uses:
  - `stock_id`
  - `interval_type`
  - `trade_date`
  - `source_name`

So chunking does not weaken duplicate protection.

### 5. Activity logging for write batch failures

Added activity log support for historical batch-write failures:

- new activity step: `write_batch_failed`

Each failed/retried batch logs:

- batch index
- total batches
- batch size
- retry attempt
- max retries
- retriable flag
- trade-date range for that chunk
- write mode (`insert` or `upsert`)

This makes it easier to diagnose write pressure without losing the overall stock job context.

## Why this was needed

The earlier historical writer was still vulnerable to Supabase write timeouts because missing-date inserts could go through as one large payload.

That is exactly the failure pattern seen in the two-stock daily-update pilot retry investigation:

- `3MINDIA.NS`
- `ABBOTINDIA.NS`

The root problem there was not Yahoo blocking; it was the write lane being too coarse.

## Accurate counts

The importer still reports:

- `insertedRows`
- `updatedRows`
- `skippedRows`
- `totalProcessedRows`

accurately at the stock level.

Chunk retries do not inflate counts because:

- counts are still derived from the deduped payload set and existing-date window
- retries only rerun the failed chunk
- a chunk is only counted as written after the insert/upsert succeeds

## Files changed

- [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts)
- [docs/riddra-history-write-batching-hardening-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-history-write-batching-hardening-report.md)

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

## Live-import note

No new large live historical import was run for this hardening pass.

That was intentional:

- the two failed-stock repair had already proven the smaller-batch approach was useful
- this task focused on making the importer itself production-safer without launching a new broader import

## Outcome

The Yahoo historical importer is now materially safer against Supabase write timeouts:

- smaller configurable write batches
- retry only the failed chunk
- duplicate protection intact
- better activity-log visibility when a batch write fails
