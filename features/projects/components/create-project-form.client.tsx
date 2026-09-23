"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
  type ProjectKind,
} from "@/features/projects/schemas";
import { applyActionError } from "@/lib/forms/action-errors";
import { cn } from "@/lib/utils";

type Props = { clients: readonly { id: string; name: string }[] };

const KINDS: { value: ProjectKind; label: string; hint: string }[] = [
  { value: "project", label: "Project", hint: "Internal work, built for ourselves." },
  { value: "job", label: "Job", hint: "Commissioned work, belonging to a client." },
];

/**
 * Basics-only creation (step 1 of the wizard in docs/features/projects.md).
 * Goals, MVP, team and milestones are added from the overview; the readiness
 * checklist there is what gates activation, so nothing is lost by starting small.
 *
 * Kind comes first because it decides whether the rest of the form asks about a
 * client at all. Everything downstream — goals, MVP, tasks, tests, documents —
 * is identical for both; the only thing that differs is who the work is for.
 */
export function CreateProjectForm({ clients }: Props) {
  const [pending, startTransition] = useTransition();
  const clientListId = useId();
  const form = useForm<CreateProjectInput, unknown, CreateProjectOutput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      key: "",
      kind: "project",
      description: "",
      clientName: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
    },
  });
  const { errors } = form.formState;
  // useWatch, not form.watch(): watch() returns a fresh function each render,
  // which the React Compiler cannot memoize, so it bails out of optimising the
  // whole component. useWatch is a hook and subscribes without that cost.
  const kind = useWatch({ control: form.control, name: "kind" });

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
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-[15px] font-medium">What is this?</legend>
              <div role="radiogroup" aria-label="Kind of work" className="grid gap-3 sm:grid-cols-2">
                {KINDS.map((option) => {
                  const selected = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        field.onChange(option.value);
                        // Leaving Job clears the client: the database refuses a
                        // client on a project, so the form must not keep one.
                        if (option.value === "project") form.setValue("clientName", "", { shouldValidate: true });
                      }}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border border-border bg-surface p-4 text-left transition-colors duration-[120ms] hover:border-border-strong",
                        selected && "border-brand bg-brand-subtle ring-2 ring-brand/30",
                      )}
                    >
                      <span className={cn("text-[15px] font-medium", selected && "text-brand")}>{option.label}</span>
                      <span className="text-sm text-fg-muted">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">{kind === "job" ? "Job name" : "Project name"}</FieldLabel>
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

        {/*
         * A free text field with suggestions, not a picker.
         *
         * Requiring the client to exist first puts the setup in the wrong order:
         * the job is the thing you know about, the client record is bookkeeping
         * that follows. Typing a new name creates the client; typing one that
         * already exists reuses it, case-insensitively. The datalist turns the
         * existing names into suggestions without ever closing off the field.
         */}
        {kind === "job" ? (
          <Field data-invalid={Boolean(errors.clientName)}>
            <FieldLabel htmlFor="clientName">Client</FieldLabel>
            <Input
              id="clientName"
              list={clients.length > 0 ? clientListId : undefined}
              autoComplete="off"
              placeholder="Who is this for?"
              aria-invalid={Boolean(errors.clientName)}
              {...form.register("clientName")}
            />
            {clients.length > 0 ? (
              <datalist id={clientListId}>
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
            ) : null}
            <FieldDescription>
              {clients.length > 0
                ? "Type a name. Existing clients are suggested; a new name is added to the organisation."
                : "Type a name. It is added to the organisation's clients so you can reuse it next time."}
            </FieldDescription>
            <FieldError errors={[errors.clientName]} />
          </Field>
        ) : null}

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
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : kind === "job" ? "Create job" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
