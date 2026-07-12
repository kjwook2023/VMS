# Repository Migration Checklist

## Goal

Move `TS-n8n` work from a personal GitHub repository into a shared business repository without carrying over personal ownership markers, local-machine paths, or repo-published secrets.

## Keep vs Remove

- Keep technical names such as `github-pr-monitor`, `n8n-nodes-base.github`, `pull request`, and monitored business repository names.
- Remove or neutralize personal identifiers such as personal GitHub usernames, personal remote URLs, personal absolute filesystem paths, and personal credential display names.

## Current Repo-Safe Baseline

- Handoff and related docs under [docs](.) now use relative repository links.
- The `github-pr-monitor` repo export uses the placeholder `__N8N_GITHUB_CREDENTIAL_NAME__`.
- [github-pr-monitor_api.ps1](../workflows/github-pr-monitor/github-pr-monitor_api.ps1) now expects `N8N_GITHUB_CREDENTIAL_NAME` at deploy time.

## Migration Steps

1. Create the shared GitHub repository under the business account or organization.
2. Change the local remote from the personal repository to the business repository.
3. Ensure the new remote URL does not embed a personal username in the URL string.
4. Confirm branch strategy and protections on the new repository before first shared push.
5. Verify that `.env`, webhook URLs, API keys, and other secret-bearing files remain redacted or ignored.
6. Verify that workflow exports do not expose personal credential display names that are only valid on one person's n8n account.
7. For shared deployment workflows, replace personal credential names with placeholders and inject the real value at deploy time.
8. Recheck handoff docs and design docs for absolute local paths or personal usernames before final push.

## n8n Workflow Rules

- Prefer repo-safe placeholders for values that are specific to one operator account.
- Keep environment-variable injection in the upsert script when a repo export cannot safely store the live value.
- If a workflow must reference a shared credential by name, use a neutral team-facing name on the server such as `github-shared-bot`.

## Validation Before Push

- `rg -n -i "D:/|D:\\\\|github\\.com/[^/]+@|[A-Za-z0-9_-]+-github" docs workflows scripts`
- `git remote -v`
- `git status --short`

## Done Criteria

- No handoff or operational document contains a personal absolute workspace path.
- No repo-published workflow export contains a personal GitHub credential display name.
- Shared deployment instructions are documented for any placeholder values.
- The repository remote points to the shared business repository.
