const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflowName = 'Lunch-Menu-Alert';
const workflowDir = path.join(root, 'workflows', workflowName);
const workflowPath = path.join(workflowDir, `${workflowName}_api.json`);

const TEAMS_WEBHOOK =
  process.env.TS_LUNCH_TEAMS_WEBHOOK || 'https://redacted.invalid/powerautomate/lunch-menu-webhook';

const KAKAO_PROFILE_ID = '_xgUVZn';
const KAKAO_POSTS_URL = `https://pf.kakao.com/rocket-web/web/profiles/${KAKAO_PROFILE_ID}/posts/recent?size=10`;
const KAKAO_POSTS_REFERER = `https://pf.kakao.com/${KAKAO_PROFILE_ID}/posts`;
const KAKAO_CHANNEL_LINK = `https://pf.kakao.com/${KAKAO_PROFILE_ID}/posts`;

function uuid(seed) {
  const text = `${workflowName}:${seed}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const hex = (n) => (Math.abs(n).toString(16).padStart(8, '0')).slice(0, 8);
  return `${hex(hash + 1)}-${hex(hash + 2).slice(0, 4)}-${hex(hash + 3).slice(0, 4)}-${hex(hash + 4).slice(0, 4)}-${hex(hash + 5)}${hex(hash + 6)}`;
}

const weekdayBaselineCode = [
  "const now = new Date();",
  "const parts = new Intl.DateTimeFormat('en-CA', {",
  "  timeZone: 'Asia/Seoul',",
  "  year: 'numeric',",
  "  month: '2-digit',",
  "  day: '2-digit',",
  "  weekday: 'long',",
  "}).formatToParts(now);",
  "const pick = (type) => parts.find((part) => part.type === type)?.value || '';",
  "const year = pick('year');",
  "const month = pick('month');",
  "const day = pick('day');",
  "const weekdayEn = pick('weekday');",
  "const weekdayMap = {",
  "  Monday: '\\uC6D4\\uC694\\uC77C',",
  "  Tuesday: '\\uD654\\uC694\\uC77C',",
  "  Wednesday: '\\uC218\\uC694\\uC77C',",
  "  Thursday: '\\uBAA9\\uC694\\uC77C',",
  "  Friday: '\\uAE08\\uC694\\uC77C',",
  "  Saturday: '\\uD1A0\\uC694\\uC77C',",
  "  Sunday: '\\uC77C\\uC694\\uC77C',",
  "};",
  "const isWeekend = weekdayEn === 'Saturday' || weekdayEn === 'Sunday';",
  'return [{',
  '  json: {',
  '    todayDate: `${year}-${month}-${day}`,',
  '    todayInt: `${year}${month}${day}`,',
  '    todayMMDD: `${month}${day}`,',
  '    WeekdayName: weekdayMap[weekdayEn] || weekdayEn,',
  '    IsWeekend: isWeekend,',
  '    DefaultIsHoliday: isWeekend,',
  "    DefaultHolidayName: isWeekend ? '\\uC8FC\\uB9D0' : '\\uD3C9\\uC77C',",
  '  }',
  '}];',
].join('\n');

const determineHolidayCode = [
  "const baseline = $('Weekday Baseline').first().json;",
  "const dbPayload = $('Holiday DB Fallback').first()?.json ?? {};",
  "const dbFound = !dbPayload.error && [true, 1, '1', 'true'].includes(dbPayload.found_in_db);",
  '',
  'let isHoliday = !!baseline.DefaultIsHoliday;',
  "let holidayName = baseline.DefaultHolidayName || (isHoliday ? '\\uC8FC\\uB9D0' : '\\uD3C9\\uC77C');",
  "let holidayLookupSource = isHoliday ? 'default-weekend' : 'default-weekday';",
  '',
  'if (dbFound) {',
  '  isHoliday = true;',
  "  holidayName = String(dbPayload.holiday_name || '\\uACF5\\uD734\\uC77C');",
  "  holidayLookupSource = dbPayload.source_type ? `db:${dbPayload.source_type}` : 'db';",
  '}',
  '',
  'return [{',
  '  json: {',
  '    check_date: baseline.todayInt,',
  '    today_date: baseline.todayDate,',
  '    is_holiday: isHoliday,',
  '    holiday_name: holidayName,',
  '    is_weekend: !!baseline.IsWeekend,',
  '    weekday_name: baseline.WeekdayName,',
  '    holiday_lookup_source: holidayLookupSource,',
  "    db_error: dbPayload.error || '',",
  '  }',
  '}];',
].join('\n');

const selectLunchPostCode = [
  "const fetchItems = $('Fetch Kakao Lunch Posts').all().map((item) => item?.json ?? {});",
  "const fallbackLink = 'https://pf.kakao.com/_xgUVZn/posts';",
  '',
  'function normalizePosts(rawItems) {',
  '  if (!Array.isArray(rawItems)) return [];',
  '  if (rawItems.length === 1) {',
  '    const first = rawItems[0];',
  '    if (Array.isArray(first)) return first;',
  '    if (Array.isArray(first?.items)) return first.items;',
  '  }',
  '  return rawItems.filter((post) => post && typeof post === "object" && !post.error);',
  '}',
  '',
  'function extractContents(post) {',
  '    if (!Array.isArray(post?.contents)) return "";',
  '    return post.contents',
  '      .filter((entry) => entry && entry.t === "text" && entry.v)',
  '      .map((entry) => String(entry.v).trim())',
  '      .filter(Boolean)',
  '      .join("\\n");',
  '  }',
  '',
  'function extractImageUrl(post) {',
  '  if (!Array.isArray(post?.media)) return "";',
  '  const image = post.media.find((entry) => entry && entry.type === "image");',
  '  const raw = image?.xlarge_url || image?.large_url || image?.medium_url || image?.url || "";',
  '  return String(raw).replace(/^http:/, "https:");',
  '}',
  '',
  'const posts = normalizePosts(fetchItems);',
  'const lunchPost = posts.find((post) => String(post?.title || "").includes("\\uC911\\uC2DD"));',
  'const requestErrorItem = fetchItems.find((item) => item?.error);',
  'const requestFailed = Boolean(requestErrorItem);',
  'const requestError = requestErrorItem?.error ?? null;',
  '',
  'return [{',
  '  json: {',
  '    requestFailed,',
  '    requestError,',
  '    postFound: Boolean(lunchPost),',
  '    postTitle: String(lunchPost?.title || ""),',
  '    postContentsText: extractContents(lunchPost),',
  '    postLink: String(lunchPost?.permalink || fallbackLink).replace(/^http:/, "https:"),',
  '    imageUrl: extractImageUrl(lunchPost),',
  '    postCreatedAt: lunchPost?.created_at || lunchPost?.published_at || "",',
  '    fallbackLink,',
  '  }',
  '}];',
].join('\n');

const buildTeamsPayloadCode = [
  "const holiday = $('Determine Holiday').first()?.json ?? {};",
  "const selected = $('Select Lunch Post').first()?.json ?? {};",
  '',
  'function getWeekdayShortName(value) {',
  "  const raw = String(value || '');",
  "  return raw ? raw.slice(0, 1) : '';",
  '}',
  '',
  'function toKstString(value) {',
  "  if (value === null || value === undefined || value === '') return '\\uC5C6\\uC74C';",
  '  const date = new Date(value);',
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
  '  }).formatToParts(date);',
  "  const pick = (type) => parts.find((part) => part.type === type)?.value || '';",
  "  return pick('year') + '-' + pick('month') + '-' + pick('day') + ' ' + pick('hour') + ':' + pick('minute') + ':' + pick('second') + ' KST';",
  '}',
  '',
  'const requestFailed = Boolean(selected.requestFailed);',
  'const postFound = Boolean(selected.postFound);',
  "const todayDate = String(holiday.today_date || '').trim();",
  'const weekdayShort = getWeekdayShortName(holiday.weekday_name);',
  "const titlePrefix = todayDate ? `${todayDate}${weekdayShort ? `(${weekdayShort})` : ''} \\uC810\\uC2EC \\uBA54\\uB274 \\uC548\\uB0B4` : '\\uC810\\uC2EC \\uBA54\\uB274 \\uC548\\uB0B4';",
  '',
  'let title = titlePrefix;',
  "let summary = '\\uCE74\\uCE74\\uC624 \\uCC44\\uB110\\uC5D0\\uC11C \\uC624\\uB298 \\uC911\\uC2DD \\uBA54\\uB274\\uB97C \\uD655\\uC778\\uD574 \\uC8FC\\uC138\\uC694.';",
  "let postLink = String(selected.fallbackLink || 'https://pf.kakao.com/_xgUVZn/posts');",
  "let imageUrl = String(selected.imageUrl || '');",
  '',
  'if (requestFailed) {',
  "  title = `${titlePrefix} - \\uC870\\uD68C \\uC624\\uB958`;",
  "  summary = '\\uCE74\\uCE74\\uC624 \\uCC44\\uB110 \\uC810\\uC2EC \\uBA54\\uB274 \\uC815\\uBCF4\\uB97C \\uBD88\\uB7EC\\uC624\\uC9C0 \\uBABB\\uD588\\uC2B5\\uB2C8\\uB2E4.';",
  "  summary = String(selected.requestError?.message || selected.requestError || '\\uC6D0\\uC778 \\uC815\\uBCF4\\uB97C \\uD655\\uC778\\uD560 \\uC218 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.');",
  "  imageUrl = '';",
  '} else if (postFound) {',
  '  title = titlePrefix;',
  '  summary = String(selected.postTitle || "\\uC624\\uB298 \\uC911\\uC2DD \\uBA54\\uB274");',
  '  postLink = String(selected.postLink || postLink);',
  '} else {',
  '  title = titlePrefix;',
  "  summary = '\\uC624\\uB298 \\uC911\\uC2DD \\uBA54\\uB274 \\uAC8C\\uC2DC\\uAE00\\uC744 \\uCC3E\\uC9C0 \\uBABB\\uD588\\uC2B5\\uB2C8\\uB2E4.';",
  "  summary = '\\uCE74\\uCE74\\uC624 \\uCC44\\uB110 \\uCD5C\\uC2E0 \\uAC8C\\uC2DC\\uAE00\\uC744 \\uC9C1\\uC811 \\uD655\\uC778\\uD574 \\uC8FC\\uC138\\uC694.';",
  "  imageUrl = '';",
  '}',
  '',
  'const body = [',
  "  { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true },",
  "  { type: 'TextBlock', text: summary, wrap: true, spacing: 'Small' },",
  '  ...(imageUrl ? [{ type: "Image", url: imageUrl, altText: summary, size: "Stretch", spacing: "Small" }] : []),',
  "  { type: 'FactSet', facts: [",
  "    { title: '\\uAE30\\uC900\\uC77C', value: String(holiday.today_date || '') },",
  "    { title: '\\uD655\\uC778 \\uC2DC\\uAC01', value: toKstString(Date.now()) },",
  "    ...(postFound ? [{ title: '\\uAC8C\\uC2DC \\uC2DC\\uAC01', value: toKstString(selected.postCreatedAt) }] : []),",
  '  ] },',
  '];',
  '',
  'const actions = [',
  "  { type: 'Action.OpenUrl', title: postFound ? '\\uAC8C\\uC2DC\\uAE00 \\uBCF4\\uAE30' : '\\uCC44\\uB110 \\uBCF4\\uAE30', url: postLink },",
  '];',
  '',
  'return [{',
  '  json: {',
  '    cardBody: body,',
  '    cardActions: actions,',
  '  }',
  '}];',
].join('\n');

const workflow = {
  name: workflowName,
  nodes: [
    {
      parameters: {
        rule: {
          interval: [{ field: 'cronExpression', expression: '0 30 11 * * 1-5' }],
        },
      },
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.3,
      position: [-1184, -64],
      id: uuid('schedule'),
      name: 'Lunch Schedule',
      alwaysOutputData: true,
    },
    {
      parameters: { jsCode: weekdayBaselineCode },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-928, -64],
      id: uuid('weekday-baseline'),
      name: 'Weekday Baseline',
      alwaysOutputData: true,
    },
    {
      parameters: {
        operation: 'executeQuery',
        query:
          "=DECLARE @d DATE = CAST('{{ $('Weekday Baseline').item.json.todayDate }}' AS date);\nSELECT\n    CONVERT(VARCHAR(8), @d, 112) AS check_date,\n    CAST(CASE WHEN EXISTS (\n        SELECT 1\n        FROM TsMgmt.dbo.HolidayCalendarKR\n        WHERE HolidayDate = @d\n    ) THEN 1 ELSE 0 END AS bit) AS found_in_db,\n    ISNULL((SELECT TOP 1 HolidayName FROM TsMgmt.dbo.HolidayCalendarKR WHERE HolidayDate = @d), '') AS holiday_name,\n    ISNULL((SELECT TOP 1 SourceType FROM TsMgmt.dbo.HolidayCalendarKR WHERE HolidayDate = @d), '') AS source_type,\n    ISNULL((SELECT TOP 1 SourceYear FROM TsMgmt.dbo.HolidayCalendarKR WHERE HolidayDate = @d), 0) AS source_year;",
      },
      type: 'n8n-nodes-base.microsoftSql',
      typeVersion: 1.1,
      position: [-672, -64],
      id: uuid('holiday-db'),
      name: 'Holiday DB Fallback',
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
      credentials: {
        microsoftSql: {
          id: '2dZb5OQPbTyO3052',
          name: 'TsMgmt(DevTest_SQL2022_26)',
        },
      },
    },
    {
      parameters: { jsCode: determineHolidayCode },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-416, -64],
      id: uuid('determine-holiday'),
      name: 'Determine Holiday',
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
              id: uuid('not-holiday-condition'),
              leftValue: '={{ $json.is_holiday }}',
              rightValue: false,
              operator: { type: 'boolean', operation: 'equals' },
            },
          ],
          combinator: 'and',
        },
        options: {},
      },
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [-160, -64],
      id: uuid('if-not-holiday'),
      name: 'Not Holiday',
      alwaysOutputData: false,
    },
    {
      parameters: {
        url: KAKAO_POSTS_URL,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Accept', value: 'application/json,text/plain,*/*' },
            { name: 'Referer', value: KAKAO_POSTS_REFERER },
            { name: 'User-Agent', value: 'Mozilla/5.0' },
          ],
        },
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [96, -64],
      id: uuid('fetch-kakao-posts'),
      name: 'Fetch Kakao Lunch Posts',
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
    },
    {
      parameters: { jsCode: selectLunchPostCode },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [352, -64],
      id: uuid('select-lunch-post'),
      name: 'Select Lunch Post',
      alwaysOutputData: true,
    },
    {
      parameters: { jsCode: buildTeamsPayloadCode },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [608, -64],
      id: uuid('build-teams-payload'),
      name: 'Build Teams Payload',
      alwaysOutputData: true,
    },
    {
      parameters: {
        method: 'POST',
        url: TEAMS_WEBHOOK,
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        bodyParameters: { parameters: [{}] },
        jsonBody:
          "={{ ({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: { type: 'AdaptiveCard', body: Array.isArray($json.cardBody) ? $json.cardBody : [], actions: Array.isArray($json.cardActions) ? $json.cardActions : [], '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json', version: '1.4' } }] }) }}",
        options: {},
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [864, -64],
      id: uuid('teams-webhook'),
      name: 'Lunch Teams Webhook',
      alwaysOutputData: false,
    },
  ],
  connections: {
    'Lunch Schedule': {
      main: [[{ node: 'Weekday Baseline', type: 'main', index: 0 }]],
    },
    'Weekday Baseline': {
      main: [[{ node: 'Holiday DB Fallback', type: 'main', index: 0 }]],
    },
    'Holiday DB Fallback': {
      main: [[{ node: 'Determine Holiday', type: 'main', index: 0 }]],
    },
    'Determine Holiday': {
      main: [[{ node: 'Not Holiday', type: 'main', index: 0 }]],
    },
    'Not Holiday': {
      main: [[{ node: 'Fetch Kakao Lunch Posts', type: 'main', index: 0 }], []],
    },
    'Fetch Kakao Lunch Posts': {
      main: [[{ node: 'Select Lunch Post', type: 'main', index: 0 }]],
    },
    'Select Lunch Post': {
      main: [[{ node: 'Build Teams Payload', type: 'main', index: 0 }]],
    },
    'Build Teams Payload': {
      main: [[{ node: 'Lunch Teams Webhook', type: 'main', index: 0 }]],
    },
  },
  settings: {
    executionOrder: 'v1',
  },
};

fs.mkdirSync(workflowDir, { recursive: true });
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(workflowPath);
