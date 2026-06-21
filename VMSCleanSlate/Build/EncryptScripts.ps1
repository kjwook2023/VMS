# ============================================================================
#  EncryptScripts.ps1
#  Scripts\*.ps1 -> Scripts.enc\*.ps1.enc  (AES-256 CBC + PKCS7)
#  같은 키/IV 가 PowerShellRunner.cs 에도 있어야 함.
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)] [string]$InputDir,
    [Parameter(Mandatory=$true)] [string]$OutputDir
)

$ErrorActionPreference = 'Stop'

# !! 키/IV 변경 시 PowerShellRunner.cs 의 AesKey/AesIv 도 같은 값으로 변경할 것 !!
$keyB64 = 'xKqMhJbBTmH7Z4pV2wQfYkR9sN3eL5cD8AaG6tWnUjE='
$ivB64  = 'qP3sT7rN5mY2eA0vZ8xH9w=='
$key = [Convert]::FromBase64String($keyB64)
$iv  = [Convert]::FromBase64String($ivB64)

if (-not (Test-Path $InputDir)) { throw "Input directory not found: $InputDir" }

if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$count = 0
Get-ChildItem $InputDir -Recurse -File -Filter '*.ps1' | ForEach-Object {
    $rel    = $_.FullName.Substring($InputDir.Length).TrimStart('\','/')
    $out    = Join-Path $OutputDir ($rel + '.enc')
    $outDir = Split-Path $out -Parent
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }

    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)

    $aes = [System.Security.Cryptography.Aes]::Create()
    try {
        $aes.Key     = $key
        $aes.IV      = $iv
        $aes.Mode    = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
        $enc = $aes.CreateEncryptor()
        try {
            $cipher = $enc.TransformFinalBlock($bytes, 0, $bytes.Length)
            [System.IO.File]::WriteAllBytes($out, $cipher)
        }
        finally { $enc.Dispose() }
    }
    finally { $aes.Dispose() }

    $count++
}

[System.IO.File]::WriteAllText((Join-Path $OutputDir '.stamp'), (Get-Date).ToString('s'))
Write-Output "Encrypted $count file(s) -> $OutputDir"
