param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\n8n.env"),
    [string]$WorkflowJson = (Join-Path $PSScriptRoot "github-pr-monitor_api.json")
)

$ErrorActionPreference = "Stop"

function Set-EnvFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Environment file not found: $Path"
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        if ($_ -match '^\s*#') { return }
        if ($_ -match '^(.*?)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

function Invoke-N8nApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("GET", "POST", "PUT")]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Url,

        [string]$BodyFile
    )

    $args = @(
        "-sS",
        "-X", $Method,
        "-H", "accept: application/json",
        "-H", "X-N8N-API-KEY: $env:N8N_API_KEY"
    )

    if ($BodyFile) {
        $args += @(
            "-H", "Content-Type: application/json",
            "--data-binary", "@$BodyFile"
        )
    }

    $args += $Url

    $raw = & curl.exe @args
    if ($LASTEXITCODE -ne 0) {
        throw "curl.exe failed with exit code $LASTEXITCODE"
    }

    return $raw | ConvertFrom-Json
}

function New-PreparedWorkflowJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath
    )

    $raw = Get-Content -LiteralPath $SourcePath -Raw
    $workflow = $raw | ConvertFrom-Json

    if ($raw -notmatch "__N8N_GITHUB_CREDENTIAL_NAME__") {
        return [PSCustomObject]@{
            Workflow = $workflow
            BodyFile = $SourcePath
            TempFile = $null
        }
    }

    if (-not $env:N8N_GITHUB_CREDENTIAL_NAME) {
        throw "N8N_GITHUB_CREDENTIAL_NAME is required when the workflow JSON contains __N8N_GITHUB_CREDENTIAL_NAME__."
    }

    foreach ($node in $workflow.nodes) {
        if ($node.credentials -and $node.credentials.githubApi -and $node.credentials.githubApi.name -eq "__N8N_GITHUB_CREDENTIAL_NAME__") {
            $node.credentials.githubApi.name = $env:N8N_GITHUB_CREDENTIAL_NAME
        }
    }

    $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) (([System.IO.Path]::GetRandomFileName()) + ".json")
    $jsonText = $workflow | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($tempFile, $jsonText, (New-Object System.Text.UTF8Encoding($false)))

    return [PSCustomObject]@{
        Workflow = $workflow
        BodyFile = $tempFile
        TempFile = $tempFile
    }
}

Set-EnvFromFile -Path $EnvFile

if (-not $env:N8N_BASE_URL) {
    throw "N8N_BASE_URL is missing in env file."
}

if (-not $env:N8N_API_KEY) {
    throw "N8N_API_KEY is missing in env file."
}

if (-not (Test-Path -LiteralPath $WorkflowJson)) {
    throw "Workflow JSON not found: $WorkflowJson"
}

$prepared = New-PreparedWorkflowJson -SourcePath $WorkflowJson

try {
$workflow = $prepared.Workflow
$workflowName = $workflow.name

if (-not $workflowName) {
    throw "Workflow name is missing in JSON file."
}

$baseUrl = $env:N8N_BASE_URL.TrimEnd("/")
$listUrl = "$baseUrl/api/v1/workflows?limit=250"
$existing = Invoke-N8nApi -Method GET -Url $listUrl
$target = $existing.data | Where-Object { $_.name -eq $workflowName } | Select-Object -First 1

if ($target) {
    $updateUrl = "$baseUrl/api/v1/workflows/$($target.id)"
    $result = Invoke-N8nApi -Method PUT -Url $updateUrl -BodyFile $prepared.BodyFile
    [PSCustomObject]@{
        action = "updated"
        id = $result.id
        name = $result.name
        active = $result.active
        updatedAt = $result.updatedAt
    }
}
else {
    $createUrl = "$baseUrl/api/v1/workflows"
    $result = Invoke-N8nApi -Method POST -Url $createUrl -BodyFile $prepared.BodyFile
    [PSCustomObject]@{
        action = "created"
        id = $result.id
        name = $result.name
        active = $result.active
        updatedAt = $result.updatedAt
    }
}
}
finally {
    if ($prepared.TempFile -and (Test-Path -LiteralPath $prepared.TempFile)) {
        Remove-Item -LiteralPath $prepared.TempFile -Force
    }
}
