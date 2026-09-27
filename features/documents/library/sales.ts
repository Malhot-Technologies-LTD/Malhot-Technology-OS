import { commitments, sectors, services, site } from "@/content/site";

import { longDate, type Block } from "../content";
import {
  common,
  company,
  date,
  items,
  lines,
  optional,
  paragraphs,
  table,
  tableRows,
  text,
  type DocumentTemplate,
  type FieldDef,
  type TemplateContext,
  type Values,
} from "../template-kit";

/**
 * Sales & Clients templates: everything written for a client before and at the
 * start of a project. They use the letter layout (reference and date at the
 * top) because they are correspondence, not agreements; the proposal carries an
 * acceptance signature but points to the services agreement for full terms.
 */

// Local helpers ------------------------------------------------------------------

/** Sentence-case numbered headings for the letter layout, counted in reading order. */
function numbered() {
  let number = 0;
  return (title: string): Block => ({ kind: "heading", text: `${++number}. ${title}` });
}

/** Paragraphs from a textarea, or one [gap] paragraph when it is empty. */
function prose(values: Values, name: string, label: string): Block[] {
  const blocks = paragraphs(values, name);
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: `[${label}]` }];
}

/** A list from a textarea, or a single [gap] item when it is empty. */
function bullets(values: Values, name: string, label: string, ordered = false): Block {
  const list = lines(values, name);
  return { kind: "list", items: list.length > 0 ? list : [`[${label}]`], ordered };
}

function has(values: Values, name: string): boolean {
  return optional(values, name) !== null;
}

/**
 * Optional sections stay off the page until they have content. Built lazily so
 * their numbered heading is only counted when the section is actually printed.
 */
function when(present: boolean, build: () => Block[]): Block[] {
  return present ? build() : [];
}

/** A table from a "cell | cell" textarea, with a [gap] row when it is empty. */
function grid(values: Values, name: string, columns: readonly string[], emptyLabel: string): Block {
  return table(columns, tableRows(values, name, columns.length), emptyLabel);
}

/** A textarea field for a table: the hint and placeholder spell out the row format. */
function tableField(
  name: string,
  label: string,
  columns: readonly string[],
  example: string,
  extra: Partial<Pick<FieldDef, "required">> & { default?: (context: TemplateContext) => string } = {},
): FieldDef {
  return {
    name,
    label,
    type: "textarea",
    wide: true,
    hint: `One row per line, cells separated by "|": ${columns.join(" | ")}.`,
    placeholder: example,
    ...extra,
  };
}

const projectName = (context: TemplateContext) => context.project?.name ?? "";
const clientName = (context: TemplateContext) => context.project?.clientName ?? "";

/** "Name | Role" rows from the project team, falling back to its manager. */
function teamRows(context: TemplateContext): string {
  const team = context.project?.team ?? [];
  if (team.length > 0) return team.map((member) => `${member.name} | ${member.role}`).join("\n");
  const manager = context.project?.managerName;
  return manager ? `${manager} | Project Manager` : "";
}

/** "Phase | Timing | Key output" rows from the project's open and closed milestones. */
function milestoneRows(context: TemplateContext): string {
  return (context.project?.milestones ?? [])
    .map((milestone) => `${milestone.title} | ${milestone.due ?? ""} | `)
    .join("\n");
}

/** The project's planned dates as one line, or empty when the project has none. */
function projectDuration(context: TemplateContext): string {
  const start = context.project?.startDate;
  const end = context.project?.targetEndDate;
  if (start && end) return `${longDate(start)} to ${longDate(end)}`;
  if (end) return `Target completion by ${longDate(end)}`;
  if (start) return `Starting ${longDate(start)}`;
  return "";
}

const clientField: FieldDef = {
  name: "clientName",
  label: "Client",
  type: "text",
  required: true,
  default: clientName,
};

const projectField: FieldDef = {
  name: "projectName",
  label: "Project",
  type: "text",
  required: true,
  default: projectName,
};

const preparedByField: FieldDef = { name: "preparedBy", label: "Prepared by", type: "text", required: true };

const clientSignatoryField: FieldDef = { name: "clientSignatory", label: "Signed for the client by", type: "text" };

function preparedBySignature(values: Values, context: TemplateContext): Block {
  return {
    kind: "signatures",
    parties: [
      {
        role: `Prepared for ${company(context)} by`,
        name: text(values, "preparedBy", "Prepared by"),
        title: optional(values, "preparedByTitle") ?? undefined,
      },
    ],
  };
}

// Project proposal -----------------------------------------------------------------

/**
 * Replaces the original proposal in templates.ts under the same key. The old
 * field names are kept (clientName, projectName, background, approach, phases,
 * timeline, currency, items, validUntil, signatoryName, signatoryTitle) so
 * proposals saved before still open: old one-per-line phases become rows of the
 * timeline table, and the old free-text timeline is the overall duration.
 */
const projectProposal: DocumentTemplate = {
  key: "project_proposal",
  name: "Project proposal",
  category: "Sales & Clients",
  documentType: "project_brief",
  summary: "A full proposal for a client: problem, solution, scope, timeline, team, pricing, terms and acceptance.",
  fields: [
    common.reference("MAL/PROP"),
    common.date,
    { ...clientField, label: "Prepared for (client)" },
    { name: "clientContact", label: "Client contact person", type: "text", placeholder: "e.g. Jane Mukamana, CEO" },
    { name: "clientAddress", label: "Client's address", type: "text" },
    projectField,
    {
      name: "summary",
      label: "Executive summary",
      type: "textarea",
      wide: true,
      hint: "Two or three sentences: what you propose, for whom, and the result.",
      default: (context) => context.project?.description ?? "",
    },
    { name: "background", label: "The client's problem", type: "textarea", wide: true, required: true },
    { name: "approach", label: "Proposed solution", type: "textarea", wide: true },
    { name: "objectives", label: "Objectives (one per line)", type: "textarea", wide: true },
    {
      name: "scope",
      label: "Scope: features / modules (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "User accounts and roles\nAttendance check-in by QR code\nMonthly reports",
    },
    {
      name: "technology",
      label: "Technology approach",
      type: "textarea",
      wide: true,
      placeholder: "e.g. Web application built with Next.js and PostgreSQL, hosted in the cloud",
    },
    { name: "deliverables", label: "Deliverables (one per line)", type: "textarea", wide: true },
    tableField(
      "phases",
      "Timeline phases",
      ["Phase", "Timing", "Key output"],
      "Discovery and design | Weeks 1–2 | Approved designs\nBuild | Weeks 3–8 | Working system",
      {
        default: (context) => milestoneRows(context) || "Discovery and design\nBuild\nTesting and launch\nSupport",
      },
    ),
    {
      name: "timeline",
      label: "Overall duration",
      type: "text",
      placeholder: "e.g. 10 weeks from signing",
      default: projectDuration,
    },
    tableField("team", "Team", ["Name", "Role"], "Aline Uwase | Project Manager\nEric Niyonzima | Lead Developer", {
      default: teamRows,
    }),
    { name: "assumptions", label: "Assumptions (one per line)", type: "textarea", wide: true },
    {
      name: "exclusions",
      label: "Not included (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Content writing and data entry\nThird-party licence and hosting fees",
    },
    common.currency,
    { name: "items", label: "Pricing", type: "items" },
    {
      name: "paymentTerms",
      label: "Payment terms (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "40% on signing\n40% on delivery of the beta\n20% on final acceptance\nInvoices are payable within fourteen (14) days\nPrices exclude VAT, which is added where applicable",
    },
    {
      name: "support",
      label: "Support & maintenance",
      type: "textarea",
      wide: true,
      placeholder: "e.g. 90 days of free defect fixes after launch, then optional monthly support",
    },
    {
      name: "nextSteps",
      label: "Next steps (one per line)",
      type: "textarea",
      wide: true,
      default: (context) =>
        `Review this proposal and share any questions\nConfirm acceptance by signing below\n${company(context)} prepares the services agreement and schedules the kickoff meeting`,
    },
    { name: "validUntil", label: "Valid until", type: "date" },
    common.signatory,
    common.signatoryTitle,
    clientSignatoryField,
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const project = text(values, "projectName", "Project");
    const pricing = items(values, "items").filter((item) => item.description.trim() !== "");
    const phases = tableRows(values, "phases", 3).map(([phase = "", timing = "", output = ""]) => [
      phase,
      longDate(timing),
      output,
    ]);
    const h = numbered();
    return {
      title: "Project Proposal",
      subtitle: `${project} — prepared for ${client}`,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      recipient: [
        client,
        ...(optional(values, "clientContact") ? [`Attn: ${optional(values, "clientContact")}`] : []),
        ...(optional(values, "clientAddress") ? [optional(values, "clientAddress")!] : []),
      ],
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Client", client],
            ["Project", project],
            ["Prepared by", company(context)],
            ["Valid until", date(values, "validUntil", "Valid until")],
          ],
        },
        h("Executive summary"),
        ...prose(values, "summary", "Executive summary"),
        h("The challenge"),
        ...prose(values, "background", "The client's problem"),
        h("Proposed solution"),
        ...prose(values, "approach", "Proposed solution"),
        ...when(lines(values, "objectives").length > 0, () => [h("Objectives"), bullets(values, "objectives", "")]),
        h("Scope: features and modules"),
        bullets(values, "scope", "Features and modules"),
        ...when(has(values, "technology"), () => [h("Technology approach"), ...paragraphs(values, "technology")]),
        ...when(lines(values, "deliverables").length > 0, () => [
          h("Deliverables"),
          bullets(values, "deliverables", ""),
        ]),
        h("Timeline"),
        table(["Phase", "Timing", "Key output"], phases, "Phases"),
        ...when(has(values, "timeline"), () => [
          { kind: "terms", rows: [["Overall duration", optional(values, "timeline")!]] },
        ]),
        {
          kind: "paragraph",
          text: `Dates assume ${client} provides content, access and feedback on time; delays on either side move the dates accordingly.`,
        },
        ...when(tableRows(values, "team", 2).length > 0, () => [
          h("Project team"),
          grid(values, "team", ["Name", "Role"], "Team"),
        ]),
        ...when(lines(values, "assumptions").length > 0, () => [h("Assumptions"), bullets(values, "assumptions", "")]),
        ...when(lines(values, "exclusions").length > 0, () => [h("Not included"), bullets(values, "exclusions", "")]),
        h("Pricing"),
        pricing.length > 0
          ? { kind: "items", currency: text(values, "currency", "Currency"), items: pricing, taxRate: 0, taxLabel: "" }
          : { kind: "paragraph", text: "[Pricing]" },
        h("Payment terms"),
        bullets(values, "paymentTerms", "Payment terms"),
        ...when(has(values, "support"), () => [h("Support and maintenance"), ...paragraphs(values, "support")]),
        h("Next steps"),
        bullets(values, "nextSteps", "Next steps", true),
        h("Acceptance"),
        {
          kind: "paragraph",
          text: `This proposal is valid until ${date(values, "validUntil", "Valid until")}. By signing below, ${client} accepts this proposal. ${company(context)} will then prepare a services agreement setting out the full terms, which governs the work once signed.`,
        },
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

// Client requirements document ------------------------------------------------------

const clientRequirements: DocumentTemplate = {
  key: "client_requirements",
  name: "Client requirements document",
  category: "Sales & Clients",
  documentType: "requirements",
  summary:
    "What the client needs the system to do: users and permissions, functional and non-functional requirements, rules and acceptance criteria.",
  fields: [
    common.reference("MAL/REQ"),
    common.date,
    clientField,
    projectField,
    { name: "version", label: "Version", type: "text", default: () => "1.0" },
    preparedByField,
    { name: "businessProblem", label: "Business problem", type: "textarea", wide: true, required: true },
    {
      name: "currentWorkflow",
      label: "Current workflow",
      type: "textarea",
      wide: true,
      hint: "How the work is done today, step by step.",
    },
    tableField(
      "userTypes",
      "User types & permissions",
      ["User type", "What they do", "Permissions"],
      "Administrator | Manages users and settings | Full access\nStaff | Records attendance | Own records only",
      { required: true },
    ),
    tableField(
      "functional",
      "Functional requirements",
      ["ID", "Requirement", "Priority"],
      "FR-01 | Staff check in by scanning a QR code | Must have\nFR-02 | Managers export a monthly report | Should have",
      { required: true },
    ),
    {
      name: "nonFunctional",
      label: "Non-functional requirements (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Pages load in under 3 seconds on a 3G connection\nAvailable in English and Kinyarwanda",
    },
    {
      name: "integrations",
      label: "Integrations (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "MTN Mobile Money payments\nSMS gateway",
    },
    {
      name: "platforms",
      label: "Devices & platforms (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Web: latest Chrome, Edge, Firefox and Safari\nAndroid phones (Android 10 and later)",
    },
    { name: "businessRules", label: "Business rules (one per line)", type: "textarea", wide: true },
    { name: "reports", label: "Reports (one per line)", type: "textarea", wide: true },
    { name: "notifications", label: "Notifications (one per line)", type: "textarea", wide: true },
    {
      name: "security",
      label: "Security requirements (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Users sign in individually and see only what their role permits\nPasswords are stored hashed and sessions expire after inactivity\nAll traffic is encrypted over HTTPS\nPersonal data is handled in line with Rwanda's law on the protection of personal data and privacy",
    },
    {
      name: "constraints",
      label: "Constraints (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Budget, deadline, required technology, hosting location",
    },
    { name: "acceptance", label: "Acceptance criteria (one per line)", type: "textarea", wide: true, required: true },
    { name: "preparedByTitle", label: "Prepared by (title)", type: "text", placeholder: "e.g. Business Analyst" },
    { ...clientSignatoryField, label: "Approved for the client by" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const h = numbered();
    const optionalList = (title: string, name: string) =>
      when(lines(values, name).length > 0, () => [h(title), bullets(values, name, title)]);
    return {
      title: "Client Requirements Document",
      subtitle: `${text(values, "projectName", "Project")} — ${client}`,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Client", client],
            ["Project", text(values, "projectName", "Project")],
            ["Version", text(values, "version", "Version")],
            ["Prepared by", text(values, "preparedBy", "Prepared by")],
          ],
        },
        h("Business problem"),
        ...prose(values, "businessProblem", "Business problem"),
        ...when(has(values, "currentWorkflow"), () => [
          h("Current workflow"),
          ...paragraphs(values, "currentWorkflow"),
        ]),
        h("User types and permissions"),
        grid(values, "userTypes", ["User type", "What they do", "Permissions"], "User types"),
        h("Functional requirements"),
        grid(values, "functional", ["ID", "Requirement", "Priority"], "Requirements"),
        ...optionalList("Non-functional requirements", "nonFunctional"),
        ...optionalList("Integrations", "integrations"),
        ...optionalList("Devices and platforms", "platforms"),
        ...optionalList("Business rules", "businessRules"),
        ...optionalList("Reports", "reports"),
        ...optionalList("Notifications", "notifications"),
        ...optionalList("Security requirements", "security"),
        ...optionalList("Constraints", "constraints"),
        h("Acceptance criteria"),
        bullets(values, "acceptance", "Acceptance criteria"),
        {
          kind: "paragraph",
          text: `By signing, ${client} confirms that this document reflects its requirements. Changes after sign-off are handled as change requests and may affect the timeline and cost.`,
        },
        {
          kind: "signatures",
          parties: [
            {
              role: `Prepared for ${company(context)} by`,
              name: text(values, "preparedBy", "Prepared by"),
              title: optional(values, "preparedByTitle") ?? undefined,
            },
            { role: `Approved for ${client}`, name: optional(values, "clientSignatory") ?? "" },
          ],
        },
      ],
    };
  },
};

// Discovery / consultation report ---------------------------------------------------

const discoveryReport: DocumentTemplate = {
  key: "discovery_report",
  name: "Discovery / consultation report",
  category: "Sales & Clients",
  documentType: "project_brief",
  summary:
    "What was learned in discovery or a consultation: the client's situation, problems, goals, recommendation, risks and next steps.",
  fields: [
    common.reference("MAL/DISC"),
    common.date,
    clientField,
    { ...projectField, required: false, label: "Project (optional)" },
    {
      name: "sessions",
      label: "Sessions held",
      type: "text",
      placeholder: "e.g. Workshop on 22 September 2026 at the client's office",
    },
    {
      name: "participants",
      label: "Participants (one per line)",
      type: "textarea",
      placeholder: "Jane Mukamana — Client, CEO",
    },
    preparedByField,
    { name: "preparedByTitle", label: "Prepared by (title)", type: "text" },
    { name: "background", label: "Client background", type: "textarea", wide: true, required: true },
    { name: "currentProcess", label: "Current system / process", type: "textarea", wide: true },
    { name: "problems", label: "Problems identified (one per line)", type: "textarea", wide: true, required: true },
    { name: "goals", label: "Business goals (one per line)", type: "textarea", wide: true },
    { name: "requirements", label: "Requirements discovered (one per line)", type: "textarea", wide: true },
    { name: "recommendation", label: "Recommended solution", type: "textarea", wide: true, required: true },
    tableField(
      "risks",
      "Risks",
      ["Risk", "Impact", "Mitigation"],
      "Staff resist the new process | High | Train team leads first and roll out in stages",
    ),
    { name: "openQuestions", label: "Open questions (one per line)", type: "textarea", wide: true },
    tableField(
      "nextSteps",
      "Proposed next steps",
      ["Step", "Owner", "By when"],
      "Share sample reports | Client | 2026-10-03\nSend proposal | Malhot | 2026-10-08",
    ),
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const participants = lines(values, "participants");
    const h = numbered();
    const steps = tableRows(values, "nextSteps", 3).map(([step = "", owner = "", by = ""]) => [
      step,
      owner,
      longDate(by),
    ]);
    return {
      title: "Discovery & Consultation Report",
      subtitle: optional(values, "projectName") ? `${optional(values, "projectName")} — ${client}` : client,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Client", client],
            ...(optional(values, "sessions") ? ([["Sessions", optional(values, "sessions")!]] as const) : []),
            ["Prepared by", text(values, "preparedBy", "Prepared by")],
          ],
        },
        ...when(participants.length > 0, () => [
          { kind: "heading", text: "Participants" },
          { kind: "list", items: participants },
        ]),
        h("Client background"),
        ...prose(values, "background", "Client background"),
        h("Current system and process"),
        ...prose(values, "currentProcess", "Current system and process"),
        h("Problems identified"),
        bullets(values, "problems", "Problems identified"),
        h("Business goals"),
        bullets(values, "goals", "Business goals"),
        ...when(lines(values, "requirements").length > 0, () => [
          h("Requirements discovered"),
          bullets(values, "requirements", ""),
        ]),
        h("Recommended solution"),
        ...prose(values, "recommendation", "Recommended solution"),
        ...when(tableRows(values, "risks", 3).length > 0, () => [
          h("Risks"),
          grid(values, "risks", ["Risk", "Impact", "Mitigation"], "Risks"),
        ]),
        ...when(lines(values, "openQuestions").length > 0, () => [
          h("Open questions"),
          bullets(values, "openQuestions", ""),
        ]),
        h("Proposed next steps"),
        table(["Step", "Owner", "By when"], steps, "Next steps"),
        {
          kind: "note",
          text: "This report records our understanding from the sessions above. Please tell us of anything missed or misunderstood before the proposal is prepared.",
        },
        preparedBySignature(values, context),
      ],
    };
  },
};

// Client onboarding -----------------------------------------------------------------

const contactColumns = ["Name", "Role", "Email", "Phone"] as const;

const clientOnboarding: DocumentTemplate = {
  key: "client_onboarding",
  name: "Client onboarding document",
  category: "Sales & Clients",
  documentType: "project_plan",
  summary:
    "Everything a new client needs at kickoff: who is who, how we communicate, tools, access, meetings, reporting and escalation.",
  fields: [
    common.reference("MAL/ONB"),
    common.date,
    clientField,
    projectField,
    {
      name: "startDate",
      label: "Project start",
      type: "date",
      default: (context) => context.project?.startDate ?? "",
    },
    {
      name: "projectManager",
      label: "Project manager",
      type: "text",
      required: true,
      default: (context) => context.project?.managerName ?? "",
    },
    tableField(
      "clientContacts",
      "Client contacts",
      contactColumns,
      "Jane Mukamana | Project owner | jane@client.rw | +250 7xx xxx xxx",
      { required: true },
    ),
    tableField("teamContacts", "Our project team", contactColumns, "Aline Uwase | Project Manager | aline@… | +250 …", {
      default: teamRows,
    }),
    {
      name: "channels",
      label: "Communication channels (one per line)",
      type: "textarea",
      wide: true,
      placeholder:
        "Email — formal approvals and documents\nWhatsApp group — quick day-to-day questions\nGoogle Meet — scheduled meetings",
    },
    tableField(
      "tools",
      "Project tools",
      ["Tool", "Used for", "Client access"],
      "Malhot OS | Tasks, progress and documents | View\nFigma | Designs for review | Comment",
    ),
    tableField(
      "access",
      "Access we need",
      ["Access", "Provided by", "Needed by"],
      "Domain DNS settings | Client IT | 2026-10-10\nBrand assets (logo, colours) | Client marketing | 2026-10-05",
    ),
    tableField(
      "meetings",
      "Meeting schedule",
      ["Meeting", "When", "Attendees"],
      "Weekly progress call | Tuesdays, 10:00 | PM and project owner\nSprint demo | Every second Friday | Whole team",
    ),
    {
      name: "reporting",
      label: "Reporting process",
      type: "textarea",
      wide: true,
      placeholder:
        "e.g. A written progress update every Friday: done this week, next week, risks and decisions needed.",
    },
    tableField(
      "escalation",
      "Escalation contacts",
      ["Level", "Contact", "When to escalate"],
      "1 | Project manager | Day-to-day issues\n2 | Managing Director | Unresolved after 2 working days",
    ),
    {
      name: "billingContact",
      label: "Client billing contact",
      type: "text",
      placeholder: "Name, email and phone of whoever receives invoices",
    },
    tableField(
      "technicalContacts",
      "Technical contacts",
      ["Name", "Area", "Contact"],
      "Eric Niyonzima | Hosting and servers | eric@client.rw",
    ),
    { name: "kickoffDate", label: "Kickoff date", type: "date" },
    { name: "kickoffWhere", label: "Kickoff time & place", type: "text", placeholder: "e.g. 10:00, Google Meet" },
    {
      name: "kickoffAgenda",
      label: "Kickoff agenda (one per line)",
      type: "textarea",
      wide: true,
      default: () =>
        "Introductions and roles\nGoals and scope confirmed\nTimeline and milestones\nAccess, tools and communication\nQuestions and next steps",
    },
    { ...clientSignatoryField, label: "Acknowledged for the client by" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const project = text(values, "projectName", "Project");
    const h = numbered();
    const longDateColumn = (name: string, columns: number, index: number) =>
      tableRows(values, name, columns).map((row) => row.map((cell, i) => (i === index ? longDate(cell) : cell)));
    return {
      title: "Client Onboarding",
      subtitle: `${project} — ${client}`,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "paragraph",
          text: `Welcome to ${company(context)}. This document sets out who is involved in ${project}, how we will work together, and what we need from ${client} to get started. Please check the details and tell us of any changes.`,
        },
        {
          kind: "facts",
          rows: [
            ["Client", client],
            ["Project", project],
            ["Project start", date(values, "startDate", "Project start")],
            ["Project manager", text(values, "projectManager", "Project manager")],
          ],
        },
        h("Client contacts"),
        grid(values, "clientContacts", contactColumns, "Client contacts"),
        h("Our project team"),
        grid(values, "teamContacts", contactColumns, "Project team"),
        h("Communication channels"),
        bullets(values, "channels", "Communication channels"),
        ...when(tableRows(values, "tools", 3).length > 0, () => [
          h("Project tools"),
          grid(values, "tools", ["Tool", "Used for", "Client access"], "Tools"),
        ]),
        h("Access we need"),
        table(["Access", "Provided by", "Needed by"], longDateColumn("access", 3, 2), "Access needed"),
        h("Meeting schedule"),
        grid(values, "meetings", ["Meeting", "When", "Attendees"], "Meetings"),
        ...when(has(values, "reporting"), () => [h("Reporting"), ...paragraphs(values, "reporting")]),
        ...when(tableRows(values, "escalation", 3).length > 0, () => [
          h("Escalation"),
          grid(values, "escalation", ["Level", "Contact", "When to escalate"], "Escalation"),
        ]),
        h("Billing and technical contacts"),
        { kind: "terms", rows: [["Billing contact", text(values, "billingContact", "Billing contact")]] },
        ...when(tableRows(values, "technicalContacts", 3).length > 0, () => [
          grid(values, "technicalContacts", ["Name", "Area", "Contact"], "Technical contacts"),
        ]),
        h("Kickoff"),
        {
          kind: "terms",
          rows: [
            ["Date", date(values, "kickoffDate", "Kickoff date")],
            ["Time and place", text(values, "kickoffWhere", "Kickoff time and place")],
          ],
        },
        ...when(lines(values, "kickoffAgenda").length > 0, () => [bullets(values, "kickoffAgenda", "", true)]),
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "projectManager", "Project manager"),
              title: "Project Manager",
            },
            { role: `Acknowledged for ${client}`, name: optional(values, "clientSignatory") ?? "" },
          ],
        },
      ],
    };
  },
};

// Company profile / capability statement -------------------------------------------

const PROFILE_FORMATS = ["Company profile", "Capability statement"] as const;
/** A capability statement is a one-to-two page summary, so it shows only the strongest few projects. */
const CAPABILITY_PROJECTS = 3;

/**
 * Defaults come from the public website's content (content/site.ts), which is
 * already the company's reviewed positioning: services, sectors and the
 * commitments every engagement keeps. Projects are never defaulted — they
 * must be real and are written in by hand.
 */
const companyProfile: DocumentTemplate = {
  key: "company_profile",
  name: "Company profile / capability statement",
  category: "Sales & Clients",
  documentType: "other",
  summary:
    "Introduces the company to a prospect: services, industries, technology, selected projects, team and contacts, in full or as a short capability statement.",
  fields: [
    {
      name: "format",
      label: "Format",
      type: "select",
      options: PROFILE_FORMATS,
      default: () => PROFILE_FORMATS[0],
      hint: "A capability statement is the short version: no industries or team sections, and at most three projects.",
    },
    common.date,
    { name: "preparedFor", label: "Prepared for (optional)", type: "text" },
    {
      name: "about",
      label: "About the company",
      type: "textarea",
      wide: true,
      required: true,
      hint: "Leave a blank line between paragraphs; the capability statement uses only the first.",
      default: (context) => site.description.replace(site.name, company(context)),
    },
    {
      name: "services",
      label: "Services (one per line)",
      type: "textarea",
      wide: true,
      default: () => services.map((service) => `${service.title} — ${service.short}`).join("\n"),
    },
    {
      name: "industries",
      label: "Industries (one per line)",
      type: "textarea",
      wide: true,
      default: () => sectors.map((sector) => `${sector.title} — ${sector.copy}`).join("\n"),
    },
    {
      name: "technology",
      label: "Technology capabilities (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Web applications: Next.js, React, Node.js\nMobile: React Native, Flutter\nDatabases: PostgreSQL",
    },
    tableField(
      "projects",
      "Selected projects / case studies",
      ["Project", "Client / sector", "What we delivered"],
      "School management system | Education | Attendance, fees and parent SMS for 1,200 students",
    ),
    { name: "team", label: "Our team", type: "textarea", wide: true },
    {
      name: "whyUs",
      label: "Why choose us (one per line)",
      type: "textarea",
      wide: true,
      default: () => commitments.map((commitment) => `${commitment.title} — ${commitment.copy}`).join("\n"),
    },
    { name: "contactName", label: "Contact person", type: "text" },
    { name: "email", label: "Email", type: "text", default: (context) => context.letterhead.email },
    { name: "phone", label: "Phone", type: "text", default: (context) => context.letterhead.phone },
    { name: "website", label: "Website", type: "text", default: (context) => context.letterhead.website },
    { name: "address", label: "Address", type: "text", default: (context) => context.letterhead.address },
  ],
  build(values, context) {
    const capability = optional(values, "format") === "Capability statement";
    const about = prose(values, "about", "About the company");
    const projects = tableRows(values, "projects", 3);
    const heading = (title: string): Block => ({ kind: "heading", text: title });
    const contact: [string, string][] = [
      ["Company", company(context)],
      ...(optional(values, "contactName")
        ? [["Contact person", optional(values, "contactName")!] as [string, string]]
        : []),
      ["Email", text(values, "email", "Email")],
      ["Phone", text(values, "phone", "Phone")],
      ...(optional(values, "website") ? [["Website", optional(values, "website")!] as [string, string]] : []),
      ["Address", text(values, "address", "Address")],
      ...(capability && context.letterhead.registration
        ? [["Registration", context.letterhead.registration] as [string, string]]
        : []),
    ];
    return {
      title: capability ? "Capability Statement" : "Company Profile",
      subtitle: context.letterhead.tagline || undefined,
      date: date(values, "date", "Date"),
      recipient: optional(values, "preparedFor") ? [`Prepared for ${optional(values, "preparedFor")}`] : undefined,
      blocks: capability
        ? [
            heading("Company overview"),
            about[0]!,
            heading("Core competencies"),
            bullets(values, "services", "Services"),
            heading("Technology capabilities"),
            bullets(values, "technology", "Technology capabilities"),
            heading("Past performance"),
            table(
              ["Project", "Client / sector", "What we delivered"],
              projects.slice(0, CAPABILITY_PROJECTS),
              "Selected projects",
            ),
            heading("Differentiators"),
            bullets(values, "whyUs", "Why choose us"),
            heading("Company data and contact"),
            { kind: "terms", rows: contact },
          ]
        : [
            heading("About us"),
            ...about,
            heading("Our services"),
            bullets(values, "services", "Services"),
            ...when(lines(values, "industries").length > 0, () => [
              heading("Industries we serve"),
              bullets(values, "industries", ""),
            ]),
            heading("Technology capabilities"),
            bullets(values, "technology", "Technology capabilities"),
            heading("Selected projects"),
            table(["Project", "Client / sector", "What we delivered"], projects, "Selected projects"),
            ...when(has(values, "team"), () => [heading("Our team"), ...paragraphs(values, "team")]),
            heading("Why work with us"),
            bullets(values, "whyUs", "Why choose us"),
            heading("Contact us"),
            { kind: "terms", rows: contact },
          ],
    };
  },
};

/** In the order a client meets them: introduction, discovery, requirements, proposal, onboarding. */
export const SALES_TEMPLATES: readonly DocumentTemplate[] = [
  companyProfile,
  discoveryReport,
  clientRequirements,
  projectProposal,
  clientOnboarding,
];
