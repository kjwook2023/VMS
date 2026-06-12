# TS-n8n Session Handoff

## 문서 목적

이 문서는 `2026-05-27` 세션 종료 시점 기준으로, 재부팅 후 새 세션에서 작업을 바로 이어가기 위한 인수인계 문서다.

이번 세션에서 한 일:

- 기존 handoff/설계 문서를 읽고 이전 작업 맥락 복원
- 주요 워크플로우, Outlook, VMS Works, Teams 연동 구조 재정리
- 다음 세션에서 바로 이어갈 작업 후보 정리

이번 세션에서 하지 않은 일:

- n8n 서버 상태 재조회
- 실제 워크플로우 실행 결과 재검증
- API 호출 또는 배포 반영

즉, 아래 내용 중 운영 상태 관련 항목은 "기존 문서 기준 마지막 확인 상태"이며, 새 세션에서 필요 시 재검증이 필요하다.

## 이번 세션에서 참고한 문서

- [docs/session_handoff_2026-05-06.md](D:/KJWOOK2023/vms/ts-n8n/docs/session_handoff_2026-05-06.md)
- [docs/n8n_teams_control_design_2026-05-15.md](D:/KJWOOK2023/vms/ts-n8n/docs/n8n_teams_control_design_2026-05-15.md)
- [docs/Workflow-Notion-Teams-Interface.md](D:/KJWOOK2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)

## 작업 루트

- 작업 루트: `D:\KJWOOK2023\vms\ts-n8n`
- n8n 환경 파일: [n8n.env](D:/KJWOOK2023/vms/ts-n8n/n8n.env)
- 워크플로우 폴더: [workflows](D:/KJWOOK2023/vms/ts-n8n/workflows)
- VMS Works 관련 폴더: [credentials/vmsworks](D:/KJWOOK2023/vms/ts-n8n/credentials/vmsworks)

주의:

- `n8n.env`, `credentials/vmsworks/vmsworks.env`에는 실제 접속 정보가 있다.
- 문서는 UTF-8로 저장되어 있고, 터미널에서는 한글이 깨져 보일 수 있다.
- 터미널 출력이 깨졌다고 파일 자체가 손상됐다고 단정하면 안 된다.

## 현재까지 정리된 핵심 맥락

### 1. Check-Weekly-Meeting

핵심 상태:

- 워크플로우명: `Check-Weekly-Meeting`
- workflow id: `vUILQ5GOQfdHJTsx`
- 기존 문서상 상태: `active=true`

이미 반영된 구조:

- 공휴일이면 중단
- Outlook `tsupport` credential로 오늘 일정 조회
- 오늘 일정 중 제목이 `기술지원파트 주간회의`인 일정만 통과
- Notion `기술지원캘린더DB`에서 당일 휴가자 조회
- 휴가자 제외 후 Teams 멘션 메시지 생성
- 기존 Power Automate HTTP endpoint로 전송

이전 세션 결론:

- 서버 반영 완료
- 실제 운영에서 정상 동작 피드백을 받았음

관련 파일:

- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md](D:/KJWOOK2023/vms/ts-n8n/workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)
- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json](D:/KJWOOK2023/vms/ts-n8n/workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json)
- [workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.ps1](D:/KJWOOK2023/vms/ts-n8n/workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.ps1)

### 2. TS-Inform_New_Issue

핵심 상태:

- 워크플로우명: `TS-Inform_New_Issue`
- workflow id: `0HGC4fQns5NxqIhv`
- 기존 문서상 상태: `active=true`

이미 반영된 구조:

- 기존 Webhook 기반 push에서 `Schedule Trigger` 기반 Pull로 전환
- Notion `연구소백로그DB`를 주기적으로 조회
- 평일 `08:00~18:00` 동안 상태 `등록` 이슈를 30분마다 반복 알림
- 주말/공휴일은 `09:00` 1회 알림
- 평일인데 대상 3명 전원 휴가면 `09:00` 1회 알림
- 평일에는 휴가자 제외 후 알림
- `workflow static data`를 사용해 1회성 알림 시간 제어
- Notion 제목 옆 `바로가기` 링크 포함

이전 세션 결론:

- 서버 반영 완료
- 당시 최근 실행들이 연속 `success`

관련 파일:

- [workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_design.md](D:/KJWOOK2023/vms/ts-n8n/workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_design.md)
- [workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.json](D:/KJWOOK2023/vms/ts-n8n/workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.json)
- [workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.ps1](D:/KJWOOK2023/vms/ts-n8n/workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.ps1)

### 3. Check_My_Schedule

핵심 상태:

- 워크플로우명: `Check_My_Schedule`
- workflow id: `r5E714mPyTyGgwbE`
- 기존 문서상 상태: `active=false`
- 수동 실행용 초안

현재 구조:

- `Manual Trigger`
- `Build Schedule Request`
- `Get Schedule`
- `Summarize Daily Schedule`

핵심 동작:

- `POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule`
- Outlook credential은 `tsupport`
- 기본 대상자는 `jwkim@vms-solutions.com`
- 상세 일정 내용이 아니라 "오늘 일정이 있는지"만 판정
- `scheduleItems` 존재 여부와 `availabilityView` 값을 기준으로 판단

현재 의미:

- 조직 권한이 낮아도 개인 일정의 존재 여부만 확인하는 용도의 초안 워크플로우
- 아직 알림 노드는 없음

관련 파일:

- [workflows/Check_My_Schedule/Check_My_Schedule_design.md](D:/KJWOOK2023/vms/ts-n8n/workflows/Check_My_Schedule/Check_My_Schedule_design.md)
- [workflows/Check_My_Schedule/Check_My_Schedule_api.json](D:/KJWOOK2023/vms/ts-n8n/workflows/Check_My_Schedule/Check_My_Schedule_api.json)
- [workflows/Check_My_Schedule/Check_My_Schedule_api.ps1](D:/KJWOOK2023/vms/ts-n8n/workflows/Check_My_Schedule/Check_My_Schedule_api.ps1)

## Outlook 관련 정리

핵심 credential:

- 이름: `tsupport`
- 타입: `microsoftOutlookOAuth2Api`

이미 정리된 결론:

- `tsupport` 하나로 운영 가능
- 다른 사람 일정은 `/users/{email}` 직접 접근보다 `shared calendar` 또는 `getSchedule` 방식이 더 적합
- `/v1.0/me/calendar/calendarView`는 성공
- `/v1.0/users/mykim@vms-solutions.com/calendar/calendarView`는 실패한 이력이 있음

문서상 공유 캘린더 확인 결과:

- 보이는 개인 일정: `김진욱`, `강군석`, `정구환(Eric)`
- 안 보이는 사람: `김민영`, `조현재`
- 회의실/기타 캘린더도 일부 보임

실무 결론:

- 사람별 Outlook credential을 새로 만들기보다는 `tsupport` 사서함에 필요한 일정 공유를 추가하는 쪽이 낫다.
- 일정 유무만 확인하면 되는 경우 Graph `getSchedule`이 적합하다.

## VMS Works 관련 정리

이미 확인된 사실:

- `https://vms-works.com/health`는 `healthy`
- `VMS_WORKS_API` 값만으로 `/api/leaves` 직접 호출은 실패
- ID/PW 로그인 후 세션 기반 접근은 성공

문서상 유효 엔드포인트:

- `/api/dashboard/data`
- `/reports/resource/leave-calendar/data?year=YYYY&month=M&org_id=25`
- `/reports/resource/leave-calendar/daily-detail?date=YYYY-MM-DD&org_id=25`
- `/hr/leave-export/api/search?...`

핵심 결론:

- 휴가 판정의 안정적인 키는 `resource_id`
- `resource_name`은 표시용
- `username`은 기준 키로 부적합

기술지원파트 주요 매핑:

- `김진욱` -> `84`
- `김민영` -> `80`
- `조현재` -> `108`
- `강군석` -> `111`

참고 파일:

- [credentials/vmsworks/vmsworks.env](D:/KJWOOK2023/vms/ts-n8n/credentials/vmsworks/vmsworks.env)
- [credentials/vmsworks/vmsworks_resource_map.md](D:/KJWOOK2023/vms/ts-n8n/credentials/vmsworks/vmsworks_resource_map.md)

## Teams / Notion 연동 관련 정리

참고 문서:

- [docs/Workflow-Notion-Teams-Interface.md](D:/KJWOOK2023/vms/ts-n8n/docs/Workflow-Notion-Teams-Interface.md)

문서 성격:

- `active=true` 기준 워크플로우들의 Notion 연동 정보와 Teams/Power Automate webhook 정보를 정리한 표
- `Check-Weekly-Meeting`, `TS-Inform_New_Issue`, `Plan-Daily-Scrum`, `License-Approval-Alert` 등 다수 워크플로우의 연결 대상을 빠르게 찾을 수 있음

새 세션 활용 포인트:

- Teams webhook 이름과 URL 출처를 다시 찾을 때 이 문서를 먼저 본다.
- Notion DB 연결명을 다시 확인할 때도 이 문서를 우선 참고한다.

## Teams에서 n8n 제어 관련 정리

참고 문서:

- [docs/n8n_teams_control_design_2026-05-15.md](D:/KJWOOK2023/vms/ts-n8n/docs/n8n_teams_control_design_2026-05-15.md)

정리된 결론:

- Teams 알림 이관은 가능
- Teams 명령형 인터페이스도 구조적으로는 가능
- 하지만 `192.168.1.85` 서버에서 `systemctl status/start/stop n8n`를 실제 실행할 경로가 현재 없음

부족한 조건:

- Teams Bot 또는 Outgoing Webhook 등록
- SSH credential 또는 내부 제어 API 또는 제한된 실행 에이전트
- 권한 통제, 화이트리스트, 실행 이력, 위험 명령 확인 절차

즉시 가능한 것:

- 모니터링 알림 Teams 이관

아직 바로 못 하는 것:

- Teams에서 입력한 명령으로 `192.168.1.85` OS 서비스 직접 제어

## 다음 세션 우선 작업 후보

### 후보 1. Check_My_Schedule 확장

가장 자연스러운 다음 단계다.

- 대상자를 1명에서 다수로 확장
- `김민영`, `조현재`, `강군석` 등을 배열로 관리
- 결과를 JSON 정리 또는 Teams 알림 형태로 변환
- 수동 실행에서 스케줄 실행으로 전환

### 후보 2. Outlook 공유 일정 운영 정리

- `tsupport`에 필요한 사람 캘린더 공유/추가
- `/me/calendars` 기준 `이름 -> calendarId` 매핑 문서화
- 필요하면 `calendarView` 방식도 병행 검토

### 후보 3. VMS Works 기반 휴가 판정 고도화

- Notion 캘린더 대신 VMS Works 휴가 데이터를 직접 사용
- `resource_id` 기준으로 휴가자 판정
- 기술지원파트 `org_id=25` 기준 당일 휴가/공가/안식월 조회 로직 강화

## 재부팅 후 새 세션에서 바로 하면 되는 순서

1. 이 문서와 [docs/session_handoff_2026-05-06.md](D:/KJWOOK2023/vms/ts-n8n/docs/session_handoff_2026-05-06.md)를 먼저 읽기
2. 이번에 실제로 이어갈 작업이 `Check_My_Schedule` 확장인지, Outlook 공유 캘린더 정리인지, VMS Works 고도화인지 결정
3. 필요하면 `n8n.env`와 관련 워크플로우 폴더를 열어 API 스크립트/JSON부터 확인
4. 운영 상태가 중요하면 문서만 믿지 말고 n8n API로 active 상태와 최근 실행 결과를 재검증

## 가장 짧은 요약

- `Check-Weekly-Meeting`은 수정 후 운영 중인 상태로 문서화돼 있다.
- `TS-Inform_New_Issue`는 Pull 방식으로 전환되어 운영 중인 상태로 문서화돼 있다.
- `Check_My_Schedule`는 `getSchedule` 기반의 수동 실행 초안이고, 다음 작업의 중심 후보다.
- Outlook은 `tsupport` 1개 credential 중심으로 가는 방향이 맞다.
- VMS Works는 세션 로그인 기반 조회가 가능하고, 휴가 판정 키는 `resource_id`다.
- Teams 제어는 알림 이관은 가능하지만 서버 직접 제어는 실행 경로가 아직 없다.
- 이번 세션에서는 문서 정리만 했고, 서버/API 상태는 재검증하지 않았다.
