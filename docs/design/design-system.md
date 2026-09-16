# Design System

One system, two registers. The public website is the expressive register; the OS is the operational register. They share tokens, type, iconography and components so a person moving from `/` to `/os` recognises the same company.

Direction: **professional technology company.** Strong typography, restrained colour, subtle borders, neutral surfaces, one Malhot accent, status colour only when it means something, precise spacing, calm motion.

Explicitly not: generic SaaS gradients, glassmorphism, fake 3D, oversized radii, emoji as UI, decorative illustration, cluttered dashboards.

## Tokens

Tokens are CSS custom properties on `:root` (light) and `[data-theme="dark"]`, consumed by Tailwind v4 via `@theme`. Named by *role*, not by colour.

### Colour

Neutral scale is a cool grey with a slight blue bias (reads as engineering, not as warm paper). Values in OKLCH for perceptual consistency; hex fallbacks generated at build.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `oklch(0.985 0.002 250)` | `oklch(0.16 0.008 255)` | page background |
| `--bg-subtle` | `oklch(0.965 0.003 250)` | `oklch(0.19 0.008 255)` | sidebar, table header, wells |
| `--surface` | `oklch(1 0 0)` | `oklch(0.21 0.008 255)` | cards, panels, popovers |
| `--surface-raised` | `oklch(1 0 0)` + shadow | `oklch(0.24 0.008 255)` | dialogs, menus |
| `--border` | `oklch(0.90 0.004 250)` | `oklch(0.30 0.008 255)` | default hairline |
| `--border-strong` | `oklch(0.80 0.006 250)` | `oklch(0.38 0.008 255)` | inputs, emphasis |
| `--fg` | `oklch(0.18 0.01 255)` | `oklch(0.95 0.004 250)` | primary text |
| `--fg-muted` | `oklch(0.45 0.01 255)` | `oklch(0.72 0.006 250)` | secondary text |
| `--fg-subtle` | `oklch(0.60 0.01 255)` | `oklch(0.58 0.006 250)` | placeholders, tertiary |
| `--accent` | `oklch(0.52 0.19 262)` | `oklch(0.68 0.16 262)` | Malhot accent (cobalt) |
| `--accent-fg` | white | `oklch(0.15 0.02 262)` | text on accent |
| `--accent-subtle` | `oklch(0.95 0.03 262)` | `oklch(0.27 0.06 262)` | selected rows, accent wells |
| `--focus` | `--accent` | `--accent` | focus ring |

**Accent is provisional.** No brand palette was provided. A single saturated cobalt was chosen because it reads as technical and confident, has sufficient contrast for text in both themes, and stays distinct from status colours. Final brand colour is an open decision (`planning/open-decisions.md`). Changing it is one token.

Status colours (used only for status/priority/health semantics, always paired with text or icon):

| Token | Meaning | Light fg / bg | Dark fg / bg |
|---|---|---|---|
| `--status-neutral` | backlog, planned, draft, planning | grey | grey |
| `--status-info` | todo, in_review, on_hold | blue-grey | |
| `--status-progress` | in_progress, active, retest | amber | |
| `--status-review` | review, testing | violet | |
| `--status-success` | done, achieved, approved, pass, closed, on_track | green | |
| `--status-warning` | at_risk, high, overdue soon, blocked | orange | |
| `--status-danger` | off_track, urgent, critical, fail, overdue | red | |

Each has `-fg`, `-bg` (very low chroma tint) and `-border` variants. Badges use `bg + fg + border`, never solid fills except `danger` for destructive buttons.

### Typography

Single family for both registers: **Geist Sans** with **Geist Mono** for identifiers, code, numbers in tables. Self-hosted via `geist` package / `next/font`. One family keeps website and OS unmistakably related; the website uses weight, size and tracking for expression.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display-xl` | 72/1.0, tracking -0.03em | 600 | website hero (desktop) |
| `display-l` | 48/1.05, -0.025em | 600 | website section titles |
| `display-m` | 32/1.15, -0.02em | 600 | website subsections, OS page titles (28 in OS) |
| `heading` | 20/1.3, -0.01em | 600 | card / panel titles |
| `subheading` | 16/1.4 | 600 | |
| `body-l` | 18/1.6 | 400 | website prose |
| `body` | 14/1.5 | 400 | OS default |
| `body-s` | 13/1.45 | 400 | dense tables, metadata |
| `caption` | 12/1.4 | 500 | labels, badges (uppercase tracking +0.04em for eyebrow labels only) |
| `mono` | 13/1.5 | 400 | `MAL-42`, SHAs, dates in tables |

OS base size is 14 px (density); website base is 18 px on desktop, 16 on mobile. Tabular numerals (`font-variant-numeric: tabular-nums`) everywhere numbers align.

### Spacing, radius, shadow

- 4 px base grid. Scale: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128.
- Radius: `--radius-s: 4px` (badges, inputs), `--radius-m: 6px` (buttons, cards), `--radius-l: 10px` (dialogs, marketing cards). Nothing larger; no pills except avatars and status dots.
- Shadows: `--shadow-s` (0 1px 2px / 6%), `--shadow-m` (0 4px 12px / 8%), `--shadow-l` (0 12px 32px / 12%). Dark theme reduces opacity and relies on borders.
- Borders are the primary separation device in the OS; shadows are for floating layers only.

### Motion

- Durations: 120 ms (hover/press), 180 ms (open/close), 240 ms (layout shift). Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Website may use longer, entrance-only reveals (≤ 600 ms, once, on scroll) and a subtle hero motif. No parallax, no autoplay video, no continuous animation.
- `prefers-reduced-motion: reduce` disables all non-essential motion (transitions to opacity-only, no transforms).

### Iconography

Lucide, 16 px in OS (20 px in nav), 24 px on the website. Stroke 1.75. Icons never carry meaning alone; pair with text or `aria-label`.

## Components (shadcn/ui as the base, owned in `components/ui`)

Foundation: Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Switch, DatePicker, Badge, Avatar (+ AvatarGroup), Tooltip, Popover, DropdownMenu, ContextMenu, Dialog, AlertDialog, Sheet (side panel), Tabs, Table (+ DataTable with sorting/filter/pagination), Card, Separator, Skeleton, Toast (sonner), Command (palette), Progress, Breadcrumb, EmptyState, ErrorState, PageHeader, KeyValueList.

OS-specific (`components/os`): AppSidebar, TopBar, NotificationBell, StatusBadge (typed by enum), PriorityBadge, HealthIndicator, ProjectKey (`MAL-42` mono chip), UserChip, DueDate (relative + overdue styling), ProgressBar (with numerator/denominator), StageStepper, Board, BoardColumn, TaskCard, TaskPanel, Timeline (bars, milestones, today line), TestRunGrid, DocumentEditor (Tiptap), ActivityItem, FilterBar (URL-state filters), InlineEdit.

Marketing-specific (`components/marketing`): SiteHeader, SiteFooter, Hero, SectionHeading, ServiceGrid, CaseStudyCard, ProcessBand, CapabilityList, TeamGrid, CTABand, ContactForm, Prose (MDX styles).

Every component: keyboard operable, visible focus ring (`2px` accent outline with `2px` offset), disabled and loading states, dark theme verified, RTL-safe logical properties where cheap.

## Layout

### Website
Max content width 1200 px (prose 720 px). 12-column grid, 24 px gutters (16 on mobile). Generous vertical rhythm (96 to 128 px between sections desktop, 64 mobile). Dark-dominant: `--bg` dark for hero/CTA bands, light sections for work and process to give rhythm.

### OS
Sidebar 240 px (collapsed 56 px), topbar 48 px, content padding 24 px, max content width none (data-dense pages use full width), forms max 720 px. Tables use 40 px rows; boards use 8 px card gaps. Side panels (task detail) 520 px.

## Data display rules

- Dates: `12 Mar` within the year, `12 Mar 2025` otherwise; relative ("in 3 days", "2 days overdue") only next to the absolute date or in badges with a tooltip.
- Numbers right-aligned, tabular, mono for identifiers.
- Empty values show `—`, not blank.
- Truncate with ellipsis and full text in `title`/tooltip; never clip identifiers.
- Progress always shows numerator/denominator or percentage with the count.

## Theming implementation

`app/layout.tsx` sets `data-theme` from cookie (server) to avoid flash; `ThemeToggle` (OS only) writes cookie + profile preference. Website forces `data-theme="dark"` at the marketing layout level with explicit light sections via a `.section-light` scope that remaps tokens locally.

## Do / don't (review checklist)

- Do use `--fg-muted` for secondary text; don't use opacity on text.
- Do use borders to separate; don't stack shadows on cards in the OS.
- Do use status colour for status only; don't colour headings or icons decoratively.
- Do keep one accent; don't introduce a second brand colour for "variety".
- Do use sentence case everywhere (buttons, titles, labels); don't use Title Case or ALL CAPS except eyebrow labels.
- Do write labels as verbs for actions ("Create task"), nouns for navigation.
