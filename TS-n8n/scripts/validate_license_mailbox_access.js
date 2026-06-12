const fs = require('fs');
const path = require('path');

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
  return res.json();
}

function buildWorkflow() {
  return {
    name: `codex-validate-license-mailbox-${Date.now()}`,
    nodes: [
      {
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
        position: [-1200, 0],
        id: 'trigger',
        name: 'Validation Trigger',
        alwaysOutputData: true,
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,id',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-920, -320],
        id: 'me-profile',
        name: 'Me Profile',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/me/mailFolders?$top=100&$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-920, -160],
        id: 'me-root',
        name: 'Me Root Folders',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/childFolders?$top=100&$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-920, 0],
        id: 'me-inbox-child',
        name: 'Me Inbox ChildFolders',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=10&$select=id,subject,isRead,flag,receivedDateTime,webLink,parentFolderId',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-920, 160],
        id: 'me-inbox-messages',
        name: 'Me Inbox Messages',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/users/support@vms-solutions.com?$select=displayName,mail,userPrincipalName,id',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-560, -320],
        id: 'shared-profile',
        name: 'Shared Profile',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/users/support@vms-solutions.com/mailFolders?$top=100&$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-560, -160],
        id: 'shared-root',
        name: 'Shared Root Folders',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/users/support@vms-solutions.com/mailFolders/inbox/childFolders?$top=100&$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-560, 0],
        id: 'shared-inbox-child',
        name: 'Shared Inbox ChildFolders',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          url: 'https://graph.microsoft.com/v1.0/users/support@vms-solutions.com/mailFolders/inbox/messages?$top=10&$select=id,subject,isRead,flag,receivedDateTime,webLink,parentFolderId',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [-560, 160],
        id: 'shared-inbox-messages',
        name: 'Shared Inbox Messages',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
      {
        parameters: {
          jsCode: [
            "const raw = $('Shared Inbox ChildFolders').first()?.json ?? {};",
            "const folders = Array.isArray(raw.value) ? raw.value : [];",
            "",
            "const normalize = (s) => String(s ?? '').toLowerCase().replace(/\\s+/g, '');",
            "const matches = folders.filter((folder) => {",
            "  const name = normalize(folder.displayName);",
            "  return name.includes('license') || name.includes('\\uB77C\\uC774\\uC120\\uC2A4') || name.includes('\\uB77C\\uC774\\uC13C\\uC2A4');",
            "});",
            "",
            "return [{",
            "  json: {",
            "    candidateCount: matches.length,",
            "    candidateFolders: matches.map((folder) => ({",
            "      id: folder.id,",
            "      displayName: folder.displayName,",
            "      unreadItemCount: folder.unreadItemCount,",
            "      totalItemCount: folder.totalItemCount",
            "    })),",
            "    folderId: matches[0]?.id || '',",
            "    folderName: matches[0]?.displayName || ''",
            "  }",
            "}];",
          ].join('\n'),
        },
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [-240, 0],
        id: 'resolve-folder',
        name: 'Resolve License Folder',
        alwaysOutputData: true,
      },
      {
        parameters: {
          url: "={{ $json.folderId ? 'https://graph.microsoft.com/v1.0/users/support@vms-solutions.com/mailFolders/' + encodeURIComponent($json.folderId) + '/messages?$top=10&$select=id,subject,isRead,flag,receivedDateTime,webLink,parentFolderId' : 'https://graph.microsoft.com/v1.0/users/support@vms-solutions.com/mailFolders/inbox/messages?$top=1&$select=id,subject,isRead,flag,receivedDateTime,webLink,parentFolderId' }}",
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'microsoftOutlookOAuth2Api',
          options: {},
        },
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        position: [40, 0],
        id: 'shared-license-messages',
        name: 'Shared License Folder Messages',
        alwaysOutputData: true,
        onError: 'continueRegularOutput',
        credentials: {
          microsoftOutlookOAuth2Api: {
            id: 'QrARH25rhyVoJNXv',
            name: 'tsupport',
          },
        },
      },
    ],
    connections: {
      'Validation Trigger': {
        main: [[
          { node: 'Me Profile', type: 'main', index: 0 },
          { node: 'Me Root Folders', type: 'main', index: 0 },
          { node: 'Me Inbox ChildFolders', type: 'main', index: 0 },
          { node: 'Me Inbox Messages', type: 'main', index: 0 },
          { node: 'Shared Profile', type: 'main', index: 0 },
          { node: 'Shared Root Folders', type: 'main', index: 0 },
          { node: 'Shared Inbox ChildFolders', type: 'main', index: 0 },
          { node: 'Shared Inbox Messages', type: 'main', index: 0 },
        ]],
      },
      'Shared Inbox ChildFolders': {
        main: [[
          { node: 'Resolve License Folder', type: 'main', index: 0 },
        ]],
      },
      'Resolve License Folder': {
        main: [[
          { node: 'Shared License Folder Messages', type: 'main', index: 0 },
        ]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeNode(runData, nodeName) {
  const steps = runData?.[nodeName];
  if (!steps || !steps[0]) return { status: 'missing' };
  const step = steps[0];
  const item = step.data?.main?.[0]?.[0]?.json;
  return {
    status: step.executionStatus || 'unknown',
    json: item ?? null,
    rawItemCount: Array.isArray(step.data?.main?.[0]) ? step.data.main[0].length : 0,
  };
}

function pickFolders(payload) {
  const rows = Array.isArray(payload?.value) ? payload.value : [];
  return rows.slice(0, 20).map((row) => ({
    displayName: row.displayName,
    unreadItemCount: row.unreadItemCount,
    totalItemCount: row.totalItemCount,
    id: row.id,
  }));
}

function pickMessages(payload) {
  const rows = Array.isArray(payload?.value) ? payload.value : [];
  return rows.slice(0, 10).map((row) => ({
    subject: row.subject,
    isRead: row.isRead,
    flagStatus: row.flag?.flagStatus ?? '',
    receivedDateTime: row.receivedDateTime,
    id: row.id,
  }));
}

async function main() {
  loadEnv();
  const base = process.env.N8N_BASE_URL.replace(/\/$/, '');
  const workflow = buildWorkflow();

  const created = await api('POST', `${base}/api/v1/workflows`, workflow);
  const workflowId = created.id;
  await api('POST', `${base}/api/v1/workflows/${workflowId}/activate`);

  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  const waitMs = Math.max(msToNextMinute + 25000, 40000);
  await sleep(waitMs);

  const executions = await api('GET', `${base}/api/v1/executions?workflowId=${workflowId}&limit=5&includeData=true`);
  const latest = executions.data?.[0];
  if (!latest) {
    throw new Error('No execution found for validation workflow.');
  }

  const exec = await api('GET', `${base}/api/v1/executions/${latest.id}?includeData=true`);
  const runData = exec.data?.resultData?.runData || {};

  const summary = {
    workflowId,
    executionId: latest.id,
    startedAt: latest.startedAt,
    status: latest.status,
    meProfile: summarizeNode(runData, 'Me Profile'),
    meRootFolders: pickFolders(summarizeNode(runData, 'Me Root Folders').json),
    meInboxChildFolders: pickFolders(summarizeNode(runData, 'Me Inbox ChildFolders').json),
    meInboxMessages: pickMessages(summarizeNode(runData, 'Me Inbox Messages').json),
    sharedProfile: summarizeNode(runData, 'Shared Profile'),
    sharedRootFolders: pickFolders(summarizeNode(runData, 'Shared Root Folders').json),
    sharedInboxChildFolders: pickFolders(summarizeNode(runData, 'Shared Inbox ChildFolders').json),
    resolvedLicenseFolder: summarizeNode(runData, 'Resolve License Folder').json,
    sharedInboxMessages: pickMessages(summarizeNode(runData, 'Shared Inbox Messages').json),
    sharedLicenseFolderMessages: pickMessages(summarizeNode(runData, 'Shared License Folder Messages').json),
  };

  try {
    await api('POST', `${base}/api/v1/workflows/${workflowId}/deactivate`);
  } catch (error) {
    summary.deactivateWarning = error.message;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
