# TS-n8n Session Handoff

## Purpose

Record the current consolidated state as of `2026-07-12` for the July workflow work:

- onboarding support-mail workflow recovery
- `github-branch-monitor` creation and refinement
- `Synchronize-Vacation` sync-window correction and webhook recovery
- `Lunch-Recommendation-Alert` deactivation
- `License-Approval-Alert` schedule update

## Main Outcomes

### 1. Onboarding mail automation recovered

- Workflow: `신입사원 안내메일 자동화`
- Live mailbox path was corrected to the `support@vms-solutions.com` credential path.
- The stale credential issue that blocked automatic processing was removed.
- The duplicate-send lesson from the same recovery session was documented.
- Reference:
  - [session_handoff_2026-07-01.md](session_handoff_2026-07-01.md)

### 2. github-branch-monitor created and stabilized

- New workflow: `github-branch-monitor`
- Live workflow ID: `2VBL0bRff7oZpLVf`
- Current targets:
  1. `vmslab/Mozart2.0` / `Release/2026.126.1`
  2. `vmslab/mozart-ui-app` / `Release/2026.126.1`
- Current schedule:
  - weekdays `07:55 KST`
  - weekdays `13:55 KST`
- Holiday suppression is enabled.
- Change detection is based on branch head SHA plus GitHub compare details.
- Teams title is fixed as `github-branch-monitor 상태 알림`.
- Current mention policy:
  - on change: mention only non-vacation users among `김민영`, `조현재`, `김진욱`
  - if all three are on vacation: send status only, no mention
  - on no-change: send status only, no mention
- Verified manual validation:
  - execution ID `6252`
  - result `success`
  - no-change path confirmed through `Teams Webhook No Change`
- References:
  - [github-branch-monitor_design.md](../workflows/github-branch-monitor/github-branch-monitor_design.md)
  - [build_github_branch_monitor.js](../scripts/build_github_branch_monitor.js)
  - [run_github_branch_monitor_once.js](../scripts/run_github_branch_monitor_once.js)

### 3. Synchronize-Vacation corrected and revalidated

- Workflow: `Synchronize-Vacation`
- Same-day afternoon half-day rows were investigated.
- Root cause was not parsing failure, but a too-narrow source sync window.
- The source collection window was expanded with a `7-day` lookback to recover missed late approvals.
- A later webhook-placeholder deployment issue was also recovered by restoring real live webhook values and hardening deploy scripts.
- The workflow was manually re-run and returned to normal operation.
- References:
  - [session_handoff_2026-07-06.md](session_handoff_2026-07-06.md)
  - [session_handoff_2026-07-07_webhook_placeholder_recovery.md](session_handoff_2026-07-07_webhook_placeholder_recovery.md)
  - [Synchronize-Vacation_design.md](../workflows/Synchronize-Vacation/Synchronize-Vacation_design.md)

### 4. Lunch recommendation alert disabled

- Workflow: `Lunch-Recommendation-Alert`
- Live workflow is intentionally `inactive`.
- Reason: repeated near-duplicate recommendations with low operational value.
- Reference:
  - [session_handoff_2026-07-06_lunch-recommendation-deactivate.md](session_handoff_2026-07-06_lunch-recommendation-deactivate.md)
  - [Lunch-Recommendation-Alert.md](Lunch-Recommendation-Alert.md)

### 5. License approval alert schedule changed

- Workflow: `License-Approval-Alert`
- Current weekday schedule:
  - `07:00 KST`
  - every `20 minutes` from `08:00 KST` through `16:40 KST`
  - `18:00 KST`
- Reference:
  - [session_handoff_2026-07-06_license-approval-alert-schedule.md](session_handoff_2026-07-06_license-approval-alert-schedule.md)
  - [License-Approval-Alert_design.md](../workflows/License-Approval-Alert/License-Approval-Alert_design.md)

## Current Operational Notes

- Repository workflow exports intentionally keep webhook placeholders such as `redacted.invalid`.
- Live deploy scripts now require explicit environment injection for those placeholders.
- `github-branch-monitor` and `github-pr-monitor` both use deploy-time GitHub credential injection instead of publishing personal credential names.
- `Synchronize-Vacation` is the source of vacation presence used by other monitoring workflows when mention suppression is needed.

## Files Added or Finalized in This Round

- [session_handoff_2026-07-01.md](session_handoff_2026-07-01.md)
- [session_handoff_2026-07-06.md](session_handoff_2026-07-06.md)
- [session_handoff_2026-07-06_license-approval-alert-schedule.md](session_handoff_2026-07-06_license-approval-alert-schedule.md)
- [session_handoff_2026-07-06_lunch-recommendation-deactivate.md](session_handoff_2026-07-06_lunch-recommendation-deactivate.md)
- [session_handoff_2026-07-07_webhook_placeholder_recovery.md](session_handoff_2026-07-07_webhook_placeholder_recovery.md)
- [session_handoff_2026-07-12.md](session_handoff_2026-07-12.md)
- [github-branch-monitor_design.md](../workflows/github-branch-monitor/github-branch-monitor_design.md)
