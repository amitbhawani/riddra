# Riddra RLS Remaining Failures Pinpoint Audit

Date: 2026-05-02  
Timezone: Asia/Kolkata

## Scope

This audit pinpoints the exact remaining blocker behind the last clean full SQL verifier result:

- passing required tables: `18`
- failing required tables: `30`

This audit does **not** apply any fixes.

## Executive summary

The remaining `30` failures map exactly to the full `admin_only` table set in the verifier.

Why this is precise:

1. The verifier universe contains `48` required tables total.
2. The non-admin sets are:
   - `3` self-service tables
   - `15` public-read tables
3. `3 + 15 = 18`, which matches the last clean passing count exactly.
4. That leaves `30` tables, which is exactly the size of the `admin_only` set.

So the remaining blocker is not spread randomly across the schema. It is concentrated in one lane:

- `admin_only` tables still have direct `authenticated` object grants from `0057`

The runtime posture can still look “good” because:

- RLS is enabled
- the `..._admin_all` policies gate rows through `public.riddra_is_admin()`
- ordinary non-admin signed-in users still get `0` rows

But the strict verifier treats the direct object grants themselves as a fail for `admin_only` tables.

## Exact blocker pattern

The relevant `0057` behavior for the `admin_only` tables is:

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `REVOKE ALL ... FROM anon, authenticated`
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`
- `CREATE POLICY <table>_admin_all ... FOR ALL TO authenticated USING (public.riddra_is_admin()) WITH CHECK (public.riddra_is_admin())`

That means the current blocker is:

- direct table grants to `authenticated`

The verifier’s primary failure reason for this shape is:

- `unexpected_public_select_grant_for_authenticated`

There is also a secondary grant problem on the same tables:

- write grants are present too

So the narrowest safe fix lane is:

- remove direct `anon` / `authenticated` grants from the `admin_only` tables
- do **not** rewrite all RLS
- do **not** touch `service_role`

## Expected model vs current model

### Expected `admin_only` model

- `RLS enabled = true`
- no direct object grants to `anon`
- no direct object grants to `authenticated`
- no public/anon read policy
- no public/anon write policy
- access only through:
  - `service_role`
  - explicit admin server/service-role code paths

### Current model on the failing set

- `RLS enabled = true`
- table still has `<table>_admin_all` authenticated admin policy
- table still has direct `authenticated` grants
  - at minimum from `0057`: `SELECT, INSERT, UPDATE, DELETE`

## Exact 30 failing tables

All `30` rows below belong to the same blocker family.

| Table name | Failure reason | Expected policy / grant | Current policy / grant | Safest minimal fix |
| --- | --- | --- | --- | --- |
| `market_data_import_batches` | `unexpected_public_select_grant_for_authenticated` | `admin_only`: RLS on, no direct grants to `anon` or `authenticated`; service-role/admin-server path only | Policy: `market_data_import_batches_admin_all`; direct `authenticated` grant still present (`SELECT, INSERT, UPDATE, DELETE`) | `REVOKE ALL ON public.market_data_import_batches FROM anon, authenticated` |
| `market_data_import_rows` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `market_data_import_rows_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.market_data_import_rows FROM anon, authenticated` |
| `market_data_sources` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `market_data_sources_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.market_data_sources FROM anon, authenticated` |
| `market_refresh_runs` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `market_refresh_runs_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.market_refresh_runs FROM anon, authenticated` |
| `raw_yahoo_imports` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `raw_yahoo_imports_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.raw_yahoo_imports FROM anon, authenticated` |
| `stock_import_jobs` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_import_jobs_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_import_jobs FROM anon, authenticated` |
| `stock_import_errors` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_import_errors_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_import_errors FROM anon, authenticated` |
| `stock_import_coverage` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_import_coverage_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_import_coverage FROM anon, authenticated` |
| `stock_import_activity_log` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_import_activity_log_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_import_activity_log FROM anon, authenticated` |
| `stock_import_reconciliation` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_import_reconciliation_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_import_reconciliation FROM anon, authenticated` |
| `stock_data_quality_summary` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_data_quality_summary_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_data_quality_summary FROM anon, authenticated` |
| `stock_data_freshness` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_data_freshness_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_data_freshness FROM anon, authenticated` |
| `stock_import_alerts` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `stock_import_alerts_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.stock_import_alerts FROM anon, authenticated` |
| `cms_admin_records` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_records_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_records FROM anon, authenticated` |
| `cms_admin_record_revisions` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_record_revisions_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_record_revisions FROM anon, authenticated` |
| `cms_admin_global_modules` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_global_modules_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_global_modules FROM anon, authenticated` |
| `cms_admin_global_revisions` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_global_revisions_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_global_revisions FROM anon, authenticated` |
| `cms_admin_refresh_jobs` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_refresh_jobs_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_refresh_jobs FROM anon, authenticated` |
| `cms_admin_activity_log` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_activity_log_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_activity_log FROM anon, authenticated` |
| `cms_admin_editor_locks` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_editor_locks_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_editor_locks FROM anon, authenticated` |
| `cms_admin_pending_approvals` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_pending_approvals_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_pending_approvals FROM anon, authenticated` |
| `cms_admin_import_batches` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_import_batches_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_import_batches FROM anon, authenticated` |
| `cms_admin_import_rows` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_admin_import_rows_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_admin_import_rows FROM anon, authenticated` |
| `cms_launch_config_sections` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_launch_config_sections_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_launch_config_sections FROM anon, authenticated` |
| `cms_media_assets` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_media_assets_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_media_assets FROM anon, authenticated` |
| `cms_preview_sessions` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_preview_sessions_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_preview_sessions FROM anon, authenticated` |
| `cms_record_versions` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_record_versions_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_record_versions FROM anon, authenticated` |
| `cms_refresh_job_runs` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_refresh_job_runs_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_refresh_job_runs FROM anon, authenticated` |
| `cms_membership_tiers` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `cms_membership_tiers_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.cms_membership_tiers FROM anon, authenticated` |
| `product_system_settings` | `unexpected_public_select_grant_for_authenticated` | same `admin_only` model | Policy: `product_system_settings_admin_all`; direct `authenticated` grant still present | `REVOKE ALL ON public.product_system_settings FROM anon, authenticated` |

## What is not the blocker

This pinpoint audit does **not** indicate a broad RLS rewrite is needed.

It also does **not** indicate that the public-read or self-service sets are the remaining problem.

The precise remaining blocker is:

- the `admin_only` tables still have direct `authenticated` object grants

## Safest minimal fix lane

The narrowest fix is:

1. leave the broader schema alone
2. do **not** touch `service_role`
3. revoke direct grants from `anon` and `authenticated` on the `30` `admin_only` tables
4. rerun the strict verifier

That means the safest minimal fix path is the admin-only portion of:

- [db/migrations/0059_cleanup_public_grants.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0059_cleanup_public_grants.sql)

## Final read

The remaining RLS blocker is narrow, mechanical, and well-bounded.

It is not:

- a broken public-read posture
- a broken self-service posture
- a need to redesign all policies

It is:

- `30` admin-only tables still carrying direct `authenticated` grants, which the strict verifier correctly refuses to accept for an `admin_only` model.
