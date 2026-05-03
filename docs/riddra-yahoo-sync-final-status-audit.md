# Riddra Yahoo Sync Final Status Audit

Date: 2026-05-01  
Timezone: Asia/Kolkata

## Final Status

- Final decision for daily chart sync: **GO**
- Scope of GO: **Yahoo chart/history + latest snapshot fallback daily_same_day_only lane**
- Out of scope for this GO:
  - valuation refresh
  - financial statements
  - holders
  - analyst data

## 1. Total Active Stocks

- Active `stocks_master` count: `2157`

## 2. Historical Coverage

- Historical coverage: `2155 / 2157`
- Missing direct historical coverage is limited to the accepted provider exceptions:
  - `KIRANVYPAR.NS`
  - `NEAGI.NS`

## 3. Latest Snapshot Coverage

- Latest snapshot coverage: `2157 / 2157`

## 4. Data Quality Coverage

- `stock_data_quality_summary` coverage: `2157 / 2157`
- Historical-present quality rows: `2155`
- Snapshot-present quality rows: `2157`

## 5. Freshness Status

- Expected trading date: `2026-04-30`
- Evaluation date: `2026-05-01`
- Total durable freshness rows: `2157`
- Fresh + accepted exceptions: `2157`
- Blocking stale rows: `0`

Reason-category counts:

- `holiday_or_weekend`: `2155`
- `provider_no_data`: `2`

## 6. Accepted Exceptions

Accepted provider exceptions:

- `KIRANVYPAR.NS` / `KIRANVYPAR`
- `NEAGI.NS` / `NEAGI`

These are now stored durably as `provider_no_data` with `is_stale = false`.

## 7. Active Quarantine Rows

- Active quarantine rows: `0`
- Resolved quarantine rows: `80`

Quarantine status is clear, and the repaired 2026-04-30 candle corruption set no longer has active quarantine records.

## 8. Cron Status

- Cron status: **enabled**
- Primary schedule: `0 11 * * *` UTC (`4:30 PM IST`)
- Retry schedule: `0 13 * * *` UTC (`6:30 PM IST`)
- Cron lane: `daily_same_day_only`
- Guardrails:
  - chart/history only
  - snapshot fallback only
  - no quoteSummary
  - no fundamentals
  - `1` worker
  - `1` request every `3` seconds
  - skip existing rows
  - stop on cooldown

## 9. Last Cron Result

Latest durable cron-related result:

- Stage: `worker_slice_completed`
- Window: `primary`
- Mode: `daily_same_day_only`
- Target date: `2026-04-30`
- Processed stocks: `25`
- Requested stocks: `30`
- Pending stocks after slice: `5`
- Next cursor: `25`
- Last processed symbol: `APLLTD.NS`
- Next pending symbol: `GODREJIND.NS`

Important note:

- The latest durable cron result is from the bounded slice verification job used to validate the queue/worker design.
- It completed without timeout, duplicate-key errors, or Yahoo cooldown.
- No out-of-band full import was run for this audit.

## 10. Protected Modules Status

Current daily chart sync intentionally keeps protected / heavier Yahoo modules disabled.

Strict same-day cron lane status:

- `financial_statements`: `disabled_for_daily_same_day_cron`
- `valuation_metrics`: `chart_only_same_day_mode`
- `share_statistics`: `chart_only_same_day_mode`
- `financial_highlights`: `chart_only_same_day_mode`
- `quote_summary`: `chart_only_same_day_mode`
- `holders`: `chart_only_same_day_mode`
- `options`: `chart_only_same_day_mode`
- `news`: `chart_only_same_day_mode`

## 11. Remaining Unavailable Data

- Valuation: unavailable in the strict daily chart sync lane by design
- Financial statements: disabled in daily same-day cron
- Holders: not included in daily chart sync scope
- Analyst data: unavailable / not implemented in the daily chart sync lane

These are not blockers for the approved chart/snapshot daily sync lane, but they do remain unavailable for a broader fundamentals program.

## 12. Final GO / NO-GO For Daily Chart Sync

- Final Yahoo daily chart sync status: **GO**

Why this is GO:

- `2157 / 2157` active stocks are covered by fresh rows or accepted provider exceptions
- latest snapshot coverage is complete
- data quality coverage is complete
- active quarantine rows are `0`
- repaired candle corruption no longer appears in active chart reads
- strict same-day cron is enabled with queue-based bounded worker slices
- protected modules are intentionally disabled, which keeps the approved lane narrow and stable

Operational caveat:

- This is a **GO for daily chart/history + snapshot sync**, not a GO for full Yahoo fundamentals ingestion.
