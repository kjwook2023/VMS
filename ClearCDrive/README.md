# ClearCDrive

`ClearCDrive` is a local Windows cleanup analysis tool focused on `C:\Users\<user>\AppData\Local`.

It is designed to:

- analyze large temporary and cache folders
- recommend whether deletion is safe, needs review, or should wait
- write timestamped reports and daily logs under this folder
- optionally delete only conservative `DeleteSafe` targets

## Current status

- Last confirmed execution artifacts are from `2026-05-26`.
- Latest saved report: `reports\latest.txt`
- Latest saved log: `logs\clear-cdrive-20260526.log`
- Latest published executable exists at `dist\win-x64\ClearCDrive.exe`
- Current code is recommendation-first. Actual deletion happens only in `clean-safe --apply` mode and only for `DeleteSafe` targets.
- This folder is currently a standalone work item inside the parent `D:\KJWOOK2023\VMS` git repository and was not committed as a tracked project when last checked.

## Folder layout

- `src\ClearCDrive`: source code
- `config\ClearCDrive.rules.json`: cleanup rules
- `build\Publish.ps1`: publish the executable
- `dist\win-x64\ClearCDrive.exe`: published executable
- `reports`: JSON, CSV, TXT reports
- `logs`: run logs
- `docs\README.md`: code and document overview
- `docs\session-handoff.md`: session recovery entry point

## Current observed result

From the latest saved scan on `2026-05-26 18:11:40`:

- Root: `C:\Users\V_JINWKIM\AppData\Local`
- Candidate count: `42`
- Total candidate size: `183.30 GB`
- Safe cleanup size: `11.27 GB`

The largest confirmed safe target in the saved report was:

- `C:\Users\V_JINWKIM\AppData\Local\Temp\dh\Report.6E5842C9-4F54-4509-8B55-F0A5465C26D5`
- category: `DiagnosticReport`
- recommendation: `DeleteSafe`
- size: `10.85 GB`

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\build\Publish.ps1
```

## Run

```cmd
Run-ClearCDrive.cmd
```

Or directly:

```cmd
dist\win-x64\ClearCDrive.exe scan --top 30 --min-mb 250
```

## Commands

Analysis only:

```cmd
dist\win-x64\ClearCDrive.exe scan --top 30 --min-mb 250
```

Safe cleanup dry run:

```cmd
dist\win-x64\ClearCDrive.exe clean-safe --min-mb 250
```

Safe cleanup apply:

```cmd
dist\win-x64\ClearCDrive.exe clean-safe --min-mb 250 --apply
```

## Notes

- Default mode is recommendation only.
- `clean-safe --apply` removes only items classified as `DeleteSafe`.
- Current rules include Visual Studio Diagnostics Hub report folders such as `Temp\dh\Report.*`.
- `SafeIfClosed` items are reported as `DeleteWhenAppClosed` after the stale-day threshold, but they are not automatically deleted by the current implementation.
- Top-level discovery is intentionally separate from explicit rules and always remains manual-review territory.
- For session recovery and next steps, start from `docs\session-handoff.md`.
