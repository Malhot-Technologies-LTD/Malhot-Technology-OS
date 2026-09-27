import { AlertTriangle, CheckCircle2, ExternalLink, Link2 } from "lucide-react";

import { EmptyState } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";

import { quietFor, slot } from "../format";
import { engagementRate } from "../instagram/figures";
import type { ConnectionStatus, MediaStat } from "../queries";
import { DisconnectButton, SyncNowButton } from "./instagram-buttons.client";

/** What `?instagram=` on the account page means, after the login round trip. */
export const OUTCOME: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Instagram connected and synced." },
  connected_sync_failed: {
    tone: "warning",
    text: "Instagram connected, but the first sync failed. Try Sync now; the daily sync will also retry.",
  },
  denied: { tone: "warning", text: "Instagram access was not granted, so nothing was connected." },
  expired: { tone: "warning", text: "That login took too long or was opened in another browser. Start again." },
  not_instagram: { tone: "danger", text: "Only an Instagram account can be connected to Instagram." },
  not_configured: {
    tone: "danger",
    text: "The Instagram app keys are not set on this server (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, SOCIAL_TOKEN_KEY).",
  },
  save_failed: { tone: "danger", text: "Instagram answered, but the connection could not be saved. Try again." },
  failed: {
    tone: "danger",
    text: "Instagram refused the connection. Check the account is a Professional (Business or Creator) account and is added as an Instagram Tester on the Meta app.",
  },
};

const TONE_CLASS = {
  success: "border-status-success-border bg-status-success-bg text-status-success-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
};

const STEP: Record<string, string> = {
  settings: "reading the app keys on this server",
  code: "trading Instagram's login code for access (check the redirect URL and the Instagram app secret)",
  long_lived: "turning the 1-hour access into 60-day access",
  profile: "reading the account's profile",
};

export function OutcomeBanner({
  outcome,
  step,
  detail,
}: {
  outcome: string | undefined;
  step?: string;
  detail?: string;
}) {
  const meta = outcome ? OUTCOME[outcome] : undefined;
  if (!meta) return null;
  const where = step ? STEP[step] : undefined;
  return (
    <div role="status" className={`flex flex-col gap-1 rounded-md border px-4 py-3 text-sm ${TONE_CLASS[meta.tone]}`}>
      <p>{meta.text}</p>
      {where ? <p>Failed while {where}.</p> : null}
      {detail ? <p className="font-mono text-xs break-words">Instagram said: {detail.slice(0, 200)}</p> : null}
    </div>
  );
}

const number = new Intl.NumberFormat("en-GB");
const cell = (value: number | null) => (value === null ? "—" : number.format(value));

/**
 * The Instagram side of an account: connect it, or see when it last synced,
 * what went wrong, and how its latest posts did.
 */
export function InstagramConnection({
  accountId,
  handle,
  connection,
  media,
  configured,
  timeZone,
  now,
}: {
  accountId: string;
  handle: string;
  connection: ConnectionStatus | null;
  media: readonly MediaStat[];
  configured: boolean;
  timeZone: string;
  now: number;
}) {
  if (!connection) {
    return (
      <Panel title="Instagram connection" description="Sync followers and post figures from Instagram every day.">
        <div className="flex flex-col gap-4 text-sm text-fg-muted">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>The account must be a Professional account (Business or Creator).</li>
            <li>
              While the Meta app is in development mode, the account must be added as an Instagram Tester and accept.
            </li>
            <li>Read-only: the OS reads figures and never posts or comments.</li>
          </ul>
          {configured ? (
            <Button asChild className="w-fit">
              {/* A plain link: the route redirects to Instagram, which a fetch could not follow. */}
              <a href={`/api/integrations/instagram/connect?account=${accountId}`}>
                <Link2 aria-hidden="true" /> Connect Instagram
              </a>
            </Button>
          ) : (
            <p className="text-status-danger-fg">
              Not available yet: the Instagram app keys are not set on this server.
            </p>
          )}
        </div>
      </Panel>
    );
  }

  const daysLeft = connection.token_expires_at
    ? Math.floor((Date.parse(connection.token_expires_at) - now) / 86_400_000)
    : null;
  const lastSynced = connection.last_synced_at
    ? Math.floor((now - Date.parse(connection.last_synced_at)) / 86_400_000)
    : null;

  return (
    <Panel
      title="Instagram connection"
      description={`Connected as @${connection.username ?? handle}`}
      action={
        <div className="flex flex-wrap gap-2">
          <SyncNowButton accountId={accountId} />
          <DisconnectButton accountId={accountId} handle={connection.username ?? handle} />
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-fg-subtle">Last synced</dt>
            <dd className="font-medium">
              {connection.last_synced_at
                ? `${quietFor(lastSynced)} · ${slot(connection.last_synced_at, timeZone)}`
                : "Not yet"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-fg-subtle">Status</dt>
            <dd>
              {connection.last_sync_error ? (
                <StatusPill tone="danger">Needs attention</StatusPill>
              ) : (
                <StatusPill tone="success">
                  <CheckCircle2 className="mr-1 size-3.5" aria-hidden="true" /> Syncing daily
                </StatusPill>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-fg-subtle">Access renews</dt>
            <dd className="font-medium">
              {daysLeft === null
                ? "Automatically"
                : daysLeft < 0
                  ? "Expired: reconnect"
                  : `Automatically (${daysLeft} days left)`}
            </dd>
          </div>
        </dl>

        {connection.last_sync_error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {connection.last_sync_error}
            </span>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/integrations/instagram/connect?account=${accountId}`}>Reconnect</a>
            </Button>
          </div>
        ) : null}

        {media.length === 0 ? (
          <EmptyState
            variant="well"
            title="No posts synced yet"
            description="Posts and their figures appear after the first sync."
          />
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">Recent Instagram posts and their figures</caption>
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th scope="col" className="px-1 pb-2 font-medium">
                    Post
                  </th>
                  <th scope="col" className="px-1 pb-2 text-right font-medium">
                    Reach
                  </th>
                  <th scope="col" className="px-1 pb-2 text-right font-medium">
                    Likes
                  </th>
                  <th scope="col" className="px-1 pb-2 text-right font-medium">
                    Comments
                  </th>
                  <th scope="col" className="px-1 pb-2 text-right font-medium">
                    Saves
                  </th>
                  <th scope="col" className="px-1 pb-2 text-right font-medium">
                    Shares
                  </th>
                  <th scope="col" className="px-1 pb-2 text-right font-medium">
                    Engagement
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {media.slice(0, 12).map((post) => {
                  const rate = engagementRate(post);
                  return (
                    <tr key={post.external_id}>
                      <td className="max-w-[22rem] px-1 py-2.5">
                        {post.permalink ? (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 font-medium hover:underline"
                          >
                            <span className="truncate">{post.caption?.split("\n")[0] || "Untitled post"}</span>
                            <ExternalLink className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="block truncate font-medium">{post.caption || "Untitled post"}</span>
                        )}
                        <span className="text-xs text-fg-subtle">
                          {post.posted_at ? slot(post.posted_at, timeZone) : ""}
                          {post.product_type === "REELS" ? " · Reel" : ""}
                        </span>
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums">{cell(post.reach)}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">{cell(post.likes)}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">{cell(post.comments)}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">{cell(post.saves)}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">{cell(post.shares)}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {rate === null ? "—" : `${(rate * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}
