param(
    [string[]]$TargetNames
)

$ErrorActionPreference = "Stop"

$targets = @(
    @{ Name = "Check-Weekly-Meeting"; Path = "workflows/Check-Weekly-Meeting/Check-Weekly-Meeting_api.json" },
    @{ Name = "Clean-Daily-Scrum"; Path = "workflows/Clean-Daily-Scrum/Clean-Daily-Scrum_api.json" },
    @{ Name = "github-pr-monitor"; Path = "workflows/github-pr-monitor/github-pr-monitor_api.json" },
    @{ Name = "Plan-Daily-Scrum"; Path = "workflows/Plan-Daily-Scrum/Plan-Daily-Scrum_api.json" },
    @{ Name = "Private-ConfirmDailyScrum"; Path = "workflows/Private-ConfirmDailyScrum/Private-ConfirmDailyScrum_api.json" },
    @{ Name = "TS-IssueCheck(08,16)"; Path = "workflows/TS-IssueCheck(08,16)/TS-IssueCheck(08,16)_api.json" },
    @{ Name = "TS-Inform_New_Issue"; Path = "workflows/TS-Inform_New_Issue/TS-Inform_New_Issue_api.json" }
)

Get-Content "n8n.env" | ForEach-Object {
    if ($_ -match "^(.*?)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

$baseUrl = $env:N8N_BASE_URL.TrimEnd("/")
$apiKey = $env:N8N_API_KEY

function Invoke-N8nJson {
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
        "-H", "X-N8N-API-KEY: $apiKey"
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
        throw "curl failed: $LASTEXITCODE"
    }

    return $raw | ConvertFrom-Json
}

function New-LinkObject {
    param([string]$NodeName)

    return [pscustomobject]@{
        node = $NodeName
        type = "main"
        index = 0
    }
}

function New-MainConnection {
    param([string]$NodeName)

    return ,(@((New-LinkObject -NodeName $NodeName)))
}

function Set-Connection {
    param(
        $Connections,
        [string]$SourceNodeName,
        [string]$TargetNodeName
    )

    $main = ,(New-MainConnection -NodeName $TargetNodeName)
    $value = [pscustomobject]@{
        main = $main
    }

    $existing = $Connections.PSObject.Properties[$SourceNodeName]
    if ($existing) {
        $existing.Value.main = $main
    }
    else {
        $Connections | Add-Member -NotePropertyName $SourceNodeName -NotePropertyValue $value -Force
    }
}

function Set-NodeProperty {
    param(
        $Node,
        [string]$Name,
        $Value
    )

    $existing = $Node.PSObject.Properties[$Name]
    if ($existing) {
        $existing.Value = $Value
    }
    else {
        $Node | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
    }
}

$baselineCode = @'
const source = $input.first()?.json ?? {};
const now = new Date();
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short'
}).formatToParts(now);

const year = parts.find((p) => p.type === 'year')?.value;
const month = parts.find((p) => p.type === 'month')?.value;
const day = parts.find((p) => p.type === 'day')?.value;
const weekdayName = parts.find((p) => p.type === 'weekday')?.value;

if (!year || !month || !day || !weekdayName) {
  throw new Error('Failed to resolve current date in Asia/Seoul.');
}

const todayInt = Number(`${year}${month}${day}`);
const todayDate = `${year}-${month}-${day}`;
const todayMMDD = `${month}${day}`;
const isWeekend = ['Sat', 'Sun'].includes(weekdayName);

return [{
  json: {
    ...source,
    Year: Number(year),
    Month: Number(month),
    Day: Number(day),
    WeekdayName: weekdayName,
    IsWeekend: isWeekend,
    DefaultIsHoliday: isWeekend,
    DefaultHolidayName: isWeekend ? '\uC8FC\uB9D0' : '\uD3C9\uC77C',
    todayInt,
    todayDate,
    todayMMDD
  }
}];
'@

$dbQuery = @'
=DECLARE @d DATE = CAST('{{ $('Weekday Baseline').item.json.todayDate }}' AS date);
SELECT
    CONVERT(VARCHAR(8), @d, 112) AS check_date,
    CAST(CASE WHEN EXISTS (
        SELECT 1
        FROM TsMgmt.dbo.HolidayCalendarKR
        WHERE HolidayDate = @d
    ) THEN 1 ELSE 0 END AS bit) AS found_in_db,
    ISNULL((SELECT TOP 1 HolidayName FROM TsMgmt.dbo.HolidayCalendarKR WHERE HolidayDate = @d), '') AS holiday_name,
    ISNULL((SELECT TOP 1 SourceType FROM TsMgmt.dbo.HolidayCalendarKR WHERE HolidayDate = @d), '') AS source_type,
    ISNULL((SELECT TOP 1 SourceYear FROM TsMgmt.dbo.HolidayCalendarKR WHERE HolidayDate = @d), 0) AS source_year;
'@

$resolverTemplate = @'
const recurringHolidays = [
  { date: '0501', dateName: '\uADFC\uB85C\uC790\uC758 \uB0A0' },
  { date: '1231', dateName: '\uCC3D\uB9BD\uAE30\uB150\uC77C\uB300\uD734' }
];

const baseline = $('Weekday Baseline').first().json;
const apiPayload = $('__API_NODE_NAME__').first()?.json ?? {};
const dbPayload = $('Holiday DB Fallback').first()?.json ?? {};

function normalizeApiItems(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

const apiItems = !apiPayload.error
  ? normalizeApiItems(apiPayload.response?.body?.items?.item)
  : [];
const apiMatch = apiItems.find((item) => String(item?.locdate ?? '') === String(baseline.todayInt));
const customMatch = recurringHolidays.find((item) => item.date === baseline.todayMMDD);
const dbFound = !dbPayload.error && [true, 1, '1', 'true'].includes(dbPayload.found_in_db);

let isHoliday = !!baseline.DefaultIsHoliday;
let holidayName = baseline.DefaultHolidayName || (isHoliday ? '\uC8FC\uB9D0' : '\uD3C9\uC77C');
let holidayLookupSource = isHoliday ? 'default-weekend' : 'default-weekday';

if (apiMatch) {
  isHoliday = true;
  holidayName = String(apiMatch.dateName || '\uACF5\uD734\uC77C');
  holidayLookupSource = 'api';
} else if (customMatch) {
  isHoliday = true;
  holidayName = customMatch.dateName;
  holidayLookupSource = 'custom';
} else if (dbFound) {
  isHoliday = true;
  holidayName = String(dbPayload.holiday_name || '\uACF5\uD734\uC77C');
  holidayLookupSource = dbPayload.source_type ? `db:${dbPayload.source_type}` : 'db';
}

return [{
  json: {
    check_date: baseline.todayInt,
    is_holiday: isHoliday,
    holiday_name: holidayName,
    is_weekend: !!baseline.IsWeekend,
    weekday_name: baseline.WeekdayName,
    holiday_lookup_source: holidayLookupSource,
    holiday_lookup_failed: Boolean(apiPayload.error) && Boolean(dbPayload.error),
    api_error: apiPayload.error?.message || apiPayload.error || '',
    db_error: dbPayload.error || ''
  }
}];
'@

$selectedTargets = if ($TargetNames -and $TargetNames.Count -gt 0) {
    $targets | Where-Object { $_.Name -in $TargetNames }
} else {
    $targets
}

if (-not $selectedTargets -or $selectedTargets.Count -eq 0) {
    throw "No matching workflows selected."
}

$list = Invoke-N8nJson -Method GET -Url "$baseUrl/api/v1/workflows?limit=250"
$results = @()

foreach ($target in $selectedTargets) {
    $summary = $list.data | Where-Object { $_.name -eq $target.Name } | Select-Object -First 1
    if (-not $summary) {
        throw "Workflow not found: $($target.Name)"
    }

    $wf = Invoke-N8nJson -Method GET -Url "$baseUrl/api/v1/workflows/$($summary.id)"
    $nodes = @($wf.nodes)

    $apiNode = $nodes | Where-Object {
        $_.type -eq "n8n-nodes-base.httpRequest" -and
        $_.parameters.url -and
        $_.parameters.url.ToString().Contains("apis.data.go.kr") -and
        $_.parameters.url.ToString().Contains("getRestDeInfo")
    } | Select-Object -First 1

    if (-not $apiNode) {
        throw "Holiday API node not found: $($target.Name)"
    }

    $apiConnProp = $wf.connections.PSObject.Properties[$apiNode.name]
    if (-not $apiConnProp) {
        throw "Outgoing connection not found for API node: $($target.Name) / $($apiNode.name)"
    }

    $nextLink = $apiConnProp.Value.main[0][0]
    $resolverNode = $nodes | Where-Object { $_.name -eq $nextLink.node } | Select-Object -First 1
    if ($resolverNode -and $resolverNode.name -eq "Holiday DB Fallback") {
        $dbConnProp = $wf.connections.PSObject.Properties["Holiday DB Fallback"]
        if (-not $dbConnProp -or -not $dbConnProp.Value.main -or -not $dbConnProp.Value.main[0] -or -not $dbConnProp.Value.main[0][0]) {
            throw "Resolver code node not found after existing DB fallback: $($target.Name)"
        }

        $resolverLink = $dbConnProp.Value.main[0][0]
        $resolverNode = $nodes | Where-Object { $_.name -eq $resolverLink.node } | Select-Object -First 1
    }

    if (-not $resolverNode -or $resolverNode.type -ne "n8n-nodes-base.code") {
        throw "Resolver code node not found after API node: $($target.Name)"
    }

    $predecessorNames = @()
    foreach ($connProp in $wf.connections.PSObject.Properties) {
        $mainSets = $connProp.Value.main
        if (-not $mainSets) { continue }

        foreach ($branch in $mainSets) {
            if (-not $branch) { continue }
            foreach ($link in $branch) {
                if ($link.node -eq $apiNode.name) {
                    $predecessorNames += $connProp.Name
                }
            }
        }
    }

    if ($predecessorNames.Count -eq 0) {
        throw "No predecessor feeding API node: $($target.Name)"
    }

    $apiPosX = [int]($apiNode.position[0])
    $apiPosY = [int]($apiNode.position[1])
    $resolverPosX = [int]($resolverNode.position[0])
    $resolverPosY = [int]($resolverNode.position[1])

    $baselineNode = $nodes | Where-Object { $_.name -eq "Weekday Baseline" } | Select-Object -First 1
    if (-not $baselineNode) {
        $baselineNode = [pscustomobject]@{
            parameters = [pscustomobject]@{ jsCode = $baselineCode }
            type = "n8n-nodes-base.code"
            typeVersion = 2
            position = @(($apiPosX - 220), $apiPosY)
            id = [guid]::NewGuid().ToString()
            name = "Weekday Baseline"
            alwaysOutputData = $true
        }
        $wf.nodes += $baselineNode
    }
    else {
        $baselineNode.parameters.jsCode = $baselineCode
        Set-NodeProperty -Node $baselineNode -Name "type" -Value "n8n-nodes-base.code"
        Set-NodeProperty -Node $baselineNode -Name "typeVersion" -Value 2
        Set-NodeProperty -Node $baselineNode -Name "alwaysOutputData" -Value $true
    }

    $dbNode = $nodes | Where-Object { $_.name -eq "Holiday DB Fallback" } | Select-Object -First 1
    if (-not $dbNode) {
        $dbNode = [pscustomobject]@{
            parameters = [pscustomobject]@{
                operation = "executeQuery"
                query = $dbQuery
            }
            type = "n8n-nodes-base.microsoftSql"
            typeVersion = 1.1
            position = @(($resolverPosX - 180), $resolverPosY)
            id = [guid]::NewGuid().ToString()
            name = "Holiday DB Fallback"
            alwaysOutputData = $true
            onError = "continueRegularOutput"
            credentials = [pscustomobject]@{
                microsoftSql = [pscustomobject]@{
                    id = "2dZb5OQPbTyO3052"
                    name = "TsMgmt(DevTest_SQL2022_26)"
                }
            }
        }
        $wf.nodes += $dbNode
    }
    else {
        $dbNode.parameters.operation = "executeQuery"
        $dbNode.parameters.query = $dbQuery
        Set-NodeProperty -Node $dbNode -Name "type" -Value "n8n-nodes-base.microsoftSql"
        Set-NodeProperty -Node $dbNode -Name "typeVersion" -Value 1.1
        Set-NodeProperty -Node $dbNode -Name "alwaysOutputData" -Value $true
        Set-NodeProperty -Node $dbNode -Name "onError" -Value "continueRegularOutput"
        Set-NodeProperty -Node $dbNode -Name "credentials" -Value ([pscustomobject]@{
            microsoftSql = [pscustomobject]@{
                id = "2dZb5OQPbTyO3052"
                name = "TsMgmt(DevTest_SQL2022_26)"
            }
        })
    }

    $resolverCode = $resolverTemplate.Replace("__API_NODE_NAME__", $apiNode.name)
    $resolverNode.parameters.jsCode = $resolverCode
    Set-NodeProperty -Node $resolverNode -Name "alwaysOutputData" -Value $true

    Set-NodeProperty -Node $apiNode -Name "onError" -Value "continueRegularOutput"
    Set-NodeProperty -Node $apiNode -Name "alwaysOutputData" -Value $true

    foreach ($predName in $predecessorNames | Select-Object -Unique) {
        $prop = $wf.connections.PSObject.Properties[$predName]
        for ($i = 0; $i -lt $prop.Value.main.Count; $i++) {
            $branch = $prop.Value.main[$i]
            if (-not $branch) { continue }

            for ($j = 0; $j -lt $branch.Count; $j++) {
                if ($branch[$j].node -eq $apiNode.name) {
                    $branch[$j].node = "Weekday Baseline"
                }
            }
        }
    }

    Set-Connection -Connections $wf.connections -SourceNodeName "Weekday Baseline" -TargetNodeName $apiNode.name
    Set-Connection -Connections $wf.connections -SourceNodeName $apiNode.name -TargetNodeName "Holiday DB Fallback"
    Set-Connection -Connections $wf.connections -SourceNodeName "Holiday DB Fallback" -TargetNodeName $resolverNode.name

    $payload = [ordered]@{
        name = $wf.name
        nodes = $wf.nodes
        connections = $wf.connections
        settings = $wf.settings
    }

    $tmpFile = Join-Path $env:TEMP ("workflow-update-" + $summary.id + ".json")
    $wfJson = $payload | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($tmpFile, $wfJson, (New-Object System.Text.UTF8Encoding($false)))

    $null = Invoke-N8nJson -Method PUT -Url "$baseUrl/api/v1/workflows/$($summary.id)" -BodyFile $tmpFile
    if ($summary.active) {
        $null = Invoke-N8nJson -Method POST -Url "$baseUrl/api/v1/workflows/$($summary.id)/activate"
    }

    $localPath = Join-Path (Get-Location) $target.Path
    [System.IO.File]::WriteAllText($localPath, $wfJson, (New-Object System.Text.UTF8Encoding($false)))

    $results += [pscustomobject]@{
        name = $target.Name
        id = $summary.id
        active = [bool]$summary.active
        apiNode = $apiNode.name
        resolverNode = $resolverNode.name
    }
}

$results | ConvertTo-Json -Depth 10
