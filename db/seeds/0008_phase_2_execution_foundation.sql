insert into public.source_contracts (
  id,
  source_code,
  domain,
  asset_kind,
  refresh_cadence,
  latency_class,
  legal_basis,
  fallback_mode,
  target_tables,
  status,
  notes
)
values
  (
    '90000000-0000-0000-0000-000000000001',
    'nse_equities',
    'stocks',
    'stock',
    'end_of_day',
    'delayed',
    'official_exchange_terms',
    'manual_override',
    array['instruments', 'stock_pages'],
    'ready_for_activation',
    'Base equity contract for listed-stock identity, page refresh, and filings-linked summaries.'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    'sebi_filings',
    'ipo',
    'ipo',
    'event_driven',
    'event_based',
    'official_regulator_documents',
    'manual_editorial_patch',
    array['ipos', 'ipo_pages', 'asset_documents'],
    'ready_for_activation',
    'Primary contract for issue documents, DRHP/RHP updates, and IPO status changes.'
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    'amfi_nav',
    'mutual_funds',
    'mutual_fund',
    'daily',
    'delayed',
    'official_industry_body_terms',
    'cache_previous_nav',
    array['mutual_funds', 'mutual_fund_pages'],
    'ready_for_activation',
    'Daily NAV contract for mutual-fund freshness and category system continuity.'
  ),
  (
    '90000000-0000-0000-0000-000000000004',
    'nse_index',
    'indices',
    'index',
    'intraday_subject_to_licensed_access',
    'near_realtime',
    'official_index_license_required',
    'delay_and_snapshot',
    array['tracked_indexes', 'index_tracker_snapshots'],
    'blocked_pending_access',
    'Primary Nifty-family contract for live trackers, weighted breadth, and chart overlays.'
  )
on conflict (source_code, domain, asset_kind) do update
set
  refresh_cadence = excluded.refresh_cadence,
  latency_class = excluded.latency_class,
  legal_basis = excluded.legal_basis,
  fallback_mode = excluded.fallback_mode,
  target_tables = excluded.target_tables,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = now();

insert into public.ingest_jobs (
  job_code,
  contract_id,
  run_mode,
  job_status,
  cadence,
  target_entity,
  target_table,
  notes
)
values
  (
    'stocks_eod_refresh',
    '90000000-0000-0000-0000-000000000001',
    'scheduled',
    'ready_for_activation',
    'daily',
    'stock',
    'stock_pages',
    'Refresh stock snapshots and key page fields from approved end-of-day equity inputs.'
  ),
  (
    'ipo_event_refresh',
    '90000000-0000-0000-0000-000000000002',
    'event_driven',
    'ready_for_activation',
    'event_based',
    'ipo',
    'ipo_pages',
    'Ingest issue status changes, document references, and listing transition signals.'
  ),
  (
    'fund_nav_refresh',
    '90000000-0000-0000-0000-000000000003',
    'scheduled',
    'ready_for_activation',
    'daily',
    'mutual_fund',
    'mutual_fund_pages',
    'Refresh daily NAV-linked values and category freshness indicators.'
  ),
  (
    'index_intraday_refresh',
    '90000000-0000-0000-0000-000000000004',
    'scheduled',
    'blocked_pending_access',
    'intraday',
    'index',
    'index_tracker_snapshots',
    'Requires licensed index access and hot-cache policy before activation.'
  )
on conflict (job_code) do update
set
  contract_id = excluded.contract_id,
  run_mode = excluded.run_mode,
  job_status = excluded.job_status,
  cadence = excluded.cadence,
  target_entity = excluded.target_entity,
  target_table = excluded.target_table,
  notes = excluded.notes,
  updated_at = now();

insert into public.asset_lifecycle_transitions (
  registry_id,
  from_state,
  to_state,
  transition_reason,
  automation_mode,
  source_job_code,
  effective_at,
  status
)
values
  (
    '70000000-0000-0000-0000-000000000002',
    'ipo_open',
    'listed_equity_pending_handoff',
    'Issue listing detected and stock route handoff required.',
    'source_confirmed_with_manual_review',
    'ipo_event_refresh',
    now(),
    'ready_for_activation'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'ipo_open',
    'sme_listed_pending_handoff',
    'SME listing transition detected and archive continuity should be preserved.',
    'source_confirmed_with_manual_review',
    'ipo_event_refresh',
    now(),
    'ready_for_activation'
  )
on conflict do nothing;

insert into public.override_executions (
  override_scope,
  target_record_kind,
  target_record_id,
  field_name,
  override_value,
  reason,
  owner,
  severity,
  source_recovery_mode,
  status,
  review_at
)
values
  (
    'field_level',
    'ipo',
    'hero-fincorp',
    'gmp_note',
    '{"value":"Manual review placeholder while source feed is unavailable."}'::jsonb,
    'Official source gap during issue-status refresh.',
    'Editorial desk',
    'review',
    'return_to_source_when_confirmed',
    'active',
    now() + interval '1 day'
  ),
  (
    'field_level',
    'stock',
    'tata-motors',
    'news_watch_summary',
    '{"value":"Temporary editorial summary until source-linked filings digest is stable."}'::jsonb,
    'Source reconciliation pending for filings digest block.',
    'Research desk',
    'stable',
    'manual_revert',
    'active',
    now() + interval '2 days'
  )
on conflict do nothing;

insert into public.market_data_readiness (
  surface_code,
  surface_name,
  latency_requirement,
  source_strategy,
  cache_strategy,
  entitlement_scope,
  status,
  notes
)
values
  (
    'stocks_public_pages',
    'Stock public pages',
    'end_of_day_or_event_driven',
    'official_exchange_plus_issuer_documents',
    'daily_snapshot_plus_event_revalidation',
    'public',
    'ready_for_activation',
    'Good launch candidate because it can remain trustworthy without licensed realtime promises.'
  ),
  (
    'ipo_lifecycle_pages',
    'IPO lifecycle pages',
    'event_driven',
    'regulator_documents_plus_manual_editorial_confirmation',
    'document_triggered_revalidation',
    'public',
    'ready_for_activation',
    'Core public surface where manual editorial review can safely coexist with source updates.'
  ),
  (
    'index_live_trackers',
    'Index live trackers',
    'near_realtime',
    'licensed_index_inputs_required',
    'hot_cache_with_snapshot_history',
    'mixed',
    'blocked_pending_access',
    'Should not be marketed as realtime until compliant source access is approved.'
  ),
  (
    'advanced_charts',
    'Advanced charts workstation',
    'near_realtime',
    'lightweight_charts_plus_approved_feed_layer',
    'session_cache_plus_saved_layout_state',
    'elite',
    'planned',
    'Chart UX is live, but premium-grade data latency still depends on approved provider access.'
  )
on conflict (surface_code) do update
set
  surface_name = excluded.surface_name,
  latency_requirement = excluded.latency_requirement,
  source_strategy = excluded.source_strategy,
  cache_strategy = excluded.cache_strategy,
  entitlement_scope = excluded.entitlement_scope,
  status = excluded.status,
  notes = excluded.notes;
