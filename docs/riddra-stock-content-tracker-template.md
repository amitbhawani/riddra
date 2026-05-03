# Riddra Stock Content Tracker Template

Date: 2026-05-02  
Status: finalized draft for editorial workflow

## Purpose

This is the finalized stock content tracker model for the current Riddra editorial workflow.

It is designed for:
- daily stock-page review
- chart and snapshot visibility checks
- SEO field tracking
- editorial assignment and reviewer handoff

It is **not** a backend import tracker.

## Google Sheet Update Status

I did **not** update the live Google Sheet directly in this pass.

Reason:
- the current Google Drive connector in this session can edit a spreadsheet only if we already know its spreadsheet URL or ID
- the repo and docs reference the sheet title (`Project R`) but do not expose the file URL or spreadsheet ID

So this file includes a paste-ready table instead.

If you later provide the sheet URL or ID, this exact template can be written into the live sheet directly.

## Final Column Model

Use these columns in this exact order:

| Column | Purpose | Recommended values / notes |
|---|---|---|
| `Date` | Working date for the row | `YYYY-MM-DD` |
| `Stock Symbol` | Public trading symbol | Example: `RELIANCE` |
| `Company Name` | Public company name | Example: `Reliance Industries` |
| `Content Type` | What kind of editorial/content work this row represents | `Daily Stock QA`, `SEO Refresh`, `Snapshot Review`, `Freshness Check`, `Content Polish` |
| `Assigned Editor` | Editor owning the row | person name or email |
| `Data Availability Status` | High-level data health state | `Fresh`, `Accepted Exception`, `Needs Review`, `Blocked` |
| `Chart Checked` | Whether the chart was reviewed | `Yes` / `No` |
| `Snapshot Checked` | Whether the market snapshot was reviewed | `Yes` / `No` |
| `Fundamentals Available Yes/No` | Whether stored fundamentals are available on the page | `Yes` / `No` |
| `Article Status` | Content-progress state | `Not Started`, `Draft`, `Updated`, `Not Required` |
| `Review Status` | Workflow state | `Pending`, `In Progress`, `Complete`, `Needs Review`, `Blocked`, `Provider Exception` |
| `SEO Title` | Intended SEO title for the public page | keep concise and stock-specific |
| `Meta Description` | Intended meta description | truthful, no fake fundamentals |
| `Publish URL` | Public stock-page URL | full or relative URL |
| `Notes` | Short human note | review note, exception note, blocker, or reviewer comment |

## Recommended Dropdown Values

### Content Type

- `Daily Stock QA`
- `SEO Refresh`
- `Snapshot Review`
- `Freshness Check`
- `Content Polish`

### Data Availability Status

- `Fresh`
- `Accepted Exception`
- `Needs Review`
- `Blocked`

### Chart Checked

- `Yes`
- `No`

### Snapshot Checked

- `Yes`
- `No`

### Fundamentals Available Yes/No

- `Yes`
- `No`

### Article Status

- `Not Started`
- `Draft`
- `Updated`
- `Not Required`

### Review Status

- `Pending`
- `In Progress`
- `Complete`
- `Needs Review`
- `Blocked`
- `Provider Exception`

## Editorial Rules For This Tracker

1. Use `Fresh` only when the page looks healthy and the data-status signals are non-blocking.
2. Use `Accepted Exception` only for approved provider exception cases.
3. Use `Fundamentals Available = No` when the page correctly shows the approved unavailable state.
4. Do not mark a row blocked just because fundamentals are unavailable.
5. Use `Blocked` only for real page or data problems:
   - chart not loading
   - snapshot inconsistency
   - conflicting visible prices
   - broken page state

## Current Known Accepted Exception Symbols

These may appear as valid `Accepted Exception` rows if the page state is otherwise honest:

- `KIRANVYPAR.NS`
- `NEAGI.NS`

## 20 Example Rows Seeded From Real `stocks_master` Stocks

These example rows use real active stocks from `stocks_master`.

### Markdown table

| Date | Stock Symbol | Company Name | Content Type | Assigned Editor | Data Availability Status | Chart Checked | Snapshot Checked | Fundamentals Available Yes/No | Article Status | Review Status | SEO Title | Meta Description | Publish URL | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-05-02 | RELIANCE | Reliance Industries | Daily Stock QA | Editor A | Fresh | Yes | Yes | No | Updated | Complete | Reliance Industries Share Price, Chart and Snapshot \| Riddra | Track Reliance Industries share price, daily chart, latest market snapshot, historical price trend, and stored Riddra market data on Riddra. | https://www.riddra.com/stocks/reliance-industries | Clean large-cap benchmark page. |
| 2026-05-02 | TCS | TCS | Daily Stock QA | Editor A | Fresh | Yes | Yes | Yes | Updated | Complete | TCS Share Price, Chart and Snapshot \| Riddra | Track TCS share price, latest chart, market snapshot, historical data preview, and stock page updates on Riddra. | https://www.riddra.com/stocks/tcs | Core IT benchmark stock reviewed. |
| 2026-05-02 | INFY | Infosys | Daily Stock QA | Editor B | Fresh | Yes | Yes | Yes | Updated | Complete | Infosys Share Price, Chart and Snapshot \| Riddra | Track Infosys share price, latest market snapshot, historical chart ranges, and stored Riddra price history on Riddra. | https://www.riddra.com/stocks/infosys | Core IT page reviewed after close. |
| 2026-05-02 | HDFCBANK | HDFC Bank | Snapshot Review | Editor B | Fresh | Yes | Yes | Yes | Not Required | Complete | HDFC Bank Share Price, Chart and Snapshot \| Riddra | Track HDFC Bank share price, latest snapshot, chart history, and page data status on Riddra. | https://www.riddra.com/stocks/hdfc-bank | Snapshot and chart both healthy. |
| 2026-05-02 | ICICIBANK | ICICI Bank | Snapshot Review | Editor C | Fresh | Yes | Yes | Yes | Not Required | Complete | ICICI Bank Share Price, Chart and Snapshot \| Riddra | Track ICICI Bank share price, chart ranges, historical market data, and latest snapshot on Riddra. | https://www.riddra.com/stocks/icici-bank | Bank page parity check passed. |
| 2026-05-02 | 20MICRONS | 20 Microns Limited | Daily Stock QA | Editor C | Fresh | Yes | Yes | No | Draft | In Progress | 20 Microns Share Price, Chart and Snapshot \| Riddra | Track 20 Microns share price, historical chart, stored market snapshot, and recent trading data on Riddra. | https://www.riddra.com/stocks/20-microns-limited | Smaller-cap QA row with empty-state check. |
| 2026-05-02 | 360ONE | 360 One Wam Limited | SEO Refresh | Editor D | Fresh | No | No | No | Draft | Pending | 360 One Wam Share Price and Chart \| Riddra | Track 360 One Wam share price, chart history, daily market snapshot, and public stock page data on Riddra. | https://www.riddra.com/stocks/360-one-wam-limited | SEO copy refresh pending visual page check. |
| 2026-05-02 | 3MINDIA | 3M India Limited | Freshness Check | Editor D | Needs Review | Yes | Yes | No | Not Started | Needs Review | 3M India Share Price, Chart and Snapshot \| Riddra | Track 3M India share price, latest chart, market snapshot, and public stock page data on Riddra. | https://www.riddra.com/stocks/3m-india-limited | Historical coverage gap was previously noted; verify current page honestly. |
| 2026-05-02 | 5PAISA | 5paisa Capital Limited | Daily Stock QA | Editor E | Fresh | Yes | Yes | No | Draft | In Progress | 5paisa Capital Share Price and Chart \| Riddra | Track 5paisa Capital share price, chart ranges, latest snapshot, and stored market history on Riddra. | https://www.riddra.com/stocks/5paisa-capital-limited | Mid-cap review in progress. |
| 2026-05-02 | AARTIDRUGS | Aarti Drugs Limited | Content Polish | Editor E | Fresh | Yes | Yes | No | Draft | Pending | Aarti Drugs Share Price, Chart and Snapshot \| Riddra | Track Aarti Drugs share price, historical chart, latest market snapshot, and public stock page data on Riddra. | https://www.riddra.com/stocks/aarti-drugs-limited | Needs copy polish only. |
| 2026-05-02 | AARTIIND | Aarti Industries Limited | Daily Stock QA | Editor F | Fresh | Yes | Yes | No | Not Required | Complete | Aarti Industries Share Price and Chart \| Riddra | Track Aarti Industries share price, chart ranges, latest snapshot, and recent price history on Riddra. | https://www.riddra.com/stocks/aarti-industries-limited | Page clean for standard QA lane. |
| 2026-05-02 | ABBOTINDIA | Abbott India Limited | Freshness Check | Editor F | Needs Review | Yes | Yes | No | Not Started | Needs Review | Abbott India Share Price, Chart and Snapshot \| Riddra | Track Abbott India share price, historical chart, snapshot data, and public page updates on Riddra. | https://www.riddra.com/stocks/abbott-india-limited | Historical coverage was previously incomplete; reviewer should recheck. |
| 2026-05-02 | APOLLOHOSP | Apollo Hospitals Enterprise Limited | SEO Refresh | Editor G | Fresh | No | No | Yes | Draft | Pending | Apollo Hospitals Share Price, Chart and Snapshot \| Riddra | Track Apollo Hospitals share price, latest chart, market snapshot, and stock-page data on Riddra. | https://www.riddra.com/stocks/apollo-hospitals-enterprise-limited | SEO fields drafted, page verification pending. |
| 2026-05-02 | ASIANPAINT | Asian Paints | Daily Stock QA | Editor G | Fresh | Yes | Yes | Yes | Updated | Complete | Asian Paints Share Price, Chart and Snapshot \| Riddra | Track Asian Paints share price, chart ranges, latest market snapshot, and stored history on Riddra. | https://www.riddra.com/stocks/asian-paints | Blue-chip consumer page reviewed. |
| 2026-05-02 | AXISBANK | Axis Bank | Snapshot Review | Editor H | Fresh | Yes | Yes | Yes | Not Required | Complete | Axis Bank Share Price, Chart and Snapshot \| Riddra | Track Axis Bank share price, stored chart history, latest snapshot, and page status on Riddra. | https://www.riddra.com/stocks/axis-bank | Bank snapshot check passed. |
| 2026-05-02 | BAJFINANCE | Bajaj Finance | Daily Stock QA | Editor H | Fresh | Yes | Yes | Yes | Updated | Complete | Bajaj Finance Share Price, Chart and Snapshot \| Riddra | Track Bajaj Finance share price, historical chart, snapshot data, and public stock-page status on Riddra. | https://www.riddra.com/stocks/bajaj-finance | High-traffic finance name reviewed. |
| 2026-05-02 | HINDUNILVR | Hindustan Unilever | Content Polish | Editor I | Fresh | Yes | Yes | Yes | Draft | In Progress | Hindustan Unilever Share Price and Chart \| Riddra | Track Hindustan Unilever share price, latest snapshot, historical chart, and price data on Riddra. | https://www.riddra.com/stocks/hindustan-unilever | Content polish with data already clean. |
| 2026-05-02 | ITC | ITC | Daily Stock QA | Editor I | Fresh | Yes | Yes | Yes | Updated | Complete | ITC Share Price, Chart and Snapshot \| Riddra | Track ITC share price, public chart history, latest market snapshot, and stored stock data on Riddra. | https://www.riddra.com/stocks/itc | Stable consumer/tobacco page reviewed. |
| 2026-05-02 | LT | Larsen & Toubro | SEO Refresh | Editor J | Fresh | No | No | Yes | Draft | Pending | Larsen and Toubro Share Price, Chart and Snapshot \| Riddra | Track Larsen and Toubro share price, chart, snapshot, and public stock-page data on Riddra. | https://www.riddra.com/stocks/larsen-and-toubro | SEO refresh queued before QA pass. |
| 2026-05-02 | SBIN | State Bank of India | Daily Stock QA | Editor J | Fresh | Yes | Yes | Yes | Updated | Complete | SBI Share Price, Chart and Snapshot \| Riddra | Track SBI share price, latest market snapshot, historical chart ranges, and stock-page data on Riddra. | https://www.riddra.com/stocks/state-bank-of-india | Large-cap bank review complete. |

## Paste-Ready TSV

Copy this block directly into Google Sheets:

```tsv
Date	Stock Symbol	Company Name	Content Type	Assigned Editor	Data Availability Status	Chart Checked	Snapshot Checked	Fundamentals Available Yes/No	Article Status	Review Status	SEO Title	Meta Description	Publish URL	Notes
2026-05-02	RELIANCE	Reliance Industries	Daily Stock QA	Editor A	Fresh	Yes	Yes	No	Updated	Complete	Reliance Industries Share Price, Chart and Snapshot | Riddra	Track Reliance Industries share price, daily chart, latest market snapshot, historical price trend, and stored Riddra market data on Riddra.	https://www.riddra.com/stocks/reliance-industries	Clean large-cap benchmark page.
2026-05-02	TCS	TCS	Daily Stock QA	Editor A	Fresh	Yes	Yes	Yes	Updated	Complete	TCS Share Price, Chart and Snapshot | Riddra	Track TCS share price, latest chart, market snapshot, historical data preview, and stock page updates on Riddra.	https://www.riddra.com/stocks/tcs	Core IT benchmark stock reviewed.
2026-05-02	INFY	Infosys	Daily Stock QA	Editor B	Fresh	Yes	Yes	Yes	Updated	Complete	Infosys Share Price, Chart and Snapshot | Riddra	Track Infosys share price, latest market snapshot, historical chart ranges, and stored Riddra price history on Riddra.	https://www.riddra.com/stocks/infosys	Core IT page reviewed after close.
2026-05-02	HDFCBANK	HDFC Bank	Snapshot Review	Editor B	Fresh	Yes	Yes	Yes	Not Required	Complete	HDFC Bank Share Price, Chart and Snapshot | Riddra	Track HDFC Bank share price, latest snapshot, chart history, and page data status on Riddra.	https://www.riddra.com/stocks/hdfc-bank	Snapshot and chart both healthy.
2026-05-02	ICICIBANK	ICICI Bank	Snapshot Review	Editor C	Fresh	Yes	Yes	Yes	Not Required	Complete	ICICI Bank Share Price, Chart and Snapshot | Riddra	Track ICICI Bank share price, chart ranges, historical market data, and latest snapshot on Riddra.	https://www.riddra.com/stocks/icici-bank	Bank page parity check passed.
2026-05-02	20MICRONS	20 Microns Limited	Daily Stock QA	Editor C	Fresh	Yes	Yes	No	Draft	In Progress	20 Microns Share Price, Chart and Snapshot | Riddra	Track 20 Microns share price, historical chart, stored market snapshot, and recent trading data on Riddra.	https://www.riddra.com/stocks/20-microns-limited	Smaller-cap QA row with empty-state check.
2026-05-02	360ONE	360 One Wam Limited	SEO Refresh	Editor D	Fresh	No	No	No	Draft	Pending	360 One Wam Share Price and Chart | Riddra	Track 360 One Wam share price, chart history, daily market snapshot, and public stock page data on Riddra.	https://www.riddra.com/stocks/360-one-wam-limited	SEO copy refresh pending visual page check.
2026-05-02	3MINDIA	3M India Limited	Freshness Check	Editor D	Needs Review	Yes	Yes	No	Not Started	Needs Review	3M India Share Price, Chart and Snapshot | Riddra	Track 3M India share price, latest chart, market snapshot, and public stock page data on Riddra.	https://www.riddra.com/stocks/3m-india-limited	Historical coverage gap was previously noted; verify current page honestly.
2026-05-02	5PAISA	5paisa Capital Limited	Daily Stock QA	Editor E	Fresh	Yes	Yes	No	Draft	In Progress	5paisa Capital Share Price and Chart | Riddra	Track 5paisa Capital share price, chart ranges, latest snapshot, and stored market history on Riddra.	https://www.riddra.com/stocks/5paisa-capital-limited	Mid-cap review in progress.
2026-05-02	AARTIDRUGS	Aarti Drugs Limited	Content Polish	Editor E	Fresh	Yes	Yes	No	Draft	Pending	Aarti Drugs Share Price, Chart and Snapshot | Riddra	Track Aarti Drugs share price, historical chart, latest market snapshot, and public stock page data on Riddra.	https://www.riddra.com/stocks/aarti-drugs-limited	Needs copy polish only.
2026-05-02	AARTIIND	Aarti Industries Limited	Daily Stock QA	Editor F	Fresh	Yes	Yes	No	Not Required	Complete	Aarti Industries Share Price and Chart | Riddra	Track Aarti Industries share price, chart ranges, latest snapshot, and recent price history on Riddra.	https://www.riddra.com/stocks/aarti-industries-limited	Page clean for standard QA lane.
2026-05-02	ABBOTINDIA	Abbott India Limited	Freshness Check	Editor F	Needs Review	Yes	Yes	No	Not Started	Needs Review	Abbott India Share Price, Chart and Snapshot | Riddra	Track Abbott India share price, historical chart, snapshot data, and public page updates on Riddra.	https://www.riddra.com/stocks/abbott-india-limited	Historical coverage was previously incomplete; reviewer should recheck.
2026-05-02	APOLLOHOSP	Apollo Hospitals Enterprise Limited	SEO Refresh	Editor G	Fresh	No	No	Yes	Draft	Pending	Apollo Hospitals Share Price, Chart and Snapshot | Riddra	Track Apollo Hospitals share price, latest chart, market snapshot, and stock-page data on Riddra.	https://www.riddra.com/stocks/apollo-hospitals-enterprise-limited	SEO fields drafted, page verification pending.
2026-05-02	ASIANPAINT	Asian Paints	Daily Stock QA	Editor G	Fresh	Yes	Yes	Yes	Updated	Complete	Asian Paints Share Price, Chart and Snapshot | Riddra	Track Asian Paints share price, chart ranges, latest market snapshot, and stored history on Riddra.	https://www.riddra.com/stocks/asian-paints	Blue-chip consumer page reviewed.
2026-05-02	AXISBANK	Axis Bank	Snapshot Review	Editor H	Fresh	Yes	Yes	Yes	Not Required	Complete	Axis Bank Share Price, Chart and Snapshot | Riddra	Track Axis Bank share price, stored chart history, latest snapshot, and page status on Riddra.	https://www.riddra.com/stocks/axis-bank	Bank snapshot check passed.
2026-05-02	BAJFINANCE	Bajaj Finance	Daily Stock QA	Editor H	Fresh	Yes	Yes	Yes	Updated	Complete	Bajaj Finance Share Price, Chart and Snapshot | Riddra	Track Bajaj Finance share price, historical chart, snapshot data, and public stock-page status on Riddra.	https://www.riddra.com/stocks/bajaj-finance	High-traffic finance name reviewed.
2026-05-02	HINDUNILVR	Hindustan Unilever	Content Polish	Editor I	Fresh	Yes	Yes	Yes	Draft	In Progress	Hindustan Unilever Share Price and Chart | Riddra	Track Hindustan Unilever share price, latest snapshot, historical chart, and price data on Riddra.	https://www.riddra.com/stocks/hindustan-unilever	Content polish with data already clean.
2026-05-02	ITC	ITC	Daily Stock QA	Editor I	Fresh	Yes	Yes	Yes	Updated	Complete	ITC Share Price, Chart and Snapshot | Riddra	Track ITC share price, public chart history, latest market snapshot, and stored stock data on Riddra.	https://www.riddra.com/stocks/itc	Stable consumer/tobacco page reviewed.
2026-05-02	LT	Larsen & Toubro	SEO Refresh	Editor J	Fresh	No	No	Yes	Draft	Pending	Larsen and Toubro Share Price, Chart and Snapshot | Riddra	Track Larsen and Toubro share price, chart, snapshot, and public stock-page data on Riddra.	https://www.riddra.com/stocks/larsen-and-toubro	SEO refresh queued before QA pass.
2026-05-02	SBIN	State Bank of India	Daily Stock QA	Editor J	Fresh	Yes	Yes	Yes	Updated	Complete	SBI Share Price, Chart and Snapshot | Riddra	Track SBI share price, latest market snapshot, historical chart ranges, and stock-page data on Riddra.	https://www.riddra.com/stocks/state-bank-of-india	Large-cap bank review complete.
```

## Final Recommendation

Use this tracker model as the single editorial stock-review sheet for the current beta workflow.

If needed later, you can add optional columns such as:
- `Reviewer`
- `Completed At`
- `Escalation Owner`
- `Accepted Exception Type`

But the 15-column model above is the clean baseline for daily editorial operations.
