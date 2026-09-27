"use client";

import {
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/os/empty-state";
import { StatusPill } from "@/components/os/status-badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDocument } from "@/features/documents/actions";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABEL, formatBytes } from "@/features/documents/files";
import { findTemplate } from "@/features/documents/templates";
import type { DocumentType } from "@/types/domain";

export type ListDocument = {
  id: string;
  title: string;
  type: DocumentType;
  description: string | null;
  source: "upload" | "generated";
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  template_key: string | null;
  created_at: string;
  uploaded_by: string;
  uploader: { full_name: string } | null;
  projectKey: string;
  projectName?: string;
};

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function iconFor(document: ListDocument) {
  if (document.source === "generated") return FileSignature;
  const mime = document.mime_type ?? "";
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") return FileSpreadsheet;
  if (mime === "application/zip") return FileArchive;
  return FileText;
}

function openHref(document: ListDocument) {
  const base = `/os/projects/${document.projectKey}/documents/${document.id}`;
  return document.source === "generated" ? base : `${base}/download`;
}

/**
 * A project's (or the whole company's) documents as a searchable list. Uploaded
 * files open through a short-lived signed link; generated documents open on
 * their own page, re-rendered on the letterhead.
 */
export function DocumentList({
  documents,
  viewerUserId,
  canManage,
  showProject = false,
}: {
  documents: readonly ListDocument[];
  viewerUserId: string;
  /** Manager: may delete anyone's document. Across projects, pass the set of keys managed instead. */
  canManage: boolean | ReadonlySet<string>;
  showProject?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | DocumentType>("all");
  const [source, setSource] = useState<"all" | "upload" | "generated">("all");
  const [project, setProject] = useState("all");

  const projects = showProject
    ? [
        ...new Map(
          documents.map((document) => [document.projectKey, document.projectName ?? document.projectKey]),
        ).entries(),
      ]
    : [];
  const needle = query.trim().toLowerCase();
  const visible = documents.filter((document) => {
    if (type !== "all" && document.type !== type) return false;
    if (source !== "all" && document.source !== source) return false;
    if (project !== "all" && document.projectKey !== project) return false;
    if (!needle) return true;
    return `${document.title} ${document.file_name ?? ""} ${document.description ?? ""} ${document.uploader?.full_name ?? ""}`
      .toLowerCase()
      .includes(needle);
  });

  const mayDelete = (document: ListDocument) =>
    document.uploaded_by === viewerUserId ||
    (typeof canManage === "boolean" ? canManage : canManage.has(document.projectKey));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 max-sm:basis-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search documents"
            placeholder="Search title, file name or person"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        {projects.length > 1 ? (
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="w-auto min-w-40 max-sm:flex-1" aria-label="Project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {key} · {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
          <SelectTrigger className="w-auto min-w-44 max-sm:flex-1" aria-label="Kind of document">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every kind</SelectItem>
            {DOCUMENT_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {DOCUMENT_TYPE_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(value) => setSource(value as typeof source)}>
          <SelectTrigger className="w-auto min-w-36 max-sm:flex-1" aria-label="Source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Uploaded and generated</SelectItem>
            <SelectItem value="upload">Uploaded files</SelectItem>
            <SelectItem value="generated">Generated on letterhead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          variant="well"
          icon={Search}
          title="No documents match"
          description="Try another search, or clear the filters."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {visible.map((document) => {
            const Icon = iconFor(document);
            const template = document.template_key ? findTemplate(document.template_key) : null;
            return (
              <li
                key={document.id}
                className="group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-bg-subtle sm:flex-nowrap"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-subtle text-fg-muted">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    href={openHref(document)}
                    target={document.source === "upload" ? "_blank" : undefined}
                    className="truncate text-[15px] font-medium after:absolute after:inset-0 hover:underline"
                    title={document.title}
                  >
                    {document.title}
                  </Link>
                  <span className="truncate text-[13px] text-fg-subtle">
                    {showProject ? <span className="font-mono">{document.projectKey}</span> : null}
                    {showProject ? " · " : null}
                    {document.source === "generated"
                      ? `${template?.name ?? "Generated"} · letterhead`
                      : `${document.file_name ?? "File"} · ${formatBytes(document.size_bytes ?? 0)}`}
                    {" · "}
                    {document.uploader?.full_name ?? "Someone"}, {DATE.format(new Date(document.created_at))}
                  </span>
                </div>
                <span className="hidden shrink-0 md:block">
                  <StatusPill tone={document.source === "generated" ? "info" : "neutral"}>
                    {DOCUMENT_TYPE_LABEL[document.type]}
                  </StatusPill>
                </span>
                <div className="relative z-10 flex shrink-0 items-center gap-1">
                  {document.source === "upload" ? (
                    <>
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={openHref(document)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${document.title} in a new tab`}
                        >
                          <ExternalLink aria-hidden="true" />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm">
                        <a href={`${openHref(document)}?download=1`} aria-label={`Download ${document.title}`}>
                          <Download aria-hidden="true" />
                        </a>
                      </Button>
                    </>
                  ) : null}
                  {mayDelete(document) ? <DeleteButton document={document} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DeleteButton({ document }: { document: ListDocument }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Delete ${document.title}`}
          className="text-fg-muted hover:text-status-danger-fg"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this document?</AlertDialogTitle>
          <AlertDialogDescription>
            {document.title} is removed for everyone on the project
            {document.source === "upload" ? ", along with the file" : ""}. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteDocument({ projectKey: document.projectKey, id: document.id });
                if (result.ok) toast.success("Document deleted");
                else toast.error(result.error.message);
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
