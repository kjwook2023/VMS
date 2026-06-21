# Notion 데스크톱 앱 로그아웃 모듈 (Electron 기반)

function Get-NotionStatus {
    $items = @()

    $appData = "$env:APPDATA\Notion"
    if (Test-Path $appData) {
        $items += [PSCustomObject]@{ Type='AppData'; Detail=$appData }
    }

    $localApp = "$env:LOCALAPPDATA\Programs\Notion"
    if (Test-Path $localApp) {
        $items += [PSCustomObject]@{ Type='Install'; Detail=$localApp }
    }

    return $items
}

function Invoke-NotionLogout {
    param([string]$BackupDir)

    # 프로세스 종료
    Get-Process -Name 'Notion' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    # 세션/인증 파일 삭제
    $appData = "$env:APPDATA\Notion"
    if (Test-Path $appData) {
        $targets = 'Cookies','Cookies-journal','Local Storage','Session Storage','IndexedDB','databases','Cache','Code Cache','GPUCache','blob_storage','Service Worker','Local State'
        foreach ($t in $targets) {
            $p = Join-Path $appData $t
            if (Test-Path $p) {
                Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
