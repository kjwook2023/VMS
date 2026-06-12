# Check-n8n-health Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: Check-n8n-health
- Workflow ID: weTOeGZtWSOjeluM
- Active: True
- Archived: False
- Created at: 2025-10-30T05:44:16.985Z
- Updated at: 2026-05-20T22:34:56.000Z
- Version counter: 46
- Node count: 7
- Connection source count: 5

## 업무 목적 초안

초안 목적: 일반 자동화 워크플로우입니다. 정확한 업무 목적은 소유자 확인이 필요합니다.

## 언제 실행되는가

- Health Schedule: 스케줄 필드: cronExpression; 스케줄 필드: cronExpression

## 전체 흐름

- Health Schedule -> Microsoft SQL
- Microsoft SQL -> DataMap
- DataMap -> Build Teams Payload
- Build Teams Payload -> Monitor Teams Webhook
- Build Teams Payload -> Is Warning
- Is Warning -> Send Warning Mail

## 노드별 역할과 목적

### Health Schedule

- 타입: n8n-nodes-base.scheduleTrigger / version=1.3
- 역할: 정해진 시각에 워크플로우를 시작합니다.
- 필요한 이유: 이 노드가 없으면 정기 실행이 되지 않아 수동 실행에 의존하게 됩니다.
- 해석 근거: type=n8n-nodes-base.scheduleTrigger
- Credential: 없음

### Microsoft SQL

- 타입: n8n-nodes-base.microsoftSql / version=1.1
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.microsoftSql
- Credential: TsMgmt(DevTest_SQL2022_26)

### DataMap

- 타입: n8n-nodes-base.set / version=3.4
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.set
- Credential: 없음

### Build Teams Payload

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

### Is Warning

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### Send Warning Mail

- 타입: n8n-nodes-base.microsoftOutlook / version=2
- 역할: Outlook 일정 또는 이벤트 데이터를 읽습니다.
- 필요한 이유: 이 노드가 없으면 회의나 일정 데이터를 기준 정보로 사용할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.microsoftOutlook
- Credential: jwkim


## 외부 시스템 연동

- Monitor Teams Webhook: HTTP API 호출 -> https://redacted.invalid/powerautomate/webhook
- Send Warning Mail: Outlook 일정 조회 -> calendar= ; event=

## 해석 근거

- 워크플로우 이름: Check-n8n-health
- 스케줄 트리거가 있어 시간 기반 자동화임을 알 수 있습니다.
- Power Automate 호출이 있어 후속 알림 전송 단계가 있음을 추정할 수 있습니다.

## 확인 필요 사항 / 위험

- API 정의만 기준으로 보았을 때 즉시 드러나는 구조적 위험은 크지 않습니다.

## Credential 참조

- Node Microsoft SQL -> microsoftSql / TsMgmt(DevTest_SQL2022_26) (2dZb5OQPbTyO3052)
- Node Send Warning Mail -> microsoftOutlookOAuth2Api / jwkim (QrARH25rhyVoJNXv)

## API 관리 파일

- JSON payload: Check-n8n-health_api.json
- PowerShell upsert script: Check-n8n-health_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)