"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/features/projects/actions";
import type { ProjectKind } from "@/features/projects/schemas";
import type { Priority } from "@/types/domain";

type Props = {
  project: {
    id: string;
    key: string;
    name: string;
    kind: ProjectKind;
    description: string | null;
    clientName: string | null;
    priority: Priority;
    startDate: string | null;
    targetEndDate: string | null;
  };
  /** The key can only change while planning; the status trigger refuses it after. */
  keyEditable: boolean;
};

/** The project's details, editable by its manager. Errors land next to the field they are about. */
export function ProjectSettingsForm({ project, keyEditable }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState({
    name: project.name,
    key: project.key,
    kind: project.kind,
    description: project.description ?? "",
    clientName: project.clientName ?? "",
    priority: project.priority,
    startDate: project.startDate ?? "",
    targetEndDate: project.targetEndDate ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await updateProject({
        projectId: project.id,
        ...values,
        clientName: values.kind === "job" ? values.clientName : "",
      });
      if (!result.ok) {
        const fieldErrors = Object.fromEntries(
          Object.entries(result.error.fieldErrors ?? {}).map(([field, messages]) => [field, messages[0] ?? ""]),
        );
        setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { root: result.error.message });
        return;
      }
      toast.success("Project saved");
      if (values.key.toUpperCase() !== project.key) router.replace(`/os/projects/${values.key.toUpperCase()}/settings`);
    });
  }

  const field = (name: string) => ({
    "aria-invalid": Boolean(errors[name]) || undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Labelled id="name" label="Name" error={errors.name}>
          <Input
            id="name"
            value={values.name}
            maxLength={120}
            onChange={(e) => set("name", e.target.value)}
            {...field("name")}
          />
        </Labelled>
        <Labelled
          id="key"
          label="Key"
          error={errors.key}
          hint={keyEditable ? "2 to 6 letters" : "Fixed once the project leaves planning"}
        >
          <Input
            id="key"
            value={values.key}
            maxLength={6}
            disabled={!keyEditable}
            className="font-mono uppercase"
            onChange={(e) => set("key", e.target.value.toUpperCase())}
            {...field("key")}
          />
        </Labelled>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Labelled id="kind" label="Kind" error={errors.kind}>
          <Select value={values.kind} onValueChange={(value) => set("kind", value as ProjectKind)}>
            <SelectTrigger id="kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project — internal work</SelectItem>
              <SelectItem value="job">Job — for a client</SelectItem>
            </SelectContent>
          </Select>
        </Labelled>
        {values.kind === "job" ? (
          <Labelled id="clientName" label="Client" error={errors.clientName} hint="A new name creates the client.">
            <Input
              id="clientName"
              value={values.clientName}
              maxLength={120}
              onChange={(e) => set("clientName", e.target.value)}
              {...field("clientName")}
            />
          </Labelled>
        ) : (
          <Labelled id="priority" label="Priority" error={errors.priority}>
            <PrioritySelect value={values.priority} onChange={(value) => set("priority", value)} />
          </Labelled>
        )}
      </div>

      {values.kind === "job" ? (
        <Labelled id="priority" label="Priority" error={errors.priority}>
          <PrioritySelect value={values.priority} onChange={(value) => set("priority", value)} />
        </Labelled>
      ) : null}

      <Labelled id="description" label="Description" error={errors.description}>
        <Textarea
          id="description"
          rows={5}
          maxLength={5000}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          {...field("description")}
        />
      </Labelled>

      <div className="grid gap-5 sm:grid-cols-2">
        <Labelled id="startDate" label="Start date" error={errors.startDate}>
          <Input
            id="startDate"
            type="date"
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            {...field("startDate")}
          />
        </Labelled>
        <Labelled id="targetEndDate" label="Target end date" error={errors.targetEndDate}>
          <Input
            id="targetEndDate"
            type="date"
            value={values.targetEndDate}
            onChange={(e) => set("targetEndDate", e.target.value)}
            {...field("targetEndDate")}
          />
        </Labelled>
      </div>

      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (value: Priority) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Priority)}>
      <SelectTrigger id="priority" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="urgent">Urgent</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
  );
}

function Labelled({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
