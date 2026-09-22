import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DueDate, ProjectKey, daysUntil } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { PriorityBadge, ProjectStatusBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardProjects, type DashboardProject } from "@/features/projects/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Home" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Home (docs/features/dashboard.md).
 *
 * Answers one question: what should I do next? So it leads with work that is
 * stuck or late and keeps the rest to a glance. Task-based widgets (overdue, in
 * review, assigned to me) arrive with Phase 4; until then the honest signals
 * are projects that cannot start and dates that have passed.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/os">) {
  const [viewer, params] = await Promise.all([requireViewer(), searchParams]);
  const justJoined = first(params.welcome) === "1";
  const firstName = viewer.profile.fullName.split(" ")[0];

  const projects = await getDashboardProjects(viewer.organizationId);
  const canCreate = can(viewer, "project.create");

  const active = projects.filter((p) => p.status === "active");
  const planning = projects.filter((p) => p.status === "planning");
  const stuck = planning.filter((p) => p.blockers > 0);
  const late = projects.filter(
    (p) => (p.status === "active" || p.status === "on_hold") && p.target_end_date && daysUntil(p.target_end_date) < 0,
  );

  if (justJoined || projects.length === 0) {
    return (
      <PageBody>
        <PageHeader
          title={firstName ? `Welcome, ${firstName}` : "Welcome"}
          description={
            justJoined
              ? `You are in ${viewer.organization.name}. Complete your profile so teammates recognise you.`
              : undefined
          }
          actions={
            justJoined ? (
              <Button asChild>
                <Link href="/os/settings/profile">Complete profile</Link>
              </Button>
            ) : undefined
          }
        />
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Everything in Malhot OS hangs off a project: goals, the MVP, tasks, tests and documents."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/os/projects/new">Create your first project</Link>
              </Button>
            ) : undefined
          }
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={summarise(active.length, planning.length, late.length)}
        actions={
          canCreate ? (
            <Button asChild variant="outline">
              <Link href="/os/projects/new">
                <Plus aria-hidden="true" />
                New project
              </Link>
            </Button>
          ) : undefined
        }
      />

      {late.length > 0 || stuck.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {late.length > 0 ? (
              <Section title="Past their target end date">
                {late.map((project) => (
                  <ProjectRow key={project.key} project={project}>
                    <DueDate value={project.target_end_date} relative />
                  </ProjectRow>
                ))}
              </Section>
            ) : null}
            {stuck.length > 0 ? (
              <Section title="Cannot start yet">
                {stuck.map((project) => (
                  <ProjectRow key={project.key} project={project}>
                    <span className="text-sm text-fg-muted">
                      {project.blockers} item{project.blockers === 1 ? "" : "s"} missing
                    </span>
                  </ProjectRow>
                ))}
              </Section>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Projects</CardTitle>
          <Link
            href="/os/projects"
            className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
          >
            All projects
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {projects.slice(0, 8).map((project) => (
              <ProjectRow key={project.key} project={project}>
                <DueDate
                  value={project.target_end_date}
                  open={project.status !== "completed" && project.status !== "archived"}
                />
              </ProjectRow>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageBody>
  );
}

function summarise(active: number, planning: number, late: number): string {
  const parts = [`${active} active`, `${planning} in planning`];
  if (late > 0) parts.push(`${late} past target`);
  return parts.join(" · ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium tracking-[0.04em] text-fg-subtle uppercase">{title}</h3>
      <ul className="flex flex-col divide-y divide-border">{children}</ul>
    </div>
  );
}

function ProjectRow({ project, children }: { project: DashboardProject; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2 first:pt-0">
      <ProjectKey value={project.key} />
      <Link
        href={`/os/projects/${project.key}`}
        title={project.name}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline focus-visible:underline"
      >
        {project.name}
      </Link>
      <ProjectStatusBadge status={project.status} />
      <PriorityBadge priority={project.priority} />
      <div className="w-32 shrink-0 text-right">{children}</div>
    </li>
  );
}
