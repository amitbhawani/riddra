# Riddra Frontend Data Accuracy Audit

Date: 2026-05-01  
Prompt: 114

## Scope

Audited public stock pages against live stored database values for:

- RELIANCE
- TCS
- INFY
- HDFCBANK
- ICICIBANK
- 20MICRONS

Checked:

1. latest price vs `stock_market_snapshot`
2. latest chart candle vs `stock_price_history`
3. `1Y` chart point count
4. chart tooltip source values vs DB
5. latest 10 historical rows vs DB
6. performance return calculations vs DB
7. fundamentals unavailable state vs fake data
8. null-field safety

## Small Fix Applied

One frontend issue was found during the audit:

- `StockNormalizedDataSections` was still mounted through a client-only `dynamic(..., { ssr: false })` boundary in `components/test-stock-detail-page.tsx`
- That caused the imported-data sections to be absent from server-rendered output during HTML-based verification
- Fix applied: replaced the client-only dynamic import with a normal component import

This did not change the underlying stock data. It only fixed how the already-imported sections are rendered on the page.

## Result Summary

All six audited stock pages passed the data-accuracy checks after the rendering fix.

| Stock | Latest Price | Latest Chart Candle | 1Y Point Count | Tooltip vs DB | Latest 10 Rows | Returns | Fundamentals State | Null Safe |
|---|---|---:|---:|---|---|---|---|---|
| RELIANCE | PASS | PASS | 254 | PASS | PASS | PASS | PASS | PASS |
| TCS | PASS | PASS | 254 | PASS | PASS | PASS | PASS | PASS |
| INFY | PASS | PASS | 254 | PASS | PASS | PASS | PASS | PASS |
| HDFCBANK | PASS | PASS | 254 | PASS | PASS | PASS | PASS | PASS |
| ICICIBANK | PASS | PASS | 254 | PASS | PASS | PASS | PASS | PASS |
| 20MICRONS | PASS | PASS | 254 | PASS | PASS | PASS | PASS | PASS |

## Notes

- `latest price matches stock_market_snapshot`: PASS for all 6 stocks
- `chart latest candle matches stock_price_history`: PASS for all 6 stocks
- `1Y` range point count: `254` for all 6 audited stocks, which is reasonable and matched the DB-backed range calculation exactly
- `tooltip values match DB`: PASS for all 6 stocks based on chart payload vs DB candle checks
- `latest 10 historical rows match DB`: PASS for all 6 stocks
- `performance returns are calculated correctly`: PASS for all 6 stocks for:
  - `7D`
  - `1M`
  - `6M`
  - `1Y`
  - `5Y`
  - `from 52-week high`
  - `from 52-week low`
- `missing fundamentals show empty state, not fake data`: PASS
  - all 6 pages now show the clean fundamentals unavailable message
- `page does not crash on null fields`: PASS for all 6 stocks

## Financials State

- RELIANCE, TCS, INFY, HDFCBANK, and ICICIBANK currently show stored financial statement rows rather than an empty state
- 20MICRONS shows the clean financial-statement unavailable state
- This is correct behavior: empty state only appears where stored financial data is absent

## Visual Spot Check

Browser verification on `/stocks/reliance-industries` confirmed the page renders:

- stock header
- market snapshot
- historical preview
- fundamentals unavailable note
- financial section
- performance section
- data status section

without crashes or placeholder-only fallback behavior.

## Final Verdict

Frontend displayed stock-market data is currently aligned with stored Riddra/Supabase values for the audited stock pages.

Status: PASS
