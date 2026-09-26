import { publicEnv } from "@/lib/env";

export const SITE_MEDIA_BUCKET = "site-media";

/** Public URL of a file in the site-media bucket. The bucket is public, so no signing. */
export function siteMediaUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/${path}`;
}
