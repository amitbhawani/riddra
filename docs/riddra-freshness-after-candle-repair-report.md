# Riddra Freshness After Candle Repair Report

Date: 2026-05-01

## Command Run

```bash
npm run stocks:generate-freshness
```

## 1. Expected Trading Date

- expected trading date: `2026-04-30`
- evaluation date: `2026-05-01`
- market session state: `closed`

## 2. Active Stocks

- active stocks: `2157`

## 3. Fresh Count

- fresh count: `2155`

## 4. Stale Count

- stale count: `2`

## 5. Reason-Category Counts

- `holiday_or_weekend`: `2155`
- `stale_missing_price`: `2`

Durable `stock_data_freshness` verification matched the generator output:

```json
{
  "rowCount": 2157,
  "expectedTradingDate": "2026-04-30",
  "evaluationDate": "2026-05-01",
  "marketSessionState": "closed",
  "reasonCounts": {
    "holiday_or_weekend": 2155,
    "stale_missing_price": 2
  }
}
```

## 6. Symbols Still Stale

### KIRANVYPAR

- symbol: `KIRANVYPAR`
- Yahoo symbol: `KIRANVYPAR.NS`
- company: `Kiran Vyapar Limited`
- route: `/stocks/kiran-vyapar-limited`
- reason: `stale_missing_price`
- last price date: `2026-04-29`
- last snapshot date: `2026-04-29`

### NEAGI

- symbol: `NEAGI`
- Yahoo symbol: `NEAGI.NS`
- company: `Neelamalai Agro Industries Limited`
- route: `/stocks/neelamalai-agro-industries-limited`
- reason: `stale_missing_price`
- last price date: `2026-04-28`
- last snapshot date: `2026-04-28`

## 7. Whether Stale Count Is Acceptable

Operationally, `2 / 2157` stale stocks is a very small remainder, but it is **not fully acceptable** if the production standard is “no true stale symbols for the expected trading date.”

Current read:

- acceptable as a near-complete post-repair state
- not acceptable as a strict “all symbols fresh” signoff

## 8. Cron GO/NO-GO Recommendation

- recommendation: `NO-GO`

Reason:

- the 40-symbol corruption repair succeeded
- the durable freshness policy is working
- but `2` symbols still remain genuinely stale as `stale_missing_price`
- until `KIRANVYPAR` and `NEAGI` are triaged as either:
  - acceptable provider/symbol exceptions, or
  - successfully refreshed,
  unattended cron should stay blocked under a strict freshness standard

## Summary

The candle-repair work materially improved the system and did not break the freshness policy. The platform is now very close to daily-fresh readiness, but there are still `2` unresolved stale symbols preventing a strict cron `GO`.
