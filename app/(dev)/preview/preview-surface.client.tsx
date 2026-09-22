"use client";

import { CheckCircle2, Circle, Flag, ListChecks, Target } from "lucide-react";
import { useState } from "react";

import { AppSidebar } from "@/components/os/app-sidebar.client";
import { DueDate, KeyValueList, ProgressBar, ProjectKey } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { GoalStatusBadge, MvpStatusBadge, PriorityBadge, ProjectStatusBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <TooltipProvider>
      <div data-theme={theme} className="min-h-dvh bg-bg text-fg">
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

              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {PROJECTS.map((p) => (
                  <li key={p.key}>
                    <div className="group flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors duration-[120ms] hover:border-border-strong">
                      <div className="flex items-start justify-between gap-3">
                        <ProjectKey value={p.key} />
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="truncate text-[15px] font-medium">{p.name}</h3>
                        <p className="truncate text-sm text-fg-muted">{p.client ?? "Internal"}</p>
                      </div>
                      <dl className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4 text-sm">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <dt className="text-xs text-fg-subtle">Manager</dt>
                          <dd className="truncate text-fg-muted">{p.manager}</dd>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <dt className="text-xs text-fg-subtle">Target end</dt>
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

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">2 things left</CardTitle>
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

                <div className="flex flex-col gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Details</CardTitle>
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
                      <CardTitle className="text-base">Buttons</CardTitle>
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
