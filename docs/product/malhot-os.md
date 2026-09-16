# Malhot OS

## Purpose

The authenticated operating system the Malhot team uses to run projects from idea to archived documentation. It is a **desktop-first productivity application**: focused, fast, organised, calm, information-dense without clutter.

Base path: `/os`. Everything under it requires an authenticated organisation member.

## Navigation

Primary (left sidebar, collapsible to icons):

```text
Home          /os
Projects      /os/projects
My Tasks      /os/my-tasks
Timeline      /os/timeline
Documents     /os/documents
Testing       /os/testing
Team          /os/team
Reports       /os/reports
Activity      /os/activity
```

Bottom of sidebar:

```text
Notifications (bell, unread count)
Profile menu  → /os/settings/profile, appearance, sign out
Settings      /os/settings
```

Global: command palette (`Ctrl/⌘ K`) for jump-to project/task, create task, search.

## Route map

```text
/os                                   Dashboard
/os/projects                          Project list
/os/projects/new                      Guided creation
/os/projects/[key]                    Project overview (command centre)
/os/projects/[key]/goals              Goals & MVP
/os/projects/[key]/tasks              Board (default) / list toggle
/os/projects/[key]/tasks/[number]     Task detail (also opens as side panel from board)
/os/projects/[key]/timeline           Project timeline + milestones
/os/projects/[key]/testing            Test cases / runs / bugs
/os/projects/[key]/testing/bugs/[n]   Bug detail
/os/projects/[key]/github             Repositories, issues, PRs, deployments
/os/projects/[key]/documents          Project documents
/os/projects/[key]/activity           Project activity
/os/projects/[key]/settings           Project settings (manager+)
/os/my-tasks                          Overdue / Today / Upcoming / Completed
/os/timeline                          Cross-project timeline
/os/documents                         All documents, templates
/os/documents/[id]                    Document editor / viewer
/os/testing                           Cross-project testing dashboard
/os/team                              Team members, workload
/os/reports                           Operational reports
/os/activity                          Organisation activity
/os/notifications                     Full notification list
/os/settings/{profile,organization,members,permissions,integrations,notifications,appearance,security}
```

Projects are addressed by `key` (e.g. `MAL`) and tasks by `key-number` (e.g. `MAL-42`) so identifiers are human-readable in GitHub PR titles and conversation. See `database/entities.md`.

## Screens (summary — details in `features/*`)

| Screen | Answers | Doc |
|---|---|---|
| Dashboard | What needs attention now, what is mine, what is upcoming | `features/dashboard.md` |
| Projects | Which projects exist, in what state, who runs them | `features/projects.md` |
| Project overview | Is this project healthy; where are we; what is next | `features/projects.md` |
| Goals & MVP | Why we are building this; what "done" means | `features/goals-and-mvp.md` |
| Tasks (board, detail, My Tasks) | Who does what, by when, in what state | `features/tasks.md` |
| Timeline | When things happen; what is late | `features/timelines.md` |
| Testing | Does it work; what is broken; what was retested | `features/testing.md` |
| Documents | What we promised, specified, reported | `features/documents.md` |
| GitHub | What code exists for this; which PRs relate to which tasks | `features/github.md` |
| Team | Who is on what; is anyone overloaded | `features/team.md` |
| Reports | Progress, completion, overdue, testing status, workload | `features/reports.md` |
| Activity / Notifications | What changed; what needs me | `features/notifications.md` |

## Cross-cutting behaviours

- **Layouts fetch shared context once**: the `(os)` layout resolves the session, profile, organisation membership and unread-notification count; the `[key]` layout resolves the project and the viewer's project role. Pages receive these via server-side helpers, never re-fetch them.
- **Every list has** loading skeletons, an empty state with a primary action, an error state with retry, pagination or bounded fetch.
- **Every mutation** is a Server Action with Zod validation and an authorisation check; the UI updates optimistically where the action is low-risk (status change, reorder) and pessimistically for destructive or irreversible actions (delete, approve, archive).
- **Destructive actions** need confirmation dialogs stating what will happen; archiving is preferred to deletion.
- **Unsaved changes** in the document editor and long forms warn before navigation.
- **Permission denied** explains what role is needed and who can grant it.
- **Not found** pages exist for project, task, document, bug.
- **Keyboard**: board and lists are keyboard-navigable; dialogs trap focus; `Esc` closes; command palette is the power-user path.

## What the OS is not

Not a marketing surface, not a chat tool, not a time tracker, not a client portal, not an HR system. See `product/product-overview.md`.
