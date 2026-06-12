# Handoff Process

## Goal

Manage session history in two stages:

1. draft handoff while work is still in progress
2. confirmed handoff after the outcome is stable enough to treat as a session baseline

## Directory Rule

- Draft handoffs live under `docs/handoff_drafts/`
- Confirmed handoffs live under `docs/` with the existing `session_handoff_YYYY-MM-DD.md` naming

## File Naming

- Draft: `docs/handoff_drafts/session_handoff_draft_YYYY-MM-DD_<topic>.md`
- Confirmed: `docs/session_handoff_YYYY-MM-DD.md`

Use short ASCII topic slugs such as:

- `lunch-recommendation-alert`
- `check-weekly-meeting`
- `active-workflow-sync`

## Draft Handoff Rules

Create or update a draft handoff immediately when:

- planning starts for a nontrivial task
- implementation direction changes
- an external dependency or blocker is discovered
- a workflow is created on the n8n server but not yet validated
- a session may end before the result is confirmed

Draft handoffs should be append-friendly and optimized for recovery speed.

Recommended sections:

- Purpose
- Scope
- Current status
- Decisions made
- Open questions
- Risks or blockers
- Files touched
- Server state
- Next actions

## Promotion Rule

Promote draft content into a confirmed handoff only when at least one of these is true:

- the session result is intended as the next baseline
- the workflow or code path was validated enough to resume safely later
- important state changed on the server and must be preserved as a reliable checkpoint

Promotion procedure:

1. review the active draft
2. compress unresolved notes into a short residual-risk section
3. write or update `docs/session_handoff_YYYY-MM-DD.md`
4. leave the draft file in place unless it is fully obsolete
5. if obsolete, mark it as superseded instead of deleting it immediately

## Operating Rule For This Repository

From now on:

- do not rely only on chat history for unfinished work
- record in-progress decisions in a draft handoff first
- treat confirmed handoffs as the stable resume point
- if a task spans multiple days, keep updating the same draft until promotion is warranted
