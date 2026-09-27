import { CalendarRange, Building2, UserRound } from "lucide-react";

import { formatDate } from "@/components/os/data-display";
import { ProjectStatusBadge, PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { StatusActions } from "@/features/projects/components/status-actions.client";
import { ProjectTabs } from "@/features/projects/components/project-tabs.client";
import { HEALTH_META, daysLeft, type Health, type TaskTotals } from "@/features/projects/insights";
import type { ProjectDetail } from "@/features/projects/queries";

/**
 * The band at the top of every project page: who and what this is, how it is
 * going in one line, and the tabs. Deliberately short — the tabs are the point,
 * and a header that pushes them below the fold defeats them.
 */
export function ProjectHeader({
  project,
  totals,
  health,
  canChangeStatus,
  now,
}: {
  project: ProjectDetail;
  totals: TaskTotals | null;
  health: { health: Health; reason: string } | null;
  canChangeStatus: boolean;
  now: number;
}) {
  const open = project.status !== "completed" && project.status !== "archived";
  const left = project.target_end_date ? daysLeft(project.target_end_date, now) : null;

  return (
    <header className="border-b border-border bg-surface px-6 pt-6 sm:px-8 xl:px-10 2xl:px-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand-subtle font-mono text-sm font-semibold text-brand"
          >
            {project.key}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl leading-tight font-semibold tracking-[-0.02em]">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
              {health ? (
                <span title={health.reason}>
                  <StatusPill tone={HEALTH_META[health.health].tone}>{HEALTH_META[health.health].label}</StatusPill>
                </span>
              ) : null}
              <PriorityBadge priority={project.priority} />
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-fg-muted">
              <li className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-fg-subtle" aria-hidden="true" />
                {project.kind === "job" ? (project.client?.name ?? "Client not set") : "Internal project"}
              </li>
              <li className="flex items-center gap-1.5">
                <UserRound className="size-3.5 text-fg-subtle" aria-hidden="true" />
                {project.manager ? project.manager.full_name : "No manager"}
              </li>
              <li className="flex items-center gap-1.5">
                <CalendarRange className="size-3.5 text-fg-subtle" aria-hidden="true" />
                <span className="tabular-nums">
                  {formatDate(project.start_date)} → {formatDate(project.target_end_date)}
                </span>
                {open && left !== null ? (
                  <span className={left < 0 ? "font-medium text-status-danger-fg" : "text-fg-subtle"}>
                    ({left < 0 ? `${Math.abs(left)}d over` : `${left}d left`})
                  </span>
                ) : null}
              </li>
              {totals && totals.total > 0 ? (
                <li className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-subtle"
                    role="img"
                    aria-label={`${totals.done} of ${totals.total} tasks done`}
                  >
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${totals.percent}%` }} />
                  </span>
                  <span className="tabular-nums">
                    {totals.percent}% · {totals.done}/{totals.total} tasks
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <StatusActions projectId={project.id} status={project.status} canChange={canChangeStatus} />
      </div>
      <div className="mt-4">
        <ProjectTabs projectKey={project.key} />
      </div>
    </header>
  );
}
