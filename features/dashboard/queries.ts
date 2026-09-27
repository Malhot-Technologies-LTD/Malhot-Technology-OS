import "server-only";

import { createClient } from "@/lib/supabase/server";

import { TREND_WEEKS, type DashboardProjectRow, type DashboardTask } from "./stats";

/**
 * Rows behind the dashboard. RLS scopes both to what the viewer may see: an
 * org admin gets the whole company, everyone else the projects they are on.
 *
 * Tasks are every open one plus anything completed inside the trend window.
 * That covers every task created in the window too (a task cannot be finished
 * before it exists), so the weekly created/completed counts are complete
 * without loading years of finished work.
 */
export async function getDashboardData(organizationId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - (TREND_WEEKS + 1) * 7 * 86_400_000).toISOString();

  const [tasks, projects] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, seq, title, status, priority, due_at, completed_at, created_at, accepted_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!tasks_project_id_fkey!inner(id, key, name, organization_id)",
      )
      .eq("project.organization_id", organizationId)
      .or(`completed_at.is.null,completed_at.gte.${since}`)
      .limit(2000)
      .returns<DashboardTask[]>(),
    supabase
      .from("projects")
      .select("id, key, name, status, target_end_date")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name")
      .limit(200)
      .returns<DashboardProjectRow[]>(),
  ]);

  // The instant the figures are computed against, read once with the data.
  return { tasks, projects, now: Date.now() };
}
