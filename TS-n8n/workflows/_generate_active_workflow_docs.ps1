param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\n8n.env"),
    [string]$OutputRoot = $PSScriptRoot,
    [int]$Limit = 250,
    [string]$LocaleFile = (Join-Path $PSScriptRoot "_workflow_doc_locale.ko.json")
)

$ErrorActionPreference = "Stop"
$script:Locale = $null

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

function Load-Locale {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Locale file not found: $Path"
    }

    $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $script:Locale = $raw | ConvertFrom-Json
}

function T {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Key,

        [Parameter(ValueFromRemainingArguments = $true)]
        [object[]]$Args
    )

    $value = $script:Locale.$Key
    if ($null -eq $value) {
        return $Key
    }

    if ($null -ne $Args -and $Args.Count -gt 0) {
        return ($value -f $Args)
    }

    return [string]$value
}

function Invoke-N8nApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("GET")]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        $args = @(
            "-sS",
            "-X", $Method,
            "-H", "accept: application/json",
            "-H", "X-N8N-API-KEY: $env:N8N_API_KEY",
            "-o", $tempFile,
            $Url
        )

        & curl.exe @args
        if ($LASTEXITCODE -ne 0) {
            throw "curl.exe failed with exit code $LASTEXITCODE"
        }

        $raw = [System.IO.File]::ReadAllText($tempFile, [System.Text.Encoding]::UTF8)
        return $raw | ConvertFrom-Json
    }
    finally {
        if (Test-Path -LiteralPath $tempFile) {
            Remove-Item -LiteralPath $tempFile -Force
        }
    }
}

function Get-SafePathName {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $invalidChars = [System.IO.Path]::GetInvalidFileNameChars()
    $safeChars = $Name.ToCharArray() | ForEach-Object {
        if ($invalidChars -contains $_) { "_" } else { [string]$_ }
    }

    return (-join $safeChars).Trim()
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Content,

        [switch]$WithBom
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    $contentBytes = $encoding.GetBytes($Content)

    if ($WithBom.IsPresent) {
        $preamble = [System.Text.Encoding]::UTF8.GetPreamble()
        $allBytes = New-Object byte[] ($preamble.Length + $contentBytes.Length)
        [System.Buffer]::BlockCopy($preamble, 0, $allBytes, 0, $preamble.Length)
        [System.Buffer]::BlockCopy($contentBytes, 0, $allBytes, $preamble.Length, $contentBytes.Length)
        [System.IO.File]::WriteAllBytes($Path, $allBytes)
        return
    }

    [System.IO.File]::WriteAllBytes($Path, $contentBytes)
}

function ConvertTo-PrettyJson {
    param(
        [Parameter(Mandatory = $true)]
        $Value
    )

    return ($Value | ConvertTo-Json -Depth 100)
}

function Get-WorkflowPayload {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $payload = [ordered]@{
        name = $Workflow.name
        nodes = $Workflow.nodes
        connections = $Workflow.connections
        settings = if ($null -ne $Workflow.settings) { $Workflow.settings } else { [ordered]@{} }
    }

    if ($null -ne $Workflow.description) {
        $payload.description = $Workflow.description
    }

    return $payload
}

function Get-CredentialRefs {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $refs = foreach ($node in $Workflow.nodes) {
        if ($null -eq $node.credentials) { continue }

        foreach ($prop in $node.credentials.PSObject.Properties) {
            [PSCustomObject]@{
                Node = $node.name
                Type = $prop.Name
                CredentialName = $prop.Value.name
                CredentialId = $prop.Value.id
            }
        }
    }

    return @($refs)
}

function Get-UnconnectedNodes {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $sourceNames = @($Workflow.connections.PSObject.Properties.Name)
    $targetNames = foreach ($connProp in $Workflow.connections.PSObject.Properties) {
        foreach ($mainGroup in $connProp.Value.main) {
            foreach ($edge in $mainGroup) {
                $edge.node
            }
        }
    }

    $connected = @($sourceNames + $targetNames)
    $connectedSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($name in $connected) {
        if ($null -ne $name) {
            [void]$connectedSet.Add([string]$name)
        }
    }

    $unconnected = foreach ($node in $Workflow.nodes) {
        if (-not $connectedSet.Contains([string]$node.name)) {
            $node.name
        }
    }

    return @($unconnected)
}

function Get-RiskNotes {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $notes = New-Object System.Collections.Generic.List[string]

    foreach ($name in (Get-UnconnectedNodes -Workflow $Workflow)) {
        $notes.Add((T "risk.unconnected" $name))
    }

    foreach ($node in $Workflow.nodes) {
        if ($node.type -eq "n8n-nodes-base.httpRequest") {
            $url = [string]$node.parameters.url
            if ($url -and ($url.StartsWith("http://") -or $url.StartsWith("=http://"))) {
                $notes.Add((T "risk.http_non_tls" $node.name))
            }
        }

        if ($node.type -eq "n8n-nodes-base.microsoftOutlook") {
            if ($node.parameters.eventId -and $node.parameters.eventId.value) {
                $notes.Add((T "risk.fixed_event" $node.name))
            }
        }
    }

    return @($notes)
}

function Get-WorkflowPurposeGuess {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $name = [string]$Workflow.name

    if ($name -match "Weekly-Meeting") {
        return (T "purpose.weekly_meeting")
    }
    if ($name -match "Daily-Scrum") {
        return (T "purpose.daily_scrum")
    }
    if ($name -match "github-pr-monitor") {
        return (T "purpose.github_pr")
    }
    if ($name -match "Issue" -or $name.Contains("이슈")) {
        return (T "purpose.issue")
    }
    if ($name -match "WebHook") {
        return (T "purpose.webhook")
    }
    if ($name.Contains("안내메일") -or $name.Contains("신입사원")) {
        return (T "purpose.onboarding")
    }

    return (T "purpose.general")
}

function Get-DayName {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Day
    )

    switch ($Day) {
        0 { return "Sun" }
        1 { return "Mon" }
        2 { return "Tue" }
        3 { return "Wed" }
        4 { return "Thu" }
        5 { return "Fri" }
        6 { return "Sat" }
        default { return [string]$Day }
    }
}

function Get-TriggerSummary {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $triggerNodes = @($Workflow.nodes | Where-Object { $_.type -match "trigger|webhook" })
    if ($triggerNodes.Count -eq 0) {
        return "- " + (T "trigger.none")
    }

    $lines = foreach ($node in $triggerNodes) {
        if ($node.type -eq "n8n-nodes-base.scheduleTrigger") {
            $intervals = @($node.parameters.rule.interval)
            $parts = foreach ($interval in $intervals) {
                $field = [string]$interval.field
                $hour = $interval.triggerAtHour
                $days = @($interval.triggerAtDay)

                if ($field -eq "weeks" -and $days.Count -gt 0) {
                    $dayText = ($days | ForEach-Object { Get-DayName -Day $_ }) -join ", "
                    T "trigger.weekly" $dayText $hour
                }
                elseif ($field) {
                    T "trigger.field" $field
                }
            }

            if (@($parts).Count -eq 0) {
                $parts = @((T "trigger.needs_review"))
            }

            "- {0}: {1}" -f $node.name, ($parts -join "; ")
        }
        elseif ($node.type -match "webhook") {
            $path = [string]$node.parameters.path
            $method = [string]$node.parameters.httpMethod
            "- {0}: {1}" -f $node.name, (T "trigger.webhook" $method $path)
        }
        else {
            "- {0}: {1}" -f $node.name, (T "trigger.generic" $node.type)
        }
    }

    return $lines -join "`n"
}

function Get-ExecutionSummary {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($connProp in $Workflow.connections.PSObject.Properties) {
        foreach ($mainGroup in $connProp.Value.main) {
            foreach ($edge in $mainGroup) {
                $lines.Add("- $($connProp.Name) -> $($edge.node)")
            }
        }
    }

    if ($lines.Count -eq 0) {
        $lines.Add("- " + (T "flow.none"))
    }

    return $lines -join "`n"
}

function Get-ExternalSystemsSummary {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $lines = New-Object System.Collections.Generic.List[string]

    foreach ($node in $Workflow.nodes) {
        switch ([string]$node.type) {
            "n8n-nodes-base.httpRequest" {
                $url = [string]$node.parameters.url
                if ($url) {
                    $lines.Add("- " + (T "external.http" $node.name $url))
                }
            }
            "n8n-nodes-base.slack" {
                $channel = [string]$node.parameters.channelId.value
                $lines.Add("- " + (T "external.slack" $node.name $channel))
            }
            "n8n-nodes-base.microsoftOutlook" {
                $calendar = [string]$node.parameters.calendarId.cachedResultName
                $event = [string]$node.parameters.eventId.cachedResultName
                $lines.Add("- " + (T "external.outlook" $node.name $calendar $event))
            }
            "n8n-nodes-base.notion" {
                $db = [string]$node.parameters.databaseId.cachedResultName
                $lines.Add("- " + (T "external.notion" $node.name $db))
            }
        }
    }

    if ($lines.Count -eq 0) {
        $lines.Add("- " + (T "external.none"))
    }

    return $lines -join "`n"
}

function Get-WorkflowEvidence {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("- " + (T "evidence.workflow_name" $Workflow.name))

    foreach ($node in $Workflow.nodes) {
        if ($node.type -eq "n8n-nodes-base.scheduleTrigger") {
            $lines.Add("- " + (T "evidence.schedule"))
        }

        if ($node.type -eq "n8n-nodes-base.httpRequest") {
            $url = [string]$node.parameters.url
            if ($url -match "data\.go\.kr") {
                $lines.Add("- " + (T "evidence.data_go"))
            }
            if ($url -match "powerplatform|powerautomate") {
                $lines.Add("- " + (T "evidence.power_automate"))
            }
        }

        if ($node.type -eq "n8n-nodes-base.microsoftOutlook") {
            $event = [string]$node.parameters.eventId.cachedResultName
            if ($event) {
                $lines.Add("- " + (T "evidence.outlook_event" $event))
            }
        }

        if ($node.type -eq "n8n-nodes-base.code") {
            $code = [string]$node.parameters.jsCode
            if ($code -match "issueCount|issuesContent") {
                $lines.Add("- " + (T "evidence.code_issue"))
            }
            if ($code -match "slackMessage|Sprint") {
                $lines.Add("- " + (T "evidence.code_meeting"))
            }
            if ($code -match "is_holiday|holiday") {
                $lines.Add("- " + (T "evidence.code_holiday"))
            }
        }
    }

    return (($lines | Select-Object -Unique) -join "`n")
}

function Get-NodePurpose {
    param(
        [Parameter(Mandatory = $true)]
        $Node
    )

    $type = [string]$Node.type
    $code = [string]$Node.parameters.jsCode
    $url = [string]$Node.parameters.url

    switch ($type) {
        "n8n-nodes-base.scheduleTrigger" { return (T "nodepurpose.schedule") }
        "n8n-nodes-base.webhook" { return (T "nodepurpose.webhook") }
        "n8n-nodes-base.httpRequest" {
            if ($url -match "data\.go\.kr") { return (T "nodepurpose.http_reference") }
            if ($url -match "powerplatform|powerautomate") { return (T "nodepurpose.http_notify") }
            return (T "nodepurpose.http")
        }
        "n8n-nodes-base.code" {
            if ($code -match "is_holiday|holiday") { return (T "nodepurpose.code_holiday") }
            if ($code -match "formattedDate") { return (T "nodepurpose.code_date") }
            if ($code -match "issueCount|issuesContent|teamsText|teamsEntities") { return (T "nodepurpose.code_issue") }
            if ($code -match "slackMessage|Sprint") { return (T "nodepurpose.code_meeting") }
            return (T "nodepurpose.code_general")
        }
        "n8n-nodes-base.if" {
            if ([string]$Node.parameters.conditions.conditions.leftValue -match "is_holiday") {
                return (T "nodepurpose.if_holiday")
            }
            return (T "nodepurpose.if")
        }
        "n8n-nodes-base.slack" { return (T "nodepurpose.slack") }
        "n8n-nodes-base.microsoftOutlook" { return (T "nodepurpose.outlook") }
        "n8n-nodes-base.notion" { return (T "nodepurpose.notion") }
        default { return (T "nodepurpose.default") }
    }
}

function Get-NodeWhyItExists {
    param(
        [Parameter(Mandatory = $true)]
        $Node
    )

    switch ([string]$Node.type) {
        "n8n-nodes-base.scheduleTrigger" { return (T "nodewhy.schedule") }
        "n8n-nodes-base.webhook" { return (T "nodewhy.webhook") }
        "n8n-nodes-base.httpRequest" { return (T "nodewhy.http") }
        "n8n-nodes-base.code" { return (T "nodewhy.code") }
        "n8n-nodes-base.if" { return (T "nodewhy.if") }
        "n8n-nodes-base.slack" { return (T "nodewhy.slack") }
        "n8n-nodes-base.microsoftOutlook" { return (T "nodewhy.outlook") }
        "n8n-nodes-base.notion" { return (T "nodewhy.notion") }
        default { return (T "nodewhy.default") }
    }
}

function Get-NodeClues {
    param(
        [Parameter(Mandatory = $true)]
        $Node
    )

    $clues = New-Object System.Collections.Generic.List[string]
    $type = [string]$Node.type
    $url = [string]$Node.parameters.url
    $code = [string]$Node.parameters.jsCode

    $clues.Add("type=$type")

    if ($type -eq "n8n-nodes-base.httpRequest" -and $url) {
        $clues.Add("url=$url")
    }
    if ($type -eq "n8n-nodes-base.slack" -and $Node.parameters.channelId.value) {
        $clues.Add("channel=$($Node.parameters.channelId.value)")
    }
    if ($type -eq "n8n-nodes-base.microsoftOutlook") {
        if ($Node.parameters.calendarId.cachedResultName) {
            $clues.Add("calendar=$($Node.parameters.calendarId.cachedResultName)")
        }
        if ($Node.parameters.eventId.cachedResultName) {
            $clues.Add("event=$($Node.parameters.eventId.cachedResultName)")
        }
    }
    if ($type -eq "n8n-nodes-base.code") {
        if ($code -match "holiday") { $clues.Add((T "clue.holiday")) }
        if ($code -match "formattedDate") { $clues.Add((T "clue.date")) }
        if ($code -match "issueCount|issuesContent") { $clues.Add((T "clue.issue")) }
        if ($code -match "slackMessage|Sprint") { $clues.Add((T "clue.meeting")) }
    }

    return ($clues -join ", ")
}

function Get-NodeDetailSection {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $lines = New-Object System.Collections.Generic.List[string]

    foreach ($node in $Workflow.nodes) {
        $credentialText = if ($node.credentials) {
            (@($node.credentials.PSObject.Properties | ForEach-Object { $_.Value.name }) -join ", ")
        }
        else {
            T "none"
        }

        $lines.Add("### $($node.name)")
        $lines.Add("")
        $lines.Add("- " + (T "label.type" "$($node.type) / version=$($node.typeVersion)"))
        $lines.Add("- " + (T "label.role" (Get-NodePurpose -Node $node)))
        $lines.Add("- " + (T "label.why" (Get-NodeWhyItExists -Node $node)))
        $lines.Add("- " + (T "label.clues" (Get-NodeClues -Node $node)))
        $lines.Add("- " + (T "label.credential" $credentialText))
        $lines.Add("")
    }

    return $lines -join "`n"
}

function Get-CredentialSummary {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $refs = Get-CredentialRefs -Workflow $Workflow
    if ($refs.Count -eq 0) {
        return "- " + (T "credential.none")
    }

    $lines = foreach ($ref in $refs) {
        "- " + (T "credential.item" $ref.Node $ref.Type $ref.CredentialName $ref.CredentialId)
    }

    return $lines -join "`n"
}

function Get-DesignMarkdown {
    param(
        [Parameter(Mandatory = $true)]
        $Workflow
    )

    $riskNotes = Get-RiskNotes -Workflow $Workflow
    $riskSection = if ($riskNotes.Count -eq 0) {
        "- " + (T "risk.none")
    }
    else {
        ($riskNotes | ForEach-Object { "- $_" }) -join "`n"
    }

    return @"
# $($Workflow.name) Design

## $(T "section.document_nature")

- $(T "intro.generated")
- $(T "intro.interpretation")
- $(T "intro.owner_review")

## $(T "section.basic_info")

- $(T "meta.workflow_name" $Workflow.name)
- $(T "meta.workflow_id" $Workflow.id)
- $(T "meta.active" $Workflow.active)
- $(T "meta.archived" $Workflow.isArchived)
- $(T "meta.created" $Workflow.createdAt)
- $(T "meta.updated" $Workflow.updatedAt)
- $(T "meta.version_counter" $Workflow.versionCounter)
- $(T "meta.node_count" $Workflow.nodes.Count)
- $(T "meta.connection_source_count" @($Workflow.connections.PSObject.Properties).Count)

## $(T "section.draft_purpose")

$(Get-WorkflowPurposeGuess -Workflow $Workflow)

## $(T "section.when_runs")

$(Get-TriggerSummary -Workflow $Workflow)

## $(T "section.flow_overview")

$(Get-ExecutionSummary -Workflow $Workflow)

## $(T "section.node_roles")

$(Get-NodeDetailSection -Workflow $Workflow)

## $(T "section.external_systems")

$(Get-ExternalSystemsSummary -Workflow $Workflow)

## $(T "section.evidence")

$(Get-WorkflowEvidence -Workflow $Workflow)

## $(T "section.risks")

$riskSection

## $(T "section.credentials")

$(Get-CredentialSummary -Workflow $Workflow)

## $(T "section.api_files")

- $(T "api.json_file" ($Workflow.name + "_api.json"))
- $(T "api.ps1_file" ($Workflow.name + "_api.ps1"))

## $(T "section.json_shape")

$(T "json.intro")

- name
- nodes
- connections
- settings
- description ($(T "json.when_present"))
"@
}

function Get-UpsertScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkflowFileName
    )

    return @"
param(
    [string]`$EnvFile = (Join-Path `$PSScriptRoot "..\..\n8n.env"),
    [string]`$WorkflowJson = (Join-Path `$PSScriptRoot "$WorkflowFileName")
)

`$ErrorActionPreference = "Stop"

function Set-EnvFromFile {
    param(
        [Parameter(Mandatory = `$true)]
        [string]`$Path
    )

    if (-not (Test-Path -LiteralPath `$Path)) {
        throw "Environment file not found: `$Path"
    }

    Get-Content -LiteralPath `$Path | ForEach-Object {
        if (`$_ -match '^\s*#') { return }
        if (`$_ -match '^(.*?)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2])
        }
    }
}

function Invoke-N8nApi {
    param(
        [Parameter(Mandatory = `$true)]
        [ValidateSet("GET", "POST", "PUT")]
        [string]`$Method,

        [Parameter(Mandatory = `$true)]
        [string]`$Url,

        [string]`$BodyFile
    )

    `$args = @(
        "-sS",
        "-X", `$Method,
        "-H", "accept: application/json",
        "-H", "X-N8N-API-KEY: `$env:N8N_API_KEY"
    )

    if (`$BodyFile) {
        `$args += @(
            "-H", "Content-Type: application/json",
            "--data-binary", "@`$BodyFile"
        )
    }

    `$args += `$Url

    `$raw = & curl.exe @args
    if (`$LASTEXITCODE -ne 0) {
        throw "curl.exe failed with exit code `$LASTEXITCODE"
    }

    return `$raw | ConvertFrom-Json
}

Set-EnvFromFile -Path `$EnvFile

if (-not `$env:N8N_BASE_URL) {
    throw "N8N_BASE_URL is missing in env file."
}

if (-not `$env:N8N_API_KEY) {
    throw "N8N_API_KEY is missing in env file."
}

if (-not (Test-Path -LiteralPath `$WorkflowJson)) {
    throw "Workflow JSON not found: `$WorkflowJson"
}

`$workflow = Get-Content -LiteralPath `$WorkflowJson -Raw | ConvertFrom-Json
`$workflowName = `$workflow.name

if (-not `$workflowName) {
    throw "Workflow name is missing in JSON file."
}

`$baseUrl = `$env:N8N_BASE_URL.TrimEnd("/")
`$listUrl = "`$baseUrl/api/v1/workflows?limit=250"
`$existing = Invoke-N8nApi -Method GET -Url `$listUrl
`$target = `$existing.data | Where-Object { `$_.name -eq `$workflowName } | Select-Object -First 1

if (`$target) {
    `$updateUrl = "`$baseUrl/api/v1/workflows/`$(`$target.id)"
    `$result = Invoke-N8nApi -Method PUT -Url `$updateUrl -BodyFile `$WorkflowJson
    [PSCustomObject]@{
        action = "updated"
        id = `$result.id
        name = `$result.name
        active = `$result.active
        updatedAt = `$result.updatedAt
    }
}
else {
    `$createUrl = "`$baseUrl/api/v1/workflows"
    `$result = Invoke-N8nApi -Method POST -Url `$createUrl -BodyFile `$WorkflowJson
    [PSCustomObject]@{
        action = "created"
        id = `$result.id
        name = `$result.name
        active = `$result.active
        updatedAt = `$result.updatedAt
    }
}
"@
}

Set-EnvFromFile -Path $EnvFile
Load-Locale -Path $LocaleFile

if (-not $env:N8N_BASE_URL) {
    throw "N8N_BASE_URL is missing in env file."
}

if (-not $env:N8N_API_KEY) {
    throw "N8N_API_KEY is missing in env file."
}

$baseUrl = $env:N8N_BASE_URL.TrimEnd("/")
$listUrl = "$baseUrl/api/v1/workflows?limit=$Limit"
$list = Invoke-N8nApi -Method GET -Url $listUrl
$activeWorkflows = @($list.data | Where-Object { $_.active -eq $true } | Sort-Object name)

foreach ($wf in $activeWorkflows) {
    $detailUrl = "$baseUrl/api/v1/workflows/$($wf.id)"
    $workflow = Invoke-N8nApi -Method GET -Url $detailUrl

    $safeDirName = Get-SafePathName -Name $workflow.name
    $workflowDir = Join-Path $OutputRoot $safeDirName
    New-Item -ItemType Directory -Force -Path $workflowDir | Out-Null

    $designPath = Join-Path $workflowDir ($workflow.name + "_design.md")
    $jsonPath = Join-Path $workflowDir ($workflow.name + "_api.json")
    $ps1Path = Join-Path $workflowDir ($workflow.name + "_api.ps1")

    $payload = Get-WorkflowPayload -Workflow $workflow
    $jsonText = ConvertTo-PrettyJson -Value $payload
    $designText = Get-DesignMarkdown -Workflow $workflow
    $scriptText = Get-UpsertScript -WorkflowFileName ($workflow.name + "_api.json")

    Write-Utf8File -Path $designPath -Content $designText -WithBom
    Write-Utf8File -Path $jsonPath -Content $jsonText
    Write-Utf8File -Path $ps1Path -Content $scriptText

    [PSCustomObject]@{
        workflow = $workflow.name
        folder = $workflowDir
        files = 3
    }
}
