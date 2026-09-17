# Website content

Typed content files rendered by `app/(marketing)`. Change copy here; the pages
re-render on the next build. Keep placeholders honest: never invent client
names, metrics or people.

## Content gaps before launch (OD-7)

| File | What is needed | Owner |
|---|---|---|
| `site.ts` | Real contact email (`contactEmail`), founding year, social links if any | Founders |
| `services.ts` | Confirm the seven service areas; decide on Technical Consulting; review the AI-assisted systems copy (`placeholder: true`) | Founders + marketing |
| `work.ts` | At least two real case studies with client permission (or "Confidential client"), factual outcomes only; remove the two `placeholder: true` examples | Marketing |
| `team.ts` | Names, roles, one-line bios for the five team members | Marketing |
| `about` page | Company story paragraph (currently marked placeholder) | Founders |
| `privacy` page | Legal review, named data controller, retention period confirmation | Founders |
| `images.ts` | Replace the Unsplash placeholder photos with Malhot's own team and office photography (same aspect ratios); then remove `images.unsplash.com` from `next.config.ts` | Marketing |

Search for `placeholder: true` and `PlaceholderMark` to find every marked spot.

## Rules

- Malhot OS is internal. The website never shows it, names it or describes its screens.
- No invented clients, metrics, quotes or people. Placeholders are marked `placeholder: true` and render a visible marker.
