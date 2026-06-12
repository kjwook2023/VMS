# Check-Active-Workflow Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: Check-Active-Workflow
- Workflow ID: yHGSznd98SwuTTrQ
- Active: True
- Archived: False
- Created at: 2026-05-15T08:33:27.599Z
- Updated at: 2026-06-11T05:37:08.277Z
- Version counter: 40
- Node count: 13
- Connection source count: 10

## 업무 목적 초안

초안 목적: 일반 자동화 워크플로우입니다. 정확한 업무 목적은 소유자 확인이 필요합니다.

## 언제 실행되는가

- Health Schedule: 스케줄 필드: cronExpression; 스케줄 필드: cronExpression

## 전체 흐름

- Health Schedule -> Vacation Calendar
- Health Schedule -> Weekday Baseline
- Health Schedule -> Fetch Active Workflows
- Weekday Baseline -> Holiday DB Fallback
- Holiday DB Fallback -> Determine Holiday
- Fetch Active Workflows -> Expand Active Workflows
- Expand Active Workflows -> Fetch Latest Executions
- Expand Active Workflows -> Fetch Running Executions
- Fetch Latest Executions -> Normalize Workflow Status
- Fetch Running Executions -> Normalize Workflow Status
- Normalize Workflow Status -> Build Monitor Payload
- Build Monitor Payload -> Should Send Monitor
- Should Send Monitor -> Monitor Teams Webhook

## 노드별 역할과 목적

### Health Schedule

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

### Vacation Calendar

- 타입: n8n-nodes-base.notion / version=2.2
- 역할: Notion에서 업무, 이슈, 일정 데이터를 조회합니다.
- 필요한 이유: 이 노드가 없으면 Notion에 저장된 원본 데이터를 읽을 수 없습니다.
- 해석 근거: type=n8n-nodes-base.notion
- Credential: tsupport API

### Weekday Baseline

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected
- Credential: 없음

### Holiday DB Fallback

- 타입: n8n-nodes-base.microsoftSql / version=1.1
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.microsoftSql
- Credential: TsMgmt(DevTest_SQL2022_26)

### Determine Holiday

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected
- Credential: 없음

### Fetch Active Workflows

- 타입: n8n-nodes-base.httpRequest / version=4.2
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=http://192.168.1.85:5678/api/v1/workflows?limit=250
- Credential: 없음

### Expand Active Workflows

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Fetch Latest Executions

- 타입: n8n-nodes-base.httpRequest / version=4.2
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=={{ $json.workflowId ? $json.executionUrl : $json.fallbackUrl }}
- Credential: 없음

### Fetch Running Executions

- 타입: n8n-nodes-base.httpRequest / version=4.2
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=http://192.168.1.85:5678/api/v1/executions?limit=250&status=running
- Credential: 없음

### Normalize Workflow Status

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Build Monitor Payload

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected, issue message logic detected
- Credential: 없음

### Should Send Monitor

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Monitor Teams Webhook

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 가공된 결과를 Power Automate 또는 알림용 엔드포인트로 전달합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://redacted.invalid/powerautomate/webhook
- Credential: 없음


## 외부 시스템 연동

- Vacation Calendar: Notion 데이터베이스 조회 -> TS Calendar DB
- Fetch Active Workflows: HTTP API 호출 -> http://192.168.1.85:5678/api/v1/workflows?limit=250
- Fetch Latest Executions: HTTP API 호출 -> ={{ $json.workflowId ? $json.executionUrl : $json.fallbackUrl }}
- Fetch Running Executions: HTTP API 호출 -> http://192.168.1.85:5678/api/v1/executions?limit=250&status=running
- Monitor Teams Webhook: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook

## 해석 근거

- 워크플로우 이름: Check-Active-Workflow
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- 코드 노드에서 공휴일 여부를 계산하는 로직이 보입니다.
- 코드 노드에서 이슈 건수 또는 이슈 본문을 조합하는 로직이 보입니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- HTTP 노드가 TLS 없는 endpoint 를 사용합니다: Fetch Active Workflows
- HTTP 노드가 TLS 없는 endpoint 를 사용합니다: Fetch Running Executions

## Credential 참조

- Node Vacation Calendar -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)
- Node Holiday DB Fallback -> microsoftSql / TsMgmt(DevTest_SQL2022_26) (2dZb5OQPbTyO3052)

## API 관리 파일

- JSON payload: Check-Active-Workflow_api.json
- PowerShell upsert script: Check-Active-Workflow_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)