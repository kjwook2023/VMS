# n8n Teams Control Design

## 범위

`192.168.1.85` 서버의 n8n 상태 점검과 제어를 Teams로 옮기기 위한 구조 정리 문서다.

## 현재 가능한 것

### 1. 모니터링 알림 이관

가능하다.

- 기존 `CheckServerHealth Data`의 Slack 알림을 Teams 웹훅으로 이관
- 현재 기준은 `ServerHealthLog` 수집 중단 감시

### 2. Teams 명령형 인터페이스

가능하다. 다만 Slack의 `/n8n-status` 같은 슬래시 명령을 그대로 복제하는 방식이 아니라 Teams 방식으로 구현해야 한다.

권장 방식:

- `Teams Bot` 또는 `Outgoing Webhook`
- 명령 예시:
  - `@n8n-control status`
  - `@n8n-control start`
  - `@n8n-control stop`
  - `@n8n-control interval 10`

## 즉시 실사용 가능 여부

### 바로 가능한 항목

- Teams 알림 이관

### 바로 불가능한 항목

- Teams에서 입력한 명령으로 `192.168.1.85` OS 서비스 직접 제어

이유:

1. Teams 쪽 등록 필요
- `Outgoing Webhook` 또는 `Bot` 앱 등록 필요

2. 서버 실행 경로 필요
- 현재 저장소와 n8n 워크플로우에는 `192.168.1.85`에서 `systemctl status/start/stop n8n`를 실행할 경로가 없다
- 최소 아래 중 하나가 필요
  - SSH 접속 credential
  - 85번 서버의 내부 제어 API
  - 제한된 명령만 허용하는 실행 에이전트

3. 권한 통제 필요
- 허용 사용자 화이트리스트
- 실행 이력 저장
- `start/stop` 같은 위험 명령 확인 절차

## 권장 구현 순서

1. Teams 모니터링 알림 적용
2. `status` 조회부터 우선 구현
3. `start/stop/interval`은 승인 가능한 실행 경로 확보 후 적용

## 권장 아키텍처

- Teams `@n8n-control status`
- Teams Bot/Outgoing Webhook
- n8n Webhook Workflow
- 내부 제어 API 또는 SSH 실행기
- `192.168.1.85` Linux 서버

## 결론

- 알림 이관은 바로 적용 가능
- 명령 제어는 구조적으로 가능
- 하지만 `192.168.1.85` 명령 실행 경로가 아직 없어서 현재 상태로는 즉시 실사용 불가
