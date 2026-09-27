import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Repository reads. Runs on the viewer's client, so RLS decides visibility —
 * `github_repositories_select` shows a row to anyone on its project. Nothing
 * here re-checks permissions; that would be a second source of truth able to
 * disagree with the database.
 */

export type RepositoryRow = {
  id: string;
  full_name: string;
  html_url: string;
  default_branch: string | null;
  is_private: boolean | null;
  last_synced_at: string | null;
  created_at: string;
};

/** Repositories connected to one project, in the order they were connected. */
export async function listProjectRepositories(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("github_repositories")
    .select("id, full_name, html_url, default_branch, is_private, last_synced_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<RepositoryRow[]>();
}
