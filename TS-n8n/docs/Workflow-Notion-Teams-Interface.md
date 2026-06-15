# Workflow Notion Teams Interface

- Snapshot time: `2026-06-15`
- Scope: active workflows on the current n8n server
- Active workflow count: `14`

## Lunch Workflows

| Workflow | Workflow ID | Status | Schedule | Teams target | Notes |
| --- | --- | --- | --- | --- | --- |
| `Lunch-Menu-Alert` | `yoA71hDhAmCR2CmU` | `active` | `11:30 KST` (`0 30 11 * * 1-5`) | `Lunch Teams Webhook` | Existing menu-post workflow |
| `Lunch-Recommendation-Alert` | `7ofktWnZ4NjfSuEB` | `active` | `11:30 KST` (`0 30 11 * * 1-5`) | `Lunch Teams Webhook` | Kakao + Gemini based recommendation workflow |

## Notes

- The current n8n base URL is `https://n8n.vmsmozart-test.com:8443`.
- Both lunch workflows post into the same Teams destination.
- `Check-Weekly-Meeting` was retired and deleted from the n8n server on `2026-06-15`.
- For full workflow structure, use each workflow folder under `workflows/`.
