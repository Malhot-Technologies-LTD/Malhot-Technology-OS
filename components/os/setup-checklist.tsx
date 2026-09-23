import { Check, Circle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Onboarding checklist.
 *
 * Every step is derived from data that already exists — a profile row, a
 * project count, a membership count — never from a "dismissed" flag, so the
 * card cannot lie about what is set up. It disappears on its own once the
 * required steps are done; there is no dismiss button because there is nothing
 * left to dismiss.
 *
 * Optional steps are marked as such and never block completion: a checklist
 * that will not go away is a checklist people learn to ignore.
 */

export type SetupStep = {
  title: string;
  description: string;
  done: boolean;
  href: string;
  optional?: boolean;
};

export function SetupChecklist({ steps }: { steps: readonly SetupStep[] }) {
  const required = steps.filter((step) => !step.optional);
  const remaining = required.filter((step) => !step.done);
  if (remaining.length === 0) return null;

  const done = steps.filter((step) => step.done).length;
  const next = remaining[0];

  return (
    <section
      aria-labelledby="setup-heading"
      className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="setup-heading" className="text-xl font-medium">
            Finish setting up
          </h2>
          <p className="text-base text-fg-muted">
            <span className="tabular-nums">
              {done} of {steps.length}
            </span>{" "}
            done. The OS works without these, but it cannot do much for you until they are there.
          </p>
        </div>
        <Link
          href={next.href}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-solid px-5 text-[15px] font-medium text-brand-solid-fg transition-colors duration-[120ms] hover:bg-brand-solid-hover"
        >
          Continue setup
        </Link>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => (
          <li key={step.title}>
            <Link
              href={step.href}
              className={cn(
                "flex h-full gap-3.5 rounded-lg border border-border p-5 transition-[colors,transform] duration-[160ms] ease-standard hover:-translate-y-0.5 hover:border-border-strong",
                step.done ? "border-dashed bg-transparent" : "bg-bg-subtle",
              )}
            >
              <StepMark done={step.done} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-[15px] font-medium", step.done && "text-fg-muted")}>{step.title}</span>
                  {step.optional ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium tracking-[0.06em] text-fg-subtle uppercase">
                      Optional
                    </span>
                  ) : null}
                </span>
                <span className={cn("text-sm leading-relaxed", step.done ? "text-fg-subtle" : "text-fg-muted")}>
                  {step.description}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StepMark({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg">
        <Check className="size-3.5" aria-label="Done" />
      </span>
    );
  }
  return (
    <span className="flex size-6 shrink-0 items-center justify-center text-fg-subtle">
      <Circle className="size-5" aria-label="Not done yet" />
    </span>
  );
}
