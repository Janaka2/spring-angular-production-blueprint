# Post-mortem: <one-line title>

Date: YYYY-MM-DD · Duration: HH:MM · Severity: critical | major | minor · Author: · Reviewed by:

## Summary
Two sentences: what users experienced, what the cause was.

## Impact
Who, how many, for how long, what could not be done. Data lost or corrected? (query the audit trail)

## Timeline (UTC)
| Time | What happened / what was seen | Who did what |
|---|---|---|
| | first signal (alert name, user report) | |
| | | |
| | recovery confirmed by | |

## Detection
How was it noticed, and how long after it started? Which alert should have fired earlier?

## Contributing causes
Not "root cause": the several things that had to be true. Technical, procedural, and what made recovery slow.

## What went well
The runbook section that worked, the dashboard that told the story, the backup that existed.

## Actions
| Action | Type (alert / runbook / code / process) | Owner | Due | Issue |
|---|---|---|---|---|
| | | | | |

Rule: every post-mortem adds or sharpens at least one alert or runbook entry (`HEALTH-MONITORING.md` §3, `RUNBOOK.md`).
Blameless. Facts, not judgements. Link it from `RUNBOOK.md` under "Past incidents".
