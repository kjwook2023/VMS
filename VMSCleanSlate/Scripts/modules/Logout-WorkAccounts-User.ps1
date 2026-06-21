# 회사/학교 액세스 - 사용자 컨텍스트 부분만 정리 모듈
# - WPJ 인증서 (Cert:\CurrentUser\My)
# - AAD BrokerPlugin Token Cache (%LOCALAPPDATA%\Packages\...)
# (HKLM Enrollments 등 SYSTEM 권한 필요한 항목은 종료 스크립트에서 처리)

function Get-WorkAccountsUserStatus {
    $items = @()

    # WPJ 인증서
    $certs = Get-ChildItem 'Cert:\CurrentUser\My' -ErrorAction SilentlyContinue | Where-Object {
        $_.Issuer -match 'MS-Organization-(Access|P2P-Access)'
    }
    if ($certs -and @($certs).Count -gt 0) {
        $items += [PSCustomObject]@{ Type='WPJ Cert'; Detail="$(@($certs).Count) certificate(s)" }
    }

    # AAD BrokerPlugin Token Cache
    $brokerPath = "$env:LOCALAPPDATA\Packages\Microsoft.AAD.BrokerPlugin_cw5n1h2txyewy\AC\TokenBroker\Accounts"
    if (Test-Path $brokerPath) {
        $files = Get-ChildItem $brokerPath -File -ErrorAction SilentlyContinue
        if ($files -and @($files).Count -gt 0) {
            $items += [PSCustomObject]@{ Type='AAD Token'; Detail="$(@($files).Count) file(s)" }
        }
    }

    return $items
}

function Invoke-WorkAccountsUserLogout {
    param([string]$BackupDir)

    # WPJ 인증서 삭제
    Get-ChildItem 'Cert:\CurrentUser\My' -ErrorAction SilentlyContinue | Where-Object {
        $_.Issuer -match 'MS-Organization-(Access|P2P-Access)'
    } | ForEach-Object {
        try { Remove-Item "Cert:\CurrentUser\My\$($_.Thumbprint)" -Force -ErrorAction SilentlyContinue } catch {}
    }

    # AAD Token Cache 비우기
    $brokerPath = "$env:LOCALAPPDATA\Packages\Microsoft.AAD.BrokerPlugin_cw5n1h2txyewy\AC\TokenBroker\Accounts"
    if (Test-Path $brokerPath) {
        Get-ChildItem $brokerPath -File -Recurse -ErrorAction SilentlyContinue |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }
}
