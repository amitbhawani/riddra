with stock_targets as (
  select *
  from (
    values
      ('tata-motors', 'Tata Motors', 'TATAMOTORS'),
      ('reliance-industries', 'Reliance Industries', 'RELIANCE'),
      ('infosys', 'Infosys', 'INFY'),
      ('tcs', 'TCS', 'TCS'),
      ('hdfc-bank', 'HDFC Bank', 'HDFCBANK'),
      ('icici-bank', 'ICICI Bank', 'ICICIBANK'),
      ('axis-bank', 'Axis Bank', 'AXISBANK'),
      ('state-bank-of-india', 'State Bank of India', 'SBIN'),
      ('itc', 'ITC', 'ITC'),
      ('larsen-and-toubro', 'Larsen & Toubro', 'LT'),
      ('maruti-suzuki', 'Maruti Suzuki', 'MARUTI'),
      ('sun-pharma', 'Sun Pharma', 'SUNPHARMA'),
      ('bharti-airtel', 'Bharti Airtel', 'BHARTIARTL'),
      ('hcltech', 'HCLTech', 'HCLTECH'),
      ('bajaj-finance', 'Bajaj Finance', 'BAJFINANCE'),
      ('kotak-mahindra-bank', 'Kotak Mahindra Bank', 'KOTAKBANK'),
      ('hindustan-unilever', 'Hindustan Unilever', 'HINDUNILVR'),
      ('ntpc', 'NTPC', 'NTPC'),
      ('power-grid', 'Power Grid', 'POWERGRID'),
      ('asian-paints', 'Asian Paints', 'ASIANPAINT'),
      ('wipro', 'Wipro', 'WIPRO'),
      ('bajaj-auto', 'Bajaj Auto', 'BAJAJ-AUTO')
  ) as t(slug, title, canonical_symbol)
),
prepared_stock_targets as (
  with stock_source_candidates as (
    select
      target.slug as target_slug,
      instrument.id,
      case
        when instrument.slug = target.slug then 'slug'
        when instrument.symbol = target.canonical_symbol then 'symbol'
        when lower(instrument.name) = lower(target.title) then 'title'
        else 'unknown'
      end as match_reason
    from stock_targets as target
    join public.instruments as instrument
      on (
        instrument.slug = target.slug
        or instrument.symbol = target.canonical_symbol
        or lower(instrument.name) = lower(target.title)
      )
     and lower(coalesce(instrument.instrument_type, '')) in ('stock', 'equity', 'share')
  ),
  unique_stock_matches as (
    select
      target_slug,
      case when count(distinct id) = 1 then (array_agg(id))[1] else null end as source_row_id,
      case
        when count(distinct id) = 1
          then string_agg(distinct match_reason, ', ' order by match_reason)
        else null
      end as source_match_strategy,
      count(distinct id) as source_match_count
    from stock_source_candidates
    group by target_slug
  )
  select
    target.slug,
    target.title,
    target.canonical_symbol,
    match.source_row_id,
    match.source_match_strategy,
    coalesce(match.source_match_count, 0) as source_match_count
  from stock_targets as target
  left join unique_stock_matches as match
    on match.target_slug = target.slug
),
upserted_stocks as (
  insert into public.content_records (
    entity_type,
    canonical_slug,
    canonical_symbol,
    title,
    source_table,
    source_row_id,
    workflow_state,
    verification_state,
    publication_visibility,
    review_queue_reason,
    source_payload,
    editorial_payload,
    metadata,
    verified_at,
    reviewed_at,
    approved_at,
    published_at
  )
  select
    'stock',
    target.slug,
    target.canonical_symbol,
    target.title,
    'instruments',
    target.source_row_id,
    case when target.source_row_id is null then 'draft' else 'published' end,
    case when target.source_row_id is null then 'needs_review' else 'verified' end,
    case when target.source_row_id is null then 'private' else 'public' end,
    case when target.source_row_id is null then 'missing_source_backing' else null end,
    jsonb_strip_nulls(
      jsonb_build_object(
        'exchange', 'NSE',
        'instrument_type', 'stock',
        'symbol', target.canonical_symbol
      )
    ),
    jsonb_build_object(
      'hero_summary',
      format(
        '%s is part of the first trusted Riddra stock rollout for private-beta public routing.',
        target.title
      ),
      'summary',
      format(
        '%s is part of the first trusted Riddra stock rollout for private-beta public routing.',
        target.title
      ),
      'seo_description',
      format(
        '%s stock route published through CMS-controlled private-beta rollout.',
        target.title
      )
    ),
    jsonb_build_object(
      'rollout_wave', 'private_beta_initial',
      'route', format('/stocks/%s', target.slug),
      'rollout_family', 'first_trusted_stock',
      'source_backing_status', case when target.source_row_id is null then 'missing' else 'verified_source_row' end,
      'source_match_strategy', target.source_match_strategy,
      'source_match_count', target.source_match_count
    ),
    case when target.source_row_id is null then null else now() end,
    case when target.source_row_id is null then null else now() end,
    case when target.source_row_id is null then null else now() end,
    case when target.source_row_id is null then null else now() end
  from prepared_stock_targets as target
  on conflict (entity_type, canonical_slug) do update
  set
    canonical_symbol = excluded.canonical_symbol,
    title = excluded.title,
    source_table = excluded.source_table,
    source_row_id = excluded.source_row_id,
    workflow_state = excluded.workflow_state,
    verification_state = excluded.verification_state,
    publication_visibility = excluded.publication_visibility,
    review_queue_reason = excluded.review_queue_reason,
    source_payload = excluded.source_payload,
    editorial_payload = excluded.editorial_payload,
    metadata = excluded.metadata,
    verified_at = excluded.verified_at,
    reviewed_at = excluded.reviewed_at,
    approved_at = excluded.approved_at,
    published_at = excluded.published_at,
    archived_at = null,
    updated_at = now()
  returning *
),
fund_targets as (
  select *
  from (
    values
      (
        'hdfc-mid-cap-opportunities',
        'HDFC Mid-Cap Opportunities Fund',
        'Mid Cap Fund',
        'HDFC AMC'
      ),
      (
        'sbi-bluechip-fund',
        'SBI Bluechip Fund',
        'Large Cap Fund',
        'SBI Mutual Fund'
      )
  ) as t(slug, title, category, amc_name)
),
prepared_fund_targets as (
  with fund_source_candidates as (
    select
      target.slug as target_slug,
      fund.id,
      case
        when fund.slug = target.slug then 'slug'
        when lower(fund.fund_name) = lower(target.title) then 'fund_name'
        else 'unknown'
      end as match_reason
    from fund_targets as target
    join public.mutual_funds as fund
      on (
        fund.slug = target.slug
        or lower(fund.fund_name) = lower(target.title)
      )
  ),
  unique_fund_matches as (
    select
      target_slug,
      case when count(distinct id) = 1 then (array_agg(id))[1] else null end as source_row_id,
      case
        when count(distinct id) = 1
          then string_agg(distinct match_reason, ', ' order by match_reason)
        else null
      end as source_match_strategy,
      count(distinct id) as source_match_count
    from fund_source_candidates
    group by target_slug
  )
  select
    target.slug,
    target.title,
    target.category,
    target.amc_name,
    match.source_row_id,
    match.source_match_strategy,
    coalesce(match.source_match_count, 0) as source_match_count
  from fund_targets as target
  left join unique_fund_matches as match
    on match.target_slug = target.slug
),
upserted_funds as (
  insert into public.content_records (
    entity_type,
    canonical_slug,
    canonical_symbol,
    title,
    source_table,
    source_row_id,
    workflow_state,
    verification_state,
    publication_visibility,
    review_queue_reason,
    source_payload,
    editorial_payload,
    metadata,
    verified_at,
    reviewed_at,
    approved_at,
    published_at
  )
  select
    'mutual_fund',
    target.slug,
    null,
    target.title,
    'mutual_funds',
    target.source_row_id,
    case when target.source_row_id is null then 'draft' else 'published' end,
    case when target.source_row_id is null then 'needs_review' else 'verified' end,
    case when target.source_row_id is null then 'private' else 'public' end,
    case when target.source_row_id is null then 'missing_source_backing' else null end,
    jsonb_build_object(
      'category', target.category,
      'amc_name', target.amc_name
    ),
    jsonb_build_object(
      'hero_summary',
      format(
        '%s is part of the first trusted Riddra mutual-fund rollout for private-beta public routing.',
        target.title
      ),
      'summary',
      format(
        '%s is part of the first trusted Riddra mutual-fund rollout for private-beta public routing.',
        target.title
      ),
      'seo_description',
      format(
        '%s mutual-fund route published through CMS-controlled private-beta rollout.',
        target.title
      )
    ),
    jsonb_build_object(
      'rollout_wave', 'private_beta_initial',
      'route', format('/mutual-funds/%s', target.slug),
      'rollout_family', 'first_trusted_mutual_fund',
      'source_backing_status', case when target.source_row_id is null then 'missing' else 'verified_source_row' end,
      'source_match_strategy', target.source_match_strategy,
      'source_match_count', target.source_match_count
    ),
    case when target.source_row_id is null then null else now() end,
    case when target.source_row_id is null then null else now() end,
    case when target.source_row_id is null then null else now() end,
    case when target.source_row_id is null then null else now() end
  from prepared_fund_targets as target
  on conflict (entity_type, canonical_slug) do update
  set
    title = excluded.title,
    source_table = excluded.source_table,
    source_row_id = excluded.source_row_id,
    workflow_state = excluded.workflow_state,
    verification_state = excluded.verification_state,
    publication_visibility = excluded.publication_visibility,
    review_queue_reason = excluded.review_queue_reason,
    source_payload = excluded.source_payload,
    editorial_payload = excluded.editorial_payload,
    metadata = excluded.metadata,
    verified_at = excluded.verified_at,
    reviewed_at = excluded.reviewed_at,
    approved_at = excluded.approved_at,
    published_at = excluded.published_at,
    archived_at = null,
    updated_at = now()
  returning *
),
course_targets as (
  select *
  from (
    values
      (
        'stock-market-foundation',
        'Stock Market Foundation',
        'Beginner Markets',
        'Beginner',
        'Free',
        'Amit Bhawani',
        '6 modules',
        'Entry-level course designed to help first-time users understand stocks, brokers, demat, indices, and the Riddra product journey.'
      ),
      (
        'ipo-analysis-made-easy',
        'IPO Analysis Made Easy',
        'IPO and Primary Markets',
        'Beginner',
        'Bundle included',
        'Amit Bhawani',
        '8 modules',
        'A lifecycle-oriented course teaching users how to assess upcoming IPOs, track allotment, and transition listed issues into long-term research.'
      ),
      (
        'price-action-and-chart-reading',
        'Price Action and Chart Reading',
        'Trading and Technicals',
        'Intermediate',
        'Bundle included',
        'Amit Bhawani',
        '12 modules',
        'A practical trading course that sits close to the charts product and future indicator workflow.'
      ),
      (
        'mutual-fund-selection-framework',
        'Mutual Fund Selection Framework',
        'Long-Term Investing',
        'Intermediate',
        'Bundle included',
        'Amit Bhawani',
        '9 modules',
        'A fund-selection course focused on category fit, benchmark context, holdings discipline, and cost awareness.'
      ),
      (
        'options-and-open-interest-playbook',
        'Options and Open Interest Playbook',
        'Derivatives and Positioning',
        'Advanced',
        'Premium later',
        'Amit Bhawani',
        '10 modules',
        'An advanced options course focused on open-interest structure, positioning shifts, and disciplined derivatives interpretation.'
      )
  ) as t(slug, title, category, level, access, instructor, duration, summary)
),
upserted_courses as (
  insert into public.content_records (
    entity_type,
    canonical_slug,
    canonical_symbol,
    title,
    source_table,
    source_row_id,
    workflow_state,
    verification_state,
    publication_visibility,
    source_payload,
    editorial_payload,
    metadata,
    verified_at,
    reviewed_at,
    approved_at,
    published_at
  )
  select
    'course',
    target.slug,
    null,
    target.title,
    'asset_registry_entries',
    null,
    'published',
    'verified',
    'public',
    jsonb_build_object(
      'category', target.category,
      'level', target.level,
      'access', target.access
    ),
    jsonb_build_object(
      'summary', target.summary,
      'seo_description', target.summary
    ),
    jsonb_build_object(
      'instructor', target.instructor,
      'duration', target.duration,
      'rollout_wave', 'private_beta_initial',
      'route', format('/courses/%s', target.slug)
    ),
    now(),
    now(),
    now(),
    now()
  from course_targets as target
  on conflict (entity_type, canonical_slug) do update
  set
    title = excluded.title,
    source_table = excluded.source_table,
    source_row_id = excluded.source_row_id,
    workflow_state = excluded.workflow_state,
    verification_state = excluded.verification_state,
    publication_visibility = excluded.publication_visibility,
    review_queue_reason = null,
    source_payload = excluded.source_payload,
    editorial_payload = excluded.editorial_payload,
    metadata = excluded.metadata,
    verified_at = excluded.verified_at,
    reviewed_at = excluded.reviewed_at,
    approved_at = excluded.approved_at,
    published_at = excluded.published_at,
    archived_at = null,
    updated_at = now()
  returning *
),
webinar_targets as (
  select *
  from (
    values
      (
        'ipo-analysis-live',
        'IPO Analysis Live Workshop',
        'Live workshop',
        'IPO-first investors',
        'Free with signup',
        'Saturday · 11:00 AM IST',
        'A guided live session format that turns the IPO hub into a conversion and trust engine through reviews, question handling, and document-led walkthroughs.'
      ),
      (
        'chart-reading-bootcamp',
        'Chart Reading Bootcamp',
        'Multi-part webinar',
        'Trader and chart users',
        'Bundle included',
        'Next cohort opens soon',
        'A chart-first teaching format tied directly to the workstation and advanced charts surfaces so education and tooling reinforce each other.'
      ),
      (
        'mutual-fund-selection-clinic',
        'Mutual Fund Selection Clinic',
        'Live Q&A plus examples',
        'Long-term investors',
        'Free with signup',
        'Month-end investor clinic',
        'A repeatable education format that helps users compare categories, benchmarks, holdings, and costs while building trust in the investor layer.'
      )
  ) as t(slug, title, format, audience, access, next_session, summary)
),
upserted_webinars as (
  insert into public.content_records (
    entity_type,
    canonical_slug,
    canonical_symbol,
    title,
    source_table,
    source_row_id,
    workflow_state,
    verification_state,
    publication_visibility,
    source_payload,
    editorial_payload,
    metadata,
    verified_at,
    reviewed_at,
    approved_at,
    published_at
  )
  select
    'webinar',
    target.slug,
    null,
    target.title,
    'asset_registry_entries',
    null,
    'published',
    'verified',
    'public',
    jsonb_build_object(
      'format', target.format,
      'audience', target.audience,
      'access', target.access
    ),
    jsonb_build_object(
      'summary', target.summary,
      'seo_description', target.summary
    ),
    jsonb_build_object(
      'next_session', target.next_session,
      'rollout_wave', 'private_beta_initial',
      'route', format('/webinars/%s', target.slug)
    ),
    now(),
    now(),
    now(),
    now()
  from webinar_targets as target
  on conflict (entity_type, canonical_slug) do update
  set
    title = excluded.title,
    source_table = excluded.source_table,
    source_row_id = excluded.source_row_id,
    workflow_state = excluded.workflow_state,
    verification_state = excluded.verification_state,
    publication_visibility = excluded.publication_visibility,
    review_queue_reason = null,
    source_payload = excluded.source_payload,
    editorial_payload = excluded.editorial_payload,
    metadata = excluded.metadata,
    verified_at = excluded.verified_at,
    reviewed_at = excluded.reviewed_at,
    approved_at = excluded.approved_at,
    published_at = excluded.published_at,
    archived_at = null,
    updated_at = now()
  returning *
),
all_rollout_records as (
  select * from upserted_stocks
  union all
  select * from upserted_funds
  union all
  select * from upserted_courses
  union all
  select * from upserted_webinars
)
insert into public.content_workflow_events (
  content_record_id,
  event_type,
  from_state,
  to_state,
  notes,
  payload
)
select
  record.id,
  'seed_rollout_stage',
  null,
  record.workflow_state,
  case
    when record.workflow_state = 'published'
      then 'Initial private-beta CMS rollout seed published this record.'
    else 'Initial private-beta CMS rollout seed staged this record for review.'
  end,
  jsonb_build_object(
    'seed_file', '0011_operator_cms_initial_public_beta_rollout.sql',
    'entity_type', record.entity_type,
    'canonical_slug', record.canonical_slug,
    'verification_state', record.verification_state,
    'publication_visibility', record.publication_visibility
  )
from all_rollout_records as record
where not exists (
  select 1
  from public.content_workflow_events as event
  where event.content_record_id = record.id
    and event.event_type = 'seed_rollout_stage'
);

with all_rollout_records as (
  select id,
         entity_type,
         canonical_slug,
         canonical_symbol,
         title,
         source_table,
         source_row_id,
         workflow_state,
         verification_state,
         publication_visibility,
         source_payload,
         editorial_payload,
         metadata,
         published_at,
         verified_at,
         reviewed_at,
         approved_at,
         archived_at,
         updated_at
  from public.content_records
  where (entity_type, canonical_slug) in (
    select 'stock', slug from (
      values
        ('tata-motors'),
        ('reliance-industries'),
        ('infosys'),
        ('tcs'),
        ('hdfc-bank'),
        ('icici-bank'),
        ('axis-bank'),
        ('state-bank-of-india'),
        ('itc'),
        ('larsen-and-toubro'),
        ('maruti-suzuki'),
        ('sun-pharma'),
        ('bharti-airtel'),
        ('hcltech'),
        ('bajaj-finance'),
        ('kotak-mahindra-bank'),
        ('hindustan-unilever'),
        ('ntpc'),
        ('power-grid'),
        ('asian-paints'),
        ('wipro'),
        ('bajaj-auto')
    ) as stock_rollout(slug)
    union all
    select 'mutual_fund', slug from (
      values
        ('hdfc-mid-cap-opportunities'),
        ('sbi-bluechip-fund')
    ) as fund_rollout(slug)
    union all
    select 'course', slug from (
      values
        ('stock-market-foundation'),
        ('ipo-analysis-made-easy'),
        ('price-action-and-chart-reading'),
        ('mutual-fund-selection-framework'),
        ('options-and-open-interest-playbook')
    ) as course_rollout(slug)
    union all
    select 'webinar', slug from (
      values
        ('ipo-analysis-live'),
        ('chart-reading-bootcamp'),
        ('mutual-fund-selection-clinic')
    ) as webinar_rollout(slug)
  )
)
insert into public.content_record_revisions (
  content_record_id,
  revision_number,
  snapshot,
  change_summary
)
select
  record.id,
  1,
  jsonb_build_object(
    'entity_type', record.entity_type,
    'canonical_slug', record.canonical_slug,
    'canonical_symbol', record.canonical_symbol,
    'title', record.title,
    'source_table', record.source_table,
    'source_row_id', record.source_row_id,
    'workflow_state', record.workflow_state,
    'verification_state', record.verification_state,
    'publication_visibility', record.publication_visibility,
    'source_payload', record.source_payload,
    'editorial_payload', record.editorial_payload,
    'metadata', record.metadata,
    'published_at', record.published_at,
    'verified_at', record.verified_at,
    'reviewed_at', record.reviewed_at,
    'approved_at', record.approved_at,
    'archived_at', record.archived_at,
    'updated_at', record.updated_at
  ),
  'Initial private-beta rollout seed.'
from all_rollout_records as record
where not exists (
  select 1
  from public.content_record_revisions as revision
  where revision.content_record_id = record.id
);
