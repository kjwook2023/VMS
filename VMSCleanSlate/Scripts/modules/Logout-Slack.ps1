# Slack 로그아웃 모듈

function Get-SlackStatus {
    $items = @()

    $checkPaths = @(
        "$env:APPDATA\Slack"
        "$env:LOCALAPPDATA\slack"
        "$env:LOCALAPPDATA\Packages\91750D7E.Slack_8she8kybcnzg4"  # MS Store 버전
    )
    foreach ($p in $checkPaths) {
        if (Test-Path $p) {
            $items += [PSCustomObject]@{ Type='Slack'; Detail=$p }
        }
    }

    return $items
}

function Invoke-SlackLogout {
    param([string]$BackupDir)

    # 프로세스 종료
    Get-Process -Name 'Slack','slack' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    # 세션 파일 삭제 (Electron 표준 위치)
    $bases = @(
        "$env:APPDATA\Slack"
        "$env:LOCALAPPDATA\Packages\91750D7E.Slack_8she8kybcnzg4\LocalCache\Roaming\Slack"
    )
    foreach ($base in $bases) {
        if (-not (Test-Path $base)) { continue }
        $targets = 'Cookies','Cookies-journal','Local Storage','Session Storage','IndexedDB','databases','storage','Cache','Code Cache','GPUCache','Service Worker'
        foreach ($t in $targets) {
            $p = Join-Path $base $t
            if (Test-Path $p) {
                Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
