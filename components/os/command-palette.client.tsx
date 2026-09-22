"use client";

import { FolderKanban, Plus, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PRIMARY_NAV } from "@/components/os/nav";
import { PROJECT_STATUS, StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchableProjects, type PaletteProject } from "@/features/projects/actions";

/**
 * Global palette (Ctrl/⌘ K).
 *
 * Ordered by what someone reaches for most: a named project first, then an
 * action, then a section. Projects load once on first open and filter locally,
 * so typing never waits on the network.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<PaletteProject[] | null>(null);
  const router = useRouter();

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

  // Fetch once per session, on first open — not on mount, so the palette costs
  // nothing to people who never use it.
  useEffect(() => {
    if (!open || projects !== null) return;
    let cancelled = false;
    void searchableProjects().then((result) => {
      if (!cancelled) setProjects(result.ok ? result.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, projects]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-64 justify-start gap-2 text-fg-muted"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search aria-hidden="true" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded-sm border border-border bg-bg-subtle px-1 font-mono text-[10px] text-fg-subtle">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Find a project, run an action, or jump to a section"
      >
        <CommandInput placeholder="Search projects, or type a command…" />
        <CommandList>
          <CommandEmpty>
            {projects === null ? "Loading projects…" : "Nothing matches. Try a project key or name."}
          </CommandEmpty>

          {projects && projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.key}
                  // Both spellings so "MAL" and the name each find it.
                  value={`${project.key} ${project.name}`}
                  onSelect={() => go(`/os/projects/${project.key}`)}
                >
                  <FolderKanban aria-hidden="true" />
                  <span className="font-mono text-xs text-fg-muted">{project.key}</span>
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  <StatusPill tone={PROJECT_STATUS[project.status].tone}>
                    {PROJECT_STATUS[project.status].label}
                  </StatusPill>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem value="New project create" onSelect={() => go("/os/projects/new")}>
              <Plus aria-hidden="true" />
              New project
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Go to">
            {PRIMARY_NAV.map((item) => (
              <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                <item.icon aria-hidden="true" />
                {item.label}
              </CommandItem>
            ))}
            <CommandItem value="Settings preferences profile" onSelect={() => go("/os/settings")}>
              <Settings aria-hidden="true" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
