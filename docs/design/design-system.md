# Design System

One system, two registers. The public website is the expressive register; the OS is the operational register. They share tokens, type, iconography and components so a person moving from `/` to `/os` recognises the same company.

Direction: **professional technology company.** Strong typography, restrained colour, subtle borders, neutral surfaces, one Malhot accent, status colour only when it means something, precise spacing, calm motion.

Explicitly not: generic SaaS gradients, glassmorphism, fake 3D, oversized radii, emoji as UI, decorative illustration, cluttered dashboards.

## Tokens

Tokens are CSS custom properties on `:root` (light) and `[data-theme="dark"]`, consumed by Tailwind v4 via `@theme`. Named by *role*, not by colour.

### Colour

Neutral scale is a **blue-tinted near-black**, not a neutral grey — the dark values below were sampled pixel-by-pixel off the reference build the OS is modelled on, then converted to OKLCH. Surfaces separate by stepping in lightness; borders only whisper. Values in OKLCH for perceptual consistency; hex fallbacks generated at build.

There are five surface steps in dark, and they are not interchangeable:

| Token | Dark | Role |
|---|---|---|
| `--bg` | `oklch(0.151 0.011 274)` | the page |
| `--rail` | `oklch(0.165 0.011 274)` | sidebar only |
| `--surface` | `oklch(0.176 0.018 270)` | cards, panels |
| `--surface-raised` | `oklch(0.201 0.014 274)` | popovers, dialogs, hovered tiles |
| `--bg-subtle` | `oklch(0.232 0.011 274)` | wells, skeletons, chips, table headers |

Note `--bg-subtle` is *lighter* than `--surface` in dark and *darker* than it in light. It is not a depth level; it means "a step away from the surface, toward contrast", which is the same idea in both themes.

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
| `display-m` | 32/1.15, -0.02em | 600 | website subsections, OS focus-card titles |
| `display-os` | 40/1.08, -0.025em | 600 | OS page titles |
| `heading` | 20/1.3, -0.01em | 600 | card / panel titles |
| `subheading` | 16/1.4 | 600 | |
| `body-l` | 18/1.6 | 400 | website prose |
| `body` | 15/1.55 | 400 | OS default |
| `body-l` (OS) | 16/1.6 | 400 | page descriptions, lead copy |
| `body-s` | 13/1.45 | 400 | metadata, dt labels, kbd |
| `caption` | 12/1.4 | 500 | labels, badges (uppercase tracking +0.04em for eyebrow labels only) |
| `mono` | 13/1.5 | 400 | `MAL-42`, SHAs, dates in tables |

OS base size is **15 px**; website base is 18 px on desktop, 16 on mobile. Tabular numerals (`font-variant-numeric: tabular-nums`) everywhere numbers align.

The OS used to run at 14 px on a compact control scale. It now runs one step up — 15 px body, 40 px default control height — because the OS is a tool people sit in for hours on a desktop monitor, and the density that made a screenshot look information-rich made the real thing tiring to use. Density is still available where it earns its place: tables, metadata and badges keep the 13 px step.

### Spacing, radius, shadow

- 4 px base grid. Scale: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128.
- Radius, OS register (`styles/tokens.css`): `--radius-s: 6px` (mono chips, inputs), `--radius-m: 10px` (buttons, small controls), `--radius-l: 14px` (cards, panels, dialogs). The website register overrides these down to 3 / 5 / 8 px under `[data-surface="site"]`, so the OS can soften without touching the approved marketing pages. Fully round is reserved for avatars, status dots and status badges: a badge is a word-shaped object rather than a container, and the pill says so.
- Shadows: `--shadow-s` (0 1px 2px / 6%), `--shadow-m` (0 4px 12px / 8%), `--shadow-l` (0 12px 32px / 12%). Dark theme reduces opacity and relies on borders.
- Borders are the primary separation device in the OS; shadows are for floating layers only.

### Motion

- Durations: 120 ms (hover/press), 160 ms (label fade), 180 ms (open/close), 200–240 ms (layout shift). Easing `cubic-bezier(0.2, 0, 0, 1)`, exposed as `--ease-standard`, so the whole OS decelerates the same way.
- Three utilities in `app/globals.css` carry all of it. `.animate-rise` is the 240 ms fade-and-rise for arriving content — 6px, never a slide across the page. `.animate-rise-stagger` applies it to children 40 ms apart, capped at eight, because past that the delay outlasts the animation and the page just reads as slow. `.collapse-grid` animates `grid-template-rows: 0fr → 1fr`, which reaches the content's own height without measuring it or hard-coding a `max-height` that breaks the first time a label wraps.
- Motion has exactly three jobs: something arrived, something opened, your pointer is here. Nothing loops, nothing announces itself.
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
Sidebar 288 px (rail 64 px), topbar 64 px, content padding 32 px rising to 56 px past `2xl`. Tables use 48 px rows; boards use 8 px card gaps. Side panels (task detail) 520 px.

**`PageBody` is full-bleed.** There is no centred max-width: the OS is a data surface, and a capped column on a 2560 px monitor throws away two thirds of the screen the person paid for. Wide viewports gain columns and padding, never margins — the project grid goes to four columns at `2xl`, the dashboard keeps its 2:1 split. Pages that are genuinely reading or form surfaces opt back into a measure with `<PageBody width="reading">` (max 1024 px); Settings is the main caller, because a full-width text input is harder to use, not easier — the eye loses the start of the next line.

Control heights: 40 px default (`Button` `size="default"`, `Input`), 44 px for `lg` and for the chrome's primary actions, 36 px for `sm`, 28 px for `xs`. Icon buttons match their text sibling: 40 / 44 / 36 / 28 px square.

## Data display rules

- Dates: `12 Mar` within the year, `12 Mar 2025` otherwise; relative ("in 3 days", "2 days overdue") only next to the absolute date or in badges with a tooltip.
- Numbers right-aligned, tabular, mono for identifiers.
- Empty values show `—`, not blank.
- Truncate with ellipsis and full text in `title`/tooltip; never clip identifiers.
- Progress always shows numerator/denominator or percentage with the count.

## Theming implementation

The OS layout mounts next-themes, which writes `data-theme` on `<html>`; `ThemeToggle` (OS only) changes it. The website and auth layouts never mount the provider: they pin `data-theme="dark"` on a wrapper, and light sections re-scope with `data-theme="light"` (`tokens.css` defines light values on both `:root` and `[data-theme="light"]`). The Tailwind `dark:` variant is defined to stop at a nested light scope, so shadcn components render correctly inside light bands.

## OS chrome and Home

### Sidebar
Two modes. **Pinned** is a 288 px column that takes its own space in the flex row. **Rail** is a 64 px strip whose panel widens to 288 px *over* the page on hover — the layout underneath never reflows, so hovering to read a label cannot reshuffle the table you were reading. Only the floating state casts `--shadow-l`; pinned, the sidebar is part of the page. The pin state persists in the `os_sidebar` cookie so the server renders the right width and nothing flashes; hover state deliberately does not, because a pointer crossing the rail is not a decision about layout.

Keyboard focus opens the rail too, but the check is `:focus-visible`, not plain focus — clicking the pin button leaves it focused, and without that distinction the rail would stay open after the very click that asked it to close.

Items with sub-destinations (Projects, Settings) carry a chevron disclosure that opens a `.collapse-grid` list. It defaults to open whenever the current page is inside that section: you should be able to see the siblings of the page you are on without hunting for a control. Settings' children are role-gated through `visibleChildren`, so a member never sees Members or Enquiries. The nine destinations are grouped under four quiet uppercase labels — Overview, Delivery, Quality, Company — defined in `components/os/nav.ts` as references into the flat `PRIMARY_NAV`, so the sidebar, the command palette and the breadcrumbs cannot drift apart. Collapsed, the group labels become hairline rules.

One brand-filled action sits above the nav: **New project**, a full-round pill. It is the only coloured button in the chrome, because everything in the OS hangs off a project and a second accent would cancel the first out. In the rail it shrinks to a 44 px circle rather than disappearing.

### Topbar
Three tracks, not a row: breadcrumb trail left, search centred in the viewport, utilities (theme, notifications) right. Centring search costs a grid but keeps it in the same place on every page and at every sidebar width — the thing people reach for most stops moving.

### The one coloured surface
`--brand-solid` (`components/os/focus-card.tsx`) is a solid brand panel: the strongest signal the system has, in a language that otherwise separates with borders on neutral surfaces. **At most one per page**, for the thing you should look at first. Text on it reads from `--brand-solid-fg` and `--brand-solid-muted`, never from `--fg` — the surface is the same colour in both themes, so theme-aware text tokens would fail the contrast check in one of them. **This surface carries the OS's only accessibility exemption, and it is deliberate.** `--brand-solid` is `oklch(0.61 0.155 266)` — the reference build's exact periwinkle, matched on request. Against it: a ≥24 px white title measures 3.9:1, which passes AA for large text; 14 px `--brand-solid-muted` body measures 2.9:1, which does **not** meet the 4.5:1 AA needs. Nothing else in the OS carries this exemption, and `styles/tokens.css` documents the one-line change (`oklch(0.5 0.185 266)`) that restores 6.1:1 / 5.1:1 if the call is reversed.

Every other text pair in both themes is verified at or above 4.5:1.

### Home components
`FocusCard` (the coloured panel), `StatTile` / `StatRow` (headline figures; a tile counting something filterable links to that filter), `ProgressRing` (one ratio, with the counts always printed under it — "100%" of nothing is the most misleading figure a dashboard can show), `SetupChecklist` (onboarding steps derived from data that already exists rather than a dismissed flag, so it cannot lie about what is set up and disappears on its own).

### Empty states
A recessed well (`--bg-subtle` inside a border), not a dashed outline: dashed reads as "drop a file here", and at dashboard size it turns into noise. `variant="well"` for empty states living inside a card, `variant="page"` for ones that stand alone.

## Do / don't (review checklist)

- Do use `--fg-muted` for secondary text; don't use opacity on text.
- Do use borders to separate; don't stack shadows on cards in the OS.
- Do use status colour for status only; don't colour headings or icons decoratively.
- Do keep one accent; don't introduce a second brand colour for "variety".
- Do give a page at most one `--brand-solid` surface; don't let two compete for the same glance.
- Do derive checklist and readiness state from stored data; don't keep "dismissed" flags that can disagree with reality.
- Do use sentence case everywhere (buttons, titles, labels); don't use Title Case or ALL CAPS except eyebrow labels.
- Do write labels as verbs for actions ("Create task"), nouns for navigation.
