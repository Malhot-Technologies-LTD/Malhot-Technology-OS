import { longDate, type Block } from "../content";
import {
  common,
  company,
  date,
  lines,
  money,
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
 * Projects templates, in the order a project lives through them: charter,
 * kickoff, status, minutes, risks, decisions, acceptance, handover. The
 * originals in this category live in ../templates.ts.
 *
 * These are the documents written about a project the system already knows,
 * so their fields default from context.project (name, client, dates, manager,
 * team, milestones) and nobody retypes it. Every one still works when there is
 * no project: the fields start empty and the page shows [gaps].
 */

// Shared fields ----------------------------------------------------------------

const projectField: FieldDef = {
  name: "projectName",
  label: "Project",
  type: "text",
  required: true,
  default: (context) => context.project?.name ?? "",
};

const clientField: FieldDef = {
  name: "clientName",
  label: "Client",
  type: "text",
  required: true,
  default: (context) => context.project?.clientName ?? "",
};

const managerField: FieldDef = {
  name: "projectManager",
  label: "Project manager",
  type: "text",
  default: (context) => context.project?.managerName ?? "",
};

const TEAM_HINT = 'One person per line: "Name | Role". Prefilled from the project team.';
const MILESTONE_HINT = 'One per line: "Milestone | Due date | Status". Prefilled from the project\'s milestones.';

function teamField(label: string): FieldDef {
  return {
    name: "team",
    label,
    type: "textarea",
    wide: true,
    hint: TEAM_HINT,
    placeholder: "Aline Uwase | Lead developer",
    default: teamDefault,
  };
}

const milestonesField: FieldDef = {
  name: "milestones",
  label: "Timeline & milestones",
  type: "textarea",
  wide: true,
  hint: MILESTONE_HINT,
  placeholder: "Design approved | 2026-10-15 | Open",
  default: milestonesDefault,
};

// Helpers ----------------------------------------------------------------------

function teamDefault(context: TemplateContext): string {
  return (context.project?.team ?? []).map((member) => `${member.name} | ${member.role}`).join("\n");
}

function milestonesDefault(context: TemplateContext): string {
  return (context.project?.milestones ?? [])
    .map((milestone) => `${milestone.title} | ${milestone.due ?? ""} | ${milestone.done ? "Done" : "Open"}`)
    .join("\n");
}

/** Writes ISO dates in the given columns out in full; anything else is left as typed. */
function withDates(rows: readonly string[][], columns: readonly number[]): string[][] {
  return rows.map((row) => row.map((cell, index) => (columns.includes(index) ? longDate(cell) : cell)));
}

/** A heading and its list, or nothing when the field is empty. */
function listSection(values: Values, name: string, title: string, ordered = false): Block[] {
  const list = lines(values, name);
  return list.length > 0
    ? [
        { kind: "heading", text: title },
        { kind: "list", items: list, ordered },
      ]
    : [];
}

/** A heading and its list, with a [gap] when the field is empty. */
function requiredList(values: Values, name: string, title: string, gap: string, ordered = false): Block[] {
  const list = lines(values, name);
  return [
    { kind: "heading", text: title },
    { kind: "list", items: list.length > 0 ? list : [`[${gap}]`], ordered },
  ];
}

/** A heading and its paragraphs, with a [gap] when the field is empty. */
function requiredParagraphs(values: Values, name: string, title: string, gap: string): Block[] {
  const body = paragraphs(values, name);
  return [
    { kind: "heading", text: title },
    ...(body.length > 0 ? body : [{ kind: "paragraph", text: `[${gap}]` } as const]),
  ];
}

function optionalFact(values: Values, name: string, label: string): [string, string][] {
  const value = optional(values, name);
  return value ? [[label, value]] : [];
}

const subtitle = (values: Values) =>
  `${text(values, "projectName", "Project")} — ${text(values, "clientName", "Client")}`;

// Templates --------------------------------------------------------------------

const charter: DocumentTemplate = {
  key: "project_charter",
  name: "Project charter",
  category: "Projects",
  documentType: "project_plan",
  summary: "Authorises a project: purpose, objectives, scope, people, budget, milestones, risks and success criteria.",
  fields: [
    common.reference("MAL/PRJ/CH"),
    common.date,
    projectField,
    clientField,
    { name: "sponsor", label: "Client sponsor", type: "text", placeholder: "Who approves for the client" },
    managerField,
    {
      name: "purpose",
      label: "Purpose",
      type: "textarea",
      wide: true,
      required: true,
      default: (context) => context.project?.description ?? "",
    },
    { name: "objectives", label: "Objectives (one per line)", type: "textarea", wide: true, required: true },
    { name: "inScope", label: "In scope (one per line)", type: "textarea", wide: true, required: true },
    { name: "outOfScope", label: "Out of scope (one per line)", type: "textarea", wide: true },
    {
      name: "stakeholders",
      label: "Stakeholders",
      type: "textarea",
      wide: true,
      hint: 'One per line: "Name | Role | Organisation".',
      placeholder: "Jean Mugabo | Operations director | Umoja Ltd",
    },
    teamField("Project team"),
    {
      name: "startDate",
      label: "Start date",
      type: "date",
      default: (context) => context.project?.startDate ?? "",
    },
    {
      name: "targetEndDate",
      label: "Target end date",
      type: "date",
      default: (context) => context.project?.targetEndDate ?? "",
    },
    common.currency,
    { name: "budget", label: "Budget", type: "number" },
    milestonesField,
    { name: "risks", label: "Key risks (one per line)", type: "textarea", wide: true },
    { name: "successCriteria", label: "Success criteria (one per line)", type: "textarea", wide: true, required: true },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    return {
      title: "Project Charter",
      subtitle: subtitle(values),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project", text(values, "projectName", "Project")],
            ["Client", text(values, "clientName", "Client")],
            ["Client sponsor", text(values, "sponsor", "Client sponsor")],
            ["Project manager", text(values, "projectManager", "Project manager")],
            ["Start date", date(values, "startDate", "Start date")],
            ["Target end date", date(values, "targetEndDate", "Target end date")],
            ["Budget", money(values, "budget", "Budget", currency)],
          ],
        },
        ...requiredParagraphs(values, "purpose", "Purpose", "Purpose"),
        ...requiredList(values, "objectives", "Objectives", "Objectives", true),
        ...requiredList(values, "inScope", "In scope", "In scope"),
        ...requiredList(values, "outOfScope", "Out of scope", "Out of scope"),
        { kind: "heading", text: "Stakeholders" },
        table(["Name", "Role", "Organisation"], tableRows(values, "stakeholders", 3), "Stakeholders"),
        { kind: "heading", text: "Project team" },
        table(["Name", "Role"], tableRows(values, "team", 2), "Project team"),
        { kind: "heading", text: "Timeline & milestones" },
        table(["Milestone", "Due", "Status"], withDates(tableRows(values, "milestones", 3), [1]), "Milestones"),
        ...requiredList(values, "risks", "Key risks", "Risks"),
        ...requiredList(values, "successCriteria", "Success criteria", "Success criteria"),
        {
          kind: "paragraph",
          text: `By signing, ${company(context)} and ${text(values, "clientName", "Client")} approve this charter and authorise the project to proceed on the scope, budget and timeline above. Changes to them are agreed in writing.`,
        },
        {
          kind: "signatures",
          parties: [
            {
              role: `For ${company(context)}`,
              name: text(values, "signatoryName", "Signatory"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
            { role: "Project manager", name: optional(values, "projectManager") ?? "" },
            { role: `For ${text(values, "clientName", "Client")}`, name: optional(values, "sponsor") ?? "" },
          ],
        },
      ],
    };
  },
};

const kickoff: DocumentTemplate = {
  key: "project_kickoff",
  name: "Project kickoff document",
  category: "Projects",
  documentType: "project_plan",
  summary: "Starts a project on the same page: overview, who does what, how we communicate and the first actions.",
  fields: [
    common.reference("MAL/PRJ/KO"),
    { ...common.date, label: "Kickoff date" },
    projectField,
    clientField,
    managerField,
    {
      name: "overview",
      label: "Project overview",
      type: "textarea",
      wide: true,
      required: true,
      default: (context) => context.project?.description ?? "",
    },
    {
      ...teamField("Team & responsibilities"),
      hint: 'One person per line: "Name | Role | Responsibilities". Prefilled from the project team.',
      placeholder: "Aline Uwase | Lead developer | Backend and deployments",
    },
    {
      name: "communication",
      label: "Communication plan",
      type: "textarea",
      wide: true,
      placeholder: "Who the client contacts, on which channel, and how fast we reply",
      hint: "Leave a blank line between paragraphs.",
    },
    {
      name: "cadence",
      label: "Meeting cadence (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Weekly progress call with the client, Thursday 10:00\nDaily team stand-up, 09:00",
    },
    milestonesField,
    { name: "tools", label: "Tools (one per line)", type: "textarea", placeholder: "GitHub\nFigma\nGoogle Meet" },
    {
      name: "actions",
      label: "Immediate actions",
      type: "textarea",
      wide: true,
      hint: 'One per line: "Action | Owner | Due date".',
      placeholder: "Share brand assets | Client | 2026-10-03",
    },
  ],
  build(values) {
    return {
      title: "Project Kickoff",
      subtitle: subtitle(values),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Kickoff date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project", text(values, "projectName", "Project")],
            ["Client", text(values, "clientName", "Client")],
            ["Project manager", text(values, "projectManager", "Project manager")],
            ["Kickoff date", date(values, "date", "Kickoff date")],
          ],
        },
        ...requiredParagraphs(values, "overview", "Overview", "Project overview"),
        { kind: "heading", text: "Team & responsibilities" },
        table(["Name", "Role", "Responsibilities"], tableRows(values, "team", 3), "Team"),
        ...requiredParagraphs(values, "communication", "Communication plan", "Communication plan"),
        ...requiredList(values, "cadence", "Meeting cadence", "Meeting cadence"),
        { kind: "heading", text: "Milestones" },
        table(["Milestone", "Due", "Status"], withDates(tableRows(values, "milestones", 3), [1]), "Milestones"),
        ...listSection(values, "tools", "Tools"),
        { kind: "heading", text: "Immediate actions" },
        table(["Action", "Owner", "Due"], withDates(tableRows(values, "actions", 3), [2]), "Actions"),
      ],
    };
  },
};

const STATUSES = ["On track", "At risk", "Off track"] as const;

const statusReport: DocumentTemplate = {
  key: "project_status_report",
  name: "Project status report",
  category: "Projects",
  documentType: "project_plan",
  summary: "A short update for the client: overall status, progress, blockers, budget, timeline and decisions needed.",
  fields: [
    common.reference("MAL/PRJ/SR"),
    common.date,
    projectField,
    clientField,
    { name: "clientContact", label: "Addressed to", type: "text", placeholder: "Client contact's name" },
    { name: "periodFrom", label: "Period from", type: "date", required: true },
    { name: "periodTo", label: "Period to", type: "date", required: true, default: (context) => context.today },
    {
      name: "overallStatus",
      label: "Overall status",
      type: "select",
      options: STATUSES,
      required: true,
      hint: "Chosen each report — never assumed.",
    },
    { name: "completed", label: "Completed this period (one per line)", type: "textarea", wide: true, required: true },
    { name: "inProgress", label: "In progress (one per line)", type: "textarea", wide: true },
    { name: "upcoming", label: "Coming up next (one per line)", type: "textarea", wide: true },
    { name: "blockers", label: "Blockers (one per line)", type: "textarea", wide: true },
    { name: "risks", label: "Risks (one per line)", type: "textarea", wide: true },
    { name: "budgetStatus", label: "Budget status", type: "text", placeholder: "e.g. 45% used, within budget" },
    {
      name: "timelineStatus",
      label: "Timeline status",
      type: "text",
      placeholder: "e.g. On schedule for launch on 15 December",
    },
    { name: "decisions", label: "Decisions needed from the client (one per line)", type: "textarea", wide: true },
    { ...managerField, label: "Prepared by" },
  ],
  build(values, context) {
    const period = `${date(values, "periodFrom", "Period from")} – ${date(values, "periodTo", "Period to")}`;
    return {
      title: "Project Status Report",
      subtitle: subtitle(values),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [
        ...(optional(values, "clientContact") ? [optional(values, "clientContact")!] : []),
        text(values, "clientName", "Client"),
      ],
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project", text(values, "projectName", "Project")],
            ["Reporting period", period],
            ["Overall status", text(values, "overallStatus", "Overall status")],
            ...optionalFact(values, "budgetStatus", "Budget"),
            ...optionalFact(values, "timelineStatus", "Timeline"),
          ],
        },
        ...requiredList(values, "completed", "Completed", "Completed this period"),
        ...listSection(values, "inProgress", "In progress"),
        ...listSection(values, "upcoming", "Coming up next"),
        ...listSection(values, "blockers", "Blockers"),
        ...listSection(values, "risks", "Risks"),
        ...listSection(values, "decisions", "Decisions needed from you", true),
        {
          kind: "signatures",
          parties: [{ role: `For ${company(context)}`, name: text(values, "projectManager", "Prepared by") }],
        },
      ],
    };
  },
};

/**
 * Old minutes wrote actions one per line as "what — who — by when"; lines
 * without a "|" are read that way so saved minutes still fill the table.
 */
function actionRows(values: Values): string[][] {
  const raw = optional(values, "actions");
  if (!raw) return [];
  const normalised = raw
    .split("\n")
    .map((line) =>
      line.includes("|")
        ? line
        : line
            .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
            .split(/\s+[—–]\s+/)
            .join(" | "),
    )
    .join("\n");
  return withDates(tableRows({ actions: normalised }, "actions", 3), [2]);
}

/** Replaces the original minutes in ../templates.ts: same key and field names, so saved minutes still open. */
const minutes: DocumentTemplate = {
  key: "meeting_minutes",
  name: "Meeting minutes",
  category: "Projects",
  documentType: "meeting_notes",
  summary: "Who attended, what was discussed and decided, and the actions with owners and deadlines.",
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
    { name: "chair", label: "Chaired by", type: "text", default: (context) => context.project?.managerName ?? "" },
    {
      name: "attendees",
      label: "Attendees (one per line)",
      type: "textarea",
      required: true,
      hint: "Prefilled with the project team — remove anyone who did not attend and add client attendees.",
      default: (context) => (context.project?.team ?? []).map((member) => `${member.name} (${member.role})`).join("\n"),
    },
    { name: "apologies", label: "Apologies (one per line)", type: "textarea" },
    { name: "agenda", label: "Agenda (one per line)", type: "textarea" },
    {
      name: "discussion",
      label: "Discussion",
      type: "textarea",
      wide: true,
      hint: "Leave a blank line between paragraphs.",
    },
    { name: "decisions", label: "Decisions (one per line)", type: "textarea", wide: true },
    {
      name: "actions",
      label: "Action items",
      type: "textarea",
      wide: true,
      hint: 'One per line: "Action | Responsible | Deadline".',
      placeholder: "Send revised wireframes | Aline | 2026-10-03",
    },
    {
      name: "nextMeeting",
      label: "Next meeting",
      type: "text",
      placeholder: "e.g. Thursday 9 October, 10:00, Google Meet",
    },
    { name: "minutedBy", label: "Minutes taken by", type: "text" },
  ],
  build(values) {
    const actions = actionRows(values);
    return {
      title: "Minutes of Meeting",
      subtitle: text(values, "meetingTitle", "Meeting"),
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Date", date(values, "date", "Date")],
            ...optionalFact(values, "location", "Where"),
            ...optionalFact(values, "chair", "Chaired by"),
            ...optionalFact(values, "minutedBy", "Minutes by"),
          ],
        },
        ...requiredList(values, "attendees", "Attendees", "Attendees"),
        ...listSection(values, "apologies", "Apologies"),
        ...listSection(values, "agenda", "Agenda", true),
        ...(optional(values, "discussion")
          ? ([{ kind: "heading", text: "Discussion" }, ...paragraphs(values, "discussion")] as const)
          : []),
        ...listSection(values, "decisions", "Decisions", true),
        ...(actions.length > 0
          ? ([
              { kind: "heading", text: "Action items" },
              table(["Action", "Responsible", "Deadline"], actions, "Actions"),
            ] as const)
          : []),
        ...(optional(values, "nextMeeting")
          ? ([{ kind: "note", text: `Next meeting: ${optional(values, "nextMeeting")}` }] as const)
          : []),
      ],
    };
  },
};

const riskRegister: DocumentTemplate = {
  key: "risk_register",
  name: "Risk register",
  category: "Projects",
  documentType: "project_plan",
  summary: "Every known project risk with its probability, impact, owner, mitigation and status.",
  fields: [
    common.reference("MAL/PRJ/RR"),
    { ...common.date, label: "Last reviewed" },
    projectField,
    clientField,
    { ...managerField, label: "Maintained by" },
    {
      name: "risks",
      label: "Risks",
      type: "textarea",
      wide: true,
      required: true,
      hint: 'One per line: "Risk | Probability | Impact | Owner | Mitigation | Status". Probability and impact: Low, Medium or High.',
      placeholder: "Client content arrives late | Medium | High | Aline | Agree content deadlines at kickoff | Open",
    },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  build(values) {
    return {
      title: "Risk Register",
      subtitle: subtitle(values),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Last reviewed"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project", text(values, "projectName", "Project")],
            ["Maintained by", text(values, "projectManager", "Maintained by")],
            ["Last reviewed", date(values, "date", "Last reviewed")],
          ],
        },
        table(
          ["Risk", "Probability", "Impact", "Owner", "Mitigation", "Status"],
          tableRows(values, "risks", 6),
          "Risks",
        ),
        ...paragraphs(values, "notes"),
      ],
    };
  },
};

const decisionLog: DocumentTemplate = {
  key: "decision_log",
  name: "Decision log",
  category: "Projects",
  documentType: "project_plan",
  summary: "A dated record of project decisions, why they were made and who approved them.",
  fields: [
    common.reference("MAL/PRJ/DL"),
    { ...common.date, label: "Last updated" },
    projectField,
    clientField,
    { ...managerField, label: "Maintained by" },
    {
      name: "decisions",
      label: "Decisions",
      type: "textarea",
      wide: true,
      required: true,
      hint: 'One per line: "Date | Decision | Reason | Approved by".',
      placeholder: "2026-10-02 | Use mobile money for payments | Most customers pay by MoMo | Jean Mugabo (client)",
    },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ],
  build(values) {
    return {
      title: "Decision Log",
      subtitle: subtitle(values),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Last updated"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project", text(values, "projectName", "Project")],
            ["Maintained by", text(values, "projectManager", "Maintained by")],
          ],
        },
        table(
          ["Date", "Decision", "Reason", "Approved by"],
          withDates(tableRows(values, "decisions", 4), [0]),
          "Decisions",
        ),
        ...paragraphs(values, "notes"),
      ],
    };
  },
};

const RESULTS = ["Accepted", "Accepted with conditions", "Not accepted"] as const;

function acceptanceStatement(result: string | null, client: string, subject: string): string {
  switch (result) {
    case "Accepted":
      return `${client} confirms that ${subject} has been tested against the cases below and is accepted.`;
    case "Accepted with conditions":
      return `${client} accepts ${subject} on condition that the outstanding issues below are resolved as agreed.`;
    case "Not accepted":
      return `${client} does not accept ${subject}. The issues below must be resolved and the failed cases re-tested.`;
    default:
      return `Result of acceptance testing of ${subject}: [Overall result].`;
  }
}

const uat: DocumentTemplate = {
  key: "uat_acceptance",
  name: "UAT / acceptance form",
  category: "Projects",
  documentType: "testing_report",
  summary: "The client's user acceptance testing: each test case, its result, outstanding issues and sign-off.",
  fields: [
    common.reference("MAL/PRJ/UAT"),
    common.date,
    projectField,
    clientField,
    { name: "release", label: "Release / version tested", type: "text", placeholder: "e.g. v1.0 release candidate" },
    { name: "environment", label: "Test environment", type: "text", placeholder: "e.g. staging.example.rw" },
    { name: "testers", label: "Tested by (one per line)", type: "textarea" },
    {
      name: "testCases",
      label: "Test cases",
      type: "textarea",
      wide: true,
      required: true,
      hint: 'One per line: "ID | Test case | Expected result | Actual result | Pass/Fail | Comments".',
      placeholder: "TC-01 | Staff member checks in | Check-in recorded with time | As expected | Pass |",
    },
    { name: "overallResult", label: "Overall result", type: "select", options: RESULTS, required: true },
    { name: "outstanding", label: "Outstanding issues (one per line)", type: "textarea", wide: true },
    common.signatory,
    common.signatoryTitle,
    { name: "clientSignatory", label: "Accepted for the client by", type: "text" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const cases = tableRows(values, "testCases", 6);
    const passed = cases.filter((row) => /^pass/i.test(row[4] ?? "")).length;
    const failed = cases.filter((row) => /^fail/i.test(row[4] ?? "")).length;
    const release = optional(values, "release");
    const subject = release
      ? `${release} of ${text(values, "projectName", "Project")}`
      : text(values, "projectName", "Project");
    return {
      title: "User Acceptance Testing",
      subtitle: subtitle(values),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project", text(values, "projectName", "Project")],
            ["Client", client],
            ...optionalFact(values, "release", "Release"),
            ...optionalFact(values, "environment", "Environment"),
            ...(cases.length > 0
              ? ([["Test cases", `${cases.length} (${passed} passed, ${failed} failed)`]] as const)
              : []),
            ["Overall result", text(values, "overallResult", "Overall result")],
          ],
        },
        ...listSection(values, "testers", "Tested by"),
        { kind: "heading", text: "Test cases" },
        table(["ID", "Test case", "Expected result", "Actual result", "Pass/Fail", "Comments"], cases, "Test cases"),
        ...listSection(values, "outstanding", "Outstanding issues", true),
        { kind: "heading", text: "Acceptance" },
        { kind: "paragraph", text: acceptanceStatement(optional(values, "overallResult"), client, subject) },
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

/** What was handed over, by kind; only the kinds filled in are printed. */
const HANDED_OVER: readonly { name: string; label: string; placeholder: string }[] = [
  {
    name: "sourceCode",
    label: "Source code",
    placeholder: "e.g. GitHub repository transferred to the client's organisation",
  },
  {
    name: "documentation",
    label: "Documentation",
    placeholder: "e.g. Administrator guide, API reference, user manual",
  },
  {
    name: "credentials",
    label: "Credentials & access",
    placeholder: "e.g. Admin accounts, delivered by password manager",
  },
  { name: "hosting", label: "Hosting", placeholder: "e.g. VPS at …, billing transferred to the client" },
  { name: "domains", label: "Domains", placeholder: "e.g. example.rw, registrar account transferred" },
  { name: "database", label: "Database", placeholder: "e.g. PostgreSQL, backups daily, restore tested" },
  {
    name: "thirdParty",
    label: "Third-party services",
    placeholder: "e.g. SMS gateway, mobile money API, email provider",
  },
  { name: "training", label: "Training given", placeholder: "e.g. 2 sessions for 6 administrators, 3 October" },
];

/** Replaces the original handover certificate in ../templates.ts: same key and field names. */
const handover: DocumentTemplate = {
  key: "handover_certificate",
  name: "Completion & handover certificate",
  category: "Projects",
  documentType: "final_report",
  summary: "Confirms a project was delivered and accepted: what was handed over, what is outstanding and what is owed.",
  fields: [
    common.reference("MAL/PRJ"),
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
      name: "completionDate",
      label: "Completion date",
      type: "date",
      default: (context) => context.project?.targetEndDate ?? "",
      hint: "Prefilled with the planned end date — change it to the actual completion date.",
    },
    managerField,
    { name: "deliverables", label: "Delivered systems (one per line)", type: "textarea", wide: true, required: true },
    ...HANDED_OVER.map((item): FieldDef => ({
      name: item.name,
      label: item.label,
      type: "text",
      wide: true,
      placeholder: item.placeholder,
    })),
    { name: "handedOver", label: "Anything else handed over (one per line)", type: "textarea", wide: true },
    {
      name: "outstanding",
      label: "Outstanding items",
      type: "textarea",
      wide: true,
      hint: 'One per line: "Item | Owner | Due date". Write "None" if nothing is outstanding.',
      placeholder: "Configure backup alerts | Malhot Tech | 2026-10-10",
    },
    {
      name: "supportPeriod",
      label: "Warranty / support period",
      type: "text",
      placeholder: "e.g. 3 months of free bug fixes",
    },
    { name: "warrantyEnds", label: "Warranty ends", type: "date" },
    common.currency,
    { name: "finalAmount", label: "Final contract amount", type: "number" },
    { name: "outstandingBalance", label: "Outstanding balance", type: "number", hint: "0 if fully paid." },
    teamField("Project team"),
    { name: "remarks", label: "Remarks", type: "textarea", wide: true },
    common.signatory,
    common.signatoryTitle,
    { name: "clientSignatory", label: "Accepted for the client by", type: "text" },
  ],
  build(values, context) {
    const client = text(values, "clientName", "Client");
    const project = text(values, "projectName", "Project");
    const currency = text(values, "currency", "Currency");
    const deliverables = lines(values, "deliverables");
    const handedOver = HANDED_OVER.flatMap((item) => {
      const value = optional(values, item.name);
      return value ? [[item.label, value]] : [];
    });
    const outstanding = tableRows(values, "outstanding", 3);
    const warranty: Block[] = [
      ...optionalFact(values, "supportPeriod", "Support period").map(([, value]): Block => ({
        kind: "paragraph",
        text: `Support period: ${value}.`,
      })),
      ...(optional(values, "warrantyEnds")
        ? [
            {
              kind: "paragraph",
              text: `Defects reported before ${date(values, "warrantyEnds", "Warranty ends")} will be corrected under the warranty in the services agreement.`,
            } as const,
          ]
        : []),
    ];
    return {
      title: "Project Completion and Handover Certificate",
      subtitle: project,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Client", client],
            ["Project", project],
            ["Project start", date(values, "startDate", "Project start")],
            ["Completed", date(values, "completionDate", "Completion date")],
            ["Project manager", text(values, "projectManager", "Project manager")],
          ],
        },
        {
          kind: "paragraph",
          text: `${company(context)} confirms that the ${project} project for ${client} has been completed, and ${client} confirms that the deliverables below have been received and accepted.`,
        },
        { kind: "heading", text: "Delivered" },
        { kind: "list", items: deliverables.length > 0 ? deliverables : ["[Delivered systems]"] },
        { kind: "heading", text: "Handed over" },
        table(["Item", "Details"], handedOver, "What was handed over"),
        ...(lines(values, "handedOver").length > 0
          ? ([{ kind: "list", items: lines(values, "handedOver") }] as const)
          : []),
        { kind: "heading", text: "Outstanding items" },
        table(["Item", "Owner", "Due"], withDates(outstanding, [2]), "Outstanding items, or None"),
        { kind: "heading", text: "Warranty & support" },
        ...(warranty.length > 0 ? warranty : [{ kind: "paragraph", text: "[Warranty / support period]" } as const]),
        { kind: "heading", text: "Payment" },
        {
          kind: "facts",
          rows: [
            ["Final amount", money(values, "finalAmount", "Final amount", currency)],
            ["Outstanding balance", money(values, "outstandingBalance", "Outstanding balance", currency)],
          ],
        },
        { kind: "heading", text: "Project team" },
        table(["Name", "Role"], tableRows(values, "team", 2), "Project team"),
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

export const PROJECT_TEMPLATES: readonly DocumentTemplate[] = [
  charter,
  kickoff,
  statusReport,
  minutes,
  riskRegister,
  decisionLog,
  uat,
  handover,
];
