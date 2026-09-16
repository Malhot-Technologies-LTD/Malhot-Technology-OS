import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

// Class names are spelled out so Tailwind's scanner can see them.
const SURFACES = [
  ["bg", "bg-bg"],
  ["bg-subtle", "bg-bg-subtle"],
  ["surface", "bg-surface"],
  ["surface-raised", "bg-surface-raised"],
  ["brand", "bg-brand"],
  ["brand-subtle", "bg-brand-subtle"],
] as const;
const TEXT = [
  ["fg", "text-fg"],
  ["fg-muted", "text-fg-muted"],
  ["fg-subtle", "text-fg-subtle"],
] as const;
const STATUSES = [
  ["neutral", "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border"],
  ["info", "bg-status-info-bg text-status-info-fg border-status-info-border"],
  ["progress", "bg-status-progress-bg text-status-progress-fg border-status-progress-border"],
  ["review", "bg-status-review-bg text-status-review-fg border-status-review-border"],
  ["success", "bg-status-success-bg text-status-success-fg border-status-success-border"],
  ["warning", "bg-status-warning-bg text-status-warning-fg border-status-warning-border"],
  ["danger", "bg-status-danger-bg text-status-danger-fg border-status-danger-border"],
] as const;
const ELEVATION = [
  ["s", "rounded-sm shadow-s"],
  ["m", "rounded-md shadow-m"],
  ["l", "rounded-lg shadow-l"],
] as const;
const TYPE_SCALE = [
  { label: "display-m / OS page title", className: "text-[28px] leading-[1.15] font-semibold tracking-[-0.02em]" },
  { label: "heading", className: "text-xl leading-[1.3] font-semibold tracking-[-0.01em]" },
  { label: "subheading", className: "text-base leading-[1.4] font-semibold" },
  { label: "body (OS default)", className: "text-sm leading-normal" },
  { label: "body-s", className: "text-[13px] leading-[1.45]" },
  { label: "caption", className: "text-xs leading-[1.4] font-medium" },
  { label: "mono", className: "font-mono text-[13px]" },
] as const;

/** Dev-only reference for docs/design/design-system.md tokens. Toggle the theme to check both registers. */
export default async function TokensPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await requireViewer();

  return (
    <PageBody>
      <PageHeader title="Design tokens" description="Development reference — not shipped to production." />

      <Section title="Surfaces and text">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SURFACES.map(([name, className]) => (
            <Swatch key={name} name={name} className={className} />
          ))}
        </div>
        <div className="flex flex-wrap gap-6 rounded-md border border-border bg-surface p-4">
          {TEXT.map(([name, className]) => (
            <p key={name} className={cn("text-sm", className)}>
              {name} — The quick brown fox
            </p>
          ))}
        </div>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(([name, className]) => (
            <Badge key={name} variant="outline" className={className}>
              {name}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
          {TYPE_SCALE.map((step) => (
            <div key={step.label} className="flex items-baseline gap-6">
              <span className="w-44 shrink-0 text-xs text-fg-subtle">{step.label}</span>
              <span className={step.className}>Malhot OS — MAL-42 shipped on 12 Mar</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Radius and shadow">
        <div className="flex flex-wrap gap-4">
          {ELEVATION.map(([size, className]) => (
            <div
              key={size}
              className={cn(
                "flex size-24 items-center justify-center border border-border bg-surface text-xs",
                className,
              )}
            >
              radius-{size} / shadow-{size}
            </div>
          ))}
        </div>
      </Section>
    </PageBody>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("h-14 rounded-md border border-border", className)} />
      <span className="font-mono text-xs text-fg-muted">--{name}</span>
    </div>
  );
}
