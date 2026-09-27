"use server";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/features/tasks/schemas";
import type { ProjectStatus } from "@/types/domain";

export type PaletteIndex = {
  projects: { key: string; name: string; status: ProjectStatus }[];
  tasks: { key: string; seq: number; title: string; status: TaskStatus; mine: boolean }[];
};

/**
 * Everything the command palette searches, in one round trip, fetched when it
 * first opens and filtered in the browser after that. RLS scopes both lists to
 * what the viewer can see. Open tasks first, then the most recently finished,
 * capped so the payload stays small for a company with years of history.
 */
export const paletteIndex = withAction("search.paletteIndex", async (): Promise<ActionResult<PaletteIndex>> => {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [projects, open, finished] = await Promise.all([
    supabase
      .from("projects")
      .select("key, name, status")
      .eq("organization_id", viewer.organizationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("tasks")
      .select("seq, title, status, assignee_id, project:projects!tasks_project_id_fkey!inner(key, organization_id)")
      .eq("project.organization_id", viewer.organizationId)
      .is("completed_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(400)
      .returns<
        { seq: number; title: string; status: TaskStatus; assignee_id: string | null; project: { key: string } }[]
      >(),
    supabase
      .from("tasks")
      .select("seq, title, status, assignee_id, project:projects!tasks_project_id_fkey!inner(key, organization_id)")
      .eq("project.organization_id", viewer.organizationId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100)
      .returns<
        { seq: number; title: string; status: TaskStatus; assignee_id: string | null; project: { key: string } }[]
      >(),
  ]);
  if (projects.error || open.error) return fail("unexpected", "Search could not be loaded.");

  return ok({
    projects: (projects.data ?? []) as PaletteIndex["projects"],
    tasks: [...(open.data ?? []), ...(finished.data ?? [])].map((task) => ({
      key: task.project.key,
      seq: task.seq,
      title: task.title,
      status: task.status,
      mine: task.assignee_id === viewer.userId,
    })),
  });
});
