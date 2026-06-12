# Notion-In-Review-Inform Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: Notion-In-Review-Inform
- Workflow ID: hfo5MCAAqQHXac92
- Active: True
- Archived: False
- Created at: 2026-05-20T08:33:03.173Z
- Updated at: 2026-05-31T22:21:52.436Z
- Version counter: 13
- Node count: 10
- Connection source count: 9

## 업무 목적 초안

초안 목적: 일반 자동화 워크플로우입니다. 정확한 업무 목적은 소유자 확인이 필요합니다.

## 언제 실행되는가

- Review Schedule: 스케줄 필드: cronExpression

## 전체 흐름

- Review Schedule -> Weekday Baseline
- Weekday Baseline -> Holiday DB Fallback
- Holiday DB Fallback -> Determine Holiday
- Determine Holiday -> Not Holiday
- Not Holiday -> Vacation Calendar
- Vacation Calendar -> In Review Pages
- In Review Pages -> Build Teams Payload
- Build Teams Payload -> Should Send Alert
- Should Send Alert -> Alert Teams Webhook

## 노드별 역할과 목적

### Review Schedule

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

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

### Not Holiday

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 공휴일 여부를 기준으로 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Vacation Calendar

- 타입: n8n-nodes-base.notion / version=2.2
- 역할: Notion에서 업무, 이슈, 일정 데이터를 조회합니다.
- 필요한 이유: 이 노드가 없으면 Notion에 저장된 원본 데이터를 읽을 수 없습니다.
- 해석 근거: type=n8n-nodes-base.notion
- Credential: tsupport API

### In Review Pages

- 타입: n8n-nodes-base.notion / version=2.2
- 역할: Notion에서 업무, 이슈, 일정 데이터를 조회합니다.
- 필요한 이유: 이 노드가 없으면 Notion에 저장된 원본 데이터를 읽을 수 없습니다.
- 해석 근거: type=n8n-nodes-base.notion
- Credential: tsupport API

### Build Teams Payload

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected
- Credential: 없음

### Should Send Alert

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Alert Teams Webhook

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 가공된 결과를 Power Automate 또는 알림용 엔드포인트로 전달합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://redacted.invalid/powerautomate/webhook
- Credential: 없음


## 외부 시스템 연동

- Vacation Calendar: Notion 데이터베이스 조회 -> TS Calendar DB
- In Review Pages: Notion 데이터베이스 조회 -> In Review Target DB
- Alert Teams Webhook: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook

## 해석 근거

- 워크플로우 이름: Notion-In-Review-Inform
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- 코드 노드에서 공휴일 여부를 계산하는 로직이 보입니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- API 정의만 기준으로 보았을 때 즉시 드러나는 구조적 위험은 크지 않습니다.

## Credential 참조

- Node Holiday DB Fallback -> microsoftSql / TsMgmt(DevTest_SQL2022_26) (2dZb5OQPbTyO3052)
- Node Vacation Calendar -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)
- Node In Review Pages -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)

## API 관리 파일

- JSON payload: Notion-In-Review-Inform_api.json
- PowerShell upsert script: Notion-In-Review-Inform_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)