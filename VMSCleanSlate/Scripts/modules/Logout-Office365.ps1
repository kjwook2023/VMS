# Microsoft 365 / Office 로그아웃 모듈
# - Credential Manager의 Office/OneDrive 자격 증명 삭제
# - Office Identity / Licensing 캐시 정리
# - HKCU Office Identity 레지스트리 정리

function Get-Office365Status {
    $items = @()

    # Credential Manager 확인
    $creds = & cmdkey /list 2>$null | Select-String -Pattern 'MicrosoftOffice|MS\.Outlook|OneDrive|MSTeams|adal\.cache|MicrosoftAccount' -ErrorAction SilentlyContinue
    if ($creds -and $creds.Count -gt 0) {
        $items += [PSCustomObject]@{ Type='Credential'; Detail="$($creds.Count) credentials" }
    }

    # Identity Cache
    $checkPaths = @(
        "$env:LOCALAPPDATA\Microsoft\IdentityCache"
        "$env:LOCALAPPDATA\Microsoft\Office\16.0\Licensing"
        "$env:LOCALAPPDATA\Microsoft\Office\15.0\Licensing"
    )
    foreach ($p in $checkPaths) {
        if (Test-Path $p) {
            $items += [PSCustomObject]@{ Type='Cache'; Detail=$p }
        }
    }

    # HKCU Office Identity
    $regPaths = @(
        'HKCU:\Software\Microsoft\Office\16.0\Common\Identity\Identities'
        'HKCU:\Software\Microsoft\Office\Common\Identity\Identities'
    )
    foreach ($p in $regPaths) {
        if (Test-Path $p) {
            $items += [PSCustomObject]@{ Type='Registry'; Detail=$p }
        }
    }

    return $items
}

function Invoke-Office365Logout {
    param([string]$BackupDir)

    # 1. Office 프로세스 종료
    $procs = 'WINWORD','EXCEL','POWERPNT','OUTLOOK','ONENOTE','MSACCESS','MSPUB','VISIO','WINPROJ','LYNC','MSOSYNC','OfficeClickToRun'
    Get-Process -Name $procs -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    # 2. Credential Manager 정리
    $targets = & cmdkey /list 2>$null |
        Select-String -Pattern '^\s*Target:\s*(.+)$' -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Matches.Groups[1].Value.Trim() }
    foreach ($t in $targets) {
        if ($t -match 'MicrosoftOffice|MS\.Outlook|OneDrive|MSTeams|adal\.cache|MicrosoftAccount') {
            try { & cmdkey /delete:$t 2>$null | Out-Null } catch {}
        }
    }

    # 3. 캐시 폴더 정리
    $paths = @(
        "$env:LOCALAPPDATA\Microsoft\IdentityCache"
        "$env:LOCALAPPDATA\Microsoft\Office\16.0\Licensing\Cache"
        "$env:LOCALAPPDATA\Microsoft\Office\15.0\Licensing\Cache"
        "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef"
        "$env:LOCALAPPDATA\Microsoft\Office\16.0\OfficeFileCache"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            if ($BackupDir) {
                $name = (Split-Path $p -Leaf) + '_' + (Get-Random -Maximum 9999)
                try {
                    Compress-Archive -Path "$p\*" -DestinationPath (Join-Path $BackupDir "Office_$name.zip") -Force -ErrorAction SilentlyContinue
                } catch {}
            }
            Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    # 4. HKCU Office Identity 레지스트리
    $regPaths = @(
        'HKCU:\Software\Microsoft\Office\16.0\Common\Identity\Identities'
        'HKCU:\Software\Microsoft\Office\16.0\Common\Identity\Profiles'
        'HKCU:\Software\Microsoft\Office\Common\Identity\Identities'
        'HKCU:\Software\Microsoft\Office\Common\Identity\Profiles'
        'HKCU:\Software\Microsoft\Office\16.0\Common\Roaming\Identities'
    )
    foreach ($p in $regPaths) {
        if (Test-Path $p) {
            if ($BackupDir) {
                $name = ($p -replace ':','' -replace '\\','_')
                try {
                    & reg.exe export ($p -replace '^HKCU:','HKCU') (Join-Path $BackupDir "$name.reg") /y 2>$null | Out-Null
                } catch {}
            }
            Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
