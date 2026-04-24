insert into public.editorial_blocks (asset_type, asset_slug, block_key, title, content, workflow_status, visibility)
values
  (
    'stock',
    'tata-motors',
    'editorial_review',
    'Editorial review',
    'Tata Motors remains a strong template candidate for company review, filing summaries, and event-led updates because it combines search demand with repeated result-season interest.',
    'published',
    'public'
  ),
  (
    'ipo',
    'hero-fincorp',
    'ipo_review',
    'IPO editorial review',
    'This IPO route should support manual review, strengths, risks, business model, and document-linked context while official data fields remain source-owned.',
    'review',
    'public'
  ),
  (
    'mutual_fund',
    'hdfc-mid-cap-opportunities',
    'fund_review',
    'Fund editorial review',
    'This fund page should support evergreen commentary, category context, and manager observations without mixing manual copy into live NAV data.',
    'draft',
    'public'
  )
on conflict (asset_type, asset_slug, block_key) do update
set
  title = excluded.title,
  content = excluded.content,
  workflow_status = excluded.workflow_status,
  visibility = excluded.visibility,
  updated_at = now();

insert into public.asset_announcements (asset_type, asset_slug, announcement_type, headline, summary, source_label, importance, workflow_status, announced_at)
values
  (
    'stock',
    'tata-motors',
    'results',
    'Quarterly results watch',
    'Manual editorial placeholder for a results-led announcement stream tied to a listed stock page.',
    'Editorial desk',
    'high',
    'review',
    now()
  ),
  (
    'ipo',
    'hero-fincorp',
    'listing',
    'Listing window update',
    'Manual editorial placeholder for IPO lifecycle announcements and status changes.',
    'Editorial desk',
    'high',
    'draft',
    now()
  );

insert into public.asset_documents (asset_type, asset_slug, document_type, title, source_label, workflow_status, visibility)
values
  (
    'ipo',
    'hero-fincorp',
    'drhp',
    'Draft red herring prospectus',
    'Editorial desk',
    'review',
    'public'
  ),
  (
    'stock',
    'tata-motors',
    'annual_report',
    'Annual report',
    'Editorial desk',
    'draft',
    'public'
  );
