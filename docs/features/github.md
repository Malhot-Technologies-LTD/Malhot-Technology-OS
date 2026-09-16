# Feature: GitHub Integration

## Purpose
Connect project management to code without duplicating GitHub. Show repositories, issues, PRs and deployments in project context; link them to tasks; reflect code activity in the project feed.

Architecture and auth method: `architecture/integrations.md` (GitHub App, installation tokens, webhooks).

## Data
`github_installations`, `github_repositories`, `github_issues`, `github_pull_requests`, `task_github_links`, `deployments`, `webhook_events`.

## Permissions
Install app: org admin. Connect repo to project: manager+. Link/unlink from tasks, manual sync: contributor+. Read: all members.

## Setup flow (org admin) — Settings → Integrations
1. "Install Malhot OS on GitHub" → `https://github.com/apps/<slug>/installations/new?state=<signed>`.
2. GitHub → `/api/github/setup?installation_id&setup_action&state` → verify state, fetch installation via App JWT, store → back to Integrations with the account name, repo count and permission summary.
3. Uninstall/suspend events via webhook mark the installation; UI shows "Suspended — reinstall".

## Project GitHub page `/os/projects/[key]/github`

No repository: empty state → "Connect repository" (manager+; if no installation: explain and link to Integrations for admins, or "Ask an admin to install the GitHub App").

Connected:
- **Repository card**: full name (link), default branch, visibility, last push (from `push` events), last synced, "Sync now", "Disconnect" (manager+).
- **Pull requests**: open first; columns: number, title, author, head → base, draft, state, opened/merged, linked tasks (chips). Filter: state, linked/unlinked, author. Click → GitHub (new tab); chip → task.
- **Issues**: number, title, labels, state, author, opened, linked tasks. Filter: state, linked. "Create task from issue" (pre-fills title/description, links the issue).
- **Deployments**: environment, status, URL, commit, provider, when. "Record deployment" (manual). Production successes are highlighted.
- **Recent code activity**: the last 20 GitHub-sourced activity items (PR opened/merged, issue closed, push summary, deployment).

## Task linking

Automatic: webhook handlers scan PR title, head branch, body and issue title for `\b([A-Z]{2,6})-(\d+)\b`; matching `projects.key` for the repository's project → upsert `task_github_links` (`source = auto`). Also triggered on initial sync and "Sync now".

Manual: task panel → GitHub tab → "Link" → combobox over cached issues/PRs (search by number or title) → `source = manual`. Unlink removes the row (manual or auto).

Status hints (informational, not automatic): when a linked PR is merged and the task is `in_progress`, the task shows "PR merged — move to Review?" Automatic status changes are deliberately avoided in v1 to keep humans in control of the workflow; can become a per-project setting later.

## Sync

- **Webhooks** (primary): `pull_request` (opened, edited, closed, reopened, ready_for_review, converted_to_draft, synchronize → title/branch), `issues` (opened, edited, closed, reopened, labeled, unlabeled), `push` (default branch pushes → summary activity: "3 commits to main by kenny"), `deployment_status`, `installation`, `installation_repositories`, `repository` (renamed/deleted/privatised).
- **Reconciliation** (cron, nightly): per connected repository, page through open PRs/issues and PRs/issues updated in the last 2 days; upsert; mark closed those no longer open. Catches missed deliveries.
- **Manual "Sync now"**: same as reconciliation for one repo; rate-limited to once per 2 minutes per repo.

Installation tokens are requested per call via Octokit's app auth (cached in-memory for their lifetime); never persisted.

## Deployments

v1 sources: manual form; GitHub `deployment_status` events (environment, state, `target_url`/`environment_url`, sha). Provider `vercel` is roadmap (Vercel integration or webhook). Production `success` → `deployment.recorded` activity + manager notification; feeds the Deployment Report template.

## Events
`github.installation_added/removed/suspended`, `github.repository_connected/disconnected/synced`, `github.pr_opened/merged/closed/reopened`, `github.issue_opened/closed/reopened`, `github.push` (summary), `deployment.recorded`, `task.github_linked/unlinked`.

Notifications: `project_updated` to manager on production deployment success and on repository disconnect; nothing for routine PR/issue events (visible in activity; avoid spam).

## States
- No installation: explanatory empty state with admin/non-admin variants.
- Installation suspended: warning banner, actions disabled except reinstall.
- Repo removed on GitHub: card shows "Repository no longer accessible" with disconnect option.
- Sync failure: banner with last error summary (no tokens/URLs leaked) and retry.
- Rate limited by GitHub: message with retry-after.
- Loading: skeleton lists.

## Security notes
- Webhook signature verified over the raw body; replayed deliveries ignored by `delivery_id`.
- The App has read-only permissions in v1; adding `issues: write` (create issues from tasks) is a deliberate later step.
- Repository connection is constrained to repositories the installation actually grants (verified server-side against the installation's repo list, not trusted from the client).

## Out of scope (v1)
Creating/editing issues or PRs from the OS, commit-level views, branch lists, CI check status, code review inside the OS, multiple repos per project (constraint can be relaxed later), GitLab/Bitbucket.
