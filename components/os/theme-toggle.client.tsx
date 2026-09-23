"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const subscribeNoop = () => () => {};

/** Theme is unknown during SSR; render neutral until hydrated to avoid a mismatch. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Radio group of theme choices. next-themes persists the choice and applies data-theme on <html>. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const current = hydrated ? (theme ?? "system") : null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Theme</legend>
      <div role="radiogroup" aria-label="Theme" className="flex gap-2">
        {OPTIONS.map((option) => {
          const selected = current === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex h-20 w-28 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm text-fg-muted transition-colors duration-[120ms] hover:text-fg",
                selected && "border-brand text-fg ring-2 ring-brand/30",
              )}
            >
              <option.icon className="size-5" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Topbar affordance: one button that flips between light and dark.
 *
 * Deliberately two-state where Settings offers three. "System" is a preference
 * you set once, not something you toggle mid-task, and a three-way cycle in the
 * chrome means guessing what the next press does. Pressing here commits to an
 * explicit theme; Settings is still where you hand the choice back to the OS.
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const dark = hydrated ? resolvedTheme === "dark" : false;
  const label = hydrated ? (dark ? "Switch to light theme" : "Switch to dark theme") : "Switch theme";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {/* Both icons render; only the active one is visible, so the button
              never resizes or flickers as the theme resolves after hydration. */}
          <Sun className={cn("size-4", !hydrated || dark ? "hidden" : "block")} aria-hidden="true" />
          <Moon className={cn("size-4", !hydrated || dark ? "block" : "hidden")} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
