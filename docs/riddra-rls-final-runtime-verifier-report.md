# Riddra RLS Final Runtime Verifier Report

Date: 2026-05-03  
Timezone: Asia/Kolkata

## Verdict

**PASS**

Fresh runtime verifier:
- [scripts/verify-rls-final-closure.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/verify-rls-final-closure.mjs)

Execution command:

```bash
node scripts/verify-rls-final-closure.mjs
```

This verifier uses the app’s real Supabase environment, creates temporary non-admin auth users for live self-service checks, and cleans up the temporary auth users plus durable rows after the run.

## What the runtime verifier checked

1. `service_role` read access across the full `30`-table `admin_only` set
2. `anon` read access for public market tables:
   - `stocks_master`
   - `stock_price_history`
   - `stock_market_snapshot`
3. `anon` restriction for:
   - `product_user_profiles`
   - `market_data_sources`
   - the rest of the `admin_only` set
4. Temporary signed-in ordinary user self-service access:
   - insert/read/update own profile
   - insert/read/update own watchlist
   - insert/read/update own portfolio
5. Temporary signed-in ordinary user restriction:
   - cannot read another user’s profile
   - cannot read `admin_only` tables

## Live result summary

### `service_role`

Result:
- `30 / 30` admin-only tables readable
- no failures

Examples from the run:
- `market_data_sources` -> `200 OK`
- `stock_import_activity_log` -> `206 Partial Content`
- `cms_admin_records` -> `200 OK`
- `product_system_settings` -> `206 Partial Content`

The `206` responses are normal for large PostgREST count-backed head probes. They still represent successful read access.

### `anon`

Public market reads:
- `stocks_master` -> PASS
- `stock_price_history` -> PASS
- `stock_market_snapshot` -> PASS

Private/admin restrictions:
- `product_user_profiles` -> blocked with `401 Unauthorized`
- all `30 / 30` admin-only tables -> blocked with `401 Unauthorized`

### Signed-in ordinary non-admin user

Own profile:
- insert own profile -> PASS
- read own profile -> PASS
- update own profile -> PASS

Own watchlist:
- insert own watchlist item -> PASS
- read own watchlist item -> PASS
- update own watchlist item -> PASS

Own portfolio:
- insert own holding -> PASS
- read own holding -> PASS
- update own holding -> PASS

Cross-user protection:
- reading another user’s profile -> PASS
- returned row: `null`

Admin-only restriction:
- all `30 / 30` admin-only tables blocked for ordinary signed-in user
- response shape: `403 Forbidden`

## Failed table list

None.

```json
{
  "verdict": "PASS",
  "failedTables": []
}
```

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `node scripts/verify-rls-final-closure.mjs` -> PASS

## Final read

The fresh runtime verifier closes the `0057` RLS lane from a live access-behavior standpoint:

- public market tables are readable to `anon`
- private/admin tables are blocked from `anon`
- self-service profile/watchlist/portfolio flows work for an ordinary signed-in user
- cross-user profile access is blocked
- the full `30`-table `admin_only` set is readable by `service_role`
- the full `30`-table `admin_only` set is blocked for ordinary signed-in users
