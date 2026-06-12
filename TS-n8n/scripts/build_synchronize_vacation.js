const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflowName = 'Synchronize-Vacation';
const visibleWorkflowName = 'Synchronize-Vacation';
const workflowDir = path.join(root, 'workflows', workflowName);
const workflowPath = path.join(workflowDir, `${workflowName}_api.json`);

const NOTION_CREDENTIAL = { id: 'LrLyYGhPvHMbPfZm', name: 'tsupport API' };

function loadEnvFile(envPath) {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const match = line.match(/^(.*?)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function extractNotionDatabaseId(url) {
  const match = String(url || '').match(/([0-9a-f]{32})/i);
  if (!match) {
    throw new Error('NOTION_TARGET_CALENDAR does not contain a database id.');
  }
  const raw = match[1].toLowerCase();
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function uuid(seed) {
  const text = `${workflowName}:${seed}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const hex = (n) => (Math.abs(n).toString(16).padStart(8, '0')).slice(0, 8);
  return `${hex(hash + 1)}-${hex(hash + 2).slice(0, 4)}-${hex(hash + 3).slice(0, 4)}-${hex(hash + 4).slice(0, 4)}-${hex(hash + 5)}${hex(hash + 6)}`;
}

function codeNode(name, jsCode, position, id) {
  return {
    parameters: { jsCode },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position,
    id,
    name,
    alwaysOutputData: true,
  };
}

function ifNode(name, leftValue, rightValue, position, id) {
  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: uuid(`${id}:condition`),
            leftValue,
            rightValue,
            operator: {
              type: 'string',
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
    position,
    id,
    name,
    alwaysOutputData: false,
  };
}

const localEnv = loadEnvFile(path.join(workflowDir, '.env'));
const notionDbId = extractNotionDatabaseId(localEnv.NOTION_TARGET_CALENDAR);
const sourceScriptPath = path.join(workflowDir, 'sync_vms_vacation_source.js');
const sharedEnv = loadEnvFile(path.join(root, 'credentials', 'vmsworks', 'vmsworks.env'));
const MONITOR_WEBHOOK =
  process.env.TS_MONITOR_TEAMS_WEBHOOK || 'https://redacted.invalid/powerautomate/synchronize-vacation-webhook';
const WORKFLOW_LINK = 'https://n8n.vmsmozart-test.com:8443/workflow/17Zl9pkIzYbHX315';

const inlineSourceConfig = {
  baseUrl: sharedEnv.VMS_WORKS_ADDRESS || 'https://vms-works.com/',
  username: sharedEnv.VMS_WORKS_ID || '',
  password: sharedEnv.VMS_WORKS_PW || '',
  targets: [
    { resourceId: 84, resourceName: '\uAE40\uC9C4\uC6B1' },
    { resourceId: 80, resourceName: '\uAE40\uBBFC\uC601' },
    { resourceId: 108, resourceName: '\uC870\uD604\uC7AC' },
    { resourceId: 111, resourceName: '\uAC15\uAD70\uC11D' },
  ],
};

const inlineSourceScript = [
  `globalThis.__SYNC_VACATION_INLINE_CONFIG__ = ${JSON.stringify(inlineSourceConfig)};`,
  fs.readFileSync(sourceScriptPath, 'utf8'),
].join('\n');

const executeCommandText = [
  'SYNC_VACATION_EMIT_ERROR_JSON=1 node - <<\'EOF\'',
  inlineSourceScript,
  'EOF',
].join('\n');

const parseSourceCode = [
  "const rawStdout = $json.stdout ?? '';",
  "const rawStderr = $json.stderr ?? '';",
  "const exitCode = Number($json.exitCode ?? 0);",
  "if (exitCode !== 0) {",
  "  throw new Error('Vacation source script failed with exit code ' + exitCode + '. ' + rawStderr);",
  "}",
  "if (!String(rawStdout).trim()) {",
  "  throw new Error('Vacation source script returned empty stdout.');",
  "}",
  'let payload;',
  'try {',
  '  payload = JSON.parse(rawStdout);',
  '} catch (error) {',
  "  throw new Error('Failed to parse vacation source JSON: ' + error.message);",
  '}',
  "const items = Array.isArray(payload.items) ? payload.items : [];",
  'return [{',
  '  json: {',
    "    managedBy: String(payload.managedBy || 'Synchronize-Vacation'),",
    "    generatedAtKst: String(payload.generatedAtKst || ''),",
  "    syncWindow: payload.syncWindow && typeof payload.syncWindow === 'object' ? payload.syncWindow : {},",
  "    sourceOk: payload.ok === false ? false : true,",
  "    errorMessage: String(payload.errorMessage || ''),",
  '    totalItems: items.length,',
  '    targetUsers: Array.isArray(payload.targetUsers) ? payload.targetUsers : [],',
  '    items,',
  '  }',
  '}];',
].join('\n');

const buildSyncPlanCode = [
  "const source = $('Parse Vacation Source').first()?.json ?? {};",
  "const notionPayload = $('Load Notion Calendar').first()?.json ?? {};",
  "const notionPages = Array.isArray(notionPayload.results) ? notionPayload.results : [];",
  "const payloadItems = Array.isArray(source.items) ? source.items : [];",
  "const syncWindow = source.syncWindow && typeof source.syncWindow === 'object' ? source.syncWindow : {};",
  "const windowStart = String(syncWindow.startDate || '');",
  "const windowEnd = String(syncWindow.endDate || '');",
  "const managedBy = String(source.managedBy || 'Synchronize-Vacation');",
  "const managedMarker = 'managed_by=' + managedBy;",
  "const legacyManagedMarker = 'managed_by=Synchorize-Vacation';",
  "const legacyUpdatedByMarker = 'Updated_by=Synchroniz-Vacation';",
  "const updatedByMarker = 'Updated_by=Synchronize-Vacation';",
  "if (source.sourceOk === false) {",
  "  return [{ json: { action: 'source_error', ok: false, title: 'Source Error', errorMessage: String(source.errorMessage || 'Vacation source fetch failed.') } }];",
  "}",
  "const K = {",
  "  title: 'Title',",
  "  date: 'Date',",
  "  description: 'Description',",
  "  tag: '\\uD0DC\\uADF8',",
  "  person: '\\uC0AC\\uB78C',",
  "  timeSlot: '\\uC2DC\\uAC04\\uB300',",
  "  vacationTag: '\\uD734\\uAC00',",
  "  allDay: '\\uD558\\uB8E8 \\uC885\\uC77C',",
  "  morning: '\\uC624\\uC804\\uB9CC',",
  "  afternoon: '\\uC624\\uD6C4\\uB9CC',",
  "  partial: '\\uD2B9\\uC815 \\uC2DC\\uAC04\\uC5D0\\uB9CC',",
  "};",
  "function normalize(value) { return String(value ?? '').normalize('NFC').trim(); }",
  "function pickPlainText(richText) { return Array.isArray(richText) ? richText.map((entry) => entry?.plain_text || entry?.text?.content || '').join('') : ''; }",
  "function propText(page, name) {",
  '  const prop = page?.properties?.[name];',
  "  if (!prop) return '';",
  "  if (prop.type === 'rich_text') return pickPlainText(prop.rich_text);",
  "  if (prop.type === 'title') return pickPlainText(prop.title);",
  "  if (prop.type === 'select') return normalize(prop.select?.name);",
  "  if (prop.type === 'multi_select') return (prop.multi_select || []).map((entry) => normalize(entry?.name)).join(',');",
  "  if (prop.type === 'date') return normalize(prop.date?.start);",
  "  return '';",
  '}',
  'function propDate(page) {',
  "  const prop = page?.properties?.[K.date];",
  "  return prop?.date ? { start: String(prop.date.start || ''), end: String(prop.date.end || prop.date.start || '') } : { start: '', end: '' };",
  '}',
  'function buildMatchKeyFromSource(item) {',
  "  return [String(item.title || ''), String(item.startDate || ''), String(item.endDate || item.startDate || ''), String(item.resourceName || '')].join('|');",
  '}',
  'function buildMatchKeyFromPage(page) {',
  '  const currentDate = propDate(page);',
  "  return [propText(page, K.title), currentDate.start, currentDate.end || currentDate.start, propText(page, K.person)].join('|');",
  '}',
  'function overlapsWindow(start, end) {',
  "  if (!windowStart || !windowEnd || !start) return false;",
  "  const realEnd = end || start;",
  "  return !(realEnd < windowStart || start > windowEnd);",
  '}',
  'function buildDescription(item) {',
  '  return updatedByMarker;',
  '}',
  'function buildProperties(item) {',
  '  const description = buildDescription(item);',
  '  return {',
  '    [K.title]: { title: [{ text: { content: item.title } }] },',
  '    [K.date]: { date: { start: item.startDate, end: item.endDate || item.startDate } },',
  '    [K.description]: { rich_text: [{ text: { content: description } }] },',
  '    [K.tag]: { select: { name: K.vacationTag } },',
  '    [K.timeSlot]: { select: { name: item.timeSlot || K.allDay } },',
  '    [K.person]: { multi_select: [{ name: item.resourceName }] },',
  '  };',
  '}',
  'const expectedMap = new Map();',
  'for (const item of payloadItems) {',
  '  const matchKey = buildMatchKeyFromSource(item);',
  '  expectedMap.set(matchKey, { ...item, matchKey, properties: buildProperties(item), description: buildDescription(item) });',
  '}',
  'const existingManaged = notionPages.filter((page) => {',
  '  const description = propText(page, K.description);',
  '  if (!(description.includes(managedMarker) || description.includes(legacyManagedMarker) || description.includes(updatedByMarker) || description.includes(legacyUpdatedByMarker))) return false;',
  '  const currentDate = propDate(page);',
  '  return overlapsWindow(currentDate.start, currentDate.end);',
  '});',
  'const existingMap = new Map();',
  'for (const page of existingManaged) {',
  '  const matchKey = buildMatchKeyFromPage(page);',
  '  if (!matchKey) continue;',
  '  existingMap.set(matchKey, page);',
  '}',
  'const actions = [];',
  'for (const [matchKey, item] of expectedMap.entries()) {',
  '  const existing = existingMap.get(matchKey);',
  '  if (!existing) {',
  "    actions.push({ json: { action: 'create', matchKey, syncKey: item.syncKey, title: item.title, properties: item.properties } });",
  '    continue;',
  '  }',
  '  const currentDate = propDate(existing);',
  '  const currentTitle = propText(existing, K.title);',
  '  const currentDescription = propText(existing, K.description);',
  "  const currentTimeSlot = propText(existing, K.timeSlot);",
  "  const currentTag = propText(existing, K.tag);",
  "  const currentPerson = propText(existing, K.person);",
  '  const needsUpdate = [',
  '    currentTitle !== item.title,',
  '    currentDate.start !== item.startDate,',
  "    (currentDate.end || currentDate.start) !== (item.endDate || item.startDate),",
  '    currentDescription !== item.description,',
  '    currentTimeSlot !== item.timeSlot,',
  '    currentTag !== K.vacationTag,',
  '    currentPerson !== item.resourceName,',
  '  ].some(Boolean);',
  '  if (needsUpdate) {',
  "    actions.push({ json: { action: 'update', matchKey, syncKey: item.syncKey, pageId: existing.id, title: item.title, properties: item.properties } });",
  '  }',
  '}',
  'for (const [matchKey, page] of existingMap.entries()) {',
  '  if (expectedMap.has(matchKey)) continue;',
  "  if (page.archived) continue;",
  "  actions.push({ json: { action: 'archive', matchKey, pageId: page.id, title: propText(page, K.title) || matchKey } });",
  '};',
  'if (actions.length === 0) {',
  "  return [{ json: { action: 'noop', ok: true, syncKey: 'none', title: 'No changes', summary: { expectedCount: expectedMap.size, existingManagedCount: existingMap.size } } }];",
  '}',
  'return actions;',
].join('\n');

const resultPassthroughCode = (label) => [
  `const planned = $('${label}').item.json ?? {};`,
  'const response = $json ?? {};',
  "const hasId = Boolean(response.id);",
  "const message = response.error?.message || response.message || response.error || '';",
  'return [{ json: {',
  "  action: String(planned.action || ''),",
  "  ok: hasId,",
  "  title: String(planned.title || planned.syncKey || ''),",
  "  errorMessage: hasId ? '' : String(message || 'Notion request failed.'),",
  '} }];',
].join('\n');

const noopResultCode = [
  'const item = $input.first()?.json ?? {};',
  "const action = String(item.action || 'noop');",
  'return [{ json: {',
  '  action,',
  "  ok: action !== 'source_error',",
  "  title: String(item.title || action),",
  "  errorMessage: String(item.errorMessage || ''),",
  '} }];',
].join('\n');

const buildMonitorPayloadCode = [
  "const results = $input.all().map((item) => item.json ?? {});",
  "const now = new Date();",
  "const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);",
  "const pick = (type) => parts.find((part) => part.type === type)?.value || '';",
  "const executedAt = pick('year') + '-' + pick('month') + '-' + pick('day') + ' ' + pick('hour') + ':' + pick('minute') + ':' + pick('second') + ' KST';",
  "const errorItem = results.find((item) => item.ok === false);",
  "const isError = Boolean(errorItem);",
  `const workflowLink = ${JSON.stringify(WORKFLOW_LINK)};`,
  `const titleText = \`[${visibleWorkflowName}](\${workflowLink}) 실행 결과 - \${isError ? '오류' : '정상'}\`;`,
  "const bodyText = `실행일: ${executedAt}${isError && errorItem?.errorMessage ? '\\n오류: ' + String(errorItem.errorMessage) : ''}`;",
  "const entities = isError ? [{ type: 'mention', text: '<at>김진욱</at>', mentioned: { id: 'jwkim@vms-solutions.com', name: '김진욱' } }] : [];",
  "const heading = isError ? '<at>김진욱</at> 님, ' + titleText : titleText;",
  'return [{ json: {',
  '  isError,',
  '  entities,',
  '  heading,',
  '  bodyText,',
  '} }];',
].join('\n');

const workflow = {
  name: workflowName,
  nodes: [
    {
      parameters: {},
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [-1180, -80],
      id: uuid('manual-trigger'),
      name: 'Manual Trigger',
    },
    {
      parameters: {
        rule: {
          interval: [
            {
              field: 'cronExpression',
              expression: '0 0 6 * * *',
            },
          ],
        },
      },
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.3,
      position: [-1180, 96],
      id: uuid('schedule-trigger'),
      name: 'Sync Schedule',
      alwaysOutputData: true,
    },
    {
      parameters: {
        command: executeCommandText,
      },
      type: 'n8n-nodes-base.executeCommand',
      typeVersion: 1,
      position: [-920, 16],
      id: uuid('execute-command'),
      name: 'Fetch Vacation Source',
      alwaysOutputData: true,
    },
    codeNode('Parse Vacation Source', parseSourceCode, [-656, 16], uuid('parse-source')),
    {
      parameters: {
        method: 'POST',
        url: `https://api.notion.com/v1/databases/${notionDbId}/query`,
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'notionApi',
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody: "={{ ({ page_size: 100, sorts: [{ property: 'Date', direction: 'descending' }] }) }}",
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [-392, 16],
      id: uuid('load-notion-pages'),
      name: 'Load Notion Calendar',
      alwaysOutputData: true,
      credentials: {
        notionApi: NOTION_CREDENTIAL,
      },
    },
    codeNode('Build Notion Sync Plan', buildSyncPlanCode, [-128, 16], uuid('build-sync-plan')),
    ifNode('If Create', "={{ $json.action }}", 'create', [128, -176], uuid('if-create')),
    {
      parameters: {
        method: 'POST',
        url: 'https://api.notion.com/v1/pages',
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'notionApi',
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody: "={{ ({ parent: { database_id: '" + notionDbId + "' }, properties: $json.properties }) }}",
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [384, -176],
      id: uuid('create-page'),
      name: 'Create Notion Page',
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
      credentials: {
        notionApi: NOTION_CREDENTIAL,
      },
    },
    codeNode('Create Result', resultPassthroughCode('If Create'), [640, -176], uuid('create-result')),
    ifNode('If Update', "={{ $json.action }}", 'update', [128, 16], uuid('if-update')),
    {
      parameters: {
        method: 'PATCH',
        url: "=https://api.notion.com/v1/pages/{{ $json.pageId }}",
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'notionApi',
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody: '={{ ({ properties: $json.properties }) }}',
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [384, 16],
      id: uuid('update-page'),
      name: 'Update Notion Page',
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
      credentials: {
        notionApi: NOTION_CREDENTIAL,
      },
    },
    codeNode('Update Result', resultPassthroughCode('If Update'), [640, 16], uuid('update-result')),
    ifNode('If Archive', "={{ $json.action }}", 'archive', [128, 208], uuid('if-archive')),
    {
      parameters: {
        method: 'PATCH',
        url: "=https://api.notion.com/v1/pages/{{ $json.pageId }}",
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'notionApi',
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody: '={{ ({ archived: true }) }}',
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [384, 208],
      id: uuid('archive-page'),
      name: 'Archive Notion Page',
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
      credentials: {
        notionApi: NOTION_CREDENTIAL,
      },
    },
    codeNode('Archive Result', resultPassthroughCode('If Archive'), [640, 208], uuid('archive-result')),
    codeNode('Noop Result', noopResultCode, [384, 400], uuid('noop-result')),
    {
      parameters: { mode: 'append' },
      type: 'n8n-nodes-base.merge',
      typeVersion: 3.2,
      position: [896, -80],
      id: uuid('merge-a'),
      name: 'Merge Action Results A',
      alwaysOutputData: true,
    },
    {
      parameters: { mode: 'append' },
      type: 'n8n-nodes-base.merge',
      typeVersion: 3.2,
      position: [896, 240],
      id: uuid('merge-b'),
      name: 'Merge Action Results B',
      alwaysOutputData: true,
    },
    {
      parameters: { mode: 'append' },
      type: 'n8n-nodes-base.merge',
      typeVersion: 3.2,
      position: [1160, 80],
      id: uuid('merge-c'),
      name: 'Merge All Results',
      alwaysOutputData: true,
    },
    codeNode('Build Monitor Payload', buildMonitorPayloadCode, [1416, 80], uuid('build-monitor-payload')),
    {
      parameters: {
        method: 'POST',
        url: MONITOR_WEBHOOK,
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        bodyParameters: { parameters: [{}] },
        jsonBody: "={{ ({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: { type: 'AdaptiveCard', body: [{ type: 'TextBlock', text: $json.heading, wrap: true, weight: 'Bolder' }, { type: 'TextBlock', text: $json.bodyText, wrap: true, spacing: 'Small' }], msteams: { entities: Array.isArray($json.entities) ? $json.entities : [] }, '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json', version: '1.4' } }] }) }}",
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [1672, 80],
      id: uuid('monitor-webhook'),
      name: 'Monitor Teams Webhook',
      alwaysOutputData: true,
    },
  ],
  connections: {
    'Manual Trigger': {
      main: [[{ node: 'Fetch Vacation Source', type: 'main', index: 0 }]],
    },
    'Sync Schedule': {
      main: [[{ node: 'Fetch Vacation Source', type: 'main', index: 0 }]],
    },
    'Fetch Vacation Source': {
      main: [[{ node: 'Parse Vacation Source', type: 'main', index: 0 }]],
    },
    'Parse Vacation Source': {
      main: [[{ node: 'Load Notion Calendar', type: 'main', index: 0 }]],
    },
    'Load Notion Calendar': {
      main: [[{ node: 'Build Notion Sync Plan', type: 'main', index: 0 }]],
    },
    'Build Notion Sync Plan': {
      main: [[{ node: 'If Create', type: 'main', index: 0 }]],
    },
    'If Create': {
      main: [
        [{ node: 'Create Notion Page', type: 'main', index: 0 }],
        [{ node: 'If Update', type: 'main', index: 0 }],
      ],
    },
    'Create Notion Page': {
      main: [[{ node: 'Create Result', type: 'main', index: 0 }]],
    },
    'If Update': {
      main: [
        [{ node: 'Update Notion Page', type: 'main', index: 0 }],
        [{ node: 'If Archive', type: 'main', index: 0 }],
      ],
    },
    'Update Notion Page': {
      main: [[{ node: 'Update Result', type: 'main', index: 0 }]],
    },
    'If Archive': {
      main: [
        [{ node: 'Archive Notion Page', type: 'main', index: 0 }],
        [{ node: 'Noop Result', type: 'main', index: 0 }],
      ],
    },
    'Archive Notion Page': {
      main: [[{ node: 'Archive Result', type: 'main', index: 0 }]],
    },
    'Create Result': {
      main: [[{ node: 'Merge Action Results A', type: 'main', index: 0 }]],
    },
    'Update Result': {
      main: [[{ node: 'Merge Action Results A', type: 'main', index: 1 }]],
    },
    'Archive Result': {
      main: [[{ node: 'Merge Action Results B', type: 'main', index: 0 }]],
    },
    'Noop Result': {
      main: [[{ node: 'Merge Action Results B', type: 'main', index: 1 }]],
    },
    'Merge Action Results A': {
      main: [[{ node: 'Merge All Results', type: 'main', index: 0 }]],
    },
    'Merge Action Results B': {
      main: [[{ node: 'Merge All Results', type: 'main', index: 1 }]],
    },
    'Merge All Results': {
      main: [[{ node: 'Build Monitor Payload', type: 'main', index: 0 }]],
    },
    'Build Monitor Payload': {
      main: [[{ node: 'Monitor Teams Webhook', type: 'main', index: 0 }]],
    },
  },
  settings: {
    executionOrder: 'v1',
    timezone: 'Asia/Seoul',
  },
};

fs.mkdirSync(workflowDir, { recursive: true });
fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, workflowPath)}`);
