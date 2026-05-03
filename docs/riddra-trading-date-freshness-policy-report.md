# Riddra Trading-Date Freshness Policy Report

Date: 2026-05-01

## Goal

Replace the old calendar-date-only freshness check with a trading-date-aware policy for Indian stocks, so the platform does not falsely mark the full universe stale just because:

- the market is still open
- the market has not closed yet in IST
- the day is a weekend or holiday-style non-trading day
- Yahoo is one candle behind for a specific symbol

## What Changed

### 1. New trading-date policy helper

Added:

- `lib/stock-freshness-policy.ts`

This helper now:

- resolves the Indian market session
- determines the expected latest trading date
- distinguishes:
  - `market_not_closed`
  - `holiday_or_weekend`
  - `provider_lag`
  - real stale conditions

### 2. Freshness table migration

Added:

- `db/migrations/0058_stock_data_freshness_trading_date_policy.sql`

New durable fields:

- `expected_trading_date`
- `evaluation_date`
- `reason_category`
- `market_session_state`

Allowed reason categories:

- `fresh`
- `stale_missing_price`
- `stale_missing_snapshot`
- `provider_lag`
- `market_not_closed`
- `holiday_or_weekend`
- `symbol_issue`

### 3. Freshness generator updated

Updated:

- `scripts/generate-stock-data-freshness.mjs`

New behavior:

- no longer assumes the IST calendar date is always the expected trading date
- uses the latest durable coverage signal plus Indian market session logic
- checks expected-trading-date rows, not blindly calendar-date rows
- writes the new reason fields into `stock_data_freshness`

### 4. Import Control Center updated

Updated:

- `lib/admin-import-control-center.ts`
- `components/admin/admin-import-control-center-client.tsx`
- `app/admin/market-data/import-control-center/page.tsx`

New behavior:

- control center now reads trading-date-aware freshness rows
- shows expected trading date
- shows reason-category counts
- shows per-stock freshness reason labels
- remains backward-compatible before `0058` is applied by falling back to the legacy schema

## Policy Logic

### Expected trading date

- If Indian market session is `pre_open` or `open`:
  - expected trading date = previous trading day
  - category can be `market_not_closed`

- If session is `weekend`:
  - expected trading date = last known trading day
  - category can be `holiday_or_weekend`

- If session is `closed` and durable market coverage is still broadly one day behind:
  - expected trading date = latest known market-wide trading date
  - category can be `holiday_or_weekend`

- If session is `closed` and current-day coverage exists:
  - expected trading date = current IST trading date

### Per-stock classification

- `fresh`
  - expected-date price and snapshot both exist

- `market_not_closed`
  - expected date is previous trading day because current session is not closed yet
  - stock has the expected-date price and snapshot

- `holiday_or_weekend`
  - expected date is shifted to last known trading day because weekend / holiday-style logic applies
  - stock has the expected-date price and snapshot

- `provider_lag`
  - Yahoo is one trading day behind for the symbol
  - not treated as a hard stale failure

- `stale_missing_price`
  - expected-date price is missing

- `stale_missing_snapshot`
  - expected-date snapshot is missing

- `symbol_issue`
  - no reliable symbol-backed evidence or no latest-date continuity can be inferred

## Why This Fix Matters

The old freshness model over-reported failures because it assumed:

- “today in IST” always equals “required market-data date”

That is incorrect for market data. A real freshness system must distinguish:

- trading date
- market session state
- provider lag
- real missing writes

Without this fix, cron-readiness and control-center warnings become noisier and less trustworthy than the actual importer state.

## Files Changed

- `lib/stock-freshness-policy.ts`
- `scripts/generate-stock-data-freshness.mjs`
- `lib/admin-import-control-center.ts`
- `components/admin/admin-import-control-center-client.tsx`
- `app/admin/market-data/import-control-center/page.tsx`
- `db/migrations/0058_stock_data_freshness_trading_date_policy.sql`
- `docs/riddra-trading-date-freshness-policy-report.md`

## Notes

- Cron was not enabled in this step.
- `0058` still needs to be applied in Supabase before the new durable columns become live.
- Until `0058` is applied, the control center stays backward-compatible and shows a warning that trading-date reason categories are still on the legacy schema.
