import "server-only";

import { logger } from "@/lib/logger";
import { createPublicClient } from "@/lib/supabase/public";

import { siteMediaUrl } from "./media";
import type { ShowcaseCategory } from "./schemas";

/**
 * Showcase reads for the public website. Anonymous and cached: see
 * lib/supabase/public.ts. Everything here is what a visitor may see, so RLS on
 * `project_showcases` (published only) is the real filter; the explicit
 * `published` condition says the same thing out loud and uses the index.
 */

/** Tag on every cached showcase read. Actions call `updateTag(SHOWCASE_TAG)` after a write. */
export const SHOWCASE_TAG = "showcase";

export type ShowcaseImage = { id: string; url: string; alt: string };

export type ShowcaseCard = {
  slug: string;
  title: string;
  category: ShowcaseCategory;
  scope: string | null;
  year: number | null;
  summary: string;
  cover: ShowcaseImage | null;
};

export type ShowcaseDetail = ShowcaseCard & {
  clientLabel: string | null;
  overview: string | null;
  features: string[];
  stack: string[];
  liveUrl: string | null;
  images: ShowcaseImage[];
};

type ImageRow = { id: string; storage_path: string; alt: string };

const toImage = (row: ImageRow): ShowcaseImage => ({ id: row.id, url: siteMediaUrl(row.storage_path), alt: row.alt });

/**
 * A failed read during `next build` renders the site without projects instead
 * of failing the build (CI builds against a placeholder database). At runtime
 * it throws, so an ISR regeneration fails and Next.js keeps serving the last
 * good page rather than caching an empty portfolio for an hour.
 */
function handleReadFailure(event: string, error: { message: string; code?: string }): void {
  logger.error(event, { code: error.code, message: error.message });
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error(`Could not load the website projects: ${error.message}`);
  }
}

/** Published projects in the order chosen in Settings → Website, each with its cover photo. */
export async function listPublishedShowcases(): Promise<ShowcaseCard[]> {
  const supabase = createPublicClient([SHOWCASE_TAG]);
  const { data, error } = await supabase
    .from("project_showcases")
    .select("slug, title, category, scope, year, summary, images:project_showcase_images(id, storage_path, alt)")
    .eq("published", true)
    .order("position")
    .order("position", { referencedTable: "project_showcase_images" })
    .limit(1, { referencedTable: "project_showcase_images" });

  if (error || !data) {
    handleReadFailure("showcase.list_failed", error ?? { message: "no data" });
    return [];
  }

  return data.map((row) => ({
    slug: row.slug,
    title: row.title,
    category: row.category as ShowcaseCategory,
    scope: row.scope,
    year: row.year,
    summary: row.summary,
    cover: row.images[0] ? toImage(row.images[0]) : null,
  }));
}

/** One published project with all its photos, or `null` when there is no such published project. */
export async function getPublishedShowcase(slug: string): Promise<ShowcaseDetail | null> {
  const supabase = createPublicClient([SHOWCASE_TAG]);
  const { data, error } = await supabase
    .from("project_showcases")
    .select(
      "slug, title, category, scope, year, summary, client_label, overview, features, stack, live_url, images:project_showcase_images(id, storage_path, alt)",
    )
    .eq("published", true)
    .eq("slug", slug)
    .order("position", { referencedTable: "project_showcase_images" });

  if (error || !data) {
    handleReadFailure("showcase.detail_failed", error ?? { message: "no data" });
    return null;
  }

  const row = data[0];
  if (!row) return null;

  const images = row.images.map(toImage);
  return {
    slug: row.slug,
    title: row.title,
    category: row.category as ShowcaseCategory,
    scope: row.scope,
    year: row.year,
    summary: row.summary,
    cover: images[0] ?? null,
    clientLabel: row.client_label,
    overview: row.overview,
    features: row.features,
    stack: row.stack,
    liveUrl: row.live_url,
    images,
  };
}
