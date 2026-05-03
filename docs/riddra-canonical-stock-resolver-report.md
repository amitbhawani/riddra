# Riddra Canonical Stock Resolver Report

Date: 2026-04-29

## Goal

Prepare public stock routes and admin tools to move toward `stocks_master` as the canonical stock universe without breaking the existing legacy `instruments`-backed route layer.

## What Was Built

Created:

- [lib/canonical-stock-resolver.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/canonical-stock-resolver.ts)
- [scripts/verify-canonical-stock-resolver.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/verify-canonical-stock-resolver.mjs)

Updated:

- [package.json](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/package.json)

New script:

```bash
npm run stocks:verify-canonical-resolver
```

## Resolver Behavior

The resolver now supports lookups by:

1. `slug`
2. `yahooSymbol`
3. `symbol`
4. `instrumentId`

### Resolution priority

Primary resolution order:

1. `stocks_master`
2. `instruments` fallback
3. `companies` fallback for enrichment or last-resort identity

### Returned normalized shape

The resolver returns:

- `stockId`
- `stocksMasterId`
- `instrumentId`
- `companyId`
- `symbol`
- `yahooSymbol`
- `companyName`
- `slug`
- `exchange`
- `sourceLayer`
- `hasHistoricalData`
- `hasSnapshotData`

### Data-availability rules

To make migration safe during the bridge period:

- `hasHistoricalData` is `true` if either:
  - canonical normalized history exists in `stock_price_history`, or
  - legacy public history exists in `stock_ohlcv_history`
- `hasSnapshotData` is `true` if either:
  - canonical normalized snapshot exists in `stock_market_snapshot`, or
  - legacy public snapshot exists in `stock_quote_history`

That means consumers can start resolving identity canonically without assuming the route has already fully moved to normalized Yahoo tables.

## Verification Run

Command run:

```bash
npm run stocks:verify-canonical-resolver
```

Checked stocks:

- `reliance-industries`
- `tcs`
- `infosys`
- `hdfc-bank`
- `icici-bank`

The script verified four lookup modes for each stock:

- `bySlug`
- `byYahoo`
- `bySymbol`
- `byInstrumentId`

## Verification Results

### Summary

| Stock | `bySlug` | `byYahoo` | `bySymbol` | `byInstrumentId` | Source layer | Historical | Snapshot |
|---|---|---|---|---|---|---|---|
| `reliance-industries` | PASS | PASS | PASS | PASS | `stocks_master` | `true` | `true` |
| `tcs` | PASS | PASS | PASS | PASS | `stocks_master` | `true` | `true` |
| `infosys` | PASS | PASS | PASS | PASS | `stocks_master` | `true` | `true` |
| `hdfc-bank` | PASS | PASS | PASS | PASS | `stocks_master` | `true` | `true` |
| `icici-bank` | PASS | PASS | PASS | PASS | `stocks_master` | `true` | `true` |

### Detailed observations

- All five named stocks resolved from `stocks_master` first.
- All five carried a linked `instrumentId`, which confirms bridge compatibility with the legacy route layer.
- `Reliance Industries` also resolved a live `companyId` from the `companies` table.
- The other four resolved correctly without a `companies` row, which is acceptable because the canonical row already has enough identity data.

### Sample verified identities

| Slug | `stocksMasterId` | `instrumentId` | Symbol | Yahoo symbol | Company name |
|---|---|---|---|---|---|
| `reliance-industries` | `1e0fab79-e038-4b74-a135-af61999090cd` | `223f6dba-6e87-4e62-a727-ade4f34c39a0` | `RELIANCE` | `RELIANCE.NS` | `Reliance Industries` |
| `tcs` | `cc1530f8-304b-430b-9c32-d76f11391d86` | `554d9ba5-319c-4144-a0e4-d54efa872a2c` | `TCS` | `TCS.NS` | `TCS` |
| `infosys` | `c683fd75-6b73-4e3d-9f55-49f28d739e46` | `6a22172a-9be2-436f-8bba-96ef3e6956b3` | `INFY` | `INFY.NS` | `Infosys` |
| `hdfc-bank` | `b7802131-8df6-48d8-82f3-9ead58481f3c` | `0ed351ab-1f24-4e53-83bc-0310df25b210` | `HDFCBANK` | `HDFCBANK.NS` | `HDFC Bank` |
| `icici-bank` | `9fa61eaf-84c8-4f45-84a1-de5b77c995ba` | `7b0295ff-b6aa-489d-8d53-32fc2dae2547` | `ICICIBANK` | `ICICIBANK.NS` | `ICICI Bank` |

## What This Solves

This resolver gives us a migration-safe bridge:

- import/admin systems can use canonical identity immediately
- public routes can adopt it gradually
- legacy route support is preserved
- market-data presence checks remain honest during the mixed-layer transition

Most importantly, this avoids a risky “all at once” cutover from `instruments` to `stocks_master`.

## What It Does Not Change Yet

- It does **not** remove legacy route logic.
- It does **not** switch `/stocks/[slug]` to the new resolver yet.
- It does **not** rewrite `getStock()` / `getStocks()` yet.
- It does **not** fix known canonical-symbol mismatches like `tata-motors` in this step.

## Recommended Next Step

Use this resolver as the first compatibility layer inside:

- `lib/content.ts`
- `lib/publishable-content.ts`
- `lib/tradingview-datafeed-server.ts`
- admin stock utilities that still assume `instruments` is the primary identity source

That lets the route system move to canonical stock identity first, before the public content adapter is fully rewritten.

## Validation

- `npm run stocks:verify-canonical-resolver` -> PASS
- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
