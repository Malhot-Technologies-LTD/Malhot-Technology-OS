"use client";

import { ExternalLink, GitBranch, Lock, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectRepository, disconnectRepository } from "@/features/github/actions";
import type { RepositoryRow } from "@/features/github/queries";

type Props = {
  projectId: string;
  repositories: readonly RepositoryRow[];
  /** Managers and org admins only; everyone else reads. */
  canManage: boolean;
};

/**
 * Where this project's code lives.
 *
 * The connection is recorded by name, not fetched — the GitHub App in
 * integrations.md is not built, so `default_branch` and `is_private` stay null
 * and the row says "not synced yet" rather than inventing "main". Guessing here
 * would be worse than silence: a branch name shown beside a repository reads as
 * fact, and nobody would think to doubt it.
 */
export function RepositoryList({ projectId, repositories, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function connect() {
    if (value.trim() === "") return;
    setFieldError(null);
    startTransition(async () => {
      const result = await connectRepository({ projectId, repository: value });
      if (result.ok) {
        toast.success("Repository connected.");
        setValue("");
        return;
      }
      // One field, so the message belongs against it. A toast would leave the
      // input looking accepted.
      setFieldError(result.error.fieldErrors?.repository?.[0] ?? result.error.message);
    });
  }

  function disconnect(repository: RepositoryRow) {
    startTransition(async () => {
      const result = await disconnectRepository({ repositoryId: repository.id });
      if (result.ok) toast.success(`${repository.full_name} is no longer connected.`);
      else toast.error(result.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {repositories.length === 0 ? (
        <p className="text-[15px] text-fg-muted">
          {canManage
            ? "No repository connected. Paste a GitHub URL below to record where this project's code lives."
            : "No repository connected yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {repositories.map((repository) => (
            <li key={repository.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-1">
                <a
                  href={repository.html_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium hover:underline"
                >
                  <span className="truncate">{repository.full_name}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <span className="sr-only">(opens on GitHub)</span>
                </a>
                <p className="flex items-center gap-2 text-xs text-fg-subtle">
                  {repository.default_branch ? (
                    <span className="flex items-center gap-1">
                      <GitBranch className="size-3" aria-hidden="true" />
                      {repository.default_branch}
                    </span>
                  ) : null}
                  {repository.is_private ? (
                    <span className="flex items-center gap-1">
                      <Lock className="size-3" aria-hidden="true" />
                      private
                    </span>
                  ) : null}
                  {repository.last_synced_at === null ? <span>Not synced yet</span> : null}
                </p>
              </div>

              {canManage ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label={`Delete ${repository.full_name}`}
                      className="shrink-0 text-fg-muted"
                    >
                      <Trash2 aria-hidden="true" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect {repository.full_name}?</AlertDialogTitle>
                      {/*
                       * Says what is *not* happening, first. "Delete" beside a
                       * repository name reads as deleting the repository, and
                       * that is the one fear worth answering before the button
                       * is pressed rather than after.
                       */}
                      <AlertDialogDescription>
                        The repository itself is untouched — nothing is removed from GitHub. This only clears the link,
                        so this project stops recording where its code lives. You can connect it again at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep it</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => disconnect(repository)}>
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <label htmlFor="connect-repository" className="sr-only">
                Repository URL or owner/name
              </label>
              <Input
                id="connect-repository"
                value={value}
                placeholder="github.com/owner/name"
                disabled={pending}
                aria-invalid={fieldError !== null}
                aria-describedby={fieldError ? "connect-repository-error" : "connect-repository-hint"}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (fieldError) setFieldError(null);
                }}
                onKeyDown={(event) => {
                  // Enter submits: one field, and reaching for the mouse to
                  // confirm a single pasted value is friction with no purpose.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    connect();
                  }
                }}
              />
            </div>
            <Button type="button" onClick={connect} disabled={pending || value.trim() === ""}>
              <Plus aria-hidden="true" /> Connect
            </Button>
          </div>
          {fieldError ? (
            <p id="connect-repository-error" role="alert" className="text-xs text-status-danger-fg">
              {fieldError}
            </p>
          ) : (
            <p id="connect-repository-hint" className="text-xs text-fg-subtle">
              Paste the address from your browser, or the clone URL — anything naming the owner and repository.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
