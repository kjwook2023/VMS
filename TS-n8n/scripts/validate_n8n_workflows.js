const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const vm = require('vm');

const root = process.cwd();
const workflowsRoot = path.join(root, 'workflows');

function loadEnvFile() {
  const envPath = path.join(root, 'n8n.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const match = line.match(/^(.*?)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

function listLocalWorkflowFiles() {
  const files = [];
  for (const dirent of fs.readdirSync(workflowsRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const filePath = path.join(workflowsRoot, dirent.name, `${dirent.name}_api.json`);
    if (fs.existsSync(filePath)) {
      files.push(filePath);
    }
  }
  return files.sort();
}

function tryParseJson(filePath) {
  try {
    return { value: JSON.parse(fs.readFileSync(filePath, 'utf8')), errors: [] };
  } catch (error) {
    return { value: null, errors: [`JSON parse error: ${error.message}`] };
  }
}

function compileJavaScript(source, label, errors) {
  try {
    new vm.Script(`(function(){\n${source}\n})`, { filename: label });
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
  }
}

function compileExpression(expression, label, errors, warnings) {
  let source = expression;
  if (source.startsWith('={{') && source.endsWith('}}')) {
    source = source.slice(3, -2).trim();
  } else if (source.startsWith('={')) {
    source = source.slice(1).trim();
  } else if (source.startsWith('=')) {
    source = source.slice(1).trim();
  } else {
    return;
  }

  if (source.includes('{{')) {
    warnings.push(`${label}: template-style jsonBody uses {{ }} placeholders and needs manual/runtime validation`);
    return;
  }

  try {
    new vm.Script(`(${source})`, { filename: label });
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
  }
}

function looksMojibake(value) {
  if (typeof value !== 'string') return false;
  if (value.includes('???')) return true;
  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
  if (!hasCjk) return false;
  if (value.includes('?')) return true;
  return false;
}

function collectMojibake(value, hits, trail = []) {
  if (typeof value === 'string') {
    if (looksMojibake(value)) {
      hits.push({
        path: trail.join('.'),
        sample: value.slice(0, 160),
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => collectMojibake(item, hits, trail.concat(idx)));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      collectMojibake(nested, hits, trail.concat(key));
    }
  }
}

function validateWorkflow(workflow, label) {
  const errors = [];
  const warnings = [];
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const nodeNames = new Set();
  const nodeIds = new Set();
  const nameToNode = new Map();

  for (const node of nodes) {
    if (!node.name) errors.push(`node missing name: ${node.id || '(no id)'}`);
    if (node.name && nodeNames.has(node.name)) errors.push(`duplicate node name: ${node.name}`);
    if (node.id && nodeIds.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    if (node.name) nodeNames.add(node.name);
    if (node.id) nodeIds.add(node.id);
    if (node.name) nameToNode.set(node.name, node);

    if (node.type === 'n8n-nodes-base.code' && node.parameters && typeof node.parameters.jsCode === 'string') {
      compileJavaScript(node.parameters.jsCode, `${label} :: code node "${node.name}"`, errors);
    }

    if (node.parameters && typeof node.parameters.jsonBody === 'string') {
      compileExpression(node.parameters.jsonBody, `${label} :: jsonBody node "${node.name}"`, errors, warnings);
    }
  }

  const connections = workflow.connections || {};
  for (const [sourceName, conn] of Object.entries(connections)) {
    if (!nameToNode.has(sourceName)) {
      errors.push(`connection source missing node: ${sourceName}`);
    }

    if (!conn || !Array.isArray(conn.main)) continue;
    for (const branch of conn.main) {
      if (!Array.isArray(branch)) continue;
      for (const item of branch) {
        if (item && item.node && !nameToNode.has(item.node)) {
          errors.push(`connection target missing node: ${sourceName} -> ${item.node}`);
        }
      }
    }
  }

  const mojibakeHits = [];
  collectMojibake(nodes, mojibakeHits, ['nodes']);
  for (const hit of mojibakeHits) {
    warnings.push(`suspicious text at ${hit.path}: ${hit.sample}`);
  }

  return { errors, warnings };
}

function fetchServerWorkflowList() {
  if (!process.env.N8N_BASE_URL || !process.env.N8N_API_KEY) {
    return null;
  }

  const base = process.env.N8N_BASE_URL.replace(/\/$/, '');
  const args = [
    '-sS',
    '-H',
    'accept: application/json',
    '-H',
    `X-N8N-API-KEY: ${process.env.N8N_API_KEY}`,
    `${base}/api/v1/workflows?limit=250`,
  ];

  const raw = cp.execFileSync('curl.exe', args, { encoding: 'utf8' });
  return JSON.parse(raw).data || [];
}

function fetchServerWorkflow(id) {
  const base = process.env.N8N_BASE_URL.replace(/\/$/, '');
  const args = [
    '-sS',
    '-H',
    'accept: application/json',
    '-H',
    `X-N8N-API-KEY: ${process.env.N8N_API_KEY}`,
    `${base}/api/v1/workflows/${id}`,
  ];
  const raw = cp.execFileSync('curl.exe', args, { encoding: 'utf8' });
  return JSON.parse(raw);
}

function main() {
  loadEnvFile();

  const localResults = [];
  for (const filePath of listLocalWorkflowFiles()) {
    const parsed = tryParseJson(filePath);
    const name = path.basename(path.dirname(filePath));
    if (parsed.errors.length) {
      localResults.push({ workflow: name, errors: parsed.errors, warnings: [] });
      continue;
    }
    localResults.push({
      workflow: name,
      ...validateWorkflow(parsed.value, `local:${name}`),
    });
  }

  let serverResults = null;
  try {
    const list = fetchServerWorkflowList();
    if (list) {
      serverResults = list.map((summary) => {
        const full = fetchServerWorkflow(summary.id);
        return {
          workflow: summary.name,
          active: summary.active,
          updatedAt: full.updatedAt,
          ...validateWorkflow(full, `server:${summary.name}`),
        };
      });
    }
  } catch (error) {
    serverResults = [{ workflow: '_server_fetch_', errors: [error.message], warnings: [] }];
  }

  const output = {
    generatedAt: new Date().toISOString(),
    local: localResults,
    server: serverResults,
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
