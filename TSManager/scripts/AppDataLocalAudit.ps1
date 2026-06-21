[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Root = $env:LOCALAPPDATA,
    [string]$ConfigPath,
    [int]$Top = 25,
    [double]$MinSizeMB = 100,
    [int]$DefaultStaleDays = 30,
    [switch]$IncludeDiscovery,
    [switch]$CleanupSafe,
    [string]$ExportJson,
    [string]$ExportCsv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $scriptRoot = Split-Path -Parent $PSCommandPath
    $ConfigPath = Join-Path $scriptRoot 'AppDataLocalAudit.rules.json'
}

function Convert-ToSizeText {
    param([long]$Bytes)

    if ($Bytes -ge 1TB) { return '{0:N2} TB' -f ($Bytes / 1TB) }
    if ($Bytes -ge 1GB) { return '{0:N2} GB' -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return '{0:N2} MB' -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return '{0:N2} KB' -f ($Bytes / 1KB) }
    return "$Bytes B"
}

function Get-PathStats {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $item = Get-Item -LiteralPath $Path -Force

    if (-not $item.PSIsContainer) {
        return [pscustomobject]@{
            Path          = $item.FullName
            Exists        = $true
            IsDirectory   = $false
            FileCount     = 1
            SizeBytes     = [long]$item.Length
            LastWriteTime = $item.LastWriteTime
        }
    }

    $files = @(Get-ChildItem -LiteralPath $item.FullName -Recurse -Force -File -ErrorAction SilentlyContinue)
    if ($files.Count -eq 0) {
        return [pscustomobject]@{
            Path          = $item.FullName
            Exists        = $true
            IsDirectory   = $true
            FileCount     = 0
            SizeBytes     = 0L
            LastWriteTime = $item.LastWriteTime
        }
    }

    $totalBytes = 0L
    $latestWrite = $item.LastWriteTime

    foreach ($file in $files) {
        $totalBytes += [long]$file.Length
        if ($file.LastWriteTime -gt $latestWrite) {
            $latestWrite = $file.LastWriteTime
        }
    }

    [pscustomobject]@{
        Path          = $item.FullName
        Exists        = $true
        IsDirectory   = $true
        FileCount     = $files.Count
        SizeBytes     = $totalBytes
        LastWriteTime = $latestWrite
    }
}

function Resolve-RuleTargets {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Rule
    )

    $pattern = [string]$Rule.Pattern
    if ([string]::IsNullOrWhiteSpace($pattern)) {
        return @()
    }

    $combined = Join-Path $BasePath $pattern
    @(Resolve-Path -Path $combined -ErrorAction SilentlyContinue | ForEach-Object { $_.Path })
}

function Get-Recommendation {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Rule,
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Stats,
        [Parameter(Mandatory = $true)]
        [double]$AgeDays
    )

    $staleDays = if ($null -ne $Rule.StaleDays -and [int]$Rule.StaleDays -gt 0) { [int]$Rule.StaleDays } else { $DefaultStaleDays }
    $safety = [string]$Rule.Safety

    if ($AgeDays -lt $staleDays) {
        return 'Watch'
    }

    switch ($safety) {
        'Safe' { return 'DeleteSafe' }
        'SafeIfClosed' { return 'DeleteWhenAppClosed' }
        default { return 'Review' }
    }
}

function Get-OptionalRuleValue {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Rule,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        $DefaultValue = $null
    )

    $property = $Rule.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $DefaultValue
    }

    return $property.Value
}

if (-not (Test-Path -LiteralPath $Root)) {
    throw "Root path not found: $Root"
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Rule file not found: $ConfigPath"
}

$rules = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$now = Get-Date
$findings = New-Object System.Collections.Generic.List[object]
$seenPaths = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)

foreach ($rule in $rules) {
    $targets = Resolve-RuleTargets -BasePath $Root -Rule $rule
    foreach ($target in $targets) {
        if (-not $seenPaths.Add($target)) {
            continue
        }

        $stats = Get-PathStats -Path $target
        if ($null -eq $stats) {
            continue
        }

        if ($stats.SizeBytes -lt ($MinSizeMB * 1MB)) {
            continue
        }

        $ageDays = [math]::Round(($now - $stats.LastWriteTime).TotalDays, 1)
        $recommendation = Get-Recommendation -Rule $rule -Stats $stats -AgeDays $ageDays
        $staleDaysValue = Get-OptionalRuleValue -Rule $rule -Name 'StaleDays'
        $staleDays = if ($null -ne $staleDaysValue -and [int]$staleDaysValue -gt 0) { [int]$staleDaysValue } else { $DefaultStaleDays }

        $findings.Add([pscustomobject]@{
            Path              = $stats.Path
            Category          = [string](Get-OptionalRuleValue -Rule $rule -Name 'Category' -DefaultValue '')
            RuleName          = [string](Get-OptionalRuleValue -Rule $rule -Name 'Name' -DefaultValue '')
            Safety            = [string](Get-OptionalRuleValue -Rule $rule -Name 'Safety' -DefaultValue 'Review')
            Recommendation    = $recommendation
            SizeBytes         = [long]$stats.SizeBytes
            SizeText          = Convert-ToSizeText -Bytes $stats.SizeBytes
            FileCount         = [int]$stats.FileCount
            LastWriteTime     = $stats.LastWriteTime
            AgeDays           = $ageDays
            StaleAfterDays    = $staleDays
            Notes             = [string](Get-OptionalRuleValue -Rule $rule -Name 'Notes' -DefaultValue '')
            CleanupAllowed    = ($recommendation -eq 'DeleteSafe')
            CleanupHint       = [string](Get-OptionalRuleValue -Rule $rule -Name 'CleanupHint' -DefaultValue '')
            Source            = 'Rule'
        })
    }
}

if ($IncludeDiscovery) {
    $children = @(Get-ChildItem -LiteralPath $Root -Force -ErrorAction SilentlyContinue)
    foreach ($child in $children) {
        if (-not $seenPaths.Add($child.FullName)) {
            continue
        }

        $stats = Get-PathStats -Path $child.FullName
        if ($null -eq $stats -or $stats.SizeBytes -lt ($MinSizeMB * 1MB)) {
            continue
        }

        $ageDays = [math]::Round(($now - $stats.LastWriteTime).TotalDays, 1)
        $findings.Add([pscustomobject]@{
            Path              = $stats.Path
            Category          = 'TopLevelDiscovery'
            RuleName          = '(discovery)'
            Safety            = 'Review'
            Recommendation    = if ($ageDays -ge $DefaultStaleDays) { 'Review' } else { 'Watch' }
            SizeBytes         = [long]$stats.SizeBytes
            SizeText          = Convert-ToSizeText -Bytes $stats.SizeBytes
            FileCount         = [int]$stats.FileCount
            LastWriteTime     = $stats.LastWriteTime
            AgeDays           = $ageDays
            StaleAfterDays    = $DefaultStaleDays
            Notes             = 'Top-level directory discovery item. Verify app ownership before deletion.'
            CleanupAllowed    = $false
            CleanupHint       = 'Manual review only'
            Source            = 'Discovery'
        })
    }
}

$results = @($findings | Sort-Object SizeBytes -Descending)

if ($results.Count -eq 0) {
    Write-Host "No candidates found above $MinSizeMB MB under $Root"
    return
}

$display = $results | Select-Object -First $Top | Select-Object `
    Recommendation,
    Safety,
    Category,
    @{ Name = 'SizeGB'; Expression = { [math]::Round($_.SizeBytes / 1GB, 2) } },
    AgeDays,
    FileCount,
    LastWriteTime,
    Path

$display | Format-Table -AutoSize

$summary = [pscustomobject]@{
    Root                 = $Root
    GeneratedAt          = $now
    CandidateCount       = $results.Count
    TotalCandidateBytes  = [long](($results | Measure-Object -Property SizeBytes -Sum).Sum)
    SafeCleanupBytes     = [long](($results | Where-Object { $_.CleanupAllowed } | Measure-Object -Property SizeBytes -Sum).Sum)
}

Write-Host ''
Write-Host ("Candidate total : {0}" -f (Convert-ToSizeText -Bytes $summary.TotalCandidateBytes))
Write-Host ("Safe cleanup    : {0}" -f (Convert-ToSizeText -Bytes $summary.SafeCleanupBytes))

if ($ExportJson) {
    $jsonDirectory = Split-Path -Parent $ExportJson
    if ($jsonDirectory -and -not (Test-Path -LiteralPath $jsonDirectory)) {
        New-Item -ItemType Directory -Path $jsonDirectory | Out-Null
    }
    $export = [pscustomobject]@{
        Summary = $summary
        Results = $results
    }
    $export | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ExportJson -Encoding UTF8
    Write-Host "JSON exported   : $ExportJson"
}

if ($ExportCsv) {
    $csvDirectory = Split-Path -Parent $ExportCsv
    if ($csvDirectory -and -not (Test-Path -LiteralPath $csvDirectory)) {
        New-Item -ItemType Directory -Path $csvDirectory | Out-Null
    }
    $results | Export-Csv -LiteralPath $ExportCsv -NoTypeInformation -Encoding UTF8
    Write-Host "CSV exported    : $ExportCsv"
}

if ($CleanupSafe) {
    $cleanupTargets = @($results | Where-Object { $_.CleanupAllowed })
    if ($cleanupTargets.Count -eq 0) {
        Write-Host 'No safe cleanup targets matched the current filters.'
        return
    }

    foreach ($target in $cleanupTargets) {
        if ($PSCmdlet.ShouldProcess($target.Path, 'Remove safe stale data')) {
            Remove-Item -LiteralPath $target.Path -Recurse -Force -ErrorAction Stop
        }
    }
}
