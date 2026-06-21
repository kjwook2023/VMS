# VMSCleanSlate 시스템 구조

## 1. 전체 구조

```text
VMSCleanSlate.exe
├─ Tray Mode
│  ├─ NotifyIcon / ContextMenu
│  ├─ SessionEnding / SessionSwitch 처리
│  ├─ SettingsForm
│  └─ AutoStart / GPO 토글
├─ CLI Mode
│  ├─ -Logoff
│  ├─ -Shutdown
│  ├─ -RunAll
│  ├─ --self-test
│  └─ --install-gpo / --uninstall-gpo
└─ PowerShellRunner
   ├─ .ps1.enc 추출
   ├─ AES 복호화
   ├─ UTF-8 BOM 보정
   ├─ powershell.exe 실행
   └─ CleanupRunResult 반환
```

## 2. 레이어

- Presentation
  - `TrayApp.cs`
  - `SettingsForm.cs`
  - `IconFactory.cs`
- Application
  - `Program.cs`
  - `SelfTest.cs`
- Service
  - `PowerShellRunner.cs`
  - `GpoInstaller.cs`
  - `AutoStart.cs`
  - `SettingsPassword.cs`
- Config
  - `Config.cs`
  - `ConfigManager.cs`
- UI Helper
  - `PasswordPromptForm.cs`
- Script
  - `Scripts\VMSCleanSlate.ps1`
  - `Scripts\modules\*.ps1`

## 3. 실행 흐름

### 3.1 트레이 시작

```text
Program.Main(args 없음)
→ 단일 인스턴스 mutex 확인
→ Application.Run(new TrayApp())
→ 설정 로드
→ hidden Form handle 생성
→ NotifyIcon / 메뉴 생성
→ SessionEnding / SessionSwitch 구독
→ 30초 타이머 시작
```

### 3.2 CLI 실행

```text
Program.Main(args 있음)
→ 첫 인수 해석
→ -Logoff / -Shutdown / -RunAll / --self-test / --install-gpo / --uninstall-gpo 분기
→ 필요 시 JSON 결과 출력
```

### 3.3 수동 정리

```text
Tray menu: Run Cleanup Now
→ PowerShellRunner.RunEmbedded(Logoff)
→ DeviceEnrollmentCleanup=Y 확인
→ GPO Shutdown 설치 여부 확인
→ 미설치면 RunSelfElevated(Shutdown)
→ 결과 balloon/log 반영
```

### 3.4 로그오프/종료 이벤트

```text
TrayApp.OnSessionEnding
→ TriggerOnLogoff / TriggerOnShutdown 검사
→ Shutdown 이고 GPO Logoff 설치 시 트레이 경로 생략
→ ShutdownBlockReasonCreate
→ PowerShellRunner.RunEmbedded(Logoff)
→ ShutdownBlockReasonDestroy
```

### 3.5 잠금 이벤트

```text
TrayApp.OnSessionSwitch
→ SessionLock 인지 확인
→ TriggerOnLock=Y 이면 비동기 RunEmbedded(Logoff)
```

## 4. PowerShell 실행 구조

### 4.1 실행 계약

`PowerShellRunner` 는 문자열 인수 대신 `CleanupAction` 을 받고 `CleanupRunResult` 를 반환합니다.

핵심 값:

- `CleanupAction.Logoff`
- `CleanupAction.Shutdown`
- `CleanupRunResult.ExitCode`
- `CleanupRunResult.Error`
- `CleanupRunResult.Stdout`
- `CleanupRunResult.Stderr`

### 4.2 추출과 인코딩

- 리소스에 포함된 `.ps1.enc` 를 임시 폴더로 복호화
- `.ps1` 파일이면 `EnsureUtf8Bom()` 으로 BOM 보정
- 이 변경으로 Windows PowerShell 5.1 의 한글 파서 실패를 회피

### 4.3 동시 실행 제어

- 이름: `VMSCleanSlate_CleanupRunning`
- 최대 대기: 60초
- timeout 시 exit code `-4`

## 5. GPO 경로

`GpoInstaller` 가 관리하는 위치:

- `C:\Windows\System32\GroupPolicy\Machine\Scripts\scripts.ini`
- `C:\Windows\System32\GroupPolicy\User\Scripts\scripts.ini`
- `HKLM\Software\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown`
- `HKLM\Software\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Logoff`
- `C:\Windows\System32\GroupPolicy\gpt.ini`

현재 구현은 기존 `scripts.ini` 전체를 덮어쓰지 않고, VMSCleanSlate 소유 엔트리만 추가/삭제합니다.

## 6. AutoStart 경로

- `AutoStart.cs`
- 레지스트리 위치: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- 값 이름: `VMSCleanSlate`
- 현재 `2026-05-07` 확인 시 값 없음

## 7. Settings Password 경로

- `SettingsPassword.cs`
- `PasswordPromptForm.cs`
- `설정...` 과 `설정 파일 열기` 진입 전에 암호 확인
- 외부 파일을 읽지 않음
- 빌드 시점에 고정된 SHA-256 해시와 입력값을 비교
- 현재 고정값은 기존 `pw.env` 의 `DEFAULT_PASSWORD` 값을 1회 참조해 반영

## 8. Settings Help UI

- `SettingsForm.cs`
- 각 항목 체크박스 오른쪽에 정보 아이콘 렌더링
- `ToolTip` 컴포넌트로 상세 설명 표시
- 체크박스와 정보 아이콘 모두 tooltip target 으로 설정

## 9. 로그 구조

- `diag_YYYYMMDD.log`
  - 트레이 진단 로그
  - 이벤트 흐름, 상태 메시지
- `runner_YYYYMMDD.log`
  - PowerShellRunner 비정상 실행 로그
- `logoff_YYYYMMDD.log`, `shutdown_YYYYMMDD.log`
  - PowerShell 단계 결과 로그
  - `LogOnlyOnError` 에 따라 오류만 또는 항상 기록

## 10. 현재 구조상 주의점

- `DeviceEnrollmentCleanup` 는 장치 등록 해제를 포함할 수 있다.
- `OneDriveLocalFolder` 기본값이 공격적이다.
- `BrowserCookies` 이름보다 실제 정리 범위가 넓다.
- 자동 시작은 현재 코드상 HKCU 기준이라 사용자별 상태를 따로 봐야 한다.
- 설정 암호는 UI 진입을 보호하지만, 사용자가 파일 시스템에 직접 접근 가능한 경우 `config.json` 자체 편집까지 막지는 못한다.
