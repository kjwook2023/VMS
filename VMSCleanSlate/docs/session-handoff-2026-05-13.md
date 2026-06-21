# VMSCleanSlate Session Handoff

Last updated: `2026-05-13`

## 1. 현재 작업 기준

- 작업 폴더: `D:\KJWOOK2023\VMS\VMSCleanSlate`
- 배포용 실행 파일: `bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe`
- 확인된 배포용 exe 시각: `2026-05-11 16:48:19` KST

## 2. 지금까지 반영된 핵심 변경

이미 완료된 항목:

- `WorkSchoolAccess` 와 `DeviceEnrollmentCleanup` 분리
- `CleanupAction`, `CleanupRunResult` 기반 실행 계약 정리
- PowerShell UTF-8 BOM 파서 문제 수정
- `GpoInstaller` 의 `scripts.ini` 안전 갱신

## 3. 설정 보호 상태

`2026-05-11` 기준 반영:

- `설정...` 메뉴는 암호 입력 후에만 열림
- `설정 파일 열기` 메뉴도 같은 암호 보호 적용
- 암호는 `pw.env` 의 `DEFAULT_PASSWORD=...` 값을 읽음
- 우선 경로: `D:\KJWOOK2023\VMS\VMSCleanSlate\pw.env`
- 보조 경로: 실행 파일 폴더의 `pw.env`
- `pw.env` 는 프로젝트 로컬 `.gitignore` 에서 제외

관련 파일:

- `SettingsPassword.cs`
- `PasswordPromptForm.cs`
- `.gitignore`
- `pw.env.example`

주의:

- 이 보호는 앱 UI 진입 보호이다.
- 사용자가 파일 시스템에 직접 접근해 `VMSCleanSlate.config.json` 을 편집하는 것까지는 막지 못한다.

## 4. 설정 UI 상태

`2026-05-11` 기준 반영:

- 설정 화면 각 항목 오른쪽에 `i` 정보 아이콘 추가
- 아이콘 hover 시 상세 툴팁 표시
- 체크박스 텍스트 hover 시에도 동일 툴팁 표시

현재 툴팁 설명이 들어간 항목:

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

관련 파일:

- `SettingsForm.cs`

## 5. 배포 상태

확인 사항:

- `dotnet build -c Release` 정상 통과
- `dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=None -p:EnableCompressionInSingleFile=true` 완료
- 최신 publish exe 는 `2026-05-11 16:48:19` 기준으로 갱신됨

즉, 배포 테스트는 반드시 `publish` 폴더 exe 기준으로 해야 한다.

## 6. 현재 운영 메모

- `2026-05-07` 수동 테스트 기준으로는 정리 실행이 오류 없이 동작한 것처럼 보였음
- 다만 그 시점 `--self-test` 기준으로 `autoStart=disabled`, `gpoShutdown=not installed`, `gpoLogoff=not installed`
- 자동 시작과 GPO 설치 상태는 실제 대상 PC 사용자 세션에서 다시 확인 필요

## 7. 다음 세션에서 바로 할 일

1. `publish\VMSCleanSlate.exe` 로 실행
2. `설정...` 클릭 시 암호 팝업이 뜨는지 확인
3. 설정 화면 정보 아이콘/툴팁이 정상 표시되는지 확인
4. 대상 PC 실제 사용자 세션에서 자동 시작 동작 확인
5. 로그오프/종료 경로 재시험
6. 필요 시 최신 `diag_*.log`, `runner_*.log` 확인
