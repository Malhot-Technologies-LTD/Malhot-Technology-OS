import type { DocumentType } from "@/types/domain";

import {
  formatMoney,
  itemTotals,
  longDate,
  type Block,
  type DocumentContent,
  type Letterhead,
  type LineItem,
} from "./content";
import { ROLE_NAMES, roleProfile, type RoleProfile } from "./roles";

/**
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
};

export type FieldDef =
  | (BaseField & { type: "text" | "textarea" | "date" | "number"; default?: (context: TemplateContext) => string })
  | (BaseField & { type: "select"; options: readonly string[]; default?: (context: TemplateContext) => string })
  | (BaseField & { type: "items" });

export type TemplateContext = {
  letterhead: Letterhead;
  today: string;
  project?: { key: string; name: string; clientName: string | null } | null;
};

export type TemplateCategory = "HR & recruitment" | "Clients & legal" | "Finance" | "Projects";

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
function text(values: Values, name: string, label: string): string {
  const value = values[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : `[${label}]`;
}

function optional(values: Values, name: string): string | null {
  const value = values[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function items(values: Values, name: string): LineItem[] {
  const value = values[name];
  return Array.isArray(value) ? value : [];
}

function money(values: Values, name: string, label: string, currency: string): string {
  const raw = optional(values, name);
  if (raw === null) return `[${label}]`;
  const amount = Number(raw.replace(/[, ]/g, ""));
  return Number.isFinite(amount) ? formatMoney(amount, currency) : raw;
}

function date(values: Values, name: string, label: string): string {
  const raw = optional(values, name);
  return raw ? longDate(raw) : `[${label}]`;
}

/** Splits a textarea into list items: one per line, bullets and numbering stripped. */
function lines(values: Values, name: string): string[] {
  const raw = optional(values, name);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function paragraphs(values: Values, name: string): Block[] {
  const raw = optional(values, name);
  if (!raw) return [];
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ kind: "paragraph", text: paragraph }) as const);
}

const today = (context: TemplateContext) => context.today;
const company = (context: TemplateContext) => context.letterhead.companyName || "the Company";
/** e.g. MAL/HR/20260927 — dated, deterministic, and easy to make unique by editing. */
const ref = (prefix: string) => (context: TemplateContext) => `${prefix}/${context.today.replace(/-/g, "")}`;

const common = {
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

// Templates ------------------------------------------------------------------

/**
 * Contracts follow the company's own agreement format (its developer
 * contract): title and role, AGREEMENT DATE, "entered into between" the
 * parties, CAPS numbered sections and a two-column signature block. The date
 * is left as a line to fill in by hand unless one is given.
 */
function agreementDate(values: Values): string {
  const raw = optional(values, "agreementDate");
  return raw ? longDate(raw) : "";
}

/** Numbered CAPS section headings, counted in the order they are written. */
function sections() {
  let number = 0;
  return (title: string): Block => ({ kind: "heading", text: `${++number}. ${title.toUpperCase()}` });
}

const agreementDateField: FieldDef = {
  name: "agreementDate",
  label: "Agreement date",
  type: "date",
  hint: "Leave empty to sign and date by hand.",
};

const ceoField: FieldDef = {
  name: "signatoryName",
  label: "CEO / signing for the company",
  type: "text",
  required: true,
};

/** The role picker shared by offers and employment agreements (see roles.ts). */
const roleField: FieldDef = {
  name: "roleType",
  label: "Role",
  type: "select",
  options: ROLE_NAMES,
  default: () => ROLE_NAMES[0]!,
  hint: "Sets the duties, confidentiality, IP and access clauses for this kind of work.",
};

const responsibilitiesField: FieldDef = {
  name: "responsibilities",
  label: "Responsibilities (optional)",
  type: "textarea",
  wide: true,
  placeholder: "Leave empty for the standard duties of the role",
  hint: 'Completes "…with responsibilities including ___".',
};

const confidentialField: FieldDef = {
  name: "confidential",
  label: "Kept confidential (optional, one per line)",
  type: "textarea",
  wide: true,
  placeholder: "Leave empty for the standard list for the role",
};

const terminationField: FieldDef = {
  name: "termination",
  label: "Terminated when (one per line)",
  type: "textarea",
  wide: true,
  default: (context) =>
    `The Employee chooses to leave or no longer wishes to be part of ${company(context)}\nThe Employee fails to meet performance expectations or deliver quality work\nThe Employee violates company policies, confidentiality agreements, or professional standards`,
};

const compensationField: FieldDef = {
  name: "compensation",
  label: "Compensation",
  type: "text",
  required: true,
  placeholder: "e.g. RWF 800,000 per month, or 14.295% of salary base",
};

const paymentScheduleField: FieldDef = {
  name: "paymentSchedule",
  label: "Payment schedule",
  type: "textarea",
  wide: true,
  default: () =>
    "Per project basis. Payment is received upon successful completion and delivery of project milestones.",
};

function role(values: Values): RoleProfile {
  return roleProfile(optional(values, "roleType"));
}

/**
 * The clauses every employment document shares, worded for the role: duties,
 * pay, confidentiality, IP ownership, access and termination, in the order of
 * the company's own contract.
 */
function employmentClauses(
  values: Values,
  employer: string,
  position: string,
  section: (title: string) => Block,
  /** Built only when reached, so any sections they add are numbered in reading order. */
  extra: { afterPosition?: () => readonly Block[]; afterCompensation?: () => readonly Block[] } = {},
): Block[] {
  const profile = role(values);
  const confidential = lines(values, "confidential");
  const termination = lines(values, "termination");
  return [
    section("Position & responsibilities"),
    {
      kind: "paragraph",
      text: `The Employee is hired as a ${position} with responsibilities including ${optional(values, "responsibilities") ?? profile.responsibilities}.`,
    },
    ...(extra.afterPosition?.() ?? []),
    section("Compensation"),
    {
      kind: "terms",
      rows: [
        ["Compensation", text(values, "compensation", "Compensation")],
        ["Payment Schedule", text(values, "paymentSchedule", "Payment schedule")],
      ],
    },
    ...(extra.afterCompensation?.() ?? []),
    section("Confidentiality"),
    { kind: "paragraph", text: "The Employee agrees to maintain strict confidentiality regarding:" },
    { kind: "list", items: confidential.length > 0 ? confidential : profile.confidential },
    section(profile.ipHeading),
    {
      kind: "paragraph",
      text: `All work produced by the Employee, including ${profile.workProduct}, is the property of ${employer}. The Employee has no personal ownership rights to company intellectual property.`,
    },
    section("Access & security"),
    {
      kind: "paragraph",
      text: `The Employee receives access to ${profile.access} as required by their role. This access must be protected and used only for authorized work.`,
    },
    section("Termination"),
    { kind: "paragraph", text: "This agreement is terminated under the following conditions:" },
    { kind: "list", items: termination.length > 0 ? termination : ["[Conditions]"] },
    {
      kind: "paragraph",
      text: "Upon termination, all company property, credentials, and access must be returned immediately.",
    },
  ];
}

const offerLetter: DocumentTemplate = {
  key: "offer_letter",
  name: "Offer of employment",
  category: "HR & recruitment",
  documentType: "other",
  summary: "A job offer in the company's agreement format, worded for the role: duties, pay, start date, acceptance.",
  fields: [
    roleField,
    { name: "candidateName", label: "Candidate's full name", type: "text", required: true },
    { name: "position", label: "Position", type: "text", required: true, placeholder: "e.g. Frontend Developer" },
    { name: "startDate", label: "Start date", type: "date", required: true },
    {
      name: "employmentType",
      label: "Employment type",
      type: "select",
      options: ["Full-time, permanent", "Full-time, fixed term", "Part-time", "Contract"],
      default: () => "Full-time, permanent",
    },
    { name: "reportsTo", label: "Reports to", type: "text" },
    { name: "location", label: "Place of work", type: "text", default: () => "Kigali, Rwanda" },
    { name: "probation", label: "Probation period", type: "text", default: () => "Three (3) months" },
    compensationField,
    {
      ...paymentScheduleField,
      default: () => "Monthly, at the end of each month, less the deductions required by law.",
    },
    {
      name: "benefits",
      label: "Benefits (optional, one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Laptop\nInternet allowance\nAnnual leave of 18 working days",
    },
    responsibilitiesField,
    confidentialField,
    terminationField,
    { name: "date", label: "Offer date", type: "date", default: today },
    { name: "acceptBy", label: "Accept by", type: "date" },
    { name: "governingLaw", label: "Governing law", type: "text", default: () => "the laws of Rwanda" },
    ceoField,
    { name: "reference", label: "Reference (optional)", type: "text", default: ref("MAL/HR") },
  ],
  build(values, context) {
    const employer = company(context);
    const candidate = text(values, "candidateName", "Candidate's full name");
    const position = text(values, "position", "Position");
    const benefits = lines(values, "benefits");
    const reportsTo = optional(values, "reportsTo");
    const acceptBy = optional(values, "acceptBy");
    const section = sections();
    return {
      layout: "contract",
      title: "Offer of Employment",
      subtitle: role(values).subtitle,
      dateLabel: "Offer date",
      // Empty leaves a line to date by hand, as on the agreement.
      date: optional(values, "date") ? date(values, "date", "Offer date") : "",
      reference: optional(values, "reference") ?? undefined,
      classification: "Private and confidential",
      blocks: [
        {
          kind: "parties",
          intro: `${employer} is pleased to offer employment on the terms below. This Offer of Employment ("Offer") is made between:`,
          parties: [
            { role: "Employer", lines: [employer, context.letterhead.address].filter(Boolean) },
            { role: "Employee", lines: [candidate, `Position: ${position}`] },
          ],
        },
        ...employmentClauses(values, employer, position, section, {
          afterPosition: () => [
            section("Terms of employment"),
            {
              kind: "terms",
              rows: [
                ["Start Date", date(values, "startDate", "Start date")],
                ["Employment Type", text(values, "employmentType", "Employment type")],
                ...(reportsTo ? ([["Reports To", reportsTo]] as const) : []),
                ["Place of Work", text(values, "location", "Place of work")],
                ["Probation Period", text(values, "probation", "Probation period")],
              ],
            },
          ],
          afterCompensation: () =>
            benefits.length > 0
              ? [
                  { kind: "paragraph", text: "The Employee also receives the following benefits:" },
                  { kind: "list", items: benefits },
                ]
              : [],
        }),
        section("Acceptance"),
        {
          kind: "paragraph",
          text: acceptBy
            ? `To accept this Offer, sign below and return a copy to ${employer} by ${longDate(acceptBy)}. If it is not accepted by then, the Offer lapses.`
            : `To accept this Offer, sign below and return a copy to ${employer}. Once signed by both parties, it forms the Employee's agreement with ${employer}.`,
        },
        section("Governing law"),
        { kind: "paragraph", text: `This agreement is governed by ${text(values, "governingLaw", "Governing law")}.` },
        {
          kind: "signatures",
          parties: [
            { role: "Employee signature", name: candidate },
            { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
          ],
        },
      ],
    };
  },
};

const employmentContract: DocumentTemplate = {
  key: "employment_contract",
  name: "Employment agreement",
  category: "HR & recruitment",
  documentType: "other",
  summary:
    "The company's employment agreement, worded for the role: duties, pay, confidentiality, IP, access, termination.",
  legal: true,
  fields: [
    agreementDateField,
    roleField,
    { name: "employeeName", label: "Employee's full name", type: "text", required: true },
    { name: "position", label: "Position", type: "text", required: true, placeholder: "e.g. Developer" },
    compensationField,
    paymentScheduleField,
    responsibilitiesField,
    confidentialField,
    terminationField,
    { name: "governingLaw", label: "Governing law", type: "text", default: () => "the laws of Rwanda" },
    ceoField,
    { name: "reference", label: "Reference (optional)", type: "text" },
  ],
  build(values, context) {
    const employer = company(context);
    const employee = text(values, "employeeName", "Employee's full name");
    const position = text(values, "position", "Position");
    const section = sections();
    return {
      layout: "contract",
      title: "Employment Agreement",
      subtitle: role(values).subtitle,
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Employment Agreement ("Agreement") is entered into between:',
          parties: [
            { role: "Employer", lines: [employer, context.letterhead.address].filter(Boolean) },
            { role: "Employee", lines: [employee, `Position: ${position}`] },
          ],
        },
        ...employmentClauses(values, employer, position, section),
        section("Governing law"),
        { kind: "paragraph", text: `This agreement is governed by ${text(values, "governingLaw", "Governing law")}.` },
        {
          kind: "signatures",
          parties: [
            { role: "Employee signature", name: employee },
            { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
          ],
        },
      ],
    };
  },
};

const internshipAgreement: DocumentTemplate = {
  key: "internship_agreement",
  name: "Internship agreement",
  category: "HR & recruitment",
  documentType: "other",
  summary: "Placement dates, supervisor, learning goals, stipend and conduct, in the company agreement format.",
  legal: true,
  fields: [
    agreementDateField,
    { name: "role", label: "Role type (subtitle)", type: "text", default: () => "Internship / Learning Placement" },
    { name: "internName", label: "Intern's full name", type: "text", required: true },
    {
      name: "position",
      label: "Internship role",
      type: "text",
      required: true,
      placeholder: "e.g. Software Engineering Intern",
    },
    { name: "institution", label: "School / university", type: "text" },
    { name: "supervisor", label: "Supervisor", type: "text", required: true },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "endDate", label: "End date", type: "date", required: true },
    { name: "objectives", label: "Learning objectives (one per line)", type: "textarea", wide: true },
    {
      name: "stipend",
      label: "Stipend (leave empty if unpaid)",
      type: "text",
      placeholder: "e.g. RWF 100,000 per month",
    },
    { name: "governingLaw", label: "Governing law", type: "text", default: () => "the laws of Rwanda" },
    ceoField,
    { name: "reference", label: "Reference (optional)", type: "text" },
  ],
  build(values, context) {
    const employer = company(context);
    const intern = text(values, "internName", "Intern's full name");
    const objectives = lines(values, "objectives");
    const section = sections();
    return {
      layout: "contract",
      title: "Internship Agreement",
      subtitle: optional(values, "role") ?? undefined,
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      blocks: [
        {
          kind: "parties",
          intro: 'This Internship Agreement ("Agreement") is entered into between:',
          parties: [
            { role: "Company", lines: [employer, context.letterhead.address].filter(Boolean) },
            {
              role: "Intern",
              lines: [
                intern,
                `Role: ${text(values, "position", "Internship role")}`,
                ...(optional(values, "institution") ? [`Student of ${optional(values, "institution")}`] : []),
              ],
            },
          ],
        },
        section("Placement"),
        {
          kind: "terms",
          rows: [
            ["Period", `${date(values, "startDate", "Start date")} to ${date(values, "endDate", "End date")}`],
            ["Supervisor", text(values, "supervisor", "Supervisor")],
            ["Stipend", optional(values, "stipend") ?? "Unpaid"],
          ],
        },
        {
          kind: "paragraph",
          text: "The internship gives the Intern practical experience under supervision. It is a learning placement and does not create a contract of employment.",
        },
        ...(objectives.length > 0
          ? ([section("Learning objectives"), { kind: "list", items: objectives }] as const)
          : []),
        section("Obligations"),
        {
          kind: "list",
          items: [
            "The Company provides supervision, a workspace, the equipment the work needs and regular feedback.",
            "The Intern follows the Company's working hours, instructions and policies, and reports absences in advance.",
          ],
        },
        section("Confidentiality & IP"),
        {
          kind: "paragraph",
          text: `The Intern keeps confidential all information about ${employer} and its clients, during and after the internship. All work produced during the internship, including source code, designs and documentation, is the property of ${employer}.`,
        },
        section("Termination"),
        {
          kind: "paragraph",
          text: "Either party may end the internship early with one week's written notice, or immediately for serious misconduct. Upon termination, all company property, credentials, and access must be returned immediately.",
        },
        section("Governing law"),
        { kind: "paragraph", text: `This agreement is governed by ${text(values, "governingLaw", "Governing law")}.` },
        {
          kind: "signatures",
          parties: [
            { role: "Intern signature", name: intern },
            { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
          ],
        },
      ],
    };
  },
};

const employmentCertificate: DocumentTemplate = {
  key: "employment_certificate",
  name: "Certificate of employment",
  category: "HR & recruitment",
  documentType: "other",
  summary: "Confirms someone works, or worked, at the company: role, dates and optional remarks.",
  fields: [
    common.reference("MAL/HR"),
    common.date,
    { name: "employeeName", label: "Employee's full name", type: "text", required: true },
    { name: "position", label: "Position held", type: "text", required: true },
    { name: "startDate", label: "Employed since", type: "date", required: true },
    { name: "endDate", label: "Until (leave empty if still employed)", type: "date" },
    { name: "remarks", label: "Remarks (optional)", type: "textarea", wide: true },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const name = text(values, "employeeName", "Employee's full name");
    const current = !optional(values, "endDate");
    return {
      title: "Certificate of Employment",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        { kind: "paragraph", text: "To whom it may concern," },
        {
          kind: "paragraph",
          text: current
            ? `This is to certify that ${name} has been employed by ${company(context)} as ${text(values, "position", "Position")} since ${date(values, "startDate", "Start date")}, and remains in our employment at the date of this certificate.`
            : `This is to certify that ${name} was employed by ${company(context)} as ${text(values, "position", "Position")} from ${date(values, "startDate", "Start date")} to ${date(values, "endDate", "End date")}.`,
        },
        ...paragraphs(values, "remarks"),
        {
          kind: "paragraph",
          text: "This certificate is issued at the request of the person named above, for whatever purpose it may serve.",
        },
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
          ],
        },
      ],
    };
  },
};

const nda: DocumentTemplate = {
  key: "nda",
  name: "Non-disclosure agreement",
  category: "Clients & legal",
  documentType: "other",
  summary: "A mutual NDA to sign before sharing plans, code or data with a client or partner.",
  legal: true,
  fields: [
    agreementDateField,
    {
      name: "partyName",
      label: "Other party (company or person)",
      type: "text",
      required: true,
      default: (context) => context.project?.clientName ?? "",
    },
    { name: "partyAddress", label: "Other party's address", type: "text" },
    {
      name: "purpose",
      label: "Purpose of sharing",
      type: "textarea",
      wide: true,
      required: true,
      default: (context) => (context.project ? `Discussing and delivering the ${context.project.name} project.` : ""),
    },
    { name: "years", label: "Confidentiality lasts (years)", type: "number", default: () => "3" },
    { name: "governingLaw", label: "Governing law", type: "text", default: () => "the laws of Rwanda" },
    ceoField,
    { name: "partySignatory", label: "Signed for the other party by", type: "text" },
    { name: "reference", label: "Reference (optional)", type: "text" },
  ],
  build(values, context) {
    const party = text(values, "partyName", "Other party");
    const section = sections();
    return {
      layout: "contract",
      title: "Non-Disclosure Agreement",
      subtitle: "Mutual Confidentiality",
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Non-Disclosure Agreement ("Agreement") is entered into between:',
          parties: [
            { role: "Party A", lines: [company(context), context.letterhead.address].filter(Boolean) },
            {
              role: "Party B",
              lines: [party, ...(optional(values, "partyAddress") ? [optional(values, "partyAddress")!] : [])],
            },
          ],
        },
        section("Purpose"),
        {
          kind: "paragraph",
          text: `The Parties wish to share confidential information for the following purpose: ${text(values, "purpose", "Purpose")}`,
        },
        section("Confidential information"),
        {
          kind: "paragraph",
          text: "Confidential information means any non-public information disclosed by one Party to the other, in any form, including business plans, designs, source code, data, credentials and pricing. It does not include information that is public through no fault of the receiving Party, was already lawfully known to it, or is independently developed.",
        },
        section("Obligations"),
        { kind: "paragraph", text: "Each Party agrees to:" },
        {
          kind: "list",
          items: [
            "Use confidential information only for the purpose above",
            "Share it only with employees and advisers who need it and are bound by similar obligations",
            "Protect it with at least the care used for its own confidential information",
            "Return or destroy it on written request",
          ],
        },
        section("Duration"),
        {
          kind: "paragraph",
          text: `These obligations continue for ${text(values, "years", "Years")} years from the date of this agreement.`,
        },
        section("Ownership"),
        { kind: "paragraph", text: "No licence or ownership of any information is transferred by this agreement." },
        section("Governing law"),
        {
          kind: "paragraph",
          text: `This agreement is governed by ${text(values, "governingLaw", "Governing law")}. Any dispute shall first be settled amicably before being referred to the competent courts.`,
        },
        {
          kind: "signatures",
          parties: [
            { role: `${company(context)} — CEO signature`, name: text(values, "signatoryName", "CEO") },
            { role: `${party} — signature`, name: optional(values, "partySignatory") ?? "" },
          ],
        },
      ],
    };
  },
};

const serviceAgreement: DocumentTemplate = {
  key: "service_agreement",
  name: "Software services agreement",
  category: "Clients & legal",
  documentType: "requirements",
  summary: "The contract with a client: scope, deliverables, fees, payment schedule, IP and warranty.",
  legal: true,
  fields: [
    agreementDateField,
    {
      name: "clientName",
      label: "Client",
      type: "text",
      required: true,
      default: (context) => context.project?.clientName ?? "",
    },
    { name: "clientAddress", label: "Client's address", type: "text" },
    {
      name: "projectName",
      label: "Project",
      type: "text",
      required: true,
      default: (context) => context.project?.name ?? "",
    },
    { name: "scope", label: "Scope of work", type: "textarea", wide: true, required: true },
    { name: "deliverables", label: "Deliverables (one per line)", type: "textarea", wide: true },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "deliveryDate", label: "Target delivery", type: "date" },
    common.currency,
    { name: "fee", label: "Total fee", type: "number", required: true },
    {
      name: "schedule",
      label: "Payment schedule (one per line)",
      type: "textarea",
      wide: true,
      default: () => "40% on signing\n40% on delivery of the beta\n20% on final acceptance",
    },
    { name: "warranty", label: "Warranty period", type: "text", default: () => "ninety (90) days after acceptance" },
    { name: "governingLaw", label: "Governing law", type: "text", default: () => "the laws of Rwanda" },
    ceoField,
    { name: "clientSignatory", label: "Signed for the client by", type: "text" },
    { name: "reference", label: "Reference (optional)", type: "text" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const currency = text(values, "currency", "Currency");
    const deliverables = lines(values, "deliverables");
    const schedule = lines(values, "schedule");
    const section = sections();
    return {
      layout: "contract",
      title: "Services Agreement",
      subtitle: `Software Development — ${text(values, "projectName", "Project")}`,
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Services Agreement ("Agreement") is entered into between:',
          parties: [
            { role: "Provider", lines: [company(context), context.letterhead.address].filter(Boolean) },
            {
              role: "Client",
              lines: [client, ...(optional(values, "clientAddress") ? [optional(values, "clientAddress")!] : [])],
            },
          ],
        },
        section("Scope of work"),
        ...(paragraphs(values, "scope").length > 0
          ? paragraphs(values, "scope")
          : [{ kind: "paragraph", text: "[Scope of work]" } as const]),
        ...(deliverables.length > 0 ? ([section("Deliverables"), { kind: "list", items: deliverables }] as const) : []),
        section("Timeline"),
        {
          kind: "terms",
          rows: [
            ["Start date", date(values, "startDate", "Start date")],
            ["Target delivery", date(values, "deliveryDate", "Target delivery")],
          ],
        },
        {
          kind: "paragraph",
          text: "Dates depend on the Client providing content, access and feedback on time; delays on either side move the dates accordingly.",
        },
        section("Fees & payment"),
        { kind: "terms", rows: [["Total fee", money(values, "fee", "Total fee", currency)]] },
        ...(schedule.length > 0 ? ([{ kind: "list", items: schedule }] as const) : []),
        {
          kind: "paragraph",
          text: "Invoices are payable within fourteen (14) days. Fees exclude taxes, which are added where applicable. Work outside the agreed scope is quoted separately and starts only on written approval.",
        },
        section("Acceptance"),
        {
          kind: "paragraph",
          text: "The Client reviews each deliverable within ten (10) working days and either accepts it or lists the defects in writing. A deliverable not rejected in writing within that time is deemed accepted.",
        },
        section("Source code & IP ownership"),
        {
          kind: "paragraph",
          text: "On full payment, ownership of the custom work produced for the Client passes to the Client. The Provider keeps ownership of its pre-existing tools, libraries and know-how, and grants the Client a perpetual licence to use them as part of the deliverables. Third-party and open-source components remain under their own licences.",
        },
        section("Warranty & support"),
        {
          kind: "paragraph",
          text: `The Provider corrects defects reported within ${text(values, "warranty", "Warranty period")} at no cost. Hosting, maintenance and new features are covered by a separate support agreement.`,
        },
        section("Confidentiality"),
        {
          kind: "paragraph",
          text: "Each party keeps the other's confidential information confidential. The Provider processes any personal data only on the Client's instructions and for the purpose of this agreement.",
        },
        section("Termination"),
        {
          kind: "paragraph",
          text: "Either party may terminate on thirty (30) days' written notice; the Client pays for work performed up to termination. Each party's total liability is limited to the fees paid under this agreement, except for fraud or wilful misconduct.",
        },
        section("Governing law"),
        { kind: "paragraph", text: `This agreement is governed by ${text(values, "governingLaw", "Governing law")}.` },
        {
          kind: "signatures",
          parties: [
            { role: "Client signature", name: optional(values, "clientSignatory") ?? "" },
            { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
          ],
        },
      ],
    };
  },
};

const proposal: DocumentTemplate = {
  key: "project_proposal",
  name: "Project proposal",
  category: "Clients & legal",
  documentType: "project_brief",
  summary: "A proposal for a client: the problem, the approach, phases, timeline and investment.",
  fields: [
    common.reference("MAL/PROP"),
    common.date,
    {
      name: "clientName",
      label: "Prepared for",
      type: "text",
      required: true,
      default: (context) => context.project?.clientName ?? "",
    },
    {
      name: "projectName",
      label: "Project",
      type: "text",
      required: true,
      default: (context) => context.project?.name ?? "",
    },
    { name: "background", label: "The problem / background", type: "textarea", wide: true, required: true },
    { name: "approach", label: "Our approach", type: "textarea", wide: true },
    {
      name: "phases",
      label: "Phases (one per line)",
      type: "textarea",
      wide: true,
      default: () => "Discovery and design\nBuild\nTesting and launch\nSupport",
    },
    { name: "timeline", label: "Timeline", type: "text", placeholder: "e.g. 10 weeks from signing" },
    common.currency,
    { name: "items", label: "Investment", type: "items" },
    { name: "validUntil", label: "Valid until", type: "date" },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const phases = lines(values, "phases");
    const lineItems = items(values, "items");
    return {
      title: "Project Proposal",
      subtitle: `${text(values, "projectName", "Project")} — prepared for ${text(values, "clientName", "Client")}`,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        { kind: "heading", text: "1. Background" },
        ...paragraphs(values, "background"),
        ...(optional(values, "approach")
          ? ([{ kind: "heading", text: "2. Our approach" }, ...paragraphs(values, "approach")] as const)
          : []),
        ...(phases.length > 0
          ? ([
              { kind: "heading", text: "Phases" },
              { kind: "list", items: phases, ordered: true },
            ] as const)
          : []),
        ...(optional(values, "timeline")
          ? ([{ kind: "facts", rows: [["Timeline", optional(values, "timeline")!]] }] as const)
          : []),
        ...(lineItems.length > 0
          ? ([
              { kind: "heading", text: "Investment" },
              {
                kind: "items",
                currency: text(values, "currency", "Currency"),
                items: lineItems,
                taxRate: 0,
                taxLabel: "",
              },
            ] as const)
          : []),
        {
          kind: "paragraph",
          text: `This proposal is valid until ${date(values, "validUntil", "Valid until")}. On acceptance, ${company(context)} will prepare a services agreement setting out the full terms.`,
        },
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
          ],
        },
      ],
    };
  },
};

function billing(kind: "invoice" | "quotation"): DocumentTemplate {
  const invoice = kind === "invoice";
  return {
    key: kind,
    name: invoice ? "Invoice" : "Quotation",
    category: "Finance",
    documentType: "other",
    summary: invoice
      ? "Bill a client: line items, tax, total and how to pay."
      : "Price work before it starts: line items, tax and validity.",
    fields: [
      {
        name: "reference",
        label: invoice ? "Invoice number" : "Quotation number",
        type: "text",
        default: ref(invoice ? "INV" : "QT"),
      },
      common.date,
      {
        name: "clientName",
        label: "Bill to",
        type: "text",
        required: true,
        default: (context) => context.project?.clientName ?? "",
      },
      { name: "clientAddress", label: "Client's address", type: "textarea" },
      { name: "projectName", label: "Project", type: "text", default: (context) => context.project?.name ?? "" },
      common.currency,
      { name: "items", label: "Line items", type: "items" },
      {
        name: "taxRate",
        label: "Tax rate (%)",
        type: "number",
        default: () => "18",
        hint: "18 for VAT in Rwanda; 0 if not registered",
      },
      invoice
        ? { name: "dueDate", label: "Payment due", type: "date" }
        : { name: "validUntil", label: "Valid until", type: "date" },
      {
        name: "payment",
        label: "Payment details",
        type: "textarea",
        wide: true,
        placeholder: "Bank name, account name, account number, SWIFT\nMobile money number",
      },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    build(values) {
      const lineItems = items(values, "items");
      const currency = text(values, "currency", "Currency");
      const taxRate = Number(optional(values, "taxRate") ?? 0) || 0;
      const totals = itemTotals(lineItems, taxRate);
      return {
        title: invoice ? "Invoice" : "Quotation",
        reference: optional(values, "reference") ?? undefined,
        date: date(values, "date", "Date"),
        recipient: [text(values, "clientName", "Client"), ...(optional(values, "clientAddress")?.split("\n") ?? [])],
        blocks: [
          {
            kind: "facts",
            rows: [
              ...(optional(values, "projectName") ? ([["Project", optional(values, "projectName")!]] as const) : []),
              invoice
                ? (["Payment due", date(values, "dueDate", "Payment due")] as const)
                : (["Valid until", date(values, "validUntil", "Valid until")] as const),
              [invoice ? "Amount due" : "Total", formatMoney(totals.total, currency)],
            ],
          },
          { kind: "items", currency, items: lineItems, taxRate, taxLabel: taxRate > 0 ? `VAT (${taxRate}%)` : "" },
          ...(optional(values, "payment")
            ? ([
                { kind: "heading", text: "Payment details" },
                { kind: "list", items: lines(values, "payment") },
              ] as const)
            : []),
          ...paragraphs(values, "notes"),
          {
            kind: "note",
            text: invoice
              ? "Thank you for your business."
              : "Prices are valid until the date above. Work starts on written acceptance of this quotation.",
          },
        ],
      };
    },
  };
}

const minutes: DocumentTemplate = {
  key: "meeting_minutes",
  name: "Meeting minutes",
  category: "Projects",
  documentType: "meeting_notes",
  summary: "Who attended, what was discussed and decided, and the actions with owners.",
  fields: [
    common.date,
    {
      name: "meetingTitle",
      label: "Meeting",
      type: "text",
      required: true,
      default: (context) => (context.project ? `${context.project.name} — progress meeting` : ""),
    },
    { name: "location", label: "Where", type: "text", placeholder: "Office / Google Meet" },
    { name: "attendees", label: "Attendees (one per line)", type: "textarea", required: true },
    { name: "agenda", label: "Agenda (one per line)", type: "textarea" },
    { name: "discussion", label: "Discussion", type: "textarea", wide: true },
    { name: "decisions", label: "Decisions (one per line)", type: "textarea", wide: true },
    { name: "actions", label: "Actions (one per line: what — who — by when)", type: "textarea", wide: true },
    { name: "nextMeeting", label: "Next meeting", type: "text" },
    { name: "minutedBy", label: "Minutes taken by", type: "text" },
  ],
  build(values) {
    const section = (title: string, name: string, ordered = false): Block[] => {
      const list = lines(values, name);
      return list.length > 0
        ? [
            { kind: "heading", text: title },
            { kind: "list", items: list, ordered },
          ]
        : [];
    };
    return {
      title: "Minutes of Meeting",
      subtitle: text(values, "meetingTitle", "Meeting"),
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Date", date(values, "date", "Date")],
            ...(optional(values, "location") ? ([["Where", optional(values, "location")!]] as const) : []),
            ...(optional(values, "minutedBy") ? ([["Minutes by", optional(values, "minutedBy")!]] as const) : []),
          ],
        },
        ...section("Attendees", "attendees"),
        ...section("Agenda", "agenda", true),
        ...(optional(values, "discussion")
          ? ([{ kind: "heading", text: "Discussion" }, ...paragraphs(values, "discussion")] as const)
          : []),
        ...section("Decisions", "decisions", true),
        ...section("Actions", "actions", true),
        ...(optional(values, "nextMeeting")
          ? ([{ kind: "note", text: `Next meeting: ${optional(values, "nextMeeting")}` }] as const)
          : []),
      ],
    };
  },
};

const handover: DocumentTemplate = {
  key: "handover_certificate",
  name: "Completion & handover certificate",
  category: "Projects",
  documentType: "final_report",
  summary: "Confirms a project was delivered and accepted, and what was handed over.",
  fields: [
    common.reference("MAL/PRJ"),
    common.date,
    {
      name: "clientName",
      label: "Client",
      type: "text",
      required: true,
      default: (context) => context.project?.clientName ?? "",
    },
    {
      name: "projectName",
      label: "Project",
      type: "text",
      required: true,
      default: (context) => context.project?.name ?? "",
    },
    { name: "deliverables", label: "Delivered (one per line)", type: "textarea", wide: true, required: true },
    {
      name: "handedOver",
      label: "Handed over (one per line)",
      type: "textarea",
      wide: true,
      default: () => "Source code repository access\nProduction credentials\nAdministrator guide",
    },
    { name: "warrantyEnds", label: "Warranty ends", type: "date" },
    { name: "remarks", label: "Remarks", type: "textarea", wide: true },
    common.signatory,
    common.signatoryTitle,
    { name: "clientSignatory", label: "Accepted for the client by", type: "text" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    return {
      title: "Project Completion and Handover Certificate",
      subtitle: text(values, "projectName", "Project"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "paragraph",
          text: `${company(context)} confirms that the ${text(values, "projectName", "Project")} project for ${client} has been completed, and ${client} confirms that the deliverables below have been received and accepted.`,
        },
        { kind: "heading", text: "Delivered" },
        {
          kind: "list",
          items: lines(values, "deliverables").length > 0 ? lines(values, "deliverables") : ["[Deliverables]"],
        },
        ...(lines(values, "handedOver").length > 0
          ? ([
              { kind: "heading", text: "Handed over" },
              { kind: "list", items: lines(values, "handedOver") },
            ] as const)
          : []),
        ...(optional(values, "warrantyEnds")
          ? ([
              {
                kind: "paragraph",
                text: `Defects reported before ${date(values, "warrantyEnds", "Warranty ends")} will be corrected under the warranty in the services agreement.`,
              },
            ] as const)
          : []),
        ...paragraphs(values, "remarks"),
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: `Accepted for ${client}`, name: optional(values, "clientSignatory") ?? "" },
          ],
        },
      ],
    };
  },
};

const letter: DocumentTemplate = {
  key: "business_letter",
  name: "Business letter",
  category: "Clients & legal",
  documentType: "other",
  summary: "A plain letter on company letterhead, for anything the other templates do not cover.",
  fields: [
    common.reference("MAL/GEN"),
    common.date,
    { name: "recipient", label: "To (name and address, one per line)", type: "textarea", required: true },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "salutation", label: "Salutation", type: "text", default: () => "Dear Sir or Madam," },
    {
      name: "body",
      label: "Letter",
      type: "textarea",
      wide: true,
      required: true,
      hint: "Leave a blank line between paragraphs.",
    },
    { name: "closing", label: "Closing", type: "text", default: () => "Yours faithfully," },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    return {
      title: text(values, "subject", "Subject"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: lines(values, "recipient").length > 0 ? lines(values, "recipient") : ["[Recipient]"],
      blocks: [
        { kind: "paragraph", text: text(values, "salutation", "Salutation") },
        ...(paragraphs(values, "body").length > 0
          ? paragraphs(values, "body")
          : [{ kind: "paragraph", text: "[Letter]" } as const]),
        { kind: "paragraph", text: text(values, "closing", "Closing") },
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
          ],
        },
      ],
    };
  },
};

export const TEMPLATES: readonly DocumentTemplate[] = [
  offerLetter,
  employmentContract,
  internshipAgreement,
  employmentCertificate,
  serviceAgreement,
  proposal,
  nda,
  letter,
  billing("quotation"),
  billing("invoice"),
  minutes,
  handover,
];

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  "HR & recruitment",
  "Clients & legal",
  "Finance",
  "Projects",
];

export function findTemplate(key: string | null | undefined): DocumentTemplate | null {
  return TEMPLATES.find((template) => template.key === key) ?? null;
}

/** Starting values for a template: each field's default, evaluated once. */
export function initialValues(template: DocumentTemplate, context: TemplateContext): Values {
  const values: Values = {};
  for (const field of template.fields) {
    if (field.type === "items") values[field.name] = [{ description: "", quantity: 1, unitPrice: 0 }];
    else values[field.name] = field.default ? field.default(context) : "";
  }
  return values;
}

/** Required fields still empty, by label, so the form can say what is missing. */
export function missingFields(template: DocumentTemplate, values: Values): string[] {
  return template.fields
    .filter((field) => field.required)
    .filter((field) => {
      const value = values[field.name];
      if (Array.isArray(value)) return value.every((item) => item.description.trim() === "");
      return typeof value !== "string" || value.trim() === "";
    })
    .map((field) => field.label);
}

/**
 * Values from the database are untrusted JSON: keep only the fields the
 * template declares, with the right shape, so a stored document can never
 * inject anything the form could not have produced.
 */
export function sanitiseValues(template: DocumentTemplate, raw: unknown): Values {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const values: Values = {};
  for (const field of template.fields) {
    const value = source[field.name];
    if (field.type === "items") {
      values[field.name] = Array.isArray(value)
        ? value.slice(0, 50).map((item) => {
            const row = (item ?? {}) as Record<string, unknown>;
            return {
              description: String(row.description ?? "").slice(0, 300),
              quantity: Number(row.quantity) || 0,
              unitPrice: Number(row.unitPrice) || 0,
            };
          })
        : [];
    } else values[field.name] = typeof value === "string" ? value.slice(0, 5000) : "";
  }
  return values;
}
