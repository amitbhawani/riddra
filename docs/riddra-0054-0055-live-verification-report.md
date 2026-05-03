# Riddra 0054 + 0055 Live Verification Report

Date: 2026-04-30
Project: `jawojjmapxnevywrmmiq`

## Scope

Applied and verified:

- `0054_stock_import_alerts.sql`
- `0055_stock_data_freshness.sql`

Follow-up tasks completed:

1. Reloaded PostgREST schema cache.
2. Verified service-role access to:
   - `stock_import_alerts`
   - `stock_data_freshness`
3. Ran `npm run stocks:generate-freshness`.
4. Confirmed stale stock count.
5. Confirmed the Import Control Center is able to read the durable monitoring tables without `PGRST205`.

## Important finding before fix

Before the live SQL apply, both tables were missing from `public` in the connected Supabase project. This was not only a schema-cache issue.

Direct SQL check in Supabase:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('stock_import_alerts', 'stock_data_freshness');
```

Result before apply:

- `0 rows`

That explains why earlier service-role reads returned:

- `Could not find the table 'public.stock_import_alerts' in the schema cache`
- `Could not find the table 'public.stock_data_freshness' in the schema cache`

## Live apply

The migration SQL from the repo was applied in the live Supabase SQL Editor, then PostgREST was reloaded with:

```sql
notify pgrst, 'reload schema';
```

## Service-role verification

Direct service-role verification after apply:

```json
{
  "table": "stock_import_alerts",
  "ok": true,
  "error": null,
  "rows": 0
}
{
  "table": "stock_data_freshness",
  "ok": true,
  "error": null,
  "rows": 0
}
```

Count verification after freshness generation:

```json
{
  "freshnessCount": 2157,
  "freshnessError": null,
  "staleCount": 2144,
  "staleError": null,
  "alertsCount": 0,
  "alertsError": null
}
```

## Freshness generation

Command run:

```bash
npm run stocks:generate-freshness
```

Result:

```json
{
  "todayIsoDate": "2026-04-30",
  "totalStocks": 2157,
  "staleCount": 2144,
  "freshCount": 13
}
```

Meaning:

- durable freshness rows generated: `2157`
- stocks flagged stale today: `2144`
- stocks considered fresh today: `13`

This high stale count is a real data-freshness signal, not a monitoring failure. It means most stocks do not yet have today’s `2026-04-30` daily price and/or snapshot rows.

## Import Control Center verification

Route check:

```text
control-center:200 6.334459
```

App-side verification status:

- `stock_import_alerts` is queryable through the same service-role path used by the app
- `stock_data_freshness` is queryable through the same service-role path used by the app
- the Control Center code path already prefers durable monitoring tables when they exist
- after the live apply, the prior `PGRST205` blocker for these two tables is resolved

Relevant code path:

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`

Durable reads now used there:

- `stock_import_alerts`
- `stock_data_freshness`

## Final status

Verified:

- `stock_import_alerts` exists in live DB and is queryable
- `stock_data_freshness` exists in live DB and is queryable
- `npm run stocks:generate-freshness` completed successfully
- `stock_data_freshness` row count = `2157`
- stale stock count = `2144`
- Import Control Center route is healthy at `200`

## Notes

- `stock_import_alerts` currently has `0` rows. That is acceptable and means no durable alert record has been written yet.
- The next operational step is not a schema fix. It is a data freshness follow-up: run the safe daily chart update lane and then regenerate freshness to reduce the stale stock count.
