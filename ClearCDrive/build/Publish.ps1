[CmdletBinding()]
param(
    [string]$Runtime = "win-x64",
    [switch]$SelfContained
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $PSCommandPath
$appRoot = Split-Path -Parent $scriptRoot
$project = Join-Path $appRoot "src\\ClearCDrive\\ClearCDrive.csproj"
$dist = Join-Path $appRoot ("dist\\" + $Runtime)

if (-not (Test-Path -LiteralPath $dist)) {
    New-Item -ItemType Directory -Path $dist | Out-Null
}

$selfContainedValue = if ($SelfContained) { "true" } else { "false" }

dotnet publish $project `
    -c Release `
    -r $Runtime `
    --self-contained $selfContainedValue `
    /p:PublishSingleFile=true `
    /p:EnableCompressionInSingleFile=true `
    -o $dist

Write-Host "Published to: $dist"
