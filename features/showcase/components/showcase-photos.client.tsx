"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition } from "react";
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
import {
  addShowcaseImage,
  deleteShowcaseImage,
  moveShowcaseImage,
  updateShowcaseImageAlt,
} from "@/features/showcase/actions";
import { SITE_MEDIA_BUCKET } from "@/features/showcase/media";
import {
  imageAltSchema,
  isAcceptedImageType,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  showcaseImagePath,
} from "@/features/showcase/schemas";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; url: string; alt: string };
type Pending = { key: string; file: File; preview: string; alt: string; error: string | null };

type Props = {
  organizationId: string;
  projectId: string;
  projectTitle: string;
  photos: readonly Photo[];
};

/**
 * Photos for a project's website page. The first one is the cover on the
 * project card and the large image at the top of the page.
 *
 * Choosing files does not upload them. Each one waits in a tray until it has a
 * description, because the description is what a screen reader announces and
 * a photo without one is invisible to part of the audience. Uploads then go
 * straight from the browser to Storage, one at a time so they keep the order
 * they were chosen in, and each is recorded by a Server Action.
 */
export function ShowcasePhotos({ organizationId, projectId, projectTitle, photos }: Props) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const room = MAX_IMAGES - photos.length;

  // Object URLs hold the file in memory until revoked.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const discard = (key: string) =>
    setPending((items) => {
      const item = items.find((candidate) => candidate.key === key);
      if (item) {
        URL.revokeObjectURL(item.preview);
        previews.current.delete(item.preview);
      }
      return items.filter((candidate) => candidate.key !== key);
    });

  const onChoose = (files: FileList | null) => {
    if (!files) return;
    const accepted: Pending[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!isAcceptedImageType(file.type)) rejected.push(`${file.name} is not a JPEG, PNG, WebP or AVIF image`);
      else if (file.size > MAX_IMAGE_BYTES) rejected.push(`${file.name} is larger than 10 MB`);
      else {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        accepted.push({ key: crypto.randomUUID(), file, preview, alt: "", error: null });
      }
    }
    const free = room - pending.length;
    if (accepted.length > free) {
      rejected.push(`Only ${Math.max(free, 0)} more photo${free === 1 ? "" : "s"} fit (the limit is ${MAX_IMAGES})`);
      accepted.splice(Math.max(free, 0)).forEach((item) => URL.revokeObjectURL(item.preview));
    }
    rejected.forEach((message) => toast.error(message));
    setPending((items) => [...items, ...accepted]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const upload = async () => {
    const checked = pending.map((item) => {
      const alt = imageAltSchema.safeParse(item.alt);
      return { ...item, error: alt.success ? null : alt.error.issues[0].message };
    });
    setPending(checked);
    if (checked.some((item) => item.error)) return;

    const supabase = createClient();
    for (const [index, item] of checked.entries()) {
      setUploading(`Uploading ${index + 1} of ${checked.length}…`);
      const type = item.file.type;
      if (!isAcceptedImageType(type)) continue;
      const path = showcaseImagePath(organizationId, projectId, crypto.randomUUID(), type);

      const stored = await supabase.storage
        .from(SITE_MEDIA_BUCKET)
        .upload(path, item.file, { contentType: type, cacheControl: "31536000", upsert: false });
      if (stored.error) {
        toast.error(`${item.file.name} could not be uploaded: ${stored.error.message}`);
        break;
      }

      const recorded = await addShowcaseImage({ projectId, path, alt: item.alt });
      if (!recorded.ok) {
        toast.error(recorded.error.message);
        break;
      }
      discard(item.key);
    }
    setUploading(null);
  };

  return (
    <section aria-labelledby="photos-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 id="photos-heading" className="text-base font-semibold tracking-tight">
          Photos
        </h3>
        <p className="text-sm text-fg-muted">
          Screenshots or photos of the product. The first one is the cover. Up to {MAX_IMAGES}, 10 MB each; landscape
          images at least 1600 pixels wide look best.
        </p>
      </div>

      {photos.length > 0 ? (
        <ol className="grid gap-4 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              position={index + 1}
              isFirst={index === 0}
              isLast={index === photos.length - 1}
              projectTitle={projectTitle}
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-border bg-bg-subtle p-4 text-sm text-fg-muted">
          No photos yet. Without one, the project card shows a plain cover with its category.
        </p>
      )}

      {pending.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-bg-subtle p-4">
          <p className="text-sm font-medium">Describe each photo, then upload</p>
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <li key={item.key} className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview, nothing to optimise */}
                <img src={item.preview} alt="" className="aspect-[4/3] w-24 shrink-0 rounded-md object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor={`alt-${item.key}`} className="truncate text-sm text-fg-muted">
                    Description of {item.file.name}
                  </label>
                  <Input
                    id={`alt-${item.key}`}
                    value={item.alt}
                    placeholder="For example: The dashboard showing this month's sales"
                    aria-invalid={Boolean(item.error)}
                    aria-describedby={item.error ? `alt-error-${item.key}` : undefined}
                    disabled={uploading !== null}
                    onChange={(event) =>
                      setPending((items) =>
                        items.map((candidate) =>
                          candidate.key === item.key
                            ? { ...candidate, alt: event.target.value, error: null }
                            : candidate,
                        ),
                      )
                    }
                  />
                  {item.error ? (
                    <p id={`alt-error-${item.key}`} className="text-sm text-destructive">
                      {item.error}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => discard(item.key)}
                  disabled={uploading !== null}
                  aria-label={`Remove ${item.file.name}`}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={upload} disabled={uploading !== null} aria-busy={uploading !== null}>
              {uploading ?? `Upload ${pending.length} photo${pending.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      ) : null}

      {room - pending.length > 0 ? (
        <div>
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="sr-only"
            onChange={(event) => onChoose(event.target.files)}
          />
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            <ImagePlus aria-hidden /> Add photos
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PhotoCard({
  photo,
  position,
  isFirst,
  isLast,
  projectTitle,
}: {
  photo: Photo;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  projectTitle: string;
}) {
  const [busy, startTransition] = useTransition();
  const [alt, setAlt] = useState(photo.alt);
  const [altError, setAltError] = useState<string | null>(null);
  const altId = useId();
  const label = `photo ${position}`;

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: { message: string } }>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error.message);
      else if (success) toast.success(success);
    });

  const saveAlt = () => {
    const parsed = imageAltSchema.safeParse(alt);
    if (!parsed.success) {
      setAltError(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data === photo.alt) return;
    run(() => updateShowcaseImageAlt({ imageId: photo.id, alt: parsed.data }), "Description saved");
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-border bg-surface" aria-busy={busy}>
      <div className="relative aspect-[16/10] bg-bg-subtle">
        <Image src={photo.url} alt={photo.alt} fill sizes="(min-width: 640px) 360px, 100vw" className="object-cover" />
        {isFirst ? (
          <span className="absolute top-2 left-2 rounded-md bg-surface px-2 py-0.5 text-xs font-medium shadow-sm">
            Cover
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <label htmlFor={altId} className="text-xs text-fg-muted">
          Description
        </label>
        <Input
          id={altId}
          value={alt}
          aria-invalid={Boolean(altError)}
          onChange={(event) => {
            setAlt(event.target.value);
            setAltError(null);
          }}
          onBlur={saveAlt}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveAlt();
            }
          }}
          disabled={busy}
        />
        {altError ? <p className="text-sm text-destructive">{altError}</p> : null}
        <div className="flex items-center gap-1">
          {!isFirst ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => moveShowcaseImage({ imageId: photo.id, direction: "first" }), "Cover changed")}
            >
              <Star aria-hidden /> Make cover
            </Button>
          ) : null}
          <div className="ml-auto flex gap-1">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={busy || isFirst}
              aria-label={`Move ${label} earlier`}
              onClick={() => run(() => moveShowcaseImage({ imageId: photo.id, direction: "up" }))}
            >
              <ArrowLeft aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={busy || isLast}
              aria-label={`Move ${label} later`}
              onClick={() => run(() => moveShowcaseImage({ imageId: photo.id, direction: "down" }))}
            >
              <ArrowRight aria-hidden />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="icon-xs" variant="ghost" disabled={busy} aria-label={`Delete ${label}`}>
                  <Trash2 aria-hidden />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It is removed from {projectTitle} on the website straight away and cannot be recovered.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => run(() => deleteShowcaseImage(photo.id), "Photo deleted")}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </li>
  );
}
