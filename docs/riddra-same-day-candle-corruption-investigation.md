# Riddra Same-Day Candle Corruption Investigation

Date: 2026-05-01  
Scope: Investigate repeated identical `2026-04-30` OHLCV candles across unrelated stocks in `stock_price_history` and the native stock chart API.

## Executive Summary

This is a real data-integrity issue in stored market data, not a chart-rendering bug.

The native chart API is correctly reading `stock_price_history`, but at least `40` unrelated stocks share the exact same stored `2026-04-30` candle:

- `open`: `1343.6`
- `high`: `1356.8`
- `low`: `1337.2`
- `close`: `1350.75`
- `adj_close`: `null`
- `volume`: `5320000`

Root-cause evidence strongly indicates that **dry-run Yahoo fixtures leaked into durable live writes**. Specifically:

- the exact candle matches the RELIANCE dry-run fixture
- affected symbols have `raw_yahoo_imports` rows marked `dryRun: true`
- those dry-run rows are linked to the correct stock/symbol/request URL, so this is **not** a stock resolver mismatch
- the same-day importer path allowed dry-run historical data to flow into `stock_price_history`

## 1. How many stocks share identical `2026-04-30` OHLCV values?

Confirmed:

- affected stocks with the exact repeated candle on `2026-04-30`: `40`
- affected `stock_price_history` rows: `40`
- affected stocks with dry-run `raw_yahoo_imports`: `40`
- dry-run `raw_yahoo_imports` rows across those affected stocks in the investigation window: `89`

### Affected symbols

- `20MICRONS`
- `21STCENMGM`
- `360ONE`
- `3IINFOLTD`
- `3PLAND`
- `5PAISA`
- `63MOONS`
- `AAATECH`
- `AAREYDRUGS`
- `AARON`
- `AARTIDRUGS`
- `AARTIIND`
- `AARTISURF`
- `AARVI`
- `AAVAS`
- `ABB`
- `ABCAPITAL`
- `AXISBANK`
- `BHARTIARTL`
- `HDFCBANK`
- `ICICIBANK`
- `INFY`
- `ITC`
- `JOCIL`
- `KOTAKBANK`
- `KRBL`
- `LOVABLE`
- `LT`
- `MODISONLTD`
- `NYKAA`
- `OMAXE`
- `PIRAMALFIN`
- `RAYMONDREL`
- `RELIANCE`
- `SALSTEEL`
- `SBIN`
- `SDBL`
- `TCS`
- `ULTRACEMCO`
- `WIPRO`

## 2. Does the issue exist only for `2026-04-30` or other dates too?

I checked `2026-04-20` through `2026-04-30` for repeated identical OHLCV signatures in the affected investigation slice.

Result:

- `2026-04-20` -> max shared signature count: `1`
- `2026-04-21` -> `1`
- `2026-04-22` -> `1`
- `2026-04-23` -> `1`
- `2026-04-24` -> `1`
- `2026-04-27` -> `1`
- `2026-04-28` -> `1`
- `2026-04-29` -> `1`
- `2026-04-30` -> `17` in the scanned window, with the repeated signature above

Conclusion:

- in the checked nearby-date window, the corruption is concentrated on `2026-04-30`
- there is no comparable multi-stock identical-candle pattern on the immediately preceding trading dates
- this points to a **same-day-only / dry-run path problem**, not a broad historical normalization bug

## 3. Root-cause analysis

### A. Dry-run fixtures accidentally used in live mode?

This is the strongest supported explanation.

The RELIANCE dry-run fixture in [lib/yahoo-finance-dry-run-fixtures.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-dry-run-fixtures.ts) contains the exact final candle:

- `open: 1343.6`
- `high: 1356.8`
- `low: 1337.2`
- `close: 1350.75`
- `adjClose: null`
- `volume: 5320000`

That exact candle appears in stored `stock_price_history` for many unrelated stocks.

### B. Same-day-only import using wrong payload?

Partially yes, but more precisely:

- the same-day-only import path itself is not selecting the wrong symbol after fetch
- instead, it appears to be receiving a **dry-run fixture-backed raw payload** and then persisting it into live history

The strict same-day importer in [lib/yahoo-finance-import.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-import.ts):

- resolves the stock correctly
- fetches historical chart data
- selects the target/effective row correctly
- then persists that row into `stock_price_history`

The dangerous part is that `dryRun` still flows through a durable path:

- `executeYahooJsonRequest(...)` in [lib/yahoo-finance-service.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/yahoo-finance-service.ts) persists `raw_yahoo_imports` even for `dryRunFixture`
- the same-day importer then treats that raw import as a normal input for normalization/persistence

### C. Stock resolver mismatch?

No evidence of that.

The affected raw rows are linked to the correct stock identity:

- correct `stock_id`
- correct `request_url`
- correct `source_symbol` / Yahoo symbol for each stock

Examples observed:

- `TCS.NS`
- `INFY.NS`
- `AXISBANK.NS`
- `20MICRONS.NS`

These symbols had their own matching request URLs, but the payload content reflected the RELIANCE fixture.

So this is **not** “RELIANCE history was inserted under the wrong stock ID by resolver confusion.”

### D. `stock_id` / `yahoo_symbol` mapping error?

No evidence of that.

The mapping layer appears correct. The corrupted content is entering earlier, at the raw payload stage used by dry-run fixture handling.

### E. Stale cached Yahoo response reused across symbols?

No convincing evidence of that as the primary cause.

If this were a stale network cache issue, we would expect:

- shared request hashes without explicit dry-run markers, or
- one live Yahoo response accidentally replayed across symbols

Instead, many affected raw rows explicitly contain:

- `dryRun: true`
- `fixtureName: "reliance"`

That makes fixture leakage the more direct explanation.

### F. `raw_yahoo_imports` linked to the wrong stock?

No.

The raw imports are linked to the right stocks, but the **payload content** is wrong for those stocks.

## 4. Raw Yahoo import comparison for affected stocks

Affected symbols have `raw_yahoo_imports` rows with `request_context` like:

```json
{
  "attempt": 1,
  "dryRun": true,
  "fixtureName": "reliance"
}
```

Observed examples included:

- `TCS.NS`
- `INFY.NS`
- `AXISBANK.NS`
- `20MICRONS.NS`
- `RELIANCE.NS`

For those rows, the raw chart payload’s last bar matched the corrupted candle exactly.

Important nuance:

- some of those same stocks also have separate non-dry-run raw imports with realistic candles
- so the system contains a mix of:
  - valid live raw imports
  - fixture-backed dry-run raw imports

This strongly suggests that the corruption was introduced by specific dry-run validation activity, not by the normal live Yahoo chart endpoint always returning bad data.

## 5. Comparison: `stock_price_history` vs raw payloads

The frontend chart API was already verified to match `stock_price_history` exactly.

The corruption exists in the stored DB row itself.

For affected stocks:

- the `stock_price_history` `2026-04-30` row matches the repeated candle
- the corresponding dry-run `raw_yahoo_imports.raw_payload` also contains that same candle

That means the bad row was not introduced by frontend rendering or by later chart transformation. It was already present in the persisted raw import and then normalized into `stock_price_history`.

## 6. Likely triggering path

The strongest candidate is the old dry-run verification workflow, especially around:

- [scripts/run-yahoo-daily-update-dry-run-check.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/run-yahoo-daily-update-dry-run-check.mjs)
- [scripts/collect-yahoo-daily-update-dry-run-metrics.mjs](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/scripts/collect-yahoo-daily-update-dry-run-metrics.mjs)

Why this matters:

- those scripts intentionally run dry-run jobs against real durable tables
- they verify row creation in:
  - `stock_price_history`
  - `stock_market_snapshot`
  - `raw_yahoo_imports`
  - `stock_import_activity_log`
  - `stock_import_reconciliation`

So “dry run” in this earlier validation path was not actually “no durable writes.” It was closer to “use fixture-backed fetches but still exercise the write path.”

That appears to be the mechanism that allowed RELIANCE fixture data to land in live historical rows for other symbols.

## 7. What is **not** the cause

Based on current evidence, the following are unlikely:

- native chart API bug
- frontend tooltip bug
- canonical stock resolver bug
- stock slug mismatch
- wrong stock ID attached during persistence
- broad historical dedupe failure
- Yahoo returning the same real live bar for multiple unrelated equities

## 8. Severity

Severity: **High**

Reason:

- stored price history is corrupted for real public stock pages
- multiple large-cap symbols are affected
- native charts render this corrupted last-day candle faithfully
- freshness and same-day update confidence are impacted

## 9. Safe repair plan

Do **not** delete or overwrite anything blindly.

Recommended repair steps:

1. Isolate affected rows precisely.
   - Use exact signature + `trade_date = '2026-04-30'`
   - also verify `raw_import_id` or `source_recorded_at` against dry-run-linked raw imports

2. Build a repair candidate table first.
   - include:
     - `stock_id`
     - `symbol`
     - `yahoo_symbol`
     - corrupted `stock_price_history.id`
     - `raw_import_id`
     - dry-run `raw_yahoo_imports.id`
     - nearest valid non-dry-run raw import for the same symbol

3. Verify one-symbol repair mapping manually for a sample set.
   - `RELIANCE`
   - `TCS`
   - `INFY`
   - `AXISBANK`
   - `20MICRONS`

4. After approval, remove only the corrupted `2026-04-30` rows for the affected symbols.
   - do not touch earlier history
   - do not touch unaffected symbols

5. Rebuild only those affected same-day rows from valid non-dry-run chart payloads or a controlled same-day reimport.

6. Mark dry-run fixture imports as non-normalizable going forward.
   - dry-run should never create durable market-history rows in production data tables

7. Add hard guards in code.
   - if `dryRun === true`, block writes to:
     - `stock_price_history`
     - `stock_market_snapshot`
     - `raw_yahoo_imports` in the live provider bucket, unless intentionally stored in a separate test-only area
   - reject any normalization path whose `request_context.dryRun === true`

## 10. Recommended code hardening

Follow-up fixes should include:

1. Make dry-run truly non-destructive.
   - no writes to live price/snapshot tables

2. If dry-run raw rows must exist, segregate them.
   - separate table, separate source bucket, or a hard `is_test_data` flag with normalization blocked

3. Add validation before historical persistence.
   - if `raw_import.request_context.dryRun === true`, abort persistence into `stock_price_history`

4. Add an integrity audit for repeated same-day candles across unrelated stocks.
   - especially for high-cap symbols

5. Add a repair script that works from verified candidate rows only.

## Final Conclusion

This issue is most likely caused by **dry-run RELIANCE fixture data being durably persisted and then normalized into live `stock_price_history` for unrelated stocks**.

Current confidence:

- dry-run fixture leak: **high**
- same-day-only live-mode symbol mix-up: **low**
- stock resolver mismatch: **low**
- raw-import-to-stock mapping bug: **low**

No data was deleted or repaired during this investigation.
