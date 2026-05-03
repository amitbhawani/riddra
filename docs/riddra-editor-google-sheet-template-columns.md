# Riddra Editor Google Sheet Template Columns

Date: 2026-05-02  
Purpose: paste-ready column plan for the editor stock-review tracker

## Recommended Sheet Tabs

Use these tabs:

1. `Daily Queue`
2. `Carry Forward`
3. `Accepted Exceptions`
4. `Reviewer Summary`
5. `Reference`

## Daily Queue Columns

Use this order:

1. `Review Date`
   - date the row is being worked

2. `Day Type`
   - values:
     - `Working Day`
     - `Sunday Skip`
     - `Holiday`

3. `Batch`
   - small work grouping like `Batch A`, `Batch B`, `Priority`

4. `Priority`
   - values:
     - `High`
     - `Medium`
     - `Low`

5. `Assigned Editor`
   - editor responsible for first pass

6. `Reviewer`
   - reviewer or approver

7. `Company Name`
   - public stock name

8. `Symbol`
   - NSE/BSE-facing symbol used in page review

9. `Yahoo Symbol`
   - example: `RELIANCE.NS`

10. `Slug`
    - example: `reliance-industries`

11. `Public URL`
    - full stock-page URL

12. `Universe Status`
    - values:
      - `Canonical`
      - `Legacy`
      - `Unknown`

13. `Review Status`
    - values:
      - `Pending`
      - `In Progress`
      - `Complete`
      - `Blocked`
      - `Needs Review`
      - `Provider Exception`
      - `Carry Forward`
      - `Sunday Skip`

14. `Page Loads`
    - values:
      - `Yes`
      - `No`

15. `Header Correct`
    - values:
      - `Yes`
      - `No`

16. `Latest Price Visible`
    - values:
      - `Yes`
      - `No`

17. `Snapshot Visible`
    - values:
      - `Yes`
      - `No`

18. `Chart Loads`
    - values:
      - `Yes`
      - `No`

19. `Ranges Checked`
    - free text or compact values like:
      - `7D,1M,1Y,MAX`

20. `History Preview Visible`
    - values:
      - `Yes`
      - `No`

21. `Data Status Checked`
    - values:
      - `Yes`
      - `No`

22. `Freshness State`
    - values:
      - `Fresh`
      - `Accepted Exception`
      - `Needs Operator Check`

23. `Accepted Exception Type`
    - blank if not applicable
    - example:
      - `provider_no_data`

24. `Fundamentals State`
    - values:
      - `Unavailable Message Correct`
      - `Data Present`
      - `Needs Review`

25. `Financials State`
    - values:
      - `Unavailable Message Correct`
      - `Data Present`
      - `Needs Review`

26. `Disabled Fundamentals Touched?`
    - values:
      - `No`
      - `Yes`

27. `Issue Type`
    - values:
      - `None`
      - `Chart`
      - `Snapshot`
      - `Price Mismatch`
      - `Page Load`
      - `Provider Exception`
      - `Needs Product Review`

28. `Editor Note`
    - short factual note

29. `Escalation Needed`
    - values:
      - `No`
      - `Yes`

30. `Escalation Owner`
    - values like:
      - `Reviewer`
      - `Operator`
      - `Product`
      - `Dev`

31. `Reviewer Decision`
    - values:
      - `Approved`
      - `Return To Editor`
      - `Escalated`

32. `Reviewer Note`
    - short reviewer comment

33. `Completed At`
    - timestamp when the row was finished

34. `Last Updated By`
    - editor or reviewer who last touched the row

## Carry Forward Tab Columns

Keep these:

1. `Original Review Date`
2. `Company Name`
3. `Symbol`
4. `Slug`
5. `Carry Forward Reason`
6. `Current Owner`
7. `Next Review Date`
8. `Current Status`
9. `Notes`

## Accepted Exceptions Tab Columns

Use this for known non-blocking cases.

1. `Company Name`
2. `Symbol`
3. `Yahoo Symbol`
4. `Slug`
5. `Exception Type`
6. `Reason`
7. `Approved By`
8. `Approved On`
9. `Still Active?`
10. `Notes`

Current known rows:
- `KIRANVYPAR` / `KIRANVYPAR.NS`
- `NEAGI` / `NEAGI.NS`

## Reviewer Summary Tab Columns

1. `Review Date`
2. `Total Assigned`
3. `Completed`
4. `Blocked`
5. `Needs Review`
6. `Provider Exceptions`
7. `Carry Forward`
8. `Reviewer Name`
9. `Summary Note`

## Reference Tab Columns

Use this tab for controlled dropdown values and rules.

Suggested sections:
- review statuses
- priority values
- issue types
- escalation owners
- accepted exception symbols
- Sunday skip rule note
- fundamentals do-not-touch note

## Recommended Dropdown Values

### Review Status

- `Pending`
- `In Progress`
- `Complete`
- `Blocked`
- `Needs Review`
- `Provider Exception`
- `Carry Forward`
- `Sunday Skip`

### Priority

- `High`
- `Medium`
- `Low`

### Issue Type

- `None`
- `Chart`
- `Snapshot`
- `Price Mismatch`
- `Page Load`
- `Provider Exception`
- `Needs Product Review`

### Reviewer Decision

- `Approved`
- `Return To Editor`
- `Escalated`

## Minimum Required Columns If You Want A Smaller Sheet

If the team wants a lighter template, keep at least:

1. `Review Date`
2. `Assigned Editor`
3. `Company Name`
4. `Symbol`
5. `Yahoo Symbol`
6. `Slug`
7. `Public URL`
8. `Priority`
9. `Review Status`
10. `Chart Loads`
11. `Snapshot Visible`
12. `Freshness State`
13. `Issue Type`
14. `Editor Note`
15. `Reviewer Decision`
16. `Completed At`

## Notes For Setup

- use dropdown validation wherever possible
- freeze the header row
- freeze the first 6 columns if the sheet gets wide
- color code `Review Status`
- keep `Accepted Exceptions` as a separate tab so editors do not treat those rows as normal blockers
- do not add fundamentals-edit columns to this beta tracker

## Final Recommendation

Use the full `Daily Queue` version for launch-week beta operations.

It is easier to remove columns later than to recover missing audit detail after the team starts reviewing rows.
