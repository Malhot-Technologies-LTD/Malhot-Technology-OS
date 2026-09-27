import { formatDate } from "@/components/os/data-display";
import { ProjectStatusBadge, StatusPill } from "@/components/os/status-badge";
import { StatusActions } from "@/features/projects/components/status-actions.client";
import { ProjectTabs } from "@/features/projects/components/project-tabs.client";
import { HEALTH_META, daysLeft, type Health, type TaskTotals } from "@/features/projects/insights";
import type { ProjectDetail } from "@/features/projects/queries";
import { cn } from "@/lib/utils";

/**
 * The band at the top of every project page: who and what this is, how it is
 * going in one line, and the tabs. Deliberately short — the tabs are the point,
 * and a header that pushes them below the fold defeats them.
 *
 * One line of hierarchy, not three. The name is the largest thing here and the
 * only badge beside it is the project's own state; health sits out on the right
 * with the controls that change it, and everything else — client, manager,
 * dates, priority, progress — recedes into a single quiet line underneath.
 *
 * That line carries no icons. A building, a person and a calendar at 14px are
 * three more shapes to parse for facts whose meaning is already obvious from
 * their content, and they were competing with the name for the same glance.
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
  const overdue = left !== null && left < 0;

  return (
    <header className="border-b border-border bg-surface px-6 pt-6 sm:px-8 xl:px-10 2xl:px-14">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand-subtle font-mono text-sm font-semibold text-brand"
          >
            {project.key}
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-[26px] leading-tight font-semibold tracking-[-0.02em]">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>

            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-muted">
              <li>{project.kind === "job" ? (project.client?.name ?? "Client not set") : "Internal project"}</li>
              <Dot />
              <li>{project.manager ? project.manager.full_name : "No manager"}</li>
              <Dot />
              <li className="tabular-nums">
                {formatDate(project.start_date)} → {formatDate(project.target_end_date)}
                {open && left !== null ? (
                  <span className={cn("ml-1.5", overdue ? "font-medium text-status-danger-fg" : "text-fg-subtle")}>
                    {overdue ? `${Math.abs(left)}d over` : `${left}d left`}
                  </span>
                ) : null}
              </li>
              {/* Urgent is the only priority worth colouring — if every level
                  draws the eye, none of them does. */}
              {project.priority !== "medium" ? (
                <>
                  <Dot />
                  <li className={project.priority === "urgent" ? "font-medium text-status-danger-fg" : undefined}>
                    {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} priority
                  </li>
                </>
              ) : null}
              {totals && totals.total > 0 ? (
                <>
                  <Dot />
                  <li className="flex items-center gap-2">
                    <span
                      className="h-1 w-16 overflow-hidden rounded-full bg-bg-subtle"
                      role="img"
                      aria-label={`${totals.done} of ${totals.total} tasks done`}
                    >
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${totals.percent}%` }} />
                    </span>
                    <span className="tabular-nums">
                      {totals.done}/{totals.total} tasks
                    </span>
                  </li>
                </>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {health ? (
            <span title={health.reason}>
              <StatusPill tone={HEALTH_META[health.health].tone}>{HEALTH_META[health.health].label}</StatusPill>
            </span>
          ) : null}
          <StatusActions projectId={project.id} status={project.status} canChange={canChangeStatus} />
        </div>
      </div>

      <div className="mt-5">
        <ProjectTabs projectKey={project.key} />
      </div>
    </header>
  );
}

/** Separator for the metadata line, hidden from the reading order. */
function Dot() {
  return (
    <li aria-hidden="true" className="text-fg-subtle">
      ·
    </li>
  );
}
