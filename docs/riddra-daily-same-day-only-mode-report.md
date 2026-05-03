# Riddra Yahoo Daily Same-Day-Only Mode Report

Date: 2026-04-30  
Scope: Prompt 82  
Mode name: `daily_same_day_only`

## Goal

Build a strict Yahoo daily update mode that only works on a single target trade date and never drifts into:

- `full_initial`
- `backfill_missing`
- broader historical repair
- protected Yahoo modules like `quoteSummary`, valuation, financial statements, holders, or related fundamentals endpoints

## Files Changed

- `lib/yahoo-finance-import.ts`
- `lib/yahoo-finance-batch-import.ts`
- `scripts/import-yahoo-daily-update.mjs`
- `package.json`

## What Was Implemented

The new `daily_same_day_only` mode now:

1. Accepts:
   - `targetDate`
   - `force=false`
   - `dryRun=false`
2. Uses only Yahoo chart/history data.
3. Fetches a short bounded window ending at the target date, then selects only:
   - the exact target-date bar, or
   - the latest available trading-date bar at or before the target date
4. Writes at most:
   - one `stock_price_history` row for the effective trade date
   - one `stock_market_snapshot` row for the effective trade date
5. Skips and logs when the target-date rows already exist and `force=false`.
6. Records `no_data` and continues safely when Yahoo has no usable bar.
7. Clearly records whether it had to use the latest available trading date instead of the requested target date.

## Guardrails Confirmed

The new mode does **not**:

- run max history
- run `backfill_missing`
- repair old missing dates
- call `quoteSummary`
- call valuation metrics
- call financial statements
- call holders/protected modules

## CLI Support

New command:

```bash
npm run yahoo:daily-update:same-day-only
```

Example:

```bash
npm run yahoo:daily-update:same-day-only -- --stocks=RELIANCE.NS --max-items=1 --target-date=2026-04-30
```

## Validation

### Static validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `node --check scripts/import-yahoo-daily-update.mjs` -> PASS

### 10-stock no-network dry run

Command:

```bash
npm run yahoo:daily-update:same-day-only -- --stocks=SALSTEEL.NS,KRBL.NS,RAYMONDREL.NS,PIRAMALFIN.NS,JOCIL.NS,LOVABLE.NS,OMAXE.NS,SDBL.NS,NYKAA.NS,MODISONLTD.NS --max-items=10 --dry-run=true --target-date=2026-04-30
```

Result:

- requested: `10`
- processed: `10`
- completed: `10`
- failed: `0`
- inserted history rows: `10`
- inserted snapshots: `10`
- skipped rows: `0`
- `no_data`: `0`
- latest-available-trading-date fallback used: `0`

Dry-run outcome:

- all 10 stocks resolved the exact target date `2026-04-30`
- no protected Yahoo modules were touched
- the mode stayed bounded to one effective bar per stock

### 10-stock live pilot

Live pilot stocks:

- `CHOICEIN.NS`
- `WAAREEENER.NS`
- `LAHOTIOV.NS`
- `RAIN.NS`
- `FEDDERSHOL.NS`
- `LTM.NS`
- `VALIANTORG.NS`
- `ORKLAINDIA.NS`
- `RATNAMANI.NS`
- `INNOVISION.NS`

Observed durable result:

- live stock jobs completed: `10 / 10`
- failed: `0`
- inserted history rows for target date: `10`
- inserted snapshots for target date: `10`
- skipped rows: `0`
- `no_data`: `0`
- latest-available-trading-date fallback used: `0`
- activity rows created: `80`
- reconciliation rows created: `20`

Live activity steps observed directly:

- `fetch_started`
- `fetch_completed`
- `raw_saved`
- `normalization_started`
- `history_write_completed`
- `snapshot_write_completed`
- `reconciliation_completed`

Live reconciliation result:

- statuses observed: `completed`, `completed_with_warnings`

## Conclusion

The new `daily_same_day_only` mode is working as intended.

It is now safe for:

- tightly bounded same-day freshness runs
- chart-only daily pilots
- explicit target-date updates without drifting into historical repair

It is a materially safer base for future full-universe daily freshness work than the earlier broader daily-update path.
