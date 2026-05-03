# Riddra 0058 Freshness Policy Live Verification Report

Date: 2026-05-01
Project: `jawojjmapxnevywrmmiq`

## Scope

Verified after live apply of:

- `db/migrations/0058_stock_data_freshness_trading_date_policy.sql`

Follow-up tasks completed:

1. Verified the new `stock_data_freshness` columns are queryable.
2. Ran `npm run stocks:generate-freshness`.
3. Confirmed durable reason categories are being stored.
4. Confirmed the Import Control Center reads `expectedTradingDate` and the reason breakdown from durable rows.
5. Fixed one app-side pagination issue discovered during verification.

## Live schema verification

Direct service-role read against `stock_data_freshness` succeeded with the new columns:

- `expected_trading_date`
- `evaluation_date`
- `reason_category`
- `market_session_state`

Sample live rows:

```json
[
  {
    "has_today_price": true,
    "has_today_snapshot": true,
    "last_price_date": "2026-04-29",
    "last_snapshot_date": "2026-04-29",
    "expected_trading_date": "2026-04-30",
    "evaluation_date": "2026-05-01",
    "reason_category": "holiday_or_weekend",
    "market_session_state": "closed",
    "is_stale": false
  }
]
```

Important note:

- the durable column name is `reason_category`, not `freshness_reason`
- the durable column name is `market_session_state`, not `market_phase`

## Freshness generation

Command run:

```bash
npm run stocks:generate-freshness
```

Live result:

```json
{
  "evaluationDate": "2026-05-01",
  "expectedTradingDate": "2026-04-30",
  "marketSessionState": "closed",
  "policyReason": "holiday_or_weekend",
  "totalStocks": 2157,
  "staleCount": 2,
  "freshCount": 2155,
  "reasonCounts": {
    "holiday_or_weekend": 2155,
    "stale_missing_price": 2
  }
}
```

Sample stale stocks reported by the generator:

- `KIRANVYPAR.NS` (`Kiran Vyapar Limited`)
- `NEAGI.NS` (`Neelamalai Agro Industries Limited`)

## Durable table verification after generation

After regeneration, the live durable table contained:

```json
{
  "rowCount": 2157,
  "expectedTradingDates": {
    "2026-04-30": 2157
  },
  "evaluationDates": {
    "2026-05-01": 2157
  },
  "reasonCounts": {
    "holiday_or_weekend": 2155,
    "stale_missing_price": 2
  },
  "marketSessionStates": {
    "closed": 2157
  },
  "staleCount": 2
}
```

Meaning:

- all `2157` durable freshness rows now carry the migrated trading-date fields
- all rows were evaluated on `2026-05-01`
- all rows expect `2026-04-30` as the latest required trading date
- `2155` rows are durably classified as `holiday_or_weekend`
- `2` rows are durably classified as `stale_missing_price`

## Import Control Center verification

Route verification:

- `GET /admin/market-data/import-control-center` -> `200`

Rendered control-center payload check after the live refresh:

- `source = durable`
- `expectedTradingDate = 2026-04-30`
- `staleStockCount = 2`
- `reasonCounts.holiday_or_weekend = 2155`
- `reasonCounts.stale_missing_price = 2`

Rendered payload snippets contained:

```json
{
  "reasonCounts": {
    "fresh": 0,
    "stale_missing_price": 2,
    "stale_missing_snapshot": 0,
    "provider_lag": 0,
    "market_not_closed": 0,
    "holiday_or_weekend": 2155,
    "symbol_issue": 0
  },
  "expectedTradingDate": "2026-04-30",
  "source": "durable",
  "staleStockCount": 2
}
```

## Important finding and fix

During verification, the Import Control Center initially showed only the first `1000` freshness rows even though the durable table contained `2157`.

Root cause:

- the Supabase REST layer is capped at `1000` rows per request in this project
- `loadDurableFreshnessRows()` was making a single broad read

Fix applied:

- paginated `stock_data_freshness` reads in:
  - `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`

This was necessary so step 4 could be confirmed against the full durable universe rather than a truncated first page.

## Files changed during verification

- `/Users/amitbhawani/Documents/Ai FinTech Platform/lib/admin-import-control-center.ts`
- `/Users/amitbhawani/Documents/Ai FinTech Platform/docs/riddra-0058-freshness-policy-live-verification-report.md`

## Final status

Verified:

- `0058` live columns are queryable
- `npm run stocks:generate-freshness` completed successfully
- durable trading-date reason categories are being written
- the Import Control Center is now reading and rendering the full durable freshness breakdown correctly

Current live freshness outcome:

- active rows: `2157`
- expected trading date: `2026-04-30`
- evaluation date: `2026-05-01`
- fresh via `holiday_or_weekend`: `2155`
- stale missing price: `2`

