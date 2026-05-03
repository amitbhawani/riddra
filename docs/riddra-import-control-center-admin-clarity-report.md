# Riddra Import Control Center Admin Clarity Report

Date: 2026-04-29  
Route updated: `/admin/market-data/import-control-center`

## What changed

The Import Control Center was updated so it explains the real operational state in plain admin language instead of relying only on technical status labels like disabled, degraded, warning, and missing.

Two new sections were added:

1. `What needs fixing next`
2. `Status label guide`

These sections now appear near the top of the page, before the deeper source, safety, quality, and module tables.

## New “What needs fixing next” section

The page now shows these explicit operator items:

1. Historical prices  
   Status: `Complete`  
   Message: historical prices are complete and healthy.

2. Latest snapshots  
   Status: `In Progress`  
   Message: snapshots are only partially complete and still need a controlled missing-snapshot rollout.

3. Yahoo protected fundamentals  
   Status: `Disabled by Design`  
   Message: batch fundamentals stay disabled because Yahoo protected endpoints show `401` / `429` behavior.

4. Valuation, share statistics, and financial highlights  
   Status: `Degraded`  
   Message: pilot data can exist, but Yahoo does not currently provide a reliable broad import lane for these modules.

5. Financial statements  
   Status: `Disabled by Design`  
   Message: this remains manual single-stock test only.

6. Canonical stock universe  
   Status: `Complete`  
   Message: `stocks_master` is now the import source of truth.

7. Legacy instruments layer  
   Status: `Needs Migration`  
   Message: the older public-route listing layer still exists and must not be deleted yet.

## Real current-state data surfaced

The control center now explains the live database state directly:

- `stocks_master` active universe is the canonical import universe
- historical price coverage is complete across that universe
- latest snapshot coverage is still partial
- valuation/share-statistics/highlights are not yet dependable as a full-universe Yahoo lane
- financial statements remain intentionally blocked from batch mode
- the legacy `instruments` layer still has active rows and symbol overlap with the canonical universe, so deletion would be unsafe until route migration is complete

## New status labels and explanations

The page now explains these labels clearly:

- `Complete`: healthy and ready for normal use
- `In Progress`: working, but more import coverage work is still needed
- `Degraded`: safe fallback exists, but upstream Yahoo data is incomplete or blocked
- `Disabled by Design`: intentionally off in batch mode to avoid waste and repeated failure
- `Needs Migration`: still depends on older route/data-model wiring and must be migrated before cleanup

## Files changed

- [app/admin/market-data/import-control-center/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/market-data/import-control-center/page.tsx)
- [components/admin/admin-import-control-center-client.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/admin/admin-import-control-center-client.tsx)
- [lib/admin-import-control-center.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/admin-import-control-center.ts)

## Validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `GET /admin/market-data/import-control-center` -> `200`

## Result

The control center now reads like an operator decision board instead of a raw diagnostic dump. It tells admins:

- what is healthy
- what still needs action
- what is intentionally disabled
- what must not be deleted yet

That makes the next cleanup and migration work much less ambiguous.
