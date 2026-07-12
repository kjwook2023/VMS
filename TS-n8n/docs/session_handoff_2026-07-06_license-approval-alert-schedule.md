# TS-n8n Session Handoff

## Purpose

Record the `2026-07-06` schedule change for `License-Approval-Alert`.

## Affected Workflow

- Workflow: `License-Approval-Alert`
- Workflow ID: `GCP0kRsA5CLMsp2s`

## Requested Change

- On weekdays, run every `20 minutes` during business hours from `08:00 KST` through `16:40 KST`.
- Outside business hours on weekdays, run at `07:00 KST` and `18:00 KST`.

## Applied Schedule

- `0 0 7 * * 1-5`
- `0 */20 8-16 * * 1-5`
- `0 0 18 * * 1-5`

## Verified Live State

- Live workflow remained `active` after update.
- Live workflow `updatedAt`: `2026-07-06T05:43:01.278Z`

## Files Updated

- [build_license_approval_alert.js](../scripts/build_license_approval_alert.js)
- [License-Approval-Alert_api.json](../workflows/License-Approval-Alert/License-Approval-Alert_api.json)
- [License-Approval-Alert_design.md](../workflows/License-Approval-Alert/License-Approval-Alert_design.md)
- [session_handoff_2026-07-06_license-approval-alert-schedule.md](session_handoff_2026-07-06_license-approval-alert-schedule.md)
