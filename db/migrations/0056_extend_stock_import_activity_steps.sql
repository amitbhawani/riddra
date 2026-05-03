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
