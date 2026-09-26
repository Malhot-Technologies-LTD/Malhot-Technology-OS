"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/site/brand/Icon";
import { Button, ButtonLink } from "@/components/site/ui/Button";
import { FormStatus, TextArea, TextField } from "@/components/site/ui/Field";
import { budgetOptions, needOptions, timelineOptions, typeOptions } from "@/content/site";
import { submitProjectBrief } from "@/features/inquiries/actions";
import { cn, isEmail } from "@/lib/utils";

type FormState = {
  need: string;
  projectTypes: string[];
  title: string;
  description: string;
  budget: string;
  timeline: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string;
};

const STORAGE_KEY = "malhot:project-brief";

const steps = [
  { id: 0, label: "What do you need?", hint: "Select what you're looking for" },
  { id: 1, label: "Project type", hint: "Pick everything that applies" },
  { id: 2, label: "Project details", hint: "Give us the shape of the work" },
  { id: 3, label: "Budget & timeline", hint: "Helps us scope realistically" },
  { id: 4, label: "Contact information", hint: "Where should we reply?" },
  { id: 5, label: "Review & submit", hint: "One last look" },
];

type Draft = { form?: Partial<FormState>; step?: number };

type Defaults = Pick<FormState, "contactName" | "contactEmail" | "company">;

/**
 * The saved draft, read once and cached.
 *
 * `useSyncExternalStore` rather than an effect: localStorage does not exist
 * during server rendering, so the draft cannot be part of the first render, and
 * reading it in an effect and calling setState is the cascading render the
 * React Compiler rejects. This returns null for the server snapshot and the
 * real draft for the client one, which is exactly the case the hook exists for
 * — React renders the server value, then re-renders with the client value,
 * without a hydration mismatch.
 *
 * The cache matters: getSnapshot must return a stable reference or React
 * re-renders forever comparing two structurally equal objects.
 */
let draftCache: Draft | null | undefined;

function readDraft(): Draft | null {
  if (draftCache === undefined) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      draftCache = raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      // Private window, blocked storage, or a draft written by an older
      // version of this form. Start fresh rather than fail.
      draftCache = null;
    }
  }
  return draftCache;
}

export function StartFlow({ defaults, signedIn }: { defaults: Defaults; signedIn: boolean }) {
  const draft = useSyncExternalStore(
    () => () => {},
    readDraft,
    () => null,
  );

  /*
   * The key is what applies the draft.
   *
   * It is null on the server and on the hydrating render, then becomes the
   * saved brief. Remounting on that transition lets the state below be seeded
   * from it in a plain `useState` initialiser — no effect, no setState during
   * render, no second render for anyone who has no draft, because for them the
   * key never changes.
   */
  return <Flow key={draft ? "resumed" : "fresh"} defaults={defaults} signedIn={signedIn} draft={draft} />;
}

function Flow({ defaults, signedIn, draft }: { defaults: Defaults; signedIn: boolean; draft: Draft | null }) {
  const [step, setStep] = useState(() =>
    typeof draft?.step === "number" ? Math.max(0, Math.min(steps.length - 1, draft.step)) : 0,
  );
  const [form, setForm] = useState<FormState>(() => {
    const base: FormState = {
      need: "",
      projectTypes: [],
      title: "",
      description: "",
      budget: "",
      timeline: "",
      contactPhone: "",
      ...defaults,
    };
    if (!draft?.form) return base;
    return {
      ...base,
      ...draft.form,
      // Whoever is signed in now wins over whoever saved the draft.
      contactName: draft.form.contactName || base.contactName,
      contactEmail: draft.form.contactEmail || base.contactEmail,
    };
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [reference, setReference] = useState("");
  /*
   * Honeypot, kept out of `form` so it is never written to the saved draft —
   * restoring a bot's value into a real person's session would silently bin
   * their brief.
   */
  const [honeypot, setHoneypot] = useState("");

  const progress = ((step + (status === "success" ? 1 : 0)) / steps.length) * 100;

  /*
   * "Save & continue later" is real: the brief survives a reload.
   *
   * This is the writing half; `readDraft` above is the reading half. Debounced,
   * because it runs on every keystroke and localStorage writes are synchronous
   * and hit the disk. `draftCache` is kept in step so that navigating away and
   * back within the same page load resumes from what was typed, not from what
   * was on disk when the tab opened.
   */
  useEffect(() => {
    if (status === "success") {
      window.localStorage.removeItem(STORAGE_KEY);
      draftCache = null;
      return;
    }
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step }));
        draftCache = { form, step };
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [form, step, status]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const toggleType = (value: string) => {
    setForm((prev) => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(value)
        ? prev.projectTypes.filter((item) => item !== value)
        : [...prev.projectTypes, value],
    }));
    setError("");
  };

  const validateStep = (index: number) => {
    switch (index) {
      case 0:
        if (!form.need) return "Choose the option that fits best.";
        return "";
      case 1:
        if (form.projectTypes.length === 0) return "Select at least one project type.";
        return "";
      case 2:
        if (form.title.trim().length < 3) return "Give your project a short name.";
        if (form.description.trim().length < 12) return "Tell us a little more about the goal.";
        return "";
      case 3:
        if (!form.budget) return "Select a budget range.";
        if (!form.timeline) return "Select a timeline.";
        return "";
      case 4:
        if (form.contactName.trim().length < 2) return "Please enter your name.";
        if (!isEmail(form.contactEmail)) return "Enter a valid email address.";
        return "";
      default:
        return "";
    }
  };

  const go = (next: number) => {
    if (next > step) {
      const message = validateStep(step);
      if (message) {
        setError(message);
        return;
      }
    }
    setStep(Math.max(0, Math.min(steps.length - 1, next)));
    setError("");
  };

  const submit = async () => {
    for (let i = 0; i < steps.length - 1; i += 1) {
      const message = validateStep(i);
      if (message) {
        setStep(i);
        setError(message);
        return;
      }
    }

    setStatus("loading");
    setError("");

    // A Server Action rather than the website repo's /api/project-requests,
    // which wrote to a Drizzle table nothing in this application reads. This
    // lands in `inquiries`, where an admin already looks.
    const result = await submitProjectBrief({ ...form, website: honeypot });
    if (result.ok) {
      setReference(result.data.reference);
      setStatus("success");
      return;
    }
    setStatus("error");
    setError(result.error.message);
  };

  const summary = useMemo(
    () => [
      { label: "Need", value: needOptions.find((o) => o.value === form.need)?.label },
      {
        label: "Type",
        value: form.projectTypes
          .map((value) => typeOptions.find((o) => o.value === value)?.label)
          .filter(Boolean)
          .join(", "),
      },
      { label: "Project", value: form.title },
      { label: "Budget", value: budgetOptions.find((o) => o.value === form.budget)?.label },
      { label: "Timeline", value: timelineOptions.find((o) => o.value === form.timeline)?.label },
      { label: "Contact", value: form.contactEmail },
    ],
    [form],
  );

  if (status === "success") {
    return (
      <section className="bg-bg-subtle py-20 sm:py-28">
        <div className="shell">
          <div
            role="status"
            className="mx-auto max-w-xl rounded-[var(--radius-l)] border border-border bg-white p-8 text-center sm:p-12"
          >
            <span
              aria-hidden
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-subtle text-brand"
            >
              <Icon name="check" className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <h1 className="mt-6 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-fg">Brief received</h1>
            <p className="mt-3 text-[1rem] leading-relaxed text-fg-muted">
              Thank you, {form.contactName.split(" ")[0]}. Your project is in our queue and we will reply within one
              business day.
            </p>
            <p className="mt-6 inline-flex items-center gap-3 rounded-[var(--radius-m)] border border-border bg-bg-subtle px-4 py-2.5">
              <span className="text-[0.825rem] text-fg-muted">Reference</span>
              <span className="font-mono text-[0.95rem] font-semibold text-fg">{reference}</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={signedIn ? "/os" : "/contact"} icon="arrow">
                {signedIn ? "Open your dashboard" : "Ask us something else"}
              </ButtonLink>
              <ButtonLink href="/projects" variant="secondary">
                Explore our work
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="on-ink bg-site-ink text-white">
        <div className="shell py-12 sm:py-14">
          <p className="text-[0.75rem] font-semibold tracking-[0.14em] text-site-blue-bright uppercase">
            Start a project
          </p>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.75rem)] leading-tight font-semibold">
            Tell us about your project
          </h1>
          <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-site-ink-fg-muted">
            Six short steps, about five minutes. Your answers are saved in this browser as you go, so you can come back
            and finish later.
          </p>
        </div>
      </section>

      <section className="bg-bg-subtle py-12 sm:py-16">
        <div className="shell grid gap-8 lg:grid-cols-[18rem_1fr] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-label="Brief progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-[0.875rem] font-medium text-fg-muted">
              Step {step + 1} of {steps.length}
            </p>

            <ol className="mt-6 hidden space-y-1 lg:block">
              {steps.map((item, index) => {
                const done = index < step;
                const active = index === step;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(index)}
                      disabled={index > step}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[var(--radius-m)] px-3 py-2.5 text-left transition-colors",
                        active ? "bg-white shadow-[var(--shadow-s)]" : "hover:bg-white/70",
                        index > step && "cursor-not-allowed hover:bg-transparent",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.8rem] font-semibold",
                          done
                            ? "border-brand bg-brand text-white"
                            : active
                              ? "border-brand bg-white text-brand"
                              : "border-border-strong bg-white text-fg-subtle",
                        )}
                      >
                        {done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                      </span>
                      <span className={cn("text-[0.9rem]", active ? "font-semibold text-fg" : "text-fg-muted")}>
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 hidden rounded-[var(--radius-l)] border border-border bg-white p-5 lg:block">
              <p className="text-[0.8rem] font-semibold tracking-[0.12em] text-fg uppercase">Your brief</p>
              <dl className="mt-4 space-y-2.5">
                {summary.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 text-[0.85rem]">
                    <dt className="shrink-0 text-fg-muted">{row.label}</dt>
                    <dd className={cn("truncate text-right", row.value ? "text-fg" : "text-fg-subtle")}>
                      {row.value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>

          <div>
            <div className="relative rounded-[var(--radius-l)] border border-border bg-white p-6 shadow-[var(--shadow-s)] sm:p-9">
              <p className="text-[0.85rem] font-semibold text-brand">Step {step + 1}</p>
              <h2 className="mt-1.5 text-[clamp(1.35rem,2.6vw,1.75rem)] font-semibold text-fg">{steps[step].label}</h2>
              <p className="mt-1.5 text-[0.95rem] text-fg-muted">{steps[step].hint}</p>

              <div className="mt-7 min-h-[20rem]">
                {step === 0 ? (
                  <div className="grid gap-3">
                    {needOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={form.need === option.value}
                        onClick={() => set("need", option.value)}
                        title={option.label}
                        hint={option.hint}
                      />
                    ))}
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {typeOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={form.projectTypes.includes(option.value)}
                        onClick={() => toggleType(option.value)}
                        title={option.label}
                        hint={option.hint}
                        icon={option.icon}
                        multi
                      />
                    ))}
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-5">
                    <TextField
                      label="Project name"
                      placeholder="A working title is fine"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                    />
                    <TextArea
                      label="What are you trying to achieve?"
                      placeholder="Describe the product, the users, the problem and anything that already exists."
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                    />
                    <p className="text-[0.85rem] text-fg-subtle">
                      Tip: the clearer the goal, the more useful our first reply.
                    </p>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-8">
                    <fieldset>
                      <legend className="mb-3 text-[0.9rem] font-semibold text-fg">Budget range</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {budgetOptions.map((option) => (
                          <OptionCard
                            key={option.value}
                            selected={form.budget === option.value}
                            onClick={() => set("budget", option.value)}
                            title={option.label}
                            compact
                          />
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-3 text-[0.9rem] font-semibold text-fg">Timeline</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {timelineOptions.map((option) => (
                          <OptionCard
                            key={option.value}
                            selected={form.timeline === option.value}
                            onClick={() => set("timeline", option.value)}
                            title={option.label}
                            compact
                          />
                        ))}
                      </div>
                    </fieldset>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField
                      label="Full name"
                      value={form.contactName}
                      onChange={(e) => set("contactName", e.target.value)}
                      autoComplete="name"
                    />
                    <TextField
                      label="Email address"
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => set("contactEmail", e.target.value)}
                      autoComplete="email"
                    />
                    <TextField
                      label="Phone"
                      hint="Optional"
                      value={form.contactPhone}
                      onChange={(e) => set("contactPhone", e.target.value)}
                      autoComplete="tel"
                    />
                    <TextField
                      label="Company"
                      hint="Optional"
                      value={form.company}
                      onChange={(e) => set("company", e.target.value)}
                      autoComplete="organization"
                    />
                  </div>
                ) : null}

                {step === 5 ? (
                  <div>
                    <dl className="divide-y divide-border border-y border-border">
                      {summary.map((row) => (
                        <div key={row.label} className="flex items-start justify-between gap-6 py-3.5">
                          <dt className="text-[0.9rem] text-fg-muted">{row.label}</dt>
                          <dd className="max-w-[60%] text-right text-[0.925rem] font-medium text-fg">
                            {row.value || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-5 rounded-[var(--radius-m)] bg-bg-subtle p-4">
                      <p className="text-[0.9rem] text-fg-muted">Description</p>
                      <p className="mt-1.5 text-[0.925rem] leading-relaxed text-fg">{form.description || "—"}</p>
                    </div>
                    <p className="mt-5 text-[0.85rem] text-fg-subtle">
                      By submitting you agree that we may contact you about this enquiry.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-4" aria-live="polite">
                <FormStatus status={error ? "error" : "idle"} message={error} />
              </div>

              <div className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-6">
                <Button
                  variant="ghost"
                  onClick={() => go(step - 1)}
                  disabled={step === 0 || status === "loading"}
                  icon="arrowLeft"
                  iconPosition="left"
                >
                  Back
                </Button>

                {step < steps.length - 1 ? (
                  <Button size="lg" icon="arrow" onClick={() => go(step + 1)}>
                    Next step
                  </Button>
                ) : (
                  <Button size="lg" icon="arrow" loading={status === "loading"} onClick={submit}>
                    {status === "loading" ? "Submitting" : "Submit brief"}
                  </Button>
                )}
              </div>

              {/* Honeypot — off-screen, untabbable, hidden from assistive tech. */}
              <div aria-hidden="true" className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="brief-website">Website</label>
                <input
                  id="brief-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>
            </div>

            <p className="mt-6 text-[0.9rem] text-fg-muted">
              Prefer to write to us?{" "}
              <Link href="/contact" className="font-medium text-brand hover:underline">
                Send a message instead
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function OptionCard({
  title,
  hint,
  selected,
  onClick,
  icon,
  multi = false,
  compact = false,
}: {
  title: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
  icon?: "code" | "mobile" | "design" | "brand" | "growth" | "consulting";
  multi?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-4 rounded-[var(--radius-m)] border px-4 text-left transition-colors",
        compact ? "py-3" : "py-4",
        selected ? "border-brand bg-brand-subtle" : "border-border-strong bg-white hover:border-fg-subtle",
      )}
    >
      {icon ? (
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-m)]",
            selected ? "bg-brand text-white" : "bg-bg-subtle text-fg-muted",
          )}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-medium text-fg">{title}</span>
        {hint ? <span className="mt-0.5 block text-[0.85rem] text-fg-muted">{hint}</span> : null}
      </span>

      <span
        aria-hidden
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center border",
          multi ? "rounded-[var(--radius-s)]" : "rounded-full",
          selected ? "border-brand bg-brand text-white" : "border-border-strong bg-white text-transparent",
        )}
      >
        <Icon name="check" className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
}
