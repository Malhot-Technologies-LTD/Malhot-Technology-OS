import type { Block } from "../content";
import {
  common,
  company,
  date,
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
 * HR & Recruitment templates. The originals in this category live in ../templates.ts.
 *
 * Templates about one person use `employeeName` and `position` for that
 * person's name and title, so the generator can pre-fill them when it is
 * opened from someone's page.
 */

const employeeNameField: FieldDef = {
  name: "employeeName",
  label: "Employee's full name",
  type: "text",
  required: true,
};
const positionField: FieldDef = { name: "position", label: "Position", type: "text", required: true };

const CHECKLIST_COLUMNS = ["Item", "Done", "Notes"] as const;

/** Default rows for a checklist textarea: one item per line, Done and Notes left to fill in. */
function checklistDefault(items: readonly string[]): string {
  return items.map((item) => `${item} | | `).join("\n");
}

/** A list from a textarea, or a single gap naming what to fill in. */
function listOrGap(values: Values, name: string, label: string): Block {
  const list = lines(values, name);
  return { kind: "list", items: list.length > 0 ? list : [`[${label}]`] };
}

/** Paragraphs from a textarea, or a single gap paragraph. */
function paragraphsOrGap(values: Values, name: string, label: string): Block[] {
  const blocks = paragraphs(values, name);
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: `[${label}]` }];
}

/** A heading and list, only when the textarea has something in it. */
function optionalList(values: Values, name: string, heading: string): Block[] {
  const list = lines(values, name);
  return list.length > 0
    ? [
        { kind: "heading", text: heading },
        { kind: "list", items: list },
      ]
    : [];
}

function companySignature(values: Values, context: TemplateContext, role?: string) {
  return {
    role: role ?? `For ${company(context)}`,
    name: text(values, "signatoryName", "Signatory"),
    title: optional(values, "signatoryTitle") ?? undefined,
  };
}

// Leave ------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Milliseconds for a real "YYYY-MM-DD" date (UTC), or null for anything else, e.g. "2026-02-30". */
function isoDay(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
  return time;
}

/**
 * Working days (Monday to Friday) from start to end, both included, or null
 * when either date is missing or invalid or the end is before the start.
 * Public holidays are not known here, so they are not deducted.
 */
export function workingDays(start: string | null, end: string | null): number | null {
  const from = isoDay(start);
  const to = isoDay(end);
  if (from === null || to === null || to < from) return null;
  const total = Math.round((to - from) / DAY_MS) + 1;
  const firstWeekday = new Date(from).getUTCDay();
  let days = Math.floor(total / 7) * 5;
  for (let offset = 0; offset < total % 7; offset++) {
    const weekday = (firstWeekday + offset) % 7;
    if (weekday !== 0 && weekday !== 6) days++;
  }
  return days;
}

function leaveDays(values: Values): string {
  const override = optional(values, "days");
  if (override) return override;
  const days = workingDays(optional(values, "startDate"), optional(values, "endDate"));
  if (days === null) return "[Number of working days]";
  return `${days} working ${days === 1 ? "day" : "days"}`;
}

// Templates --------------------------------------------------------------------

const jobDescription: DocumentTemplate = {
  key: "job_description",
  name: "Job description",
  category: "HR & Recruitment",
  documentType: "other",
  summary: "A role to advertise or hire for: purpose, responsibilities, requirements, what we offer and how to apply.",
  fields: [
    common.reference("MAL/HR"),
    common.date,
    { ...positionField, placeholder: "e.g. Backend Developer" },
    { name: "department", label: "Department / team", type: "text", placeholder: "e.g. Engineering" },
    { name: "reportsTo", label: "Reports to", type: "text" },
    {
      name: "employmentType",
      label: "Employment type",
      type: "select",
      options: ["Full-time, permanent", "Full-time, fixed term", "Part-time", "Contract", "Internship"],
      default: () => "Full-time, permanent",
    },
    { name: "location", label: "Location", type: "text", default: () => "Kigali, Rwanda" },
    { name: "purpose", label: "Purpose of the role", type: "textarea", wide: true, required: true },
    {
      name: "responsibilities",
      label: "Responsibilities (one per line)",
      type: "textarea",
      wide: true,
      required: true,
    },
    { name: "requirements", label: "Requirements (one per line)", type: "textarea", wide: true, required: true },
    { name: "qualifications", label: "Qualifications (optional, one per line)", type: "textarea", wide: true },
    { name: "experience", label: "Experience (optional, one per line)", type: "textarea", wide: true },
    { name: "skills", label: "Skills (optional, one per line)", type: "textarea", wide: true },
    { name: "offer", label: "What we offer (optional, one per line)", type: "textarea", wide: true },
    {
      name: "howToApply",
      label: "How to apply",
      type: "textarea",
      wide: true,
      default: (context) =>
        context.letterhead.email
          ? `Send your CV and a short cover letter to ${context.letterhead.email}, with the position title in the subject line.`
          : "",
    },
    { name: "applyBy", label: "Applications close (optional)", type: "date" },
  ],
  build(values, context) {
    const reportsTo = optional(values, "reportsTo");
    const department = optional(values, "department");
    const applyBy = optional(values, "applyBy");
    return {
      title: "Job Description",
      subtitle: text(values, "position", "Position"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Position", text(values, "position", "Position")],
            ...(department ? ([["Department", department]] as const) : []),
            ...(reportsTo ? ([["Reports to", reportsTo]] as const) : []),
            ["Employment type", text(values, "employmentType", "Employment type")],
            ["Location", text(values, "location", "Location")],
            ["Employer", company(context)],
          ],
        },
        { kind: "heading", text: "Purpose of the role" },
        ...paragraphsOrGap(values, "purpose", "Purpose of the role"),
        { kind: "heading", text: "Responsibilities" },
        listOrGap(values, "responsibilities", "Responsibilities"),
        { kind: "heading", text: "Requirements" },
        listOrGap(values, "requirements", "Requirements"),
        ...optionalList(values, "qualifications", "Qualifications"),
        ...optionalList(values, "experience", "Experience"),
        ...optionalList(values, "skills", "Skills"),
        ...optionalList(values, "offer", "What we offer"),
        { kind: "heading", text: "How to apply" },
        ...paragraphsOrGap(values, "howToApply", "How to apply"),
        ...(applyBy
          ? ([{ kind: "note", text: `Applications close on ${date(values, "applyBy", "Closing date")}.` }] as const)
          : []),
      ],
    };
  },
};

const onboardingChecklist: DocumentTemplate = {
  key: "onboarding_checklist",
  name: "Employee onboarding checklist",
  category: "HR & Recruitment",
  documentType: "other",
  summary: "Everything a new starter needs before and in their first days: contract, documents, equipment and access.",
  fields: [
    employeeNameField,
    positionField,
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "manager", label: "Manager", type: "text", required: true },
    {
      name: "checklist",
      label: "Checklist (one per line: Item | Done | Notes)",
      type: "textarea",
      wide: true,
      hint: 'Tick items by writing "Yes" in the Done column, or leave it blank to tick on paper.',
      default: () =>
        checklistDefault([
          "Personal information collected",
          "Employment contract signed",
          "ID documents copied (national ID / passport)",
          "Equipment issued (laptop, accessories)",
          "Company email account created",
          "Accounts and access permissions granted (GitHub, cloud, tools)",
          "Company policies read and acknowledged",
          "Orientation completed",
          "Manager / buddy assigned",
        ]),
    },
    { name: "notes", label: "Notes (optional)", type: "textarea", wide: true },
    { name: "hrName", label: "Completed by (HR)", type: "text" },
  ],
  build(values) {
    const employee = text(values, "employeeName", "Employee's full name");
    return {
      title: "Employee Onboarding Checklist",
      subtitle: employee,
      date: date(values, "startDate", "Start date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Employee", employee],
            ["Position", text(values, "position", "Position")],
            ["Start date", date(values, "startDate", "Start date")],
            ["Manager", text(values, "manager", "Manager")],
          ],
        },
        { kind: "heading", text: "Checklist" },
        table(CHECKLIST_COLUMNS, tableRows(values, "checklist", 3), "Checklist items"),
        ...(optional(values, "notes")
          ? ([{ kind: "heading", text: "Notes" }, ...paragraphs(values, "notes")] as const)
          : []),
        {
          kind: "paragraph",
          text: "By signing, we confirm that the items above were completed or are followed up as noted.",
        },
        {
          kind: "signatures",
          parties: [
            { role: "Employee", name: employee },
            { role: "Manager", name: text(values, "manager", "Manager") },
            { role: "HR", name: optional(values, "hrName") ?? "" },
          ],
        },
      ],
    };
  },
};

const LEAVE_TYPES = ["Annual", "Sick", "Maternity / Paternity", "Compassionate", "Unpaid", "Other"] as const;

const leaveRequest: DocumentTemplate = {
  key: "leave_request",
  name: "Leave request",
  category: "HR & Recruitment",
  documentType: "other",
  summary: "A request for time off: type, dates, working days, handover and approval by the manager and HR.",
  fields: [
    common.date,
    employeeNameField,
    positionField,
    { name: "leaveType", label: "Type of leave", type: "select", options: LEAVE_TYPES, default: () => LEAVE_TYPES[0] },
    { name: "startDate", label: "First day of leave", type: "date", required: true },
    { name: "endDate", label: "Last day of leave", type: "date", required: true },
    {
      name: "days",
      label: "Working days (optional)",
      type: "text",
      hint: "Leave empty to count Monday to Friday between the dates. Enter a figure to deduct public holidays.",
    },
    { name: "reason", label: "Reason (optional)", type: "textarea", wide: true },
    {
      name: "handover",
      label: "Handover arrangements",
      type: "textarea",
      wide: true,
      required: true,
      placeholder: "Who covers your work, open tasks, where to find things",
    },
    { name: "contact", label: "Contact while away (optional)", type: "text" },
    { name: "managerName", label: "Manager", type: "text" },
    { name: "hrName", label: "HR", type: "text" },
  ],
  build(values) {
    const employee = text(values, "employeeName", "Employee's full name");
    const leaveType = text(values, "leaveType", "Type of leave");
    const contact = optional(values, "contact");
    return {
      title: "Leave Request",
      subtitle: `${leaveType} leave`,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Employee", employee],
            ["Position", text(values, "position", "Position")],
            ["Type of leave", leaveType],
            ["From", date(values, "startDate", "First day of leave")],
            ["To", date(values, "endDate", "Last day of leave")],
            ["Working days", leaveDays(values)],
            ...(contact ? ([["Contact while away", contact]] as const) : []),
          ],
        },
        ...(optional(values, "reason")
          ? ([{ kind: "heading", text: "Reason" }, ...paragraphs(values, "reason")] as const)
          : []),
        { kind: "heading", text: "Handover arrangements" },
        ...paragraphsOrGap(values, "handover", "Handover arrangements"),
        { kind: "heading", text: "Approval" },
        table(
          ["Approver", "Name", "Decision", "Date"],
          [
            ["Manager", optional(values, "managerName") ?? "", "Approved / Not approved", ""],
            ["HR", optional(values, "hrName") ?? "", "Approved / Not approved", ""],
          ],
          "Approvers",
        ),
        {
          kind: "note",
          text: "Working days count Monday to Friday. Public holidays falling within the period are not counted as leave.",
        },
        {
          kind: "signatures",
          parties: [
            { role: "Employee", name: employee },
            { role: "Manager approval", name: optional(values, "managerName") ?? "" },
            { role: "HR approval", name: optional(values, "hrName") ?? "" },
          ],
        },
      ],
    };
  },
};

const performanceReview: DocumentTemplate = {
  key: "performance_review",
  name: "Performance review",
  category: "HR & Recruitment",
  documentType: "other",
  summary: "A review for one period: goals and results, achievements, development, feedback and next objectives.",
  fields: [
    common.date,
    employeeNameField,
    positionField,
    { name: "reviewer", label: "Reviewer", type: "text", required: true },
    { name: "period", label: "Review period", type: "text", required: true, placeholder: "e.g. January – June 2026" },
    {
      name: "ratingScale",
      label: "Rating scale",
      type: "text",
      default: () =>
        "1 Below expectations · 2 Partly meets · 3 Meets expectations · 4 Exceeds expectations · 5 Outstanding",
    },
    {
      name: "goals",
      label: "Goals (one per line: Goal | Result | Rating)",
      type: "textarea",
      wide: true,
      required: true,
    },
    { name: "achievements", label: "Key achievements (one per line)", type: "textarea", wide: true },
    { name: "development", label: "Areas for development (one per line)", type: "textarea", wide: true },
    {
      name: "skills",
      label: "Skills (one per line: Skill | Rating | Comment)",
      type: "textarea",
      wide: true,
      default: () =>
        ["Technical quality", "Delivery and reliability", "Communication", "Teamwork", "Problem solving", "Ownership"]
          .map((skill) => `${skill} | | `)
          .join("\n"),
    },
    { name: "overallRating", label: "Overall rating (optional)", type: "text" },
    { name: "managerFeedback", label: "Manager's feedback", type: "textarea", wide: true },
    { name: "employeeFeedback", label: "Employee's comments", type: "textarea", wide: true },
    { name: "objectives", label: "Objectives for the next period (one per line)", type: "textarea", wide: true },
  ],
  build(values) {
    const employee = text(values, "employeeName", "Employee's full name");
    const overall = optional(values, "overallRating");
    return {
      title: "Performance Review",
      subtitle: `${employee} — ${text(values, "period", "Review period")}`,
      date: date(values, "date", "Date"),
      classification: "Confidential",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Employee", employee],
            ["Position", text(values, "position", "Position")],
            ["Reviewer", text(values, "reviewer", "Reviewer")],
            ["Review period", text(values, "period", "Review period")],
            ...(overall ? ([["Overall rating", overall]] as const) : []),
          ],
        },
        ...(optional(values, "ratingScale")
          ? ([{ kind: "note", text: `Rating scale: ${optional(values, "ratingScale")}` }] as const)
          : []),
        { kind: "heading", text: "Goals and results" },
        table(["Goal", "Result", "Rating"], tableRows(values, "goals", 3), "Goals"),
        ...optionalList(values, "achievements", "Key achievements"),
        ...optionalList(values, "development", "Areas for development"),
        ...(tableRows(values, "skills", 3).length > 0
          ? ([
              { kind: "heading", text: "Skills" },
              table(["Skill", "Rating", "Comment"], tableRows(values, "skills", 3), "Skills"),
            ] as const)
          : []),
        { kind: "heading", text: "Manager's feedback" },
        ...paragraphsOrGap(values, "managerFeedback", "Manager's feedback"),
        { kind: "heading", text: "Employee's comments" },
        ...paragraphsOrGap(values, "employeeFeedback", "Employee's comments"),
        { kind: "heading", text: "Objectives for the next period" },
        listOrGap(values, "objectives", "Objectives"),
        {
          kind: "paragraph",
          text: "The employee's signature confirms that this review was discussed with them; it does not necessarily mean agreement with every point. The employee's comments above form part of the record.",
        },
        {
          kind: "signatures",
          parties: [
            { role: "Employee", name: employee },
            { role: "Reviewer", name: text(values, "reviewer", "Reviewer") },
          ],
        },
      ],
    };
  },
};

const ADJUSTMENT_TYPES = ["Promotion", "Salary adjustment", "Promotion and salary adjustment"] as const;

const promotionLetter: DocumentTemplate = {
  key: "promotion_salary_letter",
  name: "Promotion / salary adjustment letter",
  category: "HR & Recruitment",
  documentType: "other",
  summary: "Confirms a promotion, a change in pay, or both, from an effective date, with the other terms unchanged.",
  fields: [
    common.reference("MAL/HR"),
    common.date,
    {
      name: "adjustmentType",
      label: "Type",
      type: "select",
      options: ADJUSTMENT_TYPES,
      default: () => ADJUSTMENT_TYPES[0],
    },
    employeeNameField,
    { ...positionField, label: "Current position" },
    {
      name: "newPosition",
      label: "New position",
      type: "text",
      hint: "For a promotion.",
      placeholder: "e.g. Senior Developer",
    },
    { name: "effectiveDate", label: "Effective date", type: "date", required: true },
    {
      name: "newCompensation",
      label: "New compensation",
      type: "text",
      hint: "For a salary adjustment. Leave empty on a promotion alone to keep the current pay.",
      placeholder: "e.g. RWF 1,200,000 per month",
    },
    { name: "reason", label: "Reason (optional)", type: "textarea", wide: true },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const employer = company(context);
    const employee = text(values, "employeeName", "Employee's full name");
    const type = optional(values, "adjustmentType") ?? ADJUSTMENT_TYPES[0];
    const promotion = type !== "Salary adjustment";
    const salary = type !== "Promotion";
    const effective = date(values, "effectiveDate", "Effective date");
    const newPosition = text(values, "newPosition", "New position");
    const newCompensation = optional(values, "newCompensation");
    const title =
      type === "Promotion"
        ? "Letter of Promotion"
        : type === "Salary adjustment"
          ? "Salary Adjustment"
          : "Promotion and Salary Adjustment";
    const opening = promotion
      ? `We are pleased to confirm your promotion from ${text(values, "position", "Current position")} to ${newPosition} at ${employer}, effective ${effective}.`
      : `We are pleased to confirm an adjustment to your compensation as ${text(values, "position", "Current position")} at ${employer}, effective ${effective}.`;
    return {
      title,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [employee, text(values, "position", "Current position"), employer],
      classification: "Private and confidential",
      blocks: [
        { kind: "paragraph", text: `Dear ${employee},` },
        { kind: "paragraph", text: opening },
        {
          kind: "terms",
          rows: [
            ["Effective Date", effective],
            ...(promotion ? ([["New Position", newPosition]] as const) : []),
            ...(salary || newCompensation
              ? ([["New Compensation", newCompensation ?? "[New compensation]"]] as const)
              : []),
          ],
        },
        ...(promotion && !salary && !newCompensation
          ? ([{ kind: "paragraph", text: "Your compensation remains unchanged." }] as const)
          : []),
        ...paragraphs(values, "reason"),
        {
          kind: "paragraph",
          text: "All other terms and conditions of your employment agreement remain unchanged.",
        },
        {
          kind: "paragraph",
          text: `Thank you for your contribution to ${employer}. Please sign a copy of this letter to confirm receipt and return it to us.`,
        },
        {
          kind: "signatures",
          parties: [companySignature(values, context), { role: "Received by the employee", name: employee }],
        },
      ],
    };
  },
};

const offboardingChecklist: DocumentTemplate = {
  key: "offboarding_checklist",
  name: "Employee offboarding checklist",
  category: "HR & Recruitment",
  documentType: "other",
  summary:
    "Closes a departure safely: every access removed, credentials rotated, property returned and final pay settled.",
  fields: [
    employeeNameField,
    positionField,
    { name: "manager", label: "Manager", type: "text", required: true },
    { name: "lastDay", label: "Final working day", type: "date", required: true },
    {
      name: "reasonForLeaving",
      label: "Reason for leaving (optional)",
      type: "text",
      placeholder: "e.g. Resignation, end of contract",
    },
    {
      name: "checklist",
      label: "Checklist (one per line: Item | Done | Notes)",
      type: "textarea",
      wide: true,
      hint: 'Tick items by writing "Yes" in the Done column, or leave it blank to tick on paper.',
      default: () =>
        checklistDefault([
          "Final working day confirmed in writing",
          "Laptop and equipment returned",
          "Company email disabled and forwarding set",
          "GitHub organisation access removed",
          "Cloud console access removed (AWS / GCP / Azure / hosting)",
          "Database access removed",
          "VPN and remote access removed",
          "Shared passwords, API keys and credentials rotated",
          "Other tools and SaaS accounts removed",
          "Company property returned (keys, access cards, documents)",
          "Knowledge transfer and handover completed",
          "Final payments and leave balance settled",
          "Exit interview held",
        ]),
    },
    { name: "notes", label: "Notes (optional)", type: "textarea", wide: true },
    { name: "hrName", label: "HR", type: "text" },
  ],
  build(values) {
    const employee = text(values, "employeeName", "Employee's full name");
    const reason = optional(values, "reasonForLeaving");
    return {
      title: "Employee Offboarding Checklist",
      subtitle: employee,
      date: date(values, "lastDay", "Final working day"),
      classification: "Confidential",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Employee", employee],
            ["Position", text(values, "position", "Position")],
            ["Manager", text(values, "manager", "Manager")],
            ["Final working day", date(values, "lastDay", "Final working day")],
            ...(reason ? ([["Reason for leaving", reason]] as const) : []),
          ],
        },
        {
          kind: "note",
          text: "All access must be removed, and any credentials the employee knew rotated, no later than the end of the final working day.",
        },
        { kind: "heading", text: "Checklist" },
        table(CHECKLIST_COLUMNS, tableRows(values, "checklist", 3), "Checklist items"),
        ...(optional(values, "notes")
          ? ([{ kind: "heading", text: "Notes" }, ...paragraphs(values, "notes")] as const)
          : []),
        {
          kind: "paragraph",
          text: "The employee confirms that all company property, data and credentials have been returned and that no copies are kept. Confidentiality and intellectual property obligations continue after employment ends.",
        },
        {
          kind: "signatures",
          parties: [
            { role: "Employee", name: employee },
            { role: "Manager", name: text(values, "manager", "Manager") },
            { role: "HR", name: optional(values, "hrName") ?? "" },
          ],
        },
      ],
    };
  },
};

const WARNING_LEVELS = ["Verbal warning record", "First written warning", "Final written warning"] as const;

function defaultConsequences(level: string): string {
  if (level === "Final written warning")
    return "This is a final warning. If the required improvement is not made, or further misconduct occurs, your employment may be terminated in accordance with the applicable labour law.";
  return "If the required improvement is not made, or further misconduct occurs, further disciplinary action may be taken, which may include a final written warning or termination of employment in accordance with the applicable labour law.";
}

const disciplinaryNotice: DocumentTemplate = {
  key: "disciplinary_notice",
  name: "Warning / disciplinary notice",
  category: "HR & Recruitment",
  documentType: "other",
  summary:
    "A recorded warning: what happened, the policy concerned, the improvement expected and the right to respond.",
  legal: true,
  fields: [
    common.reference("MAL/HR"),
    common.date,
    employeeNameField,
    positionField,
    { name: "level", label: "Level", type: "select", options: WARNING_LEVELS, default: () => WARNING_LEVELS[1] },
    { name: "incidentDate", label: "Date of the incident", type: "date" },
    { name: "incident", label: "What happened", type: "textarea", wide: true, required: true },
    { name: "policy", label: "Policy or standard concerned", type: "text", required: true },
    {
      name: "previousWarnings",
      label: "Previous warnings",
      type: "textarea",
      wide: true,
      placeholder: 'e.g. "First written warning, 3 March 2026", or "None"',
    },
    { name: "improvement", label: "Improvement expected (one per line)", type: "textarea", wide: true, required: true },
    { name: "reviewDate", label: "Progress reviewed on (optional)", type: "date" },
    {
      name: "consequences",
      label: "Consequences (optional)",
      type: "textarea",
      wide: true,
      placeholder: "Leave empty for the standard wording for the level",
    },
    { name: "responseDays", label: "Time to respond", type: "text", default: () => "five (5) working days" },
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const employer = company(context);
    const employee = text(values, "employeeName", "Employee's full name");
    const level = optional(values, "level") ?? WARNING_LEVELS[1];
    const incidentDate = optional(values, "incidentDate");
    const reviewDate = optional(values, "reviewDate");
    return {
      title: "Disciplinary Notice",
      subtitle: level,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [employee, text(values, "position", "Position")],
      classification: "Private and confidential",
      blocks: [
        { kind: "paragraph", text: `Dear ${employee},` },
        {
          kind: "paragraph",
          text: `This notice records a ${level.toLowerCase()} issued to you by ${employer}. Its purpose is to set out clearly what the concern is and what is expected, so that it can be put right.`,
        },
        { kind: "heading", text: "What happened" },
        ...(incidentDate
          ? ([{ kind: "terms", rows: [["Date of the incident", date(values, "incidentDate", "Date")]] }] as const)
          : []),
        ...paragraphsOrGap(values, "incident", "What happened"),
        { kind: "heading", text: "Policy or standard concerned" },
        { kind: "paragraph", text: text(values, "policy", "Policy or standard concerned") },
        { kind: "heading", text: "Previous warnings" },
        ...paragraphsOrGap(values, "previousWarnings", "Previous warnings, or none"),
        { kind: "heading", text: "Improvement expected" },
        listOrGap(values, "improvement", "Improvement expected"),
        ...(reviewDate
          ? ([
              {
                kind: "paragraph",
                text: `Your progress will be reviewed with you on ${date(values, "reviewDate", "Review date")}.`,
              },
            ] as const)
          : []),
        { kind: "heading", text: "Consequences" },
        ...(optional(values, "consequences")
          ? paragraphs(values, "consequences")
          : [{ kind: "paragraph", text: defaultConsequences(level) } as const]),
        { kind: "heading", text: "Your right to respond" },
        {
          kind: "paragraph",
          text: `You have the right to respond to this notice. You may give your account in writing within ${text(values, "responseDays", "Time to respond")} of receiving it, and your response will be kept on file with this notice. You may also ask to discuss it in a meeting.`,
        },
        {
          kind: "note",
          text: "The employee's signature confirms receipt of this notice only. It does not mean agreement with its contents.",
        },
        {
          kind: "signatures",
          parties: [
            companySignature(values, context, "Issued by"),
            { role: "Employee — receipt acknowledged", name: employee },
          ],
        },
      ],
    };
  },
};

export const HR_TEMPLATES: readonly DocumentTemplate[] = [
  jobDescription,
  onboardingChecklist,
  leaveRequest,
  performanceReview,
  promotionLetter,
  offboardingChecklist,
  disciplinaryNotice,
];
