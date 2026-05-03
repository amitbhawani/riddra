# Riddra 0065 Provider No Data Live Verification Report

Date: 2026-05-01  
Project: `jawojjmapxnevywrmmiq`

## Scope

Live verification after applying:

- `db/migrations/0065_stock_data_freshness_provider_no_data.sql`
- `NOTIFY pgrst, 'reload schema';`

Requested checks:

1. Run `npm run stocks:generate-freshness`
2. Confirm `KIRANVYPAR.NS` and `NEAGI.NS` are stored as `provider_no_data`
3. Confirm `fresh + accepted exceptions = 2157`
4. Confirm Import Control Center reads durable `provider_no_data` rows
5. Run lint and typecheck

## One real issue found during verification

The first live regeneration attempt failed with a database timeout on `stock_import_coverage`.

Error:

```text
stock_import_coverage: canceling statement due to statement timeout
```

Fix applied in:

- [scripts/generate-stock-data-freshness.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/generate-stock-data-freshness.mjs)

Change:

- stopped doing a broad ordered scan of `stock_import_coverage`
- now fetches only the two needed buckets:
  - `historical_prices`
  - `latest_market_snapshot`

This reduced the live query cost enough for freshness generation to complete successfully.

## Freshness regeneration

Command:

```bash
npm run stocks:generate-freshness
```

Result: `PASS`

Returned summary:

```json
{
  "evaluationDate": "2026-05-01",
  "expectedTradingDate": "2026-04-30",
  "marketSessionState": "closed",
  "policyReason": "holiday_or_weekend",
  "totalStocks": 2157,
  "staleCount": 0,
  "freshCount": 2157,
  "reasonCounts": {
    "holiday_or_weekend": 2155,
    "provider_no_data": 2
  },
  "sampleStaleStocks": []
}
```

## Durable provider_no_data verification

Direct live verification against `stock_data_freshness` confirmed:

- `provider_no_data` rows: `2`
- `fresh + accepted exceptions`: `2157`
- `total freshness rows`: `2157`

Verified durable rows:

```json
[
  {
    "symbol": "KIRANVYPAR",
    "yahooSymbol": "KIRANVYPAR.NS",
    "companyName": "Kiran Vyapar Limited",
    "reasonCategory": "provider_no_data",
    "isStale": false,
    "expectedTradingDate": "2026-04-30",
    "evaluationDate": "2026-05-01"
  },
  {
    "symbol": "NEAGI",
    "yahooSymbol": "NEAGI.NS",
    "companyName": "Neelamalai Agro Industries Limited",
    "reasonCategory": "provider_no_data",
    "isStale": false,
    "expectedTradingDate": "2026-04-30",
    "evaluationDate": "2026-05-01"
  }
]
```

## Control Center durable-read verification

Control Center route check:

```text
GET /admin/market-data/import-control-center -> 200
```

Durable-read confirmation:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts) reads durable `stock_data_freshness` rows into `durableFreshnessRowsRaw`
- those rows are normalized and passed into `buildFreshnessItems(...)`
- `provider_no_data` rows are explicitly preserved as accepted exceptions
- accepted exceptions are excluded from stale-blocking counts

Relevant code paths:

- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts:941)
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts:1248)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx:1267)

Verified effective Control Center interpretation after durable refresh:

- expected trading date: `2026-04-30`
- accepted exceptions: `2`
- `provider_no_data` reason count: `2`
- blocking stale count: `0`

## Validation

- `npm run stocks:generate-freshness` -> `PASS`
- `npm run lint` -> `PASS`
- `npx tsc --noEmit` -> `PASS`

## Final outcome

Prompt 0065 live verification status: `PASS`

Confirmed:

- `KIRANVYPAR.NS` is stored durably as `provider_no_data`
- `NEAGI.NS` is stored durably as `provider_no_data`
- `fresh + accepted exceptions = 2157`
- Import Control Center is reading the durable freshness model and treating `provider_no_data` rows as accepted exceptions
