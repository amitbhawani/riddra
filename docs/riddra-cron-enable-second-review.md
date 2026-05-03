# Riddra Cron Enable Second Review

Date: 2026-04-30
Scope: second production review for enabling Yahoo daily chart-update cron

## Review Goal

Re-evaluate cron readiness after:

1. monitoring migrations are live
2. freshness generation works
3. DB write-failure alert is resolved
4. 50-stock daily update pilot passes

## Final Verdict

Cron enablement: **NO-GO**

Reason:

- the monitoring schema is live
- freshness generation is live
- the earlier write-timeout alert condition is no longer the main blocker
- but the `50`-stock live daily update pilot did **not** pass cleanly
- and the current freshness state is still too stale for safe scheduled rollout

## Condition Check

### 1. Monitoring migrations are live

Status: **PASS**

Verified:

- `stock_import_alerts` exists and is queryable
- `stock_data_freshness` exists and is queryable
- `/admin/market-data/import-control-center` returns `200`

Current live state:

- active alert rows: `0`
- freshness rows: `2157`

### 2. Freshness generation works

Status: **PASS**

Verified:

- durable freshness rows exist for the full active stock universe
- row count: `2157`

Current freshness snapshot:

- stale stocks: `993`
- missing today price: `992`
- missing today snapshot: `993`

Interpretation:

- the freshness pipeline works technically
- but the dataset is **not yet fresh enough** for cron go-live confidence

### 3. DB write-failure alert is resolved

Status: **PARTIAL PASS**

What improved:

- the earlier timeout-style failure pattern from `3MINDIA.NS` and `ABBOTINDIA.NS` was addressed by hardened historical write batching
- no active durable alert rows are present in `stock_import_alerts`

What still remains:

- recent `stock_import_errors` still include many live daily-update write failures from the 50-stock pilot
- these are no longer timeout failures
- they are now duplicate-key historical insert failures

So:

- the old timeout alert condition is no longer the main problem
- but write-path correctness is **still not resolved enough** for cron

### 4. 50-stock daily update pilot passes

Status: **FAIL**

Latest pilot:

- Job ID: `46fbfe76-7115-496d-b822-f335adc05edb`
- Job status: `completed_with_errors`
- Completed at: `2026-04-30T10:26:52.05+00:00`

Pilot summary:

- stocks in scope: `50`
- completed stocks: `32`
- failed stocks: `18`
- cooldown triggered: `No`
- same-day snapshot presence after pilot: `50 / 50`

Historical write issue:

- `18` historical items failed with:
  - `duplicate key value violates unique constraint "stock_price_history_unique"`

Affected symbols:

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

Post-run duplicate verification:

- duplicate `stock_price_history` groups by `stock_id + trade_date`: `0`
- duplicate `stock_market_snapshot` groups by `stock_id + trade_date`: `0`

Interpretation:

- the database stayed clean
- but the importer still attempted invalid duplicate writes during the daily history path
- that means the cron job is not yet safe enough for unattended production execution

## Additional Blocking Issue

Observability for the 50-stock pilot was incomplete:

- `stock_import_activity_log` rows for the pilot job: `0`
- `stock_import_reconciliation` rows for the pilot job: `0`

This is consistent with the already-known activity-log step-name constraint mismatch. The import still ran, but durable monitoring evidence for the run was not written correctly.

That alone is enough to keep cron disabled, even aside from the duplicate-history failure.

## Current Recommendation

Current recommendation: **Not Ready**

Why:

1. the daily history lane still fails on duplicate-key writes for a large enough subset of stocks
2. the observability layer for daily jobs is not durably complete
3. the current freshness state still shows `993` stale stocks, so the scheduler should not be introduced before the daily path is consistently correct

## What Must Be Fixed Before Cron Enablement

### Required

1. Fix daily historical delta logic so same-day or already-present rows are skipped before batched write execution.
2. Fix the `stock_import_activity_log.step_name` constraint mismatch so activity rows persist again.
3. Restore reconciliation writes for daily jobs.
4. Re-run the 50-stock live daily pilot and achieve:
   - `0` failed historical items
   - `0` duplicate-write errors
   - durable activity rows present
   - durable reconciliation rows present

### Strongly Recommended

1. Re-run freshness generation after the clean pilot.
2. Confirm stale-stock count drops materially after a successful daily cycle.
3. Re-check the control center’s production-readiness checklist after the clean rerun.

## Cron Configuration Prepared In Principle

This is **prepared only for later manual approval**. Do not enable yet.

### Exact command

```bash
npm run yahoo:daily-update
```

### Intended schedule

- primary run: once daily after India market close
- recommended window: `18:30 IST`
- optional second catch-up run for misses: `21:30 IST`

### Required environment variables

```bash
YAHOO_FINANCE_REQUESTS_PER_SECOND=1
YAHOO_FINANCE_MAX_CONCURRENT_WORKERS=1
YAHOO_FINANCE_MAX_RETRIES=3
YAHOO_FINANCE_FAILURE_COOLDOWN_MINUTES=45
YAHOO_HISTORY_WRITE_BATCH_SIZE=250
YAHOO_FINANCE_MAX_REQUESTS_PER_HOUR=2000
YAHOO_FINANCE_MAX_REQUESTS_PER_DAY=15000
```

### Pause / disable method

If cron is later approved and must be stopped:

1. disable the cron entry in the scheduler
2. stop creating new daily jobs
3. if a live job is already running, use the existing batch-control stop/pause path
4. verify the control center shows no new cron-triggered jobs starting

### Rollback / disable rules

Disable cron immediately if any of the following happens:

1. duplicate-history write failures reappear
2. Yahoo cooldown activates
3. write-timeout spike returns
4. activity log or reconciliation rows stop writing again
5. stale-stock count rises sharply after a daily run

## Final Manual Approval Checklist

Cron must **not** be approved until all items below are true:

- [ ] latest 50-stock daily pilot completed with `0` failed historical items
- [ ] latest 50-stock daily pilot completed with `0` duplicate-key write errors
- [ ] activity log rows were written for the pilot
- [ ] reconciliation rows were written for the pilot
- [ ] freshness generation still succeeds
- [ ] stale-stock count is acceptable after the clean pilot
- [ ] control center shows no active production blocker
- [ ] manual operator sign-off is given

## Second Review Conclusion

The system is closer than before, but it is **still not ready for automated cron execution**.

The blocker is no longer Yahoo access or missing monitoring tables. The blocker is the daily history write path still failing under real mixed existing-data conditions, combined with incomplete durable observability for those jobs.
