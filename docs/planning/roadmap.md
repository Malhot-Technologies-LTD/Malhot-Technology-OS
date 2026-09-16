# Roadmap (post-MVP)

Directional, not committed. Items move into scope only when their trigger (see `mvp-scope.md`) fires and the team agrees. Ordered by expected value for Malhot.

## v1.1 — Operate smoothly (weeks after launch)
- Email digests (Resend + React Email): daily per-user digest, per-type opt-outs.
- ICS feed per user for milestones and due dates (signed URL).
- Vercel deployment ingestion (webhook) → deployments without manual entry.
- Server-side PDF export for approved documents.
- Saved filters on board/list; "my default project".
- Restore UI polish (recently deleted for tasks/documents).

## v1.2 — Developer flow
- Sign in with GitHub (account linking by verified email).
- Create GitHub issue from task; sync task title/description edits to the issue (one-way).
- PR checks and review status on task cards.
- Optional per-project automation: PR merged → task to Review.
- Multiple repositories per project.

## v1.3 — Client-facing
- Signed read-only links to approved documents (expiring), with view tracking limited to "opened at".
- Client role (`client`) with project viewer + comments on approved documents.
- Public case study generation from completed project data (draft MDX proposed to the marketing content folder).

## v1.4 — Documents and knowledge
- Text-anchored comments in documents.
- Real-time collaborative editing (Y.js + Supabase Realtime or Hocuspocus).
- AI-assisted drafting inside the editor (proposals only; never writes project data).
- Document compare between versions.

## v2 — Scale of practice (only if the company grows)
- Sprints/iterations, labels, custom fields.
- Time tracking (opt-in, per task) and simple budget vs actual per project.
- Materialised report snapshots and trend reports.
- Multi-organisation UI (if Malhot runs sister brands).
- SSO (Google Workspace).
- Case studies CMS (database-backed with OS editor).
- Public API with API keys for client integrations.

## Explicitly never (unless the company changes)
- Employee monitoring features (screenshots, keystroke/activity scoring, idle time).
- Chat.
- Replacing GitHub code review.
