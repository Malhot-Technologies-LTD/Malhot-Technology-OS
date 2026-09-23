import "server-only";

import { logger } from "@/lib/logger";
import { groupFor, type ProjectContext } from "@/lib/permissions";

import { readinessBlockers } from "./readiness";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, Priority, ProjectKind, ProjectRole, ProjectStatus } from "@/types/domain";

/**
 * Project reads (docs/features/projects.md). Every query runs on the viewer's
 * client, so RLS decides visibility: members see their projects, org admins see
 * all of them. Nothing here re-checks permissions — that would be a second
 * source of truth that could disagree with the database.
 */

export type ProjectListRow = {
  id: string;
  key: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  priority: Priority;
  target_end_date: string | null;
  updated_at: string;
  manager: { id: string; full_name: string } | null;
  client: { id: string; name: string } | null;
};

/** Live projects, newest activity first. Soft-deleted rows are excluded by RLS for members. */
export async function listProjects(organizationId: string, limit = 50) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select(
      "id, key, name, kind, status, priority, target_end_date, updated_at, manager:profiles!projects_manager_id_fkey(id, full_name), client:clients!projects_client_id_fkey(id, name)",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit)
    .returns<ProjectListRow[]>();
}

export type ProjectDetail = ProjectListRow & {
  description: string | null;
  qa_required: boolean;
  start_date: string | null;
  health_override: string | null;
  archived_at: string | null;
  created_at: string;
};

/** One project by its key, scoped to the organisation. `null` when it does not exist or RLS hides it. */
export async function getProjectByKey(organizationId: string, key: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select(
      "id, key, name, kind, status, priority, target_end_date, updated_at, description, qa_required, start_date, health_override, archived_at, created_at, manager:profiles!projects_manager_id_fkey(id, full_name), client:clients!projects_client_id_fkey(id, name)",
    )
    .eq("organization_id", organizationId)
    .eq("key", key.toUpperCase())
    .is("deleted_at", null)
    .maybeSingle<ProjectDetail>();
}

export type ProjectPlanning = {
  goals: { id: string; title: string; status: string; position: number }[];
  mvpItems: { id: string; title: string; status: string; goal_id: string | null; position: number }[];
  milestones: { id: string; title: string; due_date: string; completed_at: string | null }[];
};

/** Goals, MVP items and milestones for the overview, in display order. */
export async function getProjectPlanning(projectId: string): Promise<ProjectPlanning> {
  const supabase = await createClient();
  const [goals, mvpItems, milestones] = await Promise.all([
    supabase.from("goals").select("id, title, status, position").eq("project_id", projectId).order("position"),
    supabase
      .from("mvp_items")
      .select("id, title, status, goal_id, position")
      .eq("project_id", projectId)
      .order("position"),
    supabase
      .from("milestones")
      .select("id, title, due_date, completed_at")
      .eq("project_id", projectId)
      .order("due_date"),
  ]);
  return {
    goals: goals.data ?? [],
    mvpItems: mvpItems.data ?? [],
    milestones: milestones.data ?? [],
  };
}

/**
 * The viewer's standing in one project, for `can()`. Mirrors SQL
 * `project_group_of()` so the UI hides exactly what the database would refuse.
 */
export async function getProjectContext(
  project: { id: string; key: string; status: ProjectStatus; qa_required: boolean },
  viewer: { userId: string; orgRole: OrgRole },
): Promise<ProjectContext> {
  const supabase = await createClient();
  const membership = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const role = (membership.data?.role ?? null) as ProjectRole | null;
  return {
    projectId: project.id,
    key: project.key,
    status: project.status,
    qaRequired: project.qa_required,
    role,
    group: groupFor(viewer.orgRole, role),
  };
}

/** Clients for the project form's select. */
export async function listClients(organizationId: string) {
  const supabase = await createClient();
  return supabase.from("clients").select("id, name").eq("organization_id", organizationId).order("name");
}

export type DashboardProject = {
  key: string;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  target_end_date: string | null;
  manager_id: string | null;
  goalCount: number;
  mvpCount: number;
  /** Blocking readiness items outstanding; only meaningful while `planning`. */
  blockers: number;
};

/**
 * Everything `/os` needs, in a single wave of parallel queries.
 *
 * Deliberately three flat selects rather than one query with embedded
 * aggregates: the round trip to this deployment is ~400ms, so what matters is
 * the number of *waves*, not the number of queries in one. Grouping the ids in
 * JavaScript is free by comparison.
 */
export async function getDashboardProjects(organizationId: string): Promise<DashboardProject[]> {
  const supabase = await createClient();
  const [projects, goals, mvpItems] = await Promise.all([
    supabase
      .from("projects")
      .select("id, key, name, status, priority, start_date, target_end_date, manager_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase.from("goals").select("project_id"),
    supabase.from("mvp_items").select("project_id"),
  ]);

  const tally = (rows: { project_id: string }[] | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
    return counts;
  };
  const goalCounts = tally(goals.data);
  const mvpCounts = tally(mvpItems.data);

  return (projects.data ?? []).map((project) => {
    const goalCount = goalCounts.get(project.id) ?? 0;
    const mvpCount = mvpCounts.get(project.id) ?? 0;
    // Same rule the overview checklist and the Activate action use.
    const blockers = readinessBlockers({
      goalCount,
      mvpCount,
      managerId: project.manager_id,
      startDate: project.start_date,
    }).length;
    return { ...project, goalCount, mvpCount, blockers };
  });
}

export type ProjectMemberRow = {
  user_id: string;
  role: ProjectRole;
  created_at: string;
  profile: { id: string; full_name: string; title: string | null; avatar_url: string | null } | null;
};

/**
 * Everyone on a project. RLS shows the list only to people already on it.
 *
 * The embed names its foreign key. `project_members` reaches `profiles` twice —
 * once through `user_id` and once through `added_by` — so a bare
 * `profiles(...)` is ambiguous and PostgREST refuses the whole query rather
 * than guessing. That failure used to arrive as an empty list, which reads as
 * "nobody is on this project" and is the most misleading possible answer.
 */
export async function listProjectMembers(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_members")
    .select(
      "user_id, role, created_at, profile:profiles!project_members_user_id_fkey(id, full_name, title, avatar_url)",
    )
    .eq("project_id", projectId)
    .order("created_at")
    .returns<ProjectMemberRow[]>();
}

export type AssignableMember = { userId: string; fullName: string; title: string | null };

/**
 * Organisation members who are not on this project yet.
 *
 * Filtered here rather than in the picker so the control cannot offer someone
 * the `member_must_be_in_org` trigger or the unique constraint would refuse —
 * an option that always fails is worse than no option.
 */
export async function listAssignableMembers(organizationId: string, projectId: string): Promise<AssignableMember[]> {
  const supabase = await createClient();
  const [org, onProject] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, profile:profiles!organization_members_user_id_fkey(full_name, title)")
      .eq("organization_id", organizationId)
      .returns<{ user_id: string; profile: { full_name: string; title: string | null } | null }[]>(),
    supabase.from("project_members").select("user_id").eq("project_id", projectId),
  ]);

  if (org.error || onProject.error) return [];

  const taken = new Set((onProject.data ?? []).map((row) => row.user_id));
  return (org.data ?? [])
    .filter((row) => !taken.has(row.user_id))
    .map((row) => ({
      userId: row.user_id,
      fullName: row.profile?.full_name ?? "Unnamed",
      title: row.profile?.title ?? null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export type ProjectOption = { id: string; key: string; name: string; status: ProjectStatus };

/**
 * Projects for an "add someone to a project" picker.
 *
 * Deliberately narrow and separate from `listProjects`. That query carries the
 * full list row — manager, client, priority, `kind` — and a picker needs four
 * columns. Sharing it coupled the picker to every column the list happens to
 * want: when `kind` was added ahead of its migration, the select failed, the
 * caller's `?? []` turned the failure into an empty array, and the assign
 * dialog told people there were no projects to add anyone to. Selecting only
 * what is needed keeps this working through a schema change either way.
 *
 * Archived projects are excluded rather than offered and refused:
 * `project_members_insert` requires `project_is_writable`.
 */
export async function listProjectOptions(organizationId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, key, name, status")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(200)
    .returns<ProjectOption[]>();
}

export type MembershipRow = {
  user_id: string;
  role: ProjectRole;
  project: { id: string; key: string; name: string; status: ProjectStatus } | null;
};

/**
 * Every project membership in the organisation, for the team page.
 *
 * RLS narrows this per viewer without any help from here: `project_members`
 * is selectable only where `is_project_member(project_id)`, and an org admin
 * counts as a member of every project through `project_group_of`. So an admin
 * sees the whole company, and a member sees the projects they share — which is
 * the right answer for both without a branch in the query.
 */
export async function listOrganizationMemberships(organizationId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_members")
    .select("user_id, role, project:projects!inner(id, key, name, status, organization_id, deleted_at)")
    .eq("project.organization_id", organizationId)
    .is("project.deleted_at", null)
    .returns<(MembershipRow & { project: { organization_id: string; deleted_at: string | null } | null })[]>();
}

/**
 * Every project role this person holds, for deciding what belongs in their
 * sidebar. One narrow query per OS request, and RLS already scopes
 * `project_members` to projects they belong to, so no organisation filter is
 * needed — asking for "my rows" is the whole question.
 *
 * Failure returns an empty list rather than throwing: a sidebar missing two
 * optional sections is a far better outcome than an OS that will not render.
 */
export async function listViewerProjectRoles(userId: string): Promise<ProjectRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_members").select("role").eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((row) => row.role as ProjectRole);
}

export type ProjectTeamPreview = { userId: string; fullName: string; avatarUrl: string | null };

/**
 * Who is on each project, keyed by project id, for the list cards.
 *
 * One query for the whole list rather than one per card, and keyed on the
 * organisation rather than a list of ids so it can run *beside* the project
 * query instead of after it — waiting for ids it does not need cost a full
 * round trip on every visit to this page.
 *
 * RLS narrows it without help: project_members is selectable where
 * is_project_member(project_id), and an org admin resolves to a member of every
 * project, so this returns the teams of exactly the projects the viewer sees.
 *
 * Managers first, then by name, so the person answerable for the work is the
 * first face on the card and the order never shifts between renders.
 */
export async function listTeamsByProject(organizationId: string): Promise<Map<string, ProjectTeamPreview[]>> {
  const teams = new Map<string, ProjectTeamPreview[]>();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "project_id, role, profile:profiles!project_members_user_id_fkey(id, full_name, avatar_url), project:projects!inner(organization_id)",
    )
    .eq("project.organization_id", organizationId)
    .returns<
      {
        project_id: string;
        role: ProjectRole;
        profile: { id: string; full_name: string; avatar_url: string | null } | null;
      }[]
    >();
  if (error) {
    // Never silently: an empty map renders as "nobody assigned", which is a
    // statement about the team rather than about the query that failed.
    logger.error("projects.teams_failed", { code: error.code, message: error.message });
    return teams;
  }

  const ranked = [...(data ?? [])].sort((a, b) => {
    if (a.role !== b.role) return a.role === "manager" ? -1 : b.role === "manager" ? 1 : 0;
    return (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "");
  });

  for (const row of ranked) {
    if (!row.profile) continue;
    const list = teams.get(row.project_id) ?? [];
    list.push({ userId: row.profile.id, fullName: row.profile.full_name, avatarUrl: row.profile.avatar_url });
    teams.set(row.project_id, list);
  }
  return teams;
}
