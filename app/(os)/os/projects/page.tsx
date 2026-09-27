import { AlertTriangle, CheckCircle2, CircleDashed, Gauge, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { ProjectBrowser, type BrowserProject } from "@/features/projects/components/project-browser.client";
import { daysLeft, projectHealth, taskTotals } from "@/features/projects/insights";
import { getProjectListStats, listProjects, listTeamsByProject } from "@/features/projects/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Projects" };

/** Project list (docs/features/projects.md#project-list). */
export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const canCreate = can(viewer, "project.create");

  // One wave: none of these depends on another's result.
  const [{ data, error }, teams, stats] = await Promise.all([
    listProjects(viewer.organizationId, 200),
    listTeamsByProject(viewer.organizationId),
    getProjectListStats(viewer.organizationId),
  ]);
  const newButton = canCreate ? (
    <Button asChild>
      <Link href="/os/projects/new">
        <Plus aria-hidden="true" /> New project
      </Link>
    </Button>
  ) : undefined;

  if (error) {
    // Rendering the reason beats throwing: the boundary only has a digest, and
    // in production Next strips the message, so the one useful fact is lost.
    logger.error("projects.list_failed", { code: error.code, message: error.message });
    return (
      <PageBody>
        <PageHeader title="Projects" />
        <ErrorState {...describeQueryFailure(error)} />
      </PageBody>
    );
  }

  const now = requestTime();
  const projects: BrowserProject[] = data.map((project) => {
    const tasks = stats.tasks
      .filter((task) => task.project_id === project.id)
      .map((task) => ({
        ...task,
        id: "",
        assignee: task.assignee_id ? { id: task.assignee_id, full_name: "", avatar_url: null } : null,
      }));
    const totals = taskTotals(tasks, now);
    const next = stats.milestones.find((milestone) => milestone.project_id === project.id && !milestone.completed_at);
    return {
      id: project.id,
      key: project.key,
      name: project.name,
      kind: project.kind,
      status: project.status,
      priority: project.priority,
      clientName: project.client?.name ?? null,
      managerName: project.manager?.full_name ?? null,
      targetEndDate: project.target_end_date,
      updatedAt: project.updated_at,
      total: totals.total,
      done: totals.done,
      open: totals.open,
      overdue: totals.overdue,
      percent: totals.percent,
      health: projectHealth({ status: project.status, targetEndDate: project.target_end_date, totals, now }),
      daysLeft: project.target_end_date ? daysLeft(project.target_end_date, now) : null,
      nextMilestone: next ? { title: next.title, dueDate: next.due_date } : null,
      team: [...(teams.get(project.id) ?? [])],
    };
  });

  const count = (predicate: (project: BrowserProject) => boolean) => projects.filter(predicate).length;
  const troubled = count((project) => project.health !== null && project.health.health !== "on_track");
  const overdueTasks = projects.reduce((sum, project) => sum + project.overdue, 0);

  return (
    <PageBody>
      <PageHeader
        title="Projects"
        description={`${projects.length} project${projects.length === 1 ? "" : "s"} across the company`}
        actions={projects.length > 0 ? newButton : undefined}
      />
      {projects.length > 0 ? (
        <StatRow>
          <StatTile
            label="Active"
            value={count((p) => p.status === "active")}
            hint="Being delivered"
            icon={Rocket}
            tone="brand"
          />
          <StatTile
            label="Planning"
            value={count((p) => p.status === "planning")}
            hint="Getting ready to start"
            icon={CircleDashed}
          />
          <StatTile
            label="Need attention"
            value={troubled}
            hint={troubled === 0 ? "Every running project on track" : "At risk or off track"}
            icon={Gauge}
            tone={troubled > 0 ? "warning" : "neutral"}
          />
          <StatTile
            label="Overdue tasks"
            value={overdueTasks}
            hint="Across all projects"
            icon={AlertTriangle}
            tone={overdueTasks > 0 ? "danger" : "neutral"}
          />
          <StatTile
            label="Completed"
            value={count((p) => p.status === "completed")}
            hint="Delivered"
            icon={CheckCircle2}
            tone="success"
          />
        </StatRow>
      ) : null}
      <ProjectBrowser projects={projects} canCreate={canCreate} />
    </PageBody>
  );
}
