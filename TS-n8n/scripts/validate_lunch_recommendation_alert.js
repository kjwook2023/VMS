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

function compact(value, max = 220) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function uniqueWebhookPath() {
  return `codex-lunch-recommend-validate-${Date.now()}`;
}

function uniqueId() {
  return crypto.randomUUID();
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

function rewriteWorkflowForValidation(workflow) {
  const rewritten = cleanWorkflowForCreate(workflow);
  const suffix = Date.now();
  const webhookPath = uniqueWebhookPath();

  rewritten.name = `codex-validate-${workflow.name}-${suffix}`;

  const nodes = Array.isArray(rewritten.nodes) ? rewritten.nodes : [];
  for (const node of nodes) {
    if (node.name === 'More Recommendation Webhook') {
      node.parameters.path = webhookPath;
      node.webhookId = uniqueId();
    }

    if (node.name === 'Lunch Teams Webhook') {
      node.type = 'n8n-nodes-base.code';
      node.typeVersion = 2;
      node.parameters = {
        jsCode: [
          "const payload = $('Build Teams Payload').first()?.json ?? {};",
          "const recommendation = $('Parse Recommendation').first()?.json ?? {};",
          'return [{',
          '  json: {',
          '    validationOnly: true,',
          '    title: String(recommendation.title || ""),',
          '    summary: String(recommendation.summary || ""),',
          '    recommendationApiError: String(recommendation.recommendationApiError || ""),',
          '    searchError: String(recommendation.searchError || ""),',
          '    weatherFetchError: String(recommendation.weatherFetchError || ""),',
          '    walkRecommendations: Array.isArray(recommendation.walkRecommendations) ? recommendation.walkRecommendations : [],',
          '    driveRecommendations: Array.isArray(recommendation.driveRecommendations) ? recommendation.driveRecommendations : [],',
          '    cardBody: Array.isArray(payload.cardBody) ? payload.cardBody : [],',
          '    cardActions: Array.isArray(payload.cardActions) ? payload.cardActions : [],',
          '  }',
          '}];',
        ].join('\n'),
      };
      delete node.credentials;
      node.onError = 'stopWorkflow';
      node.alwaysOutputData = true;
    }
  }

  return { workflow: rewritten, webhookPath };
}

function summarizeNode(runData, nodeName) {
  const entries = runData?.[nodeName];
  if (!entries || !entries[0]) {
    return { status: 'missing', itemCount: 0, json: null };
  }

  const entry = entries[0];
  const items = Array.isArray(entry?.data?.main?.[0]) ? entry.data.main[0] : [];
  return {
    status: entry.executionStatus || 'unknown',
    itemCount: items.length,
    json: items[0]?.json ?? null,
  };
}

function pickRecommendationSummary(nodeSummary) {
  const json = nodeSummary?.json || {};
  return {
    title: String(json.title || ''),
    summary: compact(json.summary || ''),
    recommendationApiError: compact(json.recommendationApiError || ''),
    searchError: compact(json.searchError || ''),
    weatherFetchError: compact(json.weatherFetchError || ''),
    walkRecommendations: Array.isArray(json.walkRecommendations)
      ? json.walkRecommendations.map((item) => ({
          rank: item.rank,
          placeName: item.placeName,
          distanceMeters: item.distanceMeters,
        }))
      : [],
    driveRecommendations: Array.isArray(json.driveRecommendations)
      ? json.driveRecommendations.map((item) => ({
          rank: item.rank,
          placeName: item.placeName,
          distanceMeters: item.distanceMeters,
        }))
      : [],
  };
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

  const workflowPath = path.join(
    root,
    'workflows',
    'Lunch-Recommendation-Alert',
    'Lunch-Recommendation-Alert_api.json',
  );
  const original = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const { workflow, webhookPath } = rewriteWorkflowForValidation(original);
  const baseUrl = process.env.N8N_BASE_URL.replace(/\/$/, '');
  const webhookUrl = `${baseUrl}/webhook/${webhookPath}`;

  let createdId = '';
  const summary = {
    validationWorkflowName: workflow.name,
    webhookUrl,
  };

  try {
    const created = await api('POST', `${baseUrl}/api/v1/workflows`, workflow);
    createdId = created.id;
    summary.validationWorkflowId = createdId;

    await api('POST', `${baseUrl}/api/v1/workflows/${createdId}/activate`);
    await sleep(2000);

    summary.webhookResponse = compact(await fetchText(webhookUrl), 500);

    const executionState = await waitForExecution(baseUrl, createdId, 300000);
    const latest = executionState.latest;
    summary.executionTimedOut = executionState.timedOut;
    summary.executionId = latest.id;
    summary.executionStatus = latest.status;
    summary.startedAt = latest.startedAt;
    summary.finishedAt = latest.finishedAt || null;

    const exec = await api('GET', `${baseUrl}/api/v1/executions/${latest.id}?includeData=true`);
    const runData = exec?.data?.resultData?.runData || {};

    const holiday = summarizeNode(runData, 'Determine Holiday');
    const center = summarizeNode(runData, 'Build Search Center');
    const weather = summarizeNode(runData, 'Summarize Weather');
    const selected = summarizeNode(runData, 'Select Candidate Places');
    const parsed = summarizeNode(runData, 'Parse Recommendation');
    const builtCard = summarizeNode(runData, 'Build Teams Payload');
    const finalNode = summarizeNode(runData, 'Lunch Teams Webhook');

    summary.nodeStatuses = {
      determineHoliday: holiday.status,
      buildSearchCenter: center.status,
      summarizeWeather: weather.status,
      selectCandidatePlaces: selected.status,
      askGemini: summarizeNode(runData, 'Ask Gemini Lunch Recommendation').status,
      parseRecommendation: parsed.status,
      buildTeamsPayload: builtCard.status,
      validationSink: finalNode.status,
    };

    summary.holiday = holiday.json
      ? {
          date: holiday.json.today_date,
          weekday: holiday.json.weekday_name,
          isHoliday: holiday.json.is_holiday,
          holidayName: holiday.json.holiday_name,
        }
      : null;

    summary.location = center.json
      ? {
          displayName: center.json.centerDisplayName,
          resolvedAddress: center.json.centerLocationText,
          locationResolved: center.json.locationResolved,
          locationError: center.json.locationError,
        }
      : null;

    summary.weather = weather.json
      ? {
          todaySummaryText: compact(weather.json.weatherContext?.todaySummaryText || ''),
          weekSummaryText: compact(weather.json.weatherContext?.weekSummaryText || ''),
          weatherFetchError: compact(weather.json.weatherFetchError || ''),
        }
      : null;

    summary.candidateCounts = selected.json
      ? {
          totalCandidateCount: selected.json.totalCandidateCount,
          totalWalkCandidateCount: selected.json.totalWalkCandidateCount,
          totalDriveCandidateCount: selected.json.totalDriveCandidateCount,
          searchError: compact(selected.json.searchError || ''),
        }
      : null;

    summary.recommendation = pickRecommendationSummary(parsed);
    summary.card = finalNode.json
      ? {
          bodyCount: Array.isArray(finalNode.json.cardBody) ? finalNode.json.cardBody.length : 0,
          actionCount: Array.isArray(finalNode.json.cardActions) ? finalNode.json.cardActions.length : 0,
          actions: Array.isArray(finalNode.json.cardActions)
            ? finalNode.json.cardActions.map((item) => ({
                type: item.type,
                title: item.title,
                url: compact(item.url || '', 160),
              }))
            : [],
        }
      : null;
  } finally {
    if (createdId) {
      try {
        await api('POST', `${baseUrl}/api/v1/workflows/${createdId}/deactivate`);
      } catch (error) {
        summary.deactivateWarning = compact(error.message);
      }

      try {
        await api('DELETE', `${baseUrl}/api/v1/workflows/${createdId}`);
        summary.cleanup = 'deleted';
      } catch (error) {
        summary.cleanup = 'deactivated-only';
        summary.deleteWarning = compact(error.message);
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
