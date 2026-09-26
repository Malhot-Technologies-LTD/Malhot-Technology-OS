"use client";

import { usePathname } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Icon } from "@/components/site/brand/Icon";
import { Button, ButtonLink } from "@/components/site/ui/Button";
import { FormStatus, TextArea, TextField } from "@/components/site/ui/Field";
import { submitInquiry } from "@/features/inquiries/actions";
import { BUDGET_RANGES } from "@/features/inquiries/schemas";
import { isEmail } from "@/lib/utils";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

/**
 * The website's contact form, on the OS's inquiry pipeline.
 *
 * The website repo posted this to its own `/api/contact`, which wrote to a
 * Drizzle `contact_messages` table with no spam handling and no reader. It now
 * calls `submitInquiry` instead, so a message lands in `inquiries` — the same
 * table an admin already reviews at /os/settings/inquiries — and inherits the
 * honeypot, the per-IP rate limit and the hashed-IP audit trail that action
 * carries.
 *
 * The honeypot below is the reason this is not a plain `<form action={...}>`:
 * the field has to be present in the DOM, invisible, and excluded from the tab
 * order and the accessibility tree, and it has to be submitted along with
 * everything else.
 */
export function ContactForm() {
  const pathname = usePathname();
  const budgetId = useId();
  const honeypotId = useId();

  const [values, setValues] = useState({
    name: "",
    email: "",
    company: "",
    budgetRange: "",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [feedback, setFeedback] = useState("");

  const update =
    (key: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [key]: event.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = () => {
    const next: Errors = {};
    if (values.name.trim().length < 2) next.name = "Please tell us your name";
    if (!isEmail(values.email)) next.email = "Enter a valid email address";
    // 20, not the repo's 12: the server's Zod schema is the authority and it
    // asks for 20. Validating to a looser rule here just moves the rejection
    // to after the round trip.
    if (values.message.trim().length < 20) next.message = "A little more detail helps us reply properly";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setStatus("idle");
    setFeedback("");
    startTransition(async () => {
      const result = await submitInquiry({
        name: values.name,
        email: values.email,
        company: values.company || undefined,
        message: values.message,
        budgetRange: values.budgetRange || undefined,
        sourcePath: pathname,
        website: values.website,
      });

      if (result.ok) {
        setStatus("success");
        return;
      }
      setStatus("error");
      setFeedback(result.error.message);
    });
  };

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex min-h-[26rem] flex-col items-center justify-center rounded-[var(--radius-l)] border border-border bg-white p-8 text-center sm:p-10"
      >
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-brand-subtle text-brand">
          <Icon name="check" className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <h2 className="mt-6 text-[1.5rem] font-semibold text-fg">Message received</h2>
        <p className="mt-3 max-w-sm text-[0.975rem] leading-relaxed text-fg-muted">
          Thank you, {values.name.split(" ")[0] || "and welcome"}. Someone from our team will reply within one business
          day.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/projects" icon="arrow">
            Browse our work
          </ButtonLink>
          <Button
            variant="secondary"
            onClick={() => {
              setValues({ name: "", email: "", company: "", budgetRange: "", message: "", website: "" });
              setStatus("idle");
            }}
          >
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="contact-form-title"
      className="relative space-y-5 rounded-[var(--radius-l)] border border-border bg-white p-6 shadow-[var(--shadow-s)] sm:p-9"
    >
      <div>
        <h2 id="contact-form-title" className="text-[1.5rem] font-semibold text-fg">
          Send us a message
        </h2>
        <p className="mt-1.5 text-[0.925rem] text-fg-muted">Fields marked optional can be left blank.</p>
      </div>

      {/* Announced, because a failed submit changes nothing else on screen. */}
      <div aria-live="polite">
        <FormStatus status={status === "error" ? "error" : "idle"} message={feedback} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          value={values.name}
          onChange={update("name")}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label="Email address"
          type="email"
          value={values.email}
          onChange={update("email")}
          error={errors.email}
          autoComplete="email"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Company"
          hint="Optional"
          value={values.company}
          onChange={update("company")}
          autoComplete="organization"
        />
        <div>
          <label
            htmlFor={budgetId}
            className="mb-1.5 flex items-baseline justify-between text-[0.875rem] font-medium text-fg"
          >
            Budget
            <span className="text-[0.8rem] font-normal text-fg-subtle">Optional</span>
          </label>
          <select
            id={budgetId}
            value={values.budgetRange}
            onChange={update("budgetRange")}
            className="field appearance-none bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2346516a' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            }}
          >
            <option value="">Choose a range</option>
            {BUDGET_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TextArea
        label="Message"
        placeholder="What are you building, and what do you need help with?"
        value={values.message}
        onChange={update("message")}
        error={errors.message}
      />

      {/*
       * Honeypot. Off-screen rather than display:none — some bots skip
       * fields they can tell are hidden — and out of both the tab order
       * and the accessibility tree, so nobody using the page can reach it.
       */}
      <div aria-hidden="true" className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={honeypotId}>Website</label>
        <input
          id={honeypotId}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={update("website")}
        />
      </div>

      <Button type="submit" size="lg" icon="arrow" loading={pending} className="w-full sm:w-auto">
        {pending ? "Sending" : "Send message"}
      </Button>
      <p className="text-[0.825rem] text-fg-subtle">
        We only use your details to reply to you. Read our{" "}
        <a href="/privacy" className="text-brand underline underline-offset-2">
          privacy notice
        </a>
        .
      </p>
    </form>
  );
}
