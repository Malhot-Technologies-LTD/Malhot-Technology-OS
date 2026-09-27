"use client";

import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPublishedLink, setSocialPostStatus } from "@/features/social/actions";

import { nextStatus, POST_STATUS_META, type PostStatus } from "../schemas";
import type { SocialAccountRow } from "../stats";
import { PlatformBadge } from "./platform-badge";

/** One click along the pipeline: Draft → Approved, Scheduled → Published… */
export function AdvanceStatusButton({ postId, status }: { postId: string; status: PostStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = nextStatus(status);
  if (!next) return null;

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setSocialPostStatus({ id: postId, status: next });
          if (!result.ok) {
            toast.error(result.error.message);
            return;
          }
          toast.success(`Marked ${POST_STATUS_META[next].label.toLowerCase()}`);
          router.refresh();
        })
      }
    >
      {next === "published" ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
      {next === "published" ? "Mark published" : `Move to ${POST_STATUS_META[next].label}`}
    </Button>
  );
}

/** Where the post went live on each channel, so anyone can find it later. */
export function PublishedLinks({
  postId,
  channels,
  accounts,
}: {
  postId: string;
  channels: readonly { account_id: string; published_url: string | null }[];
  accounts: readonly SocialAccountRow[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {channels.map((channel) => {
        const account = accounts.find((candidate) => candidate.id === channel.account_id);
        if (!account) return null;
        return <LinkRow key={channel.account_id} postId={postId} account={account} url={channel.published_url} />;
      })}
    </ul>
  );
}

function LinkRow({ postId, account, url }: { postId: string; account: SocialAccountRow; url: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(url ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== (url ?? "");
  const id = `link-${account.id}`;

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await setPublishedLink({ postId, accountId: account.id, url: value });
      if (!result.ok) {
        toast.error(result.error.fieldErrors?.url?.[0] ?? result.error.message);
        return;
      }
      toast.success("Link saved");
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
      <label htmlFor={id} className="w-56 shrink-0">
        <PlatformBadge platform={account.platform} handle={account.handle} />
      </label>
      <form onSubmit={save} className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          id={id}
          type="url"
          value={value}
          placeholder="https:// link to the live post"
          onChange={(event) => setValue(event.target.value)}
        />
        {url && !dirty ? (
          <Button asChild variant="outline" size="icon-sm">
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open on ${account.platform}`}>
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <Button type="submit" variant="outline" size="sm" disabled={pending || !dirty}>
            Save
          </Button>
        )}
      </form>
    </li>
  );
}
