# Riddra Stale Exception Handling Report

## Goal

Mark the remaining stale low-liquidity stocks as acceptable provider exceptions without running new imports.

Target symbols:

- `KIRANVYPAR`
- `NEAGI`

## What changed

### 1. Shared freshness policy

Updated [lib/stock-freshness-policy.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-freshness-policy.ts) to support:

- new reason category: `provider_no_data`
- accepted provider-exception symbols:
  - `KIRANVYPAR.NS`
  - `NEAGI.NS`

For those symbols, missing expected-date price or snapshot data is now classified as:

- `reasonCategory = provider_no_data`
- `isStale = false`

### 2. Durable freshness generation

Updated [scripts/generate-stock-data-freshness.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/generate-stock-data-freshness.mjs) so future freshness regeneration will preserve the same accepted-exception behavior instead of writing those two rows back as blocking stale rows.

### 3. Control Center handling

Updated:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)
- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)

Behavior now:

- `provider_no_data` is excluded from blocking freshness counts
- accepted exceptions are shown in a dedicated `Accepted Exceptions` section
- `stocksMissingRecentUpdates` and `stocksWithStaleSnapshot` exclude accepted exceptions
- freshness reason counts include `provider_no_data`
- UI note added:
  - `Some low-liquidity stocks may not have daily data from provider`

## Durable DB status

I attempted the live row update directly through Supabase service-role access for:

- `KIRANVYPAR`
- `NEAGI`

Requested update:

- `reason_category = provider_no_data`
- `is_stale = false`

Result:

- live update **failed**

Error:

- `new row for relation "stock_data_freshness" violates check constraint "stock_data_freshness_reason_category_check"`

This is expected because the already-applied live migration `0058_stock_data_freshness_trading_date_policy.sql` does **not** yet allow `provider_no_data`.

## Follow-up migration added

Created:

- [db/migrations/0065_stock_data_freshness_provider_no_data.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0065_stock_data_freshness_provider_no_data.sql)

This migration extends the `stock_data_freshness_reason_category_check` constraint to allow:

- `provider_no_data`

## Current outcome

### Complete now

- Control Center no longer treats `KIRANVYPAR` and `NEAGI` as blocking freshness exceptions
- accepted exceptions are visible in UI
- future freshness-generation logic is ready for durable `provider_no_data`

### Still pending

- live durable row updates in `stock_data_freshness`

That final durable step requires `0065` to be applied first.

## Recommended next step

1. Apply [db/migrations/0065_stock_data_freshness_provider_no_data.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0065_stock_data_freshness_provider_no_data.sql) in Supabase.
2. Reload PostgREST schema cache.
3. Re-run:
   - `npm run stocks:generate-freshness`

At that point the two target rows will persist durably as:

- `reason_category = provider_no_data`
- `is_stale = false`

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
