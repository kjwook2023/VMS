# WebHook_Test Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: WebHook_Test
- Workflow ID: xXw4mCdJROYi13AJ
- Active: True
- Archived: False
- Created at: 2026-04-27T07:51:54.340Z
- Updated at: 2026-04-27T07:52:46.000Z
- Version counter: 6
- Node count: 1
- Connection source count: 0

## 업무 목적 초안

초안 목적: 외부 시스템의 웹훅 입력을 수신하고 테스트하거나 검증하기 위한 워크플로우로 보입니다.

## 언제 실행되는가

- Webhook: 외부에서 POST webhook_Test 형태로 호출되는 웹훅 시작점입니다.

## 전체 흐름

- 연결된 노드 흐름이 확인되지 않았습니다.

## 노드별 역할과 목적

### Webhook

- 타입: n8n-nodes-base.webhook / version=2.1
- 역할: 외부 시스템에서 들어오는 입력을 받습니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템이 이벤트를 이 워크플로우로 전달할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.webhook
- Credential: 없음


## 외부 시스템 연동

- 외부 시스템 연동이 명확한 노드는 확인되지 않았습니다.

## 해석 근거

- 워크플로우 이름: WebHook_Test

## 확인 필요 사항 / 위험

- 연결되지 않은 노드가 있습니다: Webhook

## Credential 참조

- 노드에서 참조하는 Credential 이 없습니다.

## API 관리 파일

- JSON payload: WebHook_Test_api.json
- PowerShell upsert script: WebHook_Test_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)