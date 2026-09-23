import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Priority } from "@/types/domain";

import type { TaskStatus } from "./schemas";

/**
 * Task reads (docs/features/tasks.md). Every query runs on the viewer's client,
 * so RLS decides visibility: `tasks_select` shows a task only to people on its
 * project.
 */

export type TaskRow = {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
};

/**
 * A project's tasks, unfinished first and soonest deadline at the top.
 *
 * Ordering is done here rather than in the page because it is the same question
 * every caller has: what is still open, and what runs out first. Tasks with no
 * deadline sort after dated ones — they are not urgent, they are just undated.
 */
export async function listProjectTasks(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("tasks")
    .select(
      "id, seq, title, description, status, priority, due_at, started_at, completed_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)",
    )
    .eq("project_id", projectId)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("seq", { ascending: true })
    .returns<TaskRow[]>();
}

export type MyTaskRow = TaskRow & { project: { key: string; name: string } | null };

/**
 * Everything assigned to one person, across every project they are on.
 *
 * Completed work is excluded rather than sorted last: this answers "what do I
 * owe", and a finished task is not owed. The project has to come back with each
 * row because the whole point is that it spans projects.
 */
export async function listMyTasks(userId: string) {
  const supabase = await createClient();
  return supabase
    .from("tasks")
    .select(
      "id, seq, title, description, status, priority, due_at, started_at, completed_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!inner(key, name)",
    )
    .eq("assignee_id", userId)
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(100)
    .returns<MyTaskRow[]>();
}
