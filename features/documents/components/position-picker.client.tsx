"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { POSITION_GROUPS, findPosition, positionTitles } from "../positions";

/**
 * Pick a job title from the company's position list, searched by typing, or
 * use the typed text as a title that is not listed. With `multiple`, several
 * titles are held (shown as removable chips) and the list stays open while
 * choosing; the value is one title per line.
 */
export function PositionPicker({
  id,
  value,
  onChange,
  multiple = false,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const chosen = positionTitles(value);
  const typed = search.trim();
  const typedIsListed = typed !== "" && findPosition(typed) !== null;
  const typedIsChosen = chosen.some((title) => title.toLowerCase() === typed.toLowerCase());

  function pick(title: string) {
    // A listed title is stored exactly as listed, whatever case it was typed in.
    const canonical = findPosition(title)?.title ?? title.trim();
    if (!multiple) {
      onChange(canonical);
      setOpen(false);
    } else if (chosen.includes(canonical)) {
      onChange(chosen.filter((item) => item !== canonical).join("\n"));
    } else {
      onChange([...chosen, canonical].join("\n"));
    }
    setSearch("");
    // Stay in the search box, so the next position can be typed straight away.
    if (multiple) requestAnimationFrame(() => input.current?.focus());
  }

  function remove(title: string) {
    onChange(chosen.filter((item) => item !== title).join("\n"));
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-invalid={invalid || undefined}
            className={cn(
              "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive",
            )}
          >
            <span className={cn("truncate", (multiple || chosen.length === 0) && "text-muted-foreground")}>
              {multiple
                ? chosen.length === 0
                  ? "Choose positions…"
                  : `Add another position…`
                : (chosen[0] ?? "Choose a position…")}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command>
            <CommandInput ref={input} placeholder="Search, or type a title…" value={search} onValueChange={setSearch} />
            <CommandList id={listId} className="max-h-80">
              <CommandEmpty>{typed ? "No listed position matches." : "No positions."}</CommandEmpty>
              {POSITION_GROUPS.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.options.map((title) => {
                    const selected = chosen.includes(title);
                    return (
                      <CommandItem key={title} value={title} onSelect={() => pick(title)}>
                        <Check className={cn("size-4", selected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                        {title}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              {/* Last, so Enter picks a listed match first; a typed title is the fallback. */}
              {typed && !typedIsListed && !typedIsChosen ? (
                <>
                  <CommandSeparator />
                  <CommandGroup forceMount heading="Not in the list">
                    <CommandItem forceMount value={`__custom__${typed}`} onSelect={() => pick(typed)}>
                      <Plus aria-hidden="true" /> Use “{typed}”
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {multiple && chosen.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen positions">
          {chosen.map((title) => (
            <li
              key={title}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2.5 text-[13px]",
                findPosition(title)
                  ? "border-brand/30 bg-brand-subtle text-brand"
                  : "border-border bg-bg-subtle text-fg",
              )}
            >
              {title}
              {findPosition(title) ? null : <span className="text-fg-subtle">(not listed)</span>}
              <button
                type="button"
                onClick={() => remove(title)}
                className="flex size-5 items-center justify-center rounded-full hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Remove ${title}`}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
