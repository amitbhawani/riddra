-- Riddra Market Data Import verification
-- Run schema SQL first, then verification SQL.

drop table if exists pg_temp._riddra_market_data_import_verify_results;

create temporary table _riddra_market_data_import_verify_results as
with
required_tables as (
  select *
  from (
    values
      ('market_refresh_runs', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.market_refresh_runs.'),
      ('market_series_status', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.market_series_status.'),
      ('stock_quote_history', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.stock_quote_history.'),
      ('stock_ohlcv_history', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.stock_ohlcv_history.'),
      ('benchmark_ohlcv_history', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.benchmark_ohlcv_history.'),
      ('fund_nav_history', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.fund_nav_history.'),
      ('market_data_import_batches', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.market_data_import_batches.'),
      ('market_data_import_rows', 'Run docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql to create or align public.market_data_import_rows.')
  ) as checks(table_name, fix_sql)
),
required_columns as (
  select *
  from (
    values
      ('market_refresh_runs', 'id', 'uuid'),
      ('market_refresh_runs', 'series_type', 'text'),
      ('market_refresh_runs', 'asset_slug', 'text'),
      ('market_refresh_runs', 'timeframe', 'text'),
      ('market_refresh_runs', 'run_status', 'text'),
      ('market_refresh_runs', 'trigger_source', 'text'),
      ('market_refresh_runs', 'source_label', 'text'),
      ('market_refresh_runs', 'source_code', 'text'),
      ('market_refresh_runs', 'ingest_mode', 'text'),
      ('market_refresh_runs', 'requested_by', 'text'),
      ('market_refresh_runs', 'task_identifier', 'text'),
      ('market_refresh_runs', 'started_at', 'timestamptz'),
      ('market_refresh_runs', 'finished_at', 'timestamptz'),
      ('market_refresh_runs', 'records_written', 'integer'),
      ('market_refresh_runs', 'records_retained', 'integer'),
      ('market_refresh_runs', 'latest_point_at', 'text'),
      ('market_refresh_runs', 'error_message', 'text'),
      ('market_refresh_runs', 'metadata', 'jsonb'),
      ('market_refresh_runs', 'created_at', 'timestamptz'),
      ('market_series_status', 'id', 'uuid'),
      ('market_series_status', 'series_type', 'text'),
      ('market_series_status', 'asset_slug', 'text'),
      ('market_series_status', 'timeframe', 'text'),
      ('market_series_status', 'source_label', 'text'),
      ('market_series_status', 'source_code', 'text'),
      ('market_series_status', 'ingest_mode', 'text'),
      ('market_series_status', 'refresh_status', 'text'),
      ('market_series_status', 'last_refresh_run_id', 'uuid'),
      ('market_series_status', 'last_successful_run_id', 'uuid'),
      ('market_series_status', 'last_refreshed_at', 'timestamptz'),
      ('market_series_status', 'last_successful_at', 'timestamptz'),
      ('market_series_status', 'latest_point_at', 'text'),
      ('market_series_status', 'coverage_start', 'text'),
      ('market_series_status', 'coverage_end', 'text'),
      ('market_series_status', 'records_retained', 'integer'),
      ('market_series_status', 'latest_value', 'numeric(20,6)'),
      ('market_series_status', 'latest_change_percent', 'numeric(12,6)'),
      ('market_series_status', 'metadata', 'jsonb'),
      ('market_series_status', 'created_at', 'timestamptz'),
      ('market_series_status', 'updated_at', 'timestamptz'),
      ('stock_quote_history', 'id', 'uuid'),
      ('stock_quote_history', 'slug', 'text'),
      ('stock_quote_history', 'source_label', 'text'),
      ('stock_quote_history', 'source_code', 'text'),
      ('stock_quote_history', 'quoted_at', 'timestamptz'),
      ('stock_quote_history', 'price', 'numeric(20,6)'),
      ('stock_quote_history', 'change_percent', 'numeric(12,6)'),
      ('stock_quote_history', 'refresh_run_id', 'uuid'),
      ('stock_quote_history', 'payload', 'jsonb'),
      ('stock_quote_history', 'created_at', 'timestamptz'),
      ('stock_quote_history', 'updated_at', 'timestamptz'),
      ('stock_ohlcv_history', 'id', 'uuid'),
      ('stock_ohlcv_history', 'slug', 'text'),
      ('stock_ohlcv_history', 'timeframe', 'text'),
      ('stock_ohlcv_history', 'source_label', 'text'),
      ('stock_ohlcv_history', 'source_code', 'text'),
      ('stock_ohlcv_history', 'bar_time', 'text'),
      ('stock_ohlcv_history', 'open', 'numeric(20,6)'),
      ('stock_ohlcv_history', 'high', 'numeric(20,6)'),
      ('stock_ohlcv_history', 'low', 'numeric(20,6)'),
      ('stock_ohlcv_history', 'close', 'numeric(20,6)'),
      ('stock_ohlcv_history', 'volume', 'numeric(20,6)'),
      ('stock_ohlcv_history', 'refresh_run_id', 'uuid'),
      ('stock_ohlcv_history', 'payload', 'jsonb'),
      ('stock_ohlcv_history', 'created_at', 'timestamptz'),
      ('stock_ohlcv_history', 'updated_at', 'timestamptz'),
      ('benchmark_ohlcv_history', 'id', 'uuid'),
      ('benchmark_ohlcv_history', 'index_slug', 'text'),
      ('benchmark_ohlcv_history', 'date', 'date'),
      ('benchmark_ohlcv_history', 'open', 'numeric'),
      ('benchmark_ohlcv_history', 'high', 'numeric'),
      ('benchmark_ohlcv_history', 'low', 'numeric'),
      ('benchmark_ohlcv_history', 'close', 'numeric'),
      ('benchmark_ohlcv_history', 'volume', 'numeric'),
      ('benchmark_ohlcv_history', 'source_label', 'text'),
      ('benchmark_ohlcv_history', 'source_code', 'text'),
      ('benchmark_ohlcv_history', 'refresh_run_id', 'uuid'),
      ('benchmark_ohlcv_history', 'payload', 'jsonb'),
      ('benchmark_ohlcv_history', 'created_at', 'timestamptz'),
      ('benchmark_ohlcv_history', 'updated_at', 'timestamptz'),
      ('fund_nav_history', 'id', 'uuid'),
      ('fund_nav_history', 'slug', 'text'),
      ('fund_nav_history', 'source_label', 'text'),
      ('fund_nav_history', 'source_code', 'text'),
      ('fund_nav_history', 'nav_date', 'date'),
      ('fund_nav_history', 'nav', 'numeric(20,6)'),
      ('fund_nav_history', 'returns_1y', 'numeric(12,6)'),
      ('fund_nav_history', 'refresh_run_id', 'uuid'),
      ('fund_nav_history', 'payload', 'jsonb'),
      ('fund_nav_history', 'created_at', 'timestamptz'),
      ('fund_nav_history', 'updated_at', 'timestamptz'),
      ('market_data_import_batches', 'id', 'uuid'),
      ('market_data_import_batches', 'data_type', 'text'),
      ('market_data_import_batches', 'import_type', 'text'),
      ('market_data_import_batches', 'execution_mode', 'text'),
      ('market_data_import_batches', 'import_mode', 'text'),
      ('market_data_import_batches', 'duplicate_mode', 'text'),
      ('market_data_import_batches', 'duplicate_strategy', 'text'),
      ('market_data_import_batches', 'status', 'text'),
      ('market_data_import_batches', 'source_type', 'text'),
      ('market_data_import_batches', 'source_label', 'text'),
      ('market_data_import_batches', 'source_url', 'text'),
      ('market_data_import_batches', 'file_name', 'text'),
      ('market_data_import_batches', 'actor_user_id', 'text'),
      ('market_data_import_batches', 'actor_email', 'text'),
      ('market_data_import_batches', 'imported_by', 'text'),
      ('market_data_import_batches', 'imported_at', 'timestamptz'),
      ('market_data_import_batches', 'started_at', 'timestamptz'),
      ('market_data_import_batches', 'completed_at', 'timestamptz'),
      ('market_data_import_batches', 'row_count', 'integer'),
      ('market_data_import_batches', 'total_rows', 'integer'),
      ('market_data_import_batches', 'valid_rows', 'integer'),
      ('market_data_import_batches', 'warning_rows', 'integer'),
      ('market_data_import_batches', 'warning_count', 'integer'),
      ('market_data_import_batches', 'failed_rows', 'integer'),
      ('market_data_import_batches', 'error_count', 'integer'),
      ('market_data_import_batches', 'duplicate_rows', 'integer'),
      ('market_data_import_batches', 'success_count', 'integer'),
      ('market_data_import_batches', 'failure_count', 'integer'),
      ('market_data_import_batches', 'skipped_count', 'integer'),
      ('market_data_import_batches', 'summary', 'text'),
      ('market_data_import_batches', 'metadata', 'jsonb'),
      ('market_data_import_batches', 'created_at', 'timestamptz'),
      ('market_data_import_batches', 'updated_at', 'timestamptz'),
      ('market_data_import_rows', 'id', 'uuid'),
      ('market_data_import_rows', 'batch_id', 'uuid'),
      ('market_data_import_rows', 'row_number', 'integer'),
      ('market_data_import_rows', 'identifier', 'text'),
      ('market_data_import_rows', 'mapped_slug', 'text'),
      ('market_data_import_rows', 'mapped_label', 'text'),
      ('market_data_import_rows', 'import_date', 'date'),
      ('market_data_import_rows', 'status', 'text'),
      ('market_data_import_rows', 'duplicate_state', 'text'),
      ('market_data_import_rows', 'warnings', 'jsonb'),
      ('market_data_import_rows', 'errors', 'jsonb'),
      ('market_data_import_rows', 'payload', 'jsonb'),
      ('market_data_import_rows', 'result_note', 'text'),
      ('market_data_import_rows', 'created_at', 'timestamptz'),
      ('market_data_import_rows', 'updated_at', 'timestamptz')
  ) as checks(table_name, column_name, column_type)
),
required_indexes as (
  select *
  from (
    values
      (
        'market_series_status_upsert_key',
        'market_series_status',
        null,
        '(series_type, asset_slug, timeframe)',
        'create unique index if not exists market_series_status_series_asset_timeframe_unique_idx on public.market_series_status (series_type, asset_slug, timeframe);'
      ),
      (
        'stock_quote_history_upsert_key',
        'stock_quote_history',
        null,
        '(slug, quoted_at, source_label)',
        'create unique index if not exists stock_quote_history_unique_idx on public.stock_quote_history (slug, quoted_at, source_label);'
      ),
      (
        'stock_ohlcv_history_upsert_key',
        'stock_ohlcv_history',
        null,
        '(slug, timeframe, bar_time, source_label)',
        'create unique index if not exists stock_ohlcv_history_unique_idx on public.stock_ohlcv_history (slug, timeframe, bar_time, source_label);'
      ),
      (
        'benchmark_ohlcv_history_upsert_key',
        'benchmark_ohlcv_history',
        null,
        '(index_slug, date, source_label)',
        'create unique index if not exists benchmark_ohlcv_history_unique_idx on public.benchmark_ohlcv_history (index_slug, date, source_label);'
      ),
      (
        'fund_nav_history_upsert_key',
        'fund_nav_history',
        null,
        '(slug, nav_date, source_label)',
        'create unique index if not exists fund_nav_history_unique_idx on public.fund_nav_history (slug, nav_date, source_label);'
      ),
      (
        'market_data_import_rows_upsert_key',
        'market_data_import_rows',
        null,
        '(batch_id, row_number)',
        'create unique index if not exists market_data_import_rows_batch_row_unique_idx on public.market_data_import_rows (batch_id, row_number);'
      )
  ) as checks(check_name, table_name, column_name, columns_fragment, fix_sql)
),
table_checks as (
  select
    10 as sort_order,
    'table_exists:' || checks.table_name as check_name,
    checks.table_name,
    cast(null as text) as column_name,
    case
      when exists (
        select 1
        from information_schema.tables t
        where t.table_schema = 'public'
          and t.table_name = checks.table_name
      ) then 'PASS'
      else 'FAIL'
    end as status,
    case
      when exists (
        select 1
        from information_schema.tables t
        where t.table_schema = 'public'
          and t.table_name = checks.table_name
      ) then 'Table is present.'
      else 'Missing table in public schema.'
    end as reason,
    checks.fix_sql
  from required_tables checks
),
column_checks as (
  select
    20 as sort_order,
    'column_exists:' || checks.table_name || '.' || checks.column_name as check_name,
    checks.table_name,
    checks.column_name,
    case
      when exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = checks.table_name
          and c.column_name = checks.column_name
      ) then 'PASS'
      else 'FAIL'
    end as status,
    case
      when exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = checks.table_name
          and c.column_name = checks.column_name
      ) then 'Column is present.'
      else 'Missing column after schema alignment.'
    end as reason,
    'alter table public.' || checks.table_name || ' add column if not exists ' || checks.column_name || ' ' || checks.column_type || ';' as fix_sql
  from required_columns checks
),
index_checks as (
  select
    30 as sort_order,
    checks.check_name,
    checks.table_name,
    checks.column_name,
    case
      when exists (
        select 1
        from pg_indexes i
        where i.schemaname = 'public'
          and i.tablename = checks.table_name
          and replace(i.indexdef, '"', '') ilike '%' || checks.columns_fragment || '%'
      ) then 'PASS'
      else 'FAIL'
    end as status,
    case
      when exists (
        select 1
        from pg_indexes i
        where i.schemaname = 'public'
          and i.tablename = checks.table_name
          and replace(i.indexdef, '"', '') ilike '%' || checks.columns_fragment || '%'
      ) then 'Conflict key is present.'
      else 'Missing unique index or conflict key required by durable upsert logic.'
    end as reason,
    checks.fix_sql
  from required_indexes checks
),
preflight as (
  select
    40 as sort_order,
    'proof_dml:preflight' as check_name,
    cast(null as text) as table_name,
    cast(null as text) as column_name,
    case
      when exists (
        select 1 from table_checks where status = 'FAIL'
        union all
        select 1 from column_checks where status = 'FAIL'
        union all
        select 1 from index_checks where status = 'FAIL'
      ) then 'FAIL'
      else 'PASS'
    end as status,
    case
      when exists (
        select 1 from table_checks where status = 'FAIL'
        union all
        select 1 from column_checks where status = 'FAIL'
        union all
        select 1 from index_checks where status = 'FAIL'
      ) then 'Required tables, columns, or unique keys are missing, so proof inserts were skipped.'
      else 'Required tables, columns, and unique keys are present.'
    end as reason,
    'Fix any earlier FAIL rows using their fix_sql values, then rerun this verification SQL.' as fix_sql
),
cleanup_before_rows as (
  delete from public.market_data_import_rows
  where batch_id = '00000000-0000-4000-8000-000000004201'
  returning 1
),
cleanup_before_batches as (
  delete from public.market_data_import_batches
  where id = '00000000-0000-4000-8000-000000004201'
     or file_name = '__riddra_market_data_import_verify__.csv'
  returning 1
),
cleanup_before_series_status as (
  delete from public.market_series_status
  where asset_slug = '__riddra_market_data_verify__'
  returning 1
),
cleanup_before_quotes as (
  delete from public.stock_quote_history
  where slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
  returning 1
),
cleanup_before_stock as (
  delete from public.stock_ohlcv_history
  where slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
  returning 1
),
cleanup_before_benchmark as (
  delete from public.benchmark_ohlcv_history
  where index_slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
  returning 1
),
cleanup_before_fund as (
  delete from public.fund_nav_history
  where slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
  returning 1
),
cleanup_before_runs as (
  delete from public.market_refresh_runs
  where id = '00000000-0000-4000-8000-000000004200'
  returning 1
),
insert_refresh_run as (
  insert into public.market_refresh_runs (
    id,
    series_type,
    asset_slug,
    timeframe,
    run_status,
    trigger_source,
    source_label,
    source_code,
    ingest_mode,
    requested_by,
    task_identifier,
    started_at,
    finished_at,
    records_written,
    records_retained,
    latest_point_at,
    error_message,
    metadata,
    created_at
  )
  select
    '00000000-0000-4000-8000-000000004200'::uuid,
    'stock_ohlcv',
    '__riddra_market_data_verify__',
    '1D',
    'succeeded',
    'verify_sql',
    'verify_sql',
    'verify',
    'manual_entry',
    'verify@riddra.com',
    'verify-task',
    now(),
    now(),
    1,
    1,
    '2026-04-20',
    null,
    '{"verify":true}'::jsonb,
    now()
  where not exists (
    select 1 from preflight where status = 'FAIL'
  )
  returning 1
),
insert_series_status as (
  insert into public.market_series_status (
    series_type,
    asset_slug,
    timeframe,
    source_label,
    source_code,
    ingest_mode,
    refresh_status,
    last_refresh_run_id,
    last_successful_run_id,
    last_refreshed_at,
    last_successful_at,
    latest_point_at,
    coverage_start,
    coverage_end,
    records_retained,
    latest_value,
    latest_change_percent,
    metadata,
    created_at,
    updated_at
  )
  select
    'stock_ohlcv',
    '__riddra_market_data_verify__',
    '1D',
    'verify_sql',
    'verify',
    'manual_entry',
    'live',
    '00000000-0000-4000-8000-000000004200'::uuid,
    '00000000-0000-4000-8000-000000004200'::uuid,
    now(),
    now(),
    '2026-04-20',
    '2026-04-20',
    '2026-04-20',
    1,
    108,
    null,
    '{"verify":true}'::jsonb,
    now(),
    now()
  from insert_refresh_run
  returning 1
),
insert_batch as (
  insert into public.market_data_import_batches (
    id,
    data_type,
    import_type,
    execution_mode,
    import_mode,
    duplicate_mode,
    duplicate_strategy,
    status,
    source_type,
    source_label,
    source_url,
    file_name,
    actor_user_id,
    actor_email,
    imported_by,
    imported_at,
    started_at,
    completed_at,
    row_count,
    total_rows,
    valid_rows,
    warning_rows,
    warning_count,
    failed_rows,
    error_count,
    duplicate_rows,
    success_count,
    failure_count,
    skipped_count,
    summary,
    metadata,
    created_at,
    updated_at
  )
  select
    '00000000-0000-4000-8000-000000004201'::uuid,
    'stock_ohlcv',
    'stock_ohlcv',
    'validate_only',
    'validate_only',
    'replace_matching_dates',
    'replace_matching_dates',
    'preview_ready',
    'manual_csv',
    'verify_sql',
    'https://example.com/verify.csv',
    '__riddra_market_data_import_verify__.csv',
    'verify-user',
    'verify@riddra.com',
    'verify@riddra.com',
    now(),
    now(),
    now(),
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    'Verification batch',
    '{"verify":true}'::jsonb,
    now(),
    now()
  where not exists (
    select 1 from preflight where status = 'FAIL'
  )
  returning 1
),
insert_batch_row as (
  insert into public.market_data_import_rows (
    id,
    batch_id,
    row_number,
    identifier,
    mapped_slug,
    mapped_label,
    import_date,
    status,
    duplicate_state,
    warnings,
    errors,
    payload,
    result_note,
    created_at,
    updated_at
  )
  select
    '00000000-0000-4000-8000-000000004202'::uuid,
    '00000000-0000-4000-8000-000000004201'::uuid,
    2,
    'VERIFY',
    '__riddra_market_data_verify__',
    'Verification Asset',
    date '2026-04-20',
    'valid',
    'none',
    '[]'::jsonb,
    '[]'::jsonb,
    '{"symbol":"VERIFY"}'::jsonb,
    'Verification row',
    now(),
    now()
  from insert_batch
  returning 1
),
insert_quote as (
  insert into public.stock_quote_history (
    slug,
    source_label,
    source_code,
    quoted_at,
    price,
    change_percent,
    refresh_run_id,
    payload,
    created_at,
    updated_at
  )
  select
    '__riddra_market_data_verify__',
    'verify_sql',
    'verify',
    now(),
    108,
    0.5,
    '00000000-0000-4000-8000-000000004200'::uuid,
    '{"verify":true}'::jsonb,
    now(),
    now()
  from insert_refresh_run
  returning 1
),
insert_stock_ohlcv as (
  insert into public.stock_ohlcv_history (
    slug,
    timeframe,
    source_label,
    source_code,
    bar_time,
    open,
    high,
    low,
    close,
    volume,
    refresh_run_id,
    payload,
    created_at,
    updated_at
  )
  select
    '__riddra_market_data_verify__',
    '1D',
    'verify_sql',
    'verify',
    '2026-04-20',
    100,
    110,
    95,
    108,
    1000000,
    '00000000-0000-4000-8000-000000004200'::uuid,
    '{"verify":true}'::jsonb,
    now(),
    now()
  from insert_refresh_run
  returning 1
),
insert_benchmark_ohlcv as (
  insert into public.benchmark_ohlcv_history (
    index_slug,
    date,
    open,
    high,
    low,
    close,
    volume,
    source_label,
    source_code,
    refresh_run_id,
    payload,
    created_at,
    updated_at
  )
  select
    '__riddra_market_data_verify__',
    date '2026-04-20',
    22000,
    22300,
    21900,
    22250,
    0,
    'verify_sql',
    'verify',
    '00000000-0000-4000-8000-000000004200'::uuid,
    '{"verify":true}'::jsonb,
    now(),
    now()
  from insert_refresh_run
  returning 1
),
insert_fund_nav as (
  insert into public.fund_nav_history (
    slug,
    source_label,
    source_code,
    nav_date,
    nav,
    returns_1y,
    refresh_run_id,
    payload,
    created_at,
    updated_at
  )
  select
    '__riddra_market_data_verify__',
    'verify_sql',
    'verify',
    date '2026-04-20',
    100.25,
    null,
    '00000000-0000-4000-8000-000000004200'::uuid,
    '{"verify":true}'::jsonb,
    now(),
    now()
  from insert_refresh_run
  returning 1
),
proof_readback as (
  select
    50 as sort_order,
    'proof_dml:readback' as check_name,
    cast(null as text) as table_name,
    cast(null as text) as column_name,
    case
      when exists (
        select 1 from preflight where status = 'FAIL'
      ) then 'FAIL'
      when
        exists(select 1 from public.market_data_import_batches where id = '00000000-0000-4000-8000-000000004201'::uuid)
        and exists(select 1 from public.market_data_import_rows where id = '00000000-0000-4000-8000-000000004202'::uuid)
        and exists(select 1 from public.market_refresh_runs where id = '00000000-0000-4000-8000-000000004200'::uuid)
        and exists(
          select 1
          from public.market_series_status
          where series_type = 'stock_ohlcv'
            and asset_slug = '__riddra_market_data_verify__'
            and timeframe = '1D'
        )
        and exists(
          select 1
          from public.stock_quote_history
          where slug = '__riddra_market_data_verify__'
            and source_label = 'verify_sql'
        )
        and exists(
          select 1
          from public.stock_ohlcv_history
          where slug = '__riddra_market_data_verify__'
            and timeframe = '1D'
            and bar_time = '2026-04-20'
            and source_label = 'verify_sql'
        )
        and exists(
          select 1
          from public.benchmark_ohlcv_history
          where index_slug = '__riddra_market_data_verify__'
            and date = date '2026-04-20'
            and source_label = 'verify_sql'
        )
        and exists(
          select 1
          from public.fund_nav_history
          where slug = '__riddra_market_data_verify__'
            and nav_date = date '2026-04-20'
            and source_label = 'verify_sql'
        )
      then 'PASS'
      else 'FAIL'
    end as status,
    case
      when exists (
        select 1 from preflight where status = 'FAIL'
      ) then 'Proof insert/readback was skipped because preflight failed.'
      else
        'Batch=' ||
        exists(select 1 from public.market_data_import_batches where id = '00000000-0000-4000-8000-000000004201'::uuid) ||
        ', row=' ||
        exists(select 1 from public.market_data_import_rows where id = '00000000-0000-4000-8000-000000004202'::uuid) ||
        ', refresh_run=' ||
        exists(select 1 from public.market_refresh_runs where id = '00000000-0000-4000-8000-000000004200'::uuid) ||
        ', series_status=' ||
        exists(
          select 1
          from public.market_series_status
          where series_type = 'stock_ohlcv'
            and asset_slug = '__riddra_market_data_verify__'
            and timeframe = '1D'
        ) ||
        ', quote=' ||
        exists(
          select 1
          from public.stock_quote_history
          where slug = '__riddra_market_data_verify__'
            and source_label = 'verify_sql'
        ) ||
        ', stock=' ||
        exists(
          select 1
          from public.stock_ohlcv_history
          where slug = '__riddra_market_data_verify__'
            and timeframe = '1D'
            and bar_time = '2026-04-20'
            and source_label = 'verify_sql'
        ) ||
        ', benchmark=' ||
        exists(
          select 1
          from public.benchmark_ohlcv_history
          where index_slug = '__riddra_market_data_verify__'
            and date = date '2026-04-20'
            and source_label = 'verify_sql'
        ) ||
        ', fund=' ||
        exists(
          select 1
          from public.fund_nav_history
          where slug = '__riddra_market_data_verify__'
            and nav_date = date '2026-04-20'
            and source_label = 'verify_sql'
        )
    end as reason,
    'If readback fails, rerun docs/RIDDRA_MARKET_DATA_IMPORT_SCHEMA_FIX.sql and inspect the missing table, column, or index reported above.' as fix_sql
  from preflight
),
cleanup_after_rows as (
  delete from public.market_data_import_rows
  where batch_id = '00000000-0000-4000-8000-000000004201'::uuid
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_batches as (
  delete from public.market_data_import_batches
  where id = '00000000-0000-4000-8000-000000004201'::uuid
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_series_status as (
  delete from public.market_series_status
  where asset_slug = '__riddra_market_data_verify__'
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_quotes as (
  delete from public.stock_quote_history
  where slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_stock as (
  delete from public.stock_ohlcv_history
  where slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_benchmark as (
  delete from public.benchmark_ohlcv_history
  where index_slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_fund as (
  delete from public.fund_nav_history
  where slug = '__riddra_market_data_verify__'
    and source_label = 'verify_sql'
    and exists (select 1 from proof_readback)
  returning 1
),
cleanup_after_runs as (
  delete from public.market_refresh_runs
  where id = '00000000-0000-4000-8000-000000004200'::uuid
    and exists (select 1 from proof_readback)
  returning 1
),
proof_cleanup as (
  select
    60 as sort_order,
    'proof_cleanup:cleanup' as check_name,
    cast(null as text) as table_name,
    cast(null as text) as column_name,
    case
      when not exists(select 1 from public.market_data_import_batches where id = '00000000-0000-4000-8000-000000004201'::uuid)
       and not exists(select 1 from public.market_data_import_rows where id = '00000000-0000-4000-8000-000000004202'::uuid)
       and not exists(select 1 from public.market_refresh_runs where id = '00000000-0000-4000-8000-000000004200'::uuid)
       and not exists(select 1 from public.market_series_status where asset_slug = '__riddra_market_data_verify__')
       and not exists(select 1 from public.stock_quote_history where slug = '__riddra_market_data_verify__' and source_label = 'verify_sql')
       and not exists(select 1 from public.stock_ohlcv_history where slug = '__riddra_market_data_verify__' and source_label = 'verify_sql')
       and not exists(select 1 from public.benchmark_ohlcv_history where index_slug = '__riddra_market_data_verify__' and source_label = 'verify_sql')
       and not exists(select 1 from public.fund_nav_history where slug = '__riddra_market_data_verify__' and source_label = 'verify_sql')
      then 'PASS'
      else 'FAIL'
    end as status,
    'Batch=' ||
    exists(select 1 from public.market_data_import_batches where id = '00000000-0000-4000-8000-000000004201'::uuid) ||
    ', row=' ||
    exists(select 1 from public.market_data_import_rows where id = '00000000-0000-4000-8000-000000004202'::uuid) ||
    ', refresh_run=' ||
    exists(select 1 from public.market_refresh_runs where id = '00000000-0000-4000-8000-000000004200'::uuid) ||
    ', series_status=' ||
    exists(select 1 from public.market_series_status where asset_slug = '__riddra_market_data_verify__') ||
    ', quote=' ||
    exists(select 1 from public.stock_quote_history where slug = '__riddra_market_data_verify__' and source_label = 'verify_sql') ||
    ', stock=' ||
    exists(select 1 from public.stock_ohlcv_history where slug = '__riddra_market_data_verify__' and source_label = 'verify_sql') ||
    ', benchmark=' ||
    exists(select 1 from public.benchmark_ohlcv_history where index_slug = '__riddra_market_data_verify__' and source_label = 'verify_sql') ||
    ', fund=' ||
    exists(select 1 from public.fund_nav_history where slug = '__riddra_market_data_verify__' and source_label = 'verify_sql') as reason,
    'delete from public.market_data_import_rows where batch_id = ''00000000-0000-4000-8000-000000004201''::uuid; delete from public.market_data_import_batches where id = ''00000000-0000-4000-8000-000000004201''::uuid; delete from public.market_series_status where asset_slug = ''__riddra_market_data_verify__''; delete from public.stock_quote_history where slug = ''__riddra_market_data_verify__'' and source_label = ''verify_sql''; delete from public.stock_ohlcv_history where slug = ''__riddra_market_data_verify__'' and source_label = ''verify_sql''; delete from public.benchmark_ohlcv_history where index_slug = ''__riddra_market_data_verify__'' and source_label = ''verify_sql''; delete from public.fund_nav_history where slug = ''__riddra_market_data_verify__'' and source_label = ''verify_sql''; delete from public.market_refresh_runs where id = ''00000000-0000-4000-8000-000000004200''::uuid;' as fix_sql
  from proof_readback
),
results as (
  select * from table_checks
  union all
  select * from column_checks
  union all
  select * from index_checks
  union all
  select * from preflight
  union all
  select * from proof_readback
  union all
  select * from proof_cleanup
)
select
  check_name,
  table_name,
  column_name,
  status,
  reason,
  fix_sql,
  sort_order
from results;

select
  check_name,
  table_name,
  column_name,
  status,
  reason,
  fix_sql
from _riddra_market_data_import_verify_results
order by sort_order, check_name;

select
  case
    when count(*) filter (where status = 'FAIL') = 0 then 'PASS'
    else 'FAIL'
  end as final_status,
  count(*) filter (where status = 'FAIL') as failed_checks,
  count(*) filter (where status = 'PASS') as passed_checks
from _riddra_market_data_import_verify_results;
