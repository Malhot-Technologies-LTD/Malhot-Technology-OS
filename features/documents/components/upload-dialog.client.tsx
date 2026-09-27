"use client";

import { FileUp, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { recordUpload } from "@/features/documents/actions";
import {
  ACCEPTED_MIME_TYPES,
  ACCEPT_ATTRIBUTE,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABEL,
  MAX_FILE_BYTES,
  PROJECT_FILES_BUCKET,
  documentPath,
  formatBytes,
} from "@/features/documents/files";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/types/domain";

/**
 * Upload one file to a project's documents. The file goes straight from the
 * browser to private storage; only then is the record written, and a failed
 * record removes the upload again (see recordUpload).
 */
export function UploadDocumentDialog({ projectKey, projectId }: { projectKey: string; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("other");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function choose(next: File | null) {
    setError(null);
    if (!next) return;
    if (!ACCEPTED_MIME_TYPES.includes(next.type)) {
      setError("That file type is not accepted. Use PDF, Word, Excel, PowerPoint, text, CSV, an image or a ZIP.");
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
    setType("other");
    setDescription("");
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const path = documentPath(projectId, file.name, crypto.randomUUID());
      const stored = await supabase.storage
        .from(PROJECT_FILES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (stored.error) {
        setError(
          /bucket not found/i.test(stored.error.message)
            ? "File storage is not set up yet. Ask an admin to apply the latest database migration."
            : `The file could not be uploaded: ${stored.error.message}`,
        );
        return;
      }
      const result = await recordUpload({
        projectKey,
        path,
        title,
        type,
        description,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      if (!result.ok) {
        setError(Object.values(result.error.fieldErrors ?? {})[0]?.[0] ?? result.error.message);
        return;
      }
      toast.success(`${title} uploaded`);
      reset();
      setOpen(false);
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
            <DialogTitle>Upload a document</DialogTitle>
            <DialogDescription>Everyone on {projectKey} can open it. Up to 25 MB.</DialogDescription>
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
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              aria-label="File to upload"
              onChange={(event) => choose(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-4">
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
              <span className="text-sm font-medium" aria-hidden="true">
                Kind of document
              </span>
              <Select value={type} onValueChange={(value) => setType(value as DocumentType)} disabled={pending}>
                <SelectTrigger className="w-full" aria-label="Kind of document">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DOCUMENT_TYPE_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Note (optional)</span>
              <Textarea
                rows={2}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={pending}
              />
            </label>
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
