# Riddra Engineering Standards

These rules are here so every future change stays consistent.

## Source standards

For any market data or financial content feature, document:

1. Source name
2. Source type
3. Official status
4. Refresh cadence
5. License or terms note
6. Fallback behavior

No production data integration should be added without source documentation.

## UI standards

Use shared components first.

Current shared primitives:

1. `Container`
2. `Eyebrow`
3. `SectionHeading`
4. `GlowCard`
5. `ButtonLink`

Future UI additions should be reusable and added centrally before they are copied into pages.

## Content standards

Every route family should follow a stable content flow.

Do not invent a new page structure unless the asset class genuinely needs one.

## Route standards

Use clear route families:

1. `/stocks/[slug]`
2. `/ipo/[slug]`
3. `/mutual-funds/[slug]`
4. `/screener`
5. `/pricing`
6. `/login`
7. `/signup`

If we add PMS, AIF, SIF, calculators, or learning pages, they should also use stable route families.

## Database standards

Use:

1. Lowercase table names
2. Snake case column names
3. Explicit timestamp fields
4. Clear master-detail relationships
5. Reusable entity patterns

Example:

- `instruments`
- `companies`
- `quotes_latest`
- `ohlcv_bars`
- `ipos`
- `mutual_funds`
- `subscriptions`
- `entitlements`

## Premium feature standards

Paid features should be controlled through entitlements, not hidden logic scattered across pages.

## Development standards

Before adding a feature:

1. Check the masterplan
2. Check progress log
3. Reuse existing components
4. Reuse route and content patterns
5. Keep the docs updated

## Package standards

Do not add packages casually.

Every dependency should satisfy one of these:

1. It supports the agreed architecture
2. It reduces repeated engineering work
3. It is required for production-grade behavior

## Verification standards

Before a milestone is marked complete:

1. The app should build successfully
2. Route structure should work
3. Documentation should reflect the change
4. Any new source assumptions should be recorded

## Database delivery standards

For each schema milestone:

1. Add migration SQL
2. Add seed SQL where useful
3. Keep source-of-truth records normalized
4. Keep auth, profiles, subscriptions, and entitlements separated cleanly
