# VMSCleanSlate 기능 설계

이 문서는 사용자 관점의 기능과 현재 동작 기준을 정리합니다.

## 1. 자동 실행 트리거

### 1.1 TriggerOnLogoff

- 기본값: `Y`
- 이벤트: `SystemEvents.SessionEnding`
- 조건: `Reason = Logoff`
- 동작: 사용자 정리(`-Logoff`)

### 1.2 TriggerOnShutdown

- 기본값: `Y`
- 이벤트: `SystemEvents.SessionEnding`
- 조건: `Reason = SystemShutdown`
- 동작:
  - `GPO Logoff` 미설치면 트레이 앱이 직접 사용자 정리
  - `GPO Logoff` 설치면 GPO 경로에 위임

### 1.3 TriggerOnLock

- 기본값: `N`
- 이벤트: `SystemEvents.SessionSwitch`
- 조건: `Reason = SessionLock`
- 동작: 비동기 사용자 정리(`-Logoff`)

주의:

- 잠금 시 정리는 일반 사용자 장비에서는 과도할 수 있습니다.

## 2. 정리 항목

### 2.1 WorkSchoolAccess

사용자 세션 정리 범위입니다.

- 회사/학교 계정 연결 파일 정리
- AAD BrokerPlugin/TokenBroker 파일 정리

### 2.2 DeviceEnrollmentCleanup

장치/관리자 정리 범위입니다.

- MDM Enrollment 레지스트리 정리
- EnterpriseMgmt 예약 작업 제거
- Provisioning/PolicyManager 관련 HKLM 정리
- 필요 시 `dsregcmd /leave`

이 항목은 장치 등록 해제를 수반할 수 있으므로 보수적으로 다뤄야 합니다.

### 2.3 Microsoft365

- Office 프로세스 종료
- Office/Outlook/OneDrive/Teams 관련 Credential Manager 정리
- Office 캐시/Identity 레지스트리 정리

### 2.4 OneDriveSignout

- `OneDrive.exe /signout`
- OneDrive 설정 및 HKCU 레지스트리 정리

### 2.5 OneDriveLocalFolder

- 기본값: `Y`
- `%USERPROFILE%\OneDrive*` 삭제

주의:

- 미동기화 파일 손실 가능성이 있습니다.

### 2.6 Teams / Notion / Slack

- 관련 프로세스 종료
- Electron/MSIX 저장소/세션/캐시 정리

### 2.7 BrowserCookies

이름과 달리 쿠키만 정리하지 않습니다.

- Chromium: `Cookies`, `Login Data`, `Web Data`, `IndexedDB`, `Local Storage`
- Firefox: `cookies.sqlite`, `logins.json`, `key4.db`, `sessionstore.jsonlz4`

즉, 저장 로그인과 일부 세션까지 정리합니다.

## 3. 트레이 메뉴 동작

### 3.1 Run Cleanup Now

1. 사용자 정리(`-Logoff`) 실행
2. `DeviceEnrollmentCleanup=Y` 면 장치 정리 필요 여부 판단
3. GPO Shutdown 이 설치되어 있으면 다음 종료 시점에 위임
4. 아니면 관리자 상승 후 `-Shutdown` 실행

### 3.2 Cleanup Then Logoff / Shutdown

1. `-Logoff`
2. 필요 시 상승된 `-Shutdown`
3. `shutdown.exe` 호출

### 3.3 AutoStart

- 트레이 메뉴 체크 시 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- 값 이름: `VMSCleanSlate`
- 현재 `2026-05-07` 확인에서는 등록되지 않은 상태

### 3.4 GPO Install

- 트레이 메뉴에서 관리자 상승 후 `--install-gpo` 또는 `--uninstall-gpo`
- 현재 `2026-05-07` 확인에서는 Logoff/Shutdown 모두 미설치

### 3.5 Settings Password

- `설정...` 메뉴는 암호를 통과해야 열림
- `설정 파일 열기` 메뉴도 같은 암호 보호 적용
- 암호는 빌드 시점에 고정된 해시값과 비교
- 현재 고정값은 기존 `pw.env` 의 `DEFAULT_PASSWORD` 값을 1회 참조해 반영한 값
- 배포 시 `pw.env` 파일은 필요하지 않음

### 3.6 Settings Help Tooltip

- 설정 화면 각 항목 오른쪽에 `i` 정보 아이콘 표시
- 아이콘 hover 시 상세 설명 툴팁 표시
- 체크박스 텍스트 hover 시에도 동일 설명 표시

## 4. 설정 파일

```json
{
  "TriggerOnLogoff": "Y",
  "TriggerOnShutdown": "Y",
  "TriggerOnLock": "N",
  "WorkSchoolAccess": "Y",
  "DeviceEnrollmentCleanup": "Y",
  "Microsoft365": "Y",
  "OneDriveSignout": "Y",
  "OneDriveLocalFolder": "Y",
  "Teams": "Y",
  "Notion": "Y",
  "Slack": "Y",
  "BrowserCookies": "Y",
  "HourlyNotify": "Y",
  "Backup": "N",
  "LogOnlyOnError": "Y"
}
```

### 4.1 HourlyNotify

- 기본값: `Y`
- `08:00` 부터 `18:59` 사이 매시 `55분` 에 시간 알림 표시
- 현재 구현은 윈도우 알림 센터에 남는 시스템 알림 대신, 몇 초 후 자동으로 사라지는 앱 내부 팝업을 사용

### 4.2 Backup

- 기본값: `N`
- `Y` 면 가능한 항목만 `backup\...` 아래에 백업 생성
- `-NoBackup` 스위치가 있으면 강제로 비활성화

### 4.3 LogOnlyOnError

- `Y`: `logoff_*.log`, `shutdown_*.log` 를 오류 때만 생성
- `N`: 성공/실패 모두 기록

## 5. 현재 운영 관찰

- 수동 정리는 최근 테스트에서 오류 없이 동작한 것으로 보임
- 자동 시작과 GPO 설치 상태는 현재 계정 기준으로 활성화가 확인되지 않음
- 재부팅과 로그오프를 포함한 운영 재검증이 아직 남아 있음
