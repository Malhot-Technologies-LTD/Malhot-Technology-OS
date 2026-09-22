"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/features/projects/actions";
import {
  createProjectSchema,
  suggestProjectKey,
  type CreateProjectInput,
  type CreateProjectOutput,
} from "@/features/projects/schemas";
import { applyActionError } from "@/lib/forms/action-errors";

type Props = { clients: readonly { id: string; name: string }[] };

/**
 * Basics-only creation (step 1 of the wizard in docs/features/projects.md).
 * Goals, MVP, team and milestones are added from the overview; the readiness
 * checklist there is what gates activation, so nothing is lost by starting small.
 */
export function CreateProjectForm({ clients }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateProjectInput, unknown, CreateProjectOutput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      clientId: null,
      priority: "medium",
      startDate: "",
      targetEndDate: "",
    },
  });
  const { errors } = form.formState;

  // Suggest a key from the name until the user edits the key themselves.
  const onNameBlur = () => {
    const key = form.getValues("key");
    if (!key) form.setValue("key", suggestProjectKey(form.getValues("name")), { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    startTransition(async () => {
      // On success this redirects, so nothing after it runs.
      const result = await createProject(values);
      if (!result.ok) applyActionError(form.setError, result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Project name</FieldLabel>
          <Input
            id="name"
            autoFocus
            aria-invalid={Boolean(errors.name)}
            {...form.register("name", { onBlur: onNameBlur })}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={Boolean(errors.key)}>
          <FieldLabel htmlFor="key">Key</FieldLabel>
          <Input
            id="key"
            className="w-32 font-mono uppercase"
            aria-invalid={Boolean(errors.key)}
            {...form.register("key")}
          />
          <FieldDescription>
            2 to 6 letters, used in task references like <span className="font-mono">MAL-42</span>. It cannot change
            once the project starts.
          </FieldDescription>
          <FieldError errors={[errors.key]} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="clientId">Client</FieldLabel>
          <Controller
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                <SelectTrigger id="clientId" className="w-full">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>Internal work can stay unassigned.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="priority">Priority</FieldLabel>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.startDate)}>
            <FieldLabel htmlFor="startDate">Start date</FieldLabel>
            <Input
              id="startDate"
              type="date"
              aria-invalid={Boolean(errors.startDate)}
              {...form.register("startDate")}
            />
            <FieldError errors={[errors.startDate]} />
          </Field>
          <Field data-invalid={Boolean(errors.targetEndDate)}>
            <FieldLabel htmlFor="targetEndDate">Target end date</FieldLabel>
            <Input
              id="targetEndDate"
              type="date"
              aria-invalid={Boolean(errors.targetEndDate)}
              {...form.register("targetEndDate")}
            />
            <FieldError errors={[errors.targetEndDate]} />
          </Field>
        </div>
      </FieldGroup>

      <FieldError errors={[errors.root]} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
