const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const MONITORED_BRANCHES = [
  {
    owner: 'vmslab',
    repository: 'Mozart2.0',
    branch: 'Release/2026.126.1',
  },
  {
    owner: 'vmslab',
    repository: 'mozart-ui-app',
    branch: 'Release/2026.126.1',
  },
];
const MONITOR_TITLE = 'github-branch-monitor 상태 알림';

function fail(message) {
  throw new Error(message);
}

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  if (result.status !== 0) {
    fail(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

function formatKst(iso) {
  return (
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso)) + ' KST'
  );
}

function loadBranchState() {
  const items = [];

  for (const target of MONITORED_BRANCHES) {
    const repoUrl = `https://github.com/${target.owner}/${target.repository}`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-branch-monitor-'));

    try {
      runGit([
        'clone',
        '--quiet',
        '--filter=blob:none',
        '--depth',
        '1',
        '--branch',
        target.branch,
        repoUrl,
        tempDir,
      ]);

      const sha = runGit(['-C', tempDir, 'rev-parse', 'HEAD']);
      const commitIso = runGit(['-C', tempDir, 'log', '-1', '--format=%cI']);
      const author = runGit(['-C', tempDir, 'log', '-1', '--format=%an']);
      const subject = runGit(['-C', tempDir, 'log', '-1', '--format=%s']);

      items.push({
        ...target,
        sha,
        shortSha: sha.slice(0, 7),
        commitIso,
        commitKst: formatKst(commitIso),
        author,
        subject,
        branchUrl: `${repoUrl}/tree/${encodeURIComponent(target.branch)}`,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  return items;
}

function buildPayload(branches) {
  const checkedAt = formatKst(new Date().toISOString());

  return {
    type: 'message',
    summary: `${MONITOR_TITLE} 실제 동작 검증`,
    text: `${MONITOR_TITLE} 실제 동작 검증`,
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: MONITOR_TITLE,
              weight: 'Bolder',
              size: 'Medium',
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: '\uD604\uC7AC \uC2DC\uAC01 \uAE30\uC900 \uC2E4\uC81C \uBAA8\uB2C8\uD130 \uB300\uC0C1 \uBE0C\uB79C\uCE58 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.',
              wrap: true,
              spacing: 'Small',
            },
            {
              type: 'FactSet',
              facts: [
                { title: '\uD655\uC778 \uD68C\uCC28', value: '\uC624\uC804 07:55 \uAE30\uC900 \uD604\uC7AC \uC2DC\uAC01 \uC2E4\uD589' },
                { title: '\uBCC0\uACBD \uAE30\uC900', value: '\uC774\uC804 \uCCB4\uD06C \uC774\uD6C4' },
                { title: '\uD655\uC778 \uC2DC\uAC01', value: checkedAt },
              ],
            },
            ...branches.flatMap((branch, index) => [
              {
                type: 'TextBlock',
                text: `${index + 1}\\. ${branch.owner}/${branch.repository} / ${branch.branch}`,
                weight: 'Bolder',
                wrap: true,
                spacing: 'Medium',
              },
              {
                type: 'TextBlock',
                text: `SHA: ${branch.shortSha} (${branch.sha})\n\uB9C8\uC9C0\uB9C9 \uCEE4\uBC0B \uC2DC\uAC01: ${branch.commitKst}\n\uC791\uC131\uC790: ${branch.author}\n\uCEE4\uBC0B: ${branch.subject}\n\uBE0C\uB79C\uCE58 \uB9C1\uD06C: ${branch.branchUrl}`,
                wrap: true,
                spacing: 'Small',
              },
            ]),
            {
              type: 'TextBlock',
              text: '\uC774 \uBA54\uC2DC\uC9C0\uB294 \uC2E4\uC81C \uBAA8\uB2C8\uD130 \uB300\uC0C1 \uBE0C\uB79C\uCE58 \uD604\uD669 \uD655\uC778\uC6A9 \uC218\uB3D9 \uC2E4\uD589 \uACB0\uACFC\uC785\uB2C8\uB2E4.',
              wrap: true,
              spacing: 'Medium',
            },
          ],
        },
      },
    ],
  };
}

async function main() {
  const webhookUrl = process.env.TS_GITHUB_BRANCH_MONITOR_TEAMS_WEBHOOK;
  if (!webhookUrl) {
    fail('TS_GITHUB_BRANCH_MONITOR_TEAMS_WEBHOOK is required.');
  }

  const branches = loadBranchState();
  const payload = buildPayload(branches);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    fail(`Webhook request failed: ${res.status} ${await res.text()}`);
  }

  console.log(
    JSON.stringify(
      {
        sent: true,
        branchCount: branches.length,
        branches: branches.map((branch) => ({
          repository: `${branch.owner}/${branch.repository}`,
          branch: branch.branch,
          sha: branch.shortSha,
          commitKst: branch.commitKst,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
