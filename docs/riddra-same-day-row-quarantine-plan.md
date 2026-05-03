# Riddra Same-Day Row Quarantine Plan

Date: 2026-05-01  
Target date: `2026-04-30`

## Goal

Contain suspicious same-day rows in:

- `stock_price_history`
- `stock_market_snapshot`

without deleting evidence, without destroying rollback paths, and without allowing public charts or stock surfaces to continue reading quarantined candles.

## Current Constraints

### 1. No built-in quarantine/status column exists today

Current table structures do **not** include a status or quarantine field.

`stock_price_history` columns:

- `id`
- `stock_id`
- `symbol`
- `trade_date`
- `interval_type`
- `open`
- `high`
- `low`
- `close`
- `adj_close`
- `volume`
- `currency_code`
- `raw_import_id`
- `raw_payload`
- `source_name`
- `source_url`
- `source_symbol`
- `source_recorded_at`
- `imported_at`
- `created_at`
- `updated_at`

`stock_market_snapshot` columns:

- `id`
- `stock_id`
- `symbol`
- `trade_date`
- `snapshot_at`
- `currency_code`
- `market_state`
- `price`
- `previous_close`
- `open`
- `day_high`
- `day_low`
- `change_absolute`
- `change_percent`
- `volume`
- `market_cap`
- `raw_import_id`
- `raw_payload`
- `source_name`
- `source_url`
- `source_symbol`
- `source_recorded_at`
- `imported_at`
- `created_at`
- `updated_at`

### 2. Chart reads currently use raw `stock_price_history` directly

The native chart backend in [lib/native-stock-chart.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/native-stock-chart.ts) reads directly from `stock_price_history` and does not currently exclude suspicious rows.

### 3. Public stock discovery and stock detail snapshot reads currently use raw `stock_market_snapshot` directly

Current read paths in [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) read recent snapshot rows directly from `stock_market_snapshot` and would also need quarantine-aware filtering.

## Quarantine Principles

1. Do not hard-delete suspicious rows.
2. Preserve raw source evidence in `raw_yahoo_imports`.
3. Keep the suspect rows recoverable and inspectable.
4. Make quarantine reversible.
5. Prevent public charts and stock pages from using quarantined rows.
6. Keep importer repair paths able to rebuild clean replacement rows later.

## Recommended Design

### Use a separate quarantine registry table, not ad hoc row mutation

Best approach:

- keep `stock_price_history` and `stock_market_snapshot` physically unchanged
- create a new registry table that marks rows as quarantined by ID
- update read paths to exclude rows present in the registry with active quarantine status

This is safer than altering core price rows because:

- no destructive edits to core history
- no risk of breaking uniqueness constraints
- no risk of losing evidence
- rollback is simple: resolve or remove quarantine flags

## Proposed Migration

Recommended new migration:

- `0059_market_data_row_quarantine.sql`

### Proposed table

`market_data_row_quarantine`

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `table_name text not null`
- `row_id uuid not null`
- `stock_id uuid null`
- `symbol text null`
- `trade_date date null`
- `reason_code text not null`
- `reason_summary text not null`
- `severity text not null default 'high'`
- `status text not null default 'active'`
- `evidence jsonb not null default '{}'::jsonb`
- `detected_by text null`
- `detected_at timestamptz not null default now()`
- `resolved_at timestamptz null`
- `resolved_by text null`
- `resolution_notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Recommended constraints

- `table_name in ('stock_price_history', 'stock_market_snapshot')`
- `status in ('active', 'resolved', 'rolled_back')`
- unique active quarantine per row:
  - unique index on `(table_name, row_id)` where `status = 'active'`

## Why not add status directly on the base tables?

It would work, but it is not the safest first move.

Adding `is_quarantined` or `row_status` directly to both base tables would:

- increase write/read complexity for all imports
- require broader query updates across many consumers
- make repair/backfill logic more invasive
- muddy the distinction between source data and operational containment state

A separate registry is cleaner operationally.

## Suspicious Row Scope for Initial Quarantine

Initial quarantine scope should be limited to the known suspicious same-day set for `2026-04-30`.

At minimum:

- suspicious `stock_price_history` rows identified in the corruption investigation
- corresponding `stock_market_snapshot` rows for the same stocks on `2026-04-30` if they were derived from the same contaminated source path

Initial reason code:

- `same_day_fixture_contamination_suspected`

Initial evidence should include:

- repeated OHLCV signature
- linked `raw_import_id`
- `raw_yahoo_imports.request_context`
- `fixtureName = reliance`
- investigation reference:
  - [docs/riddra-same-day-candle-corruption-investigation.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-same-day-candle-corruption-investigation.md)

## Proposed Evidence JSON Shape

For each quarantined row:

```json
{
  "investigation": "riddra-same-day-candle-corruption-investigation",
  "suspectedCause": "dry_run_fixture_leak",
  "signature": {
    "tradeDate": "2026-04-30",
    "open": 1343.6,
    "high": 1356.8,
    "low": 1337.2,
    "close": 1350.75,
    "adjClose": null,
    "volume": 5320000
  },
  "rawImportId": "uuid-if-known",
  "rawImportRequestContext": {
    "dryRun": true,
    "fixtureName": "reliance"
  }
}
```

## How to Keep Charts from Using Quarantined Rows

### 1. Chart API

Update [lib/native-stock-chart.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/native-stock-chart.ts) to exclude active quarantine rows when reading `stock_price_history`.

Safe approaches:

- query `market_data_row_quarantine` first and exclude matching `row_id`s in app logic
- or create a view later for clean history reads

Recommended first approach:

- keep it simple in app logic
- load active quarantined IDs for `stock_price_history`
- filter them out before chart point generation

### 2. Snapshot reads

Update snapshot reads in [lib/content.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/content.ts) so latest snapshot selection ignores actively quarantined `stock_market_snapshot` rows.

### 3. Admin visibility

The Import Control Center should eventually show:

- quarantined history row count
- quarantined snapshot row count
- affected symbols
- unresolved quarantine status

## Quarantine Execution Strategy

Do **not** do this blindly.

Recommended execution sequence after approval:

1. Apply `0059_market_data_row_quarantine.sql`.
2. Insert quarantine rows for suspicious `stock_price_history` IDs for `2026-04-30`.
3. Insert quarantine rows for suspicious `stock_market_snapshot` IDs only if linked evidence supports the same contamination path.
4. Update chart and snapshot readers to exclude active quarantine rows.
5. Verify:
   - charts no longer render suspicious same-day candles
   - public pages still load
   - raw evidence remains intact
6. Only after that, prepare targeted repair/rebuild for affected symbols.

## Safe SQL Shape for Quarantine Inserts

The quarantine write should be insert-only.

Pattern:

```sql
insert into public.market_data_row_quarantine (
  table_name,
  row_id,
  stock_id,
  symbol,
  trade_date,
  reason_code,
  reason_summary,
  severity,
  status,
  evidence,
  detected_by
)
select
  'stock_price_history',
  sph.id,
  sph.stock_id,
  sph.symbol,
  sph.trade_date,
  'same_day_fixture_contamination_suspected',
  'Suspicious identical 2026-04-30 candle linked to dry-run fixture contamination investigation.',
  'high',
  'active',
  jsonb_build_object(
    'investigation', 'riddra-same-day-candle-corruption-investigation',
    'rawImportId', sph.raw_import_id
  ),
  'manual_quarantine_plan'
from public.stock_price_history sph
where sph.trade_date = '2026-04-30'
  and sph.id in (...approved suspicious row ids...);
```

This preserves the underlying row unchanged.

## Raw Evidence Preservation

Do not alter:

- `raw_yahoo_imports`
- `stock_import_activity_log`
- `stock_import_reconciliation`

Those tables are part of the evidence chain.

The quarantine plan should preserve:

- raw import payloads
- request context
- timestamps
- linked row IDs

## Rollback Plan

Rollback must be lightweight and non-destructive.

### Rollback method

Mark quarantine rows as resolved or rolled back:

- set `status = 'rolled_back'`
- set `resolved_at = now()`
- set `resolution_notes = 'Quarantine rollback approved'`

Do **not** delete quarantine records immediately.

This keeps a full audit trail while restoring row visibility to the app if needed.

### Rollback verification

After rollback:

- charts should again see those rows
- stock snapshot reads should again see those rows
- evidence should remain preserved in quarantine records and raw imports

## Recommended Follow-up After Quarantine

Quarantine is not the repair.

After quarantine is live:

1. rebuild clean same-day rows only for affected symbols
2. compare rebuilt rows against non-dry-run raw imports
3. once validated, mark quarantine entries as:
   - `resolved`
4. keep evidence records indefinitely or archive later

## Final Recommendation

Recommended approach:

- **Do not hard-delete**
- **Do not mutate base history rows directly**
- **Use a separate quarantine registry table**
- **Exclude active quarantine rows from chart/snapshot readers**
- **Preserve all raw Yahoo evidence**
- **Use status-based rollback, not deletion**

## Status

This is a preparation plan only.

Nothing was quarantined in this step.
