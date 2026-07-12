const fs = require('fs');
const path = require('path');

const WORKFLOW_ID = '2VBL0bRff7oZpLVf';
const WORKFLOW_NAME = 'github-branch-monitor';
const LOCAL_WORKFLOW_JSON = path.join(
  process.cwd(),
  'workflows',
  'github-branch-monitor',
  'github-branch-monitor_api.json',
);

function loadEnv() {
  const envPath = path.join(process.cwd(), 'n8n.env');
  const text = fs.readFileSync(envPath, 'utf8');
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
      'content-type': 'application/json',
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${url} failed: ${res.status} ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadLocalWorkflowTemplate() {
  return JSON.parse(fs.readFileSync(LOCAL_WORKFLOW_JSON, 'utf8'));
}

function findNode(workflow, name) {
  return workflow.nodes.find((node) => node.name === name) || null;
}

function hydrateLocalWorkflow(localWorkflow, liveWorkflow) {
  const prepared = deepClone(localWorkflow);
  const liveFetchHead = findNode(liveWorkflow, 'Fetch Branch Head');
  const liveFetchCompare = findNode(liveWorkflow, 'Fetch Branch Compare');
  const liveTeams = findNode(liveWorkflow, 'Teams Webhook');
  const liveTeamsNoChange = findNode(liveWorkflow, 'Teams Webhook No Change');
  const liveVacationCalendar = findNode(liveWorkflow, 'Vacation Calendar');
  const preparedFetchHead = findNode(prepared, 'Fetch Branch Head');
  const preparedFetchCompare = findNode(prepared, 'Fetch Branch Compare');
  const preparedTeams = findNode(prepared, 'Teams Webhook');
  const preparedTeamsNoChange = findNode(prepared, 'Teams Webhook No Change');
  const preparedVacationCalendar = findNode(prepared, 'Vacation Calendar');

  if (liveFetchHead?.credentials?.githubApi && preparedFetchHead) {
    preparedFetchHead.credentials = { githubApi: liveFetchHead.credentials.githubApi };
  }
  if (liveFetchCompare?.credentials?.githubApi && preparedFetchCompare) {
    preparedFetchCompare.credentials = { githubApi: liveFetchCompare.credentials.githubApi };
  }
  if (liveTeams?.parameters?.url && preparedTeams) {
    preparedTeams.parameters.url = liveTeams.parameters.url;
  }
  if (liveTeamsNoChange?.parameters?.url && preparedTeamsNoChange) {
    preparedTeamsNoChange.parameters.url = liveTeamsNoChange.parameters.url;
  }
  if (liveVacationCalendar?.credentials?.notionApi && preparedVacationCalendar) {
    preparedVacationCalendar.credentials = {
      notionApi: liveVacationCalendar.credentials.notionApi,
    };
  }

  return prepared;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function patchTriggerToEveryMinute(workflow) {
  const trigger = workflow.nodes.find((node) => node.name === 'Schedule Trigger');
  if (!trigger) throw new Error('Schedule Trigger node not found.');
  trigger.parameters = {
    rule: {
      interval: [
        {
          field: 'cronExpression',
          expression: '*/10 * * * * *',
        },
      ],
    },
  };
}

function toWorkflowUpdateBody(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
  };
}

async function main() {
  loadEnv();

  if (!process.env.N8N_BASE_URL || !process.env.N8N_API_KEY) {
    throw new Error('N8N_BASE_URL or N8N_API_KEY is missing.');
  }

  const base = process.env.N8N_BASE_URL.replace(/\/$/, '');
  const workflowUrl = `${base}/api/v1/workflows/${WORKFLOW_ID}`;
  const startedAfter = Date.now();
  const liveWorkflow = await api('GET', workflowUrl);
  const original = hydrateLocalWorkflow(loadLocalWorkflowTemplate(), liveWorkflow);

  if (liveWorkflow.name !== WORKFLOW_NAME || original.name !== WORKFLOW_NAME) {
    throw new Error(`Workflow id ${WORKFLOW_ID} is not ${WORKFLOW_NAME}.`);
  }

  const originalActive = !!liveWorkflow.active;
  const tempWorkflow = deepClone(original);
  patchTriggerToEveryMinute(tempWorkflow);

  let restoreAttempted = false;

  try {
    if (originalActive) {
      await api('POST', `${workflowUrl}/deactivate`);
    }
    await api('PUT', workflowUrl, toWorkflowUpdateBody(tempWorkflow));
    await api('POST', `${workflowUrl}/activate`);

    let execution = null;
    const deadline = Date.now() + 120000;

    while (Date.now() < deadline) {
      await sleep(5000);
      const list = await api(
        'GET',
        `${base}/api/v1/executions?workflowId=${encodeURIComponent(WORKFLOW_ID)}&limit=10&includeData=true`,
      );
      const candidates = (list.data || [])
        .filter((item) => new Date(item.startedAt || 0).getTime() >= startedAfter)
        .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));

      if (candidates.length === 0) continue;

      const latest = candidates[0];
      if (latest.status === 'running' || latest.status === 'new' || latest.status === 'waiting') {
        continue;
      }

      execution = await api('GET', `${base}/api/v1/executions/${latest.id}?includeData=true`);
      break;
    }

    if (!execution) {
      throw new Error('Timed out waiting for one-off execution.');
    }

    const runData = execution.data?.resultData?.runData || {};
    const persisted = runData['Persist Branch State']?.[0]?.data?.main?.[0]?.[0]?.json || null;
    const alerted = runData['Persist Alerted State']?.[0]?.data?.main?.[0]?.[0]?.json || null;
    const holiday = runData['Holiday Judge']?.[0]?.data?.main?.[0]?.[0]?.json || null;
    const teamsPayload = runData['Build Teams Payload']?.[0]?.data?.main?.[0]?.[0]?.json || null;

    const summary = {
      executionId: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.stoppedAt || execution.finishedAt || '',
      isHoliday: holiday?.is_holiday ?? null,
      holidayName: holiday?.holiday_name || '',
      notified: Boolean(alerted?.notified),
      notifySkippedReason: persisted?.notifySkippedReason || '',
      checkSlotLabel: teamsPayload?.checkSlotLabel || persisted?.checkSlotLabel || '',
      compareSinceLabel: teamsPayload?.compareSinceLabel || persisted?.compareSinceLabel || '',
      teamsSummary: teamsPayload?.teamsSummary || '',
      branches: [],
    };

    const branchItems = [];
    if (teamsPayload) branchItems.push(teamsPayload);
    const branchStateItems = runData['Build Comparison State']?.flatMap((item) => item.data?.main?.[0] || []) || [];
    for (const entry of branchStateItems) {
      const json = entry?.json;
      if (!json) continue;
      branchItems.push(json);
    }

    const seen = new Set();
    for (const item of branchItems) {
      const key = `${item.repoOwner || ''}/${item.repository || ''}:${item.branch || ''}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      summary.branches.push({
        key,
        previousSha: item.previousSha || '',
        currentSha: item.currentSha || '',
        hasChanged: Boolean(item.hasChanged),
        isInitialization: Boolean(item.isInitialization),
      });
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    restoreAttempted = true;
    await api('PUT', workflowUrl, toWorkflowUpdateBody(original));
    if (originalActive) {
      await api('POST', `${workflowUrl}/activate`);
    } else {
      await api('POST', `${workflowUrl}/deactivate`);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
