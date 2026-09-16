"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from "@/features/auth/actions";
import { updateProfileSchema, type UpdateProfileInput, type UpdateProfileOutput } from "@/features/auth/schemas";
import { applyActionError } from "@/lib/forms/action-errors";

type Props = { fullName: string; title: string | null; timezone: string; email: string | null };

export function ProfileForm({ fullName, title, timezone, email }: Props) {
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const form = useForm<UpdateProfileInput, unknown, UpdateProfileOutput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName, title: title ?? "", timezone },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success("Profile saved");
        form.reset(form.getValues());
      } else {
        applyActionError(form.setError, result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={email ?? ""} readOnly disabled />
          <FieldDescription>Your sign-in email. Ask an admin to change it.</FieldDescription>
        </Field>
        <Field data-invalid={Boolean(errors.fullName)}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input
            id="fullName"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            {...form.register("fullName")}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            placeholder="e.g. Product designer"
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
          <FieldDescription>Shown next to your name across the OS.</FieldDescription>
          <FieldError errors={[errors.title]} />
        </Field>
        <Field data-invalid={Boolean(errors.timezone)}>
          <FieldLabel htmlFor="timezone">Time zone</FieldLabel>
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="timezone" aria-invalid={Boolean(errors.timezone)} className="w-full">
                  <SelectValue placeholder="Choose a time zone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>Due dates and “today” are computed in this zone.</FieldDescription>
          <FieldError errors={[errors.timezone]} />
        </Field>
      </FieldGroup>
      <FieldError errors={[errors.root]} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending || !isDirty} onClick={() => form.reset()}>
          Discard
        </Button>
      </div>
    </form>
  );
}
