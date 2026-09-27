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

const offerLetter: DocumentTemplate = {
  key: "offer_letter",
  name: "Offer of employment",
  category: "HR & recruitment",
  documentType: "other",
  summary: "A formal job offer: role, start date, pay, probation and how to accept.",
  fields: [
    common.reference("MAL/HR"),
    common.date,
    { name: "candidateName", label: "Candidate's full name", type: "text", required: true },
    { name: "candidateAddress", label: "Candidate's address", type: "textarea", placeholder: "Street, district, city" },
    { name: "position", label: "Position", type: "text", required: true, placeholder: "e.g. Frontend Developer" },
    { name: "department", label: "Department / team", type: "text" },
    { name: "reportsTo", label: "Reports to", type: "text" },
    { name: "startDate", label: "Start date", type: "date", required: true },
    {
      name: "employmentType",
      label: "Employment type",
      type: "select",
      options: ["Full-time, permanent", "Full-time, fixed term", "Part-time", "Contract"],
      default: () => "Full-time, permanent",
    },
    { name: "location", label: "Place of work", type: "text", default: () => "Kigali, Rwanda" },
    common.currency,
    { name: "salary", label: "Gross monthly salary", type: "number", required: true },
    { name: "probation", label: "Probation period", type: "text", default: () => "three (3) months" },
    {
      name: "benefits",
      label: "Benefits (one per line)",
      type: "textarea",
      placeholder: "Health insurance\nLaptop\nAnnual leave of 18 working days",
    },
    { name: "acceptBy", label: "Accept by", type: "date" },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const name = text(values, "candidateName", "Candidate's full name");
    const benefits = lines(values, "benefits");
    return {
      title: "Offer of Employment",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [name, ...(optional(values, "candidateAddress")?.split("\n") ?? [])],
      classification: "Private and confidential",
      blocks: [
        { kind: "paragraph", text: `Dear ${name.split(" ")[0]},` },
        {
          kind: "paragraph",
          text: `Following our recent conversations, we are delighted to offer you the position of ${text(values, "position", "Position")} at ${company(context)}. This letter sets out the main terms of the offer.`,
        },
        {
          kind: "facts",
          rows: [
            ["Position", text(values, "position", "Position")],
            ...(optional(values, "department") ? ([["Department", optional(values, "department")!]] as const) : []),
            ...(optional(values, "reportsTo") ? ([["Reports to", optional(values, "reportsTo")!]] as const) : []),
            ["Employment type", text(values, "employmentType", "Employment type")],
            ["Start date", date(values, "startDate", "Start date")],
            ["Place of work", text(values, "location", "Place of work")],
            ["Gross monthly salary", money(values, "salary", "Gross monthly salary", currency)],
            ["Probation period", text(values, "probation", "Probation period")],
          ],
        },
        {
          kind: "paragraph",
          text: "Your salary will be paid monthly, subject to the deductions required by law, including income tax and social security contributions. The detailed terms of your employment will be set out in a written employment contract, which you will receive before your start date.",
        },
        ...(benefits.length > 0
          ? ([
              { kind: "heading", text: "Benefits" },
              { kind: "list", items: benefits },
            ] as const)
          : []),
        {
          kind: "paragraph",
          text: `This offer is conditional on satisfactory references and on your providing proof of identity and of your right to work in Rwanda. To accept, please sign and return a copy of this letter${optional(values, "acceptBy") ? ` by ${date(values, "acceptBy", "Accept by")}` : ""}.`,
        },
        { kind: "paragraph", text: `We look forward to welcoming you to ${company(context)}.` },
        { kind: "paragraph", text: "Yours sincerely," },
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: "Accepted by the candidate", name },
          ],
        },
      ],
    };
  },
};

const employmentContract: DocumentTemplate = {
  key: "employment_contract",
  name: "Employment contract",
  category: "HR & recruitment",
  documentType: "other",
  summary: "The full contract: duties, pay, hours, leave, confidentiality, IP and termination.",
  legal: true,
  fields: [
    common.reference("MAL/HR"),
    common.date,
    { name: "employeeName", label: "Employee's full name", type: "text", required: true },
    { name: "employeeId", label: "National ID / passport no.", type: "text" },
    { name: "employeeAddress", label: "Employee's address", type: "text" },
    { name: "position", label: "Job title", type: "text", required: true },
    {
      name: "duties",
      label: "Main duties (one per line)",
      type: "textarea",
      wide: true,
      placeholder:
        "Build and maintain client web applications\nReview teammates' code\nEstimate and report on assigned work",
    },
    { name: "startDate", label: "Start date", type: "date", required: true },
    {
      name: "term",
      label: "Term",
      type: "select",
      options: ["Indefinite duration", "Fixed term"],
      default: () => "Indefinite duration",
    },
    { name: "endDate", label: "End date (fixed term only)", type: "date" },
    { name: "location", label: "Place of work", type: "text", default: () => "Kigali, Rwanda" },
    {
      name: "hours",
      label: "Working hours",
      type: "text",
      default: () => "40 hours per week, Monday to Friday, 08:00 to 17:00",
    },
    common.currency,
    { name: "salary", label: "Gross monthly salary", type: "number", required: true },
    { name: "payDay", label: "Pay day", type: "text", default: () => "the last working day of each month" },
    { name: "probation", label: "Probation period", type: "text", default: () => "three (3) months" },
    { name: "leave", label: "Annual leave", type: "text", default: () => "eighteen (18) working days per year" },
    { name: "notice", label: "Notice period", type: "text", default: () => "thirty (30) days" },
    common.governingLaw,
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const employee = text(values, "employeeName", "Employee's full name");
    const employer = company(context);
    const fixed = optional(values, "term") === "Fixed term";
    const duties = lines(values, "duties");
    let clause = 0;
    const heading = (title: string): Block => ({ kind: "heading", text: `${++clause}. ${title}` });
    return {
      title: "Employment Contract",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "paragraph",
          text: `This Employment Contract is made between ${employer}${context.letterhead.address ? `, of ${context.letterhead.address}` : ""} (the "Employer"), and ${employee}${optional(values, "employeeId") ? `, holder of identification number ${optional(values, "employeeId")}` : ""}${optional(values, "employeeAddress") ? `, of ${optional(values, "employeeAddress")}` : ""} (the "Employee").`,
        },
        heading("Position and duties"),
        {
          kind: "paragraph",
          text: `The Employer employs the Employee as ${text(values, "position", "Job title")}. The Employee shall perform the duties of the position diligently and to the best of their ability, and any other reasonable duties the Employer assigns in line with their skills.`,
        },
        ...(duties.length > 0 ? ([{ kind: "list", items: duties }] as const) : []),
        heading("Commencement and term"),
        {
          kind: "paragraph",
          text: fixed
            ? `Employment begins on ${date(values, "startDate", "Start date")} and ends on ${date(values, "endDate", "End date")}, unless terminated earlier in accordance with this contract.`
            : `Employment begins on ${date(values, "startDate", "Start date")} and continues for an indefinite duration until terminated in accordance with this contract.`,
        },
        {
          kind: "paragraph",
          text: `The first ${text(values, "probation", "Probation period")} are a probationary period, during which either party may end the contract with the shorter notice permitted by law.`,
        },
        heading("Place and hours of work"),
        {
          kind: "paragraph",
          text: `The Employee will work at ${text(values, "location", "Place of work")}, or remotely where agreed. Normal working hours are ${text(values, "hours", "Working hours")}.`,
        },
        heading("Remuneration"),
        {
          kind: "paragraph",
          text: `The Employer shall pay the Employee a gross monthly salary of ${money(values, "salary", "Gross monthly salary", currency)}, payable on ${text(values, "payDay", "Pay day")} by bank transfer. The Employer shall deduct income tax, social security contributions and any other deductions required by law.`,
        },
        heading("Leave"),
        {
          kind: "paragraph",
          text: `The Employee is entitled to ${text(values, "leave", "Annual leave")} of paid annual leave, public holidays, and sick, maternity and other leave as provided by the applicable labour law. Leave dates are agreed with the Employer in advance.`,
        },
        heading("Confidentiality"),
        {
          kind: "paragraph",
          text: "During and after employment, the Employee shall not disclose any confidential information of the Employer or its clients, including source code, designs, business plans, client data and credentials, except as required to perform their duties or by law.",
        },
        heading("Intellectual property"),
        {
          kind: "paragraph",
          text: "All work produced by the Employee in the course of employment, including software, designs and documentation, belongs to the Employer. The Employee assigns to the Employer any rights in such work to the extent permitted by law.",
        },
        heading("Termination"),
        {
          kind: "paragraph",
          text: `After probation, either party may terminate this contract by giving ${text(values, "notice", "Notice period")} written notice, or payment in lieu of notice, subject to the applicable labour law. The Employer may terminate without notice for serious misconduct as defined by law.`,
        },
        {
          kind: "paragraph",
          text: "On leaving, the Employee shall return all property of the Employer, including equipment, documents and access credentials.",
        },
        heading("Governing law"),
        {
          kind: "paragraph",
          text: `This contract is governed by ${text(values, "governingLaw", "Governing law")}. Matters not covered here are governed by the applicable labour law and the Employer's internal rules.`,
        },
        { kind: "paragraph", text: "Signed in two original copies, one for each party." },
        {
          kind: "signatures",
          parties: [
            {
              role: "For the Employer",
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: "The Employee", name: employee },
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
  summary: "Placement dates, supervisor, learning goals, stipend and conduct for an intern.",
  legal: true,
  fields: [
    common.reference("MAL/HR"),
    common.date,
    { name: "internName", label: "Intern's full name", type: "text", required: true },
    { name: "institution", label: "School / university", type: "text" },
    {
      name: "role",
      label: "Internship role",
      type: "text",
      required: true,
      placeholder: "e.g. Software Engineering Intern",
    },
    { name: "supervisor", label: "Supervisor", type: "text", required: true },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "endDate", label: "End date", type: "date", required: true },
    { name: "objectives", label: "Learning objectives (one per line)", type: "textarea", wide: true },
    common.currency,
    { name: "stipend", label: "Monthly stipend (leave empty if unpaid)", type: "number" },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const intern = text(values, "internName", "Intern's full name");
    const objectives = lines(values, "objectives");
    const stipend = optional(values, "stipend");
    return {
      title: "Internship Agreement",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "paragraph",
          text: `This agreement is between ${company(context)} (the "Company") and ${intern}${optional(values, "institution") ? `, a student of ${optional(values, "institution")}` : ""} (the "Intern").`,
        },
        {
          kind: "facts",
          rows: [
            ["Role", text(values, "role", "Internship role")],
            ["Supervisor", text(values, "supervisor", "Supervisor")],
            ["Period", `${date(values, "startDate", "Start date")} to ${date(values, "endDate", "End date")}`],
            [
              "Stipend",
              stipend
                ? `${money(values, "stipend", "Stipend", text(values, "currency", "Currency"))} per month`
                : "Unpaid",
            ],
          ],
        },
        { kind: "heading", text: "Purpose" },
        {
          kind: "paragraph",
          text: "The internship gives the Intern practical experience under supervision. It is a learning placement and does not create a contract of employment.",
        },
        ...(objectives.length > 0
          ? ([
              { kind: "heading", text: "Learning objectives" },
              { kind: "list", items: objectives },
            ] as const)
          : []),
        { kind: "heading", text: "Obligations" },
        {
          kind: "list",
          items: [
            "The Company provides supervision, a workspace, the equipment the work needs and regular feedback.",
            "The Intern follows the Company's working hours, instructions and policies, and reports absences in advance.",
            "The Intern keeps confidential all information about the Company and its clients, during and after the internship.",
            "Work produced during the internship belongs to the Company.",
          ],
        },
        { kind: "heading", text: "Ending the internship" },
        {
          kind: "paragraph",
          text: "Either party may end the internship early with one week's written notice, or immediately for serious misconduct. On completion, the Company will provide a certificate of internship on request.",
        },
        {
          kind: "signatures",
          parties: [
            {
              role: "For the Company",
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: "The Intern", name: intern },
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
    common.reference("MAL/LEGAL"),
    common.date,
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
    common.governingLaw,
    common.signatory,
    common.signatoryTitle,
    { name: "partySignatory", label: "Signed for the other party by", type: "text" },
  ],
  build(values, context) {
    const party = text(values, "partyName", "Other party");
    return {
      title: "Mutual Non-Disclosure Agreement",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "paragraph",
          text: `This agreement is made between ${company(context)}${context.letterhead.address ? `, of ${context.letterhead.address}` : ""}, and ${party}${optional(values, "partyAddress") ? `, of ${optional(values, "partyAddress")}` : ""} (each a "Party").`,
        },
        { kind: "heading", text: "1. Purpose" },
        {
          kind: "paragraph",
          text: `The Parties wish to share confidential information for the following purpose: ${text(values, "purpose", "Purpose")}`,
        },
        { kind: "heading", text: "2. Confidential information" },
        {
          kind: "paragraph",
          text: "Confidential information means any non-public information disclosed by one Party to the other, in any form, including business plans, designs, source code, data, credentials and pricing. It does not include information that is public through no fault of the receiving Party, was already lawfully known to it, or is independently developed.",
        },
        { kind: "heading", text: "3. Obligations" },
        {
          kind: "list",
          items: [
            "Use confidential information only for the purpose above.",
            "Share it only with employees and advisers who need it and are bound by similar obligations.",
            "Protect it with at least the care used for one's own confidential information.",
            "Return or destroy it on written request.",
          ],
        },
        { kind: "heading", text: "4. Duration" },
        {
          kind: "paragraph",
          text: `These obligations continue for ${text(values, "years", "Years")} years from the date of this agreement.`,
        },
        { kind: "heading", text: "5. General" },
        {
          kind: "paragraph",
          text: `No licence or ownership is transferred by this agreement. It is governed by ${text(values, "governingLaw", "Governing law")}, and any dispute shall first be settled amicably before being referred to the competent courts.`,
        },
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: `For ${party}`, name: optional(values, "partySignatory") ?? "" },
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
    common.reference("MAL/CLIENT"),
    common.date,
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
    common.governingLaw,
    common.signatory,
    common.signatoryTitle,
    { name: "clientSignatory", label: "Signed for the client by", type: "text" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const currency = text(values, "currency", "Currency");
    const deliverables = lines(values, "deliverables");
    const schedule = lines(values, "schedule");
    return {
      title: "Software Development Services Agreement",
      subtitle: text(values, "projectName", "Project"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "paragraph",
          text: `This agreement is between ${company(context)} (the "Provider") and ${client}${optional(values, "clientAddress") ? `, of ${optional(values, "clientAddress")}` : ""} (the "Client").`,
        },
        { kind: "heading", text: "1. Scope of work" },
        ...paragraphs(values, "scope"),
        ...(deliverables.length > 0
          ? ([
              { kind: "heading", text: "2. Deliverables" },
              { kind: "list", items: deliverables },
            ] as const)
          : []),
        { kind: "heading", text: deliverables.length > 0 ? "3. Timeline" : "2. Timeline" },
        {
          kind: "paragraph",
          text: `Work starts on ${date(values, "startDate", "Start date")} with a target delivery of ${date(values, "deliveryDate", "Target delivery")}. Dates depend on the Client providing content, access and feedback on time; delays on either side move the dates accordingly.`,
        },
        { kind: "heading", text: "Fees and payment" },
        { kind: "facts", rows: [["Total fee", money(values, "fee", "Total fee", currency)]] },
        ...(schedule.length > 0 ? ([{ kind: "list", items: schedule }] as const) : []),
        {
          kind: "paragraph",
          text: "Invoices are payable within fourteen (14) days. Fees exclude taxes, which are added where applicable. Work outside the agreed scope is quoted separately and starts only on written approval.",
        },
        { kind: "heading", text: "Acceptance" },
        {
          kind: "paragraph",
          text: "The Client reviews each deliverable within ten (10) working days and either accepts it or lists the defects in writing. A deliverable not rejected in writing within that time is deemed accepted.",
        },
        { kind: "heading", text: "Intellectual property" },
        {
          kind: "paragraph",
          text: "On full payment, ownership of the custom work produced for the Client passes to the Client. The Provider keeps ownership of its pre-existing tools, libraries and know-how, and grants the Client a perpetual licence to use them as part of the deliverables. Third-party and open-source components remain under their own licences.",
        },
        { kind: "heading", text: "Warranty and support" },
        {
          kind: "paragraph",
          text: `The Provider corrects defects reported within ${text(values, "warranty", "Warranty period")} at no cost. Ongoing hosting, maintenance and new features are covered by a separate support agreement.`,
        },
        { kind: "heading", text: "Confidentiality and data" },
        {
          kind: "paragraph",
          text: "Each party keeps the other's confidential information confidential. The Provider processes any personal data only on the Client's instructions and for the purpose of this agreement.",
        },
        { kind: "heading", text: "Liability and termination" },
        {
          kind: "paragraph",
          text: "Each party's total liability under this agreement is limited to the fees paid under it, except for fraud or wilful misconduct. Either party may terminate on thirty (30) days' written notice; the Client pays for work performed up to termination.",
        },
        { kind: "heading", text: "Governing law" },
        { kind: "paragraph", text: `This agreement is governed by ${text(values, "governingLaw", "Governing law")}.` },
        {
          kind: "signatures",
          parties: [
            {
              role: "For the Provider",
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: "For the Client", name: optional(values, "clientSignatory") ?? "" },
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
