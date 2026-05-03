# Riddra Yahoo Import Master Status Audit

Date: 2026-04-30
Scope: project-wide status audit covering Prompt 1 through Prompt 68

## Executive Summary

The Yahoo import project is materially advanced and production-shaped, but it is **not fully go-live ready for unattended cron**.

What is solid:

- canonical `stocks_master` universe is built and active
- historical price ingestion works at scale
- latest snapshot ingestion works in chart-fallback mode
- public stock routes are canonical-first and stable
- control center, monitoring, quality, and freshness layers exist and render
- major localhost route performance is much better than earlier phases

What still blocks final operational go-live:

- daily history cron path still fails on duplicate-key historical writes under mixed existing-data conditions
- daily-job activity and reconciliation writes are incomplete because of the activity-log step-name constraint mismatch
- Yahoo protected fundamentals remain blocked or intentionally disabled at scale
- freshness is still not daily-complete enough for cron confidence

## 1. Completed Milestones

### Schema and storage

- Yahoo schema foundation created and verified
- raw import backup layer created with metadata and response preservation
- delta/guardrail migration path added
- data quality summary table added and live
- alerts and freshness monitoring tables added and live

### Yahoo import system

- reusable Yahoo fetch service built
- throttling, retry, cooldown, request caps, and one-worker guardrails added
- raw-save-before-normalize behavior implemented
- historical daily OHLCV importer built
- quote/snapshot normalization built in degraded chart-fallback mode
- financial statements importer built, but kept blocked/limited due Yahoo behavior
- production-safe batch importer built
- daily chart-update job built with manual command and admin action
- CLI runner fixed to work outside Next runtime alias resolution

### Observability and admin tooling

- admin stock import dashboard built
- Yahoo operations guide built
- import control center built and then expanded with:
  - status labels
  - production checklist
  - system health monitor
  - internal alert surfacing
  - freshness surfacing

### Public/frontend stock experience

- public stock detail route migrated to canonical-first resolver
- canonical stock resolver added
- public stock listing and sitemap moved to canonical-first discovery
- broad stock-route verification passed for `100` sampled stock slugs with `0` unexpected `500`s
- public routes now support canonical-only stocks safely

### Data acquisition progress

- clean NSE universe built in `stocks_master`
- active stock universe now: `2157`
- historical import completed across the active NSE universe
- latest snapshot import completed across the active NSE universe at least once

### Performance work

- canonical stock discovery and sitemap performance optimized
- final documented localhost timings improved substantially versus earlier baseline

## 2. Pending Blockers

### Blocker A: daily historical duplicate-write bug

The latest `50`-stock live daily chart pilot completed with errors because the daily historical importer still attempted writes that violated:

- `stock_price_history_unique`

This is the main blocker for cron enablement.

### Blocker B: activity/reconciliation durability gap on daily runs

The `50`-stock live daily pilot produced:

- `0` `stock_import_activity_log` rows for that job
- `0` `stock_import_reconciliation` rows for that job

This is consistent with the already-known `stock_import_activity_log.step_name` constraint mismatch.

### Blocker C: fundamentals are still not available at scale

Yahoo protected quote/fundamental endpoints remain unreliable or blocked:

- valuation metrics: not ready at scale
- share statistics: not ready at scale
- financial highlights: not ready at scale
- financial statements: manual single-stock testing only

### Blocker D: freshness is not yet daily-ready

Current durable freshness snapshot:

- stale stocks: `993`
- missing today price: `992`
- missing today snapshot: `993`

That is too stale for unattended cron confidence.

## 3. Failed or Degraded Modules

### Healthy

- `historical_prices`
  - healthy for large one-time/full import
  - healthy for most batch update behavior
  - still blocked for cron by duplicate-write edge cases on daily delta runs

### Degraded but usable

- `quote_statistics`
  - usable only in chart-fallback snapshot mode
  - latest market snapshot works
  - market cap is often missing in fallback path

### Disabled by design

- `valuation_metrics`
- `share_statistics`
- `financial_highlights`
- `financial_statements`
- `holders`
- `quoteSummary`-family protected modules in batch/daily mode

### Why disabled/degraded

- Yahoo protected endpoints produced `401` and crumb-related failures
- browser-like fallback attempts were not reliable enough for production batch use
- project direction intentionally shifted to chart-only price/snapshot operations for production safety

## 4. Current Database Coverage

Live counts pulled from the current Supabase project and current app runtime state.

### Core tables

- `stocks_master`
  - active rows: `2157`

- `stock_price_history`
  - rows: `676896`

- `stock_market_snapshot`
  - rows: `2246`

- `stock_data_quality_summary`
  - rows: `2157`
  - average quality score: `74.96`
  - rows with historical flag: `2155`
  - rows with latest snapshot flag: `2157`
  - rows with valuation flag: `1`
  - rows with financial statements flag: `1`

- `stock_data_freshness`
  - rows: `2157`
  - stale stocks: `993`
  - missing today price: `992`
  - missing today snapshot: `993`

- `stock_import_errors`
  - total rows: `4130`
  - recent last-24h errors: `40`
  - recent duplicate/time-out style history write errors: `40`

- `stock_import_activity_log`
  - rows: `36977`

- `stock_import_reconciliation`
  - rows: `6100`

### Fundamentals tables

- `stock_valuation_metrics`
  - rows: `1`

- `stock_share_statistics`
  - rows: `1`

- `stock_financial_highlights`
  - rows: `1`

- `stock_income_statement`
  - rows: `4`

- `stock_balance_sheet`
  - rows: `4`

- `stock_cash_flow`
  - rows: `4`

Interpretation:

- price/history and snapshot layers are the only modules with meaningful scale coverage
- fundamentals remain essentially pilot-only

## 5. Cron Readiness Status

Status: **NO-GO**

Reason:

1. the latest `50`-stock live daily pilot did not pass cleanly
2. duplicate-key history writes still occur
3. activity/reconciliation for daily jobs are not durably reliable
4. freshness is still too stale

Latest decisive pilot:

- job: `46fbfe76-7115-496d-b822-f335adc05edb`
- status: `completed_with_errors`
- stocks completed: `32`
- stocks failed: `18`
- cooldown: `No`
- all `50` pilot stocks still had same-day snapshots after the run

## 6. Frontend Route Status

Current route checks:

- `/stocks` -> `200`
- `/sitemap.xml` -> `200`
- `/stocks/reliance-industries` -> `200`
- `/admin/market-data/import-control-center` -> `200`

Broader route state from prior breadth verification:

- `100` stock slugs tested
- `200`: `100`
- `404`: `0`
- `500`: `0`

Conclusion:

- canonical-first public stock routing is working
- canonical-only stocks render safe pages
- legacy `instruments` still exist and still matter for some discovery/editor surfaces, so cleanup is still staged rather than executed

## 7. Localhost Performance Status

From the final documented performance pass:

- `/stocks` -> about `4.47s`
- `/stocks/reliance-industries` -> about `5.82s`
- `/sitemap.xml` -> about `1.87s`
- `/api/search/suggestions?query=reliance&limit=8` -> about `2.98s`
- `/search?query=reliance` -> about `3.64s`

These were major improvements from the earlier canonical-route baseline, where:

- `/stocks` had been around `39s`
- `/stocks/[slug]` had been around `45s`

Conclusion:

- localhost is much healthier than before
- there is still room to optimize, but performance is no longer the main project blocker

## 8. Exact No-Go Conditions Remaining

Cron / production daily automation remains blocked until all of the following are cleared:

1. daily historical delta path no longer triggers duplicate-key insert failures
2. `stock_import_activity_log.step_name` mismatch is fixed
3. daily jobs write durable activity rows again
4. daily jobs write durable reconciliation rows again
5. a rerun of the `50`-stock live daily pilot completes with:
   - `0` failed historical items
   - `0` duplicate-write errors
6. stale-stock count becomes operationally acceptable after a clean daily pass
7. no active write-spike/cooldown/no-success-job alert condition is present

## 9. Exact Go-Live Checklist Remaining

### Required before cron

- [ ] Fix same-day/recent historical dedupe in the daily update path
- [ ] Fix activity log step-name compatibility with live DB constraint
- [ ] Restore reconciliation writes for daily jobs
- [ ] Re-run a clean `50`-stock live daily pilot
- [ ] Verify `0` duplicate historical write failures
- [ ] Verify activity log rows persist for the pilot
- [ ] Verify reconciliation rows persist for the pilot
- [ ] Regenerate freshness after the clean pilot
- [ ] Verify stale-stock count materially improves
- [ ] Re-check control center production checklist

### Required before fundamentals go-live

- [ ] Decide Phase 2 fundamentals strategy
- [ ] Keep Yahoo protected fundamentals disabled until a new source strategy is approved

### Required before legacy cleanup

- [ ] finish remaining discovery/search/admin migration away from legacy assumptions where needed
- [ ] keep archive-first plan only
- [ ] do not delete legacy instruments yet

## Final Status

Overall status: **Operationally strong for chart-based historical and snapshot imports, but not yet ready for unattended cron or fundamentals at scale.**

If the next work cycle focuses on:

1. fixing the daily historical duplicate-write bug
2. fixing daily job observability persistence
3. re-running a clean 50-stock daily pilot

then the project can move from “controlled manual operation” toward real production cron readiness.
