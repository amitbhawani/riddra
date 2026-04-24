# Stock Test Page Feature Import Map

Working implementation companion to the comparison review for `/stocks/test-motors`.

This file tracks the review-first stock-page feature bank that was added above the FAQ section on the test page so the full missing surface can be seen in one pass and pruned later.

## Purpose

- Bring the broader competitor stock-detail feature surface into one local review stack.
- Keep the work scoped to the test route instead of pushing unfinished decisions across all stock pages.
- Preserve the current Riddra shell and styling while importing missing module names, groupings, and review lanes.

## Reference set

- StockEdge: `https://web.stockedge.com/share/reliance-industries/4897?section=prices&exchange-name=nse&time-period=1D`
- Dhan: `https://dhan.co/stocks/reliance-industries-ltd-share-price/`
- Angel One: `https://www.angelone.in/stocks/reliance-industries-ltd`
- INDmoney: `https://www.indmoney.com/stocks/reliance-industries-ltd-share-price`
- Groww: `https://groww.in/stocks/reliance-industries-ltd`
- Value Research: `https://www.valueresearchonline.com/stocks/44052/reliance-industries-ltd/`
- Investing.com historical data: `https://in.investing.com/equities/reliance-industries-historical-data`
- Tickertape: `https://www.tickertape.in/stocks/reliance-industries-RELI`
- Finology: `https://ticker.finology.in/company/RELIANCE`
- NSE: `https://www.nseindia.com/get-quote/equity/RELIANCE/Reliance-Industries-Limited`
- Moneycontrol: `https://www.moneycontrol.com/india/stockpricequote/refineries/relianceindustries/RI`

## Imported review stack on `/stocks/test-motors`

### 1. Exchange tape and market action

- Bid / ask
- Last traded quantity
- Last trade time
- Average traded price
- Volume
- 20D average volume
- Delivery percentage
- 5D delivery average
- Lower circuit
- Upper circuit
- All-time high
- All-time low

### 2. Technical board

- Technical rating
- Moving averages
- Exponential moving averages
- RSI
- MACD
- ADX
- Stochastic
- Williams %R
- ROC
- Pivot points

### 3. Valuation and quality

- Market cap
- P/E ratio
- Industry P/E
- P/B ratio
- ROE
- ROCE
- Debt to equity
- EV / EBITDA
- Dividend yield
- Book value

### 4. Historical data and returns

- Historical OHLCV table
- Daily interval history
- Weekly interval history
- Monthly interval history
- 1M return
- 3M return
- 1Y return
- 3Y return
- 5Y return
- Download-ready history lane

### 5. Analyst, sentiment, and scorecards

- Analyst view
- Target price
- Fair value
- Sentiment
- Entry point
- Red flags
- Pros and cons
- SWOT

### 6. Financial statements and business quality

- Financial summary
- Income statement
- Balance sheet
- Cash flow
- Ratios
- Quarterly results
- Margins
- Revenue and profit trend

### 7. Ownership and participants

- Shareholding pattern
- Promoter holding trend
- FII / DII mix
- Mutual fund holding
- Top shareholders
- Public participation

### 8. Corporate events and filings

- Corporate actions
- Announcements
- Board meetings
- Financial results
- Annual report
- Investor presentations
- Bulk deals
- Block deals

### 9. Derivatives and trading tools

- Futures link
- Option chain link
- Margin lane
- Market lot
- Advanced chart
- Technical screener
- Alert hooks

### 10. Discovery and comparison

- Peer comparison
- Sector tags
- Industry tags
- Similar stocks
- Benchmark comparison
- Company profile
- Business segments
- Route handoffs

## Sidebar move

- `Popular Stocks / Discovery` was moved out of the main column.
- It now sits in the right sidebar below `Top Losers` so the main column stays focused on research modules and review blocks.

## Notes for later pruning

- This import bank is intentionally broader than the final production page.
- Some blocks already use local test-route data.
- Some blocks are structure-first preview lanes added so product review can happen in one pass.
- After review, keep only the modules that fit the real Riddra stock-page contract.
