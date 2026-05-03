# Riddra 0057 RLS Final Live Verification Report

Date: 2026-05-02  
Timezone: Asia/Kolkata  
Prompt: 134

## Scope

This pass re-checked the live effect of `db/migrations/0057_rls_security_closure.sql` against the current repo and live runtime.

Used in this pass:

- the current repo copy of `docs/RIDDRA_RLS_VERIFY_EXISTING_TABLES.sql`
- the live Supabase project `jawojjmapxnevywrmmiq`
- fresh runtime role probes with:
  - `anon`
  - temporary authenticated non-admin user
  - `service_role`
- local route-health checks

This pass does **not** assume older reports were still true.

## 1. Live SQL Verifier Status

I attempted to re-run the exact current repo verifier, `docs/RIDDRA_RLS_VERIFY_EXISTING_TABLES.sql`, in the live Supabase SQL Editor.

What happened:

- the previously open SQL Editor tab was corrupted in-browser
- it contained stale injected text ending with:
  - `https://www.riddra.com/account`
- re-running that stale buffer failed with:
  - `ERROR: 42601: syntax error at or near "https"`
- I opened a clean new SQL tab after that
- Supabase Studio did **not** reliably accept a full clean paste of the verifier in this session

So, I cannot honestly claim a fresh clean full-SQL rerun result from Studio in this pass.

### Last clean verifier result still on record

The most recent clean live run of `docs/RIDDRA_RLS_VERIFY_EXISTING_TABLES.sql` for this same project remains:

- `overall_verdict`: `FAIL`
- `required_table_count`: `48`
- `existing_required_tables`: `48`
- `skipped_missing_required_tables`: `0`
- `passing_existing_required_tables`: `18`
- `failing_existing_required_tables`: `30`
- `optional_present_count`: `0`
- `optional_missing_count`: `8`

### Interpretation

That older clean SQL result still matches today’s fresh runtime behavior:

- the `18` passing tables match the expected:
  - `15` public-read tables
  - `3` self-service tables
- the `30` failing tables match the `admin_only` set

So the honest current SQL-side posture is still:

- public-read RLS behavior is good
- self-service RLS behavior is good
- admin-only runtime isolation works row-wise
- but the stricter admin-only grant/policy target is still not fully closed

## 2. Fresh Live Runtime Role Proof

## Service-role proof

Fresh `service_role` checks succeeded:

- `market_data_sources` head count: `1`
- `product_user_profiles` head count: `3`

This confirms service-role operational access still works on the live project.

## Anon/public proof

Fresh `anon` checks succeeded on public market-data tables:

- `stocks_master` returned a row sample:
  - `slug = 20-microns-limited`
  - `symbol = 20MICRONS`
- `stock_price_history` returned a row sample:
  - `symbol = CENTENKA`
  - `trade_date = 2002-07-01`
  - `interval_type = 1d`

Fresh `anon` checks were correctly restricted on non-public tables:

- `product_user_profiles` -> `permission denied for table product_user_profiles`
- `market_data_sources` -> `permission denied for table market_data_sources`

That means:

- public market-data reads are available
- self-service tables are not anonymously readable
- admin-only tables are not anonymously readable

## Authenticated self-service proof

A fresh temporary live auth user was created, signed in, used against the live RLS-protected self-service tables, and fully cleaned up.

Verified:

- sign-in session created successfully
- own `product_user_profiles` upsert succeeded
- own profile read returned exactly `1` row
- cross-profile read returned `null`
- own watchlist insert succeeded
- own watchlist read returned exactly `1` row
- own portfolio insert succeeded
- own portfolio read returned exactly `1` row
- cleanup succeeded for:
  - watchlist row
  - portfolio row
  - profile row
  - auth user

## Authenticated non-admin admin-only proof

For a fresh authenticated non-admin probe user:

- `market_data_sources select id limit 1` returned:
  - `rowCount = 0`
  - `error = null`

That is the key runtime sign that:

- admin-only data is not leaking to ordinary signed-in users
- but direct authenticated table grants still exist on the admin-only lane
- access is being reduced by RLS to zero visible rows instead of by tighter object-grant removal

## 3. Policies and Grants

What can be stated confidently from the fresh probes plus current repo logic:

- RLS-backed public-read behavior is active on public market-data tables
- self-service ownership policies are active enough to allow only own profile/watchlist/portfolio rows
- anon is blocked from self-service and admin-only tables
- ordinary signed-in non-admin users do not see admin-only rows
- service-role paths still have expected access

What is **not** fully proven cleanly in this pass:

- a fresh full current-SQL verifier rerun inside Supabase Studio

So the grant/policy conclusion remains:

- runtime behavior is good
- the last clean SQL verifier result still indicates the stricter admin-only grant/policy target is not fully met

## 4. Local Route Health

Fresh local route-health checks on `http://localhost:3000` returned `200`:

- `/login`
- `/account`
- `/account/watchlists`
- `/admin`
- `/admin/market-data/import-control-center`
- `/api/account/profile`
- `/api/account/watchlist-items`
- `/api/account/portfolio-holdings`
- `/stocks/reliance-industries`
- `/api/stocks/reliance-industries/chart?range=1Y`

Important local note:

- local route health is not the same as live RLS proof
- the real RLS proof in this report comes from the live Supabase role probes above

## 5. Username Availability Residual Dependency

Current code truth:

- `validateUsernameAvailability()` in [lib/user-product-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/user-product-store.ts:1287) now first uses the narrower durable prefix lookup
- that lookup is [listDurableUserProfileUsernameCandidates()](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/cms-durable-state.ts:1178)

That means the earlier broad profile-directory dependency has already been reduced.

What remains true:

- global username uniqueness still depends on an elevated durable lookup path
- it is now narrowed to username candidates by prefix, not the whole profile directory

Safe hardening status in this pass:

- no additional code change was needed
- no simple further hardening was applied today without changing the broader data model or RLS shape

## 6. Final Verification Verdict

## Verified true today

- service-role access still works where required
- anon/public access is restricted correctly on self-service and admin-only tables
- anon/public access still works on public market-data tables
- signed-in self-service profile/watchlist/portfolio flows work under live RLS
- cross-user self-service reads are blocked
- ordinary signed-in non-admin users do not see admin-only rows
- local account/admin/public market-data surfaces did not crash

## Not fully closed

- I do **not** have a fresh clean Supabase Studio rerun of the exact current `docs/RIDDRA_RLS_VERIFY_EXISTING_TABLES.sql` in this pass
- the last clean full verifier result still on record is `FAIL`
- that older clean SQL result still matches today’s runtime shape

## 7. Final Security Blocker Status

**Status: not fully closed**

More precise wording:

- the live runtime security posture is materially improved and behaving correctly for public and self-service lanes
- but the stricter 0057 closure target is still not truthfully proven complete
- the unresolved part is the admin-only grant/policy tightening lane reflected by the last clean SQL verifier result

## 8. Required Next Action

To fully close the blocker:

1. complete the admin-only grant/policy tightening lane
2. re-run the exact current `docs/RIDDRA_RLS_VERIFY_EXISTING_TABLES.sql` cleanly in Supabase Studio or another trusted SQL path
3. confirm the summary flips from `FAIL` to `PASS`
4. re-run the runtime role probes once more

## 9. Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
