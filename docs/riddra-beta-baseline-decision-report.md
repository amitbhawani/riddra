# Riddra Beta Baseline Decision Report

Date: 2026-05-02  
Timezone: Asia/Kolkata

## Decision Summary

Recommended beta baseline:
- **Freeze the current manual / operator-led beta baseline first**

Do **not** make hosted-beta parity the signoff baseline today.

Why:
- the local and operator-led market-data lane is already proven
- daily Yahoo chart/history + snapshot sync is already a real `GO`
- public stock-page data accuracy is already proven on the current code path
- hosted beta still has clear dependency gaps:
  - Trigger.dev env wiring is incomplete
  - Meilisearch env wiring is incomplete
  - hosted search is still weak
  - authenticated hosted account/watchlist continuity is still not fully proven

This means the safer signoff posture is:
- treat the current operator-led baseline as the real beta baseline
- run hosted parity as the next controlled rollout track

## Current Ground Truth

### Proven now

- Yahoo `daily_same_day_only` lane is `GO`
- active stocks covered by fresh + accepted exceptions: `2157 / 2157`
- active quarantine rows: `0`
- resolved quarantine rows: `80`
- suspicious shared candle corruption: cleared
- native chart and stock-page data audits passed locally
- queue-based cron design is implemented
- production cron routes no longer time out

### Not fully proven yet

- hosted Trigger.dev-backed durable execution
- hosted Meilisearch-backed search quality
- hosted authenticated account continuity
- hosted watchlist persistence
- hosted admin/operator proof with active cron progress visible

## Option 1: Freeze Current Manual / Operator-Led Beta Baseline

### What this means

- use the current proven platform posture as the beta baseline
- keep launch tightly invite-only and operator-led
- treat hosted parity as a follow-up workstream, not today’s signoff gate

### Benefits

- fastest safe path to a real beta baseline
- uses the strongest evidence already collected
- avoids blocking beta on still-missing hosted infra wiring
- keeps scope narrow around the proven market-data lane
- reduces the chance of mixing rollout pressure with unfinished platform-hardening work

### Risks

- hosted environment remains behind the local/proven posture for a short period
- some hosted smoke proof items stay open
- the team must stay disciplined and not overstate “hosted-ready” status

### Time needed

- **same day / immediate**

### What can break

- operator discipline can drift if the team starts treating hosted as fully signed off before it really is
- manual processes can become messy if owners are unclear
- if cron is triggered hosted-side before Trigger is fully aligned, progress proof may still be incomplete

### What must be verified

1. manual/operator ownership is explicit
2. cron lane scope stays narrow:
   - chart/history only
   - snapshot fallback only
   - no fundamentals
3. Control Center remains healthy
4. freshness stays at `2157 / 2157` including accepted exceptions
5. no new duplicate/write-timeout regressions appear
6. accepted exceptions remain documented:
   - `KIRANVYPAR.NS`
   - `NEAGI.NS`

## Option 2: Mirror All Proofs To Hosted Beta Immediately

### What this means

- make hosted parity itself part of the signoff baseline right now
- require hosted proof for cron, search, auth continuity, account, and watchlist before treating beta as ready

### Benefits

- strongest external-facing confidence once complete
- reduces the gap between “local/proven” and “hosted/live”
- creates a cleaner story for public or semi-public beta access
- forces infra and runtime issues to be closed now instead of later

### Risks

- higher chance of delay today
- higher chance of chasing infra wiring and deployment issues instead of operating the beta
- hosted instability could block a beta that is otherwise already operationally ready
- can create pressure to rush risky migrations or env changes

### Time needed

- **1 to 3 focused work sessions**, depending on access and rollout coordination

### What can break

- Trigger-backed cron execution if `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_REF` are still not aligned
- search quality if Meilisearch stays unconfigured or the index is not rebuilt
- account/watchlist flows if hosted auth continuity is not fully clean
- operator confidence if hosted stock or search parity is still visibly behind

### What must be verified

1. add Production envs:
   - `TRIGGER_SECRET_KEY`
   - `TRIGGER_PROJECT_REF`
   - `MEILISEARCH_HOST`
   - `MEILISEARCH_API_KEY`
   - `MEILISEARCH_INDEX_PREFIX`
2. redeploy hosted Production
3. trigger one authenticated hosted cron start
4. confirm durable parent job create/reuse
5. confirm worker queueing
6. confirm Control Center shows active cron progress
7. rebuild hosted search index
8. confirm live search suggestions work for:
   - `reliance`
   - `tcs`
   - `infosys`
   - `hdfc`
9. run a real hosted signed-in proof:
   - login
   - account page
   - watchlist add
   - refresh
   - watchlist persists
10. re-run hosted smoke on:
   - `/`
   - `/stocks`
   - `/stocks/reliance-industries`
   - `/search`
   - `/admin/market-data/import-control-center`

## Comparison

| Decision path | Benefits | Risks | Time needed | What can break | Verification burden |
|---|---|---|---|---|---|
| Freeze current manual/operator-led beta baseline | fastest safe signoff, strongest current evidence, keeps scope controlled | hosted parity still open, requires rollout discipline | immediate | process drift, hosted assumptions, incomplete hosted proof | moderate |
| Mirror all proofs to hosted beta immediately | strongest end-state confidence, reduces local-vs-hosted gap | slower, more moving parts, infra/env dependency risk | 1-3 sessions | Trigger, Meilisearch, auth continuity, watchlist persistence | high |

## Recommended Baseline

### Recommendation

- **Freeze the current manual / operator-led beta baseline**

### Exact recommendation phrasing

Use the already-proven operator-led beta posture as the signoff baseline **today**, and treat hosted parity proof as the next controlled rollout milestone rather than a same-day blocker.

### Why this is the right call

Because the core platform truth is already good enough for a narrow beta:
- data lane is proven
- charts are proven
- freshness is proven
- quarantine is clear
- cron design is implemented

But hosted parity is not yet clean enough to be the baseline:
- Trigger env wiring is incomplete
- Meilisearch env wiring is incomplete
- hosted search is still not acceptable
- authenticated hosted proof is still incomplete

That makes “hosted parity now” a rollout objective, not the beta baseline itself.

## Exact Signoff Checklist

### Beta baseline signoff checklist

1. Confirm Yahoo daily chart/history + snapshot lane remains the only approved sync lane.
2. Confirm `2157 / 2157` fresh + accepted exceptions.
3. Confirm accepted exceptions are:
   - `KIRANVYPAR.NS`
   - `NEAGI.NS`
4. Confirm active quarantine rows remain `0`.
5. Confirm no suspicious identical latest candles remain.
6. Confirm duplicate-key errors are not active.
7. Confirm write-timeout errors are not active.
8. Confirm recent import errors remain `0` or clearly non-blocking.
9. Confirm Control Center loads and remains operator-usable.
10. Confirm public stock pages show stored imported data correctly for the audited names.
11. Confirm beta ownership:
    - operator owner
    - hosted parity owner
    - search owner
    - monitoring owner
12. Confirm the team is explicitly **not** claiming hosted full-parity signoff yet.

### Hosted parity follow-up checklist

1. Add Production Trigger envs.
2. Add Production Meilisearch envs.
3. Redeploy.
4. Run authenticated hosted cron proof.
5. Verify cron progress visibility.
6. Rebuild and verify hosted search.
7. Run authenticated hosted account/watchlist smoke.
8. Re-run hosted beta smoke proof.

## What Remains Outside Beta Scope

These items should stay outside the current beta baseline:

- full Yahoo fundamentals rollout
  - valuation at scale
  - financial statements at scale
  - holders
  - analyst data
- broad public launch
- marketing/announcement readiness
- billing / Razorpay activation
- Resend automation rollout
- risky security migration apply windows done in a hurry
- “hosted parity is complete” messaging before Trigger + Meilisearch + signed-in proof are actually done

## Final Call

- **Beta baseline signoff: GO**
- Baseline type:
  - **manual / operator-led invite-only beta**
- Hosted parity status:
  - **still follow-up work, not same-day baseline**

This is the safest decision that matches the real evidence instead of the hoped-for rollout state.
