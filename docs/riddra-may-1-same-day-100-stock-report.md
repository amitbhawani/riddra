# Riddra May 1 Same-Day 100-Stock Report

Date: 2026-05-01

## Scope

Controlled live `daily_same_day_only` run for the first `100` active NSE stocks.

Rules used:

- chart/history only
- snapshot fallback only
- no `quoteSummary`
- no valuation modules
- no financial statements
- `1` worker
- `1` request every `3` seconds
- stop on cooldown or write spike

## Expected Latest Trading Date Used

- expected latest trading date: `2026-04-30`

This was resolved from the live durable coverage state, not from the raw May 1 calendar date.

## Result

1. Attempted stocks
- `100`

2. Completed
- `100`

3. Fresh
- `100`

Interpretation:
- the full 100-stock slice already had the expected `2026-04-30` history row and snapshot row
- the same-day-only lane therefore validated freshness by skipping existing rows cleanly instead of rewriting them

4. Provider lag
- `0`

5. No data
- `0`

6. Failed
- `0`

7. Duplicate-key errors
- `0`

8. DB write errors
- `0`

## Insert / Skip Detail

- price rows inserted: `0`
- snapshot rows inserted: `0`
- total skipped rows: `200`
- historical skips: `100`
- snapshot skips: `100`

That means every stock in the pilot was already current for the expected trading date, and the strict same-day-only mode behaved exactly as intended:

- did not backfill
- did not repair old history
- did not overwrite current rows
- did log clean skip behavior

## Durable Proof

CLI result:

- requested count: `100`
- processed count: `100`
- completed count: `100`
- failed count: `0`
- inserted rows: `0`
- skipped rows: `200`
- snapshot inserted count: `0`
- snapshot skipped count: `100`
- `usedLatestAvailableTradingDateCount`: `0`
- `noDataCount`: `0`

Durable error check after the run window:

- recent `stock_import_errors` rows: `0`
- duplicate-key errors: `0`
- DB write errors: `0`

## Recommendation For Full Run

- **GO** for a broader same-day-only run under the same guardrails

Why:

- the strict same-day-only lane is stable
- no duplicate-key failures occurred
- no write-timeout failures occurred
- no provider-lag fallbacks were needed in this slice
- existing fresh rows were reused exactly as designed

## Important Follow-Up

The live `stock_data_freshness` table is still on the legacy schema right now, so the new trading-date reason categories will not appear durably until migration `0058_stock_data_freshness_trading_date_policy.sql` is applied.

That does **not** block this pilot result itself. It only limits how richly the freshness reasons can be stored in Supabase today.
