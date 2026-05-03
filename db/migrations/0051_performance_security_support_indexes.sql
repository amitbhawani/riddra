create index if not exists stocks_master_status_idx
  on public.stocks_master (status);

create index if not exists stock_import_coverage_stock_bucket_idx
  on public.stock_import_coverage (stock_id, bucket_key);

create index if not exists stock_import_jobs_job_kind_started_idx
  on public.stock_import_jobs (job_kind, started_at desc);

create index if not exists raw_yahoo_imports_source_type_imported_at_idx
  on public.raw_yahoo_imports (source_type, imported_at desc);
