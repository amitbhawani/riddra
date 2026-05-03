# Riddra Import Control Center Sorting Report

Date: 2026-04-30

## What changed

Sorting controls were added to the main data-heavy sections of `/admin/market-data/import-control-center` so operators can reorder live data instead of scanning only the default order.

## Sections now sortable

- Recent activity
- Latest failed imports
- Latest skipped imports
- Latest reused-data events
- Progress by module
- Data quality worst-stocks list
- Durable critical alerts
- Daily data freshness stale-stock list

## Sort examples now supported

- activity by date, fill %, status, stock, module, step, inserted rows, skipped rows
- module progress by coverage %, fill %, latest import, status, warnings, errors
- worst stocks by score, last import, missing modules, warnings, errors, stock name
- stale stocks by symbol, company, last price date, last snapshot date, has today price, has today snapshot
- durable alerts by date, severity, type, and scope

## Implementation notes

- sorting is client-side only
- no backend query behavior was changed
- no import logic was changed
- default page behavior remains the same if the operator does not interact with the new controls

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `GET /admin/market-data/import-control-center` -> `200`
