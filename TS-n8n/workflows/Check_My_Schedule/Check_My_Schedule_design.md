# Check_My_Schedule

## 개요

`Check_My_Schedule` 는 Outlook 조직 일정에서 오늘 개인 일정이 있는지 여부만 확인하기 위한 초안 워크플로우다.  
현재 버전은 `tsupport` Outlook credential을 사용해 Microsoft Graph `getSchedule` API를 호출하고, 지정한 사용자의 오늘 일정 존재 여부를 JSON으로 정리해 반환한다.

현재 기본 대상자는 아래 1명으로 설정되어 있다.

- 김진욱 (`jwkim@vms-solutions.com`)

## 현재 목적

- 오늘 개인 일정이 존재하는지 여부 확인
- 일정 제목이나 상세가 아니라 `있음 / 없음` 판별에 집중
- 조직 기본 권한이 `free/busy` 수준이어도 사용할 수 있는 방식 우선 적용

## 현재 실행 방식

- 시작 노드: `Manual Trigger`
- 실행 형태: 수동 실행
- 산출 형태: 실행 결과 JSON
- 알림 전송: 아직 없음

즉, 지금은 운영 배포용 알림 워크플로우가 아니라 `조회 로직 초안`이다.

## 노드 구성

### 1. `Manual Trigger`

- 워크플로우를 수동으로 실행한다.
- 조회 로직 검증 단계이므로 자동 스케줄은 아직 넣지 않았다.

### 2. `Build Schedule Request`

- 한국 시간 기준 오늘 날짜를 계산한다.
- 조회 대상 사용자 목록을 만든다.
- Microsoft Graph `getSchedule` 요청 본문을 구성한다.

현재 요청 범위:

- 시작: 오늘 `00:00:00` KST
- 종료: 오늘 `23:59:59` KST
- 조회 단위: `30분`

### 3. `Get Schedule`

- `tsupport` Outlook credential로 `POST /v1.0/me/calendar/getSchedule` 호출
- 지정한 사용자 메일 주소의 오늘 free/busy 정보를 조회

이 방식의 장점:

- 사람별 개별 credential 없이 공용 서비스 계정 1개로 조회 가능
- 조직 기본 캘린더 권한이 낮아도 일정 존재 여부 확인에 적합

### 4. `Summarize Daily Schedule`

- Graph 응답을 읽어 대상자별 결과를 정리한다.
- `scheduleItems` 또는 `availabilityView` 기준으로 오늘 일정 존재 여부를 계산한다.

반환 예시 개념:

- 이름
- 메일 주소
- 오늘 일정 존재 여부 (`hasSchedule`)
- 바쁜 시간 블록 수 (`busyCount`)
- 시간대 목록 (`timeRanges`)

## 판단 기준

현재 초안의 `hasSchedule` 판정은 아래 조건 중 하나라도 만족하면 `true` 로 본다.

- `scheduleItems` 가 1건 이상 존재
- `availabilityView` 에 busy/tentative/oof 상태가 포함

즉, 오늘 캘린더에 바쁜 시간 블록이 하나라도 있으면 일정이 있다고 판단한다.

## 현재 한계

- 기본 대상자가 1명만 들어 있다.
- 수동 실행만 가능하다.
- Teams / Slack / Power Automate 알림 노드는 아직 없다.
- 일정 제목, 장소, 회의 링크는 조회 목적에 포함하지 않았다.
- 조직 권한이 `free/busy` 만 허용된 경우, 상세 일정 정보는 의도적으로 사용하지 않는다.

## 다음 확장 후보

- 대상자 배열을 여러 명으로 확장
- 매일 아침 또는 지정 시각에 자동 실행
- 오늘 일정이 없는 경우만 알림 전송
- 부서 구성원별 일정 유무 표 형태로 정리
- 휴가 정보와 결합해 근무 가능 여부까지 함께 판정
