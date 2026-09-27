import type { Metadata } from "next";

import { KeyValueList, formatDate } from "@/components/os/data-display";
import { Panel } from "@/components/os/panel";
import { ProjectStatusBadge } from "@/components/os/status-badge";
import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form.client";
import { StatusActions } from "@/features/projects/components/status-actions.client";
import { loadWorkspace } from "@/features/projects/workspace";
import type { ProjectStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Settings" };

const LIFECYCLE: { status: ProjectStatus; meaning: string }[] = [
  { status: "planning", meaning: "Goals, MVP and the team are being set up. The key can still change." },
  { status: "active", meaning: "Work is being delivered. Health is tracked from here." },
  { status: "on_hold", meaning: "Paused on purpose. Resume it when work restarts." },
  { status: "completed", meaning: "Delivered. It can be reopened if more work comes in." },
  { status: "archived", meaning: "Read-only. Only an organisation admin can change anything." },
];

/** The project's details and lifecycle, for the people who run it. */
export default async function ProjectSettingsPage({ params }: PageProps<"/os/projects/[key]/settings">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, ctx } = workspace;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Panel
        title="Details"
        description={
          perms.editProject ? "Name, dates, client and description" : "Only the project manager can change these"
        }
      >
        {perms.editProject ? (
          <ProjectSettingsForm
            keyEditable={project.status === "planning"}
            project={{
              id: project.id,
              key: project.key,
              name: project.name,
              kind: project.kind,
              description: project.description,
              clientName: project.client?.name ?? null,
              priority: project.priority,
              startDate: project.start_date,
              targetEndDate: project.target_end_date,
            }}
          />
        ) : (
          <KeyValueList
            items={[
              { label: "Name", value: project.name },
              { label: "Key", value: project.key },
              {
                label: "Kind",
                value:
                  project.kind === "job"
                    ? `Job for ${project.client?.name ?? "an unnamed client"}`
                    : "Internal project",
              },
              { label: "Start", value: formatDate(project.start_date) },
              { label: "Target end", value: formatDate(project.target_end_date) },
            ]}
          />
        )}
      </Panel>

      <div className="flex flex-col gap-5">
        <Panel title="Status" description="Where the project is in its lifecycle">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ProjectStatusBadge status={project.status} />
            <StatusActions projectId={project.id} status={project.status} canChange={perms.changeStatus} />
          </div>
          <ol className="flex flex-col gap-2.5 border-t border-border pt-4">
            {LIFECYCLE.map((step) => (
              <li
                key={step.status}
                className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm ${step.status === project.status ? "bg-brand-subtle" : ""}`}
              >
                <ProjectStatusBadge status={step.status} />
                <span className="text-fg-muted">{step.meaning}</span>
              </li>
            ))}
          </ol>
          {project.status === "completed" && perms.changeStatus ? (
            <p className="text-[13px] text-fg-subtle">
              Archiving makes the project read-only for everyone but organisation admins.
            </p>
          ) : null}
        </Panel>

        <Panel title="About this project">
          <KeyValueList
            items={[
              { label: "Created", value: formatDate(project.created_at) },
              { label: "Last updated", value: formatDate(project.updated_at) },
              { label: "QA sign-off", value: project.qa_required ? "Required before done" : "Not required" },
              {
                label: "Your access",
                value: ctx.role
                  ? ctx.role.charAt(0).toUpperCase() + ctx.role.slice(1)
                  : ctx.group === "admin"
                    ? "Organisation admin"
                    : "—",
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
