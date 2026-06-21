# VMSCleanSlate 개발 설계

이 문서는 현재 구현 세부, 최근 리팩터링 결과, 남아 있는 기술 부채를 정리합니다.

## 1. 폴더 구조

```text
VMSCleanSlate/
├─ Program.cs
├─ TrayApp.cs
├─ PowerShellRunner.cs
├─ CleanupContracts.cs
├─ GpoInstaller.cs
├─ AutoStart.cs
├─ SettingsPassword.cs
├─ Config.cs
├─ ConfigManager.cs
├─ SettingsForm.cs
├─ PasswordPromptForm.cs
├─ SelfTest.cs
├─ Scripts/
│  ├─ VMSCleanSlate.ps1
│  └─ modules/
└─ Build/
```

## 2. 최근 반영 사항

### 2.1 CleanupContracts.cs

실행 계약 타입:

- `CleanupAction`
- `CleanupRunResult`

효과:

- 문자열 인수 중심 흐름 축소
- 호출부에서 `ExitCode`, `Error`, `Stdout`, `Stderr` 를 명시적으로 처리

### 2.2 Config.cs

추가/정리된 설정:

- `DeviceEnrollmentCleanup`
- `Backup`
- `LogOnlyOnError`

의미:

- 사용자 계정 정리와 장치 정리를 분리
- 백업 여부를 실제 설정 키로 반영

### 2.3 TrayApp.cs

주요 변경:

- `RunEmbedded(CleanupAction.Logoff)` 사용
- 장치 정리 판단을 `WorkSchoolAccess` 가 아니라 `DeviceEnrollmentCleanup` 로 분리
- 즉시 정리/종료 경로에서 `CleanupRunResult` 기반 오류 처리
- AutoStart 와 GPO 설치 토글 메뉴 유지

### 2.4 PowerShellRunner.cs

주요 변경:

- `RunEmbedded(CleanupAction)` 추가
- `RunSelfElevated(CleanupAction)` 추가
- 결과 객체 반환
- 추출된 `.ps1` 에 UTF-8 BOM 보정 추가

이 BOM 보정이 최근 공용 PC 파서 실패 이슈의 핵심 수정입니다.

### 2.5 GpoInstaller.cs

주요 변경:

- `scripts.ini` 전체 덮어쓰기 제거
- VMSCleanSlate 엔트리만 추가/삭제
- 레지스트리도 기존 slot 을 최대한 재사용

### 2.6 SettingsPassword.cs / PasswordPromptForm.cs

주요 변경:

- 설정 창 진입 전 암호 확인 추가
- `설정 파일 열기` 메뉴에도 동일한 보호 적용
- 암호는 빌드 시점에 고정된 해시값과 비교
- 현재 고정값은 기존 `pw.env` 의 `DEFAULT_PASSWORD` 값을 1회 참조해 반영

### 2.7 SettingsForm.cs

주요 변경:

- 각 설정 항목에 상세 설명 툴팁 추가
- 체크박스 오른쪽에 정보 아이콘 표시
- 체크박스 hover 와 정보 아이콘 hover 모두 설명 확인 가능

## 3. Config 키

현재 기준:

- `TriggerOnLogoff`
- `TriggerOnShutdown`
- `TriggerOnLock`
- `WorkSchoolAccess`
- `DeviceEnrollmentCleanup`
- `Microsoft365`
- `OneDriveSignout`
- `OneDriveLocalFolder`
- `Teams`
- `Notion`
- `Slack`
- `BrowserCookies`
- `HourlyNotify`
- `Backup`
- `LogOnlyOnError`

## 4. PowerShell 메인 스크립트

### 4.1 실제 파라미터

- `-Logoff`
- `-Shutdown`
- `-RunAll`
- `-Status`
- `-NoConsole`
- `-ConfigPath`
- `-Force`
- `-NoBackup`

### 4.2 fallback 규칙

`Test-Flag` 는 구버전 설정 호환을 위해 다음 규칙을 사용합니다.

- config 전체 누락 시 대부분 `true`
- 예외로 `TriggerOnLock`, `Backup` 은 `false`
- `DeviceEnrollmentCleanup` 누락 시 `WorkSchoolAccess` 값 승계
- `Backup` 누락 시 `false`

### 4.3 로그 동작

`Write-PhaseLog` 기준:

- `LogOnlyOnError=Y`
  - `logoff_*.log`, `shutdown_*.log` 는 오류 시에만 생성
- `LogOnlyOnError=N`
  - 성공/실패 모두 기록

## 5. 2026-05-07 기준 검증

실행 확인:

- 퍼블리시된 `VMSCleanSlate.exe` 존재
- `--self-test` 결과 `ok=true`
- PowerShell 5.1 환경에서 내장 스크립트 추출 성공
- 모듈 수 7개 확인

현재 미확인 또는 불일치:

- 사용자는 자동 시작을 켰다고 보고했지만, 현재 셸에서 `AutoStart.IsEnabled()` 는 `false`
- `HKCU\Run` 의 `VMSCleanSlate` 값도 확인되지 않음
- GPO Logoff/Shutdown 도 현재는 미설치

## 6. 남아 있는 기술 부채

- `TrayApp` 이 UI, 상태, 이벤트, 운영 로깅 책임을 많이 가진다.
- PowerShell 모듈 간 공통 helper 추출 여지가 있다.
- AES key/IV 가 코드와 빌드 스크립트에 고정돼 있다.
- `DeviceEnrollmentCleanup` 는 영향 범위가 강해서 운영 검증이 더 필요하다.
- 자동 시작 상태는 현재 사용자별 동작과 배포 위치 변경 시나리오를 더 명확히 검증해야 한다.
- 설정 암호는 현재 고정 해시 기반이라 배포 누락 위험은 줄었지만, 암호를 바꾸려면 재빌드가 필요하다.
