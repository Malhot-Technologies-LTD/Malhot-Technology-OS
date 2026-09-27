"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveShowcase } from "@/features/showcase/actions";
import type { ShowcaseEditorData } from "@/features/showcase/queries";
import {
  SHOWCASE_CATEGORIES,
  showcaseSchema,
  slugify,
  type ShowcaseInput,
  type ShowcaseOutput,
} from "@/features/showcase/schemas";
import { applyActionError } from "@/lib/forms/action-errors";

type Props = Pick<ShowcaseEditorData, "project" | "showcase">;

/** What a new entry starts from: the project's own name and description, never shown until published. */
function defaultsFor({ project, showcase }: Props): ShowcaseInput {
  if (showcase) {
    return {
      projectId: project.id,
      title: showcase.title,
      slug: showcase.slug,
      category: showcase.category,
      scope: showcase.scope ?? "",
      year: showcase.year?.toString() ?? "",
      clientLabel: showcase.clientLabel ?? "",
      summary: showcase.summary,
      overview: showcase.overview ?? "",
      features: showcase.features.join("\n"),
      stack: showcase.stack.join("\n"),
      liveUrl: showcase.liveUrl ?? "",
      published: showcase.published,
    };
  }
  const description = project.description ?? "";
  return {
    projectId: project.id,
    title: project.name,
    slug: slugify(project.name),
    category: "Web",
    scope: "",
    year: new Date().getFullYear().toString(),
    // Deliberately empty even for a job: naming a client in public needs their
    // agreement, which is not something the form can assume.
    clientLabel: "",
    summary: description.length <= 300 ? description : "",
    overview: description,
    features: "",
    stack: "",
    liveUrl: "",
    published: false,
  };
}

/**
 * The public copy for one project: what the card on /projects says and what
 * its own page at /projects/<address> shows. Written for visitors, separately
 * from the project's internal description.
 */
export function ShowcaseForm(props: Props) {
  const [pending, startTransition] = useTransition();
  const isNew = props.showcase === null;
  const form = useForm<ShowcaseInput, unknown, ShowcaseOutput>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: defaultsFor(props),
  });
  const { errors } = form.formState;
  const slug = useWatch({ control: form.control, name: "slug" });
  const published = useWatch({ control: form.control, name: "published" });

  // Suggest an address from the title until someone edits the address themselves.
  const onTitleBlur = () => {
    if (!form.getFieldState("slug").isDirty && isNew) {
      form.setValue("slug", slugify(form.getValues("title")), { shouldValidate: true });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    startTransition(async () => {
      // The raw input, not `values`: the resolver has already turned the line
      // lists into arrays and the year into a number, and the action parses the
      // same schema again, which expects the strings the fields hold.
      const result = await saveShowcase(form.getValues());
      if (!result.ok) {
        applyActionError(form.setError, result.error);
        return;
      }
      form.reset(form.getValues());
      if (result.data.created) toast.success("Saved. You can add photos now.");
      else toast.success(values.published ? "Saved and live on the website" : "Saved");
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Controller
          control={form.control}
          name="published"
          render={({ field }) => (
            <Field orientation="horizontal" className="rounded-md border border-border bg-bg-subtle p-4">
              <Switch id="published" checked={field.value} onCheckedChange={field.onChange} />
              <FieldContent>
                <FieldLabel htmlFor="published">Show on the website</FieldLabel>
                <FieldDescription>
                  {field.value
                    ? "Visible to everyone once you save."
                    : "Hidden. You can prepare everything and switch it on when it is ready."}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Project name on the website</FieldLabel>
          <Input id="title" aria-invalid={Boolean(errors.title)} {...form.register("title", { onBlur: onTitleBlur })} />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={Boolean(errors.slug)}>
          <FieldLabel htmlFor="slug">Web address</FieldLabel>
          <Input id="slug" className="font-mono" aria-invalid={Boolean(errors.slug)} {...form.register("slug")} />
          <FieldDescription>
            The page will be at <span className="font-mono">/projects/{slug || "…"}</span>.
            {!isNew && published ? " Changing it breaks links people have already shared." : null}
          </FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOWCASE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field data-invalid={Boolean(errors.year)}>
            <FieldLabel htmlFor="year">Year</FieldLabel>
            <Input
              id="year"
              inputMode="numeric"
              maxLength={4}
              aria-invalid={Boolean(errors.year)}
              {...form.register("year")}
            />
            <FieldError errors={[errors.year]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.scope)}>
          <FieldLabel htmlFor="scope">What it is</FieldLabel>
          <Input
            id="scope"
            placeholder="For example: Marketplace for farmers and buyers"
            aria-invalid={Boolean(errors.scope)}
            {...form.register("scope")}
          />
          <FieldDescription>A short label shown on the project card.</FieldDescription>
          <FieldError errors={[errors.scope]} />
        </Field>

        <Field data-invalid={Boolean(errors.clientLabel)}>
          <FieldLabel htmlFor="clientLabel">Client name</FieldLabel>
          <Input id="clientLabel" aria-invalid={Boolean(errors.clientLabel)} {...form.register("clientLabel")} />
          <FieldDescription>
            Only name a client who has agreed to it. Leave empty to show the project without one.
            {props.project.clientName ? ` On file: ${props.project.clientName}.` : null}
          </FieldDescription>
          <FieldError errors={[errors.clientLabel]} />
        </Field>

        <Field data-invalid={Boolean(errors.summary)}>
          <FieldLabel htmlFor="summary">Summary</FieldLabel>
          <Textarea id="summary" rows={2} aria-invalid={Boolean(errors.summary)} {...form.register("summary")} />
          <FieldDescription>One or two sentences on the project card. Up to 300 characters.</FieldDescription>
          <FieldError errors={[errors.summary]} />
        </Field>

        <Field data-invalid={Boolean(errors.overview)}>
          <FieldLabel htmlFor="overview">Overview</FieldLabel>
          <Textarea id="overview" rows={6} aria-invalid={Boolean(errors.overview)} {...form.register("overview")} />
          <FieldDescription>The main text on the project page: the problem, and what was built.</FieldDescription>
          <FieldError errors={[errors.overview]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.features)}>
            <FieldLabel htmlFor="features">What we built</FieldLabel>
            <Textarea id="features" rows={6} aria-invalid={Boolean(errors.features)} {...form.register("features")} />
            <FieldDescription>One feature per line.</FieldDescription>
            <FieldError errors={[errors.features]} />
          </Field>
          <Field data-invalid={Boolean(errors.stack)}>
            <FieldLabel htmlFor="stack">Technology</FieldLabel>
            <Textarea id="stack" rows={6} aria-invalid={Boolean(errors.stack)} {...form.register("stack")} />
            <FieldDescription>One per line, for example Next.js.</FieldDescription>
            <FieldError errors={[errors.stack]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.liveUrl)}>
          <FieldLabel htmlFor="liveUrl">Live link</FieldLabel>
          <Input
            id="liveUrl"
            type="url"
            placeholder="https://"
            aria-invalid={Boolean(errors.liveUrl)}
            {...form.register("liveUrl")}
          />
          <FieldDescription>Optional. Shown as “Visit the live product” on the project page.</FieldDescription>
          <FieldError errors={[errors.liveUrl]} />
        </Field>
      </FieldGroup>

      <FieldError errors={[errors.root]} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Save and continue to photos" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
