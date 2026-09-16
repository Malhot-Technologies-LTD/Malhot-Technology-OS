# Product Overview

## What Malhot Technologies is

Malhot Technologies is a small technology company that designs, builds and ships software for clients: websites, web applications, backend systems, automation, and AI-assisted systems. The team is currently five people covering frontend, backend, QA, marketing and project management.

The company's credibility rests on one claim: **Malhot actually builds and ships software.** Everything in this platform exists to make that claim true internally and visible externally.

## What the platform is

One product, two experiences, one codebase, one identity:

```text
PUBLIC MALHOT WEBSITE          — represents the company to the world
        ↓ Login
AUTHENTICATED MALHOT OS        — the system the team uses to run projects
        ↓
Projects → Goals → MVP → Tasks → Timeline → Development → Review
→ Testing → Deployment → Documentation → Reporting
```

They ship together because:

- The website is the front door; the OS is the building. Users who log in must not feel they have entered an unrelated application (shared branding, typography, account system, domain).
- Case studies on the website are the *output* of projects run in the OS. Over time the OS becomes the factual source for what the company has shipped.
- One codebase, one deployment, one design system is materially cheaper for a five-person team than two products.

## Responsibilities

### Public website
- Communicate positioning: what Malhot builds, for whom, and how.
- Present services, selected work (case studies), process, team credibility.
- Convert: contact / enquiry.
- Provide the login entry to the OS.
- Be fast, indexable, accessible, excellent on mobile.

### Malhot OS
- Be the single operational system of record for projects: what we are building, why, for whom, by when, who is doing what, what state it is in, and whether it works.
- Enforce the Malhot delivery lifecycle without bureaucracy.
- Connect planning (goals, MVP) to execution (tasks, GitHub) to verification (testing) to delivery (documents, deployments).
- Give each role an actionable view of *their* work today.
- Produce professional client-facing documents from real project data.

## Who uses each side

| Audience | Website | OS |
|---|---|---|
| Prospective clients | Yes | No |
| Existing clients | Yes (case studies) | No (client portal is future scope) |
| Malhot team | Login entry | Yes — daily |
| Future hires / contractors | Yes | Yes, with restricted roles |

## Problems the OS solves

1. **No single source of truth.** Goals in chat, tasks in a board, tests in a spreadsheet, docs in a drive. The OS holds them in one graph: Project → Goals → MVP → Tasks → Tests → Bugs → Documents.
2. **Unclear "why".** Tasks exist without a traceable goal. Every task can link to an MVP item and goal; the project overview shows coverage.
3. **Invisible risk.** Deadlines slip silently. Health is computed from overdue work, milestone slippage and remaining runway, and surfaced on the dashboard.
4. **QA as an afterthought.** Testing is a first-class stage with test cases, runs, results and a bug lifecycle that loops back to tasks.
5. **Documentation debt.** Templates generate briefs, specs and reports from structured project data, so documents are consistent and mostly already written.
6. **Disconnected code.** GitHub issues/PRs are linked to tasks; PR merges and deployments appear in project activity.

## Problems the OS explicitly does NOT solve (v1)

- Time tracking / billing / invoicing. (`estimate_hours` / `actual_hours` exist for planning, not payroll.)
- Client-facing portal or client logins.
- CRM / sales pipeline. (Website enquiries are captured and surfaced, nothing more.)
- HR, performance reviews, or employee monitoring. Team views exist for coordination, not surveillance.
- Chat / real-time messaging. Comments are threaded to work items; chat stays in the team's chat tool.
- Full enterprise Gantt / resource levelling.
- Replacing GitHub: code review, CI and branches live in GitHub; the OS mirrors and links.
- Being an AI product. AI may assist document drafting later; it is never a source of truth for project data.

## Core product principles

1. **One graph of truth.** Every work item traces up to a goal and down to verification.
2. **Actionable over informational.** Each screen answers "what should I do next?" before "what is the state of everything?".
3. **State is explicit and enforced.** Status transitions and permissions are enforced server-side and in the database — never only in the UI.
4. **Calm density.** The OS is information-dense but never cluttered; the website is expressive but never noisy.
5. **Boring technology, professional engineering.** Small team, fast movement, no clever infrastructure.
6. **Nothing fake.** No fabricated production data, no vanity metrics, no placeholder client logos presented as real.

## MVP boundary

See `planning/mvp-scope.md`. In one sentence: the team can run a real client project end-to-end in the OS (auth → project → goals → MVP → tasks → milestones → testing → documents → GitHub links → reports), and the public website is live with real content.

## Future functionality

See `planning/roadmap.md`: email digests, Slack, client portal, deployment ingestion from Vercel, AI-assisted drafting, time tracking, SSO.
