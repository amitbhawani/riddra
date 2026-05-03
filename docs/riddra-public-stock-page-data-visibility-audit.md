# Riddra Public Stock Page Data Visibility Audit

Date: 2026-05-01  
Scope:

- `/stocks/reliance-industries`
- `/stocks/tcs`
- `/stocks/infosys`
- `/stocks/hdfc-bank`
- `/stocks/icici-bank`
- `/stocks/20-microns-limited`

## Audit Method

I used a mix of:

- live route health checks on the six public stock pages
- live public API checks on:
  - `/api/stocks/[slug]/chart`
  - `/api/stocks/[slug]/normalized`
- stock-page component audit in:
  - [app/stocks/[slug]/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/stocks/%5Bslug%5D/page.tsx)
  - [components/test-stock-detail-page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/test-stock-detail-page.tsx)
  - [components/native-stock-history-chart.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/native-stock-history-chart.tsx)
  - [components/stock-normalized-data-sections.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/components/stock-normalized-data-sections.tsx)

Important live finding:

- `reliance-industries`, `tcs`, and `infosys` returned `200`
- `hdfc-bank`, `icici-bank`, and `20-microns-limited` returned `500`

So for the last three pages, the backend data is present through the public APIs, but the page is not currently rendering cleanly on localhost during this audit.

## Route Health

| Page | Route health |
| --- | --- |
| `reliance-industries` | `200` |
| `tcs` | `200` |
| `infosys` | `200` |
| `hdfc-bank` | `500` |
| `icici-bank` | `500` |
| `20-microns-limited` | `500` |

## Shared Visibility Rules Across These Stock Pages

These pages all use the same stock-page frontend, so the UI shape is consistent:

- Company name, symbol, latest price, price change, last-updated stamp, and top quote stats are rendered in the hero.
- Exchange is shown as a static market-tab treatment with `NSE` active, not as a dynamic record-level exchange field.
- Native chart uses `/api/stocks/[slug]/chart` only.
- Chart range buttons are present for all pages:
  - `1D`
  - `7D`
  - `1M`
  - `6M`
  - `1Y`
  - `5Y`
  - `MAX`
- Tooltip OHLCV works only when the selected range has at least `2` stored points.
- Current implementation nuance:
  - `1D` returns only `1` stored candle, so the button exists but the chart cannot draw a line and the OHLCV tooltip does not appear for `1D`.
  - `7D` and longer ranges are drawable and tooltip-capable on all six audited stocks.
- There is no dedicated “fundamentals unavailable” banner on the page today.
- There is no dedicated “valuation section empty state” today.
  Valuation-style data is folded into key-stat cards; missing values fall back to `Not available`.

## Page-By-Page Audit

### 1. `/stocks/reliance-industries`

Route status: `200`

| Check | Result | Notes |
| --- | --- | --- |
| 1. Company name | Yes | `Reliance Industries` |
| 2. Symbol | Yes | `RELIANCE` |
| 3. Exchange | Yes | Static tab treatment shows `NSE` active |
| 4. Latest price | Yes | Latest snapshot price available |
| 5. Price change | Yes | Absolute + percent change available |
| 6. Day high/low | Yes | Available from latest snapshot |
| 7. Volume | Yes | Visible via normalized chart/stat area and tooltip |
| 8. Historical chart | Yes | Native chart renders |
| 9. 1D, 7D, 1M, 6M, 1Y, 5Y, MAX ranges | Partial | All buttons exist; `1D` is not drawable, `7D+` work |
| 10. Chart tooltip OHLCV | Partial | Works for `7D+`, not for `1D` |
| 11. Data freshness / last updated | Yes | Hero shows last-updated stamp |
| 12. 52-week high/low | Yes | Calculated and available |
| 13. Performance returns | Yes | 1M, 3M, 6M, 1Y, YTD visible; 5Y CAGR currently not available |
| 14. Valuation section empty state | No | No dedicated valuation empty-state component exists |
| 15. Financials section empty state | No | Financial rows are populated |
| 16. Corporate actions empty state | Yes | No dividends or splits rows imported |
| 17. Fundamentals unavailable notice | No | No global unavailable notice is shown |

### 2. `/stocks/tcs`

Route status: `200`

| Check | Result | Notes |
| --- | --- | --- |
| 1. Company name | Yes | `TCS` |
| 2. Symbol | Yes | `TCS` |
| 3. Exchange | Yes | Static tab treatment shows `NSE` active |
| 4. Latest price | Yes | Latest snapshot price available |
| 5. Price change | Yes | Absolute + percent change available |
| 6. Day high/low | Yes | Available from latest snapshot |
| 7. Volume | Yes | Visible via normalized chart/stat area and tooltip |
| 8. Historical chart | Yes | Native chart renders |
| 9. 1D, 7D, 1M, 6M, 1Y, 5Y, MAX ranges | Partial | All buttons exist; `1D` is not drawable, `7D+` work |
| 10. Chart tooltip OHLCV | Partial | Works for `7D+`, not for `1D` |
| 11. Data freshness / last updated | Yes | Hero shows last-updated stamp |
| 12. 52-week high/low | Yes | Calculated and available |
| 13. Performance returns | Yes | 1M, 3M, 6M, 1Y, YTD visible; 5Y CAGR currently not available |
| 14. Valuation section empty state | No | No dedicated valuation empty-state component exists |
| 15. Financials section empty state | No | Financial rows are populated |
| 16. Corporate actions empty state | Yes | No dividends or splits rows imported |
| 17. Fundamentals unavailable notice | No | No global unavailable notice is shown |

### 3. `/stocks/infosys`

Route status: `200`

| Check | Result | Notes |
| --- | --- | --- |
| 1. Company name | Yes | `Infosys` |
| 2. Symbol | Yes | `INFY` |
| 3. Exchange | Yes | Static tab treatment shows `NSE` active |
| 4. Latest price | Yes | Latest snapshot price available |
| 5. Price change | Yes | Absolute + percent change available |
| 6. Day high/low | Yes | Available from latest snapshot |
| 7. Volume | Yes | Visible via normalized chart/stat area and tooltip |
| 8. Historical chart | Yes | Native chart renders |
| 9. 1D, 7D, 1M, 6M, 1Y, 5Y, MAX ranges | Partial | All buttons exist; `1D` is not drawable, `7D+` work |
| 10. Chart tooltip OHLCV | Partial | Works for `7D+`, not for `1D` |
| 11. Data freshness / last updated | Yes | Hero shows last-updated stamp |
| 12. 52-week high/low | Yes | Calculated and available |
| 13. Performance returns | Yes | 1M, 3M, 6M, 1Y, YTD visible; 5Y CAGR currently not available |
| 14. Valuation section empty state | No | No dedicated valuation empty-state component exists |
| 15. Financials section empty state | No | Financial rows are populated |
| 16. Corporate actions empty state | Yes | No dividends or splits rows imported |
| 17. Fundamentals unavailable notice | No | No global unavailable notice is shown |

### 4. `/stocks/hdfc-bank`

Route status: `500`

Backend visibility status:

- normalized API is healthy
- native chart API is healthy
- latest snapshot, chart, performance, and financial data all exist

Current frontend result:

| Check | Result | Notes |
| --- | --- | --- |
| 1. Company name | Blocked | Backend has `HDFC Bank`, but current page request is `500` |
| 2. Symbol | Blocked | Backend has `HDFCBANK`, but current page request is `500` |
| 3. Exchange | Blocked | Would use the same `NSE` tab treatment if page rendered |
| 4. Latest price | Blocked | Backend snapshot exists |
| 5. Price change | Blocked | Backend snapshot exists |
| 6. Day high/low | Blocked | Backend snapshot exists |
| 7. Volume | Blocked | Backend snapshot/chart data exists |
| 8. Historical chart | Blocked | Chart API is healthy but page is failing |
| 9. 1D, 7D, 1M, 6M, 1Y, 5Y, MAX ranges | Blocked live / supported in backend | Same range behavior as the healthy pages |
| 10. Chart tooltip OHLCV | Blocked live / supported in backend | `7D+` drawable in API, `1D` still single-point only |
| 11. Data freshness / last updated | Blocked | Backend snapshot date exists |
| 12. 52-week high/low | Blocked | Backend calculated values exist |
| 13. Performance returns | Blocked | Backend performance values exist |
| 14. Valuation section empty state | No dedicated state | Same frontend rule as other pages |
| 15. Financials section empty state | No | Financial rows exist in backend |
| 16. Corporate actions empty state | Would be yes | No dividends or splits rows imported |
| 17. Fundamentals unavailable notice | No | No global unavailable notice exists |

### 5. `/stocks/icici-bank`

Route status: `500`

Backend visibility status:

- normalized API is healthy
- native chart API is healthy
- latest snapshot, chart, performance, and financial data all exist

Current frontend result:

| Check | Result | Notes |
| --- | --- | --- |
| 1. Company name | Blocked | Backend has `ICICI Bank`, but current page request is `500` |
| 2. Symbol | Blocked | Backend has `ICICIBANK`, but current page request is `500` |
| 3. Exchange | Blocked | Would use the same `NSE` tab treatment if page rendered |
| 4. Latest price | Blocked | Backend snapshot exists |
| 5. Price change | Blocked | Backend snapshot exists |
| 6. Day high/low | Blocked | Backend snapshot exists |
| 7. Volume | Blocked | Backend snapshot/chart data exists |
| 8. Historical chart | Blocked | Chart API is healthy but page is failing |
| 9. 1D, 7D, 1M, 6M, 1Y, 5Y, MAX ranges | Blocked live / supported in backend | Same range behavior as the healthy pages |
| 10. Chart tooltip OHLCV | Blocked live / supported in backend | `7D+` drawable in API, `1D` still single-point only |
| 11. Data freshness / last updated | Blocked | Backend snapshot date exists |
| 12. 52-week high/low | Blocked | Backend calculated values exist |
| 13. Performance returns | Blocked | Backend performance values exist |
| 14. Valuation section empty state | No dedicated state | Same frontend rule as other pages |
| 15. Financials section empty state | No | Financial rows exist in backend |
| 16. Corporate actions empty state | Would be yes | No dividends or splits rows imported |
| 17. Fundamentals unavailable notice | No | No global unavailable notice exists |

### 6. `/stocks/20-microns-limited`

Route status: `500`

Backend visibility status:

- normalized API is healthy
- native chart API is healthy
- latest snapshot and chart data exist
- financial rows are empty in backend

Current frontend result:

| Check | Result | Notes |
| --- | --- | --- |
| 1. Company name | Blocked | Backend has `20 Microns Limited`, but current page request is `500` |
| 2. Symbol | Blocked | Backend has `20MICRONS`, but current page request is `500` |
| 3. Exchange | Blocked | Would use the same `NSE` tab treatment if page rendered |
| 4. Latest price | Blocked | Backend snapshot exists |
| 5. Price change | Blocked | Backend snapshot exists |
| 6. Day high/low | Blocked | Backend snapshot exists |
| 7. Volume | Blocked | Backend snapshot/chart data exists |
| 8. Historical chart | Blocked | Chart API is healthy but page is failing |
| 9. 1D, 7D, 1M, 6M, 1Y, 5Y, MAX ranges | Blocked live / supported in backend | Same range behavior as the healthy pages |
| 10. Chart tooltip OHLCV | Blocked live / supported in backend | `7D+` drawable in API, `1D` still single-point only |
| 11. Data freshness / last updated | Blocked | Backend snapshot date exists |
| 12. 52-week high/low | Blocked | Backend calculated values exist |
| 13. Performance returns | Blocked | Backend performance values exist |
| 14. Valuation section empty state | No dedicated state | Same frontend rule as other pages |
| 15. Financials section empty state | Would be yes | No annual or quarterly financial rows are present |
| 16. Corporate actions empty state | Would be yes | No dividends or splits rows imported |
| 17. Fundamentals unavailable notice | No | No global unavailable notice exists |

## Cross-Page Findings

### Confirmed visible today on healthy routes

For `reliance-industries`, `tcs`, and `infosys`, the public page currently exposes:

- company name
- symbol
- exchange treatment (`NSE` tab active)
- latest price
- price change
- day high / low
- historical chart
- chart ranges
- last updated
- 52-week high / low
- performance section

### Confirmed backend-backed but not fully visible due current route failures

For `hdfc-bank`, `icici-bank`, and `20-microns-limited`, the public APIs show that the page has enough stored market data to render:

- latest snapshot
- historical chart
- chart ranges
- 52-week range
- performance metrics

But the public page itself is currently failing with `500`, so the data is not visible to a user on localhost right now.

### Chart-specific visibility issue

Across all six audited pages:

- `1D` range exists as a button
- `1D` returns only `1` candle
- the current native chart component needs at least `2` points to draw a line and enable the OHLCV tooltip

So:

- `1D` button is visible
- `1D` line chart is not actually drawable
- `1D` tooltip does not work
- `7D`, `1M`, `6M`, `1Y`, `5Y`, and `MAX` do work

### Fundamentals / valuation UX gap

Current stock-page UX does **not** yet show a clean global notice explaining that:

- valuation / quoteSummary-style Yahoo modules are intentionally disabled in the daily sync lane
- holders / analyst data are still unavailable

Instead:

- some sections render empty states
- some fields render `Not available`
- but there is no single honest “fundamentals unavailable” explanation block

## Final Audit Verdict

- Public stock-page market-data visibility is **partially working**
- The core quote + chart experience is working on:
  - `reliance-industries`
  - `tcs`
  - `infosys`
- Three audited pages are currently blocked by a real route-level `500`
- The native chart is generally working well, but `1D` still has a product gap because one candle cannot produce a line chart or tooltip
- Financials are present for the five larger stocks audited here
- `20-microns-limited` would currently fall into financial empty states once its route-level `500` is fixed
