# ClearCDrive Code Overview

This document summarizes the current code, saved runtime artifacts, and next-session entry points for `ClearCDrive` as of `2026-06-02`.

## 1. Read first

1. `docs\session-handoff.md`
2. `docs\session-handoff-2026-06-02.md`
3. root `README.md`
4. `config\ClearCDrive.rules.json`

## 2. Project purpose

`ClearCDrive` is a local Windows CLI utility for finding large temporary, cache, and diagnostic artifacts under `C:\Users\<user>\AppData\Local`, then classifying them by deletion safety so the user can review them or remove only the safest targets.

Core intent:

- Do not delete aggressively.
- Separate known rule-based targets from top-level discovery items.
- Produce `Safe`, `SafeIfClosed`, and `Review` safety classifications.
- Allow actual deletion only for conservative `DeleteSafe` targets.

## 3. Current implementation status

- Runtime: `.NET 8`
- App type: console application
- Entry point: `src\ClearCDrive\Program.cs`
- Modes:
  - `scan`
  - `clean-safe`
- Publish script: `build\Publish.ps1`
- Published executable confirmed: `dist\win-x64\ClearCDrive.exe`

Main implemented features:

- JSON rule loading
- Wildcard path pattern resolution
- Directory and file size aggregation
- File count and last-write-time aggregation
- Stale-day based recommendation logic
- Console result printing
- JSON / CSV / TXT report writing
- Daily log writing
- Conservative delete execution for `DeleteSafe` targets

## 4. Current rule coverage

The current rule file covers mainly:

- Visual Studio Diagnostics Hub reports
- Crash dumps
- `%LocalAppData%\Temp`
- Direct3D and NVIDIA shader caches
- Windows INetCache
- UWP `TempState` and `LocalCache`
- Chrome and Edge code cache folders

The most important rule appears to be `Temp\dh\Report.*`, and the saved report confirms that the largest `DeleteSafe` target matched that rule.

## 5. Last confirmed execution evidence

The latest confirmed runtime artifacts are from `2026-05-26`.

- Log file: `logs\clear-cdrive-20260526.log`
- Latest reports: `reports\latest.txt`, `reports\latest.csv`, `reports\latest.json`

Latest saved `scan` summary:

- Generated at: `2026-05-26 18:11:40`
- Root: `C:\Users\V_JINWKIM\AppData\Local`
- Candidate count: `42`
- Total candidate size: `183.30 GB`
- Safe cleanup size: `11.27 GB`

The log also shows one `clean-safe` run on the same day. This documentation session did not re-run the tool, so actual deletion side effects were not re-verified.

## 6. Important current constraints

- `DeleteWhenAppClosed` items are reported but not automatically deleted.
- `TopLevelDiscovery` items are always manual review items.
- The default root is `LocalAppData`, so this is not a full-system cleanup tool.
- Rule coverage is still narrow and may miss environment-specific large caches.
- Inaccessible or locked paths are skipped so the scan can continue conservatively.

## 7. Document-level conclusion

This project should be treated as a conservative cleanup analysis helper for `AppData\Local`, not as a broad automatic disk cleaner.

The main remaining work is likely:

- expand rule coverage
- validate actual `--apply` behavior
- tune safety classifications using real saved reports
- decide how this folder should be tracked inside the parent Git repository
