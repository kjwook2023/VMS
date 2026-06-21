# VMSCleanSlate 코드 기준 개요

이 문서는 `2026-05-14` 기준의 실제 코드, 문서 검토 결과, 다음 세션 준비 상태를 요약합니다.

## 0. 이번 세션 검토 결과

- 검토 대상: `docs/*.md`, 루트 `README.md`, `SettingsPassword.cs`, `SettingsForm.cs`, `TrayApp.cs`
- `2026-05-14` 기준 `dotnet build -c Release` 정상 통과
- 최신 publish exe 확인: `bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe`
- publish exe 마지막 시각: `2026-05-11 16:48:19` KST
- 현재 작업 폴더에는 `logs` 폴더가 없어 런타임 로그는 이번 세션에서 추가 확인하지 못함
- 코드 변경 시점은 실질적으로 `2026-05-11` 이후 멈춰 있고, `2026-05-13`에는 문서 정리 위주 변경이 있었음

다음 세션 진입 순서:

1. `docs\session-handoff.md`
2. `docs\session-handoff-2026-05-14.md`
3. `docs\feature-design.md`
4. `docs\architecture.md`
5. `docs\dev-design.md`

## 1. 프로젝트 목적

VMSCleanSlate 는 공용 PC에서 다음을 정리하기 위한 Windows 유틸리티입니다.

- Microsoft 365, OneDrive, Teams, Notion, Slack 세션/캐시
- Chromium/Firefox 계열 브라우저의 쿠키, 저장 로그인, 일부 세션 데이터
- 회사/학교 계정 연결과 일부 장치 등록 정보

구성은 `.NET 8 WinForms` 트레이 앱 + 내장 PowerShell 스크립트입니다.

## 2. 현재 상태

- 활성 작업 폴더: `D:\KJWOOK2023\VMS\VMSCleanSlate`
- 최신 퍼블리시 경로: `bin\Release\net8.0-windows\win-x64\publish`
- 퍼블리시 결과물 확인: `VMSCleanSlate.exe` 존재
- UTF-8 BOM 파서 이슈 수정 완료
- `2026-05-07` 사용자 수동 테스트: 체감상 오류 없이 동작
- `2026-05-07 17:04` `--self-test`: 전체 `ok=true`
- 같은 셀프 테스트에서 `autoStart=disabled`, `gpoShutdown=not installed`, `gpoLogoff=not installed`
- `2026-05-11` 기준으로 설정 창과 `설정 파일 열기` 메뉴는 암호 확인 후에만 열리도록 변경
- `2026-05-11` 기준으로 설정 화면 각 항목에 정보 아이콘/툴팁 추가
- 최신 publish exe 확인 시각: `2026-05-11 16:48:19`
- `2026-05-14` 기준 `dotnet build -c Release` 재검증 통과
- `2026-05-14` 기준으로 설정 암호는 외부 `pw.env` 가 아니라 빌드 시점 고정 해시 비교로 변경

즉, 정리 실행 경로는 회복된 것으로 보이지만 자동 시작/GPO 등록 상태는 현재 사용자 기준으로 다시 확인이 필요합니다.

## 3. 실행 모드

| 모드 | 실행 방법 | 실제 동작 |
|---|---|---|
| 트레이 모드 | `VMSCleanSlate.exe` | NotifyIcon 상주, 이벤트 감시 |
| 사용자 정리 | `VMSCleanSlate.exe -Logoff` | 사용자 컨텍스트 정리 |
| 장치 정리 | `VMSCleanSlate.exe -Shutdown` | 관리자/SYSTEM 컨텍스트 정리 |
| 전체 정리 | `VMSCleanSlate.exe -RunAll` | `-Logoff` 후 `-Shutdown` |
| 셀프 테스트 | `VMSCleanSlate.exe --self-test` | JSON 헬스체크 |
| GPO 등록 | `VMSCleanSlate.exe --install-gpo` | Local GPO Logoff/Shutdown 등록 |
| GPO 해제 | `VMSCleanSlate.exe --uninstall-gpo` | Local GPO 훅 제거 |
| JSON 출력 | CLI + `--json` | 결과 JSON 출력 |

## 4. 현재 정리 범위

### 4.1 WorkSchoolAccess

사용자 컨텍스트 정리입니다.

- WPJ 회사/학교 계정 연결 파일 정리
- AAD BrokerPlugin/TokenBroker 계열 파일 정리

### 4.2 DeviceEnrollmentCleanup

장치 컨텍스트 정리입니다.

- `HKLM\SOFTWARE\Microsoft\Enrollments\*` 관련 GUID 키 정리
- `EnterpriseMgmt\<guid>` 예약 작업 제거
- `PolicyManager`, `Provisioning\OMADM`, `EnterpriseResourceManager` 관련 키 정리
- 필요 시 `dsregcmd /leave`

중요:

- 이 항목은 단순 로그오프 정리가 아니라 장치 등록 해제를 포함할 수 있습니다.

### 4.3 Microsoft365

- Office 프로세스 종료
- `cmdkey` 기반 Office/Outlook/OneDrive/Teams 자격 증명 정리
- Office 캐시/Identity/레지스트리 정리

### 4.4 OneDriveSignout / OneDriveLocalFolder

- `OneDrive.exe /signout`
- OneDrive 설정/레지스트리 정리
- `OneDriveLocalFolder=Y` 이면 `%USERPROFILE%\OneDrive*` 삭제

### 4.5 Teams / Notion / Slack / BrowserCookies

- Teams, Notion, Slack 의 Electron/MSIX 저장소 정리
- `BrowserCookies` 는 이름과 달리 쿠키만이 아니라 저장 로그인/일부 세션 데이터도 정리

## 5. 트리거

- `TriggerOnLogoff=Y`: `SessionEnding(Logoff)` 에서 사용자 정리
- `TriggerOnShutdown=Y`: `SessionEnding(SystemShutdown)` 에서 사용자 정리
- `TriggerOnLock=Y`: `SessionSwitch(SessionLock)` 에서 비동기 사용자 정리

예외:

- 시스템 종료 시 `GPO Logoff` 가 설치되어 있으면 트레이 앱이 직접 `-Logoff` 를 실행하지 않고 GPO 경로에 맡깁니다.
- 수동 `Run Cleanup Now` 시에는 먼저 사용자 정리를 실행하고, `DeviceEnrollmentCleanup=Y` 이며 GPO Shutdown 이 없으면 상승 실행으로 장치 정리를 이어서 수행합니다.

## 6. 설정 파일

현재 확인된 기본 구성:

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

설정 UI 보호:

- 외부 `pw.env` 파일을 읽지 않음
- 설정 암호는 빌드 시점에 고정된 해시값과 비교
- 현재 고정값은 기존 `pw.env` 의 `DEFAULT_PASSWORD` 값을 1회 참조해 반영한 값
- 배포 시 설정 암호를 위해 `pw.env` 를 둘 필요 없음
- 설정 화면에는 각 항목별 hover 툴팁이 있어 실제 영향 범위를 UI 에서 바로 확인 가능

## 7. 로그

- `diag_YYYYMMDD.log`
  - 트레이 진단 로그
  - 상태/이벤트 기록
- `runner_YYYYMMDD.log`
  - PowerShellRunner 오류 로그
  - 비정상 종료 또는 `stderr` 출력 기록
- `logoff_YYYYMMDD.log`, `shutdown_YYYYMMDD.log`
  - 단계별 PowerShell 로그
  - `LogOnlyOnError=Y` 면 오류 시에만 생성

## 8. 최근 확인 포인트

- `Run Cleanup Now` 가 이전처럼 파서 오류로 즉시 실패하는 상태는 아님
- 다만 자동 시작은 현재 계정에서 실제 레지스트리 등록이 확인되지 않음
- GPO Logoff/Shutdown 훅도 현재는 설치되지 않은 상태
- `SettingsPassword.cs` 는 현재 외부 파일 의존이 없고, 암호 변경이 필요하면 코드 수정 후 재빌드해야 함
- 현재 작업 폴더에는 `logs` 디렉터리가 없어 이번 세션에서는 실제 실행 로그를 검토하지 못했음

다음 실제 운영 검증에서는 재부팅 후 트레이 자동 기동 여부와 로그오프/종료 경로를 각각 따로 확인하는 것이 맞습니다.
