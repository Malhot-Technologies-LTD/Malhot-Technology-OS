"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const subscribeNoop = () => () => {};

/** Radio group of theme choices. next-themes persists the choice and applies data-theme on <html>. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Theme is unknown during SSR; render neutral until hydrated to avoid a mismatch.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
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
                "flex h-20 w-28 flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm text-fg-muted transition-colors duration-[120ms] hover:text-fg",
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
