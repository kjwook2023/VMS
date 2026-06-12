# Synchronize-Vacation Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: Synchronize-Vacation
- Workflow ID: 17Zl9pkIzYbHX315
- Active: True
- Archived: False
- Created at: 2026-05-19T00:04:45.030Z
- Updated at: 2026-06-11T05:37:46.471Z
- Version counter: 25
- Node count: 21
- Connection source count: 20

## 업무 목적 초안

초안 목적: 일반 자동화 워크플로우입니다. 정확한 업무 목적은 소유자 확인이 필요합니다.

## 언제 실행되는가

- Manual Trigger: 시작 노드이며 타입은 n8n-nodes-base.manualTrigger 입니다.
- Sync Schedule: 스케줄 필드: cronExpression

## 전체 흐름

- Manual Trigger -> Fetch Vacation Source
- Sync Schedule -> Fetch Vacation Source
- Fetch Vacation Source -> Parse Vacation Source
- Parse Vacation Source -> Load Notion Calendar
- Load Notion Calendar -> Build Notion Sync Plan
- Build Notion Sync Plan -> If Create
- If Create -> Create Notion Page
- If Create -> If Update
- Create Notion Page -> Create Result
- If Update -> Update Notion Page
- If Update -> If Archive
- Update Notion Page -> Update Result
- If Archive -> Archive Notion Page
- If Archive -> Noop Result
- Archive Notion Page -> Archive Result
- Create Result -> Merge Action Results A
- Update Result -> Merge Action Results A
- Archive Result -> Merge Action Results B
- Noop Result -> Merge Action Results B
- Merge Action Results A -> Merge All Results
- Merge Action Results B -> Merge All Results
- Merge All Results -> Build Monitor Payload
- Build Monitor Payload -> Monitor Teams Webhook

## 노드별 역할과 목적

### Manual Trigger

- 타입: n8n-nodes-base.manualTrigger / version=1
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.manualTrigger
- Credential: 없음

### Sync Schedule

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

### Fetch Vacation Source

- 타입: n8n-nodes-base.executeCommand / version=1
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.executeCommand
- Credential: 없음

### Parse Vacation Source

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Load Notion Calendar

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://api.notion.com/v1/databases/205cb995-8309-80e4-ac2a-c8589a1783eb/query
- Credential: tsupport API

### Build Notion Sync Plan

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### If Create

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Create Notion Page

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://api.notion.com/v1/pages
- Credential: tsupport API

### Create Result

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### If Update

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Update Notion Page

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url==https://api.notion.com/v1/pages/{{ $json.pageId }}
- Credential: tsupport API

### Update Result

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### If Archive

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Archive Notion Page

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url==https://api.notion.com/v1/pages/{{ $json.pageId }}
- Credential: tsupport API

### Archive Result

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Noop Result

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Merge Action Results A

- 타입: n8n-nodes-base.merge / version=3.2
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.merge
- Credential: 없음

### Merge Action Results B

- 타입: n8n-nodes-base.merge / version=3.2
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.merge
- Credential: 없음

### Merge All Results

- 타입: n8n-nodes-base.merge / version=3.2
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.merge
- Credential: 없음

### Build Monitor Payload

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Monitor Teams Webhook

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 가공된 결과를 Power Automate 또는 알림용 엔드포인트로 전달합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://redacted.invalid/powerautomate/webhook
- Credential: 없음


## 외부 시스템 연동

- Load Notion Calendar: HTTP API 호출 -> https://api.notion.com/v1/databases/205cb995-8309-80e4-ac2a-c8589a1783eb/query
- Create Notion Page: HTTP API 호출 -> https://api.notion.com/v1/pages
- Update Notion Page: HTTP API 호출 -> =https://api.notion.com/v1/pages/{{ $json.pageId }}
- Archive Notion Page: HTTP API 호출 -> =https://api.notion.com/v1/pages/{{ $json.pageId }}
- Monitor Teams Webhook: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook

## 해석 근거

- 워크플로우 이름: Synchronize-Vacation
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- API 정의만 기준으로 보았을 때 즉시 드러나는 구조적 위험은 크지 않습니다.

## Credential 참조

- Node Load Notion Calendar -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)
- Node Create Notion Page -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)
- Node Update Notion Page -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)
- Node Archive Notion Page -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)

## API 관리 파일

- JSON payload: Synchronize-Vacation_api.json
- PowerShell upsert script: Synchronize-Vacation_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)