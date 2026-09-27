"use client";

import {
  AlertTriangle,
  Banknote,
  Briefcase,
  ChevronLeft,
  FileSignature,
  FolderKanban,
  Plus,
  Save,
  Scale,
  Trash2,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveGeneratedDocument } from "@/features/documents/actions";
import { DocumentPaper } from "@/features/documents/components/document-paper";
import { PrintButton, PrintCopy } from "@/features/documents/components/print.client";
import { LETTERHEAD_FIELDS, type Letterhead, type LineItem } from "@/features/documents/content";
import { sanitiseLetterhead } from "@/features/documents/files";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  findTemplate,
  initialValues,
  missingFields,
  type DocumentTemplate,
  type FieldDef,
  type TemplateCategory,
  type Values,
} from "@/features/documents/templates";
import { cn } from "@/lib/utils";

export type GeneratorProject = { key: string; name: string; clientName: string | null };

type Props = {
  /** Projects the viewer may save documents into. */
  projects: readonly GeneratorProject[];
  /** Fixed when opened from inside a project. */
  projectKey?: string;
  templateKey: string | null;
  /** "Edit a copy" of a saved document. */
  seed?: { values: Values; letterhead: Letterhead; title: string } | null;
  /** Today in the viewer's timezone, from the server so both renders agree. */
  today: string;
  defaultLetterhead: Letterhead;
  /** False until the documents migration is applied; printing still works. */
  canSave: boolean;
};

const CATEGORY_ICON: Record<TemplateCategory, typeof Users> = {
  "HR & recruitment": Users,
  "Clients & legal": Scale,
  Finance: Banknote,
  Projects: Briefcase,
};

const LETTERHEAD_STORAGE = "malhot.letterhead";
const noSubscription = () => () => {};

/**
 * Documents → Generate: pick a template, fill in the facts, and the document is
 * drawn on company letterhead as you type. Print or save it as a PDF from the
 * browser, or save it to a project, where it is kept as the facts rather than a
 * file, so it can be reopened, copied and reprinted.
 *
 * Rendered only in the browser: the letterhead is remembered per browser, and
 * reading it during the server render would draw one letterhead and hydrate
 * another.
 */
export function DocumentGenerator(props: Props) {
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  if (!mounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-[26rem_minmax(0,1fr)]">
        <Skeleton className="h-[40rem] rounded-lg" />
        <Skeleton className="h-[40rem] rounded-lg" />
      </div>
    );
  }
  const template = findTemplate(props.templateKey);
  return template ? <Workspace key={template.key} {...props} template={template} /> : <Gallery />;
}

function Gallery() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-8">
      {TEMPLATE_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICON[category];
        return (
          <section key={category} aria-labelledby={`category-${category}`} className="flex flex-col gap-3">
            <h2
              id={`category-${category}`}
              className="flex items-center gap-2 text-sm font-semibold tracking-[0.04em] text-fg-muted uppercase"
            >
              <Icon className="size-4" aria-hidden="true" /> {category}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {TEMPLATES.filter((template) => template.category === category).map((template) => (
                <li key={template.key}>
                  <button
                    type="button"
                    onClick={() => router.push(`${pathname}?template=${template.key}`)}
                    className="group flex h-full w-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 text-left transition-[border-color,box-shadow,transform] duration-[160ms] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-m focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-md bg-brand-subtle text-brand">
                        <FileSignature className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="font-semibold group-hover:underline">{template.name}</span>
                    </span>
                    <span className="text-sm text-fg-muted">{template.summary}</span>
                    {template.legal ? (
                      <span className="mt-auto text-xs text-fg-subtle">Legal document — review once with a lawyer</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function readStoredLetterhead(fallback: Letterhead): Letterhead {
  try {
    const raw = window.localStorage.getItem(LETTERHEAD_STORAGE);
    return raw ? sanitiseLetterhead({ ...fallback, ...JSON.parse(raw) }) : fallback;
  } catch {
    return fallback;
  }
}

function Workspace({
  template,
  projects,
  projectKey,
  seed,
  today,
  defaultLetterhead,
  canSave,
}: Props & { template: DocumentTemplate }) {
  const router = useRouter();
  const pathname = usePathname();
  const [targetKey, setTargetKey] = useState(projectKey ?? projects[0]?.key ?? "");
  const project = projects.find((candidate) => candidate.key === targetKey) ?? null;
  const [letterhead, setLetterhead] = useState<Letterhead>(
    () => seed?.letterhead ?? readStoredLetterhead(defaultLetterhead),
  );
  const [values, setValues] = useState<Values>(
    () => seed?.values ?? initialValues(template, { letterhead, today, project }),
  );
  const [title, setTitle] = useState(seed?.title ?? "");
  const [pending, startTransition] = useTransition();

  const context = { letterhead, today, project };
  const content = template.build(values, context);
  const missing = missingFields(template, values);
  const suggestedTitle = `${template.name}${firstFilled(template, values) ? ` — ${firstFilled(template, values)}` : ""}`;

  function updateLetterhead(key: keyof Letterhead, value: string) {
    const next = { ...letterhead, [key]: value };
    setLetterhead(next);
    try {
      window.localStorage.setItem(LETTERHEAD_STORAGE, JSON.stringify(next));
    } catch {
      // Private windows can refuse storage; the letterhead still works for this visit.
    }
  }

  function save() {
    if (!targetKey) {
      toast.error("Choose a project to save it to.");
      return;
    }
    startTransition(async () => {
      const result = await saveGeneratedDocument({
        projectKey: targetKey,
        templateKey: template.key,
        title: title.trim() || suggestedTitle,
        values,
        letterhead,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Saved to the project's documents");
      router.push(`/os/projects/${targetKey}/documents/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            <ChevronLeft aria-hidden="true" /> Templates
          </Button>
          <h2 className="truncate text-lg font-semibold">{template.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          {canSave && projects.length > 0 ? (
            <Button onClick={save} disabled={pending}>
              <Save aria-hidden="true" /> {pending ? "Saving…" : "Save to project"}
            </Button>
          ) : null}
        </div>
      </div>

      {template.legal ? (
        <p className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This is a professional starting point, not legal advice. Have a lawyer review the wording once before you rely
          on it for signing.
        </p>
      ) : null}
      {!canSave ? (
        <p className="rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm text-fg-muted">
          Saving documents to a project needs a one-time database update. You can still print this or save it as a PDF.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[26rem_minmax(0,1fr)]">
        <form
          className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto"
          onSubmit={(event) => event.preventDefault()}
        >
          {canSave && projects.length > 0 ? (
            <div className="grid gap-4 border-b border-border pb-5">
              {!projectKey ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium" aria-hidden="true">
                    Save to project
                  </span>
                  <Select value={targetKey} onValueChange={setTargetKey}>
                    <SelectTrigger className="w-full" aria-label="Save to project">
                      <FolderKanban className="size-4 text-fg-subtle" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((candidate) => (
                        <SelectItem key={candidate.key} value={candidate.key}>
                          {candidate.key} · {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Document title</span>
                <Input
                  value={title}
                  placeholder={suggestedTitle}
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
            </div>
          ) : null}

          {missing.length > 0 ? (
            <p className="rounded-md bg-status-warning-bg px-3 py-2 text-[13px] text-status-warning-fg" role="status">
              Still to fill in: {missing.join(", ")}. Gaps show highlighted in the preview.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {template.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                onChange={(value) => setValues((previous) => ({ ...previous, [field.name]: value }))}
              />
            ))}
          </div>

          <details className="group rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium select-none">
              Letterhead <span className="font-normal text-fg-subtle">— remembered in this browser</span>
            </summary>
            <div className="grid gap-3 border-t border-border p-3">
              {LETTERHEAD_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-fg-muted">{field.label}</span>
                  <Input
                    value={letterhead[field.key]}
                    placeholder={field.placeholder}
                    maxLength={200}
                    onChange={(event) => updateLetterhead(field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </details>
        </form>

        <div className="min-w-0 overflow-x-auto rounded-lg bg-bg-subtle p-3 sm:p-6" aria-label="Preview">
          <DocumentPaper content={content} letterhead={letterhead} id="preview" />
        </div>
      </div>

      <PrintCopy>
        <DocumentPaper content={content} letterhead={letterhead} id="print" />
      </PrintCopy>
    </div>
  );
}

/** The first filled text field, to suggest a title like "Offer of employment — Aline Uwase". */
function firstFilled(template: DocumentTemplate, values: Values): string | null {
  for (const field of template.fields) {
    if (field.type !== "text" || !field.required) continue;
    const value = values[field.name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: Values[string] | undefined;
  onChange: (value: Values[string]) => void;
}) {
  const id = `field-${field.name}`;
  const label = (
    <span className="flex items-baseline justify-between gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {field.required ? <span className="text-status-danger-fg"> *</span> : null}
      </label>
    </span>
  );
  const wide = field.type === "textarea" || field.type === "items" || field.wide;

  if (field.type === "items") {
    const rows = Array.isArray(value) ? value : [];
    const setRow = (index: number, patch: Partial<LineItem>) =>
      onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    return (
      <fieldset className="col-span-full flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">{field.label}</legend>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_4rem_6.5rem_auto] items-center gap-1.5">
            <Input
              aria-label={`Item ${index + 1} description`}
              placeholder="Description"
              value={row.description}
              onChange={(event) => setRow(index, { description: event.target.value })}
            />
            <Input
              aria-label={`Item ${index + 1} quantity`}
              type="number"
              min={0}
              value={row.quantity}
              onChange={(event) => setRow(index, { quantity: Number(event.target.value) })}
            />
            <Input
              aria-label={`Item ${index + 1} unit price`}
              type="number"
              min={0}
              value={row.unitPrice}
              onChange={(event) => setRow(index, { unitPrice: Number(event.target.value) })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove item ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onChange([...rows, { description: "", quantity: 1, unitPrice: 0 }])}
        >
          <Plus aria-hidden="true" /> Add line
        </Button>
      </fieldset>
    );
  }

  const text = typeof value === "string" ? value : "";
  return (
    <div className={cn("flex flex-col gap-1.5", wide && "col-span-full")}>
      {label}
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={field.wide ? 5 : 3}
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "select" ? (
        <Select value={text} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.hint ? <span className="text-xs text-fg-subtle">{field.hint}</span> : null}
    </div>
  );
}
