# TS-n8n Session Handoff

## Purpose

Record the `2026-07-01` investigation and recovery for `신입사원 안내메일 자동화`, including the root cause, the server-side fix, and the duplicate-send lesson from the same session.

## Affected Workflow

- Workflow: `신입사원 안내메일 자동화`
- Workflow ID: `PKNPjyPvAyVXNrCc`
- Mailbox owner that must be used: `support@vms-solutions.com`
- Target folder: `10. 신입사원`

## Reported Issue

- A new message with subject pattern `[신입사원 계정발급] ...` arrived on `2026-07-01`.
- The expected onboarding reply did not appear to send at first.
- The workflow had to operate through the `support@vms-solutions.com` mailbox, not through `jwkim@vms-solutions.com`.

## Root Cause

- The workflow was still wired to the expired Outlook credential `tsupport` (`QrARH25rhyVoJNXv`).
- A separate mail workflow already proved that the valid support-mailbox credential on the server is `support` (`QfudWXK5AulrLxFd`).
- Because of the expired credential, mailbox validation with `tsupport` returned an OAuth refresh-token failure and the trigger was effectively stale.

## Confirmed Mail State

- The `support` credential could access the monitored folder `10. 신입사원`.
- The target message was present in that folder:
  - Subject: `[신입사원 계정발급] - 티그리스 그룹웨어, Office365, 휴넷, 레몬베이스, VMS WORKS 발급 - 박서현 선임`
  - From: `jihyeon@vms-solutions.com`
  - Received: `2026-07-01T01:02:37Z`
- The message matched the workflow sender and subject conditions.

## Applied Fix

- Updated the workflow credential from `tsupport` to `support` on all Outlook nodes.
- Pushed the updated JSON to the live n8n server.
- Reconfirmed the live workflow remained `active`.
- Tightened the trigger filter from `readStatus = both` to `readStatus = unread`.

## What Actually Happened During Recovery

- After the credential fix was pushed, the main workflow itself ran successfully:
  - Execution ID: `5839`
  - Started: `2026-07-01T01:22:58.849Z`
  - Mode: `trigger`
  - Result: the workflow read the target mail and `신입사원 안내 메일 발송` completed with `success`
- A separate manual recovery send was then triggered unnecessarily:
  - Execution ID: `5840`
  - Started: `2026-07-01T01:25:00.015Z`
  - Result: `success`
- That second send caused the duplicate onboarding reply.

## Verification

- The live workflow now uses `support` (`QfudWXK5AulrLxFd`) on:
  - `신입사원 관련 메일 수신`
  - `메일 상태 읽음으로 변경`
  - `메일 사서함 변경`
  - `신입사원 안내 메일 발송`
- The live trigger filter now stores `readStatus = unread`.
- The manual recovery send appears in `Sent Items` at:
  - `2026-07-01T01:25:00Z`
  - To: `shpark@vms-solutions.com`
  - Cc: `jihyeon@vms-solutions.com`
- Temporary `codex-*` diagnostic workflows created during the investigation were removed from the server before closeout.

## Operational Lesson

- When a trigger-based mail workflow is fixed in place, do not assume the missed item still needs a manual resend.
- First check:
  1. live workflow execution history
  2. the exact execution payload for the affected message
  3. `Sent Items`
- Only after those three checks should a manual recovery send be considered.

## Files Updated

- [session_handoff_2026-07-01.md](session_handoff_2026-07-01.md)
- [신입사원 안내메일 자동화_design.md](../workflows/신입사원 안내메일 자동화/신입사원 안내메일 자동화_design.md)
- [신입사원 안내메일 자동화_api.json](../workflows/신입사원 안내메일 자동화/신입사원 안내메일 자동화_api.json)
