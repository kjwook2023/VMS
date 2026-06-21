# VMSCleanSlate Session Handoff

Last updated: `2026-05-06`

## 1. Working folder

Current working folder:

`D:\KJWOOK2023\VMS\VMSCleanSlate`

Previous source folder:

`D:\GitSrc\tsupport\VMSCleanSlate`

The active project base is now `D:\KJWOOK2023\VMS\VMSCleanSlate`.
Future build, publish, log review, and code changes should be done from this folder.

## 2. What was moved

Only the files needed for development and build were copied from the old repo.

Included:

- C# source files
- `Scripts\`
- `Build\`
- `docs\`
- `README.md`
- `VMSCleanSlate.csproj`
- `app.manifest`

Excluded:

- `bin\`
- `obj\`
- `Scripts.enc\`
- temporary/generated build outputs

## 3. Refactor completed

The codebase was already refactored before this handoff.

### 3.1 Cleanup boundary split

`WorkSchoolAccess` no longer carries both user cleanup and device unenrollment.

- User cleanup flag: `WorkSchoolAccess`
- Device cleanup flag: `DeviceEnrollmentCleanup`

This reduced the risk of running `dsregcmd /leave` and MDM cleanup when only user sign-out cleanup was intended.

### 3.2 Config cleanup

The following config behavior was aligned with actual code:

- `Backup` added as a real config key
- `LogOnlyOnError` behavior clarified in script flow
- fallback logic added for older config files

### 3.3 Runner contract cleanup

The C# runner now uses explicit cleanup contracts instead of string-only command flow.

Added:

- `CleanupAction`
- `CleanupRunResult`

Updated:

- `PowerShellRunner`
- `Program`
- `TrayApp`

### 3.4 GPO installer safety

`GpoInstaller` was changed so it does not rewrite `scripts.ini` wholesale.
It now adds/removes only the VMSCleanSlate entries.

### 3.5 Docs updated

The main design docs were updated earlier to reflect actual code behavior:

- `docs\README.md`
- `docs\feature-design.md`
- `docs\architecture.md`
- `docs\dev-design.md`

## 4. Important runtime issue found on a public PC

Test scenario used on the public PC:

1. Sign in to Notion in Edge
2. Sign in to Notion in Chrome
3. Shut down the PC
4. Boot again and inspect sign-in state

Observed result:

- Chrome looked signed out
- Edge still looked signed in
- Clicking tray menu `Run Cleanup Now` appeared to do nothing

At that point, this looked like an Edge-only cleanup issue, but log analysis showed a more basic problem first.

## 5. Root cause from log review

Reviewed logs:

- `reference\logs\diag_20260506.log`
- `reference\logs\runner_20260506.log`

Key finding:

- cleanup did not reach the actual browser cleanup logic
- the main PowerShell script failed during parsing
- repeated log pattern showed `PS rc=1` and parser errors from `VMSCleanSlate.ps1`

Typical errors seen in the log:

- `Missing type name after '['`
- `Missing closing ')'`
- `Missing closing '}'`

Conclusion:

- this was not yet proven to be an Edge cleanup defect
- the cleanup script itself was failing before normal execution
- the Chrome sign-out result should not be treated as proof that cleanup succeeded

## 6. Actual root cause

The main script `Scripts\VMSCleanSlate.ps1` was in UTF-8 without BOM.
On the target public PC, Windows PowerShell 5.1 parsed the Korean-containing script incorrectly and failed before execution.

Validation that was done:

- parser check on the original script failed
- parser check on a UTF-8 BOM copy succeeded
- byte inspection confirmed the original file had no BOM

## 7. Fix already applied

The parser problem was fixed in the codebase.

### 7.1 Runtime extraction fix

`PowerShellRunner.cs` was updated so extracted `.ps1` files are written with UTF-8 BOM before execution.

### 7.2 Source normalization

The following script files were normalized to UTF-8 BOM:

- `Scripts\VMSCleanSlate.ps1`
- `Scripts\modules\*.ps1`
- `Build\EncryptScripts.ps1`

### 7.3 Verification

The parser check on `Scripts\VMSCleanSlate.ps1` returned `PARSE_OK` after the fix.

## 8. Current build status

Build and publish were completed successfully from the new working folder.

Commands used:

```powershell
$env:DOTNET_CLI_HOME='C:\Users\V_JINWKIM\.codex\memories\dotnet'
dotnet build -c Release
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=None -p:EnableCompressionInSingleFile=true
```

Expected publish output:

`D:\KJWOOK2023\VMS\VMSCleanSlate\bin\Release\net8.0-windows\win-x64\publish\VMSCleanSlate.exe`

## 9. Files most relevant for the next session

Core code:

- `Program.cs`
- `TrayApp.cs`
- `PowerShellRunner.cs`
- `CleanupContracts.cs`
- `Config.cs`
- `SettingsForm.cs`
- `GpoInstaller.cs`

PowerShell:

- `Scripts\VMSCleanSlate.ps1`
- `Scripts\modules\Logout-Browsers.ps1`

Logs and evidence:

- `reference\logs\diag_20260506.log`
- `reference\logs\runner_20260506.log`

## 10. What to do first in the next session

Use this exact order:

1. Open the project from `D:\KJWOOK2023\VMS\VMSCleanSlate`
2. Rebuild or republish if needed from that folder
3. Deploy the latest publish output to the public PC
4. Test tray menu `Run Cleanup Now`
5. Check whether parser errors disappeared from the new logs
6. Retest Edge and Chrome sign-out behavior

## 11. Decision point after retest

If the new logs no longer show parser errors and Edge still remains signed in, then the problem becomes a real Edge cleanup coverage issue.

In that case, inspect `Scripts\modules\Logout-Browsers.ps1` and focus on Edge profile data such as:

- `Cookies`
- `Login Data`
- `Web Data`
- `Local State`
- `Local Storage`
- `Session Storage`
- `IndexedDB`
- `Service Worker`

Do not jump to Edge-specific fixes before confirming that the parser error is gone in the fresh test run.

## 12. Practical note

Some existing docs currently show mojibake depending on encoding/viewer behavior.
For session recovery, use this handoff document first, then refer to the design docs as needed.
