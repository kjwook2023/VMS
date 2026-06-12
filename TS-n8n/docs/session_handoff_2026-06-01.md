# TS-n8n Session Handoff

## 목적

이 문서는 `2026-06-01` 기준으로 `ts-n8n` 작업 폴더와 n8n 서버의 active workflow 문서화를 다시 맞춘 결과를 다음 세션에서 바로 이어받기 위한 handoff 문서다.

이번 세션의 핵심은 아래 세 가지다.

- `Notikon-In-Review-Inform` 오타를 `Notion-In-Review-Inform`으로 정리
- n8n 서버의 `active=true` 워크플로우를 기준으로 로컬 문서와 API 파일 재생성
- 다음 세션에서 기준 문서로 쓸 수 있도록 인터페이스 문서와 handoff 문서 최신화

## 작업 루트

- 작업 폴더: `D:\kjwook2023\vms\ts-n8n`
- 환경 파일: [n8n.env](D:/kjwook2023/vms/ts-n8n/n8n.env)
- 워크플로우 폴더: [workflows](D:/kjwook2023/vms/ts-n8n/workflows)
- 공통 인터페이스 문서: [docs/Workflow-Notion-Teams-Interface.md](D:/kjwook2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)
- 이전 handoff: [docs/session_handoff_2026-05-27.md](D:/kjwook2023/vms/ts-n8n/docs/session_handoff_2026-05-27.md)

## 이번 세션 변경 사항

### 1. 워크플로우명 오타 정리

기존 로컬 오타:

- `Notikon-In-Review-Inform`

현재 정리된 기준명:

- `Notion-In-Review-Inform`

정리 대상:

- 폴더명: [workflows/Notion-In-Review-Inform](D:/kjwook2023/vms/ts-n8n/workflows/Notion-In-Review-Inform)
- 빌드 스크립트: [scripts/build_notion_in_review_inform.js](D:/kjwook2023/vms/ts-n8n/scripts/build_notion_in_review_inform.js)
- 워크플로우 JSON: [workflows/Notion-In-Review-Inform/Notion-In-Review-Inform_api.json](D:/kjwook2023/vms/ts-n8n/workflows/Notion-In-Review-Inform/Notion-In-Review-Inform_api.json)
- 배포 스크립트: [workflows/Notion-In-Review-Inform/Notion-In-Review-Inform_api.ps1](D:/kjwook2023/vms/ts-n8n/workflows/Notion-In-Review-Inform/Notion-In-Review-Inform_api.ps1)
- 설계 문서: [workflows/Notion-In-Review-Inform/Notion-In-Review-Inform_design.md](D:/kjwook2023/vms/ts-n8n/workflows/Notion-In-Review-Inform/Notion-In-Review-Inform_design.md)

추가 정리:

- 빌드 스크립트 내부의 workflow name 상수도 `Notion-In-Review-Inform`으로 수정
- 오류 메시지 문자열의 `Notikon` 표기도 `Notion`으로 수정

### 2. active workflow 기준 재생성

실행한 명령:

```powershell
powershell -ExecutionPolicy Bypass -File workflows\_generate_active_workflow_docs.ps1
```

이 명령으로 n8n 서버의 `active=true` 워크플로우 기준으로 각 폴더의 아래 파일이 재생성됐다.

- `*_api.json`
- `*_api.ps1`
- `*_design.md`

재생성된 active workflow 수:

- `14개`

대상 워크플로우:

- `신입사원 안내메일 자동화`
- `Check-Active-Workflow`
- `Check-n8n-health`
- `Check-Weekly-Meeting`
- `Clean-Daily-Scrum`
- `github-pr-monitor`
- `License-Approval-Alert`
- `Lunch-Menu-Alert`
- `Notion-In-Review-Inform`
- `Plan-Daily-Scrum`
- `Private-ConfirmDailyScrum`
- `Synchronize-Vacation`
- `TS-Inform_New_Issue`
- `TS-IssueCheck(08,16)`

### 3. 공통 인터페이스 문서 재생성

갱신한 문서:

- [docs/Workflow-Notion-Teams-Interface.md](D:/kjwook2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)

현재 문서 기준:

- n8n 서버 `active=true`
- Workflow ID 포함
- Notion 연결 정보 포함
- Teams/Power Automate webhook 정보 포함

## 검증 결과

서버 기준 active workflow와 로컬 JSON을 재비교한 결과:

- active workflow 수: `14`
- 로컬 누락: `0`
- 내용 불일치: `0`

즉, `2026-06-01` 현재 active workflow에 대해서는 로컬 `workflows/*_api.json`이 서버와 동기화된 상태다.

## 현재 기준 문서

다음 세션에서는 아래 문서를 기준으로 시작하면 된다.

- 최신 handoff: [docs/session_handoff_2026-06-01.md](D:/kjwook2023/vms/ts-n8n/docs/session_handoff_2026-06-01.md)
- active workflow 인터페이스 요약: [docs/Workflow-Notion-Teams-Interface.md](D:/kjwook2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)
- 개별 워크플로우 설계 문서: `workflows/<workflow-name>/<workflow-name>_design.md`

## 다음 세션에서 유의할 점

- active workflow 기준 문서화는 서버 스냅샷 기반이다. n8n UI나 API에서 워크플로우를 수정하면 다시 `workflows\_generate_active_workflow_docs.ps1`를 실행해야 한다.
- `scripts/build_notion_in_review_inform.js`는 로컬 빌드 스크립트다. 이후 이 스크립트로 JSON을 재생성한 경우에도 서버 반영 후 다시 active workflow 문서 재생성이 필요하다.
- inactive workflow는 이번 재생성 범위에 포함되지 않았다. 이번 세션의 동기화 보증 범위는 `active=true` 워크플로우만이다.

## 빠른 재확인 절차

다음 세션에서 바로 상태를 다시 확인하려면 아래 순서로 보면 된다.

1. [docs/session_handoff_2026-06-01.md](D:/kjwook2023/vms/ts-n8n/docs/session_handoff_2026-06-01.md) 확인
2. [docs/Workflow-Notion-Teams-Interface.md](D:/kjwook2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md) 확인
3. 필요 시 `powershell -ExecutionPolicy Bypass -File workflows\_generate_active_workflow_docs.ps1` 재실행
4. 특정 워크플로우는 해당 폴더의 `*_api.json`, `*_api.ps1`, `*_design.md` 확인
