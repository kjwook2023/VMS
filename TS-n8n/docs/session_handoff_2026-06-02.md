# TS-n8n Session Handoff

## Purpose

This handoff captures the `2026-06-02` state of the `ts-n8n` workspace for the next session after reboot.

Primary focus in this update:

- preserve the active-workflow sync baseline from `2026-06-01`
- record the `Check-Weekly-Meeting` message-link enhancement
- note the current encoding caveat around Korean text edits in generated workflow JSON

## Working Context

- Workspace: `ts-n8n repository root`
- Env file: [n8n.env](../n8n.env)
- Active workflow docs generator: [workflows/_generate_active_workflow_docs.ps1](../workflows/_generate_active_workflow_docs.ps1)
- Previous handoff: [docs/session_handoff_2026-06-01.md](session_handoff_2026-06-01.md)

## Current Baseline

The `2026-06-01` sync baseline still stands:

- active workflows on the n8n server are mirrored locally under `workflows/*`
- active workflow doc regeneration is based on the server, not local manual edits
- the local active-workflow set was previously verified with `missingLocal=0` and `unsynced=0`

## 2026-06-02 Work Summary

### 1. `Check-Weekly-Meeting` message link enhancement

Target workflow:

- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json)
- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)

Intent:

- include clickable links in the Teams/Adaptive Card message for:
- Weekly meeting page
- Sprint page

Links added to the workflow logic:

- Weekly meeting page:
- `https://app.notion.com/p/vmssolutions/ae3617323a5945fda70db4c1d8c8086d?v=2decb99583098030b178000c5d32f6cc`
- Sprint page:
- `https://app.notion.com/p/vmssolutions/Sprint-2decb995830980e7910cd3495f371466`

Implementation shape:

- the code node now exposes:
- `weeklyMeetingPageUrl`
- `sprintPageUrl`
- `weeklyMeetingLinksMarkdown`
- the Teams message body now includes a dedicated text block for the links
- the Teams message actions now include:
- `Open Outlook Event`
- `Open Weekly Meeting Page`
- `Open Sprint Page`

### 2. Server update result

`Check-Weekly-Meeting` was updated on the n8n server.

Latest known server timestamp after the change:

- `2026-05-31T23:26:56.927Z`

The regenerated design doc reflects that timestamp:

- [Check-Weekly-Meeting_design.md](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)

### 3. Why the link labels are currently English

There is still an encoding risk when editing generated workflow JSON directly and then re-rendering or inspecting through PowerShell.

To reduce the chance of malformed strings in the live workflow payload, the currently stored link labels/buttons were left in ASCII:

- `Weekly Meeting: [Open](...)`
- `Sprint: [Open](...)`
- `Open Weekly Meeting Page`
- `Open Sprint Page`

This is a deliberate stability choice, not a product decision.

## Important Caveat

`workflows/_generate_active_workflow_docs.ps1` pulls the current server definition and overwrites local `*_api.json`, `*_api.ps1`, and `*_design.md` for active workflows.

That means:

1. if you manually edit a local active workflow JSON
2. and then run the generator before pushing that JSON to n8n
3. your local edit will be replaced by the server copy

Safe sequence for active workflow edits:

1. edit local workflow JSON
2. update the n8n server
3. run `workflows\_generate_active_workflow_docs.ps1`
4. then verify the regenerated files

## Recommended Next Step After Reboot

If the next session continues the `Check-Weekly-Meeting` work, verify actual Teams rendering behavior first.

Suggested checks:

1. confirm the inline markdown links render as clickable in the target Teams/Power Automate path
2. confirm the two new action buttons appear correctly
3. if rendering is correct, optionally convert button/link labels back to Korean with a safer edit path

## Files Most Relevant For Resume

- [docs/session_handoff_2026-06-02.md](session_handoff_2026-06-02.md)
- [docs/session_handoff_2026-06-01.md](session_handoff_2026-06-01.md)
- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json)
- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)
- [docs/Workflow-Notion-Teams-Interface.md](Workflow-Notion-Teams-Interface.md)
