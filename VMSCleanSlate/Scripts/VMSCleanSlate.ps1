# ============================================================================
# VMSCleanSlate.ps1
#   -Logoff    : user-context cleanup
#   -Shutdown  : admin/SYSTEM cleanup
#   -RunAll    : run Logoff + Shutdown and schedule shutdown
#   -Status    : show local registration/log status
# ============================================================================

[CmdletBinding()]
param(
    [switch]$Logoff,
    [switch]$Shutdown,
    [switch]$RunAll,
    [switch]$Status,
    [switch]$NoConsole,
    [string]$ConfigPath = '',

    # backward compatibility only
    [switch]$Force,
    [switch]$NoBackup
)

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$ExeRoot = if ($PSScriptRoot) {
    $PSScriptRoot
} else {
    Split-Path -Parent ([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName)
}

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $ConfigPath = Join-Path $ExeRoot 'VMSCleanSlate.config.json'
}

function Read-Config {
    if (-not (Test-Path $ConfigPath)) { return $null }
    try {
        Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Host "[ERROR] config.json 읽기 실패: $_" -ForegroundColor Red
        $null
    }
}

function Test-Flag {
    param(
        $Cfg,
        [string]$Key
    )

    if ($null -eq $Cfg) {
        switch ($Key) {
            'TriggerOnLock' { return $false }
            'Backup' { return $false }
            default { return $true }
        }
    }

    if (-not $Cfg.PSObject.Properties[$Key]) {
        switch ($Key) {
            'DeviceEnrollmentCleanup' { return Test-Flag $Cfg 'WorkSchoolAccess' }
            'Backup' { return $false }
            default { return $false }
        }
    }

    $v = ([string]$Cfg.$Key).ToUpperInvariant().Trim()
    return ($v -eq 'Y' -or $v -eq 'YES' -or $v -eq 'TRUE' -or $v -eq '1')
}

$moduleDir = Join-Path $ExeRoot 'modules'
if (Test-Path $moduleDir) {
    Get-ChildItem $moduleDir -Filter '*.ps1' -ErrorAction SilentlyContinue | ForEach-Object {
        try { . $_.FullName } catch {}
    }
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-PhaseLog {
    param(
        [string]$Phase,
        [System.Collections.Generic.List[string]]$Errors,
        $Cfg
    )

    $alwaysLog = -not (Test-Flag $Cfg 'LogOnlyOnError')
    if (-not $alwaysLog -and $Errors.Count -eq 0) {
        return
    }

    $logDir = Join-Path $ExeRoot 'logs'
    try {
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }

        $logFile = Join-Path $logDir ($Phase + '_' + (Get-Date -Format 'yyyyMMdd') + '.log')
        Add-Content -Path $logFile -Value "=== $Phase at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8
        Add-Content -Path $logFile -Value ("status: " + ($(if ($Errors.Count -eq 0) { 'ok' } else { 'error' }))) -Encoding UTF8
        if ($Errors.Count -gt 0) {
            Add-Content -Path $logFile -Value ($Errors -join [Environment]::NewLine) -Encoding UTF8
        } else {
            Add-Content -Path $logFile -Value "(no errors)" -Encoding UTF8
        }
        Add-Content -Path $logFile -Value '' -Encoding UTF8
    } catch {}
}

function Get-BackupDir {
    param(
        $Cfg,
        [string]$Phase
    )

    if ($NoBackup -or -not (Test-Flag $Cfg 'Backup')) {
        return $null
    }

    $dir = Join-Path $ExeRoot ("backup\{0}_{1}" -f $Phase, (Get-Date -Format 'yyyyMMdd_HHmmss'))
    try {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        return $dir
    } catch {
        return $null
    }
}

function Invoke-CleanupShutdown {
    param($Cfg)

    $errors = New-Object System.Collections.Generic.List[string]
    $bk = Get-BackupDir $Cfg 'shutdown'

    if (-not (Test-Flag $Cfg 'DeviceEnrollmentCleanup')) {
        return $errors
    }

    $enrollPath = 'HKLM:\SOFTWARE\Microsoft\Enrollments'
    if (Test-Path $enrollPath) {
        Get-ChildItem $enrollPath -ErrorAction SilentlyContinue | Where-Object {
            $_.PSChildName -match '^\{?[0-9A-Fa-f-]{36}\}?$'
        } | ForEach-Object {
            $guid = $_.PSChildName
            $props = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
            if (-not ($props.UPN -or $props.AADResourceID -or $props.DiscoveryServiceFullURL)) {
                return
            }

            try {
                if ($bk) {
                    & reg.exe export "HKLM\SOFTWARE\Microsoft\Enrollments\$guid" (Join-Path $bk "Enrollment_$($guid -replace '[{}]','').reg") /y 2>$null | Out-Null
                }

                Get-ScheduledTask -TaskPath "\Microsoft\Windows\EnterpriseMgmt\$guid\" -ErrorAction SilentlyContinue |
                    ForEach-Object {
                        Unregister-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath -Confirm:$false -ErrorAction SilentlyContinue
                    }

                try {
                    $sch = New-Object -ComObject Schedule.Service
                    $sch.Connect()
                    $sch.GetFolder('\Microsoft\Windows\EnterpriseMgmt').DeleteFolder($guid, $null)
                } catch {}

                $guidPlain = $guid -replace '[{}]',''
                @(
                    "HKLM:\SOFTWARE\Microsoft\Enrollments\$guid"
                    "HKLM:\SOFTWARE\Microsoft\Enrollments\Status\$guid"
                    "HKLM:\SOFTWARE\Microsoft\EnterpriseResourceManager\Tracked\$guid"
                    "HKLM:\SOFTWARE\Microsoft\PolicyManager\AdmxInstalled\$guid"
                    "HKLM:\SOFTWARE\Microsoft\PolicyManager\Providers\$guid"
                    "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Accounts\$guidPlain"
                    "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Logger\$guid"
                    "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Sessions\$guid"
                ) | ForEach-Object {
                    if (Test-Path $_) {
                        Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue
                    }
                }
            } catch {
                $errors.Add("[MDM:$guid] $_")
            }
        }
    }

    try {
        $dsreg = & dsregcmd /status 2>$null
        if ($dsreg -and ($dsreg | Select-String -Pattern '^\s*AzureAdJoined\s*:\s*YES').Count -gt 0) {
            & dsregcmd /leave 2>&1 | Out-Null
        }
    } catch {
        $errors.Add("[AAD] $_")
    }

    return $errors
}

function Invoke-CleanupLogoff {
    param($Cfg)

    $errors = New-Object System.Collections.Generic.List[string]
    $bk = Get-BackupDir $Cfg 'logoff'

    $dispatch = @(
        @{ Flag='Microsoft365';        Func='Invoke-Office365Logout';        Args=@{ BackupDir=$bk } }
        @{ Flag='OneDriveSignout';     Func='Invoke-OneDriveLogout';         Args=@{ BackupDir=$bk; DeleteLocalFolder=(Test-Flag $Cfg 'OneDriveLocalFolder') } }
        @{ Flag='Teams';               Func='Invoke-TeamsLogout';            Args=@{ BackupDir=$bk } }
        @{ Flag='Notion';              Func='Invoke-NotionLogout';           Args=@{ BackupDir=$bk } }
        @{ Flag='Slack';               Func='Invoke-SlackLogout';            Args=@{ BackupDir=$bk } }
        @{ Flag='BrowserCookies';      Func='Invoke-BrowserCookieLogout';    Args=@{ BackupDir=$bk } }
        @{ Flag='WorkSchoolAccess';    Func='Invoke-WorkAccountsUserLogout'; Args=@{ BackupDir=$bk } }
    )

    foreach ($item in $dispatch) {
        if (-not (Test-Flag $Cfg $item.Flag)) {
            continue
        }

        if (-not (Get-Command $item.Func -ErrorAction SilentlyContinue)) {
            $errors.Add("[$($item.Flag)] missing function $($item.Func)")
            continue
        }

        try {
            & $item.Func @($item.Args)
        } catch {
            $errors.Add("[$($item.Flag)] $_")
        }
    }

    return $errors
}

function Invoke-Menu-Status {
    Write-Host ""
    Write-Host "=== 자동 등록 상태 ===" -ForegroundColor Cyan
    @{
        Logoff   = 'C:\Windows\System32\GroupPolicy\User\Scripts\scripts.ini'
        Shutdown = 'C:\Windows\System32\GroupPolicy\Machine\Scripts\scripts.ini'
    }.GetEnumerator() | ForEach-Object {
        $name = $_.Key
        $path = $_.Value

        if (-not (Test-Path $path)) {
            Write-Host "  [$name] 등록 안 됨" -ForegroundColor Yellow
            return
        }

        $iniText = ''
        try { $iniText = [System.IO.File]::ReadAllText($path, [System.Text.UnicodeEncoding]::new($false,$true)) } catch {}
        if (-not $iniText) { try { $iniText = Get-Content $path -Raw } catch {} }

        if ($iniText -match "(?ims)\[$name\][^\[]*?0CmdLine=([^\r\n]+)") {
            Write-Host ("  [{0}] {1}" -f $name, $Matches[1].Trim()) -ForegroundColor Green
        } else {
            Write-Host "  [$name] (ini 있음, 항목 없음)" -ForegroundColor Yellow
        }
    }

    $logDir = Join-Path $ExeRoot 'logs'
    Write-Host ""
    Write-Host "=== 최근 로그 ===" -ForegroundColor Cyan
    if (Test-Path $logDir) {
        $logs = Get-ChildItem $logDir -Filter '*.log' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 5
        if ($logs) {
            $logs | ForEach-Object {
                Write-Host ("  {0}  {1,8} bytes  {2}" -f $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm'), $_.Length, $_.Name)
            }
        } else {
            Write-Host "  (로그 없음)" -ForegroundColor Green
        }
    } else {
        Write-Host "  (logs 폴더 없음)" -ForegroundColor Green
    }
    Write-Host ""
    Read-Host "Enter 키를 눌러 메뉴로"
}

function Invoke-Menu-RunOnce {
    param([switch]$ThenShutdown)

    $cfg = Read-Config

    Write-Host ""
    Write-Host "=== Logoff 단계 ===" -ForegroundColor Cyan
    $errs1 = Invoke-CleanupLogoff $cfg
    Write-PhaseLog 'logoff' $errs1 $cfg

    if (Test-Admin) {
        Write-Host ""
        Write-Host "=== Shutdown 단계 ===" -ForegroundColor Cyan
        $errs2 = Invoke-CleanupShutdown $cfg
        Write-PhaseLog 'shutdown' $errs2 $cfg
    } else {
        Write-Host ""
        Write-Host "[INFO] 관리자 권한 아님 - 장치 정리 단계 건너뜀" -ForegroundColor Yellow
        $errs2 = New-Object System.Collections.Generic.List[string]
    }

    Write-Host ""
    Write-Host "=== 결과 ===" -ForegroundColor Cyan
    Write-Host ("  Logoff   오류: {0}" -f $errs1.Count)
    Write-Host ("  Shutdown 오류: {0}" -f $errs2.Count)

    if ($ThenShutdown) {
        Write-Host ""
        Write-Host "=== 30초 후 종료. 취소: shutdown /a ===" -ForegroundColor Yellow
        & shutdown.exe /s /t 30 /c "VMSCleanSlate: 30초 후 종료" 2>&1 | Out-Null
        return
    }

    Write-Host ""
    Read-Host "Enter 키를 눌러 메뉴로"
}

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host "    VMSCleanSlate - 공용 PC 인증 정보 정리" -ForegroundColor Cyan
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    설정: $ConfigPath"
    Write-Host ""
    Write-Host "    [1] 등록 상태 확인"
    Write-Host "    [2] 지금 한 번 정리" -ForegroundColor Green
    Write-Host "    [3] 지금 정리 + PC 종료 (30초)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    [Q] 나가기"
    Write-Host ""
}

if ($Logoff) {
    $cfg = Read-Config
    $errs = Invoke-CleanupLogoff $cfg
    Write-PhaseLog 'logoff' $errs $cfg
    exit ($(if ($errs.Count -gt 0) { 1 } else { 0 }))
}

if ($Shutdown) {
    $cfg = Read-Config
    $errs = Invoke-CleanupShutdown $cfg
    Write-PhaseLog 'shutdown' $errs $cfg
    exit ($(if ($errs.Count -gt 0) { 1 } else { 0 }))
}

if ($Status) {
    Invoke-Menu-Status
    exit 0
}

if ($RunAll) {
    Invoke-Menu-RunOnce -ThenShutdown
    exit 0
}

while ($true) {
    Show-Menu
    $choice = ([string](Read-Host "  선택")).Trim().ToLowerInvariant()
    switch ($choice) {
        '1' { Invoke-Menu-Status }
        '2' { Invoke-Menu-RunOnce }
        '3' { Invoke-Menu-RunOnce -ThenShutdown }
        'q' { break }
        default {
            Write-Host ""
            Write-Host "잘못된 입력입니다." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
