# Riddra Yahoo 0049 Delta Guardrails Verification Report

Last updated: 2026-04-29 IST

## Verdict

**PASS** for migration `0049_yahoo_delta_import_guardrails.sql` in the live Supabase project `jawojjmapxnevywrmmiq`.

The live database now exposes the new `response_hash` column and the delta/skip guardrails are working in real RELIANCE single-stock validation.

No large Yahoo batch import was run in this task.

## 1. Migration Applied

Applied in the live Supabase SQL Editor for project:

- `https://jawojjmapxnevywrmmiq.supabase.co`
- project ref: `jawojjmapxnevywrmmiq`

Executed SQL:

```sql
alter table if exists public.raw_yahoo_imports
  add column if not exists response_hash text;

create index if not exists raw_yahoo_imports_response_hash_idx
  on public.raw_yahoo_imports (response_hash);

create index if not exists raw_yahoo_imports_failed_dedupe_idx
  on public.raw_yahoo_imports (
    stock_id,
    source_bucket,
    module_name,
    request_type,
    status,
    imported_at desc
  );

notify pgrst, 'reload schema';
```

Supabase SQL Editor result:

- `Success. No rows returned`

## 2. PostgREST Reload

PostgREST schema cache was reloaded as part of the SQL run with:

```sql
notify pgrst, 'reload schema';
```

No `PGRST205` surfaced in the follow-up service-role checks below.

## 3. Service-Role Verification

Real service-role checks against the live app database path succeeded for the changed and dependent Yahoo tables:

| Table | Query | Result |
|---|---|---|
| `raw_yahoo_imports` | `select id,response_hash,status,imported_at limit 1` | `200 OK` |
| `stock_import_jobs` | `select id,status,metadata,updated_at limit 1` | `200 OK` |
| `stock_import_activity_log` | `select id,step_name,status,message,metadata,started_at limit 1` | `200 OK` |
| `stock_import_reconciliation` | `select id,module_name,reconciliation_status,... limit 1` | `200 OK` |

Sample `raw_yahoo_imports` row after verification:

```json
{
  "id": "2e5913ae-e703-418f-bc7f-27b2c8b6cd2c",
  "module_name": "incomeStatementHistory,incomeStatementHistoryQuarterly,balanceSheetHistory,balanceSheetHistoryQuarterly,cashflowStatementHistory,cashflowStatementHistoryQuarterly",
  "source_bucket": "financial_statements",
  "status": "failed",
  "response_hash": "7f545d921aca88a206e43d193aa812cb8125fe5fceeef87876aa224830d6d9b7",
  "error_message": "Invalid Crumb"
}
```

## 4. `response_hash` Column Status

`response_hash` is now:

- physically present on `public.raw_yahoo_imports`
- queryable through Supabase REST/service-role
- being populated on new raw Yahoo rows

Confirmed examples written after 0049:

| Source bucket | Module | Status | `response_hash` |
|---|---|---|---|
| `historical_prices` | `chart` | `completed` | non-null |
| `quote_latest` | `quote` | `failed` | non-null |
| `valuation_statistics` | `summaryDetail,defaultKeyStatistics,financialData,price` | `failed` | non-null |
| `financial_statements` | statement module bundle | `failed` | non-null |

Important note:

- older failed rows from before 0049 still exist with `response_hash = null`
- 0049 is **forward-looking**
- it prevents new repeated failed-row noise; it does not backfill legacy rows automatically

## 5. Delta / Skip Tracking Field Verification

The new delta/skip counters are stored in `stock_import_jobs.metadata` and are now queryable live.

Confirmed metadata fields:

- `mode`
- `fetchWindow`
- `existingDataReused`
- `savedRequestsAvoided`
- `skippedExistingHistory`
- `skippedExistingHistoryCount`
- `skippedExistingSnapshot`
- `skippedExistingSnapshotCount`
- `skippedDuplicateRawResponseCount`

Live examples:

### Historical reuse job

Job: `6ee31671-bea9-4969-80b8-39748f9a9a3e`

```json
{
  "mode": "update_recent",
  "insertedRows": 0,
  "updatedRows": 0,
  "skippedRows": 20,
  "existingDataReused": 20,
  "skippedExistingHistory": 20,
  "skippedExistingHistoryCount": 20,
  "savedRequestsAvoided": 0
}
```

### Snapshot skip job

Job: `f01eadf2-6c23-4350-8f7e-bf2b35c6322a`

```json
{
  "snapshotTradeDate": "2026-04-29",
  "skippedExistingSnapshot": true,
  "skippedExistingSnapshotCount": 1,
  "savedRequestsAvoided": 1,
  "existingDataReused": 1
}
```

## 6. Validation Approach Used

The requested preference was:

- no-network dry-run, **or**
- safe single-stock validation

The dashboard dry-run helper currently has a separate selector bug:

- `POST /api/admin/market-data/stocks/import` with `{ dryRun: true }`
- returned `400`
- error: `No importable stocks were selected for Yahoo import.`

Because of that route-level issue, I used the allowed **safe single-stock** validation path for:

- `RELIANCE.NS`
- stock id `1e0fab79-e038-4b74-a135-af61999090cd`

This exercised the real importer logic without running any large batch.

## 7. Safe Single-Stock Validation Results

### 7.1 Historical prices

#### Run 1: seed

Job: `2f8d584a-e4f8-4f80-aa63-68063f69324b`

- mode: `full_initial`
- inserted: `365`
- updated: `0`
- skipped: `0`

#### Run 2: backfill missing

Job: `6cf104b5-a182-412b-b25a-9127dcb9be36`

- mode: `backfill_missing`
- inserted: `7370`
- skipped: `239`
- existing data reused: `239`

#### Run 3: reuse existing recent history

Job: `6ee31671-bea9-4969-80b8-39748f9a9a3e`

- mode: `update_recent`
- inserted: `0`
- updated: `0`
- skipped: `20`
- existing data reused: `20`

This is the clean proof that existing recent history is now reused instead of rewritten.

### 7.2 Quote snapshot

#### Run 1: create same-day snapshot

Job: `45628bcd-b7b2-4f5a-bab4-f95131cd1de9`

- created latest same-day snapshot row
- latest snapshot now exists for:
  - `trade_date = 2026-04-29`
  - `price = 1430.099976`
  - `snapshot_at = 2026-04-29T03:45:00+00:00`

#### Run 2: same-day skip

Job: `f01eadf2-6c23-4350-8f7e-bf2b35c6322a`

- `rawImportIds = []`
- `skippedExistingSnapshot = true`
- `savedRequestsAvoided = 1`
- `existingDataReused = 1`

This is the clean proof that today’s snapshot is skipped once it already exists.

### 7.3 Duplicate failed raw response protection

#### Financial statements run 1

Job: `385382df-b6a7-43cc-ab60-f6fb92e9c8ad`

- Yahoo financial statements remained blocked
- one canonical failed raw row was written with non-null `response_hash`

#### Financial statements run 2

Job: `351129c3-9565-427c-8d3e-5b04013a45bd`

- still blocked
- `rawImportId = null`
- failed raw row count for RELIANCE on `2026-04-29` stayed at `19`
- no second duplicate hashed financial failure row was inserted

This is the proof that duplicate failed raw responses are no longer repeatedly inserted once a hashed same-day failure already exists.

## 8. Activity Log Evidence

`stock_import_activity_log` is working and shows the new skip/reuse behavior.

### Snapshot skip evidence

Job: `f01eadf2-6c23-4350-8f7e-bf2b35c6322a`

```json
{
  "module_name": "latest_market_snapshot",
  "step_name": "normalization_completed",
  "status": "completed",
  "message": "Skipped Yahoo snapshot fetch for RELIANCE because today's snapshot already exists.",
  "rows_skipped": 1,
  "metadata": {
    "skipReason": "snapshot_already_exists_today"
  }
}
```

### Historical reuse evidence

Job: `6ee31671-bea9-4969-80b8-39748f9a9a3e`

```json
{
  "module_name": "historical_prices",
  "step_name": "normalization_completed",
  "rows_skipped": 20,
  "message": "Normalized Yahoo historical daily rows for RELIANCE."
}
```

And the same job’s metadata confirms the reuse counter:

```json
{
  "existingDataReused": 20,
  "skippedExistingHistoryCount": 20
}
```

### Reused existing data evidence

The user-facing reuse counter is currently exposed in `stock_import_jobs.metadata` rather than as a dedicated `stock_import_activity_log.step_name` string.

Verified live:

- quote skip job: `existingDataReused = 1`
- historical reuse job: `existingDataReused = 20`

So the reuse signal is live and queryable, even though the activity timeline currently expresses it as skipped rows + job metadata rather than a separate `reused_existing_data` step label.

## 9. Frontend / Admin Checks

After the 0049 application and safe RELIANCE validation:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |

## 10. Acceptance Criteria Check

| Check | Result |
|---|---|
| Apply 0049 safely | PASS |
| Reload PostgREST schema cache | PASS |
| Service-role access to new/changed fields | PASS |
| `response_hash` exists on `raw_yahoo_imports` | PASS |
| Delta/skip tracking fields are queryable | PASS |
| Existing history is reused | PASS |
| Today’s snapshot is skipped if already present | PASS |
| Duplicate failed raw responses are not repeatedly inserted | PASS |
| Activity/reconciliation/admin/frontend stayed healthy | PASS |

## 11. Follow-Up Note

One separate issue remains outside 0049 itself:

- the dashboard dry-run selector path for `/api/admin/market-data/stocks/import`
- currently returns `No importable stocks were selected for Yahoo import.`

That should be fixed separately, but it does **not** block the live database guardrails introduced by 0049.

## 12. Final Conclusion

Migration `0049_yahoo_delta_import_guardrails.sql` is now **live, queryable, and behaviorally verified**.

From a delta/anti-waste perspective:

- historical imports now reuse existing data correctly
- same-day snapshots are skipped correctly
- repeated blocked-module failures are no longer inserted endlessly once a hashed same-day failure exists

That means the live Yahoo importer now has the intended **delta guardrails** in place for safe single-stock operation.
