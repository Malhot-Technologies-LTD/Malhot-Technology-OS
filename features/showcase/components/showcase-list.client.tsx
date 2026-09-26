"use client";

import { ArrowDown, ArrowUp, ExternalLink, FolderKanban, ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/os/empty-state";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { moveShowcase, setShowcasePublished } from "@/features/showcase/actions";
import type { ShowcaseListRow } from "@/features/showcase/queries";

/**
 * Settings → Website: every project, and whether the public site shows it.
 *
 * Projects with a website entry come first, in website order, with a switch to
 * show or hide them and arrows to reorder. The rest are one click from being
 * set up. Nothing is published by setting it up: the switch is the only thing
 * that puts a project in front of visitors.
 */
export function ShowcaseList({ rows }: { rows: readonly ShowcaseListRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Create a project first. Once it exists you can choose to show it on the website here."
        action={
          <Button asChild variant="outline">
            <Link href="/os/projects/new">New project</Link>
          </Button>
        }
      />
    );
  }

  const listed = rows.filter((row) => row.showcase);
  const others = rows.filter((row) => !row.showcase);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="website-listed" className="flex flex-col gap-3">
        <h3 id="website-listed" className="text-[15px] font-medium">
          Set up for the website
        </h3>
        {listed.length === 0 ? (
          <p className="rounded-md border border-border bg-bg-subtle p-4 text-sm text-fg-muted">
            None yet. Pick a project below to write its case study and add photos.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {listed.map((row, index) => (
              <ListedRow key={row.projectId} row={row} isFirst={index === 0} isLast={index === listed.length - 1} />
            ))}
          </ol>
        )}
      </section>

      {others.length > 0 ? (
        <section aria-labelledby="website-others" className="flex flex-col gap-3">
          <h3 id="website-others" className="text-[15px] font-medium">
            Not on the website
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            {others.map((row) => (
              <li key={row.projectId} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="font-mono text-xs text-fg-subtle">{row.key}</span>
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/os/settings/website/${row.key}`}>Add to website</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ListedRow({ row, isFirst, isLast }: { row: ShowcaseListRow; isFirst: boolean; isLast: boolean }) {
  const [pending, startTransition] = useTransition();
  const showcase = row.showcase!;
  const switchId = `publish-${row.projectId}`;

  const togglePublished = (published: boolean) =>
    startTransition(async () => {
      const result = await setShowcasePublished({ projectId: row.projectId, published });
      if (result.ok) toast.success(published ? `${showcase.title} is on the website` : `${showcase.title} is hidden`);
      else toast.error(result.error.message);
    });

  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      const result = await moveShowcase({ projectId: row.projectId, direction });
      if (!result.ok) toast.error(result.error.message);
    });

  return (
    <li
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center"
      aria-busy={pending}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-md border border-border bg-bg-subtle">
          {showcase.cover ? (
            <Image src={showcase.cover.url} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <ImageIcon aria-hidden className="absolute inset-0 m-auto size-5 text-fg-subtle" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/os/settings/website/${row.key}`}
            className="truncate font-medium underline-offset-4 hover:underline"
          >
            {showcase.title}
          </Link>
          <span className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            {showcase.published ? (
              <StatusPill tone="success">On the website</StatusPill>
            ) : (
              <StatusPill tone="neutral">Hidden</StatusPill>
            )}
            <span>
              {showcase.photoCount === 0
                ? "No photos"
                : `${showcase.photoCount} photo${showcase.photoCount === 1 ? "" : "s"}`}
            </span>
            {showcase.published ? (
              <a
                href={`/projects/${showcase.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
              >
                View <ExternalLink aria-hidden className="size-3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-2">
        <label htmlFor={switchId} className="flex items-center gap-2 text-sm text-fg-muted">
          <Switch id={switchId} checked={showcase.published} onCheckedChange={togglePublished} disabled={pending} />
          Show
        </label>
        <div className="ml-auto flex gap-1 sm:ml-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => move("up")}
            disabled={pending || isFirst}
            aria-label={`Move ${showcase.title} up`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => move("down")}
            disabled={pending || isLast}
            aria-label={`Move ${showcase.title} down`}
          >
            <ArrowDown aria-hidden />
          </Button>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/os/settings/website/${row.key}`}>Edit</Link>
        </Button>
      </div>
    </li>
  );
}
