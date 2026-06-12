const fs = require('fs');
const path = require('path');

const root = process.cwd();
const envPath = path.join(root, 'n8n.env');
const NOTION_CREDENTIAL = { id: 'LrLyYGhPvHMbPfZm', name: 'tsupport API' };
const DATABASE_ID = '205cb995-8309-80e4-ac2a-c8589a1783eb';

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
  const dedupeCode = [
    "const payload = $('Load Notion Calendar').first()?.json ?? {};",
    "const pages = Array.isArray(payload.results) ? payload.results : [];",
    "const oldMarker = 'managed_by=Synchorize-Vacation';",
    "const currentMarker = 'managed_by=Synchronize-Vacation';",
    "const legacyMarker = 'Updated_by=Synchroniz-Vacation';",
    "const newMarker = 'Updated_by=Synchronize-Vacation';",
    "function richTextPlain(prop) { return Array.isArray(prop?.rich_text) ? prop.rich_text.map((entry) => entry?.plain_text || entry?.text?.content || '').join('') : ''; }",
    "function titlePlain(page) { const title = page?.properties?.Title?.title || []; return title.map((entry) => entry?.plain_text || entry?.text?.content || '').join(''); }",
    "function description(page) { return richTextPlain(page?.properties?.Description); }",
    "function dateRange(page) { const date = page?.properties?.Date?.date; return date ? { start: String(date.start || ''), end: String(date.end || date.start || '') } : { start: '', end: '' }; }",
    "function personPlain(page) { const prop = page?.properties?.['사람']; if (!prop) return ''; if (prop.type === 'multi_select') return (prop.multi_select || []).map((entry) => entry?.name || '').join(','); return ''; }",
    "function matchKey(page) { const range = dateRange(page); return [titlePlain(page), range.start, range.end || range.start, personPlain(page)].join('|'); }",
    "const candidates = pages.filter((page) => { const desc = description(page); return !page.archived && (desc.includes(oldMarker) || desc.includes(currentMarker) || desc.includes(legacyMarker) || desc.includes(newMarker)); });",
    "const groups = new Map();",
    "for (const page of candidates) {",
    "  const key = matchKey(page);",
    "  if (!key) continue;",
    "  if (!groups.has(key)) groups.set(key, []);",
    "  groups.get(key).push(page);",
    "}",
    "const archiveItems = [];",
    "const duplicateGroups = [];",
    "for (const [key, items] of groups.entries()) {",
    "  if (items.length <= 1) continue;",
    "  items.sort((a, b) => new Date(b.last_edited_time || 0) - new Date(a.last_edited_time || 0));",
    "  const keep = items[0];",
    "  const remove = items.slice(1);",
    "  duplicateGroups.push({ syncKey: key, keepPageId: keep.id, keepTitle: titlePlain(keep), removeCount: remove.length });",
    "  for (const page of remove) {",
    "    archiveItems.push({ json: {",
    "      action: 'archive',",
    "      pageId: page.id,",
    "      syncKey: key,",
    "      title: titlePlain(page),",
    "      keepPageId: keep.id,",
    "      keepTitle: titlePlain(keep),",
    "      duplicateCount: items.length,",
    "    } });",
    "  }",
    "}",
    "if (archiveItems.length === 0) {",
    "  return [{ json: { action: 'none', duplicateGroupCount: 0, archiveCount: 0, groups: [] } }];",
    "}",
    "archiveItems[0].json.duplicateGroupCount = duplicateGroups.length;",
    "archiveItems[0].json.archiveCount = archiveItems.length;",
    "archiveItems[0].json.groups = duplicateGroups;",
    "return archiveItems;",
  ].join('\n');

  const archiveResultCode = [
    "const planned = $('Find Duplicate Vacation Pages').item.json ?? {};",
    'return [{ json: {',
    "  action: 'archived',",
    "  pageId: planned.pageId || '',",
    "  syncKey: planned.syncKey || '',",
    "  title: planned.title || '',",
    "  keepPageId: planned.keepPageId || '',",
    "  keepTitle: planned.keepTitle || '',",
    '} }];',
  ].join('\n');

  const noneResultCode = [
    "const item = $input.first()?.json ?? {};",
    'return [{ json: {',
    "  action: String(item.action || 'none'),",
    "  duplicateGroupCount: Number(item.duplicateGroupCount || 0),",
    "  archiveCount: Number(item.archiveCount || 0),",
    "  groups: Array.isArray(item.groups) ? item.groups : [],",
    '} }];',
  ].join('\n');

  const summarizeCode = [
    "function safeAll(name) { try { return $(name).all().map((item) => item.json ?? {}); } catch { return []; } }",
    "const archived = safeAll('Archive Result');",
    "const none = safeAll('None Result');",
    "const firstNone = none[0] || {};",
    'return [{ json: {',
    "  duplicateGroupCount: Number(firstNone.duplicateGroupCount || 0),",
    "  archiveCount: archived.length || Number(firstNone.archiveCount || 0),",
    "  groups: Array.isArray(firstNone.groups) ? firstNone.groups : [],",
    "  archivedItems: archived,",
    '} }];',
  ].join('\n');

  return {
    name: `codex-dedupe-synchorize-vacation-${Date.now()}`,
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
          jsonBody: '={{ ({ page_size: 100, sorts: [{ timestamp: "last_edited_time", direction: "descending" }] }) }}',
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
      codeNode('Find Duplicate Vacation Pages', dedupeCode, [-400, 0], 'dedupe'),
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
                rightValue: 'archive',
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
        name: 'If Archive',
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
          jsonBody: '={{ ({ archived: true }) }}',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [120, -120],
        id: 'archive',
        name: 'Archive Duplicate Page',
        alwaysOutputData: true,
        credentials: {
          notionApi: NOTION_CREDENTIAL,
        },
      },
      codeNode('Archive Result', archiveResultCode, [380, -120], 'archive-result'),
      codeNode('None Result', noneResultCode, [120, 120], 'none-result'),
      codeNode('Summarize Dedupe', summarizeCode, [640, 0], 'summary'),
    ],
    connections: {
      'Cleanup Trigger': {
        main: [[{ node: 'Load Notion Calendar', type: 'main', index: 0 }]],
      },
      'Load Notion Calendar': {
        main: [[{ node: 'Find Duplicate Vacation Pages', type: 'main', index: 0 }]],
      },
      'Find Duplicate Vacation Pages': {
        main: [[{ node: 'If Archive', type: 'main', index: 0 }]],
      },
      'If Archive': {
        main: [
          [{ node: 'Archive Duplicate Page', type: 'main', index: 0 }],
          [{ node: 'None Result', type: 'main', index: 0 }],
        ],
      },
      'Archive Duplicate Page': {
        main: [[{ node: 'Archive Result', type: 'main', index: 0 }]],
      },
      'Archive Result': {
        main: [[{ node: 'Summarize Dedupe', type: 'main', index: 0 }]],
      },
      'None Result': {
        main: [[{ node: 'Summarize Dedupe', type: 'main', index: 0 }]],
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
  if (!res.ok) throw new Error(`${pathName} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const env = loadEnv(envPath);
  const base = String(env.N8N_BASE_URL || '').replace(/\/$/, '');
  const apiKey = env.N8N_API_KEY || '';
  if (!base || !apiKey) throw new Error('N8N_BASE_URL or N8N_API_KEY is missing.');

  const workflow = buildWorkflow();
  const created = await api(base, apiKey, '/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(workflow),
  });
  const workflowId = created.id;

  try {
    await api(base, apiKey, `/api/v1/workflows/${workflowId}/activate`, { method: 'POST' });
    let execution = null;
    for (let i = 0; i < 10; i += 1) {
      await sleep(15000);
      const execs = await api(base, apiKey, `/api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&limit=5&includeData=true`, { method: 'GET' });
      execution = Array.isArray(execs.data) && execs.data.length > 0 ? execs.data[0] : null;
      if (execution && ['success', 'error', 'canceled'].includes(execution.status)) break;
    }

    if (!execution) throw new Error('No execution result found for dedupe workflow.');

    const runData = execution.data?.resultData?.runData || {};
    const summary = (runData['Summarize Dedupe'] || [])[0]?.data?.main?.[0]?.[0]?.json || {};
    const payload = {
      executionId: execution.id,
      status: execution.status,
      duplicateGroupCount: Number(summary.duplicateGroupCount || 0),
      archiveCount: Number(summary.archiveCount || 0),
      groups: Array.isArray(summary.groups) ? summary.groups : [],
      archivedItems: Array.isArray(summary.archivedItems) ? summary.archivedItems : [],
      error: execution.data?.resultData?.error || null,
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    try {
      await api(base, apiKey, `/api/v1/workflows/${workflowId}/deactivate`, { method: 'POST' });
    } catch {}
    try {
      await fetch(`${base}/api/v1/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: { accept: 'application/json', 'X-N8N-API-KEY': apiKey },
      });
    } catch {}
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
