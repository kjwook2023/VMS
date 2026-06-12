const fs = require('fs');
const path = require('path');

function loadWorkflow(relPath) {
  const filePath = path.join(__dirname, '..', relPath);
  return {
    filePath,
    workflow: JSON.parse(fs.readFileSync(filePath, 'utf8')),
  };
}

function saveWorkflow(filePath, workflow) {
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 4));
}

function getNode(workflow, id) {
  const node = workflow.nodes.find((item) => item.id === id);
  if (!node) throw new Error(`Node not found: ${id}`);
  return node;
}

function renameNode(workflow, id, newName) {
  const node = getNode(workflow, id);
  const oldName = node.name;
  if (oldName === newName) return;
  node.name = newName;

  if (workflow.connections[oldName]) {
    workflow.connections[newName] = workflow.connections[oldName];
    delete workflow.connections[oldName];
  }

  for (const conn of Object.values(workflow.connections)) {
    if (!conn || !Array.isArray(conn.main)) continue;
    for (const branch of conn.main) {
      if (!Array.isArray(branch)) continue;
      for (const item of branch) {
        if (item.node === oldName) item.node = newName;
      }
    }
  }
}

function lines(parts) {
  return parts.join('\n');
}

const cleanLegacySlackCode = lines([
  "const items = $input.all();",
  "",
  "const allUsers = [",
  "  { name: \"\\uC870\\uD604\\uC7AC\", slackId: \"U07K2APTEVD\" },",
  "  { name: \"\\uAE40\\uBBFC\\uC601\", slackId: \"U07EEDTJZQE\" }",
  "];",
  "",
  "const adminUser = { name: \"\\uAE40\\uC9C4\\uC6B1\", slackId: \"U05DQA2L7JT\" };",
  "const today = new Date().toISOString().split('T')[0];",
  "const dateString = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });",
  "",
  "const absentSlackIds = [];",
  "const absentNamesList = [];",
  "",
  "for (const item of items) {",
  "  const data = item.json;",
  "  const itemName = data.name || '';",
  "  const startDate = data.property_date?.start;",
  "  const endDate = data.property_date?.end || startDate;",
  "  const keywords = [\"\\uD734\\uAC00\", \"\\uC5F0\\uCC28\", \"\\uC548\\uC2DD\\uC6D4\", \"\\uACF5\\uAC00\"];",
  "  const hasKeyword = keywords.some((kw) => itemName.includes(kw));",
  "",
  "  if (hasKeyword && startDate && today >= startDate && today <= endDate) {",
  "    for (const user of allUsers) {",
  "      if (itemName.includes(user.name) && !absentSlackIds.includes(user.slackId)) {",
  "        absentSlackIds.push(user.slackId);",
  "        absentNamesList.push(user.name);",
  "      }",
  "    }",
  "  }",
  "}",
  "",
  "const activeUsers = allUsers.filter((user) => !absentSlackIds.includes(user.slackId));",
  "const notifyAdminOnly = activeUsers.length === 0;",
  "const targetUsers = notifyAdminOnly ? [adminUser] : activeUsers;",
  "const mentions = targetUsers.map((user) => `<@${user.slackId}>`).join(', ');",
  "const absentNamesText = absentNamesList.length > 0 ? absentNamesList.join(', ') : '\\uC5C6\\uC74C';",
  "",
  "const message = notifyAdminOnly",
  "  ? `\\uD83D\\uDCE2 ${mentions} \\uB2D8!\\n\\n[${dateString}] \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5B4 \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.\\n\\n\\uBD80\\uC7AC \\uC778\\uC6D0: ${absentNamesText}\\n\\uD655\\uC778 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.`",
  "  : `\\uD83D\\uDCE2 ${mentions} \\uB2D8! \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.\\n\\n*${dateString}* \\uC624\\uB298 \\uC5C5\\uBB34 \\uC815\\uB9AC\\uB97C \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.\\n\\n1. \\uC624\\uB298 \\uC9C4\\uD589\\uD55C \\uC5C5\\uBB34\\uB97C \\uC815\\uB9AC\\uD574 \\uC8FC\\uC138\\uC694.\\n\\n2. \\uC624\\uB298 *Blocker \\uACF5\\uC720*\\n  a. *Blocker:* (\\uBB38\\uC81C\\uAC00 \\uB41C \\uB0B4\\uC6A9)\\n  b. *Need:* (\\uB3C4\\uC6C0\\uC774 \\uD544\\uC694\\uD55C \\uB0B4\\uC6A9)\\n  c. *By:* (\\uC9C0\\uC6D0\\uC774 \\uD544\\uC694\\uD55C \\uB300\\uC0C1)\\n  d. *\\uCC38\\uACE0:* \\uD574\\uACB0 \\uB610\\uB294 \\uD655\\uC778 \\uC608\\uC815 \\uC0AC\\uD56D\\n\\n*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentSlackIds.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}\\n\\n\\uC624\\uB298 \\uB9C8\\uBB34\\uB9AC \\uC798 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4! \\uD83D\\uDE80`;",
  "",
  "return [{",
  "  json: {",
  "    text: message,",
  "    date: dateString,",
  "    absent_count: absentSlackIds.length,",
  "    absentNames: absentNamesText,",
  "    notify_admin_only: notifyAdminOnly",
  "  }",
  "}];",
]);

const cleanTeamsCode = lines([
  "const items = $input.all();",
  "",
  "const allUsers = [",
  "  { name: \"\\uC870\\uD604\\uC7AC\", slackId: \"U07K2APTEVD\", email: \"jyi30@vms-solutions.com\" },",
  "  { name: \"\\uAE40\\uBBFC\\uC601\", slackId: \"U07EEDTJZQE\", email: \"mykim@vms-solutions.com\" }",
  "];",
  "",
  "const adminUser = {",
  "  name: \"\\uAE40\\uC9C4\\uC6B1\",",
  "  slackId: \"U05DQA2L7JT\",",
  "  email: \"jwkim@vms-solutions.com\"",
  "};",
  "",
  "const today = new Date().toISOString().split('T')[0];",
  "const dateString = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });",
  "",
  "const absentSlackIds = [];",
  "const absentNamesList = [];",
  "",
  "for (const item of items) {",
  "  const data = item.json;",
  "  const itemName = data.name || '';",
  "  const startDate = data.property_date?.start;",
  "  const endDate = data.property_date?.end || startDate;",
  "  const keywords = [",
  "    \"\\uD734\\uAC00\",",
  "    \"\\uC5F0\\uCC28\",",
  "    \"\\uC548\\uC2DD\\uC6D4\",",
  "    \"\\uACF5\\uAC00\",",
  "    \"\\uACF5\\uD734\\uC77C\",",
  "    \"\\uD734\\uC77C\"",
  "  ];",
  "  const hasKeyword = keywords.some((kw) => itemName.includes(kw));",
  "",
  "  if (hasKeyword && startDate && today >= startDate && today <= endDate) {",
  "    for (const user of allUsers) {",
  "      if (itemName.includes(user.name) && !absentSlackIds.includes(user.slackId)) {",
  "        absentSlackIds.push(user.slackId);",
  "        absentNamesList.push(user.name);",
  "      }",
  "    }",
  "  }",
  "}",
  "",
  "const activeUsers = allUsers.filter((user) => !absentSlackIds.includes(user.slackId));",
  "const notifyAdminOnly = activeUsers.length === 0;",
  "const targetUsers = notifyAdminOnly ? [adminUser] : activeUsers;",
  "const absentNamesText = absentNamesList.length > 0 ? absentNamesList.join(', ') : '\\uC5C6\\uC74C';",
  "",
  "const slackMentions = targetUsers.map((user) => `<@${user.slackId}>`).join(', ');",
  "const teamsText = targetUsers.map((user) => `<at>${user.name}</at>`).join(', ');",
  "const teamsEntities = targetUsers.map((user) => ({",
  "  type: 'mention',",
  "  text: `<at>${user.name}</at>`,",
  "  mentioned: { id: user.email, name: user.name }",
  "}));",
  "",
  "const slackMessage = notifyAdminOnly",
  "  ? `\\uD83D\\uDCE2 ${slackMentions} \\uB2D8!\\n\\n[${dateString}] \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5B4 \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.\\n\\n\\uBD80\\uC7AC \\uC778\\uC6D0: ${absentNamesText}\\n\\uD655\\uC778 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.`",
  "  : `\\uD83D\\uDCE2 ${slackMentions} \\uB2D8! \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.\\n\\n*${dateString}* \\uC624\\uB298 \\uC5C5\\uBB34 \\uC815\\uB9AC\\uB97C \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.\\n\\n1. \\uC624\\uB298 \\uC9C4\\uD589\\uD55C \\uC5C5\\uBB34\\uB97C \\uC815\\uB9AC\\uD574 \\uC8FC\\uC138\\uC694.\\n\\n2. \\uC624\\uB298 *Blocker \\uACF5\\uC720*\\n  a. *Blocker:* (\\uBB38\\uC81C\\uAC00 \\uB41C \\uB0B4\\uC6A9)\\n  b. *Need:* (\\uB3C4\\uC6C0\\uC774 \\uD544\\uC694\\uD55C \\uB0B4\\uC6A9)\\n  c. *By:* (\\uC9C0\\uC6D0\\uC774 \\uD544\\uC694\\uD55C \\uB300\\uC0C1)\\n  d. *\\uCC38\\uACE0:* \\uD574\\uACB0 \\uB610\\uB294 \\uD655\\uC778 \\uC608\\uC815 \\uC0AC\\uD56D\\n\\n*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentNamesList.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}\\n\\n\\uC624\\uB298 \\uB9C8\\uBB34\\uB9AC \\uC798 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4! \\uD83D\\uDE80`;",
  "",
  "const titleText = notifyAdminOnly",
  "  ? `\\uD83D\\uDCE2 ${teamsText} \\uB2D8! \\uC624\\uB298 \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.`",
  "  : `\\uD83D\\uDCE2 ${teamsText} \\uB2D8! \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.`;",
  "",
  "const subtitleText = notifyAdminOnly",
  "  ? `**[${dateString}]** \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5C8\\uC2B5\\uB2C8\\uB2E4.`",
  "  : `**[${dateString}]** \\uC5C5\\uBB34\\uAD00\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uC791\\uC131 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.`;",
  "",
  "const bodyText = notifyAdminOnly",
  "  ? '\\uBD80\\uC7AC \\uC778\\uC6D0\\uC744 \\uD655\\uC778\\uD574 \\uC8FC\\uC138\\uC694.'",
  "  : '1. \\uC624\\uB298 \\uC9C4\\uD589\\uD55C \\uC5C5\\uBB34\\uB97C \\uC815\\uB9AC\\uD574 \\uC8FC\\uC138\\uC694.\\n\\n2. \\uC624\\uB298 **Blocker \\uACF5\\uC720**\\n- Blocker: (\\uBB38\\uC81C\\uAC00 \\uB41C \\uB0B4\\uC6A9)\\n- Need: (\\uB3C4\\uC6C0\\uC774 \\uD544\\uC694\\uD55C \\uB0B4\\uC6A9)\\n- By: (\\uC9C0\\uC6D0\\uC774 \\uD544\\uC694\\uD55C \\uB300\\uC0C1)\\n- \\uCC38\\uACE0: \\uD574\\uACB0 \\uB610\\uB294 \\uD655\\uC778 \\uC608\\uC815 \\uC0AC\\uD56D';",
  "",
  "const absenceText = `*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentNamesList.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}`;",
  "",
  "const footerText = notifyAdminOnly",
  "  ? '\\uAD00\\uB9AC\\uC790 \\uD655\\uC778 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4.'",
  "  : '\\uC624\\uB298 \\uB9C8\\uBB34\\uB9AC \\uC798 \\uBD80\\uD0C1\\uB4DC\\uB9BD\\uB2C8\\uB2E4! \\uD83D\\uDE80';",
  "",
  "return [{",
  "  json: {",
  "    text: slackMessage,",
  "    teamsText,",
  "    teamsEntities,",
  "    absentNames: absentNamesText,",
  "    absent_count: absentSlackIds.length,",
  "    date: dateString,",
  "    notify_admin_only: notifyAdminOnly,",
  "    titleText,",
  "    subtitleText,",
  "    bodyText,",
  "    absenceText,",
  "    footerText",
  "  }",
  "}];",
]);

const standardTeamsBody = lines([
  "={{ ({",
  "  type: 'message',",
  "  attachments: [",
  "    {",
  "      contentType: 'application/vnd.microsoft.card.adaptive',",
  "      content: {",
  "        type: 'AdaptiveCard',",
  "        body: [",
  "          {",
  "            type: 'TextBlock',",
  "            text: $json.titleText,",
  "            weight: 'Bolder',",
  "            size: 'Medium',",
  "            wrap: true,",
  "          },",
  "          {",
  "            type: 'TextBlock',",
  "            text: $json.subtitleText,",
  "            wrap: true,",
  "            spacing: 'None',",
  "          },",
  "          {",
  "            type: 'TextBlock',",
  "            text: $json.bodyText,",
  "            wrap: true,",
  "            spacing: 'Medium',",
  "          },",
  "          {",
  "            type: 'TextBlock',",
  "            text: $json.absenceText || '',",
  "            wrap: true,",
  "            color: $json.absent_count > 0 ? 'Attention' : 'Default',",
  "            spacing: 'Small',",
  "            isVisible: Boolean($json.absenceText),",
  "          },",
  "          {",
  "            type: 'TextBlock',",
  "            text: $json.footerText || '',",
  "            wrap: true,",
  "            spacing: 'Small',",
  "            isVisible: Boolean($json.footerText),",
  "          },",
  "        ],",
  "        msteams: {",
  "          entities: Array.isArray($json.teamsEntities) ? $json.teamsEntities : [],",
  "        },",
  "        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',",
  "        version: '1.0',",
  "      },",
  "    },",
  "  ],",
  "}) }}",
]);

const privateLeaderCode = lines([
  "const items = $input.all();",
  "if (items.length === 0) return [];",
  "",
  "const todayData = items[0].json;",
  "if (todayData.is_holiday === true) return [];",
  "",
  "const leaderName = \"\\uAE40\\uC9C4\\uC6B1\";",
  "const leaderEmail = \"jwkim@vms-solutions.com\";",
  "const leaderSlackId = \"U05DQA2L7JT\";",
  "const dateString = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });",
  "",
  "const slackMessage = `\\uD83D\\uDCE2 *[${dateString}] \\uB370\\uC77C\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uCCB4\\uD06C \\uC54C\\uB9BC*\\n\\n<@${leaderSlackId}> \\uB2D8, \\uC5B4\\uC81C\\uC758 \\uB370\\uC77C\\uB9AC \\uC2A4\\uD06C\\uB7FC\\uC744 \\uD655\\uC778\\uD574\\uC8FC\\uC138\\uC694! \\uD83D\\uDE80\\n(\\uD2B9\\uD788 Blocker\\uB97C \\uCC59\\uACA8\\uC8FC\\uC138\\uC694.)`;",
  "const teamsText = `<at>${leaderName}</at>`;",
  "const teamsEntities = [{",
  "  type: 'mention',",
  "  text: `<at>${leaderName}</at>`,",
  "  mentioned: { id: leaderEmail, name: leaderName }",
  "}];",
  "",
  "return [{",
  "  json: {",
  "    text: slackMessage,",
  "    teamsText,",
  "    teamsEntities,",
  "    date: dateString,",
  "    titleText: `\\uD83D\\uDCE2 ${teamsText} \\uB2D8! \\uD655\\uC778 \\uC54C\\uB9BC`,",
  "    subtitleText: `**[${dateString}]** \\uC5B4\\uC81C \\uB370\\uC77C\\uB9AC \\uC2A4\\uD06C\\uB7FC\\uC744 \\uD655\\uC778\\uD574\\uC8FC\\uC138\\uC694! \\uD83D\\uDE80`,",
  "    bodyText: '\\uD2B9\\uD788 **Blocker**\\uB97C \\uC911\\uC810\\uC801\\uC73C\\uB85C \\uCC59\\uACA8\\uC8FC\\uC2DC\\uAE30 \\uBC14\\uB78D\\uB2C8\\uB2E4.',",
  "    footerText: '\\uD655\\uC778 \\uD6C4 \\uD544\\uC694 \\uC2DC \\uD6C4\\uC18D \\uC870\\uCE58\\uB97C \\uC9C4\\uD589\\uD574 \\uC8FC\\uC138\\uC694.'",
  "  }",
  "}];",
]);

const privateTeamCode = lines([
  "const items = $input.all();",
  "",
  "const allUsers = [",
  "  { name: \"\\uC870\\uD604\\uC7AC\", slackId: \"U07K2APTEVD\", email: \"jyi30@vms-solutions.com\" },",
  "  { name: \"\\uAE40\\uBBFC\\uC601\", slackId: \"U07EEDTJZQE\", email: \"mykim@vms-solutions.com\" }",
  "];",
  "",
  "const adminUser = {",
  "  name: \"\\uAE40\\uC9C4\\uC6B1\",",
  "  slackId: \"U05DQA2L7JT\",",
  "  email: \"jwkim@vms-solutions.com\"",
  "};",
  "",
  "const today = new Date().toISOString().split('T')[0];",
  "const dateString = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });",
  "const workLink = \"https://www.notion.so/vmssolutions/Sprint-2decb995830980e7910cd3495f371466\";",
  "",
  "const absentSlackIds = [];",
  "const absentNamesList = [];",
  "",
  "for (const item of items) {",
  "  const data = item.json;",
  "  const itemName = data.name || '';",
  "  const startDate = data.property_date?.start;",
  "  const endDate = data.property_date?.end || startDate;",
  "  const keywords = [\"\\uD734\\uAC00\", \"\\uC5F0\\uCC28\", \"\\uC548\\uC2DD\\uC6D4\", \"\\uACF5\\uAC00\"];",
  "  const hasKeyword = keywords.some((kw) => itemName.includes(kw));",
  "",
  "  if (hasKeyword && startDate && today >= startDate && today <= endDate) {",
  "    for (const user of allUsers) {",
  "      if (itemName.includes(user.name) && !absentSlackIds.includes(user.slackId)) {",
  "        absentSlackIds.push(user.slackId);",
  "        absentNamesList.push(user.name);",
  "      }",
  "    }",
  "  }",
  "}",
  "",
  "const activeUsers = allUsers.filter((user) => !absentSlackIds.includes(user.slackId));",
  "const notifyAdminOnly = activeUsers.length === 0;",
  "const targetUsers = notifyAdminOnly ? [adminUser] : activeUsers;",
  "const absentNamesText = absentNamesList.length > 0 ? absentNamesList.join(', ') : '\\uC5C6\\uC74C';",
  "",
  "const slackMentions = targetUsers.map((user) => `<@${user.slackId}>`).join(', ');",
  "const teamsText = targetUsers.map((user) => `<at>${user.name}</at>`).join(', ');",
  "const teamsEntities = targetUsers.map((user) => ({",
  "  type: 'mention',",
  "  text: `<at>${user.name}</at>`,",
  "  mentioned: { id: user.email, name: user.name }",
  "}));",
  "",
  "const slackMessage = notifyAdminOnly",
  "  ? `\\uD83D\\uDCE2 ${slackMentions} \\uB2D8! \\uC624\\uB298 \\uD655\\uC778 \\uC694\\uCCAD \\uB300\\uC0C1\\uC790\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4.\\n\\n[${dateString}] \\uAE30\\uC900 \\uC804\\uC6D0\\uC774 \\uD734\\uAC00 \\uB4F1\\uC73C\\uB85C \\uBD84\\uB958\\uB418\\uC5C8\\uC2B5\\uB2C8\\uB2E4.\\n\\uBD80\\uC7AC \\uC778\\uC6D0: ${absentNamesText}`",
  "  : `\\uD83D\\uDCE2 ${slackMentions} \\uB2D8! \\uB370\\uC77C\\uB9AC \\uC2A4\\uD06C\\uB7FC \\uD655\\uC778 \\uC2DC\\uAC04\\uC785\\uB2C8\\uB2E4.\\n\\n[${dateString}] - \\uAE30\\uC220\\uC9C0\\uC6D0 \\uB370\\uC77C\\uB9AC \\uC2A4\\uD06C\\uB7FC\\n\\n*\\uC624\\uB298 \\uD560 \\uC5C5\\uBB34*\\n1. <${workLink}|\\uC624\\uB298 \\uD560 \\uC5C5\\uBB34 \\uD655\\uC778\\uD558\\uAE30>\\n\\n*\\uC624\\uB298 \\uBD80\\uC7AC(\\uD734\\uAC00 \\uB4F1) \\uC778\\uC6D0:* ${absentNamesList.length > 0 ? `\\uC788\\uC74C (${absentNamesText})` : '\\uC5C6\\uC74C'}\\n\\n\\uC624\\uB298 \\uD558\\uB8E8\\uB3C4 \\uD798\\uB0C5\\uC2DC\\uB2E4! \\uD83D\\uDD25`;",
  "",
  "return [{",
  "  json: {",
  "    text: slackMessage,",
  "    teamsText,",
  "    teamsEntities,",
  "    absentNames: absentNamesText,",
  "    absent_count: absentSlackIds.length,",
  "    date: dateString,",
  "    rawDate: today,",
  "    notify_admin_only: notifyAdminOnly",
  "  }",
  "}];",
]);

function fixCleanDailyScrum() {
  const { filePath, workflow } = loadWorkflow(path.join('workflows', 'Clean-Daily-Scrum', 'Clean-Daily-Scrum_api.json'));

  getNode(workflow, 'cbffff30-7fac-4c59-a73b-90a4e3fd564c').parameters.jsCode = cleanLegacySlackCode;
  getNode(workflow, '9d30c624-6163-40a5-85ee-8b9fc5d44091').parameters.jsCode = cleanTeamsCode;

  const teamsNode = getNode(workflow, 'e8614695-a8e0-4471-9fb3-5dd4032aef0b');
  teamsNode.parameters.contentType = 'json';
  teamsNode.parameters.specifyBody = 'json';
  teamsNode.parameters.bodyParameters = { parameters: [{}] };
  teamsNode.parameters.jsonBody = standardTeamsBody;

  renameNode(workflow, 'cbffff30-7fac-4c59-a73b-90a4e3fd564c', 'Slack용 휴가체크');
  renameNode(workflow, '415dec70-d0cb-46eb-896d-f9ba00e9b6a2', '휴일체크');
  renameNode(workflow, '9d30c624-6163-40a5-85ee-8b9fc5d44091', 'Team용 휴가체크');
  renameNode(workflow, 'e8614695-a8e0-4471-9fb3-5dd4032aef0b', 'Teams 업무관리(스크럽)에 보내기');

  const notionNode = getNode(workflow, '4ae3912f-6bf2-4683-adba-6ebb6b9597d2');
  if (notionNode.parameters.databaseId && notionNode.parameters.databaseId.cachedResultName) {
    notionNode.parameters.databaseId.cachedResultName = '\uAE30\uC220\uC9C0\uC6D0\uCE98\uB9B0\uB354DB';
  }

  saveWorkflow(filePath, workflow);
}

function fixPrivateConfirmDailyScrum() {
  const { filePath, workflow } = loadWorkflow(path.join('workflows', 'Private-ConfirmDailyScrum', 'Private-ConfirmDailyScrum_api.json'));

  getNode(workflow, '8495c240-3ff6-4981-b286-fe76af1f61c7').parameters.jsCode = privateLeaderCode;
  getNode(workflow, '4ad77788-a76a-4608-bda8-7b2ea29d5a23').parameters.jsCode = lines([
    "const recurringHolidays = [",
    "  { date: '0501', dateName: '\\uADFC\\uB85C\\uC790\\uC758 \\uB0A0' },",
    "  { date: '1231', dateName: '\\uCC3D\\uB9BD\\uAE30\\uB150\\uC77C\\uB300\\uD734' }",
    "];",
    "",
    "const baseline = $('Weekday Baseline').first().json;",
    "const apiPayload = $('HTTP Request').first()?.json ?? {};",
    "const dbPayload = $('Holiday DB Fallback').first()?.json ?? {};",
    "",
    "function normalizeApiItems(raw) {",
    "  if (!raw) return [];",
    "  return Array.isArray(raw) ? raw : [raw];",
    "}",
    "",
    "const apiItems = !apiPayload.error",
    "  ? normalizeApiItems(apiPayload.response?.body?.items?.item)",
    "  : [];",
    "const apiMatch = apiItems.find((item) => String(item?.locdate ?? '') === String(baseline.todayInt));",
    "const customMatch = recurringHolidays.find((item) => item.date === baseline.todayMMDD);",
    "const dbFound = !dbPayload.error && [true, 1, '1', 'true'].includes(dbPayload.found_in_db);",
    "",
    "let isHoliday = !!baseline.DefaultIsHoliday;",
    "let holidayName = baseline.DefaultHolidayName || (isHoliday ? '\\uC8FC\\uB9D0' : '\\uD3C9\\uC77C');",
    "let holidayLookupSource = isHoliday ? 'default-weekend' : 'default-weekday';",
    "",
    "if (apiMatch) {",
    "  isHoliday = true;",
    "  holidayName = String(apiMatch.dateName || '\\uACF5\\uD734\\uC77C');",
    "  holidayLookupSource = 'api';",
    "} else if (customMatch) {",
    "  isHoliday = true;",
    "  holidayName = customMatch.dateName;",
    "  holidayLookupSource = 'custom';",
    "} else if (dbFound) {",
    "  isHoliday = true;",
    "  holidayName = String(dbPayload.holiday_name || '\\uACF5\\uD734\\uC77C');",
    "  holidayLookupSource = dbPayload.source_type ? `db:${dbPayload.source_type}` : 'db';",
    "}",
    "",
    "return [{",
    "  json: {",
    "    check_date: baseline.todayInt,",
    "    is_holiday: isHoliday,",
    "    holiday_name: holidayName,",
    "    is_weekend: !!baseline.IsWeekend,",
    "    weekday_name: baseline.WeekdayName,",
    "    holiday_lookup_source: holidayLookupSource,",
    "    holiday_lookup_failed: Boolean(apiPayload.error) && Boolean(dbPayload.error),",
    "    api_error: apiPayload.error?.message || apiPayload.error || '',",
    "    db_error: dbPayload.error || ''",
    "  }",
    "}];",
  ]);
  getNode(workflow, 'a9f68f23-a1ab-4ce1-ad4a-65231b208163').parameters.jsCode = privateTeamCode;

  const teamsNode = getNode(workflow, '0d86c93b-0439-4f36-8b49-ee71252d1a5b');
  teamsNode.parameters.contentType = 'json';
  teamsNode.parameters.specifyBody = 'json';
  teamsNode.parameters.bodyParameters = { parameters: [{}] };
  teamsNode.parameters.jsonBody = standardTeamsBody;

  renameNode(workflow, '8495c240-3ff6-4981-b286-fe76af1f61c7', '리더 확인 알림');
  renameNode(workflow, 'a29a888e-b4ee-420d-a024-638306f9783a', 'HTTP Request');
  renameNode(workflow, '4ad77788-a76a-4608-bda8-7b2ea29d5a23', '오늘은 평일인가?');
  renameNode(workflow, 'a9f68f23-a1ab-4ce1-ad4a-65231b208163', 'Team용 휴가체크');
  renameNode(workflow, '0d86c93b-0439-4f36-8b49-ee71252d1a5b', 'Teams Webhook');

  const notionNode = getNode(workflow, '63245630-6e64-4268-a799-b3b0c974e4ac');
  if (notionNode.parameters.databaseId && notionNode.parameters.databaseId.cachedResultName) {
    notionNode.parameters.databaseId.cachedResultName = '\uAE30\uC220\uC9C0\uC6D0\uCE98\uB9B0\uB354DB';
  }

  saveWorkflow(filePath, workflow);
}

fixCleanDailyScrum();
fixPrivateConfirmDailyScrum();
console.log('Updated Clean-Daily-Scrum and Private-ConfirmDailyScrum workflow files.');
