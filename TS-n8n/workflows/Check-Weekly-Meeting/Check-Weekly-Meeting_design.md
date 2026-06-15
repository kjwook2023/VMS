# Check-Weekly-Meeting Design

## Retired Status

- Retired on: `2026-06-15`
- Server workflow ID `vUILQ5GOQfdHJTsx` was deactivated and deleted from the n8n server.
- The local workflow files are retained only for history or intentional restore work.

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: Check-Weekly-Meeting
- Workflow ID: vUILQ5GOQfdHJTsx
- Active on server: False (`deleted on 2026-06-15`)
- Archived: False
- Created at: 2026-03-03T06:14:34.602Z
- Updated at: 2026-06-08T22:20:54.853Z
- Version counter: 96
- Node count: 11
- Connection source count: 10

## 업무 목적 초안

초안 목적: 주간회의 일정을 확인하고 참석자에게 알림을 보내기 위한 자동화로 보입니다.

## 언제 실행되는가

- Clean-DailyScrum: 매주 Mon, Tue, Wed, Thu, Fri 8:00 에 실행되도록 설정되어 있습니다.

## 전체 흐름

- HTTP Request -> Holiday DB Fallback
- 휴일체크 -> 오늘 일정 조회
- Clean-DailyScrum -> Weekday Baseline
- 공공데이터 조회 -> 휴일체크
- 오늘 일정 조회 -> 오늘 주간회의 확인
- 오늘 주간회의 확인 -> 기술지원캘린더
- 기술지원캘린더 -> 회의 알림 대상 및 팀즈 메시지 생성
- 회의 알림 대상 및 팀즈 메시지 생성 -> 주간회의 팀즈 알림 전송
- Weekday Baseline -> HTTP Request
- Holiday DB Fallback -> 공공데이터 조회

## 노드별 역할과 목적

### HTTP Request

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 공공 기준 데이터를 조회하며, 휴일 또는 캘린더 확인 목적일 가능성이 높습니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url==http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear={{ $json['Year'] }}&numOfRows=50&ServiceKey=ea205130648aa0e11f1cc778bef29d18ef68b212e587c5590792dbd4f0a6b5c0
- Credential: 없음

### 휴일체크

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 공휴일 여부를 기준으로 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Clean-DailyScrum

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

### 공공데이터 조회

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected
- Credential: 없음

### 오늘 일정 조회

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url==https://graph.microsoft.com/v1.0/me/calendar/calendarView
- Credential: jwkim

### 오늘 주간회의 확인

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### 기술지원캘린더

- 타입: n8n-nodes-base.notion / version=2.2
- 역할: Notion에서 업무, 이슈, 일정 데이터를 조회합니다.
- 필요한 이유: 이 노드가 없으면 Notion에 저장된 원본 데이터를 읽을 수 없습니다.
- 해석 근거: type=n8n-nodes-base.notion
- Credential: tsupport API

### 회의 알림 대상 및 팀즈 메시지 생성

- 타입: n8n-nodes-base.code / version=2
- 역할: 알림 본문과 수신자 관련 데이터를 조합합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, meeting message logic detected
- Credential: 없음

### 주간회의 팀즈 알림 전송

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 가공된 결과를 Power Automate 또는 알림용 엔드포인트로 전달합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://redacted.invalid/powerautomate/webhook
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


## 외부 시스템 연동

- HTTP Request: HTTP API 호출 -> =http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear={{ $json['Year'] }}&numOfRows=50&ServiceKey=ea205130648aa0e11f1cc778bef29d18ef68b212e587c5590792dbd4f0a6b5c0
- 오늘 일정 조회: HTTP API 호출 -> =https://graph.microsoft.com/v1.0/me/calendar/calendarView
- 기술지원캘린더: Notion 데이터베이스 조회 -> 기술지원캘린더DB
- 주간회의 팀즈 알림 전송: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook

## 해석 근거

- 워크플로우 이름: Check-Weekly-Meeting
- data.go.kr 호출이 있어 공휴일 또는 기준 데이터 조회 성격이 있음을 추정할 수 있습니다.
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- 코드 노드에서 공휴일 여부를 계산하는 로직이 보입니다.
- 코드 노드에서 회의 또는 스프린트 안내 메시지를 만드는 로직이 보입니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- HTTP 노드가 TLS 없는 endpoint 를 사용합니다: HTTP Request

## Credential 참조

- Node 오늘 일정 조회 -> microsoftOutlookOAuth2Api / jwkim (QrARH25rhyVoJNXv)
- Node 기술지원캘린더 -> notionApi / tsupport API (LrLyYGhPvHMbPfZm)
- Node Holiday DB Fallback -> microsoftSql / TsMgmt(DevTest_SQL2022_26) (2dZb5OQPbTyO3052)

## API 관리 파일

- JSON payload: Check-Weekly-Meeting_api.json
- PowerShell upsert script: Check-Weekly-Meeting_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)
