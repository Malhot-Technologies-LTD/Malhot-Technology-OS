"use client";

import {
  ChevronRight,
  Download,
  FileArchive,
  FileImage,
  FilePen,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderDown,
  FolderInput,
  FolderPlus,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type DragEvent } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ACCEPTED_MIME_TYPES, ACCEPT_ATTRIBUTE, MAX_FILE_BYTES, formatBytes } from "@/features/documents/files";
import { findTemplate } from "@/features/documents/templates";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { deleteFile, deleteFolder, moveFile, moveFolder, recordCompanyUpload, setFolderRestricted } from "../actions";
import {
  COMPANY_FILES_BUCKET,
  canManageItem,
  companyFilePath,
  descendantIds,
  fileHref,
  folderHref,
  sortFolders,
  type FileRow,
  type FolderRow,
} from "../tree";
import { MoveDialog, NameDialog, type MoveSubject } from "./dialogs.client";
import { downloadFolderZip, type ZipProgress } from "../zip.client";

type Viewer = { userId: string; isAdmin: boolean };

type Props = {
  organizationId: string;
  viewer: Viewer;
  /** The open folder; null at the top level. */
  folder: FolderRow | null;
  /** Top level down to the open folder's parent. */
  trail: readonly { id: string; name: string }[];
  /** Every folder the viewer can see, for child lists, counts and the move picker. */
  folders: readonly FolderRow[];
  /** Files directly in each folder ("" = top level). */
  fileCounts: Readonly<Record<string, number>>;
  files: readonly FileRow[];
};

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const DRAG_TYPE = "application/x-malhot-item";

type DragItem = { kind: "folder" | "file"; id: string };

function kindOf(file: FileRow): { label: string; Icon: typeof FileText } {
  if (file.source === "generated")
    return { label: findTemplate(file.template_key)?.name ?? "Document", Icon: FileSignature };
  const mime = file.mime_type ?? "";
  if (mime.startsWith("image/")) return { label: "Image", Icon: FileImage };
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv")
    return { label: mime === "text/csv" ? "CSV" : "Spreadsheet", Icon: FileSpreadsheet };
  if (mime === "application/zip") return { label: "ZIP archive", Icon: FileArchive };
  if (mime === "application/pdf") return { label: "PDF", Icon: FileText };
  if (mime.includes("word")) return { label: "Word document", Icon: FileText };
  if (mime.includes("presentation") || mime.includes("powerpoint")) return { label: "Presentation", Icon: FileText };
  return { label: "File", Icon: FileText };
}

function titleFromFileName(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim()
      .slice(0, 200) || name.slice(0, 200)
  );
}

/**
 * The company file explorer: one folder's subfolders and files, with folders
 * made, renamed, moved and deleted in place. Files dropped from the desktop
 * upload straight into the open folder; rows drag onto a folder or a crumb to
 * move there. What the viewer may change follows the migration's rules (admin
 * or creator), and the server checks again.
 */
export function FileExplorer({ organizationId, viewer, folder, trail, folders, fileCounts, files }: Props) {
  const router = useRouter();
  const currentId = folder?.id ?? null;
  const [query, setQuery] = useState("");
  const [naming, setNaming] = useState<{ mode: "create" } | { mode: "rename"; folder: FolderRow } | null>(null);
  const [moving, setMoving] = useState<MoveSubject | null>(null);
  const [deleting, setDeleting] = useState<
    { kind: "folder"; folder: FolderRow } | { kind: "file"; file: FileRow } | null
  >(null);
  const [renamingFile, setRenamingFile] = useState<FileRow | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [desktopDrag, setDesktopDrag] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [zipping, setZipping] = useState<ZipProgress | null>(null);
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  const children = useMemo(
    () => sortFolders(folders.filter((row) => row.parent_id === currentId)),
    [folders, currentId],
  );
  const needle = query.trim().toLowerCase();
  const shownFolders = needle ? children.filter((row) => row.name.toLowerCase().includes(needle)) : children;
  const shownFiles = needle
    ? files.filter((file) => `${file.title} ${file.file_name ?? ""}`.toLowerCase().includes(needle))
    : files;
  const restrictedHere = folder?.restricted ?? false;

  function itemsIn(id: string): number {
    return folders.filter((row) => row.parent_id === id).length + (fileCounts[id] ?? 0);
  }

  function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error?.message ?? "That did not work.");
        return;
      }
      toast.success(success);
    });
  }

  async function zipFolder(id: string | null) {
    setZipping({ done: 0, total: 0 });
    try {
      const result = await downloadFolderZip(id, setZipping);
      if (!result.ok) toast.error(result.message);
      else if (result.failed.length > 0)
        toast.warning(`${result.name}.zip is missing ${result.failed.length} file(s) that could not be fetched`, {
          description: result.failed.slice(0, 5).join(", "),
        });
      else toast.success(`${result.name}.zip downloaded (${result.files} file${result.files === 1 ? "" : "s"})`);
    } catch {
      toast.error("The ZIP could not be made. Check your connection and try again.");
    } finally {
      setZipping(null);
    }
  }

  function moveItem(item: DragItem, to: string | null) {
    if (item.kind === "folder") {
      if (item.id === to || (to && descendantIds(folders, item.id).has(to))) {
        toast.error("A folder cannot move inside itself.");
        return;
      }
      const row = folders.find((candidate) => candidate.id === item.id);
      if (!row || row.parent_id === to) return;
      run(() => moveFolder({ id: item.id, parentId: to }), `Moved ${row.name}`);
    } else {
      const row = files.find((candidate) => candidate.id === item.id);
      if (!row || row.folder_id === to) return;
      run(() => moveFile({ id: item.id, folderId: to }), `Moved ${row.title}`);
    }
  }

  async function upload(list: readonly File[]) {
    const accepted: File[] = [];
    for (const file of list) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type))
        toast.error(`${file.name}: that file type is not accepted.`, {
          description: "Use PDF, Word, Excel, PowerPoint, text, CSV, an image or a ZIP.",
        });
      else if (file.size > MAX_FILE_BYTES)
        toast.error(`${file.name} is ${formatBytes(file.size)}. Files can be up to 25 MB.`);
      else accepted.push(file);
    }
    if (accepted.length === 0) return;

    const supabase = createClient();
    let saved = 0;
    setUploading({ done: 0, total: accepted.length });
    for (const [index, file] of accepted.entries()) {
      const path = companyFilePath(organizationId, file.name, crypto.randomUUID());
      const stored = await supabase.storage
        .from(COMPANY_FILES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (stored.error) {
        toast.error(
          /bucket not found/i.test(stored.error.message)
            ? "File storage is not set up yet. Ask an admin to apply the latest database migration."
            : `${file.name} could not be uploaded: ${stored.error.message}`,
        );
      } else {
        const result = await recordCompanyUpload({
          folderId: currentId,
          path,
          title: titleFromFileName(file.name),
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        });
        if (result.ok) saved += 1;
        else toast.error(`${file.name}: ${result.error.message}`);
      }
      setUploading({ done: index + 1, total: accepted.length });
    }
    setUploading(null);
    if (saved > 0) {
      toast.success(saved === 1 ? "1 file uploaded" : `${saved} files uploaded`);
      router.refresh();
    }
  }

  // Drag and drop --------------------------------------------------------------

  function startDrag(event: DragEvent, item: DragItem) {
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(item));
    event.dataTransfer.effectAllowed = "move";
  }

  function readDrag(event: DragEvent): DragItem | null {
    try {
      const raw = event.dataTransfer.getData(DRAG_TYPE);
      return raw ? (JSON.parse(raw) as DragItem) : null;
    } catch {
      return null;
    }
  }

  const isItemDrag = (event: DragEvent) => event.dataTransfer.types.includes(DRAG_TYPE);
  const isDesktopDrag = (event: DragEvent) => event.dataTransfer.types.includes("Files") && !isItemDrag(event);

  /** Props that make an element a place to drop rows (a folder row or a crumb). */
  function dropZone(target: string | null) {
    const key = target ?? "top";
    return {
      onDragOver: (event: DragEvent) => {
        if (!isItemDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: () => setDropTarget((current) => (current === key ? null : current)),
      onDrop: (event: DragEvent) => {
        const item = readDrag(event);
        if (!item) return;
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(null);
        moveItem(item, target);
      },
    };
  }

  const empty = children.length === 0 && files.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Location and tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Folder path" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            <li>
              <Link
                href={folderHref(null)}
                {...dropZone(null)}
                className={cn(
                  "rounded-md px-1.5 py-1 font-medium text-fg-muted hover:bg-bg-subtle hover:text-fg",
                  dropTarget === "top" && "bg-brand-subtle text-brand ring-2 ring-brand",
                )}
              >
                Files
              </Link>
            </li>
            {trail.map((crumb) => (
              <li key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden="true" />
                <Link
                  href={folderHref(crumb.id)}
                  {...dropZone(crumb.id)}
                  className={cn(
                    "max-w-48 truncate rounded-md px-1.5 py-1 font-medium text-fg-muted hover:bg-bg-subtle hover:text-fg",
                    dropTarget === crumb.id && "bg-brand-subtle text-brand ring-2 ring-brand",
                  )}
                >
                  {crumb.name}
                </Link>
              </li>
            ))}
            {folder ? (
              <li className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden="true" />
                <span aria-current="page" className="max-w-56 truncate px-1.5 py-1 font-semibold">
                  {folder.name}
                </span>
                {folder.restricted ? <AdminsOnly /> : null}
              </li>
            ) : null}
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter this folder"
              aria-label="Filter this folder"
              className="h-9 w-full pl-8 sm:w-48"
            />
          </div>
          <Button variant="outline" onClick={() => setNaming({ mode: "create" })}>
            <FolderPlus aria-hidden="true" /> New folder
          </Button>
          <Button variant="outline" onClick={() => picker.current?.click()} disabled={uploading !== null}>
            <Upload aria-hidden="true" /> {uploading ? `Uploading ${uploading.done}/${uploading.total}…` : "Upload"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void zipFolder(currentId)}
            disabled={zipping !== null}
            aria-live="polite"
            title={folder ? `Download ${folder.name} and everything in it as a ZIP` : "Download all of Files as a ZIP"}
          >
            <FolderDown aria-hidden="true" />{" "}
            {zipping
              ? zipping.total > 0
                ? `Zipping ${zipping.done}/${zipping.total}…`
                : "Preparing…"
              : folder
                ? "Download ZIP"
                : "Download all"}
          </Button>
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            aria-label="Files to upload"
            onChange={(event) => {
              const chosen = Array.from(event.target.files ?? []);
              event.target.value = "";
              void upload(chosen);
            }}
          />
          <Button asChild>
            <Link href={`/os/documents/new${currentId ? `?folder=${currentId}` : ""}`}>
              <FileSignature aria-hidden="true" /> New document
            </Link>
          </Button>
        </div>
      </div>

      {/* The folder's contents; desktop files dropped anywhere here upload into it */}
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-surface",
          desktopDrag && "border-brand ring-2 ring-brand",
        )}
        onDragOver={(event) => {
          if (!isDesktopDrag(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDesktopDrag(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDesktopDrag(false);
        }}
        onDrop={(event) => {
          if (!isDesktopDrag(event)) return;
          event.preventDefault();
          setDesktopDrag(false);
          void upload(Array.from(event.dataTransfer.files));
        }}
        aria-busy={pending || uploading !== null}
      >
        {desktopDrag ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-brand-subtle/80 text-sm font-semibold text-brand">
            <Upload className="mr-2 size-4" aria-hidden="true" /> Drop to upload to {folder?.name ?? "Files"}
          </div>
        ) : null}

        {empty ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-bg-subtle text-fg-subtle">
              <Folder className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{folder ? "This folder is empty" : "No folders yet"}</p>
              <p className="max-w-sm text-sm text-fg-muted">
                Drop files here from your computer, make a folder, or generate a document straight into it.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNaming({ mode: "create" })}>
                <FolderPlus aria-hidden="true" /> New folder
              </Button>
              <Button variant="outline" size="sm" onClick={() => picker.current?.click()}>
                <Upload aria-hidden="true" /> Upload
              </Button>
            </div>
          </div>
        ) : (
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">
              Contents of {folder?.name ?? "Files"}: folders first, then files, newest first.
            </caption>
            <thead className="border-b border-border bg-bg-subtle text-left text-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Name
                </th>
                <th scope="col" className="hidden w-52 px-3 py-2.5 font-medium md:table-cell">
                  Kind
                </th>
                <th scope="col" className="hidden w-40 px-3 py-2.5 font-medium lg:table-cell">
                  Added by
                </th>
                <th scope="col" className="hidden w-32 px-3 py-2.5 font-medium sm:table-cell">
                  Modified
                </th>
                <th scope="col" className="hidden w-24 px-3 py-2.5 text-right font-medium md:table-cell">
                  Size
                </th>
                <th scope="col" className="w-12 px-2 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shownFolders.map((row) => {
                const manage = canManageItem(viewer, row);
                const count = itemsIn(row.id);
                return (
                  <tr
                    key={row.id}
                    draggable={manage}
                    onDragStart={(event) => startDrag(event, { kind: "folder", id: row.id })}
                    {...dropZone(row.id)}
                    className={cn(
                      "hover:bg-bg-subtle",
                      dropTarget === row.id && "bg-brand-subtle outline-2 -outline-offset-2 outline-brand",
                    )}
                  >
                    <td className="max-w-0 px-4 py-2.5">
                      <Link
                        href={folderHref(row.id)}
                        className="flex min-w-0 items-center gap-3 font-medium hover:underline"
                      >
                        <Folder className="size-5 shrink-0 fill-brand-subtle text-brand" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{row.name}</span>
                          <span className="text-xs font-normal text-fg-subtle md:hidden" aria-hidden="true">
                            {count} {count === 1 ? "item" : "items"}
                          </span>
                        </span>
                        {row.restricted && !restrictedHere ? <AdminsOnly /> : null}
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 text-fg-muted md:table-cell">
                      Folder · {count} {count === 1 ? "item" : "items"}
                    </td>
                    <td className="hidden px-3 py-2.5 text-fg-muted lg:table-cell" />
                    <td className="hidden px-3 py-2.5 text-fg-muted tabular-nums sm:table-cell">
                      {DATE.format(new Date(row.updated_at))}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell" />
                    <td className="px-2 py-1.5 text-right">
                      <RowMenu label={row.name}>
                        <DropdownMenuItem disabled={zipping !== null} onSelect={() => void zipFolder(row.id)}>
                          <FolderDown aria-hidden="true" /> Download as ZIP
                        </DropdownMenuItem>
                        {manage ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setNaming({ mode: "rename", folder: row })}>
                              <Pencil aria-hidden="true" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setMoving({ kind: "folder", id: row.id, name: row.name })}
                            >
                              <FolderInput aria-hidden="true" /> Move to…
                            </DropdownMenuItem>
                            {viewer.isAdmin && !restrictedHere ? (
                              <DropdownMenuItem
                                onSelect={() =>
                                  run(
                                    () => setFolderRestricted({ id: row.id, restricted: !row.restricted }),
                                    row.restricted ? `${row.name} is open to everyone` : `${row.name} is admins only`,
                                  )
                                }
                              >
                                {row.restricted ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
                                {row.restricted ? "Open to everyone" : "Make admins only"}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting({ kind: "folder", folder: row })}
                            >
                              <Trash2 aria-hidden="true" /> Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </RowMenu>
                    </td>
                  </tr>
                );
              })}

              {shownFiles.map((file) => {
                const manage = canManageItem(viewer, file);
                const { label, Icon } = kindOf(file);
                const upload = file.source === "upload";
                return (
                  <tr
                    key={file.id}
                    draggable={manage}
                    onDragStart={(event) => startDrag(event, { kind: "file", id: file.id })}
                    className="hover:bg-bg-subtle"
                  >
                    <td className="max-w-0 px-4 py-2.5">
                      <Link
                        href={fileHref(file)}
                        {...(upload ? { target: "_blank", rel: "noopener" } : {})}
                        className="flex min-w-0 items-center gap-3 hover:underline"
                        title={file.file_name ?? file.title}
                      >
                        <Icon
                          className={cn("size-5 shrink-0", upload ? "text-fg-subtle" : "text-brand")}
                          aria-hidden="true"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{file.title}</span>
                          {/* The Kind and Modified columns are hidden on phones; say it here instead. */}
                          <span className="truncate text-xs text-fg-subtle md:hidden" aria-hidden="true">
                            {label} · {DATE.format(new Date(file.updated_at))}
                          </span>
                        </span>
                        {upload ? <span className="sr-only">(opens in a new tab)</span> : null}
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 text-fg-muted md:table-cell">
                      <span className="line-clamp-1">{label}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-fg-muted lg:table-cell">
                      <span className="line-clamp-1">{file.creator?.full_name ?? "—"}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-fg-muted tabular-nums sm:table-cell">
                      {DATE.format(new Date(file.updated_at))}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right text-fg-muted tabular-nums md:table-cell">
                      {file.size_bytes ? formatBytes(file.size_bytes) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <RowMenu label={file.title}>
                        {upload ? (
                          <DropdownMenuItem asChild>
                            <a href={`${fileHref(file)}?download=1`}>
                              <Download aria-hidden="true" /> Download
                            </a>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem asChild>
                            <Link href={fileHref(file)}>
                              <FileSignature aria-hidden="true" /> Open
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {manage ? (
                          <>
                            {upload ? null : (
                              <DropdownMenuItem asChild>
                                <Link href={`${fileHref(file)}/edit`}>
                                  <FilePen aria-hidden="true" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => setRenamingFile(file)}>
                              <Pencil aria-hidden="true" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                setMoving({ kind: "file", id: file.id, name: file.title, folderId: file.folder_id })
                              }
                            >
                              <FolderInput aria-hidden="true" /> Move to…
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting({ kind: "file", file })}
                            >
                              <Trash2 aria-hidden="true" /> Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </RowMenu>
                    </td>
                  </tr>
                );
              })}

              {needle && shownFolders.length === 0 && shownFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                    Nothing in this folder matches “{query.trim()}”.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-fg-subtle">
        Drag files from your computer into the list to upload them here, or drag a row onto a folder to move it.
      </p>

      <NameDialog
        state={naming}
        parentId={currentId}
        canRestrict={viewer.isAdmin && !restrictedHere}
        onClose={() => setNaming(null)}
      />
      <NameDialog
        state={renamingFile ? { mode: "renameFile", file: renamingFile } : null}
        parentId={currentId}
        canRestrict={false}
        onClose={() => setRenamingFile(null)}
      />
      <MoveDialog subject={moving} folders={folders} onClose={() => setMoving(null)} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleting?.kind === "folder" ? deleting.folder.name : deleting?.file.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === "folder"
                ? itemsIn(deleting.folder.id) > 0
                  ? `Everything inside it goes too: ${itemsIn(deleting.folder.id)} item${itemsIn(deleting.folder.id) === 1 ? "" : "s"} here, and anything in its subfolders. This cannot be undone.`
                  : "The folder is empty. This cannot be undone."
                : "The file is removed for everyone. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const target = deleting;
                setDeleting(null);
                if (!target) return;
                if (target.kind === "folder")
                  run(() => deleteFolder({ id: target.folder.id }), `Deleted ${target.folder.name}`);
                else run(() => deleteFile({ id: target.file.id }), `Deleted ${target.file.title}`);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminsOnly() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted">
      <Lock className="size-3" aria-hidden="true" /> Admins only
    </span>
  );
}

function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${label}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
