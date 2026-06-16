# TS-n8n Session Handoff

## Purpose

Record the `Clean-Daily-Scrum` empty `11:30` Teams message investigation, the follow-up `16:30` regression fix, and the Teams webhook restoration applied on `2026-06-16`.

## Investigated Issue

- At `2026-06-16 11:30:54 KST`, `5.TS-일일업무` received an empty-looking Teams message.
- The triggering workflow was `Clean-Daily-Scrum` (`DbiuJ4y5XC8rDXbV`), execution `5297`.

## Findings

- The upstream Notion read node `Get many database pages` currently reads the broader vacation calendar dataset, so historical leave rows appear in raw execution input.
- The execution input included an older row:
  - `(연차) 조현재 - 오후반차`
  - Notion page id: `37bcb995-8309-8160-a489-f04a6d51d648`
  - Date: `2026-06-12`
  - Description: `Updated_by=Synchronize-Vacation`
- That row was not a valid `2026-06-16` match. It appeared only because the workflow reads historical calendar rows before applying its own date filter.
- The actual bug was downstream control flow:
  - `Team용 휴가체크` had `alwaysOutputData = true`
  - so even when the code returned no items for `11:30`, n8n still propagated an empty item
  - the Teams webhook node then executed with empty data and produced the blank-looking message
- A second regression appeared after inserting `Filter Today Vacation Rows`:
  - when there were no same-day vacation rows, the filter returned `[]`
  - that prevented `Team용 휴가체크` from running at all
  - as a result, the normal `16:30` cleanup reminder did not send
- During the emergency manual resend, the repository export for `Clean-Daily-Scrum` was also found to contain a redacted placeholder webhook URL instead of a live Teams endpoint.

## Applied Fix

- `scripts/update_clean_daily_scrum_halfday.js`
  - now forces `alwaysOutputData = false` on both vacation-check code nodes
- `scripts/update_clean_daily_scrum_halfday.js`
  - now inserts `Filter Today Vacation Rows` between the Notion read and the Teams vacation-check logic
- `Clean-Daily-Scrum_api.json`
  - regenerated with `Team용 휴가체크.alwaysOutputData = false`
  - regenerated with `Slack용 휴가체크.alwaysOutputData = false`
  - regenerated with `Get many database pages -> Filter Today Vacation Rows -> Team용 휴가체크`
  - regenerated so `Filter Today Vacation Rows` returns a placeholder item when there is no same-day match
  - this preserves the normal `16:30` path while still preventing historical rows from driving the `11:30` decision
- `Clean-Daily-Scrum_api.ps1`
  - now requires `TS_DAILY_SCRUM_TEAMS_WEBHOOK` when the repository JSON contains the redacted webhook placeholder
- `Clean-Daily-Scrum_api.json`
  - repository export now stores a redacted placeholder webhook
  - active server workflow was restored with the shared Daily Scrum Teams webhook before the manual resend
- `Clean-Daily-Scrum_design.md`
  - clarified that `11:30` should only proceed when there is an actual same-day afternoon half-day target
  - clarified that when there is no afternoon half-day target, `16:30` remains the default reminder slot

## Verification

- Active workflow `Clean-Daily-Scrum` (`DbiuJ4y5XC8rDXbV`) was updated on the server again at `2026-06-16T04:58:02.013Z`.
- The active graph now contains:
  - `Get many database pages -> Filter Today Vacation Rows -> Team용 휴가체크`
  - `Team용 휴가체크.alwaysOutputData = false`
  - `Slack용 휴가체크.alwaysOutputData = false`
- Re-checking execution `5297` with the same-day filter logic produced:
  - `rawPageCount = 50`
  - `sameDayCount = 0`
  - so there was no valid `2026-06-16` vacation row to justify an `11:30` Teams reminder
- The active workflow was updated again at `2026-06-16T07:56:04.765Z` after restoring the Teams webhook and fixing the `16:30` regression.
- A manual `16:30` resend using the repaired Teams card payload returned `202 Accepted`.
- The corrected behavior baseline is now:
  - `11:30` with no same-day afternoon half-day target -> no message
  - `11:30` with a same-day afternoon half-day target -> send early reminder
  - `16:30` with no same-day afternoon half-day target -> send normal cleanup reminder

## Expected Behavior After Fix

- If there is no same-day afternoon half-day target, the workflow may still start at `11:30` because of the schedule trigger, but the Teams path must stop without sending any message and the normal `16:30` reminder must remain available.
- If there is at least one same-day afternoon half-day target, the `11:30` Teams reminder proceeds as designed.
- `16:30` is the default reminder slot for normal days without same-day afternoon half-day targets.
- Past vacation rows are no longer passed into the actual same-day Teams decision path.
