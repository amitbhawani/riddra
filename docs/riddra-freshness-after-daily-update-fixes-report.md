# Riddra Freshness After Daily Update Fixes Report

Date: April 30, 2026  
Command run: `npm run stocks:generate-freshness`

## Result

The freshness view was regenerated successfully after the daily-update duplicate-key and activity/reconciliation fixes.

Generator output:

- `todayIsoDate`: `2026-04-30`
- `totalStocks`: `2157`
- `staleCount`: `2094`
- `freshCount`: `63`

## Current Freshness Counts

From the regenerated durable freshness rows:

- stale stock count: `2094`
- missing today price: `2094`
- missing today snapshot: `2094`

Important note:

- in the current freshness logic, a stock is stale whenever it does **not** have both today’s price row and today’s snapshot row
- after this regeneration, every stale stock was missing both of those for `2026-04-30`

## Comparison With Previous

Previous reference values:

- stale stocks: `993`
- missing today price: `992`
- missing today snapshot: `993`

Current values:

- stale stocks: `2094`
- missing today price: `2094`
- missing today snapshot: `2094`

Net change:

- stale stocks: `+1101`
- missing today price: `+1102`
- missing today snapshot: `+1101`

## What This Means

The freshness guard is now correctly reflecting the full daily-update reality, not just the earlier pilot subset.

What changed underneath:

- the 50-stock live daily pilot after the fixes was clean
- but only a small subset of the full `2157`-stock universe has actually been updated for `2026-04-30`
- after regeneration, the durable freshness table now shows that only `63` stocks are fully fresh today

So the higher stale count is not a regression caused by the duplicate-key or logging fixes. It is a more complete and more honest full-universe freshness result.

## Remaining Stale Stock Diagnosis

### 1. Primary reason: missing daily update coverage

This is the dominant reason.

Evidence:

- stale stocks with last price date `2026-04-29`: `2082`
- stale stocks with last snapshot date `2026-04-29`: `2092`
- only small tails were older:
  - last price date `2026-04-28`: `12`
  - last snapshot date `2026-04-28`: `2`

Interpretation:

- almost all stale stocks were successfully updated through April 29, 2026
- they simply did not receive the April 30, 2026 daily update yet
- this is a missing-update coverage issue, not widespread broken history

### 2. Secondary reason: recent provider/import errors on part of the stale set

Evidence from recent durable import errors on stale stocks:

- stale stocks checked: `2094`
- stale stocks with recent errors in the last 48 hours: `448`
- recent error rows on stale stocks: `3590`
- error rows containing `crumb`: `1792`
- timeout-style error rows: `0`

Interpretation:

- a meaningful minority of stale stocks are also carrying recent provider-side error evidence
- the dominant visible error pattern is still Yahoo crumb/protected-endpoint noise
- that said, those errors do **not** explain the full stale universe
- the larger issue remains that most stocks have not yet had the safe daily chart update run for April 30

### 3. Market holiday?

Current conclusion: **not the main reason**.

Reason:

- `63` stocks do have both today’s price and today’s snapshot for `2026-04-30`
- so the system is not seeing a universal non-trading-day condition
- if this were a market holiday explanation, today coverage would be uniformly absent rather than partially present

### 4. Symbol issue?

Current conclusion: **present for some names, not the main driver**.

Reason:

- some stale symbols do show recent Yahoo/provider errors
- but most stale stocks simply show last-good data on `2026-04-29` with no unique symbol-specific failure evidence
- that points more strongly to missing daily-update rollout breadth than to symbol validity problems

## Final Classification

Remaining stale stocks are mainly due to:

1. missing update:
   - **primary cause**
   - most stale stocks were last updated on `2026-04-29`

2. symbol/provider issue:
   - **secondary cause**
   - visible on part of the stale set through recent crumb-style errors

3. market holiday:
   - **unlikely as the primary explanation**
   - because `63` stocks already have valid `2026-04-30` price and snapshot coverage

## Operational Conclusion

The duplicate-key write bug and the activity/reconciliation logging mismatch are fixed, but full-universe daily freshness is still far from ready:

- fresh today: `63`
- stale today: `2094`

That means:

- the daily update path is healthier
- the full daily-update rollout is still incomplete
- cron should remain disabled until the safe chart-only daily update is expanded well beyond the current subset

Cron was **not** enabled in this step.
