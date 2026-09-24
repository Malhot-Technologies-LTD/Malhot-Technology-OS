# Website content

Typed content in `site.ts`, rendered by `app/(marketing)`. Change copy here; the
pages re-render on the next build. Keep placeholders honest: never invent client
names, metrics or people.

## Where this content came from

The public site was replaced by the standalone `Malhot-Website` repository
(commit `d6daad3`) in September 2026. The design, the copy and the project set
are that repository's. The previous site's content files — `work.ts`,
`services.ts`, `process.ts`, `team.ts` — were deleted with the pages that
rendered them.

That import brought content this repository's own rule forbids. It is flagged
rather than silently deleted, because removing it would empty sections the
design is built around, and rewriting someone's marketing copy is not a
developer's call. **Everything in the table below is currently live.**

## Content gaps before launch

Search for `unverified: true` to find every flagged item.

| Where | What is wrong | Owner |
|---|---|---|
| `site.ts` → `testimonials` | Three quotes attributed to **named people at named companies** (Aline Uwase / Umoja Finance, Daniel Mugisha / Nexus Circle, Sarah Kimani / AgriConnect). Nobody has confirmed these were said. This is the highest-risk content on the site: a testimonial nobody gave is a statement about a real person. Get written permission and a real quote, or remove the section. | Founders |
| `site.ts` → `projects` | Six case studies with **named clients** and specific results ("+54% revenue", "12k+ active users", "4.8★", "9.4M rows"). Confirm each client is happy to be named and each number is measured, or switch to "Confidential client" and drop the figures. | Founders + marketing |
| `site.ts` → `stats` | "50+ projects delivered", "30+ happy clients", "3+ years", "98% client retention" — shown in the hero and the stats band. Unsourced. | Founders |
| `site.ts` → `services[].metric` | "0.9s median load", "+38% conversion", "3.2x ROAS", "4.8★ avg rating". Unsourced. | Marketing |
| `site.ts` → `site.email` | `hello@malhot.com`. The previous site said `hello@malhot.tech` and had it marked as a placeholder. **The two disagree and neither is confirmed.** This is the address on the contact page, the footer and the privacy notice. | Founders |
| `site.ts` → `site.phone` | `+250 788 113 456` — new, unconfirmed, and linked as `tel:` from the footer and contact page. | Founders |
| `site.ts` → `site.socials` | All four point at the bare platform homepages (`https://x.com`, `https://linkedin.com`, …) rather than at Malhot accounts. | Marketing |
| `site.ts` → `projects[].liveUrl` / `repoUrl` | Every one points at `https://malhot.com` or `https://github.com`. | Marketing |
| `site.ts` → `timeline` | Founding story: "founded 2022", "three engineers in Kigali", "first enterprise partner". Confirm the dates. | Founders |
| `public/images/site/*` | Stock photography from Pexels, vendored so nothing hotlinks. Replace with Malhot's own team and office photography at the same aspect ratios (1400x900 stills, 1920x1080 posters). | Marketing |
| `site.ts` → `media.*Video` | Three 4K clips hotlinked from `videos.pexels.com`. **They set third-party cookies** — Cloudflare's `__cf_bm` and `_cfuvid` — on every visitor whose browser loads one, which is why the privacy notice now has a paragraph about it and why Lighthouse best-practices sits at 73. Vendoring the clips (they are large) or dropping video for the posters alone removes both the cookies and that paragraph. | Founders + marketing |
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
