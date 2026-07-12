# TS-n8n Session Handoff

## Purpose

Confirmed baseline for refreshing local active workflow exports, docs, and repository-safe redaction from the current n8n production snapshot on `2026-06-22`.

## Confirmed Server State

- Base n8n URL: `https://n8n.vmsmozart-test.com:8443`
- Total workflows on server: `23`
- Active workflow count: `14`
- Inactive workflow count: `9`

Active workflows confirmed during this sync:

- `Check-Active-Workflow` (`yHGSznd98SwuTTrQ`) updated `2026-06-11T05:37:08.277Z`
- `Check-n8n-health` (`weTOeGZtWSOjeluM`) updated `2026-05-20T22:34:56.000Z`
- `Clean-Daily-Scrum` (`DbiuJ4y5XC8rDXbV`) updated `2026-06-16T07:56:04.765Z`
- `github-pr-monitor` (`uHiUd0TH3pMU3O7I`) updated `2026-05-21T07:01:27.716Z`
- `License-Approval-Alert` (`GCP0kRsA5CLMsp2s`) updated `2026-05-24T10:49:16.382Z`
- `Lunch-Menu-Alert` (`yoA71hDhAmCR2CmU`) updated `2026-06-11T06:54:20.663Z`
- `Lunch-Recommendation-Alert` (`7ofktWnZ4NjfSuEB`) updated `2026-06-11T06:48:23.928Z`
- `Notion-In-Review-Inform` (`hfo5MCAAqQHXac92`) updated `2026-05-31T22:21:52.436Z`
- `Plan-Daily-Scrum` (`reXPlC1M4ftWESQO`) updated `2026-05-21T23:22:13.871Z`
- `Private-ConfirmDailyScrum` (`Q7wpo6RDOAsfGHKI`) updated `2026-05-15T00:24:43.636Z`
- `Synchronize-Vacation` (`17Zl9pkIzYbHX315`) updated `2026-06-11T05:37:46.471Z`
- `TS-Inform_New_Issue` (`0HGC4fQns5NxqIhv`) updated `2026-05-14T00:50:55.000Z`
- `TS-IssueCheck(08,16)` (`73xzOwkeyM0a85Rf`) updated `2026-05-14T00:51:36.000Z`
- `신입사원 안내메일 자동화` (`PKNPjyPvAyVXNrCc`) updated `2026-04-14T02:30:43.000Z`

## Sync Actions

- Ran [workflows/_generate_active_workflow_docs.ps1](../workflows/_generate_active_workflow_docs.ps1) against the live server to refresh active workflow exports.
- Reapplied repository-safe redaction after generation:
  - Teams / Power Automate webhook URLs replaced with redacted placeholders in exported JSON and design docs
  - `Lunch-Recommendation-Alert` Gemini API key value replaced with `__REDACTED_GEMINI_API_KEY__`
- Restored `Clean-Daily-Scrum` repository-specific handling:
  - [Clean-Daily-Scrum_api.ps1](../workflows/Clean-Daily-Scrum/Clean-Daily-Scrum_api.ps1) again injects `TS_DAILY_SCRUM_TEAMS_WEBHOOK` when deploying from the redacted export
  - [Clean-Daily-Scrum_design.md](../workflows/Clean-Daily-Scrum/Clean-Daily-Scrum_design.md) again documents the `11:30` early-send rule and `16:30` default-send rule

## Updated Docs

- [Workflow-Notion-Teams-Interface.md](Workflow-Notion-Teams-Interface.md)
- Active workflow folders under [workflows](../workflows)
- Previous operational fix record kept in [session_handoff_2026-06-16.md](session_handoff_2026-06-16.md)
- Repository migration checklist: [Repository-Migration-Checklist.md](Repository-Migration-Checklist.md)

## Notes

- This sync reflects the current active workflow snapshot from the server, but repository exports intentionally do not keep live webhook URLs or live Gemini key values.
- `Check-Weekly-Meeting` remains retired and is not part of the active workflow set.
- Handoff docs now use relative repository links instead of personal absolute Windows paths.
- `github-pr-monitor` repo export no longer keeps the personal GitHub credential display name and now expects `N8N_GITHUB_CREDENTIAL_NAME` at deploy time.
