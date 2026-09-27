"use client";

import { Folder, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { createFolder, moveFile, moveFolder, renameFile, renameFolder } from "../actions";
import { MAX_FOLDER_NAME, folderHref, moveTargets, type FileRow, type FolderRow } from "../tree";

type NameState =
  { mode: "create" } | { mode: "rename"; folder: FolderRow } | { mode: "renameFile"; file: FileRow } | null;

/** New folder, rename folder and rename file: one name field, one button. */
export function NameDialog({
  state,
  parentId,
  canRestrict,
  onClose,
}: {
  state: NameState;
  parentId: string | null;
  canRestrict: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so each opening starts from that item's name, not the last one typed. */}
        {state ? (
          <NameForm
            key={state.mode === "create" ? "create" : state.mode === "rename" ? state.folder.id : state.file.id}
            state={state}
            parentId={parentId}
            canRestrict={canRestrict}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  state,
  parentId,
  canRestrict,
  onClose,
}: {
  state: NonNullable<NameState>;
  parentId: string | null;
  canRestrict: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const initial = state.mode === "create" ? "" : state.mode === "rename" ? state.folder.name : state.file.title;
  const [name, setName] = useState(initial);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isFile = state.mode === "renameFile";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        state.mode === "create"
          ? await createFolder({ parentId, name, restricted })
          : state.mode === "rename"
            ? await renameFolder({ id: state.folder.id, name })
            : await renameFile({ id: state.file.id, title: name });
      if (!result.ok) {
        setError(Object.values(result.error.fieldErrors ?? {})[0]?.[0] ?? result.error.message);
        return;
      }
      onClose();
      if (state.mode === "create" && result.data && typeof result.data === "object" && "id" in result.data) {
        toast.success(`Created ${name.trim()}`, {
          action: { label: "Open", onClick: () => router.push(folderHref((result.data as { id: string }).id)) },
        });
      } else {
        toast.success("Renamed");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{state.mode === "create" ? "New folder" : isFile ? "Rename file" : "Rename folder"}</DialogTitle>
        <DialogDescription>
          {state.mode === "create"
            ? "Everyone in the company can see it unless you make it admins only."
            : "The new name shows everywhere this appears."}
        </DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{isFile ? "Title" : "Folder name"}</span>
        <Input
          autoFocus
          value={name}
          maxLength={isFile ? 200 : MAX_FOLDER_NAME}
          placeholder={isFile ? undefined : "e.g. Client contracts"}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "name-error" : undefined}
        />
      </label>
      {state.mode === "create" && canRestrict ? (
        <label className="flex items-start gap-3 rounded-md border border-border p-3">
          <Checkbox
            checked={restricted}
            onCheckedChange={(checked) => setRestricted(checked === true)}
            disabled={pending}
          />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-3.5" aria-hidden="true" /> Admins only
            </span>
            <span className="text-[13px] text-fg-muted">
              For contracts, pay and HR paperwork. Only admins see it and everything inside it.
            </span>
          </span>
        </label>
      ) : null}
      {error ? (
        <p id="name-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending || name.trim() === "" || name.trim() === initial} aria-busy={pending}>
          {pending ? "Saving…" : state.mode === "create" ? "Create folder" : "Rename"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type MoveSubject =
  { kind: "folder"; id: string; name: string } | { kind: "file"; id: string; name: string; folderId: string | null };

const TOP = "__top__";

/** Pick a destination folder; places an item cannot go are simply not offered. */
export function MoveDialog({
  subject,
  folders,
  onClose,
}: {
  subject: MoveSubject | null;
  folders: readonly FolderRow[];
  onClose: () => void;
}) {
  return (
    <Dialog open={subject !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        {subject ? <MoveForm key={subject.id} subject={subject} folders={folders} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MoveForm({
  subject,
  folders,
  onClose,
}: {
  subject: MoveSubject;
  folders: readonly FolderRow[];
  onClose: () => void;
}) {
  const targets = moveTargets(
    folders,
    subject.kind === "folder" ? { kind: "folder", id: subject.id } : { kind: "file", folderId: subject.folderId },
  );
  const [choice, setChoice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needle = filter.trim().toLowerCase();
  const shown = needle ? targets.folders.filter((path) => path.path.toLowerCase().includes(needle)) : targets.folders;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (choice === null) return;
    const to = choice === TOP ? null : choice;
    setError(null);
    startTransition(async () => {
      const result =
        subject.kind === "folder"
          ? await moveFolder({ id: subject.id, parentId: to })
          : await moveFile({ id: subject.id, folderId: to });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onClose();
      toast.success(`Moved ${subject.name}`);
    });
  }

  const option = (value: string, label: string, depth: number, restricted: boolean) => (
    <label
      key={value}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg-subtle has-[:checked]:bg-brand-subtle has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
      )}
      style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
    >
      <input
        type="radio"
        name="destination"
        value={value}
        checked={choice === value}
        onChange={() => setChoice(value)}
        className="sr-only"
      />
      <Folder className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {restricted ? <Lock className="ml-auto size-3.5 shrink-0 text-fg-subtle" aria-label="Admins only" /> : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Move {subject.name}</DialogTitle>
        <DialogDescription>Moving into an admins-only folder makes it admins only too.</DialogDescription>
      </DialogHeader>
      {targets.folders.length > 8 ? (
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Find a folder"
          aria-label="Find a folder"
        />
      ) : null}
      <fieldset className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-1.5">
        <legend className="sr-only">Destination</legend>
        {targets.top && !needle ? option(TOP, "Documents (top level)", 0, false) : null}
        {shown.map((path) =>
          option(
            path.id,
            needle ? path.path : path.path.split(" / ").at(-1)!,
            needle ? 0 : path.depth,
            path.restricted,
          ),
        )}
        {!targets.top && shown.length === 0 ? (
          <p className="px-2 py-3 text-sm text-fg-muted">
            {needle ? "No folder matches." : "There is nowhere else to move this yet. Make another folder first."}
          </p>
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending || choice === null} aria-busy={pending}>
          {pending ? "Moving…" : "Move here"}
        </Button>
      </DialogFooter>
    </form>
  );
}
