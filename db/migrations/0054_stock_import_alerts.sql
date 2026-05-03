create table if not exists public.stock_import_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'warning',
  message text not null,
  affected_scope text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint stock_import_alerts_alert_type_check
    check (
      alert_type in (
        'job_failure_rate_high',
        'yahoo_cooldown_triggered',
        'snapshot_skip_rate_high',
        'db_write_failures_spike',
        'no_successful_job_in_6h'
      )
    ),
  constraint stock_import_alerts_severity_check
    check (severity in ('warning', 'critical'))
);

comment on table public.stock_import_alerts is
  'Durable internal-only alerts for the Yahoo stock import system. These are operator-visible only and do not send external notifications.';

comment on column public.stock_import_alerts.alert_type is
  'Stable internal alert key for critical Yahoo import conditions.';

comment on column public.stock_import_alerts.affected_scope is
  'Human-readable scope such as daily_chart_update, recent_jobs, snapshot_updates, or db_write_path.';

comment on column public.stock_import_alerts.metadata is
  'Structured operator context for the alert, including computed rates, counts, and source job references.';

create index if not exists stock_import_alerts_alert_type_created_idx
  on public.stock_import_alerts (alert_type, created_at desc);

create index if not exists stock_import_alerts_resolved_created_idx
  on public.stock_import_alerts (resolved_at, created_at desc);

create index if not exists stock_import_alerts_severity_created_idx
  on public.stock_import_alerts (severity, created_at desc);
