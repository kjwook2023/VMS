# Microsoft Teams 로그아웃 모듈 (신/구 버전 모두 지원)

function Get-TeamsStatus {
    $items = @()

    # 신 Teams (MS Store / WebView2 기반)
    $newTeams = "$env:LOCALAPPDATA\Packages\MSTeams_8wekyb3d8bbwe"
    if (Test-Path $newTeams) {
        $items += [PSCustomObject]@{ Type='New Teams'; Detail=$newTeams }
    }

    # 구 Teams (Electron)
    $oldTeams = "$env:APPDATA\Microsoft\Teams"
    if (Test-Path $oldTeams) {
        $items += [PSCustomObject]@{ Type='Classic Teams'; Detail=$oldTeams }
    }

    return $items
}

function Invoke-TeamsLogout {
    param([string]$BackupDir)

    # 프로세스 종료
    Get-Process -Name 'Teams','ms-teams','msteams','Update' -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and ($_.Path -like '*Teams*' -or $_.Path -like '*MSTeams*') } |
        Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name 'Teams','ms-teams' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    # 신 Teams 캐시
    $newCachePaths = @(
        "$env:LOCALAPPDATA\Packages\MSTeams_8wekyb3d8bbwe\LocalCache"
        "$env:LOCALAPPDATA\Packages\MSTeams_8wekyb3d8bbwe\AC\TokenBroker"
    )
    foreach ($p in $newCachePaths) {
        if (Test-Path $p) {
            Get-ChildItem $p -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    # 구 Teams 세션 데이터
    $oldTeams = "$env:APPDATA\Microsoft\Teams"
    if (Test-Path $oldTeams) {
        $files = 'Cookies','Cookies-journal','Local Storage','Session Storage','IndexedDB','databases','blob_storage','Cache','Code Cache','GPUCache','Logs','tmp'
        foreach ($f in $files) {
            $p = Join-Path $oldTeams $f
            if (Test-Path $p) {
                Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
