import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { ProjectHeader } from "@/features/projects/components/project-header";
import { projectHealth, taskTotals } from "@/features/projects/insights";
import { loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export async function generateMetadata({ params }: LayoutProps<"/os/projects/[key]">): Promise<Metadata> {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  const upper = key.toUpperCase();
  return { title: workspace.kind === "ok" ? { template: `%s · ${workspace.project.name}`, default: upper } : upper };
}

/**
 * The frame around every page inside a project: the header band and the tabs.
 * Pages render only their own content, so moving between tabs keeps the header
 * in place and swaps the body underneath it.
 */
export default async function ProjectLayout({ children, params }: LayoutProps<"/os/projects/[key]">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);

  if (workspace.kind === "error") {
    return (
      <PageBody>
        <PageHeader title={key.toUpperCase()} />
        {/* Not always a timeout: a missing column reads as a refused query,
            and "try again in a moment" would be advice that cannot work. */}
        <ErrorState {...describeQueryFailure(workspace.error)} />
      </PageBody>
    );
  }

  // W11: the key is already in the URL, so echoing it discloses nothing. The
  // name and the manager are withheld — existence itself is not confirmed.
  if (workspace.kind === "missing") {
    return (
      <PageBody>
        <PageHeader title={key.toUpperCase()} />
        <ErrorState
          title="You do not have access to this project"
          description="It may not exist, or you may not be a member of it. An organisation admin can add you."
        />
      </PageBody>
    );
  }

  const { project, perms, now } = workspace;
  const tasks = await loadTasks(project.id);
  const totals = tasks.data ? taskTotals(tasks.data, now) : null;
  const health = totals
    ? projectHealth({ status: project.status, targetEndDate: project.target_end_date, totals, now })
    : null;

  return (
    <div className="flex min-h-full flex-col">
      <ProjectHeader project={project} totals={totals} health={health} canChangeStatus={perms.changeStatus} now={now} />
      {project.status === "archived" ? (
        <div
          role="status"
          className="border-b border-border bg-bg-subtle px-6 py-2.5 text-sm text-fg-muted sm:px-8 xl:px-10 2xl:px-14"
        >
          This project is archived and read-only. An organisation admin can unarchive it.
        </div>
      ) : null}
      <div className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8 xl:px-10 2xl:px-14">{children}</div>
    </div>
  );
}
