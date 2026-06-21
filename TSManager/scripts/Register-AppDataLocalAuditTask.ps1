[CmdletBinding()]
param(
    [string]$TaskName = 'AppDataLocalAudit',
    [string]$DailyAt = '09:00',
    [int]$Top = 50,
    [double]$MinSizeMB = 250,
    [switch]$ReplaceExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $PSCommandPath
$repoRoot = Split-Path -Parent $scriptRoot
$reportRoot = Join-Path $repoRoot 'reports'
$auditScript = Join-Path $scriptRoot 'AppDataLocalAudit.ps1'
$jsonReport = Join-Path $reportRoot 'appdata-local-audit.json'
$csvReport = Join-Path $reportRoot 'appdata-local-audit.csv'

if (-not (Test-Path -LiteralPath $reportRoot)) {
    New-Item -ItemType Directory -Path $reportRoot | Out-Null
}

$time = [datetime]::ParseExact($DailyAt, 'HH:mm', $null)
$arguments = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"{0}"' -f $auditScript),
    '-IncludeDiscovery',
    '-Top', $Top,
    '-MinSizeMB', $MinSizeMB,
    '-ExportJson', ('"{0}"' -f $jsonReport),
    '-ExportCsv', ('"{0}"' -f $csvReport)
) -join ' '

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Daily -At $time

if ($ReplaceExisting -and (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Description 'Analyze Local AppData cleanup candidates and export reports' `
    -Force | Out-Null

Write-Host "Scheduled task registered: $TaskName"
Write-Host "Runs daily at            : $DailyAt"
Write-Host "JSON report              : $jsonReport"
Write-Host "CSV report               : $csvReport"
