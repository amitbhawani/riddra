# Riddra End-of-Day Progress Update

Date: 2026-05-02  
Timezone: Asia/Kolkata

## Summary

Today carried the hosted/backend closure work through the post-parity proof lane:

- sitemap stock coverage gap fixed
- Trigger env handoff checklist finalized
- Trigger authenticated cron proof attempted and truthfully marked blocked
- exact remaining RLS failures pinpointed
- minimal live admin-only grant cleanup applied and runtime-verified

The biggest change is that the project baseline is now explicit:
- **manual / operator-led invite-only beta is the approved baseline**
- hosted parity remains the next rollout track, not the same-day signoff gate

## Completed Today

1. Hosted backend parity repo fixes completed
   - stock-page normalized-data path fixed in repo
   - hosted-safe search fallback fixed in repo
   - robots/sitemap consistency fixed in repo

2. Trigger cron production readiness documentation completed
   - exact Trigger env requirements documented
   - non-secret diagnostics readiness path added

3. Trigger env operator handoff completed
   - short operator checklist created for:
     - `TRIGGER_SECRET_KEY`
     - `TRIGGER_PROJECT_REF`

4. RLS failure pinpoint audit completed
   - exact remaining failure lane isolated to the `30` `admin_only` tables

5. Minimal live RLS closure fix applied
   - narrow admin-only grant cleanup applied live
   - PostgREST schema reload triggered
   - runtime probes now show:
     - public reads still work
     - self-service still works
     - `30 / 30` targeted admin-only tables now deny ordinary authenticated users
     - `service_role` still works on the same set

6. Meilisearch hosted fallback hardening completed
   - short timeout added
   - degraded fallback remains useful when envs are missing
   - admin diagnostics now show:
     - `meilisearch_configured`
     - `fallback_active`
     - `index_prefix`
     - `last_search_error`

7. Hosted auth/watchlist proof completed
   - hosted login continuity proven
   - hosted profile read proven
   - hosted watchlist read/view proven
   - hosted portfolio read proven

8. Production redeploy parity proof completed
   - hosted stock-page parity proof recorded
   - hosted reliance suggestions useful on production
   - hosted sitemap no longer includes `/markets/news`

9. Robots and sitemap final proof completed
   - `robots.txt` and `sitemap.xml` are now consistent
   - hosted `www` versus non-`www` behavior is documented
   - sitemap stock coverage gap for `reliance-industries` and `tcs` is fixed in repo

10. Production env checklist completed
   - exact env names, sources, deploy order, and curl checks are documented

11. Stock-page imported-data final polish completed locally
   - no visible `1D`
   - no `Awaiting extended history`
   - clearer snapshot/header/data-status visibility
   - misleading hero zero-state removed

12. Hands-off execution and tracker state synchronized
   - repo docs updated
   - Google Sheet tracker updated directly
   - duplicate tracker merged into one master `Project R` sheet

## In Progress

1. Operator-led invite-only beta rollout
   - baseline approved
   - owner assignment and start discipline still needed

2. Hosted parity rollout
   - production page/search/SEO parity proof is recorded
   - final closure still depends on:
     - Trigger authenticated cron proof
     - final RLS closure record

## Blocked

1. Hosted parity
   - blocked by two remaining hosted parity blockers:
     - Trigger authenticated cron proof
     - final RLS closure verification

2. Hosted durable cron proof
   - queue-based routes are deployed and fast
   - real authenticated durable-job proof is still blocked because:
     - `TRIGGER_SECRET_KEY` is still not wired as a proper Production env name
     - `TRIGGER_PROJECT_REF` is still not wired as a proper Production env name
     - a suspicious `tr_dev_...` key appears to be stored as an env name
     - no usable cron secret value was available in this CLI session

3. Security closure
   - the minimal admin-only live fix is now applied
   - but the final closure record is still blocked until the strict verifier is rerun cleanly from a trustworthy buffer/path

## Deferred

These remain intentionally deferred and were not started:

1. Razorpay / billing activation
2. Resend automation rollout
3. subscriptions / entitlement commercial proof
4. public marketing / announcement rollout

## Recalculated Tracker Counts

After normalizing the tracker statuses after Prompt `138` to `142`:

- open pending items: `4`
- active bottlenecks: `4`
- today’s suggested tasks: `4`
- private-beta blocker count: `0`
- hosted parity blocker count: `2`

## Updated Status Model

### Pending Tasks

- `completed`
  - deployed-host proof
  - hosted stock/search/SEO parity proof
  - robots/sitemap final proof
  - rollout baseline decision
  - production env checklist
  - tracker consolidation

- `in_progress`
  - operator-led baseline rollout
  - hosted parity rollout follow-through

- `blocked`
  - Trigger.dev rollout stability
  - final RLS closure
  - hosted parity

- `deferred`
  - later automation lanes like Resend and Razorpay

## Suggested Next Tasks

These are the highest-value next working tasks:

1. Assign owners and begin the operator-led invite-only beta from the approved baseline.
2. Fix Production Trigger.dev env names:
   - `TRIGGER_SECRET_KEY`
   - `TRIGGER_PROJECT_REF`
   - remove the mistaken `tr_dev_...` env-name entry if applicable
3. Deploy Trigger tasks and capture authenticated production cron proof in Control Center.
4. Re-run the strict RLS verifier from a clean trusted SQL path and capture the final closure record.

## Google Sheet Status

`Project R` was accessible in this pass and updated directly for:

- `Current Progress`
- `Pending Tasks`
- `Bottlenecks & Risks`

The duplicate sheet `Project R - May 1 Refresh` was marked archived and now points back to the master `Project R` sheet.

## Final Read

Riddra ends this backend sprint with:
- a proven manual/operator-led beta baseline
- hosted auth proof recorded
- hosted stock/search/SEO parity proof recorded
- repo-side hosted parity fixes prepared
- a truthful tracker
- one consolidated live tracker sheet
- a narrower and clearer hosted rollout gap

What remains is not “platform truth is broken.”

What remains is:
- Trigger production env-name alignment
- authenticated cron proof capture
- final RLS closure record from a clean verifier rerun
- rollout discipline
