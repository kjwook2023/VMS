# 브라우저 쿠키/세션/로그인 정보 정리 모듈
# - Chrome, Edge, Firefox 지원
# - 모든 프로필 순회

function Get-BrowserCookieStatus {
    $items = @()

    $chrome = "$env:LOCALAPPDATA\Google\Chrome\User Data"
    if (Test-Path $chrome) {
        $profiles = @(Get-ChildItem $chrome -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })
        if ($profiles.Count -gt 0) {
            $items += [PSCustomObject]@{ Type='Chrome'; Detail="$($profiles.Count) profile(s)" }
        }
    }

    $edge = "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
    if (Test-Path $edge) {
        $profiles = @(Get-ChildItem $edge -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })
        if ($profiles.Count -gt 0) {
            $items += [PSCustomObject]@{ Type='Edge'; Detail="$($profiles.Count) profile(s)" }
        }
    }

    $firefox = "$env:APPDATA\Mozilla\Firefox\Profiles"
    if (Test-Path $firefox) {
        $profiles = @(Get-ChildItem $firefox -Directory -ErrorAction SilentlyContinue)
        if ($profiles.Count -gt 0) {
            $items += [PSCustomObject]@{ Type='Firefox'; Detail="$($profiles.Count) profile(s)" }
        }
    }

    return $items
}

function Invoke-BrowserCookieLogout {
    param([string]$BackupDir)

    # 1. 브라우저 종료 (실행 중이면 파일 잠김)
    $procs = 'chrome','msedge','firefox'
    Get-Process -Name $procs -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    # 2. Chromium 계열 (Chrome / Edge) — 프로필별 세션/쿠키/Login Data 삭제
    $chromiumRoots = @(
        "$env:LOCALAPPDATA\Google\Chrome\User Data"
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
    )
    foreach ($root in $chromiumRoots) {
        if (-not (Test-Path $root)) { continue }
        $profiles = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' }
        foreach ($p in $profiles) {
            # Cookies/LoginData 백업 (작은 파일들이라 백업 OK)
            if ($BackupDir) {
                $bkPrefix = ((Split-Path $root -Parent | Split-Path -Leaf) + '_' + $p.Name) -replace '[^a-zA-Z0-9_-]','_'
                foreach ($f in 'Cookies','Login Data','Web Data') {
                    $src = Join-Path $p.FullName $f
                    if (Test-Path $src) {
                        try {
                            Copy-Item $src (Join-Path $BackupDir "${bkPrefix}_$f") -Force -ErrorAction SilentlyContinue
                        } catch {}
                    }
                }
            }
            $files = 'Cookies','Cookies-journal','Login Data','Login Data-journal','Login Data For Account','Web Data','Web Data-journal','Network','Local Storage','Session Storage','IndexedDB','Service Worker','Sessions','Session Data'
            foreach ($f in $files) {
                $target = Join-Path $p.FullName $f
                if (Test-Path $target) {
                    Remove-Item $target -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }

    # 3. Firefox — 프로필별 세션/쿠키/로그인 삭제
    $ffRoot = "$env:APPDATA\Mozilla\Firefox\Profiles"
    if (Test-Path $ffRoot) {
        $profiles = Get-ChildItem $ffRoot -Directory -ErrorAction SilentlyContinue
        foreach ($p in $profiles) {
            if ($BackupDir) {
                $bkPrefix = "Firefox_$($p.Name)" -replace '[^a-zA-Z0-9_-]','_'
                foreach ($f in 'cookies.sqlite','logins.json','key4.db') {
                    $src = Join-Path $p.FullName $f
                    if (Test-Path $src) {
                        try {
                            Copy-Item $src (Join-Path $BackupDir "${bkPrefix}_$f") -Force -ErrorAction SilentlyContinue
                        } catch {}
                    }
                }
            }
            $files = 'cookies.sqlite','cookies.sqlite-journal','cookies.sqlite-wal','cookies.sqlite-shm','sessionstore.jsonlz4','sessionstore-backups','formhistory.sqlite','logins.json','logins-backup.json','key4.db','signedInUser.json'
            foreach ($f in $files) {
                $target = Join-Path $p.FullName $f
                if (Test-Path $target) {
                    Remove-Item $target -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}
