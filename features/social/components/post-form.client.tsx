"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSocialPost, deleteSocialPost, updateSocialPost } from "@/features/social/actions";
import { cn } from "@/lib/utils";

import {
  PLATFORM_META,
  POST_FORMATS,
  POST_FORMAT_LABEL,
  POST_STATUSES,
  POST_STATUS_META,
  type Platform,
  type PostFormat,
  type PostStatus,
} from "../schemas";
import type { SocialAccountRow, SocialPostRow } from "../stats";
import { fromWallTime, toWallTime } from "../format";
import { ConfirmDelete } from "./confirm-delete.client";
import { PlatformBadge } from "./platform-badge";

/** Caption limits as each platform documents them, for a warning before posting fails. */
const CAPTION_LIMIT: Partial<Record<Platform, number>> = {
  x: 280,
  threads: 500,
  instagram: 2200,
  tiktok: 2200,
  linkedin: 3000,
  youtube: 5000,
  facebook: 63206,
};

type Props = {
  accounts: readonly SocialAccountRow[];
  /** Absent for a new post. */
  post?: SocialPostRow;
  /** "YYYY-MM-DD" from the calendar's "add on this day". */
  defaultDate?: string;
  pillars: readonly string[];
  /** The reader's profile timezone: times are typed and shown on that clock. */
  timeZone: string;
};

export function PostForm({ accounts, post, defaultDate, pillars, timeZone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(post?.title ?? "");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? (defaultDate ? "draft" : "idea"));
  const [format, setFormat] = useState<PostFormat>(post?.format ?? "post");
  const [scheduledAt, setScheduledAt] = useState(
    post?.scheduled_at ? toWallTime(post.scheduled_at, timeZone) : defaultDate ? `${defaultDate}T10:00` : "",
  );
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [pillar, setPillar] = useState(post?.pillar ?? "");
  const [assetUrl, setAssetUrl] = useState(post?.asset_url ?? "");
  const [notes, setNotes] = useState(post?.notes ?? "");
  const [accountIds, setAccountIds] = useState<string[]>(post?.channels.map((channel) => channel.account_id) ?? []);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const chosenPlatforms = [
    ...new Set(accounts.filter((account) => accountIds.includes(account.id)).map((account) => account.platform)),
  ];
  const tooLong = chosenPlatforms.filter((platform) => {
    const limit = CAPTION_LIMIT[platform];
    return limit !== undefined && caption.length > limit;
  });

  function toggleAccount(id: string, checked: boolean) {
    setAccountIds((current) => (checked ? [...current, id] : current.filter((candidate) => candidate !== id)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      title,
      caption,
      format,
      status,
      // Typed on the reader's profile clock, sent as an instant.
      scheduledAt: scheduledAt ? fromWallTime(scheduledAt, timeZone) : "",
      pillar,
      assetUrl,
      notes,
      accountIds,
    };
    startTransition(async () => {
      const result = post ? await updateSocialPost(post.id, input) : await createSocialPost(input);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setErrors({});
      if (post) {
        toast.success("Post saved");
        router.refresh();
      } else {
        toast.success("Post added to the plan");
        router.push(`/os/social/posts/${(result.data as { id: string }).id}`);
      }
    });
  }

  function remove() {
    if (!post) return;
    startTransition(async () => {
      const result = await deleteSocialPost(post.id);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Post deleted");
      router.push("/os/social/posts");
    });
  }

  const fieldError = (name: string) =>
    errors[name]?.[0] ? (
      <span id={`${name}-error`} className="text-xs text-status-danger-fg">
        {errors[name][0]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Working title <span className="text-status-danger-fg">*</span>
            </span>
            <Input
              value={title}
              maxLength={120}
              placeholder="e.g. Client launch: Umoja attendance app"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              onChange={(event) => setTitle(event.target.value)}
            />
            {fieldError("title")}
          </label>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="caption" className="text-sm font-medium">
                Caption
              </label>
              <span className={cn("text-xs tabular-nums", tooLong.length ? "text-status-danger-fg" : "text-fg-subtle")}>
                {caption.length.toLocaleString("en-GB")} characters
              </span>
            </div>
            <Textarea
              id="caption"
              rows={9}
              maxLength={5000}
              value={caption}
              placeholder="What the post says, with hashtags and mentions"
              onChange={(event) => setCaption(event.target.value)}
            />
            {tooLong.length > 0 ? (
              <p className="text-xs text-status-danger-fg" role="status">
                Too long for{" "}
                {tooLong
                  .map(
                    (platform) =>
                      `${PLATFORM_META[platform].label} (${CAPTION_LIMIT[platform]!.toLocaleString("en-GB")} max)`,
                  )
                  .join(", ")}
                . Shorten it, or write a separate post for that platform.
              </p>
            ) : null}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Artwork / asset link</span>
            <Input
              type="url"
              value={assetUrl}
              placeholder="https://www.canva.com/design/…"
              aria-invalid={Boolean(errors.assetUrl)}
              aria-describedby={errors.assetUrl ? "assetUrl-error" : "assetUrl-hint"}
              onChange={(event) => setAssetUrl(event.target.value)}
            />
            {fieldError("assetUrl") ?? (
              <span id="assetUrl-hint" className="text-xs text-fg-subtle">
                Canva, Google Drive or Figma, wherever the design lives.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Notes</span>
            <Textarea
              rows={3}
              maxLength={2000}
              value={notes}
              placeholder="Who to tag, what to check before posting, feedback…"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-5 rounded-lg border border-border bg-bg-subtle/50 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-status" className="text-sm font-medium">
              Status
            </label>
            <Select value={status} onValueChange={(value) => setStatus(value as PostStatus)}>
              <SelectTrigger id="post-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {POST_STATUS_META[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-fg-subtle">{POST_STATUS_META[status].hint}</span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Goes out on{status === "scheduled" ? <span className="text-status-danger-fg"> *</span> : null}
            </span>
            <Input
              type="datetime-local"
              value={scheduledAt}
              aria-invalid={Boolean(errors.scheduledAt)}
              aria-describedby={errors.scheduledAt ? "scheduledAt-error" : undefined}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            {fieldError("scheduledAt") ?? (
              <span className="text-xs text-fg-subtle">{timeZone.replace(/_/g, " ")} time</span>
            )}
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-format" className="text-sm font-medium">
              Format
            </label>
            <Select value={format} onValueChange={(value) => setFormat(value as PostFormat)}>
              <SelectTrigger id="post-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_FORMATS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {POST_FORMAT_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Content pillar / campaign</span>
            <Input
              value={pillar}
              maxLength={60}
              list="social-pillars"
              placeholder="e.g. Behind the scenes"
              onChange={(event) => setPillar(event.target.value)}
            />
            <datalist id="social-pillars">
              {pillars.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Channels</legend>
            {accounts.length === 0 ? (
              <p className="text-xs text-fg-muted">
                No accounts yet. Add the company&apos;s accounts on the Accounts tab to pick where this goes out.
              </p>
            ) : (
              accounts.map((account) => {
                const id = `channel-${account.id}`;
                return (
                  <div key={account.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={id}
                      checked={accountIds.includes(account.id)}
                      onCheckedChange={(checked) => toggleAccount(account.id, checked === true)}
                    />
                    <label htmlFor={id} className="min-w-0 cursor-pointer">
                      <PlatformBadge platform={account.platform} handle={account.handle} />
                    </label>
                  </div>
                );
              })
            )}
          </fieldset>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {post ? (
          <ConfirmDelete
            label="Delete post"
            title="Delete this post?"
            description={`"${post.title}" and its published links are removed from the plan. This cannot be undone.`}
            disabled={pending}
            onConfirm={remove}
          />
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : post ? "Save changes" : "Add to plan"}
        </Button>
      </div>
    </form>
  );
}
