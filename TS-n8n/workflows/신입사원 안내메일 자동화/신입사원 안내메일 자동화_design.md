# 신입사원 안내메일 자동화 Design

## 문서 성격

- 이 문서는 n8n Public API 정의를 기준으로 자동 생성한 초안입니다.
- 업무 목적과 노드 역할 설명에는 노드 이름, 코드, URL, 연결 구조를 바탕으로 한 해석이 포함됩니다.
- 실제 운영 목적과 세부 정책은 워크플로우 소유자가 최종 보정해야 합니다.

## 기본 정보

- Workflow name: 신입사원 안내메일 자동화
- Workflow ID: PKNPjyPvAyVXNrCc
- Active: True
- Archived: False
- Created at: 2025-11-07T05:57:28.715Z
- Updated at: 2026-04-14T02:30:43.000Z
- Version counter: 80
- Node count: 7
- Connection source count: 6

## 업무 목적 초안

초안 목적: 일반 자동화 워크플로우입니다. 정확한 업무 목적은 소유자 확인이 필요합니다.

## 언제 실행되는가

- 신입사원 관련 메일 수신: 시작 노드이며 타입은 n8n-nodes-base.microsoftOutlookTrigger 입니다.

## 전체 흐름

- 신입사원 관련 메일 수신 -> 답장 여부 확인
- 메일 발신자 확인 -> 신입사원 안내 메일 확인
- 메일 발신자 확인 -> 메일 사서함 변경
- 신입사원 안내 메일 확인 -> 메일 상태 읽음으로 변경
- 신입사원 안내 메일 확인 -> 메일 사서함 변경
- 메일 상태 읽음으로 변경 -> 신입사원 안내 메일 발송
- 답장 여부 확인 -> 메일 사서함 변경
- 답장 여부 확인 -> 메일 발신자 확인

## 노드별 역할과 목적

### 신입사원 관련 메일 수신

- 타입: n8n-nodes-base.microsoftOutlookTrigger / version=1
- 역할: 일반 처리 노드입니다. 정확한 의도는 추가 확인이 필요합니다.
- 필요한 이유: 입력, 처리, 출력 단계 중 한 부분을 담당하기 위해 존재합니다.
- 해석 근거: type=n8n-nodes-base.microsoftOutlookTrigger
- Credential: tsupport

### 메일 발신자 확인

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### 신입사원 안내 메일 확인

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음

### 메일 상태 읽음으로 변경

- 타입: n8n-nodes-base.microsoftOutlook / version=2
- 역할: Outlook 일정 또는 이벤트 데이터를 읽습니다.
- 필요한 이유: 이 노드가 없으면 회의나 일정 데이터를 기준 정보로 사용할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.microsoftOutlook
- Credential: tsupport

### 메일 사서함 변경

- 타입: n8n-nodes-base.microsoftOutlook / version=2
- 역할: Outlook 일정 또는 이벤트 데이터를 읽습니다.
- 필요한 이유: 이 노드가 없으면 회의나 일정 데이터를 기준 정보로 사용할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.microsoftOutlook
- Credential: tsupport

### 신입사원 안내 메일 발송

- 타입: n8n-nodes-base.microsoftOutlook / version=2
- 역할: Outlook 일정 또는 이벤트 데이터를 읽습니다.
- 필요한 이유: 이 노드가 없으면 회의나 일정 데이터를 기준 정보로 사용할 수 없습니다.
- 해석 근거: type=n8n-nodes-base.microsoftOutlook
- Credential: tsupport

### 답장 여부 확인

- 타입: n8n-nodes-base.if / version=2.2
- 역할: 조건에 따라 흐름을 분기합니다.
- 필요한 이유: 이 노드가 없으면 조건에 따라 중단하거나 다른 경로로 보내는 제어가 어렵습니다.
- 해석 근거: type=n8n-nodes-base.if
- Credential: 없음


## 외부 시스템 연동

- 메일 상태 읽음으로 변경: Outlook 일정 조회 -> calendar= ; event=
- 메일 사서함 변경: Outlook 일정 조회 -> calendar= ; event=
- 신입사원 안내 메일 발송: Outlook 일정 조회 -> calendar= ; event=

## 해석 근거

- 워크플로우 이름: 신입사원 안내메일 자동화

## 확인 필요 사항 / 위험

- API 정의만 기준으로 보았을 때 즉시 드러나는 구조적 위험은 크지 않습니다.

## Credential 참조

- Node 신입사원 관련 메일 수신 -> microsoftOutlookOAuth2Api / tsupport (QrARH25rhyVoJNXv)
- Node 메일 상태 읽음으로 변경 -> microsoftOutlookOAuth2Api / tsupport (QrARH25rhyVoJNXv)
- Node 메일 사서함 변경 -> microsoftOutlookOAuth2Api / tsupport (QrARH25rhyVoJNXv)
- Node 신입사원 안내 메일 발송 -> microsoftOutlookOAuth2Api / tsupport (QrARH25rhyVoJNXv)

## API 관리 파일

- JSON payload: 신입사원 안내메일 자동화_api.json
- PowerShell upsert script: 신입사원 안내메일 자동화_api.ps1

## JSON 구성

생성된 JSON payload 에는 아래 항목이 포함됩니다.

- name
- nodes
- connections
- settings
- description (존재할 때만)