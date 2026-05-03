# Riddra Editor Handover SOP

Date: 2026-05-02  
Status: draft for review before PDF export

## Purpose

This SOP is for editors handling the daily stock-page review workflow during the current Riddra beta phase.

This is an **operator-led, chart-and-snapshot-first** process.

Editors should:
- work from the stock tracker
- verify what is visible on the public stock page
- confirm the data status is healthy
- avoid touching disabled or unsupported fundamentals lanes
- mark rows complete only after review

This SOP is **not** for:
- running imports
- changing cron
- changing database rows directly
- forcing Yahoo fundamentals, valuation, holders, or financial statements

## 1. Daily Schedule

### Monday to Saturday

Recommended working rhythm:

1. `9:30 AM to 10:00 AM IST`
   - open the stock tracker
   - review carry-forward rows from the previous day
   - note any exceptions, blocked rows, or reviewer comments

2. `4:45 PM to 5:15 PM IST`
   - wait until market-close data has had time to settle
   - do not review too early while the provider may still be updating

3. `5:15 PM to 7:00 PM IST`
   - review the assigned stock batch
   - check public stock pages
   - confirm chart, snapshot, and data-status sections
   - mark clean rows complete

4. `7:00 PM to 7:30 PM IST`
   - hand over unresolved rows
   - tag provider exceptions, blockers, or page issues clearly

### If the queue is light

- finish the priority rows first
- then review carry-forward rows
- then review low-priority or older rows

## 2. Sunday Skip Rule

Sunday is a **skip day** for normal stock review.

Rules:
- do not run normal daily page-review batches on Sunday
- do not mark Sunday as a failed workday
- use Sunday only for:
  - documentation cleanup
  - reviewer comments
  - tracker hygiene
  - planning for Monday

If the sheet needs a Sunday entry:
- mark it as `Sunday Skip`
- do not mark it as `Pending`
- do not mark it as `Failed`

## 3. How To Use The Stock Tracker

The stock tracker is the editor control sheet for daily review.

Each row should represent one stock review unit.

Editors should use it to:
- know which stocks are assigned today
- see priority and batch grouping
- open the stock page quickly
- capture review result
- leave notes for the reviewer

Minimum row actions:

1. open the row
2. confirm the stock identity:
   - company name
   - symbol
   - slug
3. open the public stock page
4. review visible sections
5. check the Control Center if the row looks stale or broken
6. update the tracker row status

## 4. How To Choose Stocks

Use this order:

1. rows marked `Today`
2. rows marked `Priority`
3. rows assigned by reviewer
4. carry-forward rows from the previous day
5. low-priority clean-up rows

Choose stocks from the canonical tracked universe only.

Good candidates:
- assigned batch rows
- top traffic or important names
- rows flagged for recheck after a fix
- rows that recently changed from blocked to ready

Avoid choosing stocks ad hoc unless:
- the reviewer asks for it
- the row is clearly a carry-forward gap
- there is a visible public-page issue that needs immediate proof

## 5. How To Check Data Status

Check data in this order:

### A. Public stock page

Open the stock page and confirm:
- company name
- symbol
- exchange
- latest price
- price change and percent change
- market snapshot values
- historical chart loads
- chart ranges work
- historical preview rows show
- data-status section is present

### B. Import Control Center

If something looks stale, broken, or blank, check:
- `/admin/market-data/import-control-center`

Use it to confirm:
- freshness status
- accepted exceptions
- active quarantines
- recent cron/import state
- whether the issue is a known provider gap or a real page problem

### C. Accepted exception logic

At this stage, these are accepted provider exceptions:
- `KIRANVYPAR.NS`
- `NEAGI.NS`

If one of these appears without fresh daily provider data:
- do not fail the row automatically
- check whether it is already classified as an accepted provider exception

## 6. How To Avoid Touching Disabled Fundamentals

This is critical.

Current beta scope is:
- chart/history
- latest snapshot
- page visibility checks

Current beta scope is **not**:
- protected Yahoo fundamentals
- broad valuation imports
- financial statements at scale
- holders
- analyst data

Editor rule:
- do **not** try to “fix” missing fundamentals manually just because a field is empty
- do **not** treat missing protected fundamentals as a page defect by default

If a page shows the approved unavailable message, that is acceptable:
- `Fundamentals are not available from the current data provider yet.`

Correct editor behavior:
- confirm the unavailable state is clean
- confirm there is no fake or stale filler data
- mark the row as content-safe if the empty state is correct

## 7. How To Mark Rows Complete

Mark a row `Complete` only when all of the following are true:

1. correct stock page opened
2. core visible data loaded
3. chart loaded
4. latest visible price looked correct and consistent
5. historical preview rows rendered
6. data-status section looked correct
7. no fake fundamentals were shown
8. reviewer notes, if any, were addressed

If something is wrong, do not force `Complete`.

Use one of these statuses instead:
- `Blocked`
- `Needs Review`
- `Provider Exception`
- `Carry Forward`

When marking complete, add:
- review date
- editor name
- short note

Example complete note:
- `Reviewed after market close. Chart, snapshot, history preview, and data status all clean.`

## 8. Reviewer Checklist

Reviewer should confirm:

1. the editor checked the correct stock
2. the row status matches the actual page state
3. no disabled fundamentals were incorrectly treated as defects
4. accepted provider exceptions were handled correctly
5. notes are clear enough for next-day follow-up
6. carry-forward rows have a real reason
7. no row was marked complete with a broken chart
8. no row was marked complete with conflicting prices

Reviewer should sample-check:
- one large-cap stock
- one mid-cap stock
- one low-liquidity stock
- one recently repaired or previously broken stock

## 9. Examples

### Example A: Clean row

Stock:
- `RELIANCE`

Observed:
- latest price visible
- snapshot fields visible
- chart works
- 1Y and MAX load
- history preview visible
- fundamentals unavailable note shown cleanly

Tracker action:
- mark `Complete`
- note: `Clean after close. No issues.`

### Example B: Accepted provider exception

Stock:
- `NEAGI`

Observed:
- page loads
- data-status indicates accepted provider issue
- no fake values shown
- exception is known and non-blocking

Tracker action:
- mark `Provider Exception`
- note: `Known accepted low-liquidity provider_no_data case.`

### Example C: Real page issue

Stock:
- any assigned stock

Observed:
- chart spinner never resolves
- latest price and snapshot conflict visually

Tracker action:
- mark `Blocked`
- note: `Public page inconsistency. Chart not rendering correctly. Needs product/dev review.`

### Example D: Fundamentals empty state handled correctly

Observed:
- financial statements or fundamentals not available
- page shows a clean unavailable note
- no made-up values visible

Tracker action:
- do **not** mark as broken just because fundamentals are absent
- mark `Complete` if the rest of the page is healthy

## 10. Do And Do-Not Rules

### Do

- work after market-close stabilization
- use the tracker as the source of work
- verify the public stock page, not just the admin page
- check the Control Center when a row looks suspicious
- use clear notes
- escalate real inconsistencies
- respect accepted provider exceptions

### Do not

- do not review too early before the daily data settles
- do not run imports yourself unless explicitly assigned as an operator task
- do not mark disabled fundamentals as broken by default
- do not invent prices or fill missing fields manually
- do not force rows complete when the chart or snapshot is visibly wrong
- do not overwrite reviewer comments without explanation
- do not change scope from stock-page review into backend operations

## 11. Escalation Rules

Escalate to reviewer or operator when:
- chart does not load
- page shows conflicting prices
- latest snapshot is clearly inconsistent
- historical preview is blank on an otherwise active stock
- the stock is not in the tracker but appears to need review
- the row looks like a genuine import gap, not a known provider exception

Escalation note format:
- `Issue`
- `Observed on`
- `Stock`
- `What is visible`
- `Suggested next owner`

Example:
- `Issue: chart not loading`
- `Observed on: 2026-05-02 6:10 PM IST`
- `Stock: HDFCBANK`
- `What is visible: price header loads, chart spinner persists, history preview missing`
- `Suggested next owner: product/dev`

## 12. Final Editor Reminder

This beta phase is about **stable visible stock data**, not full financial depth.

A row is good when:
- the stock page is trustworthy
- the chart/history is correct
- the snapshot is consistent
- the empty states are honest

That is enough for this beta phase.
