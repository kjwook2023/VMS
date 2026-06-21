# VMSCleanSlate

공용 PC에서 사용자 인증 정보와 앱 세션을 정리하기 위한 Windows 트레이 앱입니다.  
실행 파일 하나에 PowerShell 정리 스크립트를 내장하고, 로그오프/종료/수동 실행 시점에 정리를 수행합니다.

## 현재 기준 상태

- 작업 기준 폴더: `D:\KJWOOK2023\VMS\VMSCleanSlate`
- 최신 퍼블리시 출력: `bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe`
- 확인된 퍼블리시 파일 시각: `2026-05-11 16:48` KST
- PowerShell UTF-8 BOM 파서 이슈는 수정 완료
- `2026-05-07` 수동 테스트에서는 사용자 체감상 오류 없이 동작
- 같은 날 `--self-test` 기준으로는 `gpoShutdown=not installed`, `gpoLogoff=not installed`, `autoStart=disabled`
- `2026-05-11` 기준 설정 암호 보호 반영
- `2026-05-11` 기준 설정 항목별 정보 아이콘/툴팁 반영
- 배포용 `publish` exe 는 `2026-05-11 16:48` 기준으로 재생성됨

마지막 항목은 중요합니다. 트레이 메뉴에서 자동 시작을 켰다고 느꼈더라도, 현재 셸에서 확인한 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 에는 `VMSCleanSlate` 값이 없었습니다. 대상 PC의 실제 사용자 계정에서 다시 확인해야 합니다.

## 주요 기능

- 트레이 상주 실행
- `Run Cleanup Now` 로 즉시 사용자 정리 실행
- 필요 시 관리자 상승 후 장치 정리 실행
- 빌드 시점에 고정된 설정 암호 확인 후에만 설정 창/설정 파일 열기 허용
- 로그오프/종료/잠금 트리거 지원
- Local GPO Logoff/Shutdown 등록 지원
- 설정 UI를 통한 항목별 on/off
- 실패 시 진단 로그와 러너 로그 기록

## 실행 모드

| 모드 | 명령 | 설명 |
|---|---|---|
| 트레이 | `VMSCleanSlate.exe` | 트레이 상주, 메뉴/이벤트 기반 실행 |
| 사용자 정리 | `VMSCleanSlate.exe -Logoff` | 사용자 컨텍스트 정리 |
| 장치 정리 | `VMSCleanSlate.exe -Shutdown` | 관리자/SYSTEM 컨텍스트 정리 |
| 전체 정리 | `VMSCleanSlate.exe -RunAll` | `-Logoff` 후 `-Shutdown` |
| 셀프 테스트 | `VMSCleanSlate.exe --self-test` | JSON 상태 점검 |
| GPO 등록 | `VMSCleanSlate.exe --install-gpo` | Local GPO Logoff/Shutdown 등록 |
| GPO 해제 | `VMSCleanSlate.exe --uninstall-gpo` | Local GPO 등록 제거 |

CLI 정리 명령에는 `--json` 또는 `--json-result` 를 붙여 결과를 JSON으로 받을 수 있습니다.

## 구성 요소

```text
VMSCleanSlate/
├── Program.cs
├── TrayApp.cs
├── PowerShellRunner.cs
├── CleanupContracts.cs
├── GpoInstaller.cs
├── AutoStart.cs
├── Config.cs
├── ConfigManager.cs
├── SettingsForm.cs
├── SelfTest.cs
├── Scripts/
│   ├── VMSCleanSlate.ps1
│   └── modules/
├── Build/
└── docs/
```

## 설정 파일

배포 폴더의 `VMSCleanSlate.config.json` 을 사용합니다. 현재 확인된 기본값은 아래와 같습니다.

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

## 설정 암호

- 설정 창과 `설정 파일 열기` 메뉴는 암호를 통과해야 열립니다.
- 현재 코드는 외부 `pw.env` 파일을 읽지 않습니다.
- 설정 암호는 빌드 시점에 고정된 해시값과 비교합니다.
- 이번 고정값은 기존 `pw.env` 의 `DEFAULT_PASSWORD` 값을 1회 참조해 반영한 것입니다.
- 따라서 배포 시 설정 암호 때문에 별도 `pw.env` 를 둘 필요는 없습니다.
- 설정 화면 각 항목 오른쪽에는 상세 설명용 정보 아이콘과 hover 툴팁이 있습니다.

## 로그

- `logs\diag_YYYYMMDD.log`: 트레이 앱 진단 로그
- `logs\runner_YYYYMMDD.log`: PowerShell 실행기 오류/표준 오류 로그
- `logs\logoff_YYYYMMDD.log`: 사용자 정리 단계 로그
- `logs\shutdown_YYYYMMDD.log`: 장치 정리 단계 로그

`LogOnlyOnError=Y` 이면 `logoff_*.log`, `shutdown_*.log` 는 오류가 있을 때만 생성됩니다.

## 빌드

```powershell
$env:DOTNET_CLI_HOME='C:\Users\V_JINWKIM\.codex\memories\dotnet'
dotnet build -c Release
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=None -p:EnableCompressionInSingleFile=true
```

출력 파일:

`bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe`

## 문서

- `docs\session-handoff.md`: 최신 세션 복구 진입점
- `docs\README.md`: 현재 코드 기준 개요
- `docs\feature-design.md`: 기능/동작 기준
- `docs\architecture.md`: 구조와 실행 흐름
- `docs\dev-design.md`: 구현 세부와 기술 부채
