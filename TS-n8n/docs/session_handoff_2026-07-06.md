# TS-n8n Session Handoff

## Purpose

Record the `2026-07-06` investigation and fix for `Synchronize-Vacation`, focused on VMS Works afternoon half-half-day leave (`오후반반차`) rows that appeared to be missing from the vacation calendar sync.

## Affected Workflow

- Workflow: `Synchronize-Vacation`
- Workflow ID: `17Zl9pkIzYbHX315`
- Source system: `VMS Works`
- Target system: Notion vacation calendar database

## Reported Issue

- Some vacation rows, especially same-day afternoon half-half-day leave, were reported as missing from the calendar sync.
- The concern was that `오후 반반차` might not be parsed correctly.

## Findings

- The live workflow was still active and its recent scheduled executions were succeeding.
- The VMS Works source payload does return `오후반반차` rows.
- The current parser maps `오후반반차` to the afternoon timeslot correctly because it checks whether `leave_form` includes `오후`.
- The actual gap was the sync window:
  - the workflow ran once per day at `06:00 KST`
  - the source window started at `today`
  - any leave approved or updated after the morning run for the same day could be missed permanently
- This was confirmed with the `2026-07-01` `강군석 / 오후반반차` case:
  - the VMS Works monthly source now contains that row
  - the `2026-07-01 06:00 KST` workflow execution had `items: []`
  - if the same source script is re-run with the same date context, the row is included

## Root Cause

- Not a parsing failure for `오후반반차`
- A sync-window design bug:
  - only future-or-today rows were considered
  - there was no overlap with recent past days
  - one daily run at `06:00 KST` meant late same-day approvals had no recovery path

## Applied Fix

- Changed the source sync window to include a `7-day` lookback.
- Changed month-pair generation so every month between the lookback start and forward end date is queried.
- This allows the next scheduled run to recover recently missed leave rows instead of dropping them permanently.

## Residual Constraint

- The workflow still syncs only the hard-coded target users currently configured in the source script:
  - `김진욱`
  - `김민영`
  - `조현재`
  - `강군석`
- If other employees must appear in the same calendar, the target list must be expanded separately.

## Files Updated

- [session_handoff_2026-07-06.md](session_handoff_2026-07-06.md)
- [sync_vms_vacation_source.js](../workflows/Synchronize-Vacation/sync_vms_vacation_source.js)
