# Riddra Stock Universe Build Report

Last updated: 2026-04-29 IST

## Summary

Built a clean NSE stock universe into `stocks_master` from the official NSE equity list CSV and validated each candidate against Yahoo Finance availability before storing it.

- Source URL: `https://archives.nseindia.com/content/equities/EQUITY_L.csv`
- Exchange stored: `NSE`
- Yahoo suffix used: `.NS`
- Validation mode: Yahoo `spark` endpoint batches, no raw Yahoo import tables touched
- Request pace: `1 req/sec`

## Result Counts

| Metric | Count |
|---|---:|
| NSE CSV rows | 2360 |
| EQ-series rows | 2157 |
| Deduplicated EQ symbols | 2157 |
| Yahoo-validated symbols | 2157 |
| Yahoo-unavailable symbols | 0 |
| Upserted `stocks_master` rows | 2157 |
| New universe rows | 2135 |
| Updated existing rows | 22 |
| Final `stocks_master` rows | 2157 |
| Final distinct Yahoo symbols | 2157 |

## Post-Write Verification

Durable verification against `stocks_master` after the build:

- active `NSE` rows in `stocks_master`: `2157`
- duplicate `symbol` rows: `0`
- duplicate `yahoo_symbol` rows: `0`
- sample stored row shape confirmed:
  - `symbol`
  - `yahoo_symbol`
  - `company_name`
  - `exchange = NSE`
  - `status = active`

## Validation Strategy

- filtered the official NSE equity list to `SERIES = EQ`
- deduplicated by `SYMBOL`
- normalized every candidate as `<SYMBOL>.NS`
- validated availability through Yahoo’s multi-symbol `spark` endpoint
- stayed within safe pacing instead of running the full Yahoo data importer

Validation diagnostics:

- top-level request batches: 61
- actual validation requests after recursive fallback: 169
- failed batch requests retried by recursive split: 54
- batch size: 40
- request pace: 1 req/sec
- batch-safe symbols: 2150
- isolated special-case symbols: 7

## Stored Fields

Rows written to `stocks_master` include:

- `symbol`
- `yahoo_symbol`
- `company_name`
- `exchange = NSE`
- `status = active`

Also preserved where possible:

- existing Riddra `slug`
- existing `instrument_id`
- listing metadata in `metadata.universe_build`

## Slug Handling

| Strategy | Count |
|---|---:|
| Reused existing `stocks_master` slug | 22 |
| Reused existing `instruments` slug | 0 |
| Generated new slug | 2135 |

## Sample Validated Symbols

| Symbol | Yahoo Symbol | Company |
|---|---|---|
| 20MICRONS | 20MICRONS.NS | 20 Microns Limited |
| 21STCENMGM | 21STCENMGM.NS | Twentyfirst Century Management Services Limited |
| 360ONE | 360ONE.NS | 360 One Wam Limited |
| 3BBLACKBIO | 3BBLACKBIO.NS | 3B Blackbio Dx Limited |
| 3IINFOLTD | 3IINFOLTD.NS | 3i Infotech Limited |
| 3MINDIA | 3MINDIA.NS | 3M India Limited |
| 3PLAND | 3PLAND.NS | 3P Land Holdings Ltd |
| 5PAISA | 5PAISA.NS | 5paisa Capital Limited |
| 63MOONS | 63MOONS.NS | 63 moons technologies limited |
| AAATECH | AAATECH.NS | AAA Technologies Limited |

## Sample Yahoo-Unavailable Symbols

| Symbol | Yahoo Symbol | Company |
|---|---|---|
| None in sampled failures |  |  |

## Notes

- No Yahoo market-data import was run in this step.
- No `raw_yahoo_imports` rows were created by this universe build.
- The build only prepared a clean, validated stock universe for future import batches.
