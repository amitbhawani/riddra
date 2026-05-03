# Riddra Hands-Off Execution Status

Date: 2026-05-02  
Timezone: Asia/Kolkata  
Mode: hands-off execution status sync

## 1. Current Completed State

### Core operating status

- Manual/operator-led private beta is still the correct current operating posture.
- The beta baseline decision is now explicit:
  - freeze the current proven manual/operator-led invite-only baseline
  - treat hosted parity as the next rollout track, not the same-day signoff baseline
- Google Sheet tracker summary is now refreshed after Prompt `138` to `142` on `2026-05-02 IST`.
- Current tracker counts after the sitemap stock coverage fix, Trigger authenticated cron proof attempt, and minimal RLS closure fix sync:
  - open pending items: `4`
  - active bottlenecks: `4`
  - today's suggested tasks: `4`
  - private-beta blocker count: `0`
  - hosted parity blocker count: `2`

### Yahoo market-data lane

- Yahoo `daily_same_day_only` chart/history plus snapshot lane is **GO**.
- Active `stocks_master` covered: `2157`
- Historical coverage: `2155 / 2157`
- Latest snapshot coverage: `2157 / 2157`
- Fresh + accepted exceptions: `2157`
- Blocking stale rows: `0`
- Accepted provider exceptions:
  - `KIRANVYPAR.NS`
  - `NEAGI.NS`

### Repair / quarantine state

- 40-symbol `2026-04-30` candle corruption was quarantined and repaired.
- Active quarantine rows: `0`
- Resolved quarantine rows: `80`
- Suspicious shared latest-candle pattern: `0`

### Cron / workflow state

- Cron queue redesign is implemented.
- Production cron routes were redeployed and no longer show `FUNCTION_INVOCATION_TIMEOUT` in unauthenticated route timing checks.
- Worker slice verification passed with the bounded `25`-stock limit and durable progress metadata.
- Cron is enabled in code for the approved strict same-day lane:
  - primary: `0 11 * * *` UTC / `4:30 PM IST`
  - retry: `0 13 * * *` UTC / `6:30 PM IST`

### Public stock page state

- Public stock pages now use stored Riddra/Yahoo-backed data instead of frontend Yahoo or TradingView calls.
- Native chart API and stock-page data visibility were audited.
- Frontend data accuracy audit passed for:
  - `RELIANCE`
  - `TCS`
  - `INFY`
  - `HDFCBANK`
  - `ICICIBANK`
  - `20MICRONS`
- Public inline editor/admin render paths were removed from hot routes.
- Recent local hot-path cleanup brought warm stock/index/fund page loads into a much healthier range in local dev, with the strongest warm checks under `2s`.
- Final imported-data polish is now complete locally:
  - visible chart ranges are `7D`, `1M`, `6M`, `1Y`, `5Y`, `MAX`
  - visible `1D` is absent on public stock pages
  - `Awaiting extended history` is removed from the audited stock-page path
  - the misleading hero `₹0.00` zero-state flash is removed from the live HTML output

### Hosted backend sprint state

- Hosted backend parity repo fixes are complete for:
  - stock-page normalized-data wiring
  - hosted-safe search fallback
  - robots/sitemap consistency
  - Trigger cron readiness diagnostics
  - Meilisearch timeout/degraded fallback behavior
- Hosted authenticated proof is now recorded for production:
  - login continuity
  - account page
  - profile read
  - watchlist read/view
  - portfolio holdings read
- Hosted stock/search/robots parity proof is now recorded on production.
- Hosted parity blocker count is now best described as:
  1. Trigger authenticated cron proof is still blocked because:
     - `TRIGGER_SECRET_KEY` is still not wired as a proper Production env name
     - `TRIGGER_PROJECT_REF` is still not wired as a proper Production env name
     - a suspicious `tr_dev_...` env key appears to have been stored as a key name instead
     - no usable cron secret value was available in this CLI session for a real authenticated hosted trigger
  2. final RLS closure is still not complete on record because the saved SQL verifier artifact still needs a trustworthy clean rerun

### Workflow / editorial state

- Hosted stability alignment has now been documented with exact missing Production envs for Trigger.dev and Meilisearch.
- The beta baseline recommendation is now documented and explicit.
- Editor handover SOP content is drafted and ready for review before PDF export.
- The stock content tracker column model is finalized with a paste-ready 20-row seed using real `stocks_master` names.

### Auth / self-service state

- Remaining ordinary signed-in durable flows were refactored off the admin-client path for:
  - profile
  - watchlist
  - portfolio
- Self-service helper boundaries now exist for:
  - admin server helper
  - user session helper
  - public read helper
- This materially reduced the residual risk from the older admin-client user-flow design.

### Google Sheet tracker sync

- Live tracker updated directly in `Project R`:
  - `Current Progress` -> `Last refreshed`
  - `Current Progress` -> `Last 72h completed`
  - `Current Progress` -> `RLS closure status`
  - `Current Progress` -> `Residual security risk`
  - `Current Progress` -> `Hosted rollout status`
  - `Current Progress` -> recalculated `Open pending items`
  - `Current Progress` -> recalculated `Active bottlenecks`
  - `Pending Tasks` -> normalized to `completed / in_progress / blocked / deferred`
  - `Bottlenecks & Risks` -> normalized to current blocked/monitoring truth
- The duplicate tracker file `Project R - May 1 Refresh` is now archived as reference only.
- The useful `72h Audit` tab from that duplicate is now preserved inside the master `Project R` sheet.

## 2. Open Blockers From The Google Sheet Tracker

These are the current open rows from the live `Pending Tasks` tab after the post-`138` to `142` tracker update.

Current counts:

- open pending items: `4`
- active bottlenecks: `4`

### P0

1. Start the operator-led invite-only beta from the proven local baseline.
   - status: `in_progress`
2. Mirror the proven local posture into the hosted beta environment.
   - status: `blocked`

### P1

3. Keep Trigger.dev stable during invite-only rollout.
   - status: `blocked`
4. Keep auth and account persistence on the proven path.
   - status: `completed`
5. Keep operator-only surfaces locked down and the no-fallback posture intact.
   - status: `blocked`

### P2

6. Decide whether to freeze the current manual/operator-led posture or mirror proofs immediately on hosted beta.
   - status: `completed`
7. Decide when to resume later automation lanes like Resend and Razorpay after invite-only beta starts.
   - status: `deferred`

### Important interpretation

- The tracker no longer shows a core product-truth blocker set.
- The remaining open items are now concentrated in:
  - hosted parity final closure
  - Trigger.dev production alignment
  - final RLS closure
  - rollout execution discipline

## 3. Security Pending Items

### Code-side improvement already completed

- `createSupabaseReadClient()` no longer silently upgrades to `service_role`.
- Public market-news reads were refactored away from internal raw/analytics tables.
- Ordinary signed-in profile/watchlist/portfolio durable flows no longer run through the admin client.

### Still pending

1. Finalize the `0057` closure record with a trustworthy clean verifier rerun.
   - minimal live fix already applied:
     - [db/migrations/0066_admin_only_grant_cleanup.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0066_admin_only_grant_cleanup.sql)
   - direct live probes now show:
     - `30 / 30` targeted `admin_only` tables deny ordinary authenticated users with `42501 permission denied`
     - `service_role` still succeeds on the same set

2. Re-run the exact current verifier from a clean trusted SQL path.
   - target outcome:
     - saved verifier summary flips from stale `FAIL` shape to a clean final `PASS`
     - the closure record no longer depends on runtime probes alone

### Current security truth

- Security is better than before.
- `0057` is applied live, and the minimal admin-only grant cleanup is now also applied live.
- Fresh direct live probes after Prompt `142` show:
  - public reads still work
  - self-service profile/watchlist/portfolio still work
  - cross-user self-service reads are still blocked
  - all `30 / 30` targeted `admin_only` tables now deny ordinary authenticated users with `42501 permission denied`
  - `service_role` still works on the same `30 / 30` targeted tables
- Security is **not fully closed** yet.
- Residual security risk is now better described as:
  - `medium`
  - because ordinary signed-in self-service flows are off the admin client now
  - hosted account/watchlist/profile reads are proven on the session-scoped path
  - username availability no longer scans the broader durable profile directory and now uses a narrower dedicated username-candidate lookup
  - but the final closure record still needs a trustworthy clean SQL verifier rerun before the 0057 blocker can be called fully done

## 4. Hosted Rollout Pending Items

1. Fix the hosted Production Trigger env names for Trigger-backed cron proof:
   - add `TRIGGER_SECRET_KEY`
   - add `TRIGGER_PROJECT_REF`
   - remove the mistaken `tr_dev_...` env-name entry if it is a secret accidentally stored as a key name

2. Record an authenticated production cron start against the new queue-based route using the real cron secret path.
   - current state:
     - deploy verification: pass
     - unauthenticated timeout symptom: resolved
     - authenticated queue-start proof: still blocked / unrecorded from this environment because no usable cron secret value was available in this CLI session

3. Capture durable proof that the hosted cron start:
   - creates or reuses a parent job
   - queues the worker
   - shows active progress in the Import Control Center

4. Close the final hosted security blocker:
   - final RLS closure verification
   - strict verifier PASS proof from a clean trusted SQL path

5. Hosted signed-in proof still needs to be recorded for:
   - optional non-admin mutation proof on a disposable test account
   - write/delete watchlist proof if desired for final hosted mutation evidence

## 5. Operations / Editorial Pending Items

### Operations

1. Start the invite-only operator-led beta with named owners.
2. Keep Control Center under watch.
   - current note from audit:
     - route returns `200`
     - still slow/heavy
     - one transient `500` was seen before retry success
3. Monitor worker and reconciliation health during first real hosted cron runs.
4. Keep the accepted provider exceptions explicitly documented:
   - `KIRANVYPAR.NS`
   - `NEAGI.NS`
5. Track the remaining direct historical coverage gaps:
   - `3MINDIA`
   - `ABBOTINDIA`

### Editorial / launch-content posture

1. Public marketing and announcement packaging remain deferred.
2. Broad-public smoke and launch rehearsal remain deferred.
3. Manual/operator-led support remains the intended posture while Resend automation stays deferred.

## 6. What Must Be Done Today

These are the highest-value next actions for a hands-off execution day.

1. Assign owners for the open tracker items and start the operator-led beta from the approved baseline.
   - operator rollout
   - hosted parity
   - worker monitoring
   - security apply/verify window

2. Fix the hosted Production Trigger.dev env names.

3. Deploy Trigger tasks and capture authenticated production cron proof.
   - parent job visible
   - worker progress visible
   - no timeout
   - no cooldown
   - no env-name mismatch

4. Schedule the remaining controlled RLS/grant/policy apply-and-verify window.
   - rerun `RIDDRA_RLS_VERIFY_EXISTING_TABLES.sql` from a clean trusted buffer
   - confirm the closure record flips from stale verifier mismatch to final `PASS`

5. Schedule, but do not rush, the remaining security apply/verify window.
   - The working tree is still very active and wide.
   - Security migrations should be applied only in a deliberate maintenance pass with verification immediately after.
   - The latest live verifier result means this remains an actual open security-closure task, not just a paperwork follow-up.

## 7. What Must Stay Deferred

1. Billing / Razorpay activation
2. Resend automation and fully automated support delivery
3. Subscription and entitlement commercial proof
4. Broad-public marketing / announcement push
5. Broad-public smoke rehearsal and launch-day packaging
6. Fundamentals expansion beyond the approved chart/history + snapshot lane
   - valuation
   - financial statements rollout at scale
   - holders
   - analyst data
7. Risky schema / RLS migration execution outside a controlled verification window

## Practical Read

Riddra is now in a strong “operator-led beta / controlled rollout” state, especially on the Yahoo chart-history lane and the public stock experience.

The biggest unfinished work is no longer core product truth. It is:

- hosted parity proof
- authenticated production cron proof
- remaining security closure
- rollout discipline and owner assignment

## Sheet-Ready Summary

Use this if you want to paste a condensed status note elsewhere.

```text
Riddra hands-off sync (2026-05-02 IST):

- Operating posture: manual/operator-led private beta ready
- Open pending tracker items: 4
- Active bottlenecks: 4
- Private-beta blocker count: 0
- Hosted parity blocker count: 2
- Yahoo daily same-day sync: GO
- Active stocks covered: 2157
- Historical coverage: 2155/2157
- Snapshot coverage: 2157/2157
- Fresh + accepted exceptions: 2157
- Accepted exceptions: KIRANVYPAR.NS, NEAGI.NS
- Active quarantine rows: 0
- Resolved quarantine rows: 80
- Cron queue fix: deployed
- Production timeout symptom: resolved
- Hosted cron authenticated proof: still pending
- Security closure: partial
- Main remaining security risk: admin-table grant/policy tightening and final strict verifier pass are still pending
- Today’s priorities: owner assignment, Trigger production env alignment, authenticated production cron proof, and final security-apply planning
- Keep deferred: Razorpay, Resend automation, subscriptions, broad-public smoke/marketing, risky migrations outside a controlled window
```
