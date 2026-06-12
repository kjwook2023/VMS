# Lunch-Recommendation-Alert Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: Lunch-Recommendation-Alert
- Workflow ID: 7ofktWnZ4NjfSuEB
- Active: True
- Archived: False
- Created at: 2026-06-10T05:18:45.125Z
- Updated at: 2026-06-11T06:48:23.928Z
- Version counter: 16
- Node count: 21
- Connection source count: 20

## 업무 목적 초안

초안 목적: 일반 자동화 워크플로우입니다. 정확한 업무 목적은 소유자 확인이 필요합니다.

## 언제 실행되는가

- Lunch Recommendation Schedule: 스케줄 필드: cronExpression
- More Recommendation Webhook: 외부에서 GET lunch-menu-recommend-more 형태로 호출되는 웹훅 시작점입니다.

## 전체 흐름

- Lunch Recommendation Schedule -> Weekday Baseline
- More Recommendation Webhook -> Weekday Baseline
- Weekday Baseline -> Holiday DB Fallback
- Holiday DB Fallback -> Determine Holiday
- Determine Holiday -> Not Holiday
- Not Holiday -> Resolve Recommendation Center
- Resolve Recommendation Center -> Build Search Center
- Build Search Center -> Fetch Weather Forecast
- Fetch Weather Forecast -> Summarize Weather
- Summarize Weather -> Search Walkable Restaurants
- Search Walkable Restaurants -> Search Drive Restaurants East
- Search Drive Restaurants East -> Search Drive Restaurants West
- Search Drive Restaurants West -> Search Drive Restaurants North
- Search Drive Restaurants North -> Search Drive Restaurants South
- Search Drive Restaurants South -> Select Candidate Places
- Select Candidate Places -> Build Gemini Request
- Build Gemini Request -> Ask Gemini Lunch Recommendation
- Ask Gemini Lunch Recommendation -> Parse Recommendation
- Parse Recommendation -> Build Teams Payload
- Build Teams Payload -> Lunch Teams Webhook

## 노드별 역할과 목적

### Lunch Recommendation Schedule

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

### More Recommendation Webhook

- 타입: n8n-nodes-base.webhook / version=2.1
- 역할: 외부 시스템에서 들어오는 입력을 받습니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템이 이벤트를 이 워크플로우로 전달할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.webhook
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

### Resolve Recommendation Center

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://dapi.kakao.com/v2/local/search/address.json
- Credential: kakao-local-lunch-recommendation

### Build Search Center

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Fetch Weather Forecast

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://api.open-meteo.com/v1/forecast
- Credential: 없음

### Summarize Weather

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Search Walkable Restaurants

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://dapi.kakao.com/v2/local/search/category.json
- Credential: kakao-local-lunch-recommendation

### Search Drive Restaurants East

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://dapi.kakao.com/v2/local/search/category.json
- Credential: kakao-local-lunch-recommendation

### Search Drive Restaurants West

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://dapi.kakao.com/v2/local/search/category.json
- Credential: kakao-local-lunch-recommendation

### Search Drive Restaurants North

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://dapi.kakao.com/v2/local/search/category.json
- Credential: kakao-local-lunch-recommendation

### Search Drive Restaurants South

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://dapi.kakao.com/v2/local/search/category.json
- Credential: kakao-local-lunch-recommendation

### Select Candidate Places

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Build Gemini Request

- 타입: n8n-nodes-base.code / version=2
- 역할: 원본 데이터를 바탕으로 공휴일 여부를 계산하고 다음 분기 판단에 쓸 값을 만듭니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code, holiday logic detected
- Credential: 없음

### Ask Gemini Lunch Recommendation

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 외부 HTTP API를 호출합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent
- Credential: 없음

### Parse Recommendation

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Build Teams Payload

- 타입: n8n-nodes-base.code / version=2
- 역할: 기본 노드만으로 표현하기 어려운 업무 규칙을 코드로 처리합니다.
- 필요한 이유: 이 노드가 없으면 복잡한 업무 규칙을 기본 노드만으로 표현하기 어렵습니다.
- 해석 근거: type=n8n-nodes-base.code
- Credential: 없음

### Lunch Teams Webhook

- 타입: n8n-nodes-base.httpRequest / version=4.3
- 역할: 가공된 결과를 Power Automate 또는 알림용 엔드포인트로 전달합니다.
- 필요한 이유: 이 노드가 없으면 외부 시스템에서 데이터를 가져오거나 외부로 결과를 보낼 수 없습니다.
- 해석 근거: type=n8n-nodes-base.httpRequest, url=https://redacted.invalid/powerautomate/webhook
- Credential: 없음


## 외부 시스템 연동

- Resolve Recommendation Center: HTTP API 호출 -> https://dapi.kakao.com/v2/local/search/address.json
- Fetch Weather Forecast: HTTP API 호출 -> https://api.open-meteo.com/v1/forecast
- Search Walkable Restaurants: HTTP API 호출 -> https://dapi.kakao.com/v2/local/search/category.json
- Search Drive Restaurants East: HTTP API 호출 -> https://dapi.kakao.com/v2/local/search/category.json
- Search Drive Restaurants West: HTTP API 호출 -> https://dapi.kakao.com/v2/local/search/category.json
- Search Drive Restaurants North: HTTP API 호출 -> https://dapi.kakao.com/v2/local/search/category.json
- Search Drive Restaurants South: HTTP API 호출 -> https://dapi.kakao.com/v2/local/search/category.json
- Ask Gemini Lunch Recommendation: HTTP API 호출 -> https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent
- Lunch Teams Webhook: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook

## 해석 근거

- 워크플로우 이름: Lunch-Recommendation-Alert
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- 코드 노드에서 공휴일 여부를 계산하는 로직이 보입니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- API 정의만 기준으로 보았을 때 즉시 드러나는 구조적 위험은 크지 않습니다.

## Credential 참조

- Node Holiday DB Fallback -> microsoftSql / TsMgmt(DevTest_SQL2022_26) (2dZb5OQPbTyO3052)
- Node Resolve Recommendation Center -> httpHeaderAuth / kakao-local-lunch-recommendation (vnfOZARBTxbJ1sJU)
- Node Search Walkable Restaurants -> httpHeaderAuth / kakao-local-lunch-recommendation (vnfOZARBTxbJ1sJU)
- Node Search Drive Restaurants East -> httpHeaderAuth / kakao-local-lunch-recommendation (vnfOZARBTxbJ1sJU)
- Node Search Drive Restaurants West -> httpHeaderAuth / kakao-local-lunch-recommendation (vnfOZARBTxbJ1sJU)
- Node Search Drive Restaurants North -> httpHeaderAuth / kakao-local-lunch-recommendation (vnfOZARBTxbJ1sJU)
- Node Search Drive Restaurants South -> httpHeaderAuth / kakao-local-lunch-recommendation (vnfOZARBTxbJ1sJU)

## API 관리 파일

- JSON payload: Lunch-Recommendation-Alert_api.json
- PowerShell upsert script: Lunch-Recommendation-Alert_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)