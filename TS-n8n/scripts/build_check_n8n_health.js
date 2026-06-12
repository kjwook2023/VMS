const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflowDir = path.join(root, 'workflows', 'Check-n8n-health');
const workflowPath = path.join(workflowDir, 'Check-n8n-health_api.json');

const MONITOR_WEBHOOK =
  process.env.TS_MONITOR_TEAMS_WEBHOOK || 'https://redacted.invalid/powerautomate/check-n8n-health-webhook';

const buildTeamsPayloadCode = [
  "function normalizeRaw(value) { const text = String(value ?? ''); const match = text.match(/^\"(.*)\"$/); return match ? match[1] : text; }",
  "const queryTime = normalizeRaw($json.QueryTime);",
  "const latest = normalizeRaw($json.LatestCollectionTime);",
  "const isHealthy = String($json.DataExists ?? '') === '1';",
  "function toKstString(value) {",
  "  if (!value) return '\\uC5C6\\uC74C';",
  "  if (/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/.test(value)) return value + ' KST';",
  "  const date = new Date(value);",
  "  if (Number.isNaN(date.getTime())) return String(value);",
  "  const parts = new Intl.DateTimeFormat('en-CA', {",
  "    timeZone: 'Asia/Seoul',",
  "    year: 'numeric',",
  "    month: '2-digit',",
  "    day: '2-digit',",
  "    hour: '2-digit',",
  "    minute: '2-digit',",
  "    second: '2-digit',",
  "    hour12: false,",
  "  }).formatToParts(date);",
  "  const pick = (type) => parts.find((part) => part.type === type)?.value || '';",
  "  return pick('year') + '-' + pick('month') + '-' + pick('day') + ' ' + pick('hour') + ':' + pick('minute') + ':' + pick('second') + ' KST';",
  "}",
  "const title = isHealthy",
  "  ? '\\u2705 Check-n8n-health \\uC815\\uC0C1 \\uC0C1\\uD0DC'",
  "  : '\\u26A0\\uFE0F Check-n8n-health \\uACBD\\uACE0 \\uC0C1\\uD0DC';",
  "const intro = isHealthy",
  "  ? '\\uD604\\uC7AC 192.168.1.85 \\uC11C\\uBC84\\uC758 n8n \\uD638\\uC2A4\\uD305 \\uD5EC\\uC2A4 \\uB370\\uC774\\uD130 \\uC218\\uC9D1\\uC740 \\uC815\\uC0C1 \\uB3D9\\uC791 \\uC911\\uC785\\uB2C8\\uB2E4.'",
  "  : '\\uCD5C\\uADFC 8\\uC2DC\\uAC04 \\uC774\\uB0B4\\uC5D0 ServerHealthLog \\uB370\\uC774\\uD130\\uAC00 \\uD655\\uC778\\uB418\\uC9C0 \\uC54A\\uC2B5\\uB2C8\\uB2E4.';",
  "const statusText = isHealthy ? '\\uC815\\uC0C1' : '\\uACBD\\uACE0';",
  "const cardBody = [",
  "  { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true },",
  "  { type: 'TextBlock', text: intro, wrap: true, spacing: 'Small' },",
  "  { type: 'FactSet', facts: [",
  "    { title: '\\uB300\\uC0C1 \\uC11C\\uBC84', value: '192.168.1.85' },",
  "    { title: '\\uC810\\uAC80 \\uB300\\uC0C1', value: 'n8n \\uD638\\uC2A4\\uD305 \\uC11C\\uBC84 \\uC218\\uC9D1 \\uB370\\uC774\\uD130' },",
  "    { title: '\\uC0C1\\uD0DC', value: statusText },",
  "    { title: 'QueryRunTime', value: toKstString(queryTime) },",
  "    { title: 'LastCollectionTime', value: toKstString(latest) },",
  "    { title: 'DataExists', value: String($json.DataExists ?? '') || '0' },",
  "  ] },",
  "  { type: 'TextBlock', text: '\\uBCF8 \\uC54C\\uB9BC\\uC740 TsMgmt.dbo.ServerHealthLog \\uAE30\\uC900 \\uC218\\uC9D1 \\uC0C1\\uD0DC \\uC810\\uAC80 \\uACB0\\uACFC\\uC785\\uB2C8\\uB2E4.', wrap: true, spacing: 'Medium' }",
  "];",
  "return [{ json: { cardBody, isHealthy } }];",
].join('\n');

const warningMailSubject =
  '[Warning] 서버 헬스 모니터링 데이터가 수집되지 않고 있습니다.';
const warningMailBody =
  "={{ (() => { const data = $('DataMap').item.json ?? {}; const normalizeRaw = (value) => { const text = String(value ?? ''); const match = text.match(/^\"(.*)\"$/); return match ? match[1] : text; }; const queryTime = normalizeRaw(data.QueryTime); const latest = normalizeRaw(data.LatestCollectionTime); const dataExists = String(data.DataExists ?? '0'); const toKstString = (value) => { if (!value) return '\\uC5C6\\uC74C'; const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value); const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date); const pick = (type) => parts.find((part) => part.type === type)?.value || ''; return pick('year') + '-' + pick('month') + '-' + pick('day') + ' ' + pick('hour') + ':' + pick('minute') + ':' + pick('second') + ' KST'; }; return `<div style=\"font-size:14px; font-family:'Malgun Gothic',sans-serif; line-height:1.7;\"><p>\\uC11C\\uBC84 \\uD5EC\\uC2A4 \\uB370\\uC774\\uD130\\uAC00 \\uCD5C\\uADFC 8\\uC2DC\\uAC04 \\uC774\\uB0B4\\uC5D0 \\uC218\\uC9D1\\uB418\\uC9C0 \\uC54A\\uC558\\uC2B5\\uB2C8\\uB2E4.</p><p>192.168.1.85 \\uC11C\\uBC84\\uC758 n8n \\uD638\\uC2A4\\uD305 \\uC0C1\\uD0DC \\uC810\\uAC80 \\uAE30\\uC900\\uC73C\\uB85C TsMgmt.dbo.ServerHealthLog \\uCD5C\\uC2E0 \\uC218\\uC9D1 \\uC2DC\\uAC01\\uC774 \\uC784\\uACC4\\uC2DC\\uAC04\\uBCF4\\uB2E4 \\uC624\\uB798\\uB418\\uC5C8\\uC2B5\\uB2C8\\uB2E4.</p><table style=\"border-collapse:collapse; margin-top:12px;\"><tr><td style=\"padding:4px 12px 4px 0;\"><strong>\\uB300\\uC0C1 \\uC11C\\uBC84</strong></td><td>192.168.1.85</td></tr><tr><td style=\"padding:4px 12px 4px 0;\"><strong>\\uD310\\uC815</strong></td><td>\\uACBD\\uACE0</td></tr><tr><td style=\"padding:4px 12px 4px 0;\"><strong>QueryRunTime</strong></td><td>${toKstString(queryTime)}</td></tr><tr><td style=\"padding:4px 12px 4px 0;\"><strong>LastCollectionTime</strong></td><td>${toKstString(latest)}</td></tr><tr><td style=\"padding:4px 12px 4px 0;\"><strong>DataExists</strong></td><td>${dataExists}</td></tr></table><p style=\"margin-top:14px;\">\\uD655\\uC778 \\uB300\\uC0C1: ServerHealthLog \\uB370\\uC774\\uD130 \\uC218\\uC9D1 \\uACBD\\uB85C \\uBC0F 192.168.1.85 \\uC11C\\uBC84\\uC758 n8n \\uAD00\\uB828 \\uC0C1\\uD0DC</p></div>`; })() }}";

const workflow = {
  name: 'Check-n8n-health',
  nodes: [
    {
      parameters: {
        rule: {
          interval: [
            { field: 'cronExpression', expression: '0 55 7 * * *' },
            { field: 'cronExpression', expression: '0 25 16 * * *' },
          ],
        },
      },
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.3,
      position: [-320, -120],
      id: '6f76dfa8-da64-4d5d-b4e5-64c1535a4bc2',
      name: 'Health Schedule',
      alwaysOutputData: true,
    },
    {
      parameters: {
        operation: 'executeQuery',
        query:
          "WITH LatestData AS (\n    SELECT TOP 1 CollectionTime\n    FROM TsMgmt.dbo.ServerHealthLog\n    ORDER BY CollectionTime DESC\n),\nTimeCheck AS (\n    SELECT\n        GETDATE() AS CurrentQueryTime,\n        DATEADD(HOUR, -8, GETDATE()) AS EightHoursAgoTime\n)\nSELECT\n    CONVERT(VARCHAR, T.CurrentQueryTime, 120) AS CurrentQueryTime,\n    CONVERT(VARCHAR, T.EightHoursAgoTime, 120) AS EightHoursAgoTime,\n    CASE\n        WHEN LD.CollectionTime IS NOT NULL\n             AND LD.CollectionTime >= T.EightHoursAgoTime\n        THEN 1\n        ELSE 0\n    END AS DataExists,\n    CONVERT(VARCHAR, LD.CollectionTime, 120) AS LatestCollectionTime\nFROM LatestData AS LD\nCROSS JOIN TimeCheck AS T",
      },
      type: 'n8n-nodes-base.microsoftSql',
      typeVersion: 1.1,
      position: [-64, -120],
      id: '4306fa25-f6be-4203-805d-2f523e4f04f5',
      name: 'Microsoft SQL',
      alwaysOutputData: true,
      credentials: {
        microsoftSql: {
          id: '2dZb5OQPbTyO3052',
          name: 'TsMgmt(DevTest_SQL2022_26)',
        },
      },
    },
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: '1dd0f537-5c24-47ba-9a22-70ccfdf2aae7',
              name: 'QueryTime',
              value: "={{ $('Microsoft SQL').item.json.CurrentQueryTime }}",
              type: 'string',
            },
            {
              id: '7565fc12-94dd-4087-9721-925ead97f556',
              name: 'LatestCollectionTime',
              value: "={{ $('Microsoft SQL').item.json.LatestCollectionTime }}",
              type: 'string',
            },
            {
              id: '5a39fda0-da56-43e1-b806-b6d24ed5e5c3',
              name: 'DataExists',
              value: "={{ $('Microsoft SQL').item.json.DataExists }}",
              type: 'string',
            },
          ],
        },
        options: {},
      },
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [192, -120],
      id: '6eb95002-abef-40d9-90c5-dc10367e7335',
      name: 'DataMap',
      alwaysOutputData: true,
    },
    {
      parameters: {
        jsCode: buildTeamsPayloadCode,
      },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [448, -120],
      id: '6ebcf32e-9ad8-4c88-8fb7-8b39840e7b61',
      name: 'Build Teams Payload',
      alwaysOutputData: true,
    },
    {
      parameters: {
        method: 'POST',
        url: MONITOR_WEBHOOK,
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        bodyParameters: { parameters: [{}] },
        jsonBody:
          "={{ ({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: { type: 'AdaptiveCard', body: Array.isArray($json.cardBody) ? $json.cardBody : [], '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json', version: '1.4' } }] }) }}",
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [704, -120],
      id: '4fe5881e-c7fa-4f7f-a88d-65d85b2ef37d',
      name: 'Monitor Teams Webhook',
      alwaysOutputData: true,
    },
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'loose',
            version: 2,
          },
          conditions: [
            {
              id: '73b05eb3-d1c0-45d3-988b-7a5c6d1858ea',
              leftValue: "={{ $json.isHealthy }}",
              rightValue: false,
              operator: {
                type: 'boolean',
                operation: 'equals',
              },
            },
          ],
          combinator: 'and',
        },
        options: {},
      },
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [960, -120],
      id: '70cf59f1-5460-4a0a-b4fa-938bc37a07b4',
      name: 'Is Warning',
      alwaysOutputData: false,
    },
    {
      parameters: {
        toRecipients: 'jwkim@vms-solutions.com',
        subject: warningMailSubject,
        bodyContent: warningMailBody,
        additionalFields: {
          bodyContentType: 'html',
        },
      },
      type: 'n8n-nodes-base.microsoftOutlook',
      typeVersion: 2,
      position: [1216, -40],
      id: '322e5646-aec2-4872-a7cd-b6ecc987ab1e',
      name: 'Send Warning Mail',
      webhookId: '49578221-5f89-4637-b43a-a0b88350c8c0',
      credentials: {
        microsoftOutlookOAuth2Api: {
          id: 'QrARH25rhyVoJNXv',
          name: 'tsupport',
        },
      },
    },
  ],
  connections: {
    'Health Schedule': {
      main: [[{ node: 'Microsoft SQL', type: 'main', index: 0 }]],
    },
    'Microsoft SQL': {
      main: [[{ node: 'DataMap', type: 'main', index: 0 }]],
    },
    DataMap: {
      main: [[{ node: 'Build Teams Payload', type: 'main', index: 0 }]],
    },
    'Build Teams Payload': {
      main: [[
        { node: 'Monitor Teams Webhook', type: 'main', index: 0 },
        { node: 'Is Warning', type: 'main', index: 0 },
      ]],
    },
    'Is Warning': {
      main: [
        [{ node: 'Send Warning Mail', type: 'main', index: 0 }],
        [],
      ],
    },
  },
  settings: {
    executionOrder: 'v1',
  },
};

fs.mkdirSync(workflowDir, { recursive: true });
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(workflowPath);
