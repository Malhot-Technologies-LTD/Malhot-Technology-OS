"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDashed,
  Flag,
  FolderKanban,
  ListChecks,
  Rocket,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/os/app-sidebar.client";
import { DueDate, KeyValueList, ProgressBar, ProjectKey } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { FocusCard } from "@/components/os/focus-card";
import { ProgressRing, StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { SetupChecklist } from "@/components/os/setup-checklist";
import { GoalStatusBadge, MvpStatusBadge, PriorityBadge, ProjectStatusBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Priority, ProjectStatus } from "@/types/domain";

/** Fixture rows. Obviously invented, so nobody mistakes the gallery for real data. */
const PROJECTS: {
  key: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  priority: Priority;
  manager: string;
  target: string | null;
}[] = [
  {
    key: "UHP",
    name: "Umoja Health Platform",
    client: "Umoja Clinics",
    status: "active",
    priority: "high",
    manager: "Alpha N.",
    target: "2026-10-12",
  },
  {
    key: "MAL",
    name: "Malhot Technology OS",
    client: null,
    status: "planning",
    priority: "medium",
    manager: "Alpha N.",
    target: null,
  },
  {
    key: "KVU",
    name: "Kivu Logistics portal",
    client: "Kivu Freight",
    status: "on_hold",
    priority: "low",
    manager: "Levi M.",
    target: "2026-09-04",
  },
  {
    key: "SAFI",
    name: "Safi storefront",
    client: "Safi Foods",
    status: "completed",
    priority: "urgent",
    manager: "Malvyn K.",
    target: "2026-08-30",
  },
];

export function PreviewSurface() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [collapsed, setCollapsed] = useState(false);

  /*
   * The attribute goes on <html>, exactly where next-themes puts it in the real
   * OS — not on a wrapper. Custom properties resolve where they are declared,
   * so `--card: var(--surface)` declared on :root keeps the light --surface
   * even inside a nested [data-theme="dark"]. A wrapper would therefore show
   * every shadcn-aliased component (Card, Skeleton, muted text) in light
   * colours on a dark page, and the gallery would be lying about the design.
   */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = theme;
    return () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, [theme]);

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-bg text-fg">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Malhot OS — component gallery</span>
            <span className="text-xs text-fg-subtle">
              Real components, real tokens, fixture data. Development only.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "Dark theme" : "Light theme"}
          </Button>
        </div>

        <div className="flex min-h-[calc(100dvh-57px)]">
          {/* The component that actually ships, not a copy of it. */}
          <AppSidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            user={{
              fullName: "Alpha N.",
              email: "alpha@malhot.rw",
              avatarUrl: null,
              organizationName: "Malhot Technologies",
              orgRole: "owner",
            }}
          />

          <main className="min-w-0 flex-1">
            <PageBody>
              <PageHeader
                title="Projects"
                description="4 projects · 1 past target"
                actions={<Button>New project</Button>}
              />

              <FocusCard
                eyebrow="Past target"
                title="Kivu Logistics portal"
                description="This project is past the date it was meant to finish. Move the date or move the work &#8212; leaving it is the one option that costs you twice."
                figure={{ value: "18", unit: "days late", caption: "Overdue by" }}
                action={{ label: "Open KVU", href: "#" }}
              />

              <SetupChecklist
                steps={[
                  {
                    title: "Complete your profile",
                    description: "A name, a photo and a job title, so teammates know who is on a task.",
                    done: true,
                    href: "#",
                  },
                  {
                    title: "Create a project",
                    description: "Everything else in the OS hangs off one: goals, tasks, tests and documents.",
                    done: true,
                    href: "#",
                  },
                  {
                    title: "Set goals",
                    description: "What the project is for, in outcomes. Without them the MVP has nothing to answer to.",
                    done: false,
                    href: "#",
                  },
                  {
                    title: "Define the MVP",
                    description: "The smallest version worth shipping. This is what tasks get built against.",
                    done: false,
                    href: "#",
                  },
                  {
                    title: "Assign a manager",
                    description: "Every project needs one person answerable for it.",
                    done: false,
                    href: "#",
                    optional: true,
                  },
                ]}
              />

              <StatRow>
                <StatTile label="Active" value={1} hint="In flight now" icon={Rocket} tone="brand" href="#" />
                <StatTile label="In planning" value={1} hint="1 cannot start yet" icon={CircleDashed} href="#" />
                <StatTile
                  label="Past target"
                  value={1}
                  hint="Needs a new date or a push"
                  icon={AlertTriangle}
                  tone="danger"
                  href="#"
                />
                <StatTile label="Total projects" value={4} hint="2 fully set up" icon={FolderKanban} href="#" />
              </StatRow>

              <div className="grid items-center gap-6 rounded-lg border border-border bg-surface p-5 sm:grid-cols-[auto_1fr]">
                <ProgressRing done={2} total={4} label="Projects fully set up" />
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-medium">Ready to start</h2>
                  <p className="text-sm text-fg-muted">
                    A project counts once it has a manager, a start date, goals and an MVP.
                  </p>
                </div>
              </div>

              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {PROJECTS.map((p) => (
                  <li key={p.key}>
                    <div className="group flex h-full flex-col gap-5 rounded-lg border border-border bg-surface p-6 transition-[colors,transform] duration-[160ms] ease-standard hover:-translate-y-0.5 hover:border-border-strong">
                      <div className="flex items-start justify-between gap-3">
                        <ProjectKey value={p.key} />
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="truncate text-lg font-medium">{p.name}</h3>
                        <p className="truncate text-[15px] text-fg-muted">{p.client ?? "Internal"}</p>
                      </div>
                      <dl className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-5 text-[15px]">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <dt className="text-[13px] text-fg-subtle">Manager</dt>
                          <dd className="truncate text-fg-muted">{p.manager}</dd>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <dt className="text-[13px] text-fg-subtle">Target end</dt>
                          <dd>
                            <DueDate value={p.target} open={p.status !== "completed" && p.status !== "archived"} />
                          </dd>
                        </div>
                      </dl>
                      <PriorityBadge priority={p.priority} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="grid gap-7 lg:grid-cols-3">
                <div className="flex flex-col gap-7 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>2 things left</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-sm text-fg-muted">
                        A project needs these before it can move from planning to active.
                      </p>
                      <ul className="flex flex-col gap-2">
                        {[
                          ["At least one goal", true],
                          ["At least one MVP item", false],
                          ["A manager", true],
                          ["A start date", false],
                        ].map(([label, done]) => (
                          <li key={label as string} className="flex items-center gap-2 text-sm">
                            {done ? (
                              <CheckCircle2 className="size-4 shrink-0 text-status-success-fg" aria-hidden="true" />
                            ) : (
                              <Circle className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                            )}
                            <span className={done ? "text-fg-muted" : undefined}>{label as string}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ListChecks className="size-4 text-fg-muted" aria-hidden="true" />
                        MVP
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <ProgressBar done={5} total={8} label="Items done" />
                      <ul className="flex flex-col divide-y divide-border">
                        {[
                          ["Public booking page", "done"],
                          ["Clinician dashboard", "in_progress"],
                          ["SMS reminders", "planned"],
                        ].map(([title, status]) => (
                          <li key={title} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                            <span>{title}</span>
                            <MvpStatusBadge status={status as never} />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="size-4 text-fg-muted" aria-hidden="true" />
                        Goals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col divide-y divide-border">
                        {[
                          ["Cut booking time to under a minute", "in_progress"],
                          ["Launch in three clinics by October", "not_started"],
                          ["Pass the clinic security review", "achieved"],
                        ].map(([title, status]) => (
                          <li key={title} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                            <span>{title}</span>
                            <GoalStatusBadge status={status as never} />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-col gap-7">
                  <Card>
                    <CardHeader>
                      <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <KeyValueList
                        items={[
                          { label: "Start", value: <DueDate value="2026-08-01" open={false} /> },
                          { label: "Target end", value: <DueDate value="2026-10-12" relative /> },
                          { label: "QA sign-off", value: "Required" },
                          { label: "Your role", value: "manager" },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Flag className="size-4 text-fg-muted" aria-hidden="true" />
                        Milestones
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <ProgressBar done={1} total={3} label="Reached" />
                      <ul className="flex flex-col divide-y divide-border">
                        {[
                          ["Design sign-off", "2026-08-20"],
                          ["Beta with two clinics", "2026-09-15"],
                          ["Public launch", "2026-10-12"],
                        ].map(([title, due]) => (
                          <li key={title} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                            <span>{title}</span>
                            <DueDate value={due} />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Select control</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <Select defaultValue="medium">
                        <SelectTrigger id="gallery-priority" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Buttons</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button>Activate</Button>
                      <Button variant="outline">Put on hold</Button>
                      <Button variant="ghost">Cancel</Button>
                      <Button variant="destructive">Archive</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <EmptyState
                  title="No projects yet"
                  description="A project holds the goals, MVP, tasks and documents for one piece of client work."
                  action={<Button>Create your first project</Button>}
                />
                <ErrorState
                  title="The database is not responding"
                  description="Your data is safe — the connection timed out. Try again in a moment."
                  reference="7F3A2B10"
                  action={<Button>Try again</Button>}
                />
              </div>
            </PageBody>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
