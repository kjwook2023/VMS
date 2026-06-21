# OneDrive 로그아웃 + 로컬 동기화 폴더 정리 모듈
# 주의: 로컬 동기화 폴더 삭제는 클라우드 미동기화 파일이 있다면 손실 가능

function Get-OneDriveStatus {
    $items = @()

    $exe = "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"
    if (Test-Path $exe) {
        $items += [PSCustomObject]@{ Type='App'; Detail=$exe }
    }

    $settings = "$env:LOCALAPPDATA\Microsoft\OneDrive\settings"
    if (Test-Path $settings) {
        $items += [PSCustomObject]@{ Type='Settings'; Detail=$settings }
    }

    # 사용자 프로필 내 OneDrive* 폴더 (Personal, Business)
    $folders = Get-ChildItem $env:USERPROFILE -Directory -Filter 'OneDrive*' -ErrorAction SilentlyContinue
    foreach ($f in $folders) {
        $items += [PSCustomObject]@{ Type='SyncFolder'; Detail=$f.FullName }
    }

    # 레지스트리에서 등록된 동기화 폴더
    $regPath = 'HKCU:\Software\Microsoft\OneDrive\Accounts'
    if (Test-Path $regPath) {
        $items += [PSCustomObject]@{ Type='Registry'; Detail=$regPath }
    }

    return $items
}

function Invoke-OneDriveLogout {
    param([string]$BackupDir, [bool]$DeleteLocalFolder = $true)

    $exe = "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"

    # 1. OneDrive 자체 sign out 시도 (앱이 살아있어야 동작)
    if (Test-Path $exe) {
        try {
            Start-Process -FilePath $exe -ArgumentList '/signout' -WindowStyle Hidden -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        } catch {}
    }

    # 2. OneDrive 프로세스 종료
    Get-Process -Name 'OneDrive','FileCoAuth','FileSyncHelper' -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    # 3. settings 폴더 백업 + 삭제
    $settings = "$env:LOCALAPPDATA\Microsoft\OneDrive\settings"
    if (Test-Path $settings) {
        if ($BackupDir) {
            try {
                Compress-Archive -Path "$settings\*" -DestinationPath (Join-Path $BackupDir 'OneDrive_settings.zip') -Force -ErrorAction SilentlyContinue
            } catch {}
        }
        Remove-Item $settings -Recurse -Force -ErrorAction SilentlyContinue
    }

    # 4. 레지스트리 정리
    $regPaths = @(
        'HKCU:\Software\Microsoft\OneDrive\Accounts'
        'HKCU:\Software\SyncEngines\Providers\OneDrive'
    )
    foreach ($p in $regPaths) {
        if (Test-Path $p) {
            if ($BackupDir) {
                try {
                    & reg.exe export ($p -replace '^HKCU:','HKCU') (Join-Path $BackupDir ('OneDrive_' + (Split-Path $p -Leaf) + '.reg')) /y 2>$null | Out-Null
                } catch {}
            }
            Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    # 5. 로컬 동기화 폴더 삭제 (DeleteLocalFolder=$true 일 때만)
    #   주의: 백업 안 함 (용량 클 수 있음). 클라우드 미동기화 파일 있으면 손실.
    if ($DeleteLocalFolder) {
        $folders = Get-ChildItem $env:USERPROFILE -Directory -Filter 'OneDrive*' -ErrorAction SilentlyContinue
        foreach ($f in $folders) {
            Remove-Item $f.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
