alter table if exists public.raw_yahoo_imports
  add column if not exists module_name text;

alter table if exists public.raw_yahoo_imports
  add column if not exists request_url text;

alter table if exists public.raw_yahoo_imports
  add column if not exists request_type text;

alter table if exists public.raw_yahoo_imports
  add column if not exists status text not null default 'completed';

alter table if exists public.raw_yahoo_imports
  add column if not exists error_message text;

create index if not exists raw_yahoo_imports_module_name_idx
  on public.raw_yahoo_imports (module_name);

create index if not exists raw_yahoo_imports_request_type_idx
  on public.raw_yahoo_imports (request_type);

create index if not exists raw_yahoo_imports_status_idx
  on public.raw_yahoo_imports (status);
