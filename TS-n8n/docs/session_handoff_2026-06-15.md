# TS-n8n Session Handoff

## Purpose

Confirmed baseline for retiring and deleting the weekly-meeting Teams alert workflow as of `2026-06-15`.

## Confirmed State

- Base n8n URL: `https://n8n.vmsmozart-test.com:8443`
- Total workflows on server: `23`
- Active workflow count: `14`
- `Check-Weekly-Meeting` (`vUILQ5GOQfdHJTsx`) is no longer present on the n8n server
- The workflow was deactivated first and then deleted from the server on `2026-06-15`

## Retired Workflow

- Workflow name: `Check-Weekly-Meeting`
- Previous purpose: detect the configured weekly-meeting Outlook event and send a Teams reminder
- Previous local definition:
  - [Check-Weekly-Meeting_api.json](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json)
  - [Check-Weekly-Meeting_design.md](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)
  - [Check-Weekly-Meeting_api.ps1](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.ps1)

Retirement handling:

- Server workflow deactivated and deleted
- `scripts/apply_holiday_fallback.ps1` no longer targets `Check-Weekly-Meeting`
- `Check-Weekly-Meeting_api.ps1` now blocks accidental restore unless `-AllowRestore` is explicitly passed
- Local workflow files remain as historical artifacts only

## Related Docs Updated

- [Workflow-Notion-Teams-Interface.md](Workflow-Notion-Teams-Interface.md)
- [Check-Weekly-Meeting_design.md](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)
- [Check-Weekly-Meeting_api.ps1](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.ps1)
- [apply_holiday_fallback.ps1](../scripts/apply_holiday_fallback.ps1)

## Verification

- Server list rechecked after deletion
- Remaining matching workflows by id/name: `0`
- Current server totals after deletion: `23 total`, `14 active`
