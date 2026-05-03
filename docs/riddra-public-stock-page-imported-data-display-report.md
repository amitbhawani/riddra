# Riddra Public Stock Page Imported Data Display Report

## Goal
Expose all currently available stored Yahoo/Riddra market data on the public stock page without calling Yahoo or TradingView from the frontend.

## What Changed

### 1. Server-side normalized stock payload is now passed into the stock page
- Updated `app/stocks/[slug]/page.tsx`
- The stock page now preloads `getNormalizedStockDetailData(slug)` on the server and passes it into the client stock page component.
- This avoids the stock page depending on a second client-only fetch before showing imported data sections.

### 2. Normalized stock payload now includes richer stored market status data
- Updated `lib/stock-normalized-detail.ts`
- Added and exposed:
  - `exchange`
  - snapshot `sourceName`
  - snapshot `importedAt`
  - calendar-window returns:
    - `sevenDay`
    - `oneMonth`
    - `threeMonth`
    - `sixMonth`
    - `oneYear`
    - `fiveYear`
    - `fiveYearCagr`
    - `fromWeek52High`
    - `fromWeek52Low`
  - `dataStatus`
    - `historicalRowCount`
    - `historicalFirstDate`
    - `historicalLastDate`
    - `latestSnapshotStatus`
    - `latestSnapshotTradeDate`
    - `expectedTradingDate`
    - `evaluationDate`
    - `reasonCategory`
    - `marketSessionState`
    - `isStale`
    - `acceptedProviderException`
    - `lastSuccessfulImportAt`
- Freshness is derived using the trading-date-aware policy already in the app, using only stored page data.

### 3. Public stock page sections now surface stored imported data directly
- Updated `components/stock-normalized-data-sections.tsx`
- Added or improved:
  - `Stock header`
    - company name
    - symbol
    - exchange
    - latest price
    - change
    - change percent
    - last updated
  - `Market snapshot`
    - open
    - high
    - low
    - close
    - previous close
    - volume
    - source
    - trade date
  - `Historical data preview`
    - latest 10 trading rows
  - `Price performance`
    - 7D
    - 1M
    - 6M
    - 1Y
    - 5Y
    - from 52-week high
    - from 52-week low
  - `Data status`
    - historical coverage
    - snapshot status
    - freshness status
    - accepted provider exception
    - last successful import date
  - `Fundamentals`
    - exact unavailable-state message:
      - `Fundamentals are not available from the current data provider yet.`
  - `Financial statements`
    - clean unavailable state if no stored data exists
  - `Data quality note`
    - `Price data is powered by stored Riddra market history. Fundamentals will be added in a later phase.`

### 4. Native chart now handles `1D` correctly
- Updated `components/native-stock-history-chart.tsx`
- The stored native chart now supports a single-point `1D` range without falling back to the old “not enough points” state.
- This keeps:
  - `/api/stocks/[slug]/chart`
  - 1D / 7D / 1M / 6M / 1Y / 5Y / MAX
  - tooltip OHLCV behavior

## Notes
- No frontend Yahoo calls were added.
- No TradingView dependency was added.
- The page continues using stored Riddra data only.
- Canonical and legacy stock routes still resolve through the existing stock page flow.
- If certain optional normalized tables are absent in the connected Supabase schema, the page continues to render gracefully using the stored rows that are available.

## Validation
- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS
- `/stocks/reliance-industries` -> `200`
- `/stocks/tcs` -> `200`
- `/stocks/infosys` -> `200`
- `/stocks/hdfc-bank` -> `200`
- `/stocks/icici-bank` -> `200`
- `/stocks/20-microns-limited` -> `200`
