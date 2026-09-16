# UX Principles

## 1. The next action is always visible
Every OS screen leads with what the viewer should do (overdue, awaiting my review, failed tests on my task) before what exists. Dashboard ordering: My Work → Needs attention → Overview → Activity → Upcoming.

## 2. Preserve context
Task detail opens as a side panel over the board; editing happens inline; dialogs are for short, focused input. Navigating away from a panel returns to the exact board scroll and filters (filters live in the URL). The browser back button behaves predictably: opening a panel pushes a URL (`?task=MAL-42`), so back closes it.

## 3. Every state is designed

| State | Rule |
|---|---|
| Loading | Skeletons mirroring final layout; never spinners in content areas. Route-level `loading.tsx` for pages, local skeletons for widgets. Actions show pending on the control that triggered them. |
| Empty | Explain what this is, why it is empty, one primary action. Distinguish "nothing exists yet" from "nothing matches your filters" (offer *Clear filters*). |
| Error | Say what happened, what it means, what to do. Offer *Retry*. Never show stack traces or raw codes; show a short reference id for support. |
| Permission denied | State the needed role and who can grant it. Never reveal data the viewer cannot see. |
| Offline / network | Toast "You appear to be offline; changes will not be saved" on failed mutation; keep the form state so the user can retry. No offline-first sync in v1. |
| Not found | Entity-specific ("Task MAL-999 does not exist or was deleted"), link back to the parent. |
| Confirmation | Destructive or irreversible actions (delete, archive, approve, complete project) need an AlertDialog that names the object and consequence. Reversible actions (status change) do not. |
| Unsaved changes | Editors autosave; forms warn on navigation (`beforeunload` + in-app route guard). |
| Success | Toast with an undo where undo is cheap (status change, reorder, mark read); inline confirmation otherwise. |
| Overflow | Lists paginate at 50; long text truncates with full text on demand; boards scroll horizontally with column headers pinned. |

## 4. Reversible over confirmed
Prefer undo (toast) to confirmation dialogs for frequent low-risk actions. Reserve confirmation for the irreversible.

## 5. Show the model, not the database
Labels use the team's language: "Awaiting review", not `status = review`. Identifiers (`MAL-42`) are shown because the team will use them in conversation and GitHub.

## 6. Dense but breathable
14 px base, 40 px table rows, clear hierarchy through weight and colour, whitespace between groups not between every element. A project overview should fit its key facts above the fold on a 1440 px laptop.

## 7. Keyboard is a first-class path
- Global: `⌘K` palette, `g p` (projects), `g t` (my tasks), `c` (create task in project context), `?` (shortcut help).
- Board: arrow keys between cards, `Enter` open, `[`/`]` move between columns, `Esc` close panel.
- All dialogs trap focus and restore it on close.

## 8. Accessibility is part of done
- WCAG 2.2 AA target. Contrast per tokens, focus visible, semantic HTML, labelled controls, live regions for async results (`aria-live="polite"` for autosave status, toasts).
- Drag-and-drop always has a non-pointer equivalent (move menu).
- Motion respects user preference.
- Forms: labels always visible (no placeholder-as-label), errors associated via `aria-describedby`, error summary focused on submit failure.
- Colour never the sole carrier of meaning.

## 9. Trust through honesty
Computed values say how they are computed (health tooltip lists the signals). Overrides are visibly marked. Seed/demo data is labelled. Progress shows counts, not just bars.

## 10. Notifications earn attention
Rules in `features/notifications.md`. Default: notify only when someone needs to act. Everything else is in Activity, one click away.

## Writing guidelines
- Sentence case. Plain verbs. No exclamation marks. No jokes in error states.
- Error message shape: *What happened.* *Why (if known).* *What to do.* Example: "Could not move task to Done. Tasks in this project need QA sign-off. Ask a QA member or the project manager to complete it."
- Empty state shape: *What this is* → *One action.* Example: "No test cases yet. Test cases describe how to verify a task or feature." → **Create test case**.
- Dates: absolute first, relative second.

## Website-specific UX
- One primary CTA per viewport.
- Navigation ≤ 6 items + Login.
- Contact form: short, optional fields marked, immediate confirmation, no account required.
- Case studies scannable: problem / solution / outcome visible without scrolling on desktop.
- Performance is UX: budgets in `product/public-website.md`.
