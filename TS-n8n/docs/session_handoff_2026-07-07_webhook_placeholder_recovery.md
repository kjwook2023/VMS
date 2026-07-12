# TS-n8n Session Handoff

## Purpose

Record the `2026-07-07` recovery for live workflows that had repository redaction placeholders deployed into production webhook nodes.

## Reported Symptom

- `Check-Active-Workflow` reported:
  - `Synchronize-Vacation: [Monitor Teams Webhook] getaddrinfo ENOTFOUND redacted.invalid`

## Root Cause

- A live workflow update on `2026-07-06` pushed repository JSON that still contained redacted webhook placeholders.
- The affected live nodes were overwritten with `https://redacted.invalid/...` values.

## Confirmed Affected Workflows

- `Synchronize-Vacation` (`17Zl9pkIzYbHX315`)
  - broken node: `Monitor Teams Webhook`
- `License-Approval-Alert` (`GCP0kRsA5CLMsp2s`)
  - broken node: `Alert Teams Webhook`

## Recovery

- Restored the live `Synchronize-Vacation` webhook from a previous successful execution snapshot.
- Restored the live `License-Approval-Alert` webhook from a pre-change execution snapshot.
- Verified that no live workflow now contains `redacted.invalid` in any node URL.

## Hardening

- Updated deployment scripts so they now require real environment variables when a redacted webhook placeholder is present:
  - `Synchronize-Vacation_api.ps1` -> `TS_MONITOR_TEAMS_WEBHOOK`
  - `Check-Active-Workflow_api.ps1` -> `TS_MONITOR_TEAMS_WEBHOOK`
  - `Check-n8n-health_api.ps1` -> `TS_MONITOR_TEAMS_WEBHOOK`
  - `License-Approval-Alert_api.ps1` -> `TS_LICENSE_ALERT_WEBHOOK`

## Operational Note

- `Check-Active-Workflow` may continue to show the old `Synchronize-Vacation` error until the next scheduled `Synchronize-Vacation` trigger succeeds.
- With the current schedule, that next run is `2026-07-08 06:00 KST`.

## Files Updated

- [Synchronize-Vacation_api.ps1](../workflows/Synchronize-Vacation/Synchronize-Vacation_api.ps1)
- [License-Approval-Alert_api.ps1](../workflows/License-Approval-Alert/License-Approval-Alert_api.ps1)
- [Check-Active-Workflow_api.ps1](../workflows/Check-Active-Workflow/Check-Active-Workflow_api.ps1)
- [Check-n8n-health_api.ps1](../workflows/Check-n8n-health/Check-n8n-health_api.ps1)
- [session_handoff_2026-07-07_webhook_placeholder_recovery.md](session_handoff_2026-07-07_webhook_placeholder_recovery.md)
