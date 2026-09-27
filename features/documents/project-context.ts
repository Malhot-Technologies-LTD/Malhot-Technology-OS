import type { MilestoneRow, ProjectDetail, ProjectMemberRow } from "@/features/projects/queries";
import { projectRoleLabel } from "@/features/projects/roles";

import type { TemplateContext } from "./template-kit";

export type TemplateProject = NonNullable<TemplateContext["project"]>;

/** Only the facts every generator page already has, for pickers that list many projects. */
export function basicTemplateProject(project: Pick<ProjectDetail, "key" | "name" | "client">): TemplateProject {
  return { key: project.key, name: project.name, clientName: project.client?.name ?? null };
}

/**
 * A project as templates read it, so a new document starts from the system's
 * data (manager, team, dates, milestones) instead of asking for it again. Only
 * field defaults read this: a saved document keeps the values it was saved with.
 */
export function toTemplateProject(
  project: Pick<
    ProjectDetail,
    "key" | "name" | "client" | "description" | "start_date" | "target_end_date" | "manager"
  >,
  members: readonly ProjectMemberRow[],
  milestones: readonly Pick<MilestoneRow, "title" | "due_date" | "completed_at">[],
): TemplateProject {
  return {
    ...basicTemplateProject(project),
    description: project.description,
    startDate: project.start_date,
    targetEndDate: project.target_end_date,
    managerName: project.manager?.full_name ?? null,
    team: members
      .filter((member) => member.profile)
      .map((member) => ({ name: member.profile!.full_name, role: projectRoleLabel(member.role) })),
    milestones: milestones.map((milestone) => ({
      title: milestone.title,
      due: milestone.due_date,
      done: milestone.completed_at !== null,
    })),
  };
}
