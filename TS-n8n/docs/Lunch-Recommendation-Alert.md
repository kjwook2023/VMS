# Lunch Recommendation Alert

`Lunch-Recommendation-Alert` is currently an inactive n8n workflow that used to post lunch recommendations to the Teams lunch channel.

## Artifacts

- `scripts/build_lunch_recommendation_alert.js`
- `workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.json`
- `workflows/Lunch-Recommendation-Alert/Lunch-Recommendation-Alert_api.ps1`

## Current Server State

- Workflow id: `7ofktWnZ4NjfSuEB`
- Status: `inactive`
- Base URL: `https://n8n.vmsmozart-test.com:8443`
- Weekday schedule: `11:30 KST`
- Cron: `0 30 11 * * 1-5`
- Deactivated at: `2026-07-06 12:01:24 KST`
- Deactivation reason: repetitive recommendations; held until future improvement work

## Functional Summary

- Office label: `분당수지유타워`
- Address query: `경기도 용인시 수지구 신수로 767`
- Candidate source: Kakao Local API
- Recommendation model: Gemini `gemini-3.5-flash`
- Weather source: Open-Meteo
- Output target: the existing Teams webhook shared with `Lunch-Menu-Alert`

## Recommendation Policy

- Walk recommendations: up to `5`
- Drive recommendations: up to `5`
- Walk range: about `15` minutes on foot
- Drive range: about `20` minutes by car using a distance bucket heuristic
- Budget target: about `KRW 10,000` per person
- Weather input: current conditions plus weekly forecast trend

## Workflow Flow

1. When enabled, run on weekday schedule or through the public reroll webhook.
2. Check holiday status with SQL fallback.
3. Resolve the office location through Kakao Local.
4. Fetch weather from Open-Meteo.
5. Build walk candidates around the office.
6. Build drive candidates through directional offset searches.
7. Ask Gemini to rank and explain the final selections.
8. Send an Adaptive Card to Teams.

## Runtime Notes

- Kakao runtime access uses the n8n credential `kakao-local-lunch-recommendation`.
- Gemini API key is read from `workflows/Lunch-Recommendation-Alert/.env` as `GEMINI_TS_LUNCH_API_KEY`.
- The reroll webhook is `https://n8n.vmsmozart-test.com:8443/webhook/lunch-menu-recommend-more`.
- The workflow was deactivated on `2026-07-06`, so scheduled posts are currently stopped.
- The Teams card is intentionally compact and uses:
  - walk section: `5` items
  - drive section: `5` items
- Card numbering is rendered as literal text, not markdown ordered-list formatting.
- Only the top-ranked item in each section includes an extra recommendation-reason line.

## Known Limits

- The reroll action still uses `Action.OpenUrl`, so Teams may open a browser tab.
- Drive time is distance-based, not a route ETA.
- Budget fit is heuristic because Kakao Local does not provide menu price data.

If exact vehicle travel time is needed later, add a directions-stage filter.
