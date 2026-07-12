# TS-n8n Session Handoff

## 문서 목적

이 문서는 `2026-05-06` 기준 현재 세션에서 수행한 작업을 다음 세션에서 즉시 이어갈 수 있도록 정리한 인수인계 문서다.

핵심 목표:

- 현재 n8n 워크플로우 변경 상태 확인
- 관련 문서/JSON/배포 스크립트 위치 확인
- VMS Works 및 Outlook credential 검증 결과 확인
- 다음 세션에서 바로 이어서 수정 가능한 수준으로 맥락 보존

## 작업 루트

- 작업 루트: `ts-n8n repository root`
- n8n 환경 파일: [n8n.env](../n8n.env)
- 워크플로우 폴더: [workflows](../workflows)
- VMS Works 관련 폴더: [credentials/vmsworks](../credentials/vmsworks)

주의:

- `n8n.env`, `credentials/vmsworks/vmsworks.env` 에는 실제 접속 정보가 있으므로 문서에는 비밀값을 직접 복사하지 않았다.
- 다음 세션에서도 이 두 env 파일을 기준으로 접속하면 된다.

## 현재 워크플로우 상태

주요 워크플로우 3개 상태는 아래와 같다.

- `Check-Weekly-Meeting`
  - id: `vUILQ5GOQfdHJTsx`
  - active: `true`
  - updatedAt: `2026-05-05T23:04:51.000Z`
- `TS-Inform_New_Issue`
  - id: `0HGC4fQns5NxqIhv`
  - active: `true`
  - updatedAt: `2026-05-04T08:00:14.659Z`
- `Check_My_Schedule`
  - id: `r5E714mPyTyGgwbE`
  - active: `false`
  - updatedAt: `2026-05-06T03:16:07.966Z`

최근 실행 확인:

- `TS-Inform_New_Issue` 는 `2026-05-06` 에 30분 단위 실행이 계속 성공 중이다.
- 최근 확인된 execution id:
  - `3828` at `2026-05-06T04:30:00.023Z`
  - `3827` at `2026-05-06T04:00:00.015Z`
  - `3826` at `2026-05-06T03:30:00.017Z`

## 생성된 문서 구조

Active 워크플로우별 폴더 및 3종 문서 구조는 이미 생성되어 있다.

형식:

- `워크플로우명_design.md`
- `워크플로우명_api.json`
- `워크플로우명_api.ps1`

대표 예시:

- [Check-Weekly-Meeting](../workflows/Check-Weekly-Meeting)
- [TS-Inform_New_Issue](../workflows/TS-Inform_New_Issue)
- [Check_My_Schedule](../workflows/Check_My_Schedule)

문서 생성기:

- [workflows/_generate_active_workflow_docs.ps1](../workflows/_generate_active_workflow_docs.ps1)
- [workflows/_workflow_doc_locale.ko.json](../workflows/_workflow_doc_locale.ko.json)

## 1. Check-Weekly-Meeting 변경 이력

대상 파일:

- [Check-Weekly-Meeting_design.md](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_design.md)
- [Check-Weekly-Meeting_api.json](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json)
- [Check-Weekly-Meeting_api.ps1](../workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.ps1)

원래 문제:

- 회의 날짜 비교가 없어서 사실상 평일마다 알림
- 잘못된 최종 Teams/Power Automate 노드 연결
- 휴가자 제외 로직 미구현
- 고정 `eventId` 기반이라 운영 안정성이 낮았음

적용된 변경:

- 공휴일 체크 이후에만 진행
- Outlook `tsupport` credential 로 오늘 일정 조회
- 오늘 일정 중 제목이 `기술지원파트 주간회의` 인 일정만 통과
- Notion `기술지원캘린더DB` 로 오늘 휴가자 확인
- 휴가자 제외 후 남은 사람에게 Teams 멘션 메시지 생성
- 최종 전송은 기존 Power Automate HTTP endpoint 유지

현재 흐름:

- Schedule Trigger
- 공공데이터 공휴일 체크
- 오늘 Outlook 일정 조회
- 오늘 주간회의 존재 여부 확인
- 기술지원캘린더 조회
- 알림 대상/메시지 생성
- Teams 알림 전송

상태:

- 서버 반영 완료
- 실제 운영에서 "잘된다"는 사용자 피드백 받음

## 2. TS-Inform_New_Issue 변경 이력

대상 파일:

- [TS-Inform_New_Issue_design.md](../workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_design.md)
- [TS-Inform_New_Issue_api.json](../workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.json)
- [TS-Inform_New_Issue_api.ps1](../workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.ps1)

원래 구조:

- Notion 신규 등록 시 Webhook 기반 push

변경 목표:

- 30분마다 Pull 방식으로 연구소 백로그를 확인
- 상태가 `등록` 인 이슈만 반복 알림
- 주말/공휴일과 평일 근무시간 규칙을 분리
- Notion 제목 옆 `바로가기` 링크 포함

적용된 주요 변경:

- `Webhook` 제거, `Schedule Trigger` 기반 Pull 로 전환
- Notion `연구소백로그DB` 주기 조회
- 평일 `08:00~18:00` 30분 주기 반복 알림
- 주말/공휴일은 `09:00` 1회 알림
- 평일이지만 3명 모두 휴가면 `09:00` 1회 + 3명 전체 멘션
- 평일에는 휴가자 제외 후 알림
- Power Automate endpoint 유지
- `workflow static data` 를 사용해 특별 시간대 1회 알림 제어

현재 기준 운영 규칙:

- 평일: `08:00~18:00`, 상태 `등록` 이면 30분마다 알림
- 주말/공휴일: `09:00` 에 1회
- 평일 전원 휴가: `09:00` 에 1회, 주말/공휴일과 동일 처리

상태:

- 서버 반영 완료
- 최근 실행들이 연속 `success`

## 3. VMS Works 조사 이력

대상 파일:

- [vmsworks.env](../credentials/vmsworks/vmsworks.env)
- [vmsworks_resource_map.md](../credentials/vmsworks/vmsworks_resource_map.md)

확인한 내용:

- `https://vms-works.com/health` 는 `healthy`
- `VMS_WORKS_API` 값만으로 `/api/leaves` 직접 호출은 실패
  - `Bearer` JWT 형식이 아님
- 로그인 ID/PW 를 사용한 세션 기반 접근은 성공

확인된 유효 엔드포인트:

- `/api/dashboard/data`
- `/reports/resource/leave-calendar/data?year=YYYY&month=M&org_id=25`
- `/reports/resource/leave-calendar/daily-detail?date=YYYY-MM-DD&org_id=25`
- `/hr/leave-export/api/search?...`

핵심 결론:

- 휴가 데이터의 안정적인 식별 키는 `resource_id`
- `resource_name` 은 표시용
- `username` 은 휴가 응답 payload 에 직접 안 나오는 경우가 있어 기준 키로 부적합

직접 확인한 기술지원파트 주요 resource:

- `김진욱` -> `resource_id 84`
- `김민영` -> `resource_id 80`
- `조현재` -> `resource_id 108`
- `강군석` -> `resource_id 111`

`vmsworks_resource_map.md` 에는 `/resources/` 기준 전체 `resource_id / resource_name` 매핑이 저장되어 있다.

## 4. Outlook tsupport credential 조사 이력

핵심 credential:

- Outlook credential name: `tsupport`
- credential type: `microsoftOutlookOAuth2Api`

이미 확인된 사실:

- `tsupport` 로 본인 일정 조회 가능
- 기존 `Check-Weekly-Meeting` 도 `me/calendars/.../calendarView` 사용 중

검증 결과:

- `GET /v1.0/me/calendar/calendarView` 성공
- `GET /v1.0/users/mykim@vms-solutions.com/calendar/calendarView` 실패
  - `The specified object was not found in the store.`

중요 해석:

- 다른 사람의 일정을 직접 `/users/{email}` 경로로 읽는 것은 현재 권한/공유 상태상 불안정
- 대신 `tsupport` 사서함에 추가된 공유 캘린더는 `/me/calendars` 에서 확인 가능

실제로 `tsupport` 의 `/me/calendars` 에서 보인 항목:

- 본인 일정: `김진욱`
- 개인 공유 일정: `강군석`, `정구환(Eric)`
- 회의실 일정:
  - `CFRoom1(2001호-대회의실)`
  - `CFRoom2(2001호-소회의실)`
  - `CFRoom3(2001호-소회의실)`
  - `CFRoom4(2009호)`
  - `CFRoom6(2010호)`
- 기타:
  - `생일`
  - `한국의 공휴일`

현재 안 보인 사람:

- `김민영`
- `조현재`

핵심 결론:

- 개인별 Outlook credential 을 따로 만들 필요는 없음
- 공용 `tsupport` 계정 1개를 기준으로 필요한 사람 일정만 공유/추가하면 됨
- 다른 사람 일정은 `/users/{email}` 직접 접근보다
  - `GET /me/calendars`
  - 대상 캘린더 `id` 확인
  - `GET /me/calendars/{id}/calendarView`
  순서가 더 적절함

조직 기본 권한 관련 판단:

- `My Organization = 일정 유무만 보기` 수준이면 상세 일정 제목/장소는 제한될 가능성이 큼
- 하지만 일정 존재 여부만 확인하는 목적이면 Graph `getSchedule` 이 더 적합

## 5. Check_My_Schedule 생성 이력

대상 파일:

- [Check_My_Schedule_design.md](../workflows/Check_My_Schedule/Check_My_Schedule_design.md)
- [Check_My_Schedule_api.json](../workflows/Check_My_Schedule/Check_My_Schedule_api.json)
- [Check_My_Schedule_api.ps1](../workflows/Check_My_Schedule/Check_My_Schedule_api.ps1)

생성 목적:

- 조직 권한이 낮아도 `오늘 개인 일정 존재 여부` 만 판단하는 초안 워크플로우 생성

현재 구조:

- `Manual Trigger`
- `Build Schedule Request`
- `Get Schedule`
- `Summarize Daily Schedule`

조회 방식:

- `POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule`
- Outlook credential: `tsupport`
- 기본 대상자: `jwkim@vms-solutions.com`

현재 상태:

- 서버에 생성 완료
- `active = false`
- 수동 실행용 초안
- 아직 알림 노드는 없음

판정 방식:

- `scheduleItems` 존재 여부
- `availabilityView` busy/tentative/oof 포함 여부

즉, 상세 일정이 아니라 오늘 일정이 있는지만 JSON 으로 판단한다.

## 정리된 다음 작업 후보

다음 세션에서 이어서 하기 좋은 순서는 아래와 같다.

### 후보 1. Check_My_Schedule 확장

- 대상자를 1명에서 다수로 확장
- `김민영`, `조현재`, `강군석` 등 배열화
- 결과를 표준 JSON 또는 Teams 알림으로 변환
- 수동 실행에서 스케줄 실행으로 전환

### 후보 2. Outlook 공유 일정 운영 정리

- `tsupport` 에 필요한 사람 캘린더 공유/추가
- `/me/calendars` 기준 `사람 이름 -> calendarId` 매핑 문서화
- 필요 시 `Check_My_Schedule` 를 `calendarView` 방식으로 확장

### 후보 3. VMS Works 기반 휴가 판정 고도화

- Notion 캘린더 대신 VMS Works 휴가 데이터를 직접 사용
- `resource_id` 기준 휴가자 판정
- 기술지원파트 `org_id=25` 기준으로 당일 휴가/공가/안식월 조회

## 운영상 주의사항

- 테스트용으로 생성한 임시 `codex-*` 워크플로우들은 정리 완료
- 현재 남아 있어야 하는 신규 워크플로우는 `Check_My_Schedule` 뿐
- 문서와 JSON은 UTF-8 기준으로 저장
- 터미널에서는 한글이 깨져 보여도 파일 자체가 깨졌다고 단정하지 말 것

## 바로 참고할 파일 목록

- [n8n.env](../n8n.env)
- [workflows/Check-Weekly-Meeting](../workflows/Check-Weekly-Meeting)
- [workflows/TS-Inform_New_Issue](../workflows/TS-Inform_New_Issue)
- [workflows/Check_My_Schedule](../workflows/Check_My_Schedule)
- [credentials/vmsworks/vmsworks.env](../credentials/vmsworks/vmsworks.env)
- [credentials/vmsworks/vmsworks_resource_map.md](../credentials/vmsworks/vmsworks_resource_map.md)

## 다음 세션 시작용 요약

가장 짧게 요약하면 아래와 같다.

- `Check-Weekly-Meeting` 은 수정 후 운영 중
- `TS-Inform_New_Issue` 는 Pull 방식으로 전환 후 운영 중
- VMS Works 는 세션 로그인 기반 조회 가능, 휴가 판정 키는 `resource_id`
- Outlook 은 `tsupport` 1개 credential 로 운영 가능
- 다른 사람 일정은 `/users/{email}` 직접 접근보다 `shared calendar` 또는 `getSchedule` 방식이 적합
- `Check_My_Schedule` 는 오늘 개인 일정 유무만 보는 수동 실행 초안으로 생성 완료
