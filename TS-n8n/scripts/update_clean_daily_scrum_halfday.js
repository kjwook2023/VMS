const fs = require('fs');
const path = require('path');

const targetPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'workflows', 'Clean-Daily-Scrum', 'Clean-Daily-Scrum_api.json');

const SCHEDULE_NODE_ID = '3c6f643d-0e07-4a6d-855b-c0d36c544f77';
const SLACK_CODE_NODE_ID = 'cbffff30-7fac-4c59-a73b-90a4e3fd564c';
const TEAM_CODE_NODE_ID = '9d30c624-6163-40a5-85ee-8b9fc5d44091';
const TEAM_WEBHOOK_NODE_ID = 'e8614695-a8e0-4471-9fb3-5dd4032aef0b';
const TODAY_FILTER_NODE_ID = '3a95a1ae-43bd-4a09-8dc4-7a3fb49712d3';
const REDACTED_TEAMS_WEBHOOK = 'https://redacted.invalid/powerautomate/daily-scrum-webhook';
const DAILY_SCRUM_TEAMS_WEBHOOK = process.env.TS_DAILY_SCRUM_TEAMS_WEBHOOK || REDACTED_TEAMS_WEBHOOK;

function lines(...items) {
  return items.join('\n');
}

function getNode(workflow, nodeId) {
  const node = Array.isArray(workflow.nodes) ? workflow.nodes.find((item) => item && item.id === nodeId) : null;
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  return node;
}

function findNode(workflow, nodeId) {
  return Array.isArray(workflow.nodes) ? workflow.nodes.find((item) => item && item.id === nodeId) : null;
}

function mainConnection(targetName) {
  return [[{ node: targetName, type: 'main', index: 0 }]];
}

const sharedLogicLines = [
  "const items = $input.all();",
  '',
  'const allUsers = [',
  '  { name: "\\uC870\\uD604\\uC7AC", slackId: "U07K2APTEVD", email: "jyi30@vms-solutions.com" },',
  '  { name: "\\uAE40\\uBBFC\\uC601", slackId: "U07EEDTJZQE", email: "mykim@vms-solutions.com" }',
  '];',
  '',
  'const adminUser = {',
  '  name: "\\uAE40\\uC9C4\\uC6B1",',
  '  slackId: "U05DQA2L7JT",',
  '  email: "jwkim@vms-solutions.com"',
  '};',
  '',
  "const baseline = $('Weekday Baseline').first()?.json ?? {};",
  "const today = String(baseline.todayDate || '');",
  'const now = new Date();',
  "const dateString = new Intl.DateTimeFormat('ko-KR', {",
  "  timeZone: 'Asia/Seoul',",
  "  year: 'numeric',",
  "  month: 'long',",
  "  day: 'numeric',",
  '}).format(now);',
  '',
  "const timeParts = new Intl.DateTimeFormat('en-GB', {",
  "  timeZone: 'Asia/Seoul',",
  "  hour: '2-digit',",
  "  minute: '2-digit',",
  '  hour12: false,',
  '}).formatToParts(now);',
  "const hour = Number(timeParts.find((part) => part.type === 'hour')?.value || '-1');",
  "const minute = Number(timeParts.find((part) => part.type === 'minute')?.value || '-1');",
  'const currentMinutes = (hour * 60) + minute;',
  'const morningMinutes = (11 * 60) + 30;',
  'const afternoonMinutes = (16 * 60) + 30;',
  'const isMorningSlot = currentMinutes === morningMinutes;',
  'const isAfternoonSlot = currentMinutes === afternoonMinutes;',
  '',
  "const fullAbsenceKeywords = ['\\uD734\\uAC00', '\\uC5F0\\uCC28', '\\uC548\\uC2DD\\uC6D4', '\\uACF5\\uAC00', '\\uACF5\\uD734\\uC77C', '\\uD734\\uC77C'];",
  "const afternoonHalfKeywords = ['\\uC624\\uD6C4\\uBC18\\uCC28', '\\uC624\\uD6C4 \\uBC18\\uCC28'];",
  '',
  'function normalize(value) {',
  "  return String(value || '').normalize('NFC').replace(/\\s+/g, '').toLowerCase();",
  '}',
  '',
  'function includesAny(value, keywords) {',
  '  const target = normalize(value);',
  '  return keywords.some((keyword) => target.includes(normalize(keyword)));',
  '}',
  '',
  'const absentSlackIds = [];',
  'const absentNamesList = [];',
  'const afternoonHalfUsers = [];',
  '',
  'for (const item of items) {',
  '  const data = item?.json ?? {};',
  "  const itemName = String(data.name || '');",
  "  const startDate = String(data.property_date?.start || '');",
  "  const endDate = String(data.property_date?.end || startDate || '');",
  '',
  '  if (!itemName || !startDate || !today || today < startDate || today > endDate) {',
  '    continue;',
  '  }',
  '',
  '  const hasFullAbsenceKeyword = includesAny(itemName, fullAbsenceKeywords);',
  '  const hasAfternoonHalfKeyword = includesAny(itemName, afternoonHalfKeywords);',
  '',
  '  if (!hasFullAbsenceKeyword && !hasAfternoonHalfKeyword) {',
  '    continue;',
  '  }',
  '',
  '  for (const user of allUsers) {',
  '    if (!itemName.includes(user.name)) {',
  '      continue;',
  '    }',
  '',
  '    if (hasFullAbsenceKeyword && !absentSlackIds.includes(user.slackId)) {',
  '      absentSlackIds.push(user.slackId);',
  '      absentNamesList.push(user.name);',
  '    }',
  '',
  '    if (hasAfternoonHalfKeyword && !afternoonHalfUsers.some((entry) => entry.slackId === user.slackId)) {',
  '      afternoonHalfUsers.push(user);',
  '    }',
  '  }',
  '}',
  '',
  'const hasAfternoonHalfDayTarget = afternoonHalfUsers.length > 0;',
  'const shouldSendNow = hasAfternoonHalfDayTarget ? isMorningSlot : isAfternoonSlot;',
  '',
  'if (!shouldSendNow) {',
  '  return [];',
  '}',
  '',
  'const activeUsers = allUsers.filter((user) => !absentSlackIds.includes(user.slackId));',
  'const notifyAdminOnly = activeUsers.length === 0;',
  'const targetUsers = notifyAdminOnly ? [adminUser] : activeUsers;',
  "const absentNamesText = absentNamesList.length > 0 ? absentNamesList.join(', ') : '\\uC5C6\\uC74C';",
  "const afternoonHalfNamesText = afternoonHalfUsers.length > 0 ? afternoonHalfUsers.map((user) => user.name).join(', ') : '\\uC5C6\\uC74C';",
  "const scheduleReasonText = hasAfternoonHalfDayTarget ? `\\uC624\\uD6C4 \\uBC18\\uCC28 \\uC778\\uC6D0(${afternoonHalfNamesText})\\uC774 \\uC788\\uC5B4 \\uC624\\uB298\\uC740 11:30\\uC5D0 \\uC548\\uB0B4\\uD569\\uB2C8\\uB2E4.` : '\\uC77C\\uBC18 \\uC2A4\\uCF00\\uC904(16:30)\\uC5D0 \\uB9DE\\uCDB0 \\uC548\\uB0B4\\uD569\\uB2C8\\uB2E4.';",
  "const triggerSlotText = hasAfternoonHalfDayTarget ? '11:30' : '16:30';"
];

const slackCode = lines(
  ...sharedLogicLines,
  '',
  "const mentions = targetUsers.map((user) => `<@${user.slackId}>`).join(', ');",
  '',
  'const message = notifyAdminOnly',
  "  ? `\\uD83D\\uDCE2 ${mentions} \\uB2D8!\\n\\n[${dateString}] \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5B4 \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.\\n\\n\\uBD80\\uC7AC \\uC778\\uC6D0: ${absentNamesText}\\n\\uD655\\uC778 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.`",
  "  : `\\uD83D\\uDCE2 ${mentions} \\uB2D8! \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.\\n\\n*${dateString}* \\uC624\\uB298 \\uC5C5\\uBB34 \\uC815\\uB9AC\\uB97C \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.\\n\\n- \\uC548\\uB0B4 \\uC2DC\\uAC04: ${triggerSlotText}\\n- \\uC548\\uB0B4 \\uC0AC\\uC720: ${scheduleReasonText}\\n\\n1. \\uC624\\uB298 \\uC9C4\\uD589\\uD55C \\uC5C5\\uBB34\\uB97C \\uC815\\uB9AC\\uD574 \\uC8FC\\uC138\\uC694.\\n\\n2. \\uC624\\uB298 *Blocker \\uACF5\\uC720*\\n  a. *Blocker:* (\\uBB38\\uC81C\\uAC00 \\uB41C \\uB0B4\\uC6A9)\\n  b. *Need:* (\\uB3C4\\uC6C0\\uC774 \\uD544\\uC694\\uD55C \\uB0B4\\uC6A9)\\n  c. *By:* (\\uC9C0\\uC6D0\\uC774 \\uD544\\uC694\\uD55C \\uB300\\uC0C1)\\n  d. *\\uCC38\\uACE0:* \\uD574\\uACB0 \\uB610\\uB294 \\uD655\\uC778 \\uC608\\uC815 \\uC0AC\\uD56D\\n\\n*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentNamesList.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}\\n\\n\\uC624\\uB298 \\uB9C8\\uBB34\\uB9AC \\uC798 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4! \\uD83D\\uDE80`;",
  '',
  'return [{',
  '  json: {',
  '    text: message,',
  '    date: dateString,',
  '    absent_count: absentSlackIds.length,',
  '    absentNames: absentNamesText,',
  '    notify_admin_only: notifyAdminOnly,',
  '    has_afternoon_halfday_target: hasAfternoonHalfDayTarget,',
  '    afternoon_halfday_names: afternoonHalfNamesText,',
  '    trigger_slot: triggerSlotText,',
  '  }',
  '}];'
);

const teamCode = lines(
  ...sharedLogicLines,
  '',
  "const slackMentions = targetUsers.map((user) => `<@${user.slackId}>`).join(', ');",
  "const teamsText = targetUsers.map((user) => `<at>${user.name}</at>`).join(', ');",
  'const teamsEntities = targetUsers.map((user) => ({',
  "  type: 'mention',",
  "  text: `<at>${user.name}</at>`,",
  '  mentioned: { id: user.email, name: user.name },',
  '}));',
  '',
  'const slackMessage = notifyAdminOnly',
  "  ? `\\uD83D\\uDCE2 ${slackMentions} \\uB2D8!\\n\\n[${dateString}] \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5B4 \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.\\n\\n\\uBD80\\uC7AC \\uC778\\uC6D0: ${absentNamesText}\\n\\uD655\\uC778 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.`",
  "  : `\\uD83D\\uDCE2 ${slackMentions} \\uB2D8! \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.\\n\\n*${dateString}* \\uC624\\uB298 \\uC5C5\\uBB34 \\uC815\\uB9AC\\uB97C \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.\\n\\n- \\uC548\\uB0B4 \\uC2DC\\uAC04: ${triggerSlotText}\\n- \\uC548\\uB0B4 \\uC0AC\\uC720: ${scheduleReasonText}\\n\\n1. \\uC624\\uB298 \\uC9C4\\uD589\\uD55C \\uC5C5\\uBB34\\uB97C \\uC815\\uB9AC\\uD574 \\uC8FC\\uC138\\uC694.\\n\\n2. \\uC624\\uB298 *Blocker \\uACF5\\uC720*\\n  a. *Blocker:* (\\uBB38\\uC81C\\uAC00 \\uB41C \\uB0B4\\uC6A9)\\n  b. *Need:* (\\uB3C4\\uC6C0\\uC774 \\uD544\\uC694\\uD55C \\uB0B4\\uC6A9)\\n  c. *By:* (\\uC9C0\\uC6D0\\uC774 \\uD544\\uC694\\uD55C \\uB300\\uC0C1)\\n  d. *\\uCC38\\uACE0:* \\uD574\\uACB0 \\uB610\\uB294 \\uD655\\uC778 \\uC608\\uC815 \\uC0AC\\uD56D\\n\\n*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentNamesList.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}\\n\\n\\uC624\\uB298 \\uB9C8\\uBB34\\uB9AC \\uC798 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4! \\uD83D\\uDE80`;",
  '',
  'const titleText = notifyAdminOnly',
  "  ? `\\uD83D\\uDCE2 ${teamsText} \\uB2D8! \\uC624\\uB298 \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.`",
  "  : `\\uD83D\\uDCE2 ${teamsText} \\uB2D8! \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.`;",
  '',
  'const subtitleText = notifyAdminOnly',
  "  ? `**[${dateString}]** \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5C8\\uC2B5\\uB2C8\\uB2E4.`",
  "  : `**[${dateString}]** ${scheduleReasonText}`;",
  '',
  'const bodyText = notifyAdminOnly',
  "  ? '\\uBD80\\uC7AC \\uC778\\uC6D0\\uC744 \\uD655\\uC778\\uD574 \\uC8FC\\uC138\\uC694.'",
  "  : '1. \\uC624\\uB298 \\uC9C4\\uD589\\uD55C \\uC5C5\\uBB34\\uB97C \\uC815\\uB9AC\\uD574 \\uC8FC\\uC138\\uC694.\\n\\n2. \\uC624\\uB298 **Blocker \\uACF5\\uC720**\\n- Blocker: (\\uBB38\\uC81C\\uAC00 \\uB41C \\uB0B4\\uC6A9)\\n- Need: (\\uB3C4\\uC6C0\\uC774 \\uD544\\uC694\\uD55C \\uB0B4\\uC6A9)\\n- By: (\\uC9C0\\uC6D0\\uC774 \\uD544\\uC694\\uD55C \\uB300\\uC0C1)\\n- \\uCC38\\uACE0: \\uD574\\uACB0 \\uB610\\uB294 \\uD655\\uC778 \\uC608\\uC815 \\uC0AC\\uD56D';",
  '',
  "const absenceText = `*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentNamesList.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}`;",
  "const footerText = notifyAdminOnly ? '\\uAD00\\uB9AC\\uC790 \\uD655\\uC778 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.' : '\\uC624\\uB298 \\uB9C8\\uBB34\\uB9AC \\uC798 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4! \\uD83D\\uDE80';",
  '',
  'return [{',
  '  json: {',
  '    text: slackMessage,',
  '    teamsText,',
  '    teamsEntities,',
  '    absentNames: absentNamesText,',
  '    absent_count: absentSlackIds.length,',
  '    date: dateString,',
  '    notify_admin_only: notifyAdminOnly,',
  '    titleText,',
  '    subtitleText,',
  '    bodyText,',
  '    absenceText,',
  '    footerText,',
  '    has_afternoon_halfday_target: hasAfternoonHalfDayTarget,',
  '    afternoon_halfday_names: afternoonHalfNamesText,',
  '    trigger_slot: triggerSlotText,',
  '  }',
  '}];'
);

const filterTodayVacationRowsCode = lines(
  "const baseline = $('Weekday Baseline').first()?.json ?? {};",
  "const today = String(baseline.todayDate || '');",
  '',
  'if (!today) {',
  '  return [];',
  '}',
  '',
  'const matches = $input.all()',
  '  .filter((item) => {',
  '    const data = item?.json ?? {};',
  "    const startDate = String(data.property_date?.start || '');",
  "    const endDate = String(data.property_date?.end || startDate || '');",
  '    return Boolean(startDate) && today >= startDate && today <= endDate;',
  '  })',
  '  .map((item, index) => ({',
  '    json: item.json,',
  '    pairedItem: item.pairedItem ?? { item: index },',
  '  }));',
  '',
  'if (matches.length > 0) {',
  '  return matches;',
  '}',
  '',
  'return [{',
  '  json: {',
  '    today_vacation_filter_applied: true,',
  '    today_vacation_match_count: 0,',
  '    today_date: today,',
  '  },',
  '  pairedItem: { item: 0 },',
  '}];'
);

const workflow = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

getNode(workflow, SCHEDULE_NODE_ID).parameters.rule.interval = [
  {
    field: 'weeks',
    triggerAtDay: [1, 2, 3, 4, 5],
    triggerAtHour: 11,
    triggerAtMinute: 30,
  },
  {
    field: 'weeks',
    triggerAtDay: [1, 2, 3, 4, 5],
    triggerAtHour: 16,
    triggerAtMinute: 30,
  },
];

getNode(workflow, SLACK_CODE_NODE_ID).parameters.jsCode = slackCode;
getNode(workflow, SLACK_CODE_NODE_ID).alwaysOutputData = false;
getNode(workflow, TEAM_CODE_NODE_ID).parameters.jsCode = teamCode;
getNode(workflow, TEAM_CODE_NODE_ID).alwaysOutputData = false;
getNode(workflow, TEAM_WEBHOOK_NODE_ID).parameters.url = DAILY_SCRUM_TEAMS_WEBHOOK;

let todayFilterNode = findNode(workflow, TODAY_FILTER_NODE_ID);
if (!todayFilterNode) {
  todayFilterNode = {
    parameters: { jsCode: filterTodayVacationRowsCode },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [512, -112],
    id: TODAY_FILTER_NODE_ID,
    name: 'Filter Today Vacation Rows',
    alwaysOutputData: false,
  };
  workflow.nodes.push(todayFilterNode);
} else {
  todayFilterNode.parameters.jsCode = filterTodayVacationRowsCode;
  todayFilterNode.type = 'n8n-nodes-base.code';
  todayFilterNode.typeVersion = 2;
  todayFilterNode.position = [512, -112];
  todayFilterNode.name = 'Filter Today Vacation Rows';
  todayFilterNode.alwaysOutputData = false;
}

workflow.connections['Get many database pages'] = { main: mainConnection('Filter Today Vacation Rows') };
workflow.connections['Filter Today Vacation Rows'] = { main: mainConnection(getNode(workflow, TEAM_CODE_NODE_ID).name) };

fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 4));
console.log(`Updated ${targetPath}`);
