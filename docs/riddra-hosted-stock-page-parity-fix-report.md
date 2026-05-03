# Riddra Hosted Stock Page Parity Fix Report

## Goal

Bring hosted stock detail behavior in line with the latest local stock page behavior.

Target issues:

- old broken chart state on hosted Reliance page
- `1D` still visible in hosted HTML
- `1Y RETURN` showing `Awaiting extended history`
- chart stuck on loading
- conflicting visible price values

## Files audited

- [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)
- [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)
- [components/native-stock-history-chart.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/native-stock-history-chart.tsx)
- [components/stock-normalized-data-sections.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/stock-normalized-data-sections.tsx)
- [lib/stock-normalized-detail.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/stock-normalized-detail.ts)
- [app/api/stocks/[slug]/chart/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/stocks/%5Bslug%5D/chart/route.ts)

## Code-path findings

### 1. Native chart is already the active stock-page chart in current repo

The live page route renders:

- [NativeStockHistoryChart](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/native-stock-history-chart.tsx)

through:

- [TestStockDetailPage](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)

The active public stock-page chart ranges are:

- `7D`
- `1M`
- `6M`
- `1Y`
- `5Y`
- `MAX`

So the current repo no longer intentionally exposes `1D` on the public stock page.

### 2. Old legacy chart shell still exists in code, but is disabled

There is still a large legacy branch in:

- [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)

but it is guarded by:

- `const showLegacyDataSections = false;`

That means current local behavior is already on the newer path, even though the stale branch remains in source.

### 3. Hosted stale behavior is real

Hosted HTML for:

- [https://www.riddra.com/stocks/reliance-industries](https://www.riddra.com/stocks/reliance-industries)

still showed:

- `Awaiting extended history`
- `1D`
- `Loading stored chart history`

It did **not** show:

- `Fundamentals are not available from the current data provider yet.`

That means hosted is still serving an older stock-page build than the current local repo.

## What changed in this pass

### 1. Stock normalized data sections are now rendered directly

Updated:

- [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)

Changed from a lazy dynamic placeholder path to a direct component import:

- [StockNormalizedDataSections](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/stock-normalized-data-sections.tsx)

Why:

- makes the fundamentals unavailable state available immediately
- removes one more layer of hosted/client-only drift

### 2. Visible stock header and market snapshot now prefer stored normalized data more consistently

Updated:

- [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)

Source priority is now tighter for visible values:

- trade date
- open
- high
- low
- previous close

Priority used now:

1. `normalizedData.latestSnapshot`
2. `normalizedData.priceHistory`
3. legacy `chartSnapshot`
4. older `stock` fallback only when needed

This reduces the risk of conflicting visible price values.

### 3. Native chart fetch now times out instead of hanging indefinitely

Updated:

- [components/native-stock-history-chart.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/native-stock-history-chart.tsx)

Added a client fetch timeout:

- `4500ms`

If the chart API stalls, the chart now moves to a clean error state instead of sitting on loading forever.

## Validation

## Local route checks

Verified locally:

- `/stocks/reliance-industries` -> `200`
- `/stocks/tcs` -> `200`
- `/stocks/infosys` -> `200`
- `/stocks/hdfc-bank` -> `200`
- `/stocks/icici-bank` -> `200`
- `/stocks/20-microns-limited` -> `200`

Observed timings in local dev:

- Reliance: about `5113ms`
- TCS: about `3707ms`
- Infosys: about `3773ms`
- HDFCBANK: about `3687ms`
- ICICIBANK: about `3454ms`
- 20MICRONS: about `3254ms`

Local Reliance HTML check:

- `hasAwaiting = false`
- `has1DButton = false`
- `hasFundamentalsUnavailable = true`
- `hasNormalizedNull = false`

## Hosted route checks

Verified hosted routes:

- `/stocks/reliance-industries` -> `200`
- `/stocks/tcs` -> `200`
- `/stocks/infosys` -> `200`
- `/stocks/hdfc-bank` -> `200`
- `/stocks/icici-bank` -> `200`
- `/stocks/20-microns-limited` -> `200`

Observed hosted timings:

- Reliance: about `3458ms`
- TCS: about `4342ms`
- Infosys: about `4395ms`
- HDFCBANK: about `3797ms`
- ICICIBANK: about `4199ms`
- 20MICRONS: about `3774ms`

Hosted Reliance HTML check still shows stale parity gaps:

- `hasAwaiting = true`
- `has1DButton = true`
- `hasFundamentalsUnavailable = false`
- `hasNormalizedNull = false`
- `hasChartLoading = true`

## Conclusion

### Repo status

- local stock-page parity path is fixed and coherent
- native chart is the active chart path
- normalized data sections now render directly
- visible price/snapshot values use better stored-data priority
- chart loading no longer hangs indefinitely

### Hosted status

- hosted is still **not** in parity with the current repo
- the hosted HTML evidence strongly suggests production is serving an older deployment

## Exact next action

1. Redeploy Production with the current repo state.
2. Re-run hosted smoke on:
   - `/stocks/reliance-industries`
   - `/stocks/tcs`
   - `/stocks/infosys`
   - `/stocks/hdfc-bank`
   - `/stocks/icici-bank`
   - `/stocks/20-microns-limited`
3. Confirm hosted Reliance no longer contains:
   - `1D`
   - `Awaiting extended history`
   - `Loading stored chart history`
4. Confirm hosted Reliance does contain:
   - `Fundamentals are not available from the current data provider yet.`

## Final truth

- **Local parity:** fixed
- **Hosted parity:** blocked on redeploy, not on remaining stock-page code uncertainty
