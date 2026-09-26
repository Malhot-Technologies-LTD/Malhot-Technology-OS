import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/domain";

import { siteMediaUrl } from "./media";
import type { ShowcaseCategory } from "./schemas";

/**
 * Showcase reads for Settings → Website. They run on the viewer's client, so
 * RLS decides: only org admins see unpublished showcases, and the pages that
 * call these are admin-only as well.
 */

export type ShowcaseListRow = {
  projectId: string;
  key: string;
  name: string;
  status: ProjectStatus;
  showcase: {
    title: string;
    slug: string;
    published: boolean;
    position: number;
    photoCount: number;
    cover: { url: string; alt: string } | null;
  } | null;
};

/**
 * Every live project, with its website entry when it has one. Projects on the
 * website come first, in their website order; the rest follow by name.
 */
export async function listShowcaseRows(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, key, name, status, showcase:project_showcases(title, slug, published, position, images:project_showcase_images(storage_path, alt, position))",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  if (error) return { data: null, error };

  const rows: ShowcaseListRow[] = data.map((project) => {
    const showcase = project.showcase;
    const images = [...(showcase?.images ?? [])].sort((a, b) => a.position - b.position);
    return {
      projectId: project.id,
      key: project.key,
      name: project.name,
      status: project.status,
      showcase: showcase
        ? {
            title: showcase.title,
            slug: showcase.slug,
            published: showcase.published,
            position: showcase.position,
            photoCount: images.length,
            cover: images[0] ? { url: siteMediaUrl(images[0].storage_path), alt: images[0].alt } : null,
          }
        : null,
    };
  });

  rows.sort((a, b) => {
    if (a.showcase && b.showcase) return a.showcase.position - b.showcase.position;
    if (a.showcase) return -1;
    if (b.showcase) return 1;
    return a.name.localeCompare(b.name);
  });
  return { data: rows, error: null };
}

export type ShowcaseEditorData = {
  project: { id: string; key: string; name: string; description: string | null; clientName: string | null };
  showcase: {
    title: string;
    slug: string;
    category: ShowcaseCategory;
    scope: string | null;
    year: number | null;
    clientLabel: string | null;
    summary: string;
    overview: string | null;
    features: string[];
    stack: string[];
    liveUrl: string | null;
    published: boolean;
  } | null;
  images: { id: string; url: string; alt: string }[];
};

/** One project and its website entry, for the editor. `null` when the project does not exist. */
export async function getShowcaseEditor(organizationId: string, key: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, key, name, description, client:clients!projects_client_id_fkey(name), showcase:project_showcases(title, slug, category, scope, year, client_label, summary, overview, features, stack, live_url, published, images:project_showcase_images(id, storage_path, alt, position))",
    )
    .eq("organization_id", organizationId)
    .eq("key", key.toUpperCase())
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };

  const showcase = data.showcase;
  const images = [...(showcase?.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => ({ id: image.id, url: siteMediaUrl(image.storage_path), alt: image.alt }));

  const result: ShowcaseEditorData = {
    project: {
      id: data.id,
      key: data.key,
      name: data.name,
      description: data.description,
      clientName: data.client?.name ?? null,
    },
    showcase: showcase
      ? {
          title: showcase.title,
          slug: showcase.slug,
          category: showcase.category as ShowcaseCategory,
          scope: showcase.scope,
          year: showcase.year,
          clientLabel: showcase.client_label,
          summary: showcase.summary,
          overview: showcase.overview,
          features: showcase.features,
          stack: showcase.stack,
          liveUrl: showcase.live_url,
          published: showcase.published,
        }
      : null,
    images,
  };
  return { data: result, error: null };
}
