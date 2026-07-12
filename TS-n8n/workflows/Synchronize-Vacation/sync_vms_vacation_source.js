const fs = require('fs');
const path = require('path');

const injectedConfig = globalThis.__SYNC_VACATION_INLINE_CONFIG__ || null;
const workflowDir = typeof __dirname === 'string' ? __dirname : process.cwd();
const root = path.resolve(workflowDir, '..', '..');

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

function mergeEnv(...items) {
  return Object.assign({}, ...items);
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromResponse(headers) {
    for (const entry of getSetCookies(headers)) {
      const first = String(entry || '').split(';')[0];
      const idx = first.indexOf('=');
      if (idx <= 0) continue;
      const name = first.slice(0, idx).trim();
      const value = first.slice(idx + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }
}

function parseCsrfToken(html) {
  const inputMatch = String(html || '').match(/name="csrf_token"\s+type="hidden"\s+value="([^"]+)"/i);
  if (inputMatch) return inputMatch[1];
  const metaMatch = String(html || '').match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
  return metaMatch ? metaMatch[1] : '';
}

function toKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
  };
}

function toKstTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')} KST`;
}

function toKstDate(date = new Date()) {
  const parts = toKstDateParts(date);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

const SYNC_LOOKBACK_DAYS = 7;

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsKeepingDay(date, months) {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function buildMonthPairs(startDate, endDate) {
  const startParts = toKstDateParts(startDate);
  const endParts = toKstDateParts(endDate);
  const pairs = [];

  let year = startParts.year;
  let month = startParts.month;
  while (year < endParts.year || (year === endParts.year && month <= endParts.month)) {
    pairs.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return pairs;
}

function buildSyncWindow() {
  const today = new Date();
  const startRef = addDays(today, -SYNC_LOOKBACK_DAYS);
  const endRef = addMonthsKeepingDay(today, 1);
  const startDate = toKstDate(startRef);
  const endDate = toKstDate(endRef);

  return {
    startDate,
    endDate,
    lookbackDays: SYNC_LOOKBACK_DAYS,
    monthPairs: buildMonthPairs(startRef, endRef),
  };
}

function mapTimeSlot(leaveForm) {
  const text = String(leaveForm || '');
  if (text.includes('\uC624\uC804')) return '\uC624\uC804\uB9CC';
  if (text.includes('\uC624\uD6C4')) return '\uC624\uD6C4\uB9CC';
  if (text.includes('\uC804\uC77C') || text.includes('\uD558\uB8E8')) return '\uD558\uB8E8 \uC885\uC77C';
  return '\uD2B9\uC815 \uC2DC\uAC04\uC5D0\uB9CC';
}

function mapTitle(leaveType, resourceName, leaveForm) {
  if (!leaveForm || leaveForm.includes('\uC804\uC77C') || leaveForm.includes('\uD558\uB8E8')) {
    return `(${leaveType}) ${resourceName}`;
  }
  return `(${leaveType}) ${resourceName} - ${leaveForm}`;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  return { response, text };
}

async function loginAndFetchLeaves(config) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const loginUrl = `${baseUrl}/auth/login?next=${encodeURIComponent(baseUrl + '/')}`;
  const jar = new CookieJar();
  const syncWindow = buildSyncWindow();

  const loginPage = await fetchText(loginUrl, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'Synchronize-Vacation/1.0',
    },
  });
  jar.setFromResponse(loginPage.response.headers);

  if (!loginPage.response.ok) {
    throw new Error(`Failed to load VMS Works login page: ${loginPage.response.status}`);
  }

  const loginCsrf = parseCsrfToken(loginPage.text);
  if (!loginCsrf) {
    throw new Error('Failed to read login csrf token from VMS Works.');
  }

  const form = new URLSearchParams();
  form.set('csrf_token', loginCsrf);
  form.set('username', config.username);
  form.set('password', config.password);
  form.set('remember_me', 'y');

  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'content-type': 'application/x-www-form-urlencoded',
      origin: baseUrl,
      referer: loginUrl,
      cookie: jar.header(),
      'user-agent': 'Synchronize-Vacation/1.0',
    },
    body: form.toString(),
  });
  jar.setFromResponse(loginResponse.headers);

  if (loginResponse.status !== 302) {
    const body = await loginResponse.text();
    throw new Error(`VMS Works login failed: ${loginResponse.status} ${body.slice(0, 240)}`);
  }

  const home = await fetchText(`${baseUrl}/`, {
    method: 'GET',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      cookie: jar.header(),
      referer: loginUrl,
      'user-agent': 'Synchronize-Vacation/1.0',
    },
  });
  jar.setFromResponse(home.response.headers);

  if (!home.response.ok) {
    throw new Error(`Failed to open VMS Works home after login: ${home.response.status}`);
  }

  const apiCsrf = parseCsrfToken(home.text);
  if (!apiCsrf) {
    throw new Error('Failed to read API csrf token from VMS Works home page.');
  }

  const targetById = new Map(config.targets.map((target) => [target.resourceId, target]));
  const dedup = new Map();

  for (const pair of syncWindow.monthPairs) {
    const url = `${baseUrl}/reports/resource/leave-calendar/data?year=${pair.year}&month=${pair.month}&org_id=25`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json, text/plain, */*',
        cookie: jar.header(),
        referer: `${baseUrl}/`,
        origin: baseUrl,
        'x-csrftoken': apiCsrf,
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': 'Synchronize-Vacation/1.0',
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Leave calendar fetch failed for ${pair.year}-${String(pair.month).padStart(2, '0')}: ${response.status} ${text.slice(0, 240)}`);
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse leave calendar payload for ${pair.year}-${pair.month}: ${error.message}`);
    }

    const leavesByDate = payload?.leaves_by_date && typeof payload.leaves_by_date === 'object'
      ? payload.leaves_by_date
      : {};

    for (const leaves of Object.values(leavesByDate)) {
      if (!Array.isArray(leaves)) continue;
      for (const leave of leaves) {
        const resourceId = Number(leave?.resource_id);
        if (!targetById.has(resourceId)) continue;

        const resourceName = String(leave?.resource_name || targetById.get(resourceId)?.resourceName || '').trim();
        const startDate = String(leave?.start_date || '').trim();
        const endDate = String(leave?.end_date || leave?.start_date || '').trim();
        const leaveType = String(leave?.leave_type || '').trim();
        const leaveForm = String(leave?.leave_form || '').trim();
        const period = String(leave?.period || '').trim();

        if (!resourceName || !startDate || !leaveType || !leaveForm) continue;
        if (endDate < syncWindow.startDate) continue;
        if (startDate > syncWindow.endDate) continue;

        const syncKey = [resourceId, startDate, endDate, leaveType, leaveForm].join(':');
        if (dedup.has(syncKey)) continue;

        dedup.set(syncKey, {
          syncKey,
          resourceId,
          resourceName,
          startDate,
          endDate,
          leaveType,
          leaveForm,
          period,
          timeSlot: mapTimeSlot(leaveForm),
          title: mapTitle(leaveType, resourceName, leaveForm),
        });
      }
    }
  }

  return {
    items: [...dedup.values()].sort((a, b) => {
      const byStart = a.startDate.localeCompare(b.startDate);
      if (byStart !== 0) return byStart;
      const byName = a.resourceName.localeCompare(b.resourceName);
      if (byName !== 0) return byName;
      return a.syncKey.localeCompare(b.syncKey);
    }),
    syncWindow,
  };
}

async function main() {
  const localEnv = injectedConfig ? {} : loadEnvFile(path.join(workflowDir, '.env'));
  const sharedEnv = injectedConfig ? {} : loadEnvFile(path.join(root, 'credentials', 'vmsworks', 'vmsworks.env'));
  const env = mergeEnv(sharedEnv, localEnv, process.env);

  const config = injectedConfig || {
    baseUrl: env.VMS_WORKS_ADDRESS || 'https://vms-works.com/',
    username: env.VMS_WORKS_ID || '',
    password: env.VMS_WORKS_PW || '',
    targets: [
      { resourceId: 84, resourceName: '\uAE40\uC9C4\uC6B1' },
      { resourceId: 80, resourceName: '\uAE40\uBBFC\uC601' },
      { resourceId: 108, resourceName: '\uC870\uD604\uC7AC' },
      { resourceId: 111, resourceName: '\uAC15\uAD70\uC11D' },
    ],
  };

  if (!config.username || !config.password) {
    throw new Error('VMS Works login credentials are missing.');
  }

  const result = await loginAndFetchLeaves(config);
  const output = {
    managedBy: 'Synchronize-Vacation',
    generatedAtKst: toKstTimestamp(),
    syncWindow: result.syncWindow,
    targetUsers: config.targets,
    items: result.items,
  };

  process.stdout.write(`${JSON.stringify(output)}\n`);
}

main().catch((error) => {
  if (process.env.SYNC_VACATION_EMIT_ERROR_JSON === '1') {
    process.stdout.write(`${JSON.stringify({
      managedBy: 'Synchronize-Vacation',
      generatedAtKst: toKstTimestamp(),
      syncWindow: {},
      targetUsers: [
        { resourceId: 84, resourceName: '\uAE40\uC9C4\uC6B1' },
        { resourceId: 80, resourceName: '\uAE40\uBBFC\uC601' },
        { resourceId: 108, resourceName: '\uC870\uD604\uC7AC' },
        { resourceId: 111, resourceName: '\uAC15\uAD70\uC11D' },
      ],
      items: [],
      ok: false,
      errorMessage: String(error.message || error),
    })}\n`);
    process.exit(0);
  }
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
