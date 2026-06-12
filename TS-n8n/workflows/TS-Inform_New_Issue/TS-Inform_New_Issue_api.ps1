param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\n8n.env"),
    [string]$WorkflowJson = (Join-Path $PSScriptRoot "TS-Inform_New_Issue_api.json")
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

$workflow = Get-Content -LiteralPath $WorkflowJson -Raw | ConvertFrom-Json
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
    $result = Invoke-N8nApi -Method PUT -Url $updateUrl -BodyFile $WorkflowJson
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
    $result = Invoke-N8nApi -Method POST -Url $createUrl -BodyFile $WorkflowJson
    [PSCustomObject]@{
        action = "created"
        id = $result.id
        name = $result.name
        active = $result.active
        updatedAt = $result.updatedAt
    }
}