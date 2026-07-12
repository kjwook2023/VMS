# TS-n8n Session Handoff

## Purpose

Confirmed baseline for the lunch workflow, `Clean-Daily-Scrum` half-day exception, and workflow-documentation updates completed as of `2026-06-12`.

## Confirmed State

- Base n8n URL: `https://n8n.vmsmozart-test.com:8443`
- Active workflow count: `15`
- `Lunch-Recommendation-Alert` (`7ofktWnZ4NjfSuEB`) is `active`
- `Lunch-Menu-Alert` (`yoA71hDhAmCR2CmU`) is `active`
- Both lunch workflows run on weekday `11:30 KST`
- Cron for both: `0 30 11 * * 1-5`
- `Clean-Daily-Scrum` (`DbiuJ4y5XC8rDXbV`) is `active`
- `Clean-Daily-Scrum` runs on weekday `11:30 KST` and `16:30 KST`

## Lunch-Recommendation-Alert

- Main design note: [Lunch-Recommendation-Alert.md](Lunch-Recommendation-Alert.md)
- Build script: [build_lunch_recommendation_alert.js](../scripts/build_lunch_recommendation_alert.js)
- Workflow JSON: [Lunch-Recommendation-Alert_api.json](../workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.json)
- Upsert script: [Lunch-Recommendation-Alert_api.ps1](../workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.ps1)

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

- Build script: [build_lunch_menu_alert.js](../scripts/build_lunch_menu_alert.js)
- Workflow JSON: [Lunch-Menu-Alert_api.json](../workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_api.json)
- Design note: [Lunch-Menu-Alert_design.md](../workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_design.md)

Confirmed implementation:

- Existing production menu workflow remains `active`
- Schedule was changed from `11:45 KST` to `11:30 KST`
- Current cron: `0 30 11 * * 1-5`

## Clean-Daily-Scrum

- Workflow JSON: [Clean-Daily-Scrum_api.json](../workflows/Clean-Daily-Scrum/Clean-Daily-Scrum_api.json)
- Design note: [Clean-Daily-Scrum_design.md](../workflows/Clean-Daily-Scrum/Clean-Daily-Scrum_design.md)
- Patch helper: [update_clean_daily_scrum_halfday.js](../scripts/update_clean_daily_scrum_halfday.js)

Confirmed implementation:

- Existing end-of-day scrum cleanup workflow remains `active`
- Schedule now includes weekday `11:30 KST` and `16:30 KST`
- `오전 반차` is treated the same as before
- If at least one alert target is marked as `오후 반차`, the scrum cleanup notice is sent at `11:30 KST`
- When `오후 반차` logic is triggered, the `16:30 KST` execution exits without sending a duplicate notice
- If no `오후 반차` target exists, the workflow behaves as before and sends at `16:30 KST`

Confirmed intent:

- `업무 계획` is still handled in the morning by the separate planning workflow
- The exception only exists so that `업무 정리` can be requested before an `오후 반차` user leaves

## Documentation Generator

- Generator script: [workflows/_generate_active_workflow_docs.ps1](../workflows/_generate_active_workflow_docs.ps1)
- Active workflow docs were regenerated after the lunch workflow updates
- `*_design.md` files now write as `UTF-8 with BOM`
- `*_api.json` and `*_api.ps1` remain `UTF-8 without BOM`

Reason for the change:

- The markdown files themselves were valid UTF-8, but Windows PowerShell often displayed BOM-less UTF-8 markdown as mojibake
- Writing BOM for markdown improves local readability without changing JSON or PowerShell file handling

## Related Docs Updated

- [Lunch-Recommendation-Alert.md](Lunch-Recommendation-Alert.md)
- [Workflow-Notion-Teams-Interface.md](Workflow-Notion-Teams-Interface.md)
- [session_handoff_2026-06-11.md](session_handoff_2026-06-11.md)
- [session_handoff_draft_2026-06-11_lunch-recommendation-alert.md](handoff_drafts/session_handoff_draft_2026-06-11_lunch-recommendation-alert.md)
- [Lunch-Menu-Alert_design.md](../workflows/Lunch-Menu-Alert/Lunch-Menu-Alert_design.md)
- [Lunch-Recommendation-Alert_design.md](../workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_design.md)
- [Clean-Daily-Scrum_design.md](../workflows/Clean-Daily-Scrum/Clean-Daily-Scrum_design.md)

## Next Resume Point

1. verify reroll behavior in the real Teams channel
2. decide whether `Lunch-Menu-Alert` should remain alongside `Lunch-Recommendation-Alert`
3. add route-based ETA if drive recommendations need stricter filtering
