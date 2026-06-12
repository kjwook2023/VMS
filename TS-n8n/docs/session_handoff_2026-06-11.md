# TS-n8n Session Handoff

## Purpose

Confirmed baseline for the lunch workflow updates completed on `2026-06-11`.

## Confirmed State

- Base n8n URL: `https://n8n.vmsmozart-test.com:8443`
- `Lunch-Recommendation-Alert` (`7ofktWnZ4NjfSuEB`) is `active`
- `Lunch-Menu-Alert` (`yoA71hDhAmCR2CmU`) is `active`
- Both lunch workflows now run on weekday `11:30 KST`
- Cron for both: `0 30 11 * * 1-5`

## Lunch-Recommendation-Alert

- Main design note: [Lunch-Recommendation-Alert.md](D:/kjwook2023/vms/ts-n8n/docs/Lunch-Recommendation-Alert.md)
- Build script: [build_lunch_recommendation_alert.js](D:/kjwook2023/vms/ts-n8n/scripts/build_lunch_recommendation_alert.js)
- Workflow JSON: [Lunch-Recommendation-Alert_api.json](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.json)
- Upsert script: [Lunch-Recommendation-Alert_api.ps1](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.ps1)

Confirmed implementation:

- recommendation model changed from OpenAI to Gemini
- Kakao Local is used for place search
- Open-Meteo is used for weather context
- Teams card format was compressed to ranked one-line entries
- output target is `도보 5개 + 차량 5개`
- numbering is forced in card text and only the `1번` item shows an extra reason line
- Gemini `503` raw error JSON is no longer shown in Teams
- drive candidate search uses directional offset searches instead of center-only paging
- reroll webhook base URL is the new test domain

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

Confirmed update:

- schedule changed from `11:45 KST` to `11:30 KST`
- server rechecked after upsert and remains `active`

## Related Docs Updated

- [Lunch-Recommendation-Alert.md](D:/kjwook2023/vms/ts-n8n/docs/Lunch-Recommendation-Alert.md)
- [session_handoff_draft_2026-06-11_lunch-recommendation-alert.md](D:/kjwook2023/vms/ts-n8n/docs/handoff_drafts/session_handoff_draft_2026-06-11_lunch-recommendation-alert.md)
- [Workflow-Notion-Teams-Interface.md](D:/kjwook2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)
- [Lunch-Menu-Alert_design.md](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_design.md)
- [Lunch-Recommendation-Alert_design.md](D:/kjwook2023/vms/ts-n8n/workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_design.md)

## Next Resume Point

1. verify reroll behavior in the real Teams channel
2. decide whether `Lunch-Menu-Alert` should remain alongside `Lunch-Recommendation-Alert`
3. add route-based ETA if drive recommendations need stricter filtering
