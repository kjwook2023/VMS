const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const match = line.match(/^(.*?)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'accept-encoding': 'identity',
      'content-type': 'application/json',
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${url} failed: ${res.status} ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'accept-encoding': 'identity',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${text}`);
  }
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueWebhookPath() {
  return `codex-lunch-recommend-send-${Date.now()}`;
}

function uniqueId() {
  return crypto.randomUUID();
}

function parseDayOffset(argv) {
  const arg = argv.find((value) => /^--day-offset=/.test(value));
  if (!arg) return 0;
  const raw = arg.split('=', 2)[1];
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanWorkflowForCreate(workflow) {
  const copy = JSON.parse(JSON.stringify(workflow));
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.versionId;
  delete copy.active;
  delete copy.shared;
  delete copy.tags;
  return copy;
}

function rewriteWeekdayBaselineCode(jsCode, dayOffset) {
  if (!dayOffset || typeof jsCode !== 'string') return jsCode;
  const target = 'const now = new Date();';
  const replacement = [
    'const now = new Date();',
    `now.setDate(now.getDate() + (${dayOffset}));`,
  ].join('\n');
  return jsCode.includes(target) ? jsCode.replace(target, replacement) : jsCode;
}

function rewriteWorkflowForOneShot(workflow, dayOffset) {
  const rewritten = cleanWorkflowForCreate(workflow);
  const suffix = Date.now();
  const webhookPath = uniqueWebhookPath();

  rewritten.name = `codex-send-${workflow.name}-${suffix}`;

  const nodes = Array.isArray(rewritten.nodes) ? rewritten.nodes : [];
  const filteredNodes = nodes.filter((node) => node.name !== 'Lunch Recommendation Schedule');
  rewritten.nodes = filteredNodes;

  for (const node of rewritten.nodes) {
    if (node.name === 'More Recommendation Webhook') {
      node.parameters.path = webhookPath;
      node.webhookId = uniqueId();
    }

    if (node.name === 'Weekday Baseline' && node.parameters && typeof node.parameters.jsCode === 'string') {
      node.parameters.jsCode = rewriteWeekdayBaselineCode(node.parameters.jsCode, dayOffset);
    }
  }

  if (rewritten.connections && rewritten.connections['Lunch Recommendation Schedule']) {
    delete rewritten.connections['Lunch Recommendation Schedule'];
  }

  return { workflow: rewritten, webhookPath };
}

async function waitForExecution(baseUrl, workflowId, timeoutMs) {
  const started = Date.now();
  let latestSeen = null;

  while (Date.now() - started < timeoutMs) {
    const execs = await api(
      'GET',
      `${baseUrl}/api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&limit=5&includeData=true`,
    );

    const latest = Array.isArray(execs?.data) ? execs.data[0] : null;
    if (latest) latestSeen = latest;
    if (latest && latest.finishedAt) {
      return { latest, timedOut: false };
    }

    await sleep(3000);
  }

  if (latestSeen) {
    return { latest: latestSeen, timedOut: true };
  }

  throw new Error(`Timed out waiting for workflow execution start: ${workflowId}`);
}

async function main() {
  const root = process.cwd();
  loadEnv(path.join(root, 'n8n.env'));
  const dayOffset = parseDayOffset(process.argv.slice(2));

  const workflowPath = path.join(
    root,
    'workflows',
    'Lunch-Recommendation-Alert',
    'Lunch-Recommendation-Alert_api.json',
  );
  const original = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const { workflow, webhookPath } = rewriteWorkflowForOneShot(original, dayOffset);
  const baseUrl = process.env.N8N_BASE_URL.replace(/\/$/, '');
  const webhookUrl = `${baseUrl}/webhook/${webhookPath}`;

  let createdId = '';
  const summary = {
    sendWorkflowName: workflow.name,
    webhookUrl,
    dayOffset,
  };

  try {
    const created = await api('POST', `${baseUrl}/api/v1/workflows`, workflow);
    createdId = created.id;
    summary.sendWorkflowId = createdId;

    await api('POST', `${baseUrl}/api/v1/workflows/${createdId}/activate`);
    await sleep(2000);

    summary.webhookResponse = await fetchText(webhookUrl);

    const executionState = await waitForExecution(baseUrl, createdId, 300000);
    const latest = executionState.latest;
    summary.executionTimedOut = executionState.timedOut;
    summary.executionId = latest.id;
    summary.executionStatus = latest.status;
    summary.startedAt = latest.startedAt;
    summary.finishedAt = latest.finishedAt || null;
  } finally {
    if (createdId) {
      try {
        await api('POST', `${baseUrl}/api/v1/workflows/${createdId}/deactivate`);
      } catch {}

      try {
        await api('DELETE', `${baseUrl}/api/v1/workflows/${createdId}`);
        summary.cleanup = 'deleted';
      } catch (error) {
        summary.cleanup = 'deactivated-only';
        summary.deleteWarning = error.message;
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
