# VMSCleanSlate Session Handoff

Last updated: `2026-05-11`

## 1. 현재 작업 기준

- 작업 폴더: `D:\KJWOOK2023\VMS\VMSCleanSlate`
- 퍼블리시 기준 실행 파일: `bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe`

## 2. 이번 세션에서 반영한 내용

설정 보호 추가:

- `설정...` 메뉴는 암호 입력 후에만 열림
- `설정 파일 열기` 메뉴도 같은 암호 보호 적용
- 암호는 `pw.env` 의 `DEFAULT_PASSWORD=...` 값을 읽음
- 우선 경로: `D:\KJWOOK2023\VMS\VMSCleanSlate\pw.env`
- 보조 경로: 실행 파일 폴더의 `pw.env`

추가 파일:

- `.gitignore`
- `pw.env.example`
- `SettingsPassword.cs`
- `PasswordPromptForm.cs`

## 3. Git 추적 제외

- `pw.env` 는 프로젝트 로컬 `.gitignore` 에서 제외
- 실제 비밀번호 값은 저장소에 넣지 않는 전제

## 4. 검증

실행 검증:

```powershell
dotnet build -c Release
```

결과:

- build success
- warning 0
- error 0

## 5. 현재 제한 사항

- 이 보호는 앱 UI 진입을 막는 수준이다.
- 사용자가 파일 시스템에 직접 접근해서 `VMSCleanSlate.config.json` 을 편집하는 것까지는 막지 못한다.
- 진짜 운영 보호가 필요하면 배포 폴더와 config 파일 권한도 같이 제한해야 한다.

## 6. 다음에 확인할 것

1. 퍼블리시 후 실제 실행 파일에서도 암호 입력창이 정상 표시되는지
2. 공용 PC 배포 위치에서 `pw.env` 경로가 의도대로 읽히는지
3. 필요하면 `자동 시작`, `GPO 등록/해제` 메뉴도 같은 암호 보호 범위에 포함할지 결정
