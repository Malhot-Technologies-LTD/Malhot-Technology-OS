"use client";

import { Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import { removeAvatar, setAvatar } from "@/features/auth/actions";
import {
  AVATAR_ACCEPT,
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarPath,
  isAvatarType,
  type AvatarType,
} from "@/features/auth/avatar";
import { createClient } from "@/lib/supabase/client";

type Props = { fullName: string; avatarUrl: string | null };

const MAX_MB = Math.round(AVATAR_MAX_BYTES / (1024 * 1024));

/**
 * Your photo, on the profile page.
 *
 * The file goes from the browser straight to Storage and only its path is sent
 * to the server — a Server Action would have to carry the whole image through
 * the request body, and the bucket's own policy is a better guard on the upload
 * than anything a form could do.
 *
 * Choosing a file uploads it. There is no second Save: one field, one intent,
 * and a photo sitting in a tray waiting to be confirmed is the kind of thing
 * people walk away from thinking they are done.
 */
export function AvatarUpload({ fullName, avatarUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = pending || uploading;

  /*
   * The object URL is what makes the new face appear at once instead of after a
   * round trip. It holds a reference to the file until it is revoked, so it is
   * revoked whenever it is replaced or the component goes away.
   */
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function choose(file: File) {
    if (!isAvatarType(file.type)) {
      toast.error("Choose a JPEG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(`That image is larger than ${MAX_MB}MB. Try a smaller one.`);
      return;
    }

    setUploading(true);
    const local = URL.createObjectURL(file);
    setPreview(local);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setPreview(null);
      setUploading(false);
      toast.error("Your session has expired. Sign in again.");
      return;
    }

    const path = avatarPath(auth.user.id, crypto.randomUUID(), file.type as AvatarType);
    const stored = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });

    if (stored.error) {
      setPreview(null);
      setUploading(false);
      toast.error(`That photo could not be uploaded: ${stored.error.message}`);
      return;
    }

    startTransition(async () => {
      const result = await setAvatar({ path });
      setUploading(false);
      if (result.ok) {
        toast.success("Photo updated");
        // The server now serves the real URL; the local stand-in has done its job.
        setPreview(null);
      } else {
        setPreview(null);
        toast.error(result.error.message);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.ok) {
        setPreview(null);
        toast.success("Photo removed");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  const shown = preview ?? avatarUrl;

  return (
    <div className="flex max-w-xl items-center gap-5">
      <UserAvatar name={fullName} avatarUrl={shown} className="size-20 text-lg" />

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            <Upload aria-hidden="true" />
            {shown ? "Change photo" : "Upload photo"}
          </Button>
          {avatarUrl ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={remove} className="text-fg-muted">
              <Trash2 aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>

        <p className="text-[13px] text-fg-subtle" id="avatar-hint">
          {busy ? "Uploading…" : `JPEG, PNG, WebP or AVIF, up to ${MAX_MB}MB. Shown beside your name across the OS.`}
        </p>

        <input
          ref={input}
          type="file"
          accept={AVATAR_ACCEPT}
          className="sr-only"
          aria-describedby="avatar-hint"
          aria-label="Choose a profile photo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared first, so choosing the same file twice still fires change.
            event.target.value = "";
            if (file) void choose(file);
          }}
        />
      </div>
    </div>
  );
}
