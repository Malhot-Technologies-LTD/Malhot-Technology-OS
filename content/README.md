# Website content

Typed content in `site.ts`, rendered by `app/(marketing)`. Change copy here; the
pages re-render on the next build. Keep placeholders honest: never invent client
names, metrics or people.

## Where this content came from

The public site was replaced by the standalone `Malhot-Website` repository
(commit `d6daad3`) in September 2026, then redesigned on 26 September 2026 as a
light corporate site. The project set and most service copy are still that
repository's. The redesign dropped its testimonials, headline stats, service
metrics and background video, and deleted that data. The previous site's content files — `work.ts`,
`services.ts`, `process.ts`, `team.ts` — were deleted with the pages that
rendered them.

That import brought content this repository's own rule forbids. It is flagged
rather than silently deleted, because removing it would empty sections the
design is built around, and rewriting someone's marketing copy is not a
developer's call. **Everything in the table below is currently live** unless the row says it is hidden.

## Content gaps before launch

Search for `unverified: true` to find every flagged item.

| Where | What is wrong | Owner |
|---|---|---|
| `site.ts` → `projects` | Six case studies with **named clients** and specific results ("+54% revenue", "12k+ active users", "4.8★", "9.4M rows"). The client names are live; the results are **hidden** while `unverified: true` is set. Confirm each client is happy to be named and each number is measured, then clear the flag to show them, or switch to "Confidential client". | Founders + marketing |
| `site.ts` → `site.email` | `hello@malhot.com`. The previous site said `hello@malhot.tech` and had it marked as a placeholder. **The two disagree and neither is confirmed.** This is the address on the contact page, the footer and the privacy notice. | Founders |
| `site.ts` → `site.phone` | `+250 788 113 456` — new, unconfirmed, and linked as `tel:` from the footer and contact page. | Founders |
| `site.ts` → `site.socials` | All four point at the bare platform homepages (`https://x.com`, `https://linkedin.com`, …) rather than at Malhot accounts, so the footer does not render them yet. | Marketing |
| `site.ts` → `projects[].liveUrl` / `repoUrl` | Every one points at `https://malhot.com` or `https://github.com`, so the case-study page does not render them. | Marketing |
| `site.ts` → `timeline` | Founding story: "founded 2022", "three engineers in Kigali", "first enterprise partner". Confirm the dates. | Founders |
| `public/images/site/*` | Six free Pexels stock photos of African teams (Pexels licence, no attribution required): the home hero slideshow (four), the process section and the About page. Replace with photos of the Malhot team and office in Kigali at 1920x1280 or larger; filenames and alt text are in `media` in `site.ts`. Project cards have no photos until real product screenshots exist. | Marketing |
| `privacy` page | Legal review, named data controller, retention period confirmation. | Founders |

## Rules

- Malhot OS is internal. The website never shows it, names it or describes its
  screens. The navbar's "Dashboard" link is the only pointer, and it appears
  only to someone already signed in.
- No invented clients, metrics, quotes or people. Anything not yet confirmed is
  marked `unverified: true` and listed above.
- Budget values in `budgetOptions` must match `BUDGET_RANGES` in
  `features/inquiries/schemas.ts`, or a completed brief is rejected at the last
  step. A test in `features/inquiries/schemas.test.ts` enforces this.
