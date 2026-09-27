"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSocialAccount, deleteSocialAccount, updateSocialAccount } from "@/features/social/actions";

import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_META,
  PLATFORMS,
  PLATFORM_META,
  type AccountStatus,
  type Platform,
} from "../schemas";
import type { SocialAccountRow } from "../stats";
import { ConfirmDelete } from "./confirm-delete.client";

/** Adds or edits one of the company's accounts. Credentials never go here. */
export function AccountForm({ account }: { account?: SocialAccountRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [platform, setPlatform] = useState<Platform>(account?.platform ?? "instagram");
  const [handle, setHandle] = useState(account?.handle ?? "");
  const [profileUrl, setProfileUrl] = useState(account?.profile_url ?? "");
  const [status, setStatus] = useState<AccountStatus>(account?.status ?? "active");
  const [followers, setFollowers] = useState(account?.followers?.toString() ?? "");
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { platform, handle, profileUrl, status, followers, notes };
    startTransition(async () => {
      const result = account ? await updateSocialAccount(account.id, input) : await createSocialAccount(input);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(account ? "Account saved" : "Account added");
      router.push("/os/social/accounts");
      router.refresh();
    });
  }

  function remove() {
    if (!account) return;
    startTransition(async () => {
      const result = await deleteSocialAccount(account.id);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Account removed");
      router.push("/os/social/accounts");
    });
  }

  const error = (name: string) =>
    errors[name]?.[0] ? (
      <span id={`${name}-error`} className="text-xs text-status-danger-fg">
        {errors[name][0]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-platform" className="text-sm font-medium">
            Platform
          </label>
          <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
            <SelectTrigger id="account-platform" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((value) => (
                <SelectItem key={value} value={value}>
                  {PLATFORM_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Handle or page name <span className="text-status-danger-fg">*</span>
          </span>
          <Input
            value={handle}
            maxLength={80}
            placeholder="malhottech"
            aria-invalid={Boolean(errors.handle)}
            aria-describedby={errors.handle ? "handle-error" : undefined}
            onChange={(event) => setHandle(event.target.value)}
          />
          {error("handle")}
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Profile link</span>
          <Input
            type="url"
            value={profileUrl}
            placeholder="https://www.instagram.com/malhottech"
            aria-invalid={Boolean(errors.profileUrl)}
            aria-describedby={errors.profileUrl ? "profileUrl-error" : undefined}
            onChange={(event) => setProfileUrl(event.target.value)}
          />
          {error("profileUrl")}
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-status" className="text-sm font-medium">
            Status
          </label>
          <Select value={status} onValueChange={(value) => setStatus(value as AccountStatus)}>
            <SelectTrigger id="account-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ACCOUNT_STATUS_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Followers</span>
          <Input
            inputMode="numeric"
            value={followers}
            placeholder="e.g. 1250"
            aria-invalid={Boolean(errors.followers)}
            aria-describedby={errors.followers ? "followers-error" : "followers-hint"}
            onChange={(event) => setFollowers(event.target.value)}
          />
          {error("followers") ?? (
            <span id="followers-hint" className="text-xs text-fg-subtle">
              From the platform&apos;s insights. Update it now and then to track growth.
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Notes</span>
          <Textarea
            rows={3}
            maxLength={2000}
            value={notes}
            placeholder="Posting rhythm, audience, who else has access… Never passwords: keep those in the password manager."
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {account ? (
          <ConfirmDelete
            label="Remove account"
            title="Remove this account?"
            description={`@${account.handle} is removed from the OS, along with its channel on every planned post. The account itself on ${PLATFORM_META[account.platform].label} is not touched.`}
            disabled={pending}
            onConfirm={remove}
          />
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : account ? "Save account" : "Add account"}
        </Button>
      </div>
    </form>
  );
}
