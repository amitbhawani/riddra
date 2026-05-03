# Riddra Yahoo Live Daily Update 25-Stock Report

Date: April 30, 2026  
Environment: local Next.js app on `http://127.0.0.1:3001`  
Pilot batch job: `61e2dff8-00f8-4c64-b1ab-f051402ac1e7`  
Batch profile: `daily_chart_update`

## Scope

This pilot ran the bounded daily Yahoo chart update lane for `25` stocks only, with these enforced rules:

- chart/history endpoint only
- snapshot-only chart fallback only
- no `quoteSummary`
- no valuation/statistics protected modules
- no financial statements
- `1` worker only
- `minimumRequestIntervalMs = 3000`
- stop on cooldown/block signal

Symbols included:

- `20MICRONS.NS`
- `21STCENMGM.NS`
- `360ONE.NS`
- `3BBLACKBIO.NS`
- `3IINFOLTD.NS`
- `3MINDIA.NS`
- `3PLAND.NS`
- `5PAISA.NS`
- `63MOONS.NS`
- `AAATECH.NS`
- `AADHARHFC.NS`
- `AAREYDRUGS.NS`
- `AARNAV.NS`
- `AARON.NS`
- `AARTECH.NS`
- `AARTIDRUGS.NS`
- `AARTIIND.NS`
- `AARTIPHARM.NS`
- `AARTISURF.NS`
- `AARVI.NS`
- `AAVAS.NS`
- `ABANSENT.NS`
- `ABB.NS`
- `ABBOTINDIA.NS`
- `ABCAPITAL.NS`

## 1. Stocks Processed

- Target stocks: `25`
- Parent batch items processed: `50`
- Completed stocks: `23`
- Failed stocks: `2`
- Pending at finish: `0`

The two failed stocks were:

- `3MINDIA.NS`
- `ABBOTINDIA.NS`

## 2. Rows Inserted

Durable inserts created during this pilot:

- `stock_price_history`: `56,480` rows
- `stock_market_snapshot`: `25` rows
- `raw_yahoo_imports`: `50` rows
- `stock_import_reconciliation`: `48` rows
- `stock_import_activity_log`: `346` rows

Note:

- snapshot rows were created with latest trade date `2026-04-29`
- all snapshot imports used chart fallback only

## 3. Rows Skipped

There are two different skip concepts in this batch:

- module items skipped at parent-job level: `0`
- existing historical rows reused/skipped during normalization: `5,516`

Breakdown from parent batch metadata:

- `skippedExistingHistory`: `5,516`
- `skippedExistingSnapshot`: `0`
- `skippedBlockedModule`: `0`
- `skippedDuplicateRawResponse`: `0`

Interpretation:

- no same-day snapshot row already existed for these `25` stocks
- the importer reused a large amount of existing historical data instead of duplicating it

## 4. Requests Avoided

- `savedRequestsAvoided`: `0`

Reason:

- this 25-stock slice did not hit same-day snapshot skips
- this slice also did not trigger duplicate failed raw-response dedupe

## 5. Errors

- Parent batch failed items: `2`
- `stock_import_errors` rows created during the pilot window: `4`

Observed durable error message:

- `Could not insert stock_price_history rows. Error: Supabase admin request timed out after 8000ms.`

Important interpretation:

- these were write-timeout failures on the historical insert path
- they were **not** Yahoo `401`
- they were **not** Yahoo `429`
- they were **not** cooldown-triggering provider block signals

## 6. Warnings

- Parent batch warning items: `46`

Breakdown:

- historical rows imported with warnings: `21`
- quote/snapshot normalization with warnings: `25`

Expected reason for all `25` quote warnings:

- the daily chart lane intentionally uses chart fallback only
- protected quote/statistics fields remain unavailable
- the snapshot module completed safely but remains warning-state because those non-chart fields are not filled

Historical warning reason:

- those imports completed, but with partial data-quality/coverage warnings rather than clean success

## 7. Cooldown Status

- Cooldown active: `No`
- `cooldownUntil`: `null`
- `cooldownReason`: `null`
- `consecutiveYahooFailures` at finish: `0`

This confirms the batch did **not** stop because of Yahoo blocking or auto-pause guardrails.

## 8. Admin Control Center Status

Post-run health check:

- `GET /admin/market-data/import-control-center` -> `200`

The control-center-compatible batch metadata at finish showed:

- throttle: `1` request/second logical rate with `minimumRequestIntervalMs = 3000`
- worker count: `1`
- chart-only mode active
- financial statements disabled for this batch profile
- quote/statistics completed only through snapshot fallback

## 9. Frontend Route Status

Post-run health check:

- `GET /stocks/reliance-industries` -> `200`

The pilot did not introduce a stock-page runtime crash.

## Additional Observations

### Batch duration

- started: `2026-04-30T02:27:57.423+00:00`
- completed: `2026-04-30T02:40:21.946+00:00`
- duration: about `12m 25s`

### Child-job completion

- `historical_ohlcv_import::completed`: `2`
- `historical_ohlcv_import::completed_with_errors`: `21`
- `historical_ohlcv_import::failed`: `2`
- `quote_statistics_import::completed_with_errors`: `25`

### Reconciliation summary

- `historical_prices::completed`: `23`
- `latest_market_snapshot::completed_with_warnings`: `25`

### Raw-response summary

- `historical_prices::completed`: `50`

This is expected because the snapshot-only lane uses chart history as the raw upstream source.

## Final Assessment

The 25-stock live daily chart-update pilot is operationally usable for:

- recent-history updates
- latest snapshot refresh via chart fallback
- duplicate-avoidance through row reuse
- safe single-worker paced updates

Current limitation from this pilot:

- two historical child jobs failed because of Supabase write timeouts, not Yahoo blocking
- quote/snapshot remains warning-state by design because protected fundamental fields stay out of scope

Recommended next step before a broader live daily rollout:

1. harden the historical insert/write path against the `8000ms` Supabase timeout seen on `3MINDIA.NS` and `ABBOTINDIA.NS`
2. keep the daily job restricted to chart/history plus snapshot fallback only
3. continue treating protected fundamentals as disabled for daily batch use
