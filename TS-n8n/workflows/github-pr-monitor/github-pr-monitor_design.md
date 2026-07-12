# github-pr-monitor Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: github-pr-monitor
- Workflow ID: uHiUd0TH3pMU3O7I
- Active: True
- Archived: False
- Created at: 2025-12-03T00:01:29.734Z
- Updated at: 2026-05-21T07:01:27.716Z
- Version counter: 49
- Node count: 10
- Connection source count: 8

## 업무 목적 초안

초안 목적: GitHub Pull Request 상태를 확인하고 후속 알림 또는 처리 흐름으로 연결하기 위한 자동화로 보입니다.

## 언제 실행되는가

- Schedule Trigger: 매주 Mon, Tue, Wed, Thu, Fri 9:00 에 실행되도록 설정되어 있습니다.

## 전체 흐름

- Schedule Trigger -> Weekday Baseline
- Get-OpenPR-Mozart2.0 -> Code in JavaScript
- Code in JavaScript -> Teams Webhook
- HTTP Request -> Holiday DB Fallback
- Code in JavaScript1 -> If
- If -> Get-OpenPR-Mozart2.0
- Weekday Baseline -> HTTP Request
- Holiday DB Fallback -> Code in JavaScript1

## 노드별 역할과 목적

### Schedule Trigger

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

### Get-OpenPR-Mozart2.0

- 타입: n8n-nodes-base.github / version=1.1
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.github
- Credential: `__N8N_GITHUB_CREDENTIAL_NAME__` placeholder in repo export

### Code in JavaScript

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Send a message

- 타입: n8n-nodes-base.slack / version=2.3
- 역할: 최종 결과를 Slack으로 전송합니다.
- 필요한 이유: 이 노드가 없으면 Slack으로 결과를 전달할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.slack, channel=프로젝트-mozart
- Credential: tsbot-slackAPI

### HTTP Request

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 공공 기준 데이터를 조회하며, 휴일 또는 캘린더 확인 목적일 가능성이 높습니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url==http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear={{ $json['Year'] }}&numOfRows=50&ServiceKey=ea205130648aa0e11f1cc778bef29d18ef68b212e587c5590792dbd4f0a6b5c0
- Credential: 없음

### Code in JavaScript1

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected
- Credential: 없음

### If

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 공휴일 여부를 기준으로 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
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

### Teams Webhook

- 타입: n8n-nodes-base.httpRequest / version=4.2
- 역할: 가공된 결과를 Power Automate 또는 알림용 엔드포인트로 전달합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://redacted.invalid/powerautomate/webhook
- Credential: 없음


## 외부 시스템 연동

- Send a message: Slack 전송 대상 -> 프로젝트-mozart
- HTTP Request: HTTP API 호출 -> =http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear={{ $json['Year'] }}&numOfRows=50&ServiceKey=ea205130648aa0e11f1cc778bef29d18ef68b212e587c5590792dbd4f0a6b5c0
- Teams Webhook: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook

## 해석 근거

- 워크플로우 이름: github-pr-monitor
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- data.go.kr 호출이 있어 공휴일 또는 기준 데이터 조회 성격이 있음을 추정할 수 있습니다.
- 코드 노드에서 공휴일 여부를 계산하는 로직이 보입니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- 연결되지 않은 노드가 있습니다: Send a message
- HTTP 노드가 TLS 없는 endpoint 를 사용합니다: HTTP Request

## Credential 참조

- Node Get-OpenPR-Mozart2.0 -> githubApi / `__N8N_GITHUB_CREDENTIAL_NAME__` (repo placeholder; deploy-time env injection)
- Node Send a message -> slackApi / tsbot-slackAPI (pOho5rxIJo9ZU9ee)
- Node Holiday DB Fallback -> microsoftSql / TsMgmt(DevTest_SQL2022_26) (2dZb5OQPbTyO3052)

## API 관리 파일

- JSON payload: github-pr-monitor_api.json
- PowerShell upsert script: github-pr-monitor_api.ps1
- Deploy note: set `N8N_GITHUB_CREDENTIAL_NAME` before running the upsert script from this repo-safe export

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)
