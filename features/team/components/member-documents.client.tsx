"use client";

import { FilePlus2, FileText, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/os/data-display";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes } from "@/features/documents/files";
import { findTemplate } from "@/features/documents/templates";
import { deleteMemberDocument } from "@/features/team/actions";

import type { MemberDocument } from "../queries";
import { MEMBER_DOC_KIND_LABEL, PERSON_TEMPLATES } from "../schemas";
import { MemberUploadDialog } from "./member-upload-dialog.client";

/** Contracts, offers and personal files on one person. Admins add and remove; the person reads. */
export function MemberDocuments({
  userId,
  organizationId,
  firstName,
  documents,
  canEdit,
}: {
  userId: string;
  organizationId: string;
  firstName: string;
  documents: readonly MemberDocument[];
  canEdit: boolean;
}) {
  const base = `/os/team/${userId}/documents`;
  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <FilePlus2 aria-hidden="true" /> Generate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {PERSON_TEMPLATES.map((key) => (
                <DropdownMenuItem key={key} asChild>
                  <Link href={`${base}/new?template=${key}`}>{findTemplate(key)?.name ?? key}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <MemberUploadDialog userId={userId} organizationId={organizationId} firstName={firstName} />
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {canEdit
            ? `No documents on ${firstName} yet. Generate an offer or contract, or upload a signed copy.`
            : "No documents yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} base={base} userId={userId} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({
  document,
  base,
  userId,
  canEdit,
}: {
  document: MemberDocument;
  base: string;
  userId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const href = document.source === "upload" ? `${base}/${document.id}/download` : `${base}/${document.id}`;
  const Icon = document.source === "upload" ? Paperclip : FileText;

  return (
    <li className="relative flex items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={href}
          target={document.source === "upload" ? "_blank" : undefined}
          rel={document.source === "upload" ? "noopener noreferrer" : undefined}
          className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
        >
          {document.title}
        </Link>
        <span className="truncate text-xs text-fg-subtle">
          {MEMBER_DOC_KIND_LABEL[document.kind]} · {formatDate(document.created_at)}
          {document.creator ? ` · by ${document.creator.full_name}` : ""}
          {document.size_bytes ? ` · ${formatBytes(document.size_bytes)}` : ""}
          {document.source === "generated" ? " · generated" : ""}
        </span>
      </div>
      {canEdit ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative z-10"
              aria-label={`Delete ${document.title}`}
              disabled={pending}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this document?</AlertDialogTitle>
              <AlertDialogDescription>
                {document.title} is removed{document.source === "upload" ? ", along with the file" : ""}. This cannot be
                undone. Signed contracts are usually worth keeping.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteMemberDocument({ userId, id: document.id });
                    if (!result.ok) toast.error(result.error.message);
                    else toast.success("Document deleted");
                    router.refresh();
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </li>
  );
}
