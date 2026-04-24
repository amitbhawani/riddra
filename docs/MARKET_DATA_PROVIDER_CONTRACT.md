# Market Data Provider Contract

This document defines the normalized JSON payload that Riddra accepts through:

- `POST /api/market-data/ingest`
- `POST /api/market-data/provider-sync` (provider URL is fetched server-side first)

The goal is simple:

- stock quote pages should show the latest verified delayed market snapshot while the market is open
- stock chart pages should show verified OHLCV for the correct symbol
- index pages should show verified delayed breadth/contribution snapshots while the market is open
- outside market hours, those same pages should continue to show the latest verified close

## Top-level payload

```json
{
  "stockQuotes": [],
  "stockCharts": [],
  "indexSnapshots": []
}
```

All top-level keys are optional, but at least one should be supplied.

## Stock quotes

```json
{
  "stockQuotes": [
    {
      "slug": "tata-motors",
      "source": "nse-delayed-feed",
      "price": 1042.35,
      "changePercent": 1.84,
      "lastUpdated": "2026-04-13T15:25:00+05:30"
    }
  ]
}
```

Rules:

- `slug` must match the Riddra stock slug
- `source` should identify the real upstream feed
- `price` is the latest verified delayed or closing price
- `changePercent` is the percentage move for the trading session
- `lastUpdated` should be the upstream market timestamp in ISO format

## Stock charts

```json
{
  "stockCharts": [
    {
      "slug": "tata-motors",
      "source": "nse-delayed-feed",
      "timeframe": "1D",
      "lastUpdated": "2026-04-13T15:25:00+05:30",
      "bars": [
        {
          "time": "2026-04-09",
          "open": 1010.2,
          "high": 1029.8,
          "low": 1002.4,
          "close": 1024.3
        },
        {
          "time": "2026-04-10",
          "open": 1024.3,
          "high": 1048.4,
          "low": 1019.9,
          "close": 1042.35
        }
      ]
    }
  ]
}
```

Rules:

- `bars` must contain at least two OHLC candles
- the chart route only renders as verified when these bars are present and not marked as demo
- use the stock’s Riddra slug, not an exchange symbol, as the canonical page mapping key

## Index snapshots

```json
{
  "indexSnapshots": [
    {
      "slug": "nifty50",
      "sourceCode": "nse_index",
      "snapshotAt": "2026-04-13T15:25:00+05:30",
      "sessionPhase": "Closing push",
      "movePercent": 0.33,
      "weightedBreadthScore": 0.42,
      "advancingCount": 31,
      "decliningCount": 19,
      "positiveWeightShare": 63.4,
      "negativeWeightShare": 36.6,
      "marketMood": "Bullish",
      "dominanceLabel": "Leaders are in control",
      "trendLabel": "Improving through the session",
      "components": [
        {
          "symbol": "HDFCBANK",
          "name": "HDFC Bank",
          "weight": 8.4,
          "changePercent": 0.62,
          "contribution": 0.05,
          "signal": "bullish"
        },
        {
          "symbol": "RELIANCE",
          "name": "Reliance Industries",
          "weight": 9.8,
          "changePercent": 0.45,
          "contribution": 0.04,
          "signal": "bullish"
        }
      ]
    }
  ]
}
```

Rules:

- `slug` must match one of the tracked Riddra indexes like `nifty50`, `sensex`, `banknifty`, or `finnifty`
- `components` should represent the same snapshot timestamp
- when ingested successfully, the tracked index is moved to `live`

## Recommended first provider target

To complete the first trustworthy rollout, the provider should deliver:

1. `stockQuotes` for:
   - `tata-motors`
   - `reliance-industries`

2. `stockCharts` for:
   - `tata-motors`

3. `indexSnapshots` for:
   - `nifty50`
   - `sensex`
   - `banknifty`
   - `finnifty`

Once those payloads are reaching Riddra on a schedule, the public routes already built in the app will switch from pending or seeded states into verified delayed/closing states automatically.

## Vercel cron execution

Riddra now supports a provider-sync execution route at:

- `GET /api/market-data/provider-sync` for readiness
- `POST /api/market-data/provider-sync` for manual signed execution

It also supports Vercel Cron authentication through `CRON_SECRET`. On Vercel, cron requests send:

- `Authorization: Bearer <CRON_SECRET>`

The repo now includes a safe default `vercel.json` cron:

- `/api/market-data/provider-sync`
- `0 11 * * *`

That runs once per day at `11:00 UTC` which is `16:30 IST`, a sensible default for refreshing the latest verified close on Hobby plans. If the project moves to Vercel Pro, this schedule can be tightened to run more frequently during market hours for delayed updates.
