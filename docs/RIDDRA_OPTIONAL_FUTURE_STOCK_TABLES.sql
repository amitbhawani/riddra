-- Riddra optional future stock-table RLS snippets
--
-- This file is intentionally separate from db/migrations/0057_rls_security_closure.sql.
-- Do not include these tables in the required RLS migration until they actually exist.
--
-- Usage:
-- - create the table first in its own schema migration
-- - then run only the relevant guarded block below

-- Future public-read stock fundamentals snapshot table.
do $$
begin
  if to_regclass('public.stock_fundamental_snapshots') is not null then
    execute 'alter table public.stock_fundamental_snapshots enable row level security';
    execute 'revoke all on public.stock_fundamental_snapshots from anon, authenticated';
    execute 'grant select on public.stock_fundamental_snapshots to anon, authenticated';
    execute 'drop policy if exists stock_fundamental_snapshots_public_read on public.stock_fundamental_snapshots';
    execute 'create policy stock_fundamental_snapshots_public_read on public.stock_fundamental_snapshots for select to anon, authenticated using (true)';
  end if;
end
$$;

-- Future public-read stock shareholding snapshot table.
do $$
begin
  if to_regclass('public.stock_shareholding_snapshots') is not null then
    execute 'alter table public.stock_shareholding_snapshots enable row level security';
    execute 'revoke all on public.stock_shareholding_snapshots from anon, authenticated';
    execute 'grant select on public.stock_shareholding_snapshots to anon, authenticated';
    execute 'drop policy if exists stock_shareholding_snapshots_public_read on public.stock_shareholding_snapshots';
    execute 'create policy stock_shareholding_snapshots_public_read on public.stock_shareholding_snapshots for select to anon, authenticated using (true)';
  end if;
end
$$;

-- Future public-read stock forecast snapshot table.
-- Only keep this public if the product explicitly exposes forecasts to all visitors.
do $$
begin
  if to_regclass('public.stock_forecast_snapshots') is not null then
    execute 'alter table public.stock_forecast_snapshots enable row level security';
    execute 'revoke all on public.stock_forecast_snapshots from anon, authenticated';
    execute 'grant select on public.stock_forecast_snapshots to anon, authenticated';
    execute 'drop policy if exists stock_forecast_snapshots_public_read on public.stock_forecast_snapshots';
    execute 'create policy stock_forecast_snapshots_public_read on public.stock_forecast_snapshots for select to anon, authenticated using (true)';
  end if;
end
$$;

-- Future stock documents table.
-- Conservative default: admin-only until there is an explicit public-document product requirement.
do $$
begin
  if to_regclass('public.stock_documents') is not null then
    execute 'alter table public.stock_documents enable row level security';
    execute 'revoke all on public.stock_documents from anon, authenticated';
    execute 'grant select, insert, update, delete on public.stock_documents to authenticated';
    execute 'drop policy if exists stock_documents_admin_all on public.stock_documents';
    execute 'create policy stock_documents_admin_all on public.stock_documents for all to authenticated using (public.riddra_is_admin()) with check (public.riddra_is_admin())';
  end if;
end
$$;
