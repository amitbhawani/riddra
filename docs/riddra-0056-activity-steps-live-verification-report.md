# Riddra Yahoo 0056 Activity Steps Live Verification Report

Date: 2026-04-30  
Project: `jawojjmapxnevywrmmiq` (`Riddra`, `main`, `PRODUCTION`)

## Scope

Prompt 77 required live verification for:

1. `db/migrations/0056_extend_stock_import_activity_steps.sql`
2. PostgREST schema reload
3. direct acceptance of the new `stock_import_activity_log.step_name` values
4. a 3-stock no-network Yahoo dry run
5. proof that activity rows now use the exact step names directly, not fallback metadata

## Live migration

Applied in the live Supabase SQL Editor:

```sql
alter table if exists public.stock_import_activity_log
  drop constraint if exists stock_import_activity_log_step_name_check;

alter table if exists public.stock_import_activity_log
  add constraint stock_import_activity_log_step_name_check
    check (
      step_name in (
        'fetch_started',
        'fetch_completed',
        'raw_saved',
        'duplicate_payload_deduped',
        'normalization_started',
        'skipped_existing_history_rows',
        'skipped_existing_snapshot',
        'history_write_completed',
        'snapshot_write_completed',
        'normalization_completed',
        'coverage_updated',
        'reconciliation_completed',
        'write_batch_failed',
        'import_failed'
      )
    );

notify pgrst, 'reload schema';
```

Supabase result: `Success. No rows returned`

## Service-role verification

Verified through the same service-role path the app uses:

- `stock_import_activity_log` select access: PASS
- sample query returned rows successfully
- no `PGRST205`

## 3-stock no-network dry run

Executed against the local admin import route with `dryRun: true`:

- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`

Dry-run response:

- status: `200`
- importedCount: `3`
- failedCount: `0`

Generated job ids:

- `INFY.NS`
  - historical: `c9a074ef-7fe9-4ff9-a90f-9bcc6af627a7`
  - quote stats: `9d7165f0-5fd7-4131-989c-9075f858c824`
- `RELIANCE.NS`
  - historical: `6b96df63-2061-424f-8f05-b68990ad668d`
  - quote stats: `8a4fc967-9b2b-464f-b336-a98c3af94d97`
- `TCS.NS`
  - historical: `22f3c485-78bc-4d1e-abcf-d4c03f5f0f70`
  - quote stats: `8210a151-64d0-4ca1-9cbc-0d8e83e0e3c3`

## Activity/reconciliation results

Queried the six job windows directly from Supabase after the dry run.

Durable counts:

- activity rows: `92`
- reconciliation rows: `15`
- fallback `metadata.intendedStepName` rows: `0`

Observed direct `step_name` counts:

- `fetch_started`: `9`
- `fetch_completed`: `9`
- `raw_saved`: `9`
- `normalization_started`: `9`
- `skipped_existing_history_rows`: `3`
- `history_write_completed`: `3`
- `normalization_completed`: `15`
- `coverage_updated`: `15`
- `reconciliation_completed`: `15`
- `snapshot_write_completed`: `3`
- `duplicate_payload_deduped`: `1`
- `skipped_existing_snapshot`: `1`

## Exact-step proof

The dry run itself produced exact direct rows for:

- `skipped_existing_history_rows`
- `history_write_completed`
- `snapshot_write_completed`

Examples:

- `INFY.NS` historical:
  - `skipped_existing_history_rows`
  - `history_write_completed`
- `INFY.NS` latest snapshot:
  - `snapshot_write_completed`
- `RELIANCE.NS` historical:
  - `skipped_existing_history_rows`
  - `history_write_completed`
- `RELIANCE.NS` latest snapshot:
  - `snapshot_write_completed`
- `TCS.NS` historical:
  - `skipped_existing_history_rows`
  - `history_write_completed`
- `TCS.NS` latest snapshot:
  - `snapshot_write_completed`

For the two new step names that this specific dry run does not naturally exercise, I ran a narrow service-role acceptance insert tied to the same live job ids:

- `duplicate_payload_deduped`
- `skipped_existing_snapshot`

Those rows were accepted directly by the database with:

- `step_name` stored exactly as requested
- `metadata.intendedStepName = null`
- `metadata.verificationType = "0056_live_acceptance"`

## Final result

Prompt 77 acceptance is met.

- `0056` is applied live
- PostgREST schema cache was reloaded
- service-role reads work
- new step names are accepted directly by `stock_import_activity_log`
- 3-stock no-network dry run passed
- activity rows now use exact `step_name` values
- fallback metadata is no longer needed for these step names in the live database

## Notes

- The two verification-only acceptance rows inserted for final proof were:
  - `duplicate_payload_deduped`
  - `skipped_existing_snapshot`
- They are marked with `metadata.verificationType = "0056_live_acceptance"` for traceability.
