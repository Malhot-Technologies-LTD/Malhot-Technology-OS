import { formatMoney, longDate, type Block } from "../content";
import {
  agreementDate,
  agreementDateField,
  ceoField,
  common,
  company,
  date,
  lines,
  money,
  optional,
  paragraphs,
  sections,
  table,
  tableRows,
  text,
  today,
  type DocumentTemplate,
  type FieldDef,
  type TemplateContext,
  type Values,
} from "../template-kit";

/**
 * Contracts & Legal templates. The originals in this category (the services
 * agreement and the NDA) live in ../templates.ts.
 *
 * Every agreement follows the company's own format: "entered into between"
 * the parties, CAPS numbered sections, "Label: value" terms and a two-column
 * signature block. The wording is a professional starting point for a company
 * in Rwanda, not legal advice — the form carries a review reminder.
 */

// Shared fields ------------------------------------------------------------------

const clientField: FieldDef = {
  name: "clientName",
  label: "Client",
  type: "text",
  required: true,
  default: (context) => context.project?.clientName ?? "",
};

const clientAddressField: FieldDef = { name: "clientAddress", label: "Client's address", type: "text" };

const clientSignatoryField: FieldDef = { name: "clientSignatory", label: "Signed for the client by", type: "text" };

const projectField: FieldDef = {
  name: "projectName",
  label: "Project",
  type: "text",
  required: true,
  default: (context) => context.project?.name ?? "",
};

const governingLawField: FieldDef = {
  name: "governingLaw",
  label: "Governing law",
  type: "text",
  default: () => "the laws of Rwanda",
};

const DISPUTE_FORUMS = [
  "the competent courts of Rwanda",
  "arbitration at the Kigali International Arbitration Centre (KIAC) under its rules",
] as const;

const disputeField: FieldDef = {
  name: "disputeForum",
  label: "Disputes not settled amicably go to",
  type: "select",
  options: DISPUTE_FORUMS,
  default: () => DISPUTE_FORUMS[0],
};

const referenceField: FieldDef = { name: "reference", label: "Reference (optional)", type: "text" };

const paymentDaysField: FieldDef = {
  name: "paymentDays",
  label: "Invoices payable within (days)",
  type: "number",
  default: () => "14",
};

const MILESTONE_COLUMNS = ["Milestone", "Date", "Amount"] as const;

const milestonesField: FieldDef = {
  name: "milestones",
  label: "Milestones (one per line: Milestone | Date | Amount)",
  type: "textarea",
  wide: true,
  placeholder: "Design approved | 2026-10-15 | 500000",
  hint: 'Separate cells with "|". Dates as YYYY-MM-DD are written out in full; plain amounts get the currency.',
  default: (context) =>
    (context.project?.milestones ?? []).map((milestone) => `${milestone.title} | ${milestone.due ?? ""}`).join("\n"),
};

const SEVERITY_COLUMNS = ["Severity", "Example", "Response", "Resolution target"] as const;

const SEVERITY_DEFAULTS = [
  "Critical | Service down or unusable for all users, data loss or a security breach | 1 hour | 4 hours",
  "High | A major feature is unavailable and there is no workaround | 4 hours | 1 business day",
  "Medium | A feature is impaired but a workaround exists | 1 business day | 5 business days",
  "Low | Minor or cosmetic issue, or a question | 2 business days | Next scheduled release",
].join("\n");

const severityHint =
  'One severity per line, cells separated by "|": Severity | Example | Response | Resolution target.';

const DATA_PROTECTION_LAW = "Law No. 058/2021 relating to the protection of personal data and privacy";

// Helpers -------------------------------------------------------------------------

function provider(context: TemplateContext) {
  return { role: "Provider", lines: [company(context), context.letterhead.address].filter(Boolean) };
}

function party(values: Values, role: string, nameField: string, nameLabel: string, addressField: string) {
  const address = optional(values, addressField);
  return { role, lines: [text(values, nameField, nameLabel), ...(address ? [address] : [])] };
}

/** The textarea's paragraphs, or one gap paragraph naming what to write. */
function body(values: Values, name: string, label: string): Block[] {
  const blocks = paragraphs(values, name);
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: `[${label}]` }];
}

/** The textarea's lines as a list, or a single gap item naming what to write. */
function list(values: Values, name: string, label: string): Block {
  const entries = lines(values, name);
  return { kind: "list", items: entries.length > 0 ? entries : [`[${label}]`] };
}

/** A heading and list only when the optional textarea has lines. */
function optionalList(values: Values, name: string, heading: () => Block): Block[] {
  const entries = lines(values, name);
  return entries.length > 0 ? [heading(), { kind: "list", items: entries }] : [];
}

function paragraph(text: string): Block {
  return { kind: "paragraph", text };
}

/** Milestone rows with dates written out and plain amounts in the agreement's currency. */
function milestoneTable(values: Values, currency: string): Block {
  const rows = tableRows(values, "milestones", MILESTONE_COLUMNS.length).map(([milestone, due, amount]) => {
    const figure = Number((amount ?? "").replace(/[, ]/g, ""));
    const priced =
      amount && /^[\d, .]+$/.test(amount) && Number.isFinite(figure) ? formatMoney(figure, currency) : amount;
    return [milestone ?? "", due ? longDate(due) : "", priced ?? ""];
  });
  return table(MILESTONE_COLUMNS, rows, "Milestones");
}

function disputeClause(values: Values): Block {
  return paragraph(
    `The parties shall first try to settle any dispute amicably through their senior representatives within thirty (30) days of either party raising it in writing. A dispute not settled in that time shall be referred to ${text(values, "disputeForum", "Dispute forum")}.`,
  );
}

function governingLawClause(values: Values): Block {
  return paragraph(`This agreement is governed by ${text(values, "governingLaw", "Governing law")}.`);
}

function dataProtectionClause(): Block {
  return paragraph(
    `Where the Provider processes personal data on the Client's behalf, the Client is the data controller and the Provider the data processor. The Provider processes that data only on the Client's documented instructions, keeps it secure and confidential, and assists the Client in meeting its obligations under ${DATA_PROTECTION_LAW}. Where required, the parties sign a separate Data Processing Agreement, which prevails on data protection matters.`,
  );
}

function signatures(values: Values, clientRole = "Client signature"): Block {
  return {
    kind: "signatures",
    parties: [
      { role: clientRole, name: optional(values, "clientSignatory") ?? "" },
      { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
    ],
  };
}

// Templates -----------------------------------------------------------------------

const masterServicesAgreement: DocumentTemplate = {
  key: "master_services_agreement",
  name: "Master services agreement (MSA)",
  category: "Contracts & Legal",
  documentType: "other",
  summary: "The framework contract for a recurring client; each project is then agreed in its own statement of work.",
  legal: true,
  fields: [
    agreementDateField,
    clientField,
    clientAddressField,
    { name: "clientRegistration", label: "Client's TIN / registration (optional)", type: "text" },
    {
      name: "services",
      label: "Nature of the services",
      type: "textarea",
      wide: true,
      default: () =>
        "software design and development, systems integration, hosting and deployment support, maintenance and related technology services",
      hint: 'Completes "The Provider supplies ___".',
    },
    common.currency,
    paymentDaysField,
    { name: "term", label: "Initial term", type: "text", default: () => "two (2) years" },
    { name: "noticeDays", label: "Termination notice (days)", type: "number", default: () => "60" },
    {
      name: "liabilityCap",
      label: "Liability capped at",
      type: "text",
      default: () => "the fees paid under the relevant Statement of Work in the twelve (12) months before the claim",
    },
    governingLawField,
    disputeField,
    ceoField,
    clientSignatoryField,
    referenceField,
  ],
  build(values, context) {
    const registration = optional(values, "clientRegistration");
    const section = sections();
    return {
      layout: "contract",
      title: "Master Services Agreement",
      subtitle: "Technology Services Framework",
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Master Services Agreement ("Agreement") is entered into between:',
          parties: [
            provider(context),
            {
              role: "Client",
              lines: [
                ...party(values, "Client", "clientName", "Client", "clientAddress").lines,
                ...(registration ? [registration] : []),
              ],
            },
          ],
        },
        section("Definitions"),
        {
          kind: "terms",
          rows: [
            [
              "Statement of Work (SOW)",
              "A document signed by both parties describing a specific project under this Agreement",
            ],
            ["Services", "The work the Provider performs under an SOW"],
            ["Deliverables", "The software, documents and other outputs listed in an SOW"],
            ["Confidential Information", "Non-public information disclosed by one party to the other, in any form"],
            ["Business day", "Monday to Friday, excluding public holidays in Rwanda"],
          ],
        },
        section("Structure of the agreement"),
        paragraph(
          `The Provider supplies ${text(values, "services", "Nature of the services")}. Each project is agreed in a separate SOW that sets out its scope, deliverables, timeline, acceptance criteria and fees. Each SOW incorporates this Agreement; if they conflict, this Agreement prevails unless the SOW expressly states otherwise. Neither party is obliged to enter into any SOW.`,
        ),
        section("General terms"),
        {
          kind: "list",
          items: [
            "The Provider performs the Services with reasonable skill and care, using suitably qualified staff",
            "The Client provides timely access, information, content, decisions and feedback; delays on its side move the dates accordingly",
            "Changes to an SOW take effect only through a change request signed by both parties",
            "The Provider acts as an independent contractor; nothing here creates employment, partnership or agency",
          ],
        },
        section("Fees & payment"),
        paragraph(
          `Fees are set out in each SOW in ${text(values, "currency", "Currency")}. Invoices are payable within ${text(values, "paymentDays", "Payment days")} days of issue. Fees exclude VAT and other taxes, which are added where applicable. The Provider may suspend work on an SOW while an undisputed invoice remains unpaid after written reminder.`,
        ),
        section("Confidentiality"),
        paragraph(
          "Each party keeps the other's Confidential Information confidential, uses it only to perform this Agreement and shares it only with staff and advisers who need it and are bound by similar duties. This obligation survives termination for three (3) years, and indefinitely for source code, credentials and personal data.",
        ),
        section("Intellectual property"),
        paragraph(
          "Unless an SOW says otherwise, ownership of the custom Deliverables created for the Client passes to the Client on full payment of the relevant fees. The Provider keeps its pre-existing tools, libraries, templates and know-how, and grants the Client a perpetual, non-exclusive licence to use them as part of the Deliverables. Third-party and open-source components remain under their own licences.",
        ),
        section("Data protection"),
        dataProtectionClause(),
        section("Warranties"),
        paragraph(
          "Each party warrants that it has authority to enter into this Agreement. The Provider warrants that the Deliverables will materially conform to the relevant SOW for the warranty period stated there and will correct reported defects in that period at no cost. All other warranties are excluded to the extent the law permits.",
        ),
        section("Limitation of liability"),
        paragraph(
          `Neither party is liable for indirect or consequential loss, including lost profits or data that could have been recovered from backups. Each party's total liability under this Agreement is limited to ${text(values, "liabilityCap", "Liability cap")}. These limits do not apply to fraud, wilful misconduct, breach of confidentiality or unpaid fees.`,
        ),
        section("Term & termination"),
        paragraph(
          `This Agreement starts on the agreement date and continues for ${text(values, "term", "Initial term")}, then renews for successive one-year periods unless either party gives notice. Either party may terminate this Agreement or any SOW on ${text(values, "noticeDays", "Notice days")} days' written notice, or immediately if the other party materially breaches it and fails to remedy the breach within thirty (30) days of written notice. On termination the Client pays for work performed up to that date, and each party returns the other's Confidential Information.`,
        ),
        section("Dispute resolution"),
        disputeClause(values),
        section("Governing law"),
        governingLawClause(values),
        signatures(values),
      ],
    };
  },
};

const statementOfWork: DocumentTemplate = {
  key: "statement_of_work",
  name: "Statement of work (SOW)",
  category: "Contracts & Legal",
  documentType: "requirements",
  summary: "One project under a master services agreement: scope, deliverables, milestones, acceptance and cost.",
  legal: true,
  fields: [
    common.reference("SOW"),
    agreementDateField,
    { name: "msaReference", label: "MSA reference", type: "text", required: true, placeholder: "e.g. MSA/20260101" },
    { name: "msaDate", label: "MSA dated", type: "date" },
    clientField,
    projectField,
    {
      name: "background",
      label: "Background",
      type: "textarea",
      wide: true,
      default: (context) => context.project?.description ?? "",
    },
    { name: "objectives", label: "Objectives (one per line)", type: "textarea", wide: true },
    { name: "scope", label: "Scope of work", type: "textarea", wide: true, required: true },
    { name: "features", label: "Features (one per line)", type: "textarea", wide: true },
    { name: "deliverables", label: "Deliverables (one per line)", type: "textarea", wide: true, required: true },
    milestonesField,
    { name: "startDate", label: "Start date", type: "date", default: (context) => context.project?.startDate ?? "" },
    {
      name: "endDate",
      label: "Target completion",
      type: "date",
      default: (context) => context.project?.targetEndDate ?? "",
    },
    {
      name: "clientResponsibilities",
      label: "Client responsibilities (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Name one representative who can make decisions and approve deliverables\nProvide content, data, branding and access on time\nReview deliverables and give consolidated feedback within the agreed review period",
    },
    { name: "dependencies", label: "Dependencies & assumptions (one per line)", type: "textarea", wide: true },
    {
      name: "acceptance",
      label: "Acceptance criteria (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Each deliverable works as described in this SOW in the agreed test environment\nNo open Critical or High severity defects\nThe Client signs a Software Acceptance Certificate",
    },
    common.currency,
    { name: "fee", label: "Total cost", type: "number", required: true },
    {
      name: "schedule",
      label: "Payment schedule (one per line)",
      type: "textarea",
      wide: true,
      default: () => "40% on signing\n40% on delivery of the beta\n20% on final acceptance",
    },
    { name: "outOfScope", label: "Out of scope (one per line)", type: "textarea", wide: true },
    ceoField,
    clientSignatoryField,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const msaDate = optional(values, "msaDate");
    const outOfScope = lines(values, "outOfScope");
    const section = sections();
    return {
      layout: "contract",
      title: "Statement of Work",
      subtitle: text(values, "projectName", "Project"),
      dateLabel: "SOW date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: `This Statement of Work ("SOW") is entered into under the Master Services Agreement ${text(values, "msaReference", "MSA reference")}${msaDate ? ` dated ${longDate(msaDate)}` : ""} ("MSA") between:`,
          parties: [provider(context), { role: "Client", lines: [text(values, "clientName", "Client")] }],
        },
        paragraph("The terms of the MSA apply to this SOW. Words defined in the MSA have the same meaning here."),
        section("Background"),
        ...body(values, "background", "Background"),
        ...optionalList(values, "objectives", () => section("Objectives")),
        section("Scope of work"),
        ...body(values, "scope", "Scope of work"),
        ...optionalList(values, "features", () => section("Features")),
        section("Deliverables"),
        list(values, "deliverables", "Deliverables"),
        section("Timeline & milestones"),
        {
          kind: "terms",
          rows: [
            ["Start date", date(values, "startDate", "Start date")],
            ["Target completion", date(values, "endDate", "Target completion")],
          ],
        },
        milestoneTable(values, currency),
        section("Client responsibilities"),
        list(values, "clientResponsibilities", "Client responsibilities"),
        ...optionalList(values, "dependencies", () => section("Dependencies & assumptions")),
        section("Acceptance criteria"),
        list(values, "acceptance", "Acceptance criteria"),
        paragraph(
          "The Client reviews each deliverable within ten (10) business days and either accepts it or lists the defects in writing. A deliverable not rejected in writing within that time is deemed accepted.",
        ),
        section("Cost & payment schedule"),
        { kind: "terms", rows: [["Total cost", money(values, "fee", "Total cost", currency)]] },
        list(values, "schedule", "Payment schedule"),
        section("Out of scope"),
        ...(outOfScope.length > 0 ? [{ kind: "list", items: outOfScope } as const] : []),
        paragraph(
          "Anything not listed in this SOW is out of scope. Additional work is quoted separately and starts only once a change request is signed by both parties.",
        ),
        signatures(values),
      ],
    };
  },
};

const softwareDevelopmentAgreement: DocumentTemplate = {
  key: "software_development_agreement",
  name: "Software development agreement",
  category: "Contracts & Legal",
  documentType: "requirements",
  summary:
    "A standalone contract to build custom software: requirements, milestones, acceptance, fees, IP, warranty and liability.",
  legal: true,
  fields: [
    agreementDateField,
    clientField,
    clientAddressField,
    projectField,
    {
      name: "description",
      label: "Software to be developed",
      type: "textarea",
      wide: true,
      required: true,
      default: (context) => context.project?.description ?? "",
    },
    { name: "requirements", label: "Functional requirements (one per line)", type: "textarea", wide: true },
    { name: "deliverables", label: "Deliverables (one per line)", type: "textarea", wide: true, required: true },
    {
      name: "technology",
      label: "Technology & platforms (optional)",
      type: "text",
      placeholder: "e.g. Web app and Android",
    },
    milestonesField,
    { name: "startDate", label: "Start date", type: "date", default: (context) => context.project?.startDate ?? "" },
    {
      name: "deliveryDate",
      label: "Target delivery",
      type: "date",
      default: (context) => context.project?.targetEndDate ?? "",
    },
    common.currency,
    { name: "fee", label: "Total fee", type: "number", required: true },
    {
      name: "schedule",
      label: "Payment schedule (one per line)",
      type: "textarea",
      wide: true,
      default: () => "40% on signing\n40% on delivery of the beta\n20% on final acceptance",
    },
    paymentDaysField,
    { name: "acceptanceDays", label: "Acceptance review period (business days)", type: "number", default: () => "10" },
    { name: "warranty", label: "Warranty period", type: "text", default: () => "ninety (90) days after acceptance" },
    { name: "noticeDays", label: "Termination notice (days)", type: "number", default: () => "30" },
    governingLawField,
    disputeField,
    ceoField,
    clientSignatoryField,
    referenceField,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const technology = optional(values, "technology");
    const section = sections();
    return {
      layout: "contract",
      title: "Software Development Agreement",
      subtitle: text(values, "projectName", "Project"),
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Software Development Agreement ("Agreement") is entered into between:',
          parties: [provider(context), party(values, "Client", "clientName", "Client", "clientAddress")],
        },
        section("The software"),
        ...body(values, "description", "Software to be developed"),
        ...(technology ? [paragraph(`The software will be built for: ${technology}.`)] : []),
        ...optionalList(values, "requirements", () => section("Functional requirements")),
        section("Deliverables"),
        list(values, "deliverables", "Deliverables"),
        section("Timeline & milestones"),
        {
          kind: "terms",
          rows: [
            ["Start date", date(values, "startDate", "Start date")],
            ["Target delivery", date(values, "deliveryDate", "Target delivery")],
          ],
        },
        milestoneTable(values, currency),
        paragraph(
          "Dates depend on the Client providing content, access, decisions and feedback on time; delays on either side move the dates accordingly.",
        ),
        section("Client obligations"),
        paragraph(
          "The Client names one representative authorised to give instructions and approve deliverables, provides the information, content, test data and third-party accounts the work needs, and is responsible for the lawfulness of the content and data it supplies.",
        ),
        section("Changes"),
        paragraph(
          "Changes to the requirements are agreed through a written change request stating the impact on cost and timeline. No change binds either party, however it was requested, until the change request is signed by both.",
        ),
        section("Fees & payment"),
        { kind: "terms", rows: [["Total fee", money(values, "fee", "Total fee", currency)]] },
        list(values, "schedule", "Payment schedule"),
        paragraph(
          `Invoices are payable within ${text(values, "paymentDays", "Payment days")} days of issue. Fees exclude VAT and other taxes, which are added where applicable.`,
        ),
        section("Acceptance"),
        paragraph(
          `The Client tests each deliverable within ${text(values, "acceptanceDays", "Review period")} business days and either accepts it in writing or lists the defects. The Provider corrects listed defects and resubmits. A deliverable not rejected in writing within the review period, or used in live operation, is deemed accepted.`,
        ),
        section("Source code & IP ownership"),
        paragraph(
          "On full payment, ownership of the custom source code and deliverables passes to the Client, and the Provider hands over the source code repository and the documentation needed to build and deploy it. The Provider keeps its pre-existing tools, libraries and know-how, and grants the Client a perpetual, non-exclusive licence to use them as part of the software. Third-party and open-source components remain under their own licences. The Provider may describe the project in general terms in its portfolio unless the Client objects in writing.",
        ),
        section("Warranty"),
        paragraph(
          `The Provider warrants that the software will materially conform to the agreed requirements and corrects defects reported within ${text(values, "warranty", "Warranty period")} at no cost. The warranty does not cover changes made by others, misuse, or faults in hosting and third-party services. Maintenance, hosting and new features are covered by a separate support agreement.`,
        ),
        section("Confidentiality & data protection"),
        paragraph(
          "Each party keeps the other's confidential information confidential and uses it only to perform this Agreement; this survives termination.",
        ),
        dataProtectionClause(),
        section("Limitation of liability"),
        paragraph(
          "Neither party is liable for indirect or consequential loss, including lost profits. Each party's total liability is limited to the fees paid under this Agreement, except for fraud, wilful misconduct, breach of confidentiality or unpaid fees.",
        ),
        section("Termination"),
        paragraph(
          `Either party may terminate on ${text(values, "noticeDays", "Notice days")} days' written notice, or immediately if the other materially breaches this Agreement and fails to remedy it within fourteen (14) days of written notice. The Client pays for work performed up to termination and receives the work paid for.`,
        ),
        section("Dispute resolution & governing law"),
        disputeClause(values),
        governingLawClause(values),
        signatures(values),
      ],
    };
  },
};

const changeRequest: DocumentTemplate = {
  key: "change_request",
  name: "Change request",
  category: "Contracts & Legal",
  documentType: "requirements",
  summary: "The signed record of a change to agreed scope, with its cost and timeline impact.",
  legal: true,
  fields: [
    common.reference("CR"),
    { ...common.date, label: "Request date" },
    clientField,
    projectField,
    {
      name: "contractReference",
      label: "Agreement / SOW reference",
      type: "text",
      placeholder: "e.g. SOW/20261001",
    },
    { name: "requestedBy", label: "Requested by", type: "text", required: true },
    { name: "requestedChange", label: "Requested change", type: "textarea", wide: true, required: true },
    { name: "reason", label: "Reason for the change", type: "textarea", wide: true },
    { name: "originalScope", label: "Original scope (what was agreed)", type: "textarea", wide: true },
    { name: "impact", label: "Impact on the system and other work", type: "textarea", wide: true },
    { name: "additionalWork", label: "Additional development (one per line)", type: "textarea", wide: true },
    common.currency,
    { name: "additionalCost", label: "Additional cost", type: "number", hint: "Enter 0 if the change is free." },
    { name: "timelineImpact", label: "Timeline impact", type: "text", placeholder: "e.g. +10 business days" },
    { name: "revisedDelivery", label: "Revised delivery date", type: "date" },
    ceoField,
    { ...clientSignatoryField, label: "Approved for the client by" },
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const contractReference = optional(values, "contractReference");
    const section = sections();
    return {
      layout: "contract",
      title: "Change Request",
      subtitle: text(values, "projectName", "Project"),
      dateLabel: "Request date",
      date: date(values, "date", "Request date"),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "terms",
          rows: [
            ["Change request no.", text(values, "reference", "Reference")],
            ["Client", text(values, "clientName", "Client")],
            ["Provider", company(context)],
            ["Project", text(values, "projectName", "Project")],
            ["Agreement / SOW", contractReference ?? "[Agreement / SOW reference]"],
            ["Requested by", text(values, "requestedBy", "Requested by")],
          ],
        },
        section("Requested change"),
        ...body(values, "requestedChange", "Requested change"),
        section("Reason"),
        ...body(values, "reason", "Reason for the change"),
        section("Original scope"),
        ...body(values, "originalScope", "Original scope"),
        section("Impact"),
        ...body(values, "impact", "Impact on the system and other work"),
        section("Additional development"),
        list(values, "additionalWork", "Additional development"),
        section("Cost & timeline"),
        {
          kind: "terms",
          rows: [
            ["Additional cost", money(values, "additionalCost", "Additional cost", currency)],
            ["Timeline impact", text(values, "timelineImpact", "Timeline impact")],
            ["Revised delivery date", date(values, "revisedDelivery", "Revised delivery date")],
          ],
        },
        section("Approval"),
        paragraph(
          `Once signed by both parties, this change request amends the scope, cost and timeline of ${contractReference ?? "the agreement"} as set out above; all other terms stay unchanged. Work on the change starts only after signature. Requests made by email, phone, meetings or messaging apps such as WhatsApp do not change the agreed scope until recorded and signed on a change request.`,
        ),
        { kind: "terms", rows: [["Decision", "Approved  /  Approved with changes  /  Rejected  (circle one)"]] },
        signatures(values, "Client approval"),
      ],
    };
  },
};

const acceptanceCertificate: DocumentTemplate = {
  key: "software_acceptance_certificate",
  name: "Software acceptance certificate",
  category: "Contracts & Legal",
  documentType: "final_report",
  summary:
    "The client's signed acceptance of a software release, with any outstanding issues and how they will be closed.",
  legal: true,
  fields: [
    common.reference("ACC"),
    { name: "acceptanceDate", label: "Acceptance date", type: "date", default: today },
    clientField,
    projectField,
    { name: "version", label: "Version / release", type: "text", required: true, placeholder: "e.g. v1.0.0" },
    {
      name: "contractReference",
      label: "Agreement / SOW reference",
      type: "text",
      placeholder: "e.g. SOW/20261001",
    },
    {
      name: "acceptanceType",
      label: "Type of acceptance",
      type: "select",
      options: ["Final acceptance", "Milestone acceptance", "Conditional acceptance"],
      default: () => "Final acceptance",
      hint: "Conditional: accepted subject to the outstanding issues being closed as listed.",
    },
    {
      name: "deliverables",
      label: "Deliverables accepted (one per line)",
      type: "textarea",
      wide: true,
      required: true,
    },
    { name: "criteria", label: "Acceptance criteria met (one per line)", type: "textarea", wide: true, required: true },
    {
      name: "issues",
      label: "Outstanding issues (one per line: Issue | Severity | Agreed action | Due date)",
      type: "textarea",
      wide: true,
      placeholder: "Export button misaligned on mobile | Low | Fix in next release | 2026-10-15",
      hint: 'Separate cells with "|". Write "None" if nothing is outstanding.',
    },
    { name: "warrantyEnds", label: "Warranty ends (optional)", type: "date" },
    { name: "clientRepresentative", label: "Client representative", type: "text", required: true },
    { name: "clientTitle", label: "Client representative's title", type: "text" },
    ceoField,
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const project = text(values, "projectName", "Project");
    const version = text(values, "version", "Version");
    const contractReference = optional(values, "contractReference");
    const kind = text(values, "acceptanceType", "Type of acceptance");
    const issueColumns = ["Issue", "Severity", "Agreed action", "Due date"] as const;
    const issues = tableRows(values, "issues", issueColumns.length).map(([issue, severity, action, due]) => [
      issue ?? "",
      severity ?? "",
      action ?? "",
      due ? longDate(due) : "",
    ]);
    const section = sections();
    return {
      layout: "contract",
      title: "Software Acceptance Certificate",
      subtitle: `${project} — ${version}`,
      dateLabel: "Acceptance date",
      date: date(values, "acceptanceDate", "Acceptance date"),
      reference: optional(values, "reference") ?? undefined,
      blocks: [
        {
          kind: "terms",
          rows: [
            ["Client", client],
            ["Provider", company(context)],
            ["Project", project],
            ["Version / release", version],
            ["Agreement / SOW", contractReference ?? "[Agreement / SOW reference]"],
            ["Type of acceptance", kind],
          ],
        },
        section("Deliverables"),
        list(values, "deliverables", "Deliverables accepted"),
        section("Acceptance criteria met"),
        list(values, "criteria", "Acceptance criteria met"),
        section("Outstanding issues"),
        table(issueColumns, issues, "Outstanding issues, or None"),
        section("Acceptance"),
        paragraph(
          `${client} confirms that it has tested version ${version} of ${project}, that the acceptance criteria above are met, and grants ${kind.toLowerCase()} of the deliverables listed${contractReference ? ` under ${contractReference}` : ""}. ${kind === "Conditional acceptance" ? "Acceptance is conditional on the outstanding issues above being closed as agreed." : "Outstanding issues listed above will be closed as agreed and do not delay acceptance."}${optional(values, "warrantyEnds") ? ` Defects reported before ${date(values, "warrantyEnds", "Warranty ends")} are corrected under the warranty.` : ""}`,
        ),
        {
          kind: "signatures",
          parties: [
            {
              role: `Accepted for ${client}`,
              name: text(values, "clientRepresentative", "Client representative"),
              title: optional(values, "clientTitle") ?? undefined,
            },
            { role: "CEO signature", name: text(values, "signatoryName", "CEO") },
          ],
        },
      ],
    };
  },
};

const maintenanceAgreement: DocumentTemplate = {
  key: "maintenance_support_agreement",
  name: "Software maintenance & support agreement",
  category: "Contracts & Legal",
  documentType: "other",
  summary:
    "A monthly or yearly retainer to keep delivered software running: services, fee, response times and renewal.",
  legal: true,
  fields: [
    agreementDateField,
    clientField,
    clientAddressField,
    {
      name: "systemName",
      label: "Software covered",
      type: "text",
      required: true,
      default: (context) => context.project?.name ?? "",
    },
    {
      name: "services",
      label: "Services included (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Corrective maintenance: diagnosing and fixing defects\nSecurity patches and dependency updates\nMonitoring of availability, errors and backups\nMinor adjustments to existing features\nSupport for the Client's users by email and phone during support hours",
    },
    {
      name: "includedHours",
      label: "Hours included per billing period (optional)",
      type: "number",
      hint: "Leave empty if the fee is not tied to hours.",
    },
    common.currency,
    { name: "fee", label: "Fee per billing period", type: "number", required: true },
    {
      name: "billingPeriod",
      label: "Billing period",
      type: "select",
      options: ["Monthly", "Quarterly", "Yearly"],
      default: () => "Monthly",
    },
    { name: "extraRate", label: "Hourly rate for extra work (optional)", type: "number" },
    paymentDaysField,
    {
      name: "slaReference",
      label: "Service Level Agreement reference (optional)",
      type: "text",
      hint: "If a separate SLA applies, name it here; its response times prevail.",
    },
    {
      name: "responseTimes",
      label: "Response times (one per line: Severity | Example | Response | Resolution target)",
      type: "textarea",
      wide: true,
      hint: `${severityHint} Leave empty to rely on the SLA alone.`,
      default: () => SEVERITY_DEFAULTS,
    },
    { name: "patchDays", label: "Critical security patches applied within (days)", type: "number", default: () => "3" },
    {
      name: "exclusions",
      label: "Not included (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "New features and major redesigns\nFaults caused by changes made by the Client or third parties\nHosting, domain, licence and third-party service fees\nRecovering data not covered by the agreed backups",
    },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "term", label: "Initial term", type: "text", default: () => "twelve (12) months" },
    { name: "noticeDays", label: "Notice to end or not renew (days)", type: "number", default: () => "30" },
    governingLawField,
    disputeField,
    ceoField,
    clientSignatoryField,
    referenceField,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const period = text(values, "billingPeriod", "Billing period").toLowerCase();
    const includedHours = optional(values, "includedHours");
    const slaReference = optional(values, "slaReference");
    const responseRows = tableRows(values, "responseTimes", SEVERITY_COLUMNS.length);
    const notice = text(values, "noticeDays", "Notice days");
    const section = sections();
    return {
      layout: "contract",
      title: "Maintenance & Support Agreement",
      subtitle: text(values, "systemName", "Software covered"),
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Maintenance & Support Agreement ("Agreement") is entered into between:',
          parties: [provider(context), party(values, "Client", "clientName", "Client", "clientAddress")],
        },
        section("Services included"),
        paragraph(`The Provider maintains and supports ${text(values, "systemName", "Software covered")} as follows:`),
        list(values, "services", "Services included"),
        ...(includedHours
          ? [paragraph(`The fee covers up to ${includedHours} hours of work per ${period.replace(/ly$/, "")} period.`)]
          : []),
        section("Fee & billing"),
        {
          kind: "terms",
          rows: [
            ["Fee", `${money(values, "fee", "Fee", currency)} (${period})`],
            ["Billing", `Invoiced in advance at the start of each ${period.replace(/ly$/, "")} period`],
            ["Payment", `Within ${text(values, "paymentDays", "Payment days")} days of invoice`],
            ...(optional(values, "extraRate")
              ? ([
                  ["Extra work", `${money(values, "extraRate", "Hourly rate", currency)} per hour, quoted in advance`],
                ] as const)
              : []),
          ],
        },
        paragraph(
          "Fees exclude VAT and other taxes, which are added where applicable. Unused hours do not carry over.",
        ),
        section("Response times"),
        ...(slaReference
          ? [
              paragraph(
                `Response and resolution times are those in the Service Level Agreement ${slaReference}, which prevails over this section.`,
              ),
            ]
          : []),
        ...(responseRows.length > 0 || !slaReference
          ? [
              table(SEVERITY_COLUMNS, responseRows, "Response times"),
              paragraph("Times run within support hours from when the issue is reported through the agreed channel."),
            ]
          : []),
        section("Updates & security patches"),
        paragraph(
          `The Provider keeps the software's frameworks and dependencies on supported versions and applies security patches for critical vulnerabilities within ${text(values, "patchDays", "Patch days")} days of a fix becoming available. Updates are tested before release and scheduled with the Client to avoid disruption.`,
        ),
        section("Not included"),
        list(values, "exclusions", "Exclusions"),
        paragraph("Excluded work can be quoted separately and starts only on written approval."),
        section("Data protection"),
        dataProtectionClause(),
        section("Term & renewal"),
        paragraph(
          `This Agreement starts on ${date(values, "startDate", "Start date")} for ${text(values, "term", "Initial term")} and renews automatically for the same period unless either party gives ${notice} days' written notice before the end of the current term.`,
        ),
        section("Termination"),
        paragraph(
          `Either party may terminate on ${notice} days' written notice, or immediately if the other materially breaches this Agreement and fails to remedy it within fourteen (14) days of written notice. Fees already paid for the current period are not refunded unless the Provider is in breach. On termination the Provider hands over credentials and documentation it holds for the software.`,
        ),
        section("Dispute resolution & governing law"),
        disputeClause(values),
        governingLawClause(values),
        signatures(values),
      ],
    };
  },
};

const serviceLevelAgreement: DocumentTemplate = {
  key: "service_level_agreement",
  name: "Service level agreement (SLA)",
  category: "Contracts & Legal",
  documentType: "other",
  summary: "Availability target, support hours, severity response times, escalation and reporting for a live service.",
  legal: true,
  fields: [
    agreementDateField,
    clientField,
    clientAddressField,
    {
      name: "mainAgreement",
      label: "Main agreement (optional)",
      type: "text",
      placeholder: "e.g. Maintenance & Support Agreement dated 1 October 2026",
    },
    {
      name: "services",
      label: "Services covered (one per line)",
      type: "textarea",
      wide: true,
      required: true,
      default: (context) => (context.project ? `${context.project.name} — production environment` : ""),
    },
    { name: "availability", label: "Availability target (%)", type: "number", default: () => "99.5" },
    {
      name: "measurementPeriod",
      label: "Availability measured per",
      type: "select",
      options: ["calendar month", "calendar quarter"],
      default: () => "calendar month",
    },
    {
      name: "supportHours",
      label: "Support hours",
      type: "text",
      default: () => "Monday to Friday, 08:00–17:00 Kigali time (CAT), excluding public holidays in Rwanda",
    },
    {
      name: "criticalHours",
      label: "Critical issues handled",
      type: "text",
      default: () => "24 hours a day, 7 days a week",
    },
    {
      name: "channels",
      label: "How to report issues (one per line)",
      type: "textarea",
      wide: true,
      default: (context) =>
        [
          context.letterhead.email ? `Email: ${context.letterhead.email}` : "",
          context.letterhead.phone ? `Phone: ${context.letterhead.phone} (Critical issues)` : "",
        ]
          .filter(Boolean)
          .join("\n"),
    },
    {
      name: "severities",
      label: "Severity levels (one per line: Severity | Example | Response | Resolution target)",
      type: "textarea",
      wide: true,
      hint: severityHint,
      default: () => SEVERITY_DEFAULTS,
    },
    {
      name: "maintenanceWindow",
      label: "Planned maintenance window",
      type: "text",
      default: () => "Sundays 22:00–02:00 Kigali time",
    },
    { name: "maintenanceNotice", label: "Maintenance notice (hours)", type: "number", default: () => "48" },
    {
      name: "escalation",
      label: "Escalation (one per line: Level | Contact | When)",
      type: "textarea",
      wide: true,
      hint: 'Separate cells with "|".',
      default: () =>
        "1 | Support desk | When the issue is reported\n2 | Project manager | A response or resolution target is missed\n3 | Managing Director | Unresolved after level 2",
    },
    {
      name: "exclusions",
      label: "Exclusions (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Planned maintenance announced in line with this SLA\nFaults in the Client's own systems, networks or devices\nOutages of third-party providers outside the Provider's control, including hosting, payment and messaging services\nChanges made by the Client or third parties without the Provider's agreement\nForce majeure events",
    },
    {
      name: "serviceCredits",
      label: "Service credits (optional, one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Below 99.5%: 5% of the monthly fee\nBelow 98%: 10% of the monthly fee",
      hint: "Leave empty for no service credits.",
    },
    {
      name: "reportFrequency",
      label: "Service reports",
      type: "select",
      options: ["monthly", "quarterly"],
      default: () => "monthly",
    },
    governingLawField,
    ceoField,
    clientSignatoryField,
    referenceField,
  ],
  build(values, context) {
    const mainAgreement = optional(values, "mainAgreement");
    const availability = text(values, "availability", "Availability target").replace(/%$/, "");
    const period = text(values, "measurementPeriod", "Measurement period");
    const channels = lines(values, "channels");
    const escalationColumns = ["Level", "Contact", "When"] as const;
    const section = sections();
    return {
      layout: "contract",
      title: "Service Level Agreement",
      subtitle: "Availability & Support",
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Service Level Agreement ("SLA") is entered into between:',
          parties: [provider(context), party(values, "Client", "clientName", "Client", "clientAddress")],
        },
        ...(mainAgreement
          ? [
              paragraph(
                `This SLA forms part of the ${mainAgreement}. If they conflict on service levels, this SLA prevails.`,
              ),
            ]
          : []),
        section("Services covered"),
        list(values, "services", "Services covered"),
        section("Availability"),
        paragraph(
          `The Provider targets availability of ${availability}% per ${period}, measured as the time the services are reachable and working, excluding the exclusions below. Availability = (total minutes − minutes unavailable) ÷ total minutes × 100.`,
        ),
        section("Support hours & channels"),
        {
          kind: "terms",
          rows: [
            ["Support hours", text(values, "supportHours", "Support hours")],
            ["Critical issues", text(values, "criticalHours", "Critical issue hours")],
          ],
        },
        { kind: "list", items: channels.length > 0 ? channels : ["[How to report issues]"] },
        section("Severity levels & response times"),
        table(SEVERITY_COLUMNS, tableRows(values, "severities", SEVERITY_COLUMNS.length), "Severity levels"),
        paragraph(
          "Response means a qualified person has acknowledged the issue and started work. Resolution means the service is restored, by a permanent fix or a workaround. Times run from when the issue is reported through an agreed channel, within support hours unless stated otherwise. The Provider sets the severity reasonably, taking the Client's view into account.",
        ),
        section("Maintenance windows"),
        paragraph(
          `Planned maintenance takes place during ${text(values, "maintenanceWindow", "Maintenance window")} and is announced at least ${text(values, "maintenanceNotice", "Notice hours")} hours in advance. Urgent security maintenance may be carried out at shorter notice, with as much warning as practical.`,
        ),
        section("Incident handling"),
        {
          kind: "list",
          ordered: true,
          items: [
            "The Client reports the incident with a description, affected users and any error messages or screenshots",
            "The Provider logs it, confirms the severity and responds within the target time",
            "The Provider keeps the Client informed until the service is restored",
            "For Critical and High incidents, the Provider shares a short incident report with the cause and preventive actions",
          ],
        },
        section("Escalation"),
        table(escalationColumns, tableRows(values, "escalation", escalationColumns.length), "Escalation contacts"),
        section("Exclusions"),
        list(values, "exclusions", "Exclusions"),
        ...optionalList(values, "serviceCredits", () => section("Service credits")),
        ...(lines(values, "serviceCredits").length > 0
          ? [
              paragraph(
                "Service credits are the Client's sole financial remedy for missing the availability target. They are claimed in writing within thirty (30) days of the report and deducted from the next invoice.",
              ),
            ]
          : []),
        section("Reporting & review"),
        paragraph(
          `The Provider sends a ${text(values, "reportFrequency", "Report frequency")} report covering availability, incidents by severity, response and resolution performance, and planned work. The parties review this SLA at least once a year.`,
        ),
        section("Governing law"),
        governingLawClause(values),
        signatures(values),
      ],
    };
  },
};

const dataProcessingAgreement: DocumentTemplate = {
  key: "data_processing_agreement",
  name: "Data processing agreement (DPA)",
  category: "Contracts & Legal",
  documentType: "other",
  summary: `How the company processes a client's personal data as processor, written around Rwanda's ${DATA_PROTECTION_LAW}.`,
  legal: true,
  fields: [
    agreementDateField,
    { ...clientField, label: "Client (data controller)" },
    clientAddressField,
    {
      name: "mainAgreement",
      label: "Main agreement",
      type: "text",
      required: true,
      placeholder: "e.g. Master Services Agreement dated 1 October 2026",
    },
    {
      name: "purpose",
      label: "Purpose of processing",
      type: "textarea",
      wide: true,
      required: true,
      default: (context) =>
        context.project ? `Developing, hosting and supporting the ${context.project.name} system for the Client.` : "",
    },
    {
      name: "dataCategories",
      label: "Categories of personal data (one per line)",
      type: "textarea",
      wide: true,
      required: true,
      placeholder: "Names and contact details\nNational ID numbers\nAttendance records",
    },
    {
      name: "dataSubjects",
      label: "Categories of data subjects (one per line)",
      type: "textarea",
      wide: true,
      required: true,
      placeholder: "The Client's employees\nThe Client's customers",
    },
    {
      name: "sensitiveData",
      label: "Sensitive personal data (optional)",
      type: "textarea",
      wide: true,
      hint: "e.g. health or biometric data. Leave empty if none is processed.",
    },
    {
      name: "security",
      label: "Security measures (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Encryption of data in transit (TLS) and of backups at rest\nAccess limited to named staff, with individual accounts and multi-factor authentication where available\nRegular backups with tested restores\nSecurity patches applied promptly\nLogging of administrative access\nConfidentiality undertakings from all staff with access",
    },
    {
      name: "subProcessors",
      label: "Approved sub-processors (one per line: Name | Service | Location)",
      type: "textarea",
      wide: true,
      placeholder: "Hosting provider | Cloud hosting | Location of the data centre",
      hint: 'Separate cells with "|". Leave empty if none are used.',
    },
    { name: "subProcessorNotice", label: "Notice of new sub-processors (days)", type: "number", default: () => "30" },
    {
      name: "breachHours",
      label: "Breach notified to the client within (hours)",
      type: "number",
      default: () => "24",
      hint: "The controller has its own short deadline to notify the supervisory authority, so keep this well inside it.",
    },
    {
      name: "retention",
      label: "Data kept for",
      type: "text",
      default: () => "the duration of the main agreement",
    },
    {
      name: "returnDays",
      label: "Returned or deleted within (days after the end)",
      type: "number",
      default: () => "30",
    },
    { name: "auditNotice", label: "Audit notice (business days)", type: "number", default: () => "15" },
    governingLawField,
    ceoField,
    clientSignatoryField,
    referenceField,
  ],
  build(values, context) {
    const sensitive = optional(values, "sensitiveData");
    const subProcessorRows = tableRows(values, "subProcessors", 3);
    const section = sections();
    return {
      layout: "contract",
      title: "Data Processing Agreement",
      subtitle: "Controller & Processor",
      dateLabel: "Agreement date",
      date: agreementDate(values),
      reference: optional(values, "reference") ?? undefined,
      classification: "Confidential",
      blocks: [
        {
          kind: "parties",
          intro: 'This Data Processing Agreement ("DPA") is entered into between:',
          parties: [
            party(values, "Controller", "clientName", "Client", "clientAddress"),
            { ...provider(context), role: "Processor" },
          ],
        },
        paragraph(
          `This DPA supplements the ${text(values, "mainAgreement", "Main agreement")} and applies whenever the Processor processes personal data on the Controller's behalf. Terms such as personal data, processing, controller, processor and personal data breach have the meaning given in ${DATA_PROTECTION_LAW} ("the Law"). On data protection matters, this DPA prevails over the main agreement.`,
        ),
        section("Roles"),
        paragraph(
          "The Controller decides the purposes and means of processing and is responsible for having a lawful basis for it, including any consent and notices to data subjects and any registration the Law requires. The Processor processes personal data only as described here.",
        ),
        section("Purpose & instructions"),
        ...body(values, "purpose", "Purpose of processing"),
        paragraph(
          "The Processor processes personal data only on the Controller's documented instructions, which include this DPA and the main agreement, unless the law requires otherwise, in which case it informs the Controller first where permitted. It tells the Controller promptly if it believes an instruction breaches the Law.",
        ),
        section("Data & data subjects"),
        paragraph("Categories of personal data:"),
        list(values, "dataCategories", "Categories of personal data"),
        paragraph("Categories of data subjects:"),
        list(values, "dataSubjects", "Categories of data subjects"),
        ...(sensitive
          ? [
              paragraph(
                `Sensitive personal data processed: ${sensitive}. It receives additional safeguards and is accessed only where strictly necessary.`,
              ),
            ]
          : []),
        section("Confidentiality"),
        paragraph(
          "The Processor ensures that everyone authorised to process the personal data is bound by confidentiality and accesses it only as needed for the services.",
        ),
        section("Security measures"),
        paragraph("The Processor implements appropriate technical and organisational measures, including:"),
        list(values, "security", "Security measures"),
        section("Sub-processors"),
        paragraph(
          `The Controller authorises the sub-processors listed below. The Processor gives ${text(values, "subProcessorNotice", "Notice days")} days' written notice of any new sub-processor, during which the Controller may object on reasonable grounds. Each sub-processor is bound by data protection terms no less protective than this DPA, and the Processor remains responsible for its work.`,
        ),
        subProcessorRows.length > 0
          ? table(["Sub-processor", "Service", "Location"], subProcessorRows, "Sub-processors")
          : paragraph("No sub-processors are engaged at the date of this DPA."),
        section("Data subject rights & assistance"),
        paragraph(
          "The Processor forwards to the Controller any request it receives from a data subject and, taking into account the nature of the processing, assists the Controller in responding to requests, carrying out impact assessments and consulting the supervisory authority.",
        ),
        section("Personal data breaches"),
        paragraph(
          `The Processor notifies the Controller without undue delay, and in any case within ${text(values, "breachHours", "Breach hours")} hours of becoming aware of a personal data breach, with the information available on its nature, the data and data subjects affected, likely consequences and the measures taken or proposed. It cooperates with the Controller, which decides on notifying the supervisory authority and data subjects.`,
        ),
        section("International transfers"),
        paragraph(
          "The Processor does not transfer or store personal data outside Rwanda without the Controller's prior written approval, and then only where the transfer is permitted by the Law, including any authorisation or safeguards it requires.",
        ),
        section("Retention, return & deletion"),
        paragraph(
          `Personal data is kept for ${text(values, "retention", "Retention period")}. Within ${text(values, "returnDays", "Return days")} days of the end of the services, the Processor returns the personal data to the Controller or deletes it, as the Controller chooses, including copies, except where the law requires it to be kept. Backups are deleted on their normal rotation and remain protected until then.`,
        ),
        section("Audits"),
        paragraph(
          `The Processor makes available the information needed to demonstrate compliance with this DPA and allows audits by the Controller or an auditor it appoints, bound by confidentiality, on ${text(values, "auditNotice", "Audit notice")} business days' written notice, during business hours and without unreasonably disrupting its operations. Each party bears its own costs unless the audit reveals a material breach.`,
        ),
        section("Term & governing law"),
        paragraph(
          "This DPA lasts as long as the Processor processes personal data for the Controller. The obligations on confidentiality, deletion and security survive its end.",
        ),
        governingLawClause(values),
        signatures(values, "Controller (Client) signature"),
      ],
    };
  },
};

/** In the order a client relationship runs: framework, project, changes, acceptance, then ongoing service. */
export const CONTRACT_TEMPLATES: readonly DocumentTemplate[] = [
  masterServicesAgreement,
  statementOfWork,
  softwareDevelopmentAgreement,
  changeRequest,
  acceptanceCertificate,
  maintenanceAgreement,
  serviceLevelAgreement,
  dataProcessingAgreement,
];
