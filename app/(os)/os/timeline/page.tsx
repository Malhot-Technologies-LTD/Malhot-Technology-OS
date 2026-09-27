import { ChartGantt, Flag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { Gantt, type GanttRow, type GanttTone } from "@/components/os/gantt";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/os/status-badge";
import { daysLeft } from "@/features/projects/insights";
import { getProjectListStats } from "@/features/projects/queries";
import { projectHref } from "@/features/projects/tabs";
import { timelineRange, toTime } from "@/features/timeline/scale";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Timeline" };

const STATUS_TONE: Record<ProjectStatus, GanttTone> = {
  planning: "neutral",
  active: "brand",
  on_hold: "warning",
  completed: "success",
  archived: "neutral",
};

type Row = {
  id: string;
  key: string;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  target_end_date: string | null;
};

/**
 * Every project the viewer can see, laid out in time: each one's span with its
 * milestones on it and how far through its tasks it is, then the milestones
 * coming up across the company.
 */
export default async function PortfolioTimelinePage({ searchParams }: PageProps<"/os/timeline">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const showFinished = query.show === "all";
  const supabase = await createClient();
  const [projects, stats] = await Promise.all([
    supabase
      .from("projects")
      .select("id, key, name, status, start_date, target_end_date")
      .eq("organization_id", viewer.organizationId)
      .is("deleted_at", null)
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(200)
      .returns<Row[]>(),
    getProjectListStats(viewer.organizationId),
  ]);
  const now = requestTime();

  const visible = (projects.data ?? []).filter(
    (project) => showFinished || (project.status !== "completed" && project.status !== "archived"),
  );
  const dated = visible.filter((project) => project.start_date || project.target_end_date);
  const undated = visible.filter((project) => !project.start_date && !project.target_end_date);
  const milestones = stats.milestones.filter((milestone) =>
    visible.some((project) => project.id === milestone.project_id),
  );

  const header = (
    <PageHeader
      title="Timeline"
      description="Every project in time, with its milestones and progress"
      actions={
        <Link
          href={showFinished ? "/os/timeline" : "/os/timeline?show=all"}
          className="text-sm text-fg-muted hover:text-fg hover:underline"
        >
          {showFinished ? "Hide finished projects" : "Include finished projects"}
        </Link>
      }
    />
  );

  if (dated.length === 0) {
    return (
      <PageBody>
        {header}
        <EmptyState
          icon={ChartGantt}
          title="No project has dates yet"
          description="Give projects a start and target end date in their Settings tab and they line up here."
        />
      </PageBody>
    );
  }

  const range = timelineRange(
    [
      ...dated.flatMap((project) => [toTime(project.start_date), toTime(project.target_end_date)]),
      ...milestones.map((milestone) => toTime(milestone.due_date)),
    ],
    now,
  );

  const rows: GanttRow[] = dated.map((project) => {
    const tasks = stats.tasks.filter((task) => task.project_id === project.id);
    const done = tasks.filter((task) => task.status === "done").length;
    const start = toTime(project.start_date) ?? now;
    const end = toTime(project.target_end_date);
    const late = end !== null && end < now && project.status !== "completed" && project.status !== "archived";
    return {
      kind: "bar",
      id: project.id,
      label: project.name,
      sublabel: `${project.key} · ${formatDate(project.start_date)} → ${formatDate(project.target_end_date)} · ${tasks.length === 0 ? "no tasks" : `${Math.round((done / tasks.length) * 100)}% done`}`,
      href: projectHref(project.key, "timeline"),
      from: start,
      to: end ?? start + 30 * 86_400_000,
      openEnded: end === null,
      tone: late ? "danger" : STATUS_TONE[project.status],
      progress: tasks.length === 0 ? undefined : done / tasks.length,
      description: `${project.name}: ${formatDate(project.start_date)} to ${formatDate(project.target_end_date)}, ${done} of ${tasks.length} tasks done`,
      markers: stats.milestones
        .filter((milestone) => milestone.project_id === project.id)
        .map((milestone) => ({
          at: toTime(milestone.due_date) ?? now,
          label: milestone.title,
          done: Boolean(milestone.completed_at),
        })),
    };
  });

  const upcoming = milestones.filter((milestone) => !milestone.completed_at).slice(0, 12);
  const keyOf = new Map((projects.data ?? []).map((project) => [project.id, project]));

  return (
    <PageBody>
      {header}
      <Gantt range={range} now={now} caption="Projects timeline" sections={[{ id: "projects", rows }]} />
      {undated.length > 0 ? (
        <p className="-mt-3 text-[13px] text-fg-subtle">
          Not shown, no dates set:{" "}
          {undated.map((project, index) => (
            <span key={project.id}>
              {index > 0 ? ", " : ""}
              <Link href={projectHref(project.key, "settings")} className="hover:underline">
                {project.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <Panel title="Upcoming milestones" description="Across every project you can see, soonest first">
        {upcoming.length === 0 ? (
          <p className="text-sm text-fg-muted">No open milestones.</p>
        ) : (
          <ul className="-mx-5 -mb-5 divide-y divide-border border-t border-border">
            {upcoming.map((milestone, index) => {
              const project = keyOf.get(milestone.project_id);
              const left = daysLeft(milestone.due_date, now);
              return (
                <li
                  key={`${milestone.project_id}-${milestone.title}-${index}`}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  <Flag className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-medium">{milestone.title}</span>
                  {project ? (
                    <Link
                      href={projectHref(project.key, "milestones")}
                      className="hidden shrink-0 text-fg-muted hover:underline sm:block"
                    >
                      <span className="font-mono text-xs">{project.key}</span> · {project.name}
                    </Link>
                  ) : null}
                  <span className="w-20 shrink-0 text-right">{formatDate(milestone.due_date)}</span>
                  <StatusPill
                    tone={left < 0 ? "danger" : left <= 7 ? "warning" : "neutral"}
                    className="w-24 justify-center"
                  >
                    {left < 0 ? `${Math.abs(left)}d late` : left === 0 ? "Today" : `${left}d left`}
                  </StatusPill>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </PageBody>
  );
}
