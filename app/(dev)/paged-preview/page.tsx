import { notFound } from "next/navigation";

import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { PagedDocument } from "@/features/documents/components/paged-document.client";
import { DEFAULT_LETTERHEAD } from "@/features/documents/files";
import { findTemplate, initialValues, type Values } from "@/features/documents/templates";

export const dynamic = "force-dynamic";

// TEMPORARY dev-only route for screenshotting paged documents. Delete after use.
export default async function PagedPreview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { t = "employment_contract", n = "14", mode = "doc" } = await searchParams;
  const template = findTemplate(t);
  if (!template) notFound();
  const context = { letterhead: DEFAULT_LETTERHEAD, today: "2026-09-27", project: null };
  const values: Values = initialValues(template, context);
  const count = Number(n);
  for (const field of template.fields) {
    if (field.type === "items")
      values[field.name] = Array.from({ length: count }, (_, i) => ({
        description: `Line item ${i + 1} — development work on module ${i + 1}`,
        quantity: (i % 4) + 1,
        unitPrice: 150000 + i * 1000,
      }));
    else if (field.type === "textarea")
      values[field.name] = Array.from(
        { length: count },
        (_, i) =>
          `Entry ${i + 1} for ${field.label.toLowerCase()} | 2026-10-${String((i % 28) + 1).padStart(2, "0")} | A longer note that wraps across the width of the page so rows and items have realistic height ${i + 1}`,
      ).join("\n");
    else if (field.type === "text" && !values[field.name]) values[field.name] = `Sample ${field.label}`;
    else if (field.type === "date" && !values[field.name]) values[field.name] = "2026-10-01";
  }
  if (mode === "gen")
    return (
      <div className="p-6">
        <DocumentGenerator
          projects={[]}
          templateKey={t}
          seed={{ values, letterhead: DEFAULT_LETTERHEAD, title: "x" }}
          today="2026-09-27"
          defaultLetterhead={DEFAULT_LETTERHEAD}
          canSave={false}
        />
      </div>
    );
  const content = template.build(values, context);
  return (
    <div className="bg-bg-subtle p-3 sm:p-8">
      <PagedDocument content={content} letterhead={DEFAULT_LETTERHEAD} id="dev" />
    </div>
  );
}
