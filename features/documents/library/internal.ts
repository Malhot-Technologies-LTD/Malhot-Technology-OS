import type { Block } from "../content";
import {
  agreementDate,
  agreementDateField,
  ceoField,
  common,
  company,
  date,
  lines,
  optional,
  paragraphs,
  sections,
  table,
  tableRows,
  text,
  today,
  type DocumentTemplate,
  type Values,
} from "../template-kit";

/** Internal templates. The originals in this category live in ../templates.ts. */

/** Paragraphs from a textarea, or a single gap paragraph. */
function paragraphsOrGap(values: Values, name: string, label: string): Block[] {
  const blocks = paragraphs(values, name);
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: `[${label}]` }];
}

/** A list from a textarea, or a single gap naming what to fill in. */
function listOrGap(values: Values, name: string, label: string): Block {
  const list = lines(values, name);
  return { kind: "list", items: list.length > 0 ? list : [`[${label}]`] };
}

/** Ends a clause with a full stop unless it already has closing punctuation. */
function sentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

const memo: DocumentTemplate = {
  key: "internal_memo",
  name: "Internal memo",
  category: "Internal",
  documentType: "other",
  summary: "A memo to staff or a team: who it is for, the subject, the message and any action required.",
  fields: [
    common.reference("MAL/MEMO"),
    common.date,
    { name: "to", label: "To", type: "text", required: true, placeholder: "e.g. All staff, Engineering team" },
    { name: "from", label: "From", type: "text", required: true },
    { name: "cc", label: "CC (optional)", type: "text" },
    { name: "subject", label: "Subject", type: "text", required: true },
    {
      name: "body",
      label: "Message",
      type: "textarea",
      wide: true,
      required: true,
      hint: "Leave a blank line between paragraphs.",
    },
    { name: "action", label: "Action required (optional, one per line)", type: "textarea", wide: true },
    { name: "actionBy", label: "Action by (optional)", type: "date" },
  ],
  build(values) {
    const cc = optional(values, "cc");
    const action = lines(values, "action");
    const actionBy = optional(values, "actionBy");
    return {
      title: "Memorandum",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Internal",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["To", text(values, "to", "To")],
            ["From", text(values, "from", "From")],
            ...(cc ? ([["CC", cc]] as const) : []),
            ["Date", date(values, "date", "Date")],
            ["Subject", text(values, "subject", "Subject")],
          ],
        },
        ...paragraphsOrGap(values, "body", "Message"),
        ...(action.length > 0
          ? ([
              { kind: "heading", text: "Action required" },
              { kind: "list", items: action },
            ] as const)
          : []),
        ...(actionBy ? ([{ kind: "note", text: `Please act by ${date(values, "actionBy", "Date")}.` }] as const) : []),
      ],
    };
  },
};

const authorizationLetter: DocumentTemplate = {
  key: "authorization_letter",
  name: "Letter of authorisation",
  category: "Internal",
  documentType: "other",
  summary: "Authorises a named person to act for the company for a stated purpose, within limits and for a set period.",
  legal: true,
  fields: [
    common.reference("MAL/AUTH"),
    common.date,
    {
      name: "recipient",
      label: "Addressed to (one per line)",
      type: "textarea",
      default: () => "To whom it may concern",
    },
    { name: "authorisedName", label: "Authorised person's full name", type: "text", required: true },
    { name: "idNumber", label: "National ID / passport number", type: "text", required: true },
    { name: "authorisedPosition", label: "Their position (optional)", type: "text" },
    {
      name: "purpose",
      label: "Authorised to",
      type: "textarea",
      wide: true,
      required: true,
      placeholder: "e.g. collect the company's registration documents from RDB",
      hint: 'Completes "…is authorised to act on behalf of the company to ___".',
    },
    {
      name: "limits",
      label: "Scope and limits (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "This authority does not extend to signing contracts or making payments on behalf of the company\nThis authority cannot be delegated to another person",
    },
    { name: "validFrom", label: "Valid from", type: "date", default: today },
    { name: "validUntil", label: "Valid until", type: "date", required: true },
    ceoField,
  ],
  build(values, context) {
    const employer = company(context);
    const person = text(values, "authorisedName", "Authorised person's full name");
    const position = optional(values, "authorisedPosition");
    const recipient = lines(values, "recipient");
    return {
      title: "Letter of Authorisation",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: recipient.length > 0 ? recipient : undefined,
      blocks: [
        {
          kind: "paragraph",
          text: `${employer} hereby authorises ${person}${position ? `, ${position},` : ""} holder of national ID / passport number ${text(values, "idNumber", "ID / passport number")}, to act on its behalf to ${sentence(text(values, "purpose", "Purpose"))}`,
        },
        {
          kind: "terms",
          rows: [
            ["Valid From", date(values, "validFrom", "Valid from")],
            ["Valid Until", date(values, "validUntil", "Valid until")],
          ],
        },
        ...(lines(values, "limits").length > 0
          ? ([
              { kind: "heading", text: "Scope and limits" },
              { kind: "list", items: lines(values, "limits") },
            ] as const)
          : []),
        {
          kind: "paragraph",
          text: `This authority applies only to the purpose above and ends on the date stated, or earlier if withdrawn by ${employer} in writing. The authorised person should present this letter together with their identity document. Please contact us to verify this authorisation.`,
        },
        {
          kind: "signatures",
          parties: [
            { role: `For ${employer} — CEO signature`, name: text(values, "signatoryName", "CEO") },
            { role: "Specimen signature of the authorised person", name: person },
          ],
        },
      ],
    };
  },
};

const assetHandover: DocumentTemplate = {
  key: "asset_handover_form",
  name: "Asset handover form",
  category: "Internal",
  documentType: "other",
  summary:
    "Records the company equipment issued to someone, its condition, and their duty to look after and return it.",
  fields: [
    common.reference("MAL/AST"),
    common.date,
    { name: "employeeName", label: "Received by (full name)", type: "text", required: true },
    { name: "position", label: "Position", type: "text" },
    {
      name: "assets",
      label: "Assets (one per line: Asset | Serial / tag | Condition | Date issued)",
      type: "textarea",
      wide: true,
      required: true,
      placeholder: "Laptop, Dell Latitude 5440 | SN 8XK21 / MAL-IT-014 | Good | 2026-10-01",
    },
    {
      name: "responsibilities",
      label: "Responsibilities (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        [
          "Use the assets for company work and keep them in good condition",
          "Keep them secure: lock screens, use a password, and never leave them unattended in public",
          "Report loss, theft or damage to the company immediately",
          "Do not lend the assets to anyone or install unauthorised software",
          "Return all assets, with chargers and accessories, on request or when leaving the company",
        ].join("\n"),
    },
    { name: "issuedBy", label: "Issued by", type: "text", required: true },
  ],
  build(values, context) {
    const person = text(values, "employeeName", "Received by");
    const position = optional(values, "position");
    const responsibilities = lines(values, "responsibilities");
    return {
      title: "Asset Handover Form",
      subtitle: person,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Received by", person],
            ...(position ? ([["Position", position]] as const) : []),
            ["Issued by", text(values, "issuedBy", "Issued by")],
            ["Date", date(values, "date", "Date")],
          ],
        },
        { kind: "heading", text: "Assets issued" },
        table(["Asset", "Serial / tag", "Condition", "Date issued"], tableRows(values, "assets", 4), "Assets"),
        ...(responsibilities.length > 0
          ? ([
              { kind: "heading", text: "Care and return" },
              { kind: "paragraph", text: "The person receiving the assets agrees to:" },
              { kind: "list", items: responsibilities },
            ] as const)
          : []),
        {
          kind: "paragraph",
          text: `The assets remain the property of ${company(context)}. By signing, the person receiving them confirms they received the assets listed above in the condition stated.`,
        },
        {
          kind: "signatures",
          parties: [
            { role: "Issued by", name: text(values, "issuedBy", "Issued by") },
            { role: "Received by", name: person },
          ],
        },
      ],
    };
  },
};

const CAPACITIES = ["Employee", "Contractor", "Consultant", "Intern"] as const;

const confidentialityUndertaking: DocumentTemplate = {
  key: "confidentiality_undertaking",
  name: "Confidentiality undertaking",
  category: "Internal",
  documentType: "other",
  summary: "A one-way promise by an employee or contractor to keep company and client information confidential.",
  legal: true,
  fields: [
    agreementDateField,
    { name: "employeeName", label: "Full name", type: "text", required: true },
    { name: "position", label: "Position / engagement", type: "text", required: true },
    { name: "capacity", label: "Engaged as", type: "select", options: CAPACITIES, default: () => CAPACITIES[0] },
    { name: "idNumber", label: "National ID / passport number (optional)", type: "text" },
    {
      name: "scope",
      label: "Confidential information includes (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        [
          "Source code, software, system designs and technical documentation",
          "Credentials, API keys, passwords and infrastructure details",
          "Client information, client data and contracts",
          "Personal data of clients, users and staff",
          "Business plans, pricing, finances and strategies",
          "Any other non-public information about the company or its clients",
        ].join("\n"),
    },
    {
      name: "duration",
      label: "Obligations last",
      type: "text",
      default: () => "during the engagement and for three (3) years after it ends",
      hint: "Trade secrets and personal data stay protected for as long as they remain confidential.",
    },
    { name: "governingLaw", label: "Governing law", type: "text", default: () => "the laws of Rwanda" },
    ceoField,
    { name: "reference", label: "Reference (optional)", type: "text" },
  ],
  build(values, context) {
    const employer = company(context);
    const person = text(values, "employeeName", "Full name");
    const capacity = optional(values, "capacity") ?? CAPACITIES[0];
    const idNumber = optional(values, "idNumber");
    const section = sections();
    return {
      layout: "contract",
      title: "Confidentiality Undertaking",
      subtitle: `${capacity} — ${text(values, "position", "Position / engagement")}`,
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Confidentiality Undertaking ("Undertaking") is given by the Recipient in favour of the Company:',
          parties: [
            { role: "Company", lines: [employer, context.letterhead.address].filter(Boolean) },
            {
              role: "Recipient",
              lines: [
                person,
                `${capacity}: ${text(values, "position", "Position / engagement")}`,
                ...(idNumber ? [`ID / passport: ${idNumber}`] : []),
              ],
            },
          ],
        },
        section("Undertaking"),
        {
          kind: "paragraph",
          text: `In return for being engaged by, and given access to information of, ${employer}, the Recipient undertakes to keep all Confidential Information strictly confidential, to use it only to perform their work for ${employer}, and not to disclose it to anyone except colleagues who need it for that work.`,
        },
        section("Confidential information"),
        { kind: "paragraph", text: "Confidential Information includes, in any form:" },
        listOrGap(values, "scope", "Confidential information"),
        section("Care of information"),
        {
          kind: "list",
          items: [
            "Keep information and credentials secure, and use only company-approved accounts, devices and storage",
            "Do not copy company or client data to personal devices or accounts",
            `Report any actual or suspected leak, loss or unauthorised access to ${employer} immediately`,
          ],
        },
        section("Exceptions"),
        {
          kind: "paragraph",
          text: "This Undertaking does not cover information that is or becomes public through no fault of the Recipient, that the Recipient lawfully knew before receiving it, or that the Recipient must disclose by law or court order, provided the Company is told promptly, where lawful, so it can respond.",
        },
        section("Return of materials"),
        {
          kind: "paragraph",
          text: `When the engagement ends, or earlier on request, the Recipient returns or permanently deletes all Confidential Information and company materials in their possession, including copies, and confirms this in writing to ${employer}.`,
        },
        section("Duration"),
        {
          kind: "paragraph",
          text: `These obligations apply ${text(values, "duration", "Duration")}. Trade secrets and personal data remain protected for as long as they are confidential.`,
        },
        section("Governing law"),
        {
          kind: "paragraph",
          text: `This Undertaking is governed by ${text(values, "governingLaw", "Governing law")}.`,
        },
        {
          kind: "signatures",
          parties: [
            { role: "Recipient signature", name: person },
            { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
          ],
        },
      ],
    };
  },
};

export const INTERNAL_TEMPLATES: readonly DocumentTemplate[] = [
  memo,
  authorizationLetter,
  assetHandover,
  confidentialityUndertaking,
];
