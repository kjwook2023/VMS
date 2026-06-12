# TS-n8n Session Handoff

## Purpose

Confirmed baseline for the lunch workflow and workflow-documentation updates completed as of `2026-06-12`.

## Confirmed State

- Base n8n URL: `https://n8n.vmsmozart-test.com:8443`
- Active workflow count: `15`
- `Lunch-Recommendation-Alert` (`7ofktWnZ4NjfSuEB`) is `active`
- `Lunch-Menu-Alert` (`yoA71hDhAmCR2CmU`) is `active`
- Both lunch workflows run on weekday `11:30 KST`
- Cron for both: `0 30 11 * * 1-5`

## Lunch-Recommendation-Alert

- Main design note: [Lunch-Recommendation-Alert.md](D:/kjwook2023/vms/ts-n8n/docs/Lunch-Recommendation-Alert.md)
- Build script: [build_lunch_recommendation_alert.js](D:/kjwook2023/vms/ts-n8n/scripts/build_lunch_recommendation_alert.js)
- Workflow JSON: [Lunch-Recommendation-Alert_api.json](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.json)
- Upsert script: [Lunch-Recommendation-Alert_api.ps1](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.ps1)

Confirmed implementation:

- Kakao Local is used for place search
- Gemini is used for final ranking
- Open-Meteo is used for weather context
- Teams card is compact and targets `walk 5 + drive 5`
- Card numbering is forced as literal text
- Only the top-ranked item in each section includes an extra reason line
- Gemini `503` raw error text is hidden behind a short fallback message
- Drive candidate search uses directional offset search points instead of center-only paging
- Reroll webhook uses the current test-domain base URL

Latest validated result:

- validation execution `5151`: success
- one-shot Teams send execution `5153`: success
- candidate counts: `walk=11`, `drive=43`, `total=54`
- recommendation counts: `walk=5`, `drive=5`

Residual risks:

- reroll still uses `Action.OpenUrl`
- drive time is still distance-based, not route-ETA based

## Lunch-Menu-Alert

- Build script: [build_lunch_menu_alert.js](D:/kjwook2023/vms/ts-n8n/scripts/build_lunch_menu_alert.js)
- Workflow JSON: [Lunch-Menu-Alert_api.json](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_api.json)
- Design note: [Lunch-Menu-Alert_design.md](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_design.md)

Confirmed implementation:

- Existing production menu workflow remains `active`
- Schedule was changed from `11:45 KST` to `11:30 KST`
- Current cron: `0 30 11 * * 1-5`

## Documentation Generator

- Generator script: [workflows/_generate_active_workflow_docs.ps1](D:/kjwook2023/vms/ts-n8n/workflows/_generate_active_workflow_docs.ps1)
- Active workflow docs were regenerated after the lunch workflow updates
- `*_design.md` files now write as `UTF-8 with BOM`
- `*_api.json` and `*_api.ps1` remain `UTF-8 without BOM`

Reason for the change:

- The markdown files themselves were valid UTF-8, but Windows PowerShell often displayed BOM-less UTF-8 markdown as mojibake
- Writing BOM for markdown improves local readability without changing JSON or PowerShell file handling

## Related Docs Updated

- [Lunch-Recommendation-Alert.md](D:/kjwook2023/vms/ts-n8n/docs/Lunch-Recommendation-Alert.md)
- [Workflow-Notion-Teams-Interface.md](D:/kjwook2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)
- [session_handoff_2026-06-11.md](D:/kjwook2023/vms/ts-n8n/docs/session_handoff_2026-06-11.md)
- [session_handoff_draft_2026-06-11_lunch-recommendation-alert.md](D:/kjwook2023/vms/ts-n8n/docs/handoff_drafts/session_handoff_draft_2026-06-11_lunch-recommendation-alert.md)
- [Lunch-Menu-Alert_design.md](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_design.md)
- [Lunch-Recommendation-Alert_design.md](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_design.md)

## Next Resume Point

1. verify reroll behavior in the real Teams channel
2. decide whether `Lunch-Menu-Alert` should remain alongside `Lunch-Recommendation-Alert`
3. add route-based ETA if drive recommendations need stricter filtering
