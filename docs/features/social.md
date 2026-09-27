# Feature: Social media

## Purpose
Give the social media manager one place to plan posts and run the company's accounts on every platform: a content calendar, a pipeline from idea to published, and a dashboard that says what is going out, what is slipping and which accounts have gone quiet.

## Who
Org admins, and members an admin gives the `social_media` duty on Settings → Members (`product/user-roles.md#duties`). Nobody else sees the section; the pages 404 and RLS returns no rows.

## Scope: plan and track, not auto-publish
The OS does not post to the platforms. The manager publishes on each app, marks the post published and pastes the live link. Posting through the platforms' APIs needs a developer app approved by each of Meta, LinkedIn, TikTok and X (X's API is paid), so it is a separate project. No credentials are stored: passwords belong in the company password manager, and the forms say so.

## Data (`supabase/migrations/20260927150000_social_media.sql`)
- `social_accounts`: platform, handle (unique per platform, case-insensitive), profile link, status `active | paused | planned`, follower count typed in by hand with the time it was updated.
- `social_posts`: working title, caption, format, status `idea → draft → approved → scheduled → published`, `scheduled_at`, `published_at` (stamped by trigger on publishing), content pillar, artwork link (Canva/Drive/Figma, files are not stored), notes. A scheduled post must have a time (CHECK).
- `social_post_channels`: which accounts a post goes out on, with the live link on each. Composite foreign keys keep a post and its accounts in the same organisation.

## Pages (`app/(os)/os/social`)
| Page | What it shows |
|---|---|
| Overview | Tiles (next 7 days, published this month vs last, drafts to approve, at risk, accounts), posts per week (8 weeks), posts per platform (30 days), coming up (14 days), needs attention (missed slots, approved without a date), account table with followers, last and next post |
| Calendar | Month grid of dated posts on the reader's clock; "+" on a day plans a post for it |
| Posts | Every post, filtered by status |
| Post page | Pipeline stepper, one-click "move to next status", editor, live links once published |
| Accounts | Every account with followers, posts in 30 days, last post; each opens an edit page |

## Rules worth knowing
- **Quiet account**: active, nothing published for 7 days (`QUIET_DAYS`) and nothing scheduled. A gap already filled is not flagged.
- **Times** are typed and shown on the reader's profile timezone (`features/social/format.ts`), so the server render, the browser and the calendar agree.
- **Caption limits** (X 280, Threads 500, Instagram/TikTok 2,200, LinkedIn 3,000…) warn in the editor for the channels picked; they do not block saving.
- All dashboard maths is pure and tested: `features/social/stats.ts`.

## Connected accounts (Instagram)
An Instagram account listed under Accounts can be connected with **Connect Instagram** (Instagram API with Instagram Login, API v25.0, read-only scopes `instagram_business_basic` and `instagram_business_manage_insights`). The account must be Professional (Business or Creator); while the Meta app is in development mode it must also be an Instagram Tester on the app.

- **Flow:** `/api/integrations/instagram/connect` (checks `social.manage`, sets a one-time state cookie) → Instagram → `/api/integrations/instagram/callback` (verifies state, code → 1-hour token → 60-day token, stores it, runs the first sync). The callback URL must be registered in the Meta app exactly: `https://<production domain>/api/integrations/instagram/callback`.
- **Tokens** are sealed with AES-256-GCM (`SOCIAL_TOKEN_KEY`) and stored in `social_connections.token_ciphertext`, a column no browser-facing role may read. All writes go through `lib/supabase/elevated/social-connections.ts`. Tokens renew automatically in their last 14 days.
- **Sync** (`features/social/instagram/sync.ts`): daily by Vercel Cron (`/api/cron/social-sync`, 03:00 UTC, `CRON_SECRET`) and on "Sync now". Writes today's followers, yesterday's reach/views/engaged/interactions (`social_account_snapshots`), and the latest 50 posts with likes, comments, saves, shares, reach, views (`social_media_stats`, insights for posts under 90 days old). A figure Instagram declines stays empty; a lost login marks the connection "reconnect".
- **Where it shows:** the Overview's Instagram section (followers, gained in 30 days, reach, engagement, reach per day, best posts), the account page (status, recent posts), and a planned post's page once its live link matches a synced post (matched by shortcode).
- **Disconnect** forgets the token; figures stay. The app remains listed in Instagram's Apps and websites until removed there.

## Not built yet (candidates)
LinkedIn/TikTok/X connections, image uploads, approval by a second person, per-platform caption variants, auto-publishing through the platforms' APIs.
