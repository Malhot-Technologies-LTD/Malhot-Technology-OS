"use client";

import { usePathname } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Icon } from "@/components/site/brand/Icon";
import { Button, ButtonLink } from "@/components/site/ui/Button";
import { FormStatus, TextArea, TextField } from "@/components/site/ui/Field";
import { submitInquiry } from "@/features/inquiries/actions";
import { BUDGET_RANGES } from "@/features/inquiries/schemas";
import { EASE } from "@/lib/motion";
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
 * carries. The look is unchanged; only the wire is different.
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

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-navy-900 p-7 sm:p-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full blur-[90px]"
        style={{ background: "radial-gradient(circle, rgba(43,108,255,0.22), transparent 70%)" }}
      />

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            role="status"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE.soft }}
            className="relative flex min-h-[26rem] flex-col items-center justify-center text-center"
          >
            <motion.span
              aria-hidden
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE.soft, delay: 0.08 }}
              className="grid h-20 w-20 place-items-center rounded-full border border-brand-400/40 bg-brand-500/15 text-brand-200 shadow-[0_0_60px_-15px_rgba(43,108,255,1)]"
            >
              <Icon name="check" className="h-8 w-8" strokeWidth={2.2} />
            </motion.span>
            <h3 className="display mt-7 text-[1.7rem] text-white">Message received</h3>
            <p className="mt-3 max-w-sm text-[0.92rem] leading-relaxed text-white/60">
              Thank you, {values.name.split(" ")[0] || "friend"}. A human from MALHOT will reply within one business
              day.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/start" icon="arrowUpRight">
                Start a project
              </ButtonLink>
              <Button
                variant="outline"
                onClick={() => {
                  setValues({
                    name: "",
                    email: "",
                    company: "",
                    budgetRange: "",
                    message: "",
                    website: "",
                  });
                  setStatus("idle");
                }}
              >
                Send another
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative space-y-5"
            noValidate
          >
            <div>
              <h2 className="display text-[1.5rem] text-white">Send us a message</h2>
              <p className="mt-2 text-[0.88rem] text-white/55">
                Tell us what you are working on. We reply to everything.
              </p>
            </div>

            {/* Announced, because a failed submit changes nothing else on screen. */}
            <div aria-live="polite">
              <FormStatus status={status === "error" ? "error" : "idle"} message={feedback} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Your name"
                placeholder="John Doe"
                value={values.name}
                onChange={update("name")}
                error={errors.name}
                autoComplete="name"
              />
              <TextField
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={update("email")}
                error={errors.email}
                autoComplete="email"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Company"
                hint="optional"
                placeholder="Acme Ltd"
                value={values.company}
                onChange={update("company")}
                autoComplete="organization"
              />
              <div className="group/field">
                <label
                  htmlFor={budgetId}
                  className="mb-2 flex items-center justify-between text-[0.72rem] font-medium tracking-[0.18em] text-white/60 uppercase transition-colors duration-300 group-focus-within/field:text-brand-200"
                >
                  Budget
                  <span className="text-[0.66rem] tracking-normal text-white/55 normal-case">optional</span>
                </label>
                <select
                  id={budgetId}
                  value={values.budgetRange}
                  onChange={update("budgetRange")}
                  className="field appearance-none bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8c8ff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
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
              placeholder="How can we help you?"
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

            <Button type="submit" size="lg" icon="arrow" loading={pending} className="w-full">
              {pending ? "Sending" : "Send message"}
            </Button>
            <p className="text-center text-[0.72rem] text-white/60">
              We only use this to reply to you. See our{" "}
              <a href="/privacy" className="underline underline-offset-4 hover:text-brand-200">
                privacy notice
              </a>
              .
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
