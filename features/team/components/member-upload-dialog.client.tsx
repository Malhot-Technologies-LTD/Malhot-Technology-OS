"use client";

import { FileUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAX_FILE_BYTES, formatBytes } from "@/features/documents/files";
import { recordMemberUpload } from "@/features/team/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import {
  MEMBER_ACCEPT,
  MEMBER_DOC_KINDS,
  MEMBER_DOC_KIND_LABEL,
  MEMBER_FILES_BUCKET,
  MEMBER_MIME_TYPES,
  memberDocumentPath,
  type MemberDocKind,
} from "../schemas";

/**
 * Upload a signed contract, ID copy or certificate to one person. The file
 * goes straight to the private member-files bucket; only admins and the person
 * can open it.
 */
export function MemberUploadDialog({
  userId,
  organizationId,
  firstName,
}: {
  userId: string;
  organizationId: string;
  firstName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<MemberDocKind>("contract");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function choose(next: File | null) {
    setError(null);
    if (!next) return;
    if (!MEMBER_MIME_TYPES.includes(next.type)) {
      setError("That file type is not accepted. Use PDF, Word, Excel, text or an image.");
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setError(`That file is ${formatBytes(next.size)}. Files can be up to 25 MB.`);
      return;
    }
    setFile(next);
    if (!title)
      setTitle(
        next.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim(),
      );
  }

  function reset() {
    setFile(null);
    setTitle("");
    setKind("contract");
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    startTransition(async () => {
      const path = memberDocumentPath(organizationId, userId, file.name, crypto.randomUUID());
      const stored = await createClient()
        .storage.from(MEMBER_FILES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (stored.error) {
        setError(
          /bucket not found/i.test(stored.error.message)
            ? "File storage for people is not set up yet. Ask an admin to apply the latest database migration."
            : `The file could not be uploaded: ${stored.error.message}`,
        );
        return;
      }
      const result = await recordMemberUpload({
        userId,
        path,
        title,
        kind,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      if (!result.ok) {
        setError(Object.values(result.error.fieldErrors ?? {})[0]?.[0] ?? result.error.message);
        return;
      }
      toast.success(`${title} added to ${firstName}'s documents`);
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload aria-hidden="true" /> Upload file
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Upload to {firstName}&apos;s documents</DialogTitle>
            <DialogDescription>Only admins and {firstName} can open it. Up to 25 MB.</DialogDescription>
          </DialogHeader>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              choose(event.dataTransfer.files[0] ?? null);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors",
              dragging ? "border-brand bg-brand-subtle" : "border-border bg-bg-subtle",
            )}
          >
            <FileUp className="size-7 text-fg-subtle" aria-hidden="true" />
            {file ? (
              <p className="text-sm">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-fg-muted">· {formatBytes(file.size)}</span>
              </p>
            ) : (
              <p className="text-sm text-fg-muted">Drop a file here, or</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={pending}>
              {file ? "Choose another" : "Choose a file"}
            </Button>
            <input
              ref={input}
              type="file"
              accept={MEMBER_ACCEPT}
              className="sr-only"
              aria-label="File to upload"
              onChange={(event) => choose(event.target.files?.[0] ?? null)}
            />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Title</span>
            <Input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              disabled={pending}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-doc-kind" className="text-sm font-medium">
              Kind of document
            </label>
            <Select value={kind} onValueChange={(value) => setKind(value as MemberDocKind)} disabled={pending}>
              <SelectTrigger id="member-doc-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMBER_DOC_KINDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {MEMBER_DOC_KIND_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Button type="submit" disabled={pending || !file || title.trim() === ""} aria-busy={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
