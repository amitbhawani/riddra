# Riddra Financial Statements Import Attempt Report

Last updated: 2026-04-29 IST

## Scope

Controlled Yahoo Finance `financial_statements` attempt using a small five-stock pilot.

Pilot stocks:

- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`
- `HDFCBANK.NS`
- `ICICIBANK.NS`

Settings used:

- modules: `financial_statements` only
- request pace: `1 request/sec`
- workers: `1`
- `importOnlyMissingData = true`
- duplicate mode: `skip_existing_dates`
- no manual aggressive retry loop

Execution path:

- durable Yahoo batch API: `/api/admin/market-data/import/yahoo-batch`
- batch job id: `25245bc6-3401-4a8d-9cbf-e4123c98f294`

## Time Taken

| Metric | Value |
|---|---:|
| Started at | `2026-04-29T09:02:41.382Z` |
| Completed at | `2026-04-29T09:04:46.548Z` |
| Duration | `125.166 seconds` |
| Duration | `2m 5.2s` |
| Average time per stock | `25.03s` |

## High-Level Result

| Metric | Value |
|---|---:|
| Stocks targeted | `5` |
| Stocks completed | `5` |
| Stocks failed | `0` |
| Stocks skipped | `0` |
| Warning items | `5` |
| Financial statements completion | `100%` |
| Final job status | `completed_with_errors` |

Important interpretation:

- all `5` stocks finished safely
- no stock hard-failed
- every stock completed in warning mode because Yahoo financial statement modules were unavailable
- the importer recorded the failure state and moved on without an aggressive retry storm

## Yahoo Response Behavior

### Raw Yahoo responses saved

| Request pattern | Count |
|---|---:|
| `financial_statements | failed | 401` | `20` |
| **Total raw responses saved** | **`20`** |

Interpretation:

- `20` raw failed responses were still preserved in `raw_yahoo_imports`
- that equals `4` raw failed statement fetches per stock on average
- the importer recorded upstream blocking rather than pretending the data existed

### Error log entries

| Error pattern | Count |
|---|---:|
| `financial_statements | 401` | `20` |
| **Total `stock_import_errors` rows** | **`20`** |

Blocked-module pattern observed:

- Yahoo financial statement modules returned protected-access failures
- browser-auth fallback also failed with `status 429` crumb acquisition errors
- the system did **not** escalate into uncontrolled retries

## Normalized Writes

### Financial tables

| Table | Rows created during this attempt |
|---|---:|
| `stock_income_statement` | `0` |
| `stock_balance_sheet` | `0` |
| `stock_cash_flow` | `0` |

### Supporting observability writes

| Table | Rows created during this attempt |
|---|---:|
| `stock_import_coverage` | `30` |
| `stock_import_activity_log` | `100` |
| `stock_import_reconciliation` | `30` |

Interpretation:

- no bad or partial financial statement rows were written
- the system still wrote full observability evidence for each failed/unavailable bucket

## Coverage and Fill Result

Per stock, these six financial buckets were evaluated:

- `income_statement_annual`
- `income_statement_quarterly`
- `balance_sheet_annual`
- `balance_sheet_quarterly`
- `cash_flow_annual`
- `cash_flow_quarterly`

Coverage outcome:

- `6` buckets x `5` stocks = `30` coverage rows
- all `30` were recorded with warning/no-data state

Representative fill percentages from the stored import report:

| Bucket | Mapped fields | Filled fields | Missing fields | Fill % |
|---|---:|---:|---:|---:|
| `income_statement_annual` | `14` | `0` | `14` | `0%` |
| `income_statement_quarterly` | `14` | `0` | `14` | `0%` |
| `balance_sheet_annual` | `13` | `0` | `13` | `0%` |
| `balance_sheet_quarterly` | `13` | `0` | `13` | `0%` |
| `cash_flow_annual` | `11` | `0` | `11` | `0%` |
| `cash_flow_quarterly` | `11` | `0` | `11` | `0%` |

Representative warning:

- `Yahoo financial statement modules are currently unavailable for RELIANCE. Invalid Crumb Browser-auth fallback also failed: Yahoo browser-auth fallback could not obtain a crumb for "RELIANCE.NS" (status 429).`

## Activity Log Summary

Step-level financial import activity was written for every stock.

| Activity pattern | Count |
|---|---:|
| `financial_statements | fetch_started | running` | `5` |
| `financial_statements | import_failed | warning` | `5` |
| `income_statement_annual | import_failed | warning` | `5` |
| `income_statement_annual | coverage_updated | warning` | `5` |
| `income_statement_annual | reconciliation_completed | warning` | `5` |
| `income_statement_quarterly | import_failed | warning` | `5` |
| `income_statement_quarterly | coverage_updated | warning` | `5` |
| `income_statement_quarterly | reconciliation_completed | warning` | `5` |
| `balance_sheet_annual | import_failed | warning` | `5` |
| `balance_sheet_annual | coverage_updated | warning` | `5` |
| `balance_sheet_annual | reconciliation_completed | warning` | `5` |
| `balance_sheet_quarterly | import_failed | warning` | `5` |
| `balance_sheet_quarterly | coverage_updated | warning` | `5` |
| `balance_sheet_quarterly | reconciliation_completed | warning` | `5` |
| `cash_flow_annual | import_failed | warning` | `5` |
| `cash_flow_annual | coverage_updated | warning` | `5` |
| `cash_flow_annual | reconciliation_completed | warning` | `5` |
| `cash_flow_quarterly | import_failed | warning` | `5` |
| `cash_flow_quarterly | coverage_updated | warning` | `5` |
| `cash_flow_quarterly | reconciliation_completed | warning` | `5` |

This confirms:

- the failure was recorded explicitly
- each missing financial bucket was reconciled explicitly
- the importer did not silently swallow the problem

## Reconciliation Summary

| Reconciliation pattern | Count |
|---|---:|
| `income_statement_annual | no_data | stock_income_statement` | `5` |
| `income_statement_quarterly | no_data | stock_income_statement` | `5` |
| `balance_sheet_annual | no_data | stock_balance_sheet` | `5` |
| `balance_sheet_quarterly | no_data | stock_balance_sheet` | `5` |
| `cash_flow_annual | no_data | stock_cash_flow` | `5` |
| `cash_flow_quarterly | no_data | stock_cash_flow` | `5` |

Meaning:

- raw vs normalized reconciliation ran for every expected financial bucket
- each bucket was marked `no_data`
- required missing marker was `provider_response_unavailable`

## Retry / Cooldown Behavior

Observed guardrail behavior:

- `1 req/sec` cap remained active
- `1` worker remained active
- no manual retry loop was used
- no cooldown was triggered
- final `lastYahooError` remained `null`
- final `lastFailedModule` remained `null`
- final `lastFailedSymbol` remained `null`

Operational conclusion:

- the importer treated the blocked modules as warnings, not recoverable batch failures
- this is the intended controlled-mode behavior for unavailable Yahoo financial statements

## Route Health Check

Verified after completion:

| Route | Result |
|---|---|
| `/admin/market-data/stocks` | `200` |
| `/stocks/reliance-industries` | `200` |

## Conclusion

This controlled financial statements attempt behaved safely.

- Yahoo blocked financial statement access for all `5` pilot stocks
- raw failed responses were preserved
- error rows were preserved
- no normalized financial statement rows were written
- coverage, activity log, and reconciliation rows were written correctly
- the importer completed the batch without crashing and without aggressive retry escalation

Operational takeaway:

- financial statement import is currently **blocked upstream** in this runtime
- the fallback behavior is safe and audit-friendly
- broader financial-statements rollout should stay disabled until Yahoo financial statement modules become reliably accessible
