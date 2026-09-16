"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitInquiry } from "@/features/inquiries/actions";
import { BUDGET_RANGES, inquirySchema, type InquiryInput, type InquiryOutput } from "@/features/inquiries/schemas";
import { applyActionError } from "@/lib/forms/action-errors";

export function ContactForm() {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const form = useForm<InquiryInput, unknown, InquiryOutput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", email: "", company: "", message: "", website: "", sourcePath: pathname },
  });
  const { errors, submitCount } = form.formState;
  const errorCount = Object.keys(errors).length;

  // Focus the summary after a failed submit so keyboard and screen-reader users land on the problem.
  useEffect(() => {
    if (submitCount > 0 && errorCount > 0) errorSummaryRef.current?.focus();
  }, [submitCount, errorCount]);

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await submitInquiry(values);
      if (result.ok) setSent(true);
      else applyActionError(form.setError, result.error);
    });
  });

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
        <p className="text-lg font-semibold">Thanks, we have your message.</p>
        <p className="text-sm text-fg-muted">We reply to every enquiry within two working days.</p>
      </div>
    );
  }

  const fieldErrorCount = Object.keys(errors).filter((k) => k !== "root").length;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div ref={errorSummaryRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {fieldErrorCount > 0 ? (
          <p className="rounded-md border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
            {fieldErrorCount === 1 ? "One field needs attention." : `${fieldErrorCount} fields need attention.`}
          </p>
        ) : null}
        <FieldError errors={[errors.root]} />
      </div>

      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.company)}>
            <FieldLabel htmlFor="company">
              Company <span className="font-normal text-fg-subtle">(optional)</span>
            </FieldLabel>
            <Input id="company" autoComplete="organization" {...form.register("company")} />
            <FieldError errors={[errors.company]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="budgetRange">
              Budget <span className="font-normal text-fg-subtle">(optional)</span>
            </FieldLabel>
            <Controller
              control={form.control}
              name="budgetRange"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="budgetRange" className="w-full">
                    <SelectValue placeholder="Choose a range" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Field data-invalid={Boolean(errors.message)}>
          <FieldLabel htmlFor="message">What are you trying to build?</FieldLabel>
          <Textarea id="message" rows={6} aria-invalid={Boolean(errors.message)} {...form.register("message")} />
          <FieldDescription>The problem, who it is for, and any deadline. Rough is fine.</FieldDescription>
          <FieldError errors={[errors.message]} />
        </Field>
      </FieldGroup>

      {/* Honeypot: off-screen and skipped by assistive tech; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
        <p className="text-xs text-fg-subtle">
          We only use this to reply to you. See our{" "}
          <a href="/privacy" className="underline underline-offset-4">
            privacy notice
          </a>
          .
        </p>
      </div>
    </form>
  );
}
