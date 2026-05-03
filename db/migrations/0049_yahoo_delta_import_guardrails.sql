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
