# github-branch-monitor Design

## Purpose

- Monitor specific GitHub branches on weekdays and post a Teams status card.
- Suppress all alerts on weekends and holidays using the same holiday gate pattern as `github-pr-monitor`.
- Post a detailed change alert when a branch head SHA changes.
- Post a short status card when no monitored branch changed.

## Workflow Identity

- Workflow name: `github-branch-monitor`
- Live workflow ID: `2VBL0bRff7oZpLVf`
- Build script: [build_github_branch_monitor.js](../../scripts/build_github_branch_monitor.js)
- JSON payload: [github-branch-monitor_api.json](github-branch-monitor_api.json)
- Upsert script: [github-branch-monitor_api.ps1](github-branch-monitor_api.ps1)
- Helper scripts:
  - [run_github_branch_monitor_once.js](../../scripts/run_github_branch_monitor_once.js)
  - [send_github_branch_monitor_test_alert.js](../../scripts/send_github_branch_monitor_test_alert.js)

## Current Monitoring Targets

1. `vmslab/Mozart2.0`
   Branch: `Release/2026.126.1`
2. `vmslab/mozart-ui-app`
   Branch: `Release/2026.126.1`

## Schedule

- Weekdays `07:55 KST`
- Weekdays `13:55 KST`

## External Dependencies

- GitHub API credential:
  - repository export placeholder: `__N8N_GITHUB_CREDENTIAL_NAME__`
  - deploy-time env: `N8N_GITHUB_CREDENTIAL_NAME`
- Teams webhook:
  - repository export placeholder: `https://redacted.invalid/powerautomate/github-branch-monitor-webhook`
  - deploy-time env: `TS_GITHUB_BRANCH_MONITOR_TEAMS_WEBHOOK`
- Holiday lookup:
  - public holiday API
  - SQL fallback: `TsMgmt.dbo.HolidayCalendarKR`
- Vacation lookup:
  - Notion database `TS Calendar DB`
  - used only to determine Teams mention targets

## Runtime Behavior

1. `Schedule Trigger` starts at `07:55` and `13:55` on weekdays.
2. `Weekday Baseline`, `HTTP Request`, `Holiday DB Fallback`, and `Holiday Judge` resolve whether the current day is a holiday.
3. If the day is a holiday or weekend, monitoring stops and no Teams message is sent.
4. `Vacation Calendar` loads the shared vacation calendar from Notion.
5. `Resolve Notification Targets` checks the current vacation state for:
   - `김민영`
   - `조현재`
   - `김진욱`
6. `Branch Monitor Config` expands the monitored repository and branch list.
7. `Fetch Branch Head` loads the current branch head for each target branch.
8. `Build Comparison State` compares the current SHA with `workflow static data`.
9. If a branch changed, `Fetch Branch Compare` loads commit and file diff details, then `Build Teams Payload` creates a detailed Teams card.
10. If all monitored branches are unchanged and this is not the initialization run, `Build No Change Payload` creates a short status card.
11. `Persist Branch State` and `Persist Alerted State` update `workflow static data` after each run.

## Branch State Storage

- Static data root:
  - `workflow static data.global.githubBranchMonitor`
- Key format:
  - `<owner>/<repository>:<branch>`
- Stored fields:
  - `lastCheckedSha`
  - `lastCheckedAt`
  - `lastCommitDate`
  - `lastCommitMessage`
  - `lastCommitAuthor`
  - `lastNotifiedSha`
  - `lastNotifiedAt`
  - `branchUrl`
  - `repository`
  - `branch`

## Alert Rules

### Change Detected

- Teams card title: `github-branch-monitor 상태 알림`
- Mention targets:
  - mention only users who are **not** on vacation
  - candidate pool: `김민영`, `조현재`, `김진욱`
- If all three are on vacation:
  - send the status card without mentions
  - include a text note that all tracked users are on vacation
- Card content includes:
  - repository
  - branch
  - check slot
  - compare base
  - previous SHA -> current SHA
  - commit count
  - file count
  - latest commit time
  - detailed commit/file summary

### No Change

- A short Teams status card is still sent when every monitored branch is unchanged.
- No users are mentioned in the no-change card.
- `알림 대상` is intentionally shown as `없음`.
- Vacation information is still shown for operator context.

### Initialization

- If a branch has no previous baseline SHA, the workflow only records the current SHA.
- No Teams message is sent on that first baseline capture.

## Operational Notes

- The afternoon run compares against the same day `07:55` baseline.
- Compare API failure does not block alerting; the card falls back to SHA-level change reporting with the compare error.
- Repository JSON keeps redacted webhook placeholders by design. Live webhook values must be injected during deployment or copied from the live workflow.
- The helper script `run_github_branch_monitor_once.js` is intended for one-off execution validation and preserves live credential/webhook bindings while testing.

## Verified State

- Live workflow remained `active` after deployment.
- Forced validation run on `2026-07-09` completed successfully.
- Verified execution:
  - execution ID: `6252`
  - result: `success`
  - last node executed: `Teams Webhook No Change`
  - summary: `오후 13:55 체크 결과 변경 사항이 없습니다.`
- Verified no-change notification behavior:
  - no Teams mentions
  - `알림 대상: 없음`
- Verified change-notification behavior in workflow definition:
  - mentions are only constructed in the change payload path

## Files to Edit for Future Changes

- Change monitored repositories or branches:
  - [build_github_branch_monitor.js](../../scripts/build_github_branch_monitor.js)
  - edit the `monitoredBranches` array
- Change schedule:
  - same file, `Schedule Trigger`
- Change Teams card content:
  - same file, `Build Teams Payload`
  - same file, `Build No Change Payload`
- Change vacation-aware mention logic:
  - same file, `Resolve Notification Targets`
