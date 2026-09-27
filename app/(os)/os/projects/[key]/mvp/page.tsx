import { CheckCircle2, ListChecks, Loader, Pencil, Plus, XCircle } from "lucide-react";
import type { Metadata } from "next";

import { ProgressBar } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { MvpStatusBadge, PriorityBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { DeletePlanningButton, MvpDialog, MvpStatusSelect } from "@/features/projects/components/planning-forms.client";
import type { MvpItemRow } from "@/features/projects/queries";
import { loadPlanning, loadWorkspace } from "@/features/projects/workspace";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

export const metadata: Metadata = { title: "MVP" };

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/**
 * The minimum viable product: the smallest set of deliverables that satisfies
 * the goals, grouped by the goal each one serves. Dropped items stay visible,
 * struck through, so a cut is a recorded decision rather than a disappearance.
 */
export default async function ProjectMvpPage({ params }: PageProps<"/os/projects/[key]/mvp">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms } = workspace;

  const planning = await loadPlanning(project.id);
  if (planning.error) return <ErrorState {...describeQueryFailure(planning.error)} />;
  const { goals, mvpItems } = planning;

  const addButton = perms.contribute ? (
    <MvpDialog
      projectKey={project.key}
      goals={goals}
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New MVP item
        </Button>
      }
    />
  ) : null;

  if (mvpItems.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="The MVP is empty"
        description="List the smallest set of deliverables that would satisfy the goals. Everything else can wait for version two."
        action={addButton ?? undefined}
      />
    );
  }

  const live = mvpItems.filter((item) => item.status !== "dropped");
  const done = live.filter((item) => item.status === "done").length;
  const groups: { id: string; title: string; items: MvpItemRow[] }[] = [
    ...goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      items: mvpItems.filter((item) => item.goal_id === goal.id),
    })),
    { id: "none", title: "Not tied to a goal", items: mvpItems.filter((item) => !item.goal_id) },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <StatRow>
        <StatTile
          label="MVP items"
          value={live.length}
          hint={`${mvpItems.length - live.length} dropped`}
          icon={ListChecks}
          tone="brand"
        />
        <StatTile
          label="Done"
          value={done}
          hint={`${live.length === 0 ? 0 : Math.round((done / live.length) * 100)}% of the MVP`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="In progress"
          value={live.filter((item) => item.status === "in_progress").length}
          hint="Being built"
          icon={Loader}
        />
        <StatTile
          label="Planned"
          value={live.filter((item) => item.status === "planned").length}
          hint="Not started"
          icon={ListChecks}
        />
        <StatTile
          label="Urgent or high"
          value={live.filter((item) => item.status !== "done" && PRIORITY_RANK[item.priority] <= 1).length}
          hint="Open and pressing"
          icon={XCircle}
          tone="warning"
        />
      </StatRow>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
        <ProgressBar done={done} total={live.length} label="MVP complete" />
      </section>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Scope by goal</h2>
        {addButton}
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const groupLive = group.items.filter((item) => item.status !== "dropped");
          const groupDone = groupLive.filter((item) => item.status === "done").length;
          return (
            <section
              key={group.id}
              aria-labelledby={`mvp-group-${group.id}`}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-subtle px-5 py-3">
                <h3 id={`mvp-group-${group.id}`} className="text-sm font-semibold">
                  {group.title}
                </h3>
                <span className="text-xs text-fg-muted tabular-nums">
                  {groupDone} of {groupLive.length} done
                </span>
              </header>
              <ul className="divide-y divide-border">
                {[...group.items]
                  .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.position - b.position)
                  .map((item) => (
                    <li key={item.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            item.status === "dropped" && "text-fg-subtle line-through",
                          )}
                        >
                          {item.title}
                        </span>
                        {item.description ? (
                          <span className="line-clamp-2 text-[13px] text-fg-muted">{item.description}</span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <PriorityBadge priority={item.priority} />
                        {perms.contribute ? (
                          <MvpStatusSelect projectKey={project.key} itemId={item.id} status={item.status} />
                        ) : (
                          <MvpStatusBadge status={item.status} />
                        )}
                        {perms.contribute ? (
                          <MvpDialog
                            projectKey={project.key}
                            goals={goals}
                            item={item}
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.title}`}>
                                <Pencil aria-hidden="true" />
                              </Button>
                            }
                          />
                        ) : null}
                        {perms.deletePlanning ? (
                          <DeletePlanningButton projectKey={project.key} id={item.id} kind="mvp" name={item.title} />
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
