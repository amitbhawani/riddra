insert into source_snapshots (snapshot_key, fetched_at, status, payload)
values
  ('nifty50-open-brief', now(), 'captured', '{"source":"official-index-feed","scope":"index-snapshot"}'::jsonb),
  ('hero-fincorp-ipo-review-input', now(), 'captured', '{"source":"ipo-registry","scope":"ipo-detail"}'::jsonb),
  (
    'stock:tata-motors:quote',
    now(),
    'captured',
    '{
      "source":"demo-nse-delayed-feed",
      "isDemo":true,
      "scope":"stock-quote",
      "price":1042.35,
      "changePercent":1.84,
      "lastUpdated":"2026-04-13T15:30:00+05:30"
    }'::jsonb
  ),
  (
    'fund:hdfc-mid-cap-opportunities:nav',
    now(),
    'captured',
    '{
      "source":"demo-amfi-nav-feed",
      "isDemo":true,
      "scope":"fund-nav",
      "nav":198.42,
      "returns1Y":24.36,
      "lastUpdated":"2026-04-13T21:00:00+05:30"
    }'::jsonb
  );

insert into record_lineage (lineage_type, source_record_type, source_record_id, derived_record_type, derived_record_id, metadata)
values
  ('source_to_derived', 'source_snapshot', 'nifty50-open-brief', 'market_copilot_summary', 'copilot-nifty50-open', '{"pipeline":"formula-first"}'::jsonb),
  ('editorial_to_delivery', 'editorial_block', 'hero-fincorp-review', 'page_snapshot', 'ipo-hero-fincorp-live', '{"surface":"ipo-detail"}'::jsonb);

insert into delivery_artifacts (artifact_type, artifact_key, generated_from, metadata)
values
  ('page_snapshot', 'stocks-tata-motors-live', 'canonical+editorial+derived', '{"surface":"stock-detail"}'::jsonb),
  ('search_document', 'market-open-brief-search-doc', 'derived-intelligence', '{"surface":"search"}'::jsonb);

insert into operator_settings (scope, setting_key, setting_value, status)
values
  ('modules', 'wealth_hub_enabled', '{"enabled":true}'::jsonb, 'active'),
  ('alerts', 'intraday_signal_visibility', '{"mode":"formula-first"}'::jsonb, 'active');

insert into provider_registry (provider_class, provider_name, status, config_schema)
values
  ('payments', 'razorpay', 'active', '{"keys":["RAZORPAY_KEY_ID","RAZORPAY_KEY_SECRET","RAZORPAY_WEBHOOK_SECRET"]}'::jsonb),
  ('ai', 'openai', 'queued', '{"keys":["OPENAI_API_KEY"],"modes":["formula-first","live-optional"]}'::jsonb),
  ('communications', 'resend', 'queued', '{"keys":["RESEND_API_KEY","NEXT_PUBLIC_SUPPORT_EMAIL"]}'::jsonb);
