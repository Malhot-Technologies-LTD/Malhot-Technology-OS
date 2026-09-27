"use client";

import { FileSignature, FolderKanban, Moon, Plus, Search, Settings, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import type { NavAudience } from "@/components/os/nav-audience";
import { visibleNavItems } from "@/components/os/nav";
import { PROJECT_STATUS, StatusPill } from "@/components/os/status-badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { PROJECT_TABS, projectHref } from "@/features/projects/tabs";
import { paletteIndex, type PaletteIndex } from "@/features/search/actions";
import { StatusGlyph } from "@/features/tasks/components/task-line";
import { taskHref, taskRef } from "@/features/tasks/links";

/**
 * Global palette (Ctrl/⌘ K).
 *
 * Searches projects and tasks by name or reference, jumps to any page of the
 * project you are in, and runs the common actions. The index loads once, on
 * first open, and filters locally after that, so typing never waits on the
 * network.
 *
 * cmdk needs its `Command` root inside the dialog: without it every input and
 * item reaches for a store that does not exist, and opening the palette used to
 * crash the whole page into the error boundary.
 */
export function CommandPalette({ audience }: { audience: NavAudience }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<PaletteIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const canStartProjects = audience.orgRole !== "member";

  // The project the reader is in, if any: /os/projects/AS/board → "AS".
  const currentKey = /^\/os\/projects\/([A-Z]{2,6})(?:\/|$)/.exec(pathname)?.[1] ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fetched on first open — not on mount — so it costs nothing to people who never use it.
  useEffect(() => {
    if (!open || index !== null || failed) return;
    let cancelled = false;
    void paletteIndex().then((result) => {
      if (cancelled) return;
      if (result.ok) setIndex(result.data);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, index, failed]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const currentProject = currentKey ? index?.projects.find((project) => project.key === currentKey) : null;
  const myTasks = index?.tasks.filter((task) => task.mine && task.status !== "done") ?? [];
  const otherTasks = index?.tasks.filter((task) => !(task.mine && task.status !== "done")) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-bg-subtle px-4 text-[15px] text-fg-subtle transition-colors duration-[120ms] hover:border-border-strong hover:text-fg-muted sm:w-[26rem] md:w-[32rem]"
      >
        <Search className="size-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left">Search projects and tasks, or jump to&#8230;</span>
        <kbd className="hidden shrink-0 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg-subtle sm:block">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Find a project or task, run an action, or jump to a page"
        className="sm:max-w-2xl"
      >
        <Command loop>
          <CommandInput placeholder="Search projects, tasks (e.g. AS-12), pages…" />
          <CommandList className="max-h-[min(28rem,60vh)]">
            <CommandEmpty>
              {failed
                ? "Search could not be loaded. Close and try again."
                : index === null
                  ? "Loading…"
                  : "Nothing matches."}
            </CommandEmpty>

            {currentKey ? (
              <CommandGroup
                heading={currentProject ? `In ${currentProject.key} · ${currentProject.name}` : `In ${currentKey}`}
              >
                {PROJECT_TABS.map((tab) => (
                  <CommandItem
                    key={tab.slug || "overview"}
                    value={`${currentKey} ${tab.label} ${tab.keywords}`}
                    onSelect={() => go(projectHref(currentKey, tab.slug))}
                  >
                    <tab.icon aria-hidden="true" />
                    {tab.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {myTasks.length > 0 ? (
              <CommandGroup heading="My open tasks">
                {myTasks.slice(0, 50).map((task) => (
                  <TaskItem key={`${task.key}-${task.seq}`} task={task} onSelect={go} />
                ))}
              </CommandGroup>
            ) : null}

            {index && index.projects.length > 0 ? (
              <CommandGroup heading="Projects">
                {index.projects.map((project) => (
                  <CommandItem
                    key={project.key}
                    // Both spellings so "MAL" and the name each find it.
                    value={`${project.key} ${project.name} project`}
                    onSelect={() => go(projectHref(project.key))}
                  >
                    <FolderKanban aria-hidden="true" />
                    <span className="font-mono text-xs text-fg-muted">{project.key}</span>
                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    <StatusPill tone={PROJECT_STATUS[project.status].tone} className="h-6 px-2 text-xs">
                      {PROJECT_STATUS[project.status].label}
                    </StatusPill>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {otherTasks.length > 0 ? (
              <CommandGroup heading="Tasks">
                {otherTasks.map((task) => (
                  <TaskItem key={`${task.key}-${task.seq}`} task={task} onSelect={go} />
                ))}
              </CommandGroup>
            ) : null}

            <CommandSeparator />

            <CommandGroup heading="Actions">
              {canStartProjects ? (
                <CommandItem value="New project create start" onSelect={() => go("/os/projects/new")}>
                  <Plus aria-hidden="true" />
                  New project
                </CommandItem>
              ) : null}
              <CommandItem
                value="Generate document contract offer letter invoice nda letterhead"
                onSelect={() => go(currentKey ? `${projectHref(currentKey, "documents")}/new` : "/os/documents/new")}
              >
                <FileSignature aria-hidden="true" />
                Generate a document
              </CommandItem>
              <CommandItem
                value="Toggle theme dark light mode"
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  setOpen(false);
                }}
              >
                {resolvedTheme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Go to">
              {visibleNavItems(audience).map((item) => (
                <CommandItem key={item.href} value={`${item.label} page`} onSelect={() => go(item.href)}>
                  <item.icon aria-hidden="true" />
                  {item.label}
                </CommandItem>
              ))}
              <CommandItem value="Settings preferences profile password" onSelect={() => go("/os/settings")}>
                <Settings aria-hidden="true" />
                Settings
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-fg-subtle">
            <span className="flex items-center gap-3">
              <span>
                <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
              </span>
              <span>
                <Kbd>Enter</Kbd> to open
              </span>
            </span>
            <span>
              <Kbd>Esc</Kbd> to close
            </span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}

function TaskItem({ task, onSelect }: { task: PaletteIndex["tasks"][number]; onSelect: (href: string) => void }) {
  const ref = taskRef(task.key, task.seq);
  return (
    <CommandItem value={`${ref} ${task.title} task`} onSelect={() => onSelect(taskHref(task.key, task.seq))}>
      <StatusGlyph status={task.status} />
      <span className="w-16 shrink-0 font-mono text-xs text-fg-muted">{ref}</span>
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {task.mine ? <CommandShortcut className="tracking-normal">Yours</CommandShortcut> : null}
    </CommandItem>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px]">{children}</kbd>
  );
}
