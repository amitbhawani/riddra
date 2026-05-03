# Riddra Yahoo Import Integrity Audit

Date: 2026-04-30  
Scope: completed Yahoo-driven stock universe import state, without running any new imports or modifying data

## Summary

The completed Yahoo import is structurally healthy for price data:
- the active `stocks_master` universe is fully covered for both historical prices and latest snapshots
- there are **no detected duplicate** `stock_price_history` rows by `stock_id + trade_date`
- there are **no detected duplicate** `stock_market_snapshot` rows for the same `stock_id + trade_date`
- there are **no missing historical** or **missing snapshot** stocks in the current active `2157`-stock universe

The main integrity limitation is still fundamentals quality and Yahoo endpoint reliability, not price-data durability:
- import errors are concentrated in protected or blocked Yahoo modules
- reconciliation includes a large `no_data` bucket for blocked fundamentals
- warnings are common, but they do not currently indicate duplicate or destructive-write issues

## 1. Active `stocks_master` Count

- Active `stocks_master` rows: `2157`

## 2. `stock_price_history` Coverage by Stock

- Total `stock_price_history` rows: `526555`
- Stocks with at least one historical price row: `2157 / 2157`
- Historical coverage missing stocks: `0`
- Average historical rows per covered stock: `244.11`

Interpretation:
- historical coverage is complete at the stock level
- row depth varies a lot by listing age and Yahoo availability

## 3. `stock_market_snapshot` Coverage by Stock

- Total `stock_market_snapshot` rows: `2158`
- Stocks with at least one latest snapshot row: `2157 / 2157`
- Snapshot coverage missing stocks: `0`
- Average snapshot rows per covered stock: `1.00`

Interpretation:
- all active stocks have snapshot coverage
- one extra snapshot row exists beyond the `2157` stock count, which means one stock has more than one snapshot row across different dates
- that is not a duplicate issue by the requested duplicate key check

## 4. Duplicate `stock_price_history` Rows by `stock_id + trade_date`

- Duplicate price-row keys found: `0`

Result:
- no duplicate `stock_price_history` rows were detected for the dedupe key `stock_id + trade_date`

## 5. Duplicate `stock_market_snapshot` Rows Per Stock for Same Latest Date

- Duplicate snapshot keys found by `stock_id + trade_date`: `0`

Result:
- no duplicate `stock_market_snapshot` rows were detected for the same stock and trade date

## 6. Stocks With Unusually Low Historical Row Count

Threshold summary:
- Stocks with fewer than `30` historical rows: `120`
- Stocks with fewer than `60` historical rows: `138`
- Stocks with fewer than `120` historical rows: `260`
- Stocks with fewer than `252` historical rows: `1161`

Lowest-row examples:

| Slug | Symbol | Row Count |
|---|---:|---:|
| `neelamalai-agro-industries-limited` | `NEAGI` | `3` |
| `sonal-mercantile-limited` | `SONAL` | `3` |
| `ambalal-sarabhai-enterprises-limited` | `AMBALALSA` | `6` |
| `b-and-a-limited` | `BNALTD` | `6` |
| `sayaji-hotels-limited` | `SAYAJIHOTL` | `6` |
| `technvision-ventures-limited` | `TECHNVISN` | `6` |
| `thakkers-developers-limited` | `THAKDEV` | `6` |
| `3b-blackbio-dx-limited` | `3BBLACKBIO` | `7` |
| `abans-enterprises-limited` | `ABANSENT` | `7` |
| `a-k-capital-services-limited` | `AKCAPIT` | `7` |

Interpretation:
- these are not necessarily bad rows
- they are likely recent listings, thin-history equities, or Yahoo-limited histories
- they should be treated as audit outliers for manual review, not automatic failures

## 7. Stocks With Null-Heavy Snapshot Rows

Audit rule used:
- treat a snapshot as null-heavy if `4` or more key fields are null across:
  - `price`
  - `previous_close`
  - `open`
  - `day_high`
  - `day_low`
  - `change_absolute`
  - `change_percent`
  - `volume`
  - `market_cap`

Result:
- Null-heavy snapshot rows found: `0`

Interpretation:
- latest snapshot coverage is not just present, it is also structurally filled well enough for this audit rule

## 8. Stocks With Import Errors

- Stocks with at least one import error row: `505`
- Total `stock_import_errors` rows: `4090`

Most affected stock:
- `reliance-industries` / `RELIANCE`: `68` error rows

Most common error buckets:
- `quote_latest`: `2028`
- `valuation_statistics`: `2012`
- `financial_statements`: `42`
- `quote_statistics`: `8`

Interpretation:
- errors are dominated by Yahoo protected or blocked fundamentals paths
- they are not coming from historical price ingestion

## 9. Stocks With Warnings Only

Strict audit rule used:
- `warning_count > 0`
- `coverage error_count = 0`
- no `stock_import_errors` row for that stock

Result:
- Warning-only stocks: `1652`

Examples:
- `dcm-shriram-fine-chem-ltd` / `DSFCL`
- `dynacons-systems-and-solutions-limited` / `DSSL`
- `grasim-industries-limited` / `GRASIM`
- `gmr-airports-limited` / `GMRAIRPORT`
- `g-n-a-axles-limited` / `GNA`

Interpretation:
- warnings are widespread but mostly low-intensity
- many warning-only stocks have just `1` or `2` warnings
- this looks more like non-fatal data-shape or coverage noise than corruption

## 10. Activity / Reconciliation Pass-Fail Summary

### Activity log

- Total `stock_import_activity_log` rows: `35665`

Activity statuses:
- `running`: `9190`
- `completed`: `10859`
- `warning`: `15614`
- `failed`: `2`

### Reconciliation

- Total `stock_import_reconciliation` rows: `5929`

Reconciliation statuses:
- `completed`: `2035`
- `completed_with_warnings`: `2331`
- `no_data`: `1563`
- explicit `failed`: `0`

Interpretation:
- reconciliation is mostly succeeding or degrading safely
- `no_data` is the expected blocked-fundamentals footprint, not a duplicate-write symptom

## Integrity Conclusions

### Healthy

- `stocks_master` active universe is complete at `2157`
- historical coverage exists for all active stocks
- latest snapshot coverage exists for all active stocks
- duplicate price history rows by `stock_id + trade_date`: `0`
- duplicate same-date snapshots by stock: `0`
- null-heavy snapshots: `0`

### Needs Ongoing Review

- `505` stocks have import errors, mostly in protected Yahoo modules
- `120` stocks have fewer than `30` historical rows
- fundamentals-related reconciliation is heavily degraded or `no_data`
- warning volume is high, though most warnings appear non-fatal

### Practical Reading

This dataset is strong enough for:
- public stock price pages
- historical charting
- latest snapshot views
- canonical route migration

This dataset is **not yet strong enough** to claim broad Yahoo fundamentals completeness for:
- valuation metrics
- share statistics
- financial highlights
- financial statements

## Final Audit Verdict

The completed `2157`-stock Yahoo import is **integrity-safe for price data** and shows **no duplicate-write corruption** in the two most important normalized price tables.

The remaining weakness is **fundamentals availability and warning/error noise**, not broken historical or snapshot durability.
