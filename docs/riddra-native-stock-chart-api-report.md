# Riddra Native Stock Chart API Report

## What was built

Added a native backend chart API at `/api/stocks/[slug]/chart` that:

- resolves stocks through the canonical stock resolver
- reads only from `stock_price_history`
- does not call Yahoo or TradingView
- returns a clean OHLCV series plus chart metadata

## Response shape

The route returns:

- `points`
  - `date`
  - `open`
  - `high`
  - `low`
  - `close`
  - `adjustedClose`
  - `volume`
- `meta`
  - `symbol`
  - `companyName`
  - `firstDate`
  - `lastDate`
  - `pointCount`
  - `source = stock_price_history`
  - `range`
  - `interval`

## Range behavior

- `1D` returns the latest available candle only
- `7D`, `1M`, `6M`, `1Y`, `5Y` filter from the latest stored trade date backward
- `MAX` returns all available stored candles

## Empty-state behavior

If the stock cannot be resolved or if no stored `stock_price_history` rows exist, the route returns:

- `200 OK`
- `points = []`
- metadata with `pointCount = 0`

That keeps the API safe for canonical-only stocks and partial-data situations.

## Implementation notes

- the route uses `resolveCanonicalStockBySlug(slug)` to map the public slug to `stocks_master`
- chart reads use only `interval_type = 1d`
- `MAX` reads page through `stock_price_history` in batches of `1000` rows so longer histories do not truncate silently

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- `GET /api/stocks/reliance-industries/chart?range=1Y`
- `GET /api/stocks/20-microns-limited/chart?range=MAX`
