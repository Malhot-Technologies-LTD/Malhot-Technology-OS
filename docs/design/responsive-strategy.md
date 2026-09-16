# Responsive Strategy

## Priorities

| Surface | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| Public website | Mobile | Desktop | Tablet | — (all must be excellent) |
| Malhot OS | Desktop (≥ 1440) | Laptop (1280 to 1439) | Tablet (768 to 1279) | Mobile (< 768): read + light actions |

The OS is a desktop productivity tool. Mobile support means a team member can check their tasks, read a document, move a status and comment from a phone — not run a planning session.

## Breakpoints (Tailwind v4 defaults, named by intent)

| Name | Min width | OS behaviour |
|---|---|---|
| `sm` | 640 | — |
| `md` | 768 | tablet layout begins |
| `lg` | 1024 | sidebar visible (collapsed by default) |
| `xl` | 1280 | sidebar expanded by default; side panels |
| `2xl` | 1536 | wider tables, more board columns visible |

## OS per-screen behaviour

| Screen | Desktop / laptop | Tablet | Mobile |
|---|---|---|---|
| Shell | Sidebar + topbar | Collapsed icon sidebar; topbar | Bottom tab bar (Home, Projects, My Tasks, Notifications, More); no sidebar |
| Dashboard | 3-column widget grid | 2 columns | 1 column, My Work first |
| Project list | Full data table | Table with fewer columns (name, status, manager, due, progress) | Card list |
| Project overview | 2-column (facts + progress / activity) | stacked | stacked, stage stepper horizontal-scroll |
| Board | All 6 columns, horizontal scroll if needed | Horizontal scroll, columns 280 px | One column at a time with segmented control for status; drag disabled; "Move to…" menu |
| Task detail | Side panel 520 px | Sheet full-height 80% | Full-page route |
| Timeline | Full Gantt-lite with zoom | Horizontal scroll, condensed rows | List view (milestones and tasks by date) — the bar view is not attempted below `md` |
| Testing run grid | Table with rapid pass/fail buttons | Same, narrower | Card per case with pass/fail/blocked buttons |
| Document editor | Editor + metadata sidebar | Metadata collapses into a sheet | Editor only, toolbar sticky bottom; viewing prioritised over editing |
| Team | Table | Table | Cards |
| Reports | Charts + tables | Stacked | Tables only (charts hidden or simplified to bars) |
| Settings | Two-column (nav + form) | Same | Nav becomes a list → form pages |

## Implementation rules

- Mobile-first CSS for the website; desktop-first *thinking* but still mobile-first CSS for the OS (progressive enhancement of density).
- Container queries (`@container`) for widgets that appear in multiple column widths (dashboard cards, project cards) so they adapt to their slot, not just the viewport.
- Touch targets ≥ 44 × 44 px on touch layouts; hover-only affordances get a visible fallback on touch (row actions always show a `⋯` button under `md`).
- Data tables: define a column priority; hide low-priority columns progressively; never horizontal-scroll a table on mobile — switch to cards.
- Side panels become sheets below `xl`, full routes below `md` (the same component rendered in three containers; URL is identical).
- Text never below 13 px in the OS, 14 px on the website.
- Images on the website: `sizes` attribute always set; art-directed crops for hero on mobile via `<picture>` where needed.
- Test matrix (Playwright projects): 390 × 844 (mobile), 820 × 1180 (tablet), 1280 × 800 (laptop), 1536 × 960 (desktop). Website specs run all four; OS specs run laptop + desktop fully, mobile for the reduced flows.

## Explicitly not done
- Native apps, PWA install prompts, offline caching. Revisit if the team asks.
- Pixel-perfect board drag-and-drop on phones.
