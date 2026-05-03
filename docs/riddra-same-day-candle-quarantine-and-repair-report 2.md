# Riddra Same-Day Candle Quarantine And Repair Report

Date: 2026-05-01  
Target date: `2026-04-30`

## Scope

Requested scope:

- quarantine and repair only the `40` affected symbols from [docs/riddra-same-day-candle-corruption-investigation.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-same-day-candle-corruption-investigation.md)
- quarantine `stock_price_history` and `stock_market_snapshot` rows first
- no hard deletes
- reimport via `daily_same_day_only`
- `force=true` only after quarantine
- `chart/history` only
- `1` worker
- `1` request every `4` seconds
- verify symbol-specific raw payloads after repair
- confirm the suspicious shared RELIANCE fixture candle is gone

## Prepared Repair Path

I created the one-off repair runner at:

- [scripts/quarantine-and-repair-same-day-candles.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/quarantine-and-repair-same-day-candles.mjs)

What it is designed to do:

1. resolve only the affected `40` stocks
2. load `2026-04-30` rows from:
   - `stock_price_history`
   - `stock_market_snapshot`
3. identify the corrupted RELIANCE fixture signature
4. insert active quarantine rows into `market_data_row_quarantine`
5. reimport only those `40` stocks with:
   - `daily_same_day_only`
   - `targetDate=2026-04-30`
   - `force=true`
   - `1` worker
   - `1` request every `4` seconds
6. verify the repaired rows are backed by symbol-specific raw Yahoo chart payloads
7. confirm the suspicious shared RELIANCE fixture candle no longer remains on `2026-04-30`
8. resolve quarantine rows only after verification passes

## Validation Completed

- affected stock resolution check: `40 / 40` active stocks resolved
- script syntax check: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS

## Live Blocker

The repair could not be executed yet because the quarantine registry table is still not available through live PostgREST.

Direct service-role verification returned:

```json
{
  "error": "Could not find the table 'public.market_data_row_quarantine' in the schema cache",
  "count": null
}
```

That means the required live quarantine migration is not yet usable from the app/runtime side:

- [db/migrations/0064_market_data_row_quarantine.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0064_market_data_row_quarantine.sql)

Because your rule requires quarantine first, I did **not** bypass that step and I did **not** run the repair import unsafely.

## Follow-up Verification After Live Apply Claim

After the later confirmation that `0064_market_data_row_quarantine.sql` had been applied live and PostgREST reload had been triggered, I rechecked the connected project directly through the same runtime used by the app.

Result:

```json
{
  "error": "Could not find the table 'public.market_data_row_quarantine' in the schema cache",
  "count": null,
  "sample": null
}
```

So the connected Supabase REST runtime at:

- `https://jawojjmapxnevywrmmiq.supabase.co`

still does **not** expose `public.market_data_row_quarantine` to the app/runtime path.

That means the 40-symbol quarantine-first repair flow remains blocked from this environment, even after the reported live apply.

## Execution Result

Completed:

- isolated the repair to the exact `40` affected symbols
- prepared the quarantine-and-repair runner
- verified the runner compiles
- verified the symbol scope resolves correctly
- re-verified that `40 / 40` affected active stocks resolve correctly
- re-verified that the quarantine table is still unavailable through PostgREST
- re-ran targeted native chart checks confirming the corruption still remains visible

Not completed yet:

- quarantine inserts
- `daily_same_day_only` repair reimport
- post-repair raw-payload verification
- post-repair shared-candle clearance verification

## No Data Mutation Performed

Because the quarantine table is unavailable in live runtime access:

- no rows were quarantined
- no rows were repaired
- no rows were deleted
- no full-universe repair was run

## Current Corruption Check

The corruption is still visible in the native chart API because no quarantine or repair has actually executed yet.

Direct `1D` chart checks returned the same suspicious `2026-04-30` candle for all three symbols below:

- `RELIANCE`
- `TCS`
- `20MICRONS`

Shared returned candle:

- `open = 1343.6`
- `high = 1356.8`
- `low = 1337.2`
- `close = 1350.75`
- `adjustedClose = null`
- `volume = 5320000`

## Next Step To Unblock

Apply the live migration:

- [db/migrations/0064_market_data_row_quarantine.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0064_market_data_row_quarantine.sql)

Then reload PostgREST schema cache:

```sql
notify pgrst, 'reload schema';
```

Then verify from the same app/runtime path that this succeeds:

```json
{
  "error": null
}
```

Once that is true, the prepared runner can execute the exact quarantine-first repair for the `40` affected symbols without touching the rest of the universe.
