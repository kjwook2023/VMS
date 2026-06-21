# VMSCleanSlate Session Handoff

Last updated: `2026-05-07`

## 1. 작업 기준 폴더

현재 작업 기준 폴더:

`D:\KJWOOK2023\VMS\VMSCleanSlate`

이전 소스 폴더:

`D:\GitSrc\tsupport\VMSCleanSlate`

앞으로의 빌드, 퍼블리시, 로그 검토, 코드 수정은 모두 현재 폴더 기준으로 진행합니다.

## 2. 지금까지 정리된 것

### 2.1 리팩터링 완료

이미 반영된 구조 변경:

- `WorkSchoolAccess` 와 `DeviceEnrollmentCleanup` 분리
- `CleanupAction`, `CleanupRunResult` 기반 실행 계약 정리
- `GpoInstaller` 의 `scripts.ini` 안전 갱신
- `Backup`, `LogOnlyOnError` 문서/동작 정렬

### 2.2 PowerShell 파서 문제 수정 완료

이전 공용 PC 이슈의 실제 원인은 Edge 특화 버그가 아니라 PowerShell 파서 실패였습니다.

원인:

- `Scripts\VMSCleanSlate.ps1` 가 UTF-8 without BOM
- 대상 환경의 Windows PowerShell 5.1 이 한글 포함 스크립트를 파싱하지 못함

수정:

- `PowerShellRunner.cs` 에서 추출 `.ps1` 를 UTF-8 BOM 으로 기록
- `Scripts\VMSCleanSlate.ps1`
- `Scripts\modules\*.ps1`
- `Build\EncryptScripts.ps1`

현재 이 수정은 코드에 반영된 상태입니다.

## 3. 최신 빌드 상태

퍼블리시 출력 경로:

`D:\KJWOOK2023\VMS\VMSCleanSlate\bin\Release\net8.0-windows\win-x64\publish`

확인된 퍼블리시 결과물:

- `VMSCleanSlate.exe`
- 확인 시각 기준 마지막 수정: `2026-05-06 09:28` KST

## 4. 2026-05-07 검증 결과

### 4.1 사용자 수동 테스트

사용자 보고 기준:

- 오류 없이 잘 동작한 것처럼 보였음

이는 적어도 이전의 PowerShell parser error 로 즉시 실패하던 상태는 벗어났다는 의미로 볼 수 있습니다.

### 4.2 셀프 테스트

실행 명령:

```powershell
.\bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe --self-test
```

확인 결과:

- `ok = true`
- `powershell = 5.1.26100.8115`
- `extractScripts = main=12674B, modules=7`
- `config = 9/9 cleanup items enabled`
- `gpoShutdown = not installed`
- `gpoLogoff = not installed`
- `autoStart = disabled`

## 5. 자동 시작 상태 주의

사용자는 트레이 메뉴에서 자동 시작을 등록했다고 보고했지만, 현재 셸에서 확인한 값은 다음과 같습니다.

- `AutoStart.IsEnabled()` 결과: `false`
- `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\VMSCleanSlate`: 없음

가능한 해석:

- 실제 등록이 되지 않았음
- 다른 사용자 계정 또는 다른 세션에서만 등록됨
- 다른 실행 파일 경로 기준으로 착오가 있었음

따라서 문서상 현재 상태는 "자동 시작 등록 보고는 있었으나, 현재 계정 기준 검증은 미확인" 으로 기록하는 것이 맞습니다.

## 6. 현재 설정 상태

배포 폴더 `VMSCleanSlate.config.json` 확인 결과:

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

## 7. 다음 세션 우선 작업

순서대로 진행:

1. 대상 PC의 실제 사용자 세션에서 트레이 앱 실행 여부 확인
2. 재부팅 후 트레이 자동 시작 여부 확인
3. `Run Cleanup Now` 재실행 후 최신 `diag_*.log`, `runner_*.log` 확인
4. 로그오프 시 자동 정리 확인
5. 종료 시 자동 정리 확인
6. 그 뒤에도 Edge 잔존 로그인이 있으면 `Scripts\modules\Logout-Browsers.ps1` 범위 점검

## 8. 현재 결론

현재 프로젝트 상태는 아래로 정리할 수 있습니다.

- 코드 리팩터링 완료
- 인코딩 원인 수정 완료
- 빌드/퍼블리시 완료
- 수동 정리 경로는 회복된 것으로 보임
- 자동 시작과 GPO 훅은 현재 계정 기준으로 아직 확인되지 않음

즉, 남은 일은 대형 코드 수정이 아니라 운영 경로 검증입니다.
