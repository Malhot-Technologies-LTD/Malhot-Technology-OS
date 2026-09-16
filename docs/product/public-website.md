# Public Website

## Purpose

Communicate that Malhot Technologies builds and ships real software, and convert visitors into conversations. Provide the login entry to Malhot OS.

Tone: premium, confident, modern, expressive, company-focused. Not a student portfolio, not a generic SaaS template.

## Information architecture

```text
/                 Home
/about            Company, team, values
/services         What we build (service areas)
/work             Selected work (case study index)
/work/[slug]      Case study
/process          How we work (mirrors the OS lifecycle, publicly)
/contact          Enquiry form + direct contact
/login            OS entry (shared auth surface, styled as the website)
/privacy          Privacy notice (required for contact form + analytics)
```

Deliberately omitted for v1: blog, careers, pricing. Add only when there is real content and an owner for it.

## Page contents

### Home `/`
1. **Hero** — a single, direct positioning statement plus a sub-line about the kind of systems Malhot builds. One primary CTA (Start a project → `/contact`), one secondary (See our work → `/work`).
2. **Positioning strip** — three short statements: what we build, how we work, what you get.
3. **Services** — the service areas as a compact grid linking to `/services#area`.
4. **Selected work** — 2 to 4 case study cards pulled from the work content source.
5. **Capabilities** — technology and practice list (frontend, backend, data, infrastructure, QA). Restrained: plain type, no logo wall unless real.
6. **Process** — the lifecycle in one horizontal band (Discover → Define → Plan → Build → Verify → Ship → Support). Links to `/process`.
7. **Team / credibility** — team roles, how the team operates, a line on the OS itself ("we run every project on our own operating system").
8. **CTA + contact** — repeat primary CTA with an email address.
9. **Footer** — navigation, contact, legal, login link.

### About `/about`
Company story (short), what the company believes about building software, the team with role and discipline, how the company operates.

### Services `/services`
Service areas (final list to be confirmed with the business — see `planning/open-decisions.md`):

| Area | v1 | Reason |
|---|---|---|
| Web Development | Yes | Core, matches team composition |
| Software Systems (web applications, internal tools) | Yes | Core |
| Backend & APIs | Yes | Core (backend developer on team) |
| UI/UX Design | Yes | Frontend + marketing cover this today |
| Automation & Integrations | Yes | Natural adjacent offer |
| AI-assisted Systems | Yes, framed carefully | Only where the team has shipped it; no hype |
| Deployment & Infrastructure | Yes, as part of delivery | "We ship and operate what we build" |
| Technical Consulting | Optional | Include only if actively sold |

Each area: what it is, what a client gets, typical deliverables, related case studies.

### Work `/work`, `/work/[slug]`
Case study index with filters by service area. Each case study:

- Client (or "Confidential client" — never invent names)
- Problem
- Solution
- Malhot's role
- Technology
- Outcome (factual; metrics only if real)
- Screenshots / visuals
- Links where permitted

### Process `/process`
Public version of `product/project-lifecycle.md`: what a client experiences at each stage and what they receive (brief, MVP spec, plan, testing report, deployment report, final report — the same document templates the OS generates).

### Contact `/contact`
Form: name, email, company (optional), message, budget range (optional). Submits via a Server Action → `inquiries` table → in-app notification to organisation admins. Honeypot field plus rate limiting. Confirmation state, error state. Direct email address alongside the form.

### Login `/login`
Shared authentication page. Styled with website branding; on success redirects to `/os`. See `architecture/authentication-architecture.md`.

## Content model

Marketing content (case studies, service copy, team) lives as **typed content files in the repository** (`content/work/*.mdx`, `content/services.ts`, `content/team.ts`) for v1:

- Changes go through PR review like code — appropriate for a five-person team.
- Fully static, fast, SEO-friendly.
- No CMS dependency, cost, or admin UI to build.

Future: if non-engineers need to publish frequently, move case studies to the database with an OS-side editor (the OS already holds the project data that case studies summarise).

## SEO and metadata
- Per-page `generateMetadata` with title, description, canonical, Open Graph and Twitter cards.
- Dynamic OG image route for case studies.
- `sitemap.xml` and `robots.txt` generated; `/os/*`, `/login`, `/auth/*` disallowed and `noindex`.
- Semantic landmarks, one `h1` per page, descriptive link text.
- `next/image` for all raster images; SVG for marks.

## Analytics
Privacy-conscious, cookie-less page analytics on the marketing site only (Vercel Web Analytics). Nothing on `/os`. Decision recorded in `planning/technical-decisions.md` (ADR-014).

## Performance budget
- LCP < 2.0 s on 4G mobile, CLS < 0.05, INP < 200 ms.
- Marketing route JS < 100 kB gzipped (excluding framework).
- No client-side data fetching on marketing pages.

## Out of scope (v1)
Blog, careers, localisation, CMS, live chat.
