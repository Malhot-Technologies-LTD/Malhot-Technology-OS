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
  accepted_at: string | null;
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
      "id, seq, title, description, status, priority, due_at, started_at, accepted_at, completed_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)",
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
      "id, seq, title, description, status, priority, due_at, started_at, accepted_at, completed_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!inner(key, name)",
    )
    .eq("assignee_id", userId)
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(100)
    .returns<MyTaskRow[]>();
}

export type TeamTaskRow = TaskRow & { project: { id: string; key: string; name: string } | null };

/**
 * Every open task across the organisation, for a manager looking at who is
 * carrying what.
 *
 * RLS does the scoping without help: `tasks_select` requires
 * `is_project_member(project_id)`, and `project_group_of` resolves an org admin
 * to a member of every project. So an admin sees the whole company and a
 * manager sees the projects they are on — which is the right answer for both
 * without a branch here.
 *
 * Completed work is excluded. The question this answers is "who is loaded and
 * what runs out first", and a finished task is neither.
 */
export async function listTeamTasks(organizationId: string) {
  const supabase = await createClient();
  return supabase
    .from("tasks")
    .select(
      "id, seq, title, description, status, priority, due_at, started_at, accepted_at, completed_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!tasks_project_id_fkey!inner(id, key, name, organization_id)",
    )
    .eq("project.organization_id", organizationId)
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(500)
    .returns<TeamTaskRow[]>();
}

export type AcceptanceRow = {
  id: string;
  seq: number;
  title: string;
  accepted_at: string | null;
  due_at: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  project: { key: string; name: string } | null;
};

/**
 * Work handed out and picked up, most recent first.
 *
 * Derived from `accepted_at` rather than written into a notifications table
 * when someone accepts. A derived feed cannot disagree with the tasks it
 * describes: there is no second row to forget to write, no row left behind when
 * a task is deleted, and no way for the count to drift from reality. The cost
 * is that it has no read state, which is why the bell counts the other list.
 */
export async function listRecentAcceptances(organizationId: string, limit = 20) {
  const supabase = await createClient();
  return supabase
    .from("tasks")
    .select(
      "id, seq, title, accepted_at, due_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!tasks_project_id_fkey!inner(key, name, organization_id)",
    )
    .eq("project.organization_id", organizationId)
    .not("accepted_at", "is", null)
    .order("accepted_at", { ascending: false })
    .limit(limit)
    .returns<AcceptanceRow[]>();
}

/**
 * Work handed out and *not* picked up — the list a manager can act on.
 *
 * This is the one that clears itself, so it is what the bell counts. "Three
 * people accepted something" is reassurance; "three tasks have been sitting
 * unacknowledged" is a thing to go and chase.
 */
export async function listAwaitingAcceptance(organizationId: string, limit = 50) {
  const supabase = await createClient();
  return supabase
    .from("tasks")
    .select(
      "id, seq, title, accepted_at, due_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!tasks_project_id_fkey!inner(key, name, organization_id)",
    )
    .eq("project.organization_id", organizationId)
    .is("accepted_at", null)
    .not("assignee_id", "is", null)
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(limit)
    .returns<AcceptanceRow[]>();
}
