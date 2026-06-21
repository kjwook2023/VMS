# ============================================================================
#  Build.ps1
#    1) Scripts\*.ps1 -> Scripts.enc\*.ps1.enc        (AES 암호화)
#    2) dotnet build (single-file 만들기 전 단계)
#    3) ConfuserEx 로 VMSCleanSlate.dll 난독화        (이름/상수/컨트롤플로우/ref proxy)
#    4) dotnet publish --no-build  (난독화된 dll 을 single-file 안에 packing)
# ============================================================================

[CmdletBinding()]
param([switch]$SkipConfuser)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root      = $PSScriptRoot
$buildOut  = Join-Path $root 'bin\Release\net8.0-windows\win-x64'
$confDir   = Join-Path $buildOut 'Confused'
$confuser  = Join-Path $root 'Build\ConfuserEx\ConfuserEx-CLI\Confuser.CLI.exe'
$crprojIn  = Join-Path $root 'Build\Confuse.template.crproj'
$crprojOut = Join-Path $root 'Build\Confuse.generated.crproj'

if (-not $SkipConfuser -and -not (Test-Path $confuser)) {
    throw "ConfuserEx not found: $confuser  (다운로드 후 압축 풀고 -SkipConfuser 로 우회 가능)"
}

# ---------------------------------------------------------------- 1) PS 암호화 ---
Write-Host ""
Write-Host "[1/4] Encrypt PowerShell scripts..." -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'Build\EncryptScripts.ps1') `
    -InputDir (Join-Path $root 'Scripts') -OutputDir (Join-Path $root 'Scripts.enc')
if ($LASTEXITCODE -ne 0) { throw "Encrypt failed" }

# ---------------------------------------------------------------- 2) Build ---
Write-Host ""
Write-Host "[2/4] dotnet build..." -ForegroundColor Cyan
Remove-Item "$root\bin","$root\obj" -Recurse -Force -ErrorAction SilentlyContinue
Push-Location $root
try {
    & dotnet build -c Release -r win-x64 --self-contained true 2>&1 | ForEach-Object {
        if ($_ -match 'error|warning') { Write-Host $_ -ForegroundColor Yellow } else { Write-Host $_ }
    }
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
}
finally { Pop-Location }

# ---------------------------------------------------------------- 3) ConfuserEx ---
if (-not $SkipConfuser) {
    Write-Host ""
    Write-Host "[3/4] Apply ConfuserEx..." -ForegroundColor Cyan

    # template -> generated (절대 경로 치환)
    $tpl = Get-Content $crprojIn -Raw -Encoding UTF8
    $tpl = $tpl.Replace('@@BASE_DIR@@', $buildOut).Replace('@@OUTPUT_DIR@@', $confDir)
    [System.IO.File]::WriteAllText($crprojOut, $tpl, (New-Object System.Text.UTF8Encoding($false)))

    Remove-Item $confDir -Recurse -Force -ErrorAction SilentlyContinue

    & $confuser -n $crprojOut 2>&1 | ForEach-Object {
        if ($_ -match 'error|fail') { Write-Host $_ -ForegroundColor Red } else { Write-Host $_ -ForegroundColor DarkGray }
    }
    if ($LASTEXITCODE -ne 0) { throw "ConfuserEx failed (exit $LASTEXITCODE)" }

    $confused = Join-Path $confDir 'VMSCleanSlate.dll'
    if (-not (Test-Path $confused)) { throw "ConfuserEx output not found: $confused" }

    # build output 의 dll 을 난독화된 것으로 덮어쓰기 + obj output 도 같이 (publish 가 obj 사용 가능)
    Copy-Item $confused (Join-Path $buildOut 'VMSCleanSlate.dll') -Force
    $objDll = Join-Path $root 'obj\Release\net8.0-windows\win-x64\VMSCleanSlate.dll'
    if (Test-Path $objDll) { Copy-Item $confused $objDll -Force }
    Write-Host "  Confused dll size: $([Math]::Round((Get-Item $confused).Length/1KB,1)) KB" -ForegroundColor Green
} else {
    Write-Host "[3/4] SKIPPED (ConfuserEx)" -ForegroundColor DarkYellow
}

# ---------------------------------------------------------------- 4) Publish (no-build) ---
Write-Host ""
Write-Host "[4/4] dotnet publish (single-file)..." -ForegroundColor Cyan
Push-Location $root
try {
    & dotnet publish -c Release -r win-x64 --no-build --self-contained true `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -p:DebugType=None `
        -p:EnableCompressionInSingleFile=true 2>&1 | Select-Object -Last 4 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw "publish failed" }
}
finally { Pop-Location }

$exe = Join-Path $buildOut 'publish\VMSCleanSlate.exe'
if (Test-Path $exe) {
    $size = [Math]::Round((Get-Item $exe).Length/1MB, 2)
    Write-Host ""
    Write-Host "=== BUILD OK ===" -ForegroundColor Green
    Write-Host "  $exe  ($size MB)"
} else {
    throw "Final .exe missing"
}
