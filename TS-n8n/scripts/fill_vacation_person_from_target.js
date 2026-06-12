const fs = require('fs');
const path = require('path');

const root = process.cwd();
const envPath = path.join(root, 'n8n.env');
const NOTION_CREDENTIAL = { id: 'LrLyYGhPvHMbPfZm', name: 'tsupport API' };
const DATABASE_ID = '205cb995-8309-80e4-ac2a-c8589a1783eb';
const ALLOWED_NAMES = ['김진욱', '강군석', '김민영', '조현재'];

function loadEnv(envFile) {
  const env = {};
  const text = fs.readFileSync(envFile, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function scheduleNode() {
  return {
    parameters: {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            expression: '0 * * * * *',
          },
        ],
      },
    },
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.3,
    position: [-900, 0],
    id: 'trigger',
    name: 'Cleanup Trigger',
    alwaysOutputData: true,
  };
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

function buildWorkflow() {
  const inspectCode = [
    "const payload = $('Load Notion Calendar').first()?.json ?? {};",
    "const pages = Array.isArray(payload.results) ? payload.results : [];",
    `const allowed = new Set(${JSON.stringify(ALLOWED_NAMES)});`,
    "function titlePlain(page) { const title = page?.properties?.Title?.title || []; return title.map((entry) => entry?.plain_text || entry?.text?.content || '').join(''); }",
    "function peopleNames(prop) { return Array.isArray(prop?.people) ? prop.people.map((entry) => entry?.name || '').filter(Boolean) : []; }",
    "function multiNames(prop) { return Array.isArray(prop?.multi_select) ? prop.multi_select.map((entry) => entry?.name || '').filter(Boolean) : []; }",
    "const actions = [];",
    "for (const page of pages) {",
    "  const target = peopleNames(page?.properties?.['대상자']);",
    "  const person = multiNames(page?.properties?.['사람']);",
    "  if (target.length === 0 || person.length > 0) continue;",
    "  const matched = target.filter((name) => allowed.has(name));",
    "  if (matched.length === 0) continue;",
    "  actions.push({ json: {",
    "    action: 'update',",
    "    pageId: page.id,",
    "    title: titlePlain(page),",
    "    personNames: matched,",
    "    targetNames: target,",
    "  } });",
    "}",
    "if (actions.length === 0) {",
    "  return [{ json: { action: 'none', updateCount: 0, updatedTitles: [] } }];",
    "}",
    "actions[0].json.updateCount = actions.length;",
    "actions[0].json.updatedTitles = actions.map((item) => item.json.title);",
    "return actions;",
  ].join('\n');

  const updateResultCode = [
    "const planned = $('Find Missing Person Values').item.json ?? {};",
    'return [{ json: {',
    "  action: 'updated',",
    "  pageId: planned.pageId || '',",
    "  title: planned.title || '',",
    "  personNames: Array.isArray(planned.personNames) ? planned.personNames : [],",
    '} }];',
  ].join('\n');

  const noneResultCode = [
    "const item = $input.first()?.json ?? {};",
    'return [{ json: {',
    "  action: String(item.action || 'none'),",
    "  updateCount: Number(item.updateCount || 0),",
    "  updatedTitles: Array.isArray(item.updatedTitles) ? item.updatedTitles : [],",
    '} }];',
  ].join('\n');

  const summarizeCode = [
    "function safeAll(name) { try { return $(name).all().map((item) => item.json ?? {}); } catch { return []; } }",
    "const updated = safeAll('Update Result');",
    "const none = safeAll('None Result');",
    "const firstNone = none[0] || {};",
    'return [{ json: {',
    "  updateCount: updated.length || Number(firstNone.updateCount || 0),",
    "  updatedTitles: updated.length ? updated.map((item) => item.title) : (Array.isArray(firstNone.updatedTitles) ? firstNone.updatedTitles : []),",
    '}}];',
  ].join('\n');

  return {
    name: `codex-fill-vacation-person-${Date.now()}`,
    nodes: [
      scheduleNode(),
      {
        parameters: {
          method: 'POST',
          url: `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'notionApi',
          sendBody: true,
          contentType: 'json',
          specifyBody: 'json',
          jsonBody: '={{ ({ page_size: 100 }) }}',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-660, 0],
        id: 'query',
        name: 'Load Notion Calendar',
        alwaysOutputData: true,
        credentials: {
          notionApi: NOTION_CREDENTIAL,
        },
      },
      codeNode('Find Missing Person Values', inspectCode, [-400, 0], 'inspect'),
      {
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
                id: 'cond',
                leftValue: '={{ $json.action }}',
                rightValue: 'update',
                operator: { type: 'string', operation: 'equals' },
              },
            ],
            combinator: 'and',
          },
          options: {},
        },
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [-140, 0],
        id: 'if',
        name: 'If Update',
        alwaysOutputData: false,
      },
      {
        parameters: {
          method: 'PATCH',
          url: '=https://api.notion.com/v1/pages/{{ $json.pageId }}',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'notionApi',
          sendBody: true,
          contentType: 'json',
          specifyBody: 'json',
          jsonBody: '={{ ({ properties: { "사람": { multi_select: ($json.personNames || []).map((name) => ({ name })) } } }) }}',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [120, -120],
        id: 'update',
        name: 'Update Person Property',
        alwaysOutputData: true,
        credentials: {
          notionApi: NOTION_CREDENTIAL,
        },
      },
      codeNode('Update Result', updateResultCode, [380, -120], 'update-result'),
      codeNode('None Result', noneResultCode, [120, 120], 'none-result'),
      codeNode('Summarize Fill', summarizeCode, [640, 0], 'summary'),
    ],
    connections: {
      'Cleanup Trigger': {
        main: [[{ node: 'Load Notion Calendar', type: 'main', index: 0 }]],
      },
      'Load Notion Calendar': {
        main: [[{ node: 'Find Missing Person Values', type: 'main', index: 0 }]],
      },
      'Find Missing Person Values': {
        main: [[{ node: 'If Update', type: 'main', index: 0 }]],
      },
      'If Update': {
        main: [
          [{ node: 'Update Person Property', type: 'main', index: 0 }],
          [{ node: 'None Result', type: 'main', index: 0 }],
        ],
      },
      'Update Person Property': {
        main: [[{ node: 'Update Result', type: 'main', index: 0 }]],
      },
      'Update Result': {
        main: [[{ node: 'Summarize Fill', type: 'main', index: 0 }]],
      },
      'None Result': {
        main: [[{ node: 'Summarize Fill', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
      timezone: 'Asia/Seoul',
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(base, apiKey, pathName, options = {}) {
  const res = await fetch(`${base}${pathName}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'X-N8N-API-KEY': apiKey,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${pathName} failed: ${res.status} ${text}`);
  }
  return json;
}

async function main() {
  const env = loadEnv(envPath);
  const base = String(env.N8N_BASE_URL || '').replace(/\/$/, '');
  const apiKey = env.N8N_API_KEY || '';
  if (!base || !apiKey) throw new Error('n8n env is missing base URL or API key.');

  const workflow = buildWorkflow();
  const created = await api(base, apiKey, '/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(workflow),
  });
  const workflowId = created.id;
  let execution;

  try {
    await api(base, apiKey, `/api/v1/workflows/${workflowId}/activate`, { method: 'POST' });

    const startedAt = Date.now();
    while (Date.now() - startedAt < 120000) {
      await sleep(5000);
      const execs = await api(base, apiKey, `/api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&limit=5&includeData=true`, { method: 'GET' });
      execution = (execs.data || []).find((item) => item.status === 'success' || item.status === 'error');
      if (execution) break;
    }

    if (!execution) {
      throw new Error('Timed out waiting for fill workflow execution.');
    }

    const summary = execution.data?.resultData?.runData?.['Summarize Fill']?.[0]?.data?.main?.[0]?.[0]?.json || null;
    console.log(JSON.stringify({
      executionId: execution.id,
      status: execution.status,
      summary,
    }, null, 2));
  } finally {
    try {
      await api(base, apiKey, `/api/v1/workflows/${workflowId}/deactivate`, { method: 'POST' });
    } catch {}
    try {
      await fetch(`${base}/api/v1/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          'X-N8N-API-KEY': apiKey,
        },
      });
    } catch {}
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
