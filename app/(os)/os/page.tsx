import { AlertTriangle, ArrowRight, CalendarClock, CircleDashed, FolderKanban, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DueDate, ProjectKey, daysUntil } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { FocusCard } from "@/components/os/focus-card";
import { ProgressRing, StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { SetupChecklist, type SetupStep } from "@/components/os/setup-checklist";
import { PriorityBadge, ProjectStatusBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { getDashboardProjects, type DashboardProject } from "@/features/projects/queries";
import { requireViewer, type Viewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Home" };

/** Days to a project's target date; dateless projects sort last rather than first. */
function targetDays(project: DashboardProject): number {
  return project.target_end_date ? daysUntil(project.target_end_date) : Number.POSITIVE_INFINITY;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Home (docs/features/dashboard.md).
 *
 * Answers one question: what should I do next? The page is ordered by how
 * loudly it needs to be heard — one focus panel for the single most pressing
 * thing, then the counts, then the lists. Task-based widgets (overdue, in
 * review, assigned to me) arrive with Phase 4; until then the honest signals
 * are projects that cannot start and dates that have passed.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/os">) {
  const [viewer, params] = await Promise.all([requireViewer(), searchParams]);
  const justJoined = first(params.welcome) === "1";
  const firstName = viewer.profile.fullName.split(" ")[0];

  const projects = await getDashboardProjects(viewer.organizationId);
  const canCreate = can(viewer, "project.create");
  const { greeting, today } = localDate(viewer);

  const active = projects.filter((p) => p.status === "active");
  const planning = projects.filter((p) => p.status === "planning");
  const stuck = planning.filter((p) => p.blockers > 0);
  const ready = projects.filter((p) => p.blockers === 0);
  const late = projects
    .filter(
      (p) => (p.status === "active" || p.status === "on_hold") && p.target_end_date && daysUntil(p.target_end_date) < 0,
    )
    .sort((a, b) => targetDays(a) - targetDays(b));
  const upcoming = projects
    .filter(
      (p) =>
        p.status !== "completed" && p.status !== "archived" && p.target_end_date && daysUntil(p.target_end_date) >= 0,
    )
    .sort((a, b) => targetDays(a) - targetDays(b))
    .slice(0, 5);

  const header = (
    <PageHeader
      eyebrow={today}
      title={`${greeting}, ${firstName || "there"}.`}
      description={
        justJoined
          ? `You are in ${viewer.organization.name}. Complete your profile so teammates recognise you.`
          : undefined
      }
      aside={<OrgCard viewer={viewer} projectCount={projects.length} />}
    />
  );

  if (projects.length === 0) {
    return (
      <PageBody>
        {header}
        <FocusCard
          eyebrow="Nothing here yet"
          title="Start with a project"
          description="Everything in Malhot OS hangs off a project: goals, the MVP, tasks, tests and documents. Create one and the rest of the OS has something to work with."
          action={canCreate ? { label: "Create your first project", href: "/os/projects/new" } : undefined}
        />
        {canCreate ? null : (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Ask an owner or admin to add you to a project, or to start one for your team."
          />
        )}
      </PageBody>
    );
  }

  const focus = pickFocus(late, stuck, upcoming);

  return (
    <PageBody>
      {header}

      {focus ? <FocusCard {...focus} /> : null}

      <SetupChecklist steps={setupSteps(viewer, projects)} />

      <StatRow>
        <StatTile
          label="Active"
          value={active.length}
          hint={active.length === 0 ? "Nothing in flight" : "In flight now"}
          icon={Rocket}
          tone="brand"
          href="/os/projects"
        />
        <StatTile
          label="In planning"
          value={planning.length}
          hint={stuck.length > 0 ? `${stuck.length} cannot start yet` : "All ready to start"}
          icon={CircleDashed}
          href="/os/projects"
        />
        <StatTile
          label="Past target"
          value={late.length}
          hint={late.length === 0 ? "Every date still holds" : "Needs a new date or a push"}
          icon={AlertTriangle}
          tone={late.length > 0 ? "danger" : "neutral"}
          href="/os/projects"
        />
        <StatTile
          label="Total projects"
          value={projects.length}
          hint={`${ready.length} fully set up`}
          icon={FolderKanban}
          href="/os/projects"
        />
      </StatRow>

      <div className="grid gap-7 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-7 lg:col-span-2">
          {late.length > 0 || stuck.length > 0 ? (
            <Panel title="Needs attention">
              <div className="flex flex-col gap-5">
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
                        <span className="text-[15px] text-fg-muted">
                          {project.blockers} item{project.blockers === 1 ? "" : "s"} missing
                        </span>
                      </ProjectRow>
                    ))}
                  </Section>
                ) : null}
              </div>
            </Panel>
          ) : null}

          <Panel
            title="Projects"
            action={
              <Link
                href="/os/projects"
                className="flex items-center gap-1.5 text-[15px] text-fg-muted hover:text-fg hover:underline"
              >
                All projects
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          >
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
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-7">
          <Panel title="Ready to start">
            <div className="flex flex-col items-center gap-3 py-2">
              <ProgressRing done={ready.length} total={projects.length} label="Projects fully set up" />
              <p className="text-center text-[15px] text-fg-muted">
                {ready.length === projects.length
                  ? "Every project has a manager, a start date, goals and an MVP."
                  : "A project counts once it has a manager, a start date, goals and an MVP."}
              </p>
            </div>
          </Panel>

          <Panel title="Upcoming targets">
            {upcoming.length === 0 ? (
              <EmptyState
                variant="well"
                icon={CalendarClock}
                title="No target dates ahead"
                description="Set target end dates so this fills in."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {upcoming.map((project) => (
                  <li key={project.key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    <ProjectKey value={project.key} />
                    <Link
                      href={`/os/projects/${project.key}`}
                      title={project.name}
                      className="min-w-0 flex-1 truncate text-[15px] font-medium hover:underline focus-visible:underline"
                    >
                      {project.name}
                    </Link>
                    <DueDate value={project.target_end_date} className="shrink-0 text-[15px]" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {canCreate ? (
            <Button asChild variant="outline" size="lg">
              <Link href="/os/projects/new">
                <Plus aria-hidden="true" />
                New project
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </PageBody>
  );
}

/**
 * Greeting and date in the viewer's own timezone, not the server's.
 *
 * A dashboard that says "Good morning" to someone at 9pm has told them the
 * whole page is guessing. An unusable timezone falls back to UTC rather than
 * throwing — a slightly wrong greeting beats a 500 on the home page.
 */
function localDate(viewer: Viewer): { greeting: string; today: string } {
  const timeZone = viewer.profile.timezone || "UTC";
  const now = new Date();

  const format = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(now);
    } catch {
      return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(now);
    }
  };

  const hour = Number(format({ hour: "numeric", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    today: format({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}

/** Which single thing the focus panel should carry, in order of how much it hurts. */
function pickFocus(
  late: DashboardProject[],
  stuck: DashboardProject[],
  upcoming: DashboardProject[],
): React.ComponentProps<typeof FocusCard> | null {
  const worst = late[0];
  if (worst?.target_end_date) {
    const days = Math.abs(daysUntil(worst.target_end_date));
    return {
      eyebrow: "Past target",
      title: worst.name,
      description:
        "This project is past the date it was meant to finish. Move the date or move the work — leaving it is the one option that costs you twice.",
      figure: { value: String(days), unit: days === 1 ? "day late" : "days late", caption: "Overdue by" },
      action: { label: `Open ${worst.key}`, href: `/os/projects/${worst.key}` },
    };
  }

  const blocked = stuck[0];
  if (blocked) {
    return {
      eyebrow: "Cannot start",
      title: blocked.name,
      description:
        "Planning is not finished: a manager, a start date, goals or an MVP is still missing, so the work cannot begin.",
      figure: {
        value: String(blocked.blockers),
        unit: blocked.blockers === 1 ? "item" : "items",
        caption: "Still missing",
      },
      action: { label: `Open ${blocked.key}`, href: `/os/projects/${blocked.key}` },
    };
  }

  const next = upcoming[0];
  if (next?.target_end_date) {
    const days = daysUntil(next.target_end_date);
    return {
      eyebrow: "Next target",
      title: next.name,
      description: "Nothing is late and nothing is blocked. This is the next date the team is working towards.",
      figure: {
        value: String(days),
        unit: days === 1 ? "day left" : "days left",
        caption: "Due in",
      },
      action: { label: `Open ${next.key}`, href: `/os/projects/${next.key}` },
    };
  }

  return null;
}

/** Setup steps, every one read off data that already exists — never a dismissed flag. */
function setupSteps(viewer: Viewer, projects: DashboardProject[]): SetupStep[] {
  return [
    {
      title: "Complete your profile",
      description: "A name, a photo and a job title, so teammates know who is on a task.",
      done: Boolean(viewer.profile.avatarUrl && viewer.profile.title),
      href: "/os/settings/profile",
    },
    {
      title: "Create a project",
      description: "Everything else in the OS hangs off one: goals, tasks, tests and documents.",
      done: projects.length > 0,
      href: "/os/projects/new",
    },
    {
      title: "Set goals",
      description: "What the project is for, in outcomes. Without them the MVP has nothing to answer to.",
      done: projects.some((project) => project.goalCount > 0),
      href: "/os/projects",
    },
    {
      title: "Define the MVP",
      description: "The smallest version worth shipping. This is what tasks get built against.",
      done: projects.some((project) => project.mvpCount > 0),
      href: "/os/projects",
    },
    {
      title: "Assign a manager",
      description: "Every project needs one person answerable for it.",
      done: projects.every((project) => project.manager_id),
      href: "/os/projects",
      optional: true,
    },
  ];
}

/** Where you are, at a glance — the counterpart to the greeting. */
function OrgCard({ viewer, projectCount }: { viewer: Viewer; projectCount: number }) {
  return (
    <div className="flex shrink-0 flex-col gap-1.5 rounded-lg border border-border bg-surface px-7 py-5">
      <span className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Currently in</span>
      <span className="text-2xl font-semibold tracking-[-0.02em]">{viewer.organization.name}</span>
      <span className="text-base text-fg-muted tabular-nums">
        {projectCount} project{projectCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">{title}</h3>
      <ul className="flex flex-col divide-y divide-border">{children}</ul>
    </div>
  );
}

function ProjectRow({ project, children }: { project: DashboardProject; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <ProjectKey value={project.key} />
      <Link
        href={`/os/projects/${project.key}`}
        title={project.name}
        className="min-w-0 flex-1 truncate text-[15px] font-medium hover:underline focus-visible:underline"
      >
        {project.name}
      </Link>
      <ProjectStatusBadge status={project.status} />
      <PriorityBadge priority={project.priority} />
      <div className="w-40 shrink-0 text-right text-[15px]">{children}</div>
    </li>
  );
}
