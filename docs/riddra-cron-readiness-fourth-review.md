# Riddra Cron Readiness Fourth Review

Date: 2026-04-30  
Scope: Fourth cron go/no-go review after the latest manual freshness work  
Decision: **NO-GO**

## Final Decision

Cron is still **not ready** to be enabled.

This review was evaluated against the required GO criteria:

1. duplicate-key errors = 0
2. activity rows are written with exact step names
3. reconciliation rows are written
4. freshness is acceptable
5. no Yahoo cooldown
6. no active DB write spike
7. localhost/admin routes remain healthy

## Criteria Check

### 1. Duplicate-key errors = 0

Status: **FAIL**

Current live error-window check for 2026-04-30:

- duplicate-key-like errors today: `36`

Even though the targeted 50-stock post-fix pilot passed cleanly, the broader live-day error window is still not at zero.

### 2. Activity rows are written with exact step names

Status: **PASS**

Verified direct step-name activity rows exist with no fallback metadata in the live sample:

- `history_write_completed`: `19`
- `snapshot_write_completed`: `22`
- `skipped_existing_history_rows`: `18`
- `reconciliation_completed`: `41`
- fallback `metadata.intendedStepName` rows in sample: `0`

### 3. Reconciliation rows are written

Status: **PASS**

- reconciliation rows written today: `552`

### 4. Freshness is acceptable

Status: **FAIL**

Current regenerated freshness state:

- active stocks: `2157`
- fresh today: `137`
- stale: `2020`
- missing today price: `1998`
- missing today snapshot: `2020`

This is not operationally acceptable for unattended daily cron.

### 5. No Yahoo cooldown

Status: **PASS**

Current live error-window check:

- cooldown-like errors today: `0`

### 6. No active DB write spike

Status: **FAIL**

Current live error-window check:

- timeout/write-like errors today: `4`

Even though the earlier specific `3MINDIA.NS` and `ABBOTINDIA.NS` timeout issue was repaired, today’s broader error window is still not clean enough to treat DB-write risk as fully cleared.

### 7. Localhost/admin routes remain healthy

Status: **PASS**

Current local route checks:

- `/admin/market-data/import-control-center` -> `200` in `7.27s`
- `/admin/market-data/stocks` -> `200` in `3.29s`
- `/stocks/reliance-industries` -> `200` in `3.20s`

## Remaining Blockers

Cron remains blocked for four concrete reasons:

1. Freshness is still far from complete.
2. Duplicate-key errors are not yet zero in the full live-day error window.
3. Timeout/write-like errors are still present in the live-day error window.
4. The daily stale-remainder path is still behaving too heavily, with historical refresh work drifting into broader backfill behavior.

## Why This Is Still NO-GO

The system is now materially healthier than earlier reviews:

- exact activity step names are live
- reconciliation is live
- cooldown is not the active problem
- routes are healthy

But the cron decision must follow the strict criteria, and the two decisive blockers remain:

- freshness is not acceptable
- the live-day error window is not clean enough

That means enabling unattended cron now would likely normalize a still-incomplete daily state rather than reliably maintain a healthy one.

## Future GO Conditions

Cron can be reconsidered only after all of the following are true in the same review window:

1. duplicate-key errors today = `0`
2. timeout/write-like errors today = `0`
3. stale stock count is brought down to an operationally acceptable number
4. missing today snapshot count is near-zero
5. a broad staged run proves the remaining stale universe can be cleared without backfill inflation

## Cron Command If Status Turns GO Later

Not approved yet, but the prepared command remains:

```bash
npm run yahoo:daily-update
```

## Manual Approval Checklist

Do not enable cron until all of these are true:

- duplicate-key errors today = `0`
- timeout/write-like errors today = `0`
- stale count is operationally acceptable
- missing snapshot count is operationally acceptable
- latest staged live run completes without hidden backfill expansion
- admin control center shows no active red operational condition
- final operator signoff is given manually
