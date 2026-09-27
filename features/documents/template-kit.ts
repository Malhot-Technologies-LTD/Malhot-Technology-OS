import type { DocumentType } from "@/types/domain";

import { formatMoney, longDate, type Block, type DocumentContent, type Letterhead, type LineItem } from "./content";

/**
 * The building blocks every document template is made from: field types, the
 * context a template can read, and small helpers that turn form values into
 * document text. Templates live in templates.ts (the originals) and in
 * library/*.ts (one file per category).
 *
 * Document templates for the generator (Documents → Generate).
 *
 * Each template names the facts it needs and turns them into a
 * DocumentContent. The wording is a professional starting point written for a
 * company in Rwanda, not legal advice: contracts in particular should be
 * reviewed by a lawyer once before the template is relied on, and the page says
 * so. Nothing here invents facts — anything not filled in renders as a visible
 * [bracketed] gap rather than a plausible-looking default.
 */

export type FieldValue = string | LineItem[];
export type Values = Record<string, FieldValue>;

type BaseField = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
  /** Shown (and required) only when this holds, e.g. a follow-up question for an unusual answer. */
  visible?: (values: Values) => boolean;
};

export type FieldDef =
  | (BaseField & { type: "text" | "textarea" | "date" | "number"; default?: (context: TemplateContext) => string })
  | (BaseField & { type: "select"; options: readonly string[]; default?: (context: TemplateContext) => string })
  /**
   * A job title from the company's position list (positions.ts), searchable,
   * or one typed in. `multiple` holds several, one per line, so the value
   * stays a plain string like every other field.
   */
  | (BaseField & { type: "position"; multiple?: boolean; default?: (context: TemplateContext) => string })
  | (BaseField & { type: "items" });

/**
 * What a template can read besides its own fields. The project block is filled
 * from the system when the generator is opened from (or saving to) a project,
 * so templates can default to real data instead of asking again. Every field
 * past the first three is optional: a template must work without them.
 */
export type TemplateContext = {
  letterhead: Letterhead;
  today: string;
  project?: {
    key: string;
    name: string;
    clientName: string | null;
    description?: string | null;
    startDate?: string | null;
    targetEndDate?: string | null;
    managerName?: string | null;
    team?: readonly { name: string; role: string }[];
    milestones?: readonly { title: string; due: string | null; done: boolean }[];
  } | null;
};

export type TemplateCategory =
  | "Sales & Clients"
  | "Contracts & Legal"
  | "Finance"
  | "Projects"
  | "Software & Technical"
  | "HR & Recruitment"
  | "Support"
  | "Internal";

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  "Sales & Clients",
  "Contracts & Legal",
  "Finance",
  "Projects",
  "Software & Technical",
  "HR & Recruitment",
  "Support",
  "Internal",
];

export type DocumentTemplate = {
  key: string;
  name: string;
  category: TemplateCategory;
  /** Where it files among uploaded documents. */
  documentType: DocumentType;
  summary: string;
  /** Contracts carry a review reminder on the form (never on the printed page). */
  legal?: boolean;
  fields: readonly FieldDef[];
  build: (values: Values, context: TemplateContext) => DocumentContent;
};

// Helpers ----------------------------------------------------------------------

/** A text value, or a visible [gap] naming what is missing. */
export function text(values: Values, name: string, label: string): string {
  const value = values[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : `[${label}]`;
}

export function optional(values: Values, name: string): string | null {
  const value = values[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function items(values: Values, name: string): LineItem[] {
  const value = values[name];
  return Array.isArray(value) ? value : [];
}

export function money(values: Values, name: string, label: string, currency: string): string {
  const raw = optional(values, name);
  if (raw === null) return `[${label}]`;
  const amount = Number(raw.replace(/[, ]/g, ""));
  return Number.isFinite(amount) ? formatMoney(amount, currency) : raw;
}

export function date(values: Values, name: string, label: string): string {
  const raw = optional(values, name);
  return raw ? longDate(raw) : `[${label}]`;
}

/** Splits a textarea into list items: one per line, bullets and numbering stripped. */
export function lines(values: Values, name: string): string[] {
  const raw = optional(values, name);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

export function paragraphs(values: Values, name: string): Block[] {
  const raw = optional(values, name);
  if (!raw) return [];
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ kind: "paragraph", text: paragraph }) as const);
}

export const today = (context: TemplateContext) => context.today;
export const company = (context: TemplateContext) => context.letterhead.companyName || "the Company";
/** e.g. MAL/HR/20260927 — dated, deterministic, and easy to make unique by editing. */
export const ref = (prefix: string) => (context: TemplateContext) => `${prefix}/${context.today.replace(/-/g, "")}`;

export const common = {
  reference: (prefix: string): FieldDef => ({
    name: "reference",
    label: "Reference",
    type: "text",
    default: ref(prefix),
  }),
  date: { name: "date", label: "Date", type: "date", default: today } satisfies FieldDef,
  currency: {
    name: "currency",
    label: "Currency",
    type: "select",
    options: ["RWF", "USD", "EUR", "KES", "UGX", "TZS"],
    default: () => "RWF",
  } satisfies FieldDef,
  signatory: {
    name: "signatoryName",
    label: "Signed for the company by",
    type: "text",
    required: true,
  } satisfies FieldDef,
  signatoryTitle: {
    name: "signatoryTitle",
    label: "Signatory title",
    type: "text",
    default: () => "Managing Director",
  } satisfies FieldDef,
  governingLaw: {
    name: "governingLaw",
    label: "Governing law",
    type: "text",
    default: () => "the laws of the Republic of Rwanda",
  } satisfies FieldDef,
};

/**
 * Contracts follow the company's own agreement format (its developer
 * contract): title and role, AGREEMENT DATE, "entered into between" the
 * parties, CAPS numbered sections and a two-column signature block. The date
 * is left as a line to fill in by hand unless one is given.
 */
export function agreementDate(values: Values): string {
  const raw = optional(values, "agreementDate");
  return raw ? longDate(raw) : "";
}

/** Numbered CAPS section headings, counted in the order they are written. */
export function sections() {
  let number = 0;
  return (title: string): Block => ({ kind: "heading", text: `${++number}. ${title.toUpperCase()}` });
}

export const agreementDateField: FieldDef = {
  name: "agreementDate",
  label: "Agreement date",
  type: "date",
  hint: "Leave empty to sign and date by hand.",
};

export const ceoField: FieldDef = {
  name: "signatoryName",
  label: "CEO / signing for the company",
  type: "text",
  required: true,
};

/**
 * Rows for a table block from a textarea written one row per line, cells
 * separated by "|": "Design | 2026-10-01 | RWF 500,000". Short rows are padded,
 * extra cells are joined into the last column, blank lines are skipped.
 */
export function tableRows(values: Values, name: string, columns: number): string[][] {
  const raw = optional(values, name);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      const head = cells.slice(0, columns - 1);
      const tail = cells.slice(columns - 1).join(" | ");
      const row = [...head, tail];
      while (row.length < columns) row.push("");
      return row.slice(0, columns);
    });
}

/** A table block, or a single gap row naming what to fill in when there are no rows yet. */
export function table(columns: readonly string[], rows: readonly (readonly string[])[], emptyLabel: string): Block {
  return {
    kind: "table",
    columns,
    rows: rows.length > 0 ? rows : [[`[${emptyLabel}]`, ...columns.slice(1).map(() => "")]],
  };
}
