-- Riddra publishable_content_records view hardening
--
-- Purpose:
-- - remove SECURITY DEFINER behavior from public.publishable_content_records
-- - ensure the view runs with caller permissions instead of view-owner privileges
--
-- Why this is safe:
-- - the view is a simple filtered projection over public.content_records
-- - it does not need privileged joins, writes, or bypass behavior
-- - callers that truly need elevated access should use the admin client explicitly

do $$
begin
  if to_regclass('public.publishable_content_records') is not null then
    execute $view$
      create or replace view public.publishable_content_records
      with (security_invoker = true) as
      select
        id,
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
        duplicate_of_id,
        created_by,
        updated_by,
        reviewer_id,
        approver_id,
        published_by,
        verified_at,
        reviewed_at,
        approved_at,
        published_at,
        archived_at,
        created_at,
        updated_at
      from public.content_records
      where workflow_state = 'published'
        and verification_state = 'verified'
        and publication_visibility = 'public'
    $view$;
  end if;
end
$$;
