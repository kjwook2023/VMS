# AppData Local Audit

`scripts/AppDataLocalAudit.ps1` scans `C:\Users\<user>\AppData\Local` and produces a ranked list of large stale files or folders.

It is conservative by default:

- It only recommends cleanup.
- It does not delete anything unless `-CleanupSafe` is supplied.
- Even with `-CleanupSafe`, only items marked `DeleteSafe` are removed.

## Usage

Run an analysis with discovery enabled:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\AppDataLocalAudit.ps1 `
  -IncludeDiscovery `
  -Top 30 `
  -MinSizeMB 250 `
  -ExportJson .\reports\appdata-local-audit.json `
  -ExportCsv .\reports\appdata-local-audit.csv
```

Simulate safe cleanup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\AppDataLocalAudit.ps1 `
  -MinSizeMB 250 `
  -CleanupSafe `
  -WhatIf
```

Apply safe cleanup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\AppDataLocalAudit.ps1 `
  -MinSizeMB 250 `
  -CleanupSafe
```

## Recommendation meanings

- `DeleteSafe`: old cache or diagnostic data that is usually safe to remove
- `DeleteWhenAppClosed`: temporary/cache data that should only be removed after closing the owning app
- `Review`: large data that may be removable, but needs manual confirmation
- `Watch`: large but recently updated data

## Current value

This tool will flag the `Temp\dh\Report.*` folders that contain old Visual Studio Diagnostics Hub ETL files such as `sc.user_aux.etl`.

## Suggested scheduled task

Register a daily task with the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Register-AppDataLocalAuditTask.ps1
```
