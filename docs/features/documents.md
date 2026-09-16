# Feature: Documents

## Purpose
Produce and manage professional project documentation, generated from structured project data and finished by people. Documents are deliverables (briefs, specs, reports) with a review/approval lifecycle and version history.

## Data
`documents` (Tiptap JSON `content`, `plain_text`, `search`), `document_versions`. Status machine `draft → in_review → approved → archived`, with return to draft.

## Permissions
`product/user-roles.md#documents`. Viewers see approved only. Approve: manager/admin (QA for `testing_report`).

## Editor and content model

- **Tiptap** (ProseMirror) with a fixed, professional schema: headings (h1 to h3), paragraphs, bold/italic/code, links, bullet/ordered/task lists, blockquote, code block, table, horizontal rule, image (from attachments), and two custom nodes:
  - `dataBlock` — a read-only block bound to project data (e.g. goals table, MVP status table, milestone list, test run summary, deployments). It renders live from the project when viewed in `draft`/`in_review`, and is **frozen to static content on approval** (the version snapshot stores rendered content) so approved documents never change silently.
  - `callout` — note/warning box.
- Stored as Tiptap JSON. `plain_text` extracted server-side for search and previews.
- Autosave: debounced 3 s, plus on blur/route change; status indicator in header; conflict handling: last write wins with a warning banner if `updated_at` changed since load ("This document was edited by Alpha 2 minutes ago — reload to see changes"). Collaborative editing (Y.js) is roadmap, not v1; the team rarely edits the same document simultaneously.

## Templates (code, not database)

`features/documents/templates/*.ts`, each `(ctx: ProjectSnapshot) → { title, content }`, unit-tested with fixture projects:

| Template key | Pre-filled from |
|---|---|
| `project_brief` | name, client, description, goals with success criteria, team, dates, priority |
| `requirements` | goals, MVP items with descriptions, open questions section (empty) |
| `mvp_specification` | MVP items grouped by goal, priorities, linked tasks, acceptance section per item |
| `project_plan` | milestones, task breakdown by milestone, dependencies summary, team allocation, risks (empty) |
| `meeting_notes` | attendees (team), date, agenda/decisions/actions skeleton; actions can be converted to tasks (button in dataBlock) |
| `testing_report` | selected run(s): cases, results, pass rate, bugs found, open bugs, environment |
| `deployment_report` | deployments in range, environments, commits/PRs merged since last production deploy, known issues (open bugs) |
| `final_report` | goals achieved, MVP completion, timeline vs plan (planned vs actual), test summary, deployments, outstanding items, lessons (empty) |

"Create from template" asks for the few inputs a template needs (e.g. which run for a testing report), then creates a `draft` with `template_key`. Templates are also available organisation-wide as blank starting points for org-level documents (admins).

## Lifecycle

| Transition | Who | Effect |
|---|---|---|
| draft → in_review | author, manager | notifies approvers (`document_review_requested`: manager + org admins; QA for testing reports) |
| in_review → approved | manager/admin (QA for testing_report) | `version + 1`, snapshot to `document_versions` with dataBlocks frozen, `approved_by/at`, notifies author and project members (`document_approved`); document becomes read-only |
| in_review → draft | manager/admin | "returned with comments" — comment required; notifies author |
| approved → draft | manager/admin | creates a new working draft (version history retained); UI labels "Revising v3" |
| approved → archived | manager/admin | |

## Pages

### `/os/documents`
Recent documents (across my projects), templates gallery, all documents table: title, type, project, status, author, updated, version. Filters: project, type, status, author. Search (full-text on title + plain text). Admin tab: organisation documents.

### `/os/projects/[key]/documents`
Same table scoped to the project + "Suggested next document" based on stage (planning → brief/MVP spec; testing → testing report; deployment → deployment report; completed → final report).

### `/os/documents/[id]` — editor/viewer
Header: title (inline), type badge, status badge with actions, version (`v3`, history menu), project link, author, saved indicator, Export (HTML / Print to PDF), comments toggle. Body: editor (or read-only renderer when approved/archived/viewer). Right sidebar (desktop): metadata, version history (open a version read-only; "Compare with current" is roadmap), comments on the document.

## Export
`GET /api/export/documents/[id]` renders the content (frozen version when approved) into a print-optimised HTML page with Malhot header/footer, title block, version and approval line. "Print to PDF" opens the browser print dialog with `print.css`. Server-side PDF is roadmap.

## Search
Command palette and documents search use the `search` tsvector (title weighted A, body B).

## AI
Not in v1. When added: a "Draft with AI" affordance inside the editor proposes text for a selected section using project data as context; the person accepts or discards; AI never writes to project tables and generated text is marked until edited.

## States
- Empty (project): suggested template cards + "Blank document".
- Approved: read-only banner "Approved v3 by Alpha on 12 Mar · Revise".
- Conflict banner as above.
- Autosave failure: persistent "Unsaved changes — Retry" and `beforeunload` guard.
- Offline: editor stays usable, saves resume on reconnect (single in-memory retry queue).
- Viewer without access to a draft: access-denied state that does not disclose the title.

## Events
`document.created` (template_key), `document.updated` (coalesced: at most one activity per author per 10 minutes for edits), `document.status_changed`, `document.approved` (version), `document.archived`, `document.deleted`, `document.exported`.

## Out of scope (v1)
Real-time collaborative editing, text-anchored comments, e-signatures, client sharing links (roadmap: signed read-only link for approved documents), DOCX export.
