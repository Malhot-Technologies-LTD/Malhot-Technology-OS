import { longDate, type Block } from "../content";
import {
  common,
  date,
  lines,
  optional,
  paragraphs,
  ref,
  table,
  tableRows,
  text,
  today,
  type DocumentTemplate,
  type TemplateContext,
  type Values,
} from "../template-kit";

/**
 * Support templates. The originals in this category live in ../templates.ts.
 * Every section a template names is printed: what the author wrote, or a
 * visible [gap]. Fields say to write "None" where that is a real answer.
 */

// Local helpers ----------------------------------------------------------------

const projectName = (context: TemplateContext) => context.project?.name ?? "";
const clientName = (context: TemplateContext) => context.project?.clientName ?? "";

/** A heading and the author's paragraphs, or a gap naming what to write. */
function prose(values: Values, title: string, name: string): Block[] {
  const body = paragraphs(values, name);
  return [
    { kind: "heading", text: title },
    ...(body.length > 0 ? body : [{ kind: "paragraph", text: `[${title}]` } as const]),
  ];
}

/** A heading and a list (one item per line), or a gap naming what to write. */
function bullets(values: Values, title: string, name: string, ordered = false): Block[] {
  const list = lines(values, name);
  return [
    { kind: "heading", text: title },
    { kind: "list", items: list.length > 0 ? list : [`[${title}]`], ordered },
  ];
}

const NONE_HINT = "Write “None” if there are none.";
const NOT_ASSESSED = "Not yet assessed";
const TIME_HINT = "Kigali time (CAT), 24-hour: 2026-09-27 14:05";

/** "Critical" as chosen, or a gap while the level has not been assessed. */
function level(values: Values, name: string, label: string): string {
  const value = optional(values, name);
  return value && value !== NOT_ASSESSED ? value : `[${label}]`;
}

const DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/;

/** Minutes since the epoch for "2026-09-27 14:05" (or with a T), else null. Both ends share one clock. */
function parseDateTime(value: string | null): number | null {
  const match = value ? DATE_TIME.exec(value.trim()) : null;
  if (!match) return null;
  const [, day, hours, minutes] = match;
  if (Number(hours) > 23 || Number(minutes) > 59) return null;
  const time = Date.parse(`${day}T${hours}:${minutes}:00Z`);
  return Number.isNaN(time) ? null : time / 60000;
}

/** "27 September 2026, 14:05" when it parses; otherwise as typed, or a gap. */
function dateTime(values: Values, name: string, label: string): string {
  const raw = optional(values, name);
  if (!raw) return `[${label}]`;
  const match = DATE_TIME.exec(raw);
  return match && parseDateTime(raw) !== null ? `${longDate(match[1])}, ${match[2]}:${match[3]}` : raw;
}

/**
 * "2 h 15 min" between two "YYYY-MM-DD HH:MM" times, or null when either
 * does not parse or the end is before the start — the report then shows a
 * gap rather than a wrong number.
 */
export function incidentDuration(start: string | null, end: string | null): string | null {
  const from = parseDateTime(start);
  const to = parseDateTime(end);
  if (from === null || to === null || to < from) return null;
  const total = Math.round(to - from);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const parts = [days > 0 ? `${days} d` : "", hours > 0 ? `${hours} h` : "", minutes > 0 ? `${minutes} min` : ""];
  return parts.filter(Boolean).join(" ") || "0 min";
}

// Incident / downtime report ---------------------------------------------------

const incidentReport: DocumentTemplate = {
  key: "incident_report",
  name: "Incident / downtime report",
  category: "Support",
  documentType: "other",
  summary: "What broke, for how long, who was affected, why it happened and what stops it happening again.",
  fields: [
    { name: "incidentId", label: "Incident ID", type: "text", required: true, default: ref("INC") },
    { name: "date", label: "Report date", type: "date", default: today },
    { name: "systemName", label: "System / project", type: "text", default: projectName },
    { name: "clientName", label: "Client", type: "text", default: clientName },
    {
      name: "severity",
      label: "Severity",
      type: "select",
      options: [NOT_ASSESSED, "Critical", "High", "Medium", "Low"],
      default: () => NOT_ASSESSED,
      hint: "Critical: service down for everyone. High: a key feature down. Medium: degraded. Low: minor.",
    },
    {
      name: "startTime",
      label: "Started",
      type: "text",
      required: true,
      placeholder: "2026-09-27 14:05",
      hint: TIME_HINT,
    },
    {
      name: "endTime",
      label: "Resolved",
      type: "text",
      placeholder: "2026-09-27 16:20",
      hint: "Same format. Leave empty while ongoing — the duration is worked out from both.",
    },
    { name: "systemsAffected", label: "Systems affected (one per line)", type: "textarea", wide: true, required: true },
    { name: "impact", label: "Impact", type: "textarea", wide: true, hint: "Who could not do what, and how many." },
    {
      name: "timeline",
      label: "Timeline (one per line: Time | Event)",
      type: "textarea",
      wide: true,
      placeholder: "14:05 | Monitoring alert: site not responding\n14:12 | On-call engineer confirmed outage",
    },
    { name: "rootCause", label: "Root cause", type: "textarea", wide: true },
    { name: "resolution", label: "Resolution", type: "textarea", wide: true },
    { name: "preventive", label: "Preventive measures (one per line)", type: "textarea", wide: true },
    { name: "preparedBy", label: "Prepared by", type: "text", required: true },
  ],
  build(values) {
    const ended = optional(values, "endTime");
    const duration = incidentDuration(optional(values, "startTime"), ended);
    const client = optional(values, "clientName");
    const system = optional(values, "systemName");
    return {
      title: "Incident Report",
      subtitle: system ?? undefined,
      reference: text(values, "incidentId", "Incident ID"),
      date: date(values, "date", "Report date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Incident ID", text(values, "incidentId", "Incident ID")],
            ...(client ? ([["Client", client]] as const) : []),
            ["Severity", level(values, "severity", "Severity")],
            ["Started", dateTime(values, "startTime", "Start time")],
            ["Resolved", ended ? dateTime(values, "endTime", "End time") : "[End time — ongoing?]"],
            ["Duration", duration ?? "[Duration]"],
            ["Prepared by", text(values, "preparedBy", "Prepared by")],
          ],
        },
        ...bullets(values, "Systems affected", "systemsAffected"),
        ...prose(values, "Impact", "impact"),
        { kind: "heading", text: "Timeline" },
        table(["Time", "Event"], tableRows(values, "timeline", 2), "Timeline of events"),
        ...prose(values, "Root cause", "rootCause"),
        ...prose(values, "Resolution", "resolution"),
        ...bullets(values, "Preventive measures", "preventive"),
      ],
    };
  },
};

// Maintenance report -----------------------------------------------------------

const maintenanceReport: DocumentTemplate = {
  key: "maintenance_report",
  name: "Maintenance report",
  category: "Support",
  documentType: "other",
  summary: "The maintenance done for a client over a period: work, issues, fixes, updates and what comes next.",
  fields: [
    common.reference("MAL/MNT"),
    common.date,
    { name: "clientName", label: "Client", type: "text", required: true, default: clientName },
    { name: "projectName", label: "Project / system", type: "text", required: true, default: projectName },
    { name: "periodFrom", label: "Period from", type: "date", required: true },
    { name: "periodTo", label: "Period to", type: "date", required: true },
    { name: "workPerformed", label: "Work performed (one per line)", type: "textarea", wide: true, required: true },
    { name: "issues", label: "Issues discovered (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    { name: "fixes", label: "Fixes applied (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    {
      name: "updates",
      label: "Updates installed (one per line)",
      type: "textarea",
      wide: true,
      placeholder: "Next.js 16.1 → 16.2\nServer OS security patches",
      hint: NONE_HINT,
    },
    { name: "recommendations", label: "Recommendations (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    { name: "nextMaintenance", label: "Next maintenance", type: "date" },
    { name: "preparedBy", label: "Prepared by", type: "text", required: true },
  ],
  build(values) {
    const client = text(values, "clientName", "Client");
    return {
      title: "Maintenance Report",
      subtitle: text(values, "projectName", "Project / system"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Client", client],
            ["Project / system", text(values, "projectName", "Project / system")],
            ["Period", `${date(values, "periodFrom", "Period from")} – ${date(values, "periodTo", "Period to")}`],
            ["Prepared by", text(values, "preparedBy", "Prepared by")],
          ],
        },
        ...bullets(values, "Work performed", "workPerformed"),
        ...bullets(values, "Issues discovered", "issues"),
        ...bullets(values, "Fixes applied", "fixes"),
        ...bullets(values, "Updates installed", "updates"),
        ...bullets(values, "Recommendations", "recommendations"),
        {
          kind: "note",
          text: `Next maintenance: ${date(values, "nextMaintenance", "Next maintenance date")}`,
        },
      ],
    };
  },
};

// Support request --------------------------------------------------------------

const supportRequest: DocumentTemplate = {
  key: "support_request",
  name: "Support request",
  category: "Support",
  documentType: "other",
  summary: "A client's problem written down once: who reported it, what happens, how to reproduce it and who owns it.",
  fields: [
    { name: "requestId", label: "Request ID", type: "text", required: true, default: ref("SR") },
    { name: "date", label: "Date received", type: "date", default: today },
    { name: "receivedBy", label: "Received by", type: "text", required: true },
    { name: "clientName", label: "Client", type: "text", required: true, default: clientName },
    { name: "contactName", label: "Contact person", type: "text", required: true },
    { name: "contactDetails", label: "Contact phone / email", type: "text" },
    { name: "system", label: "System", type: "text", required: true, default: projectName },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      options: [NOT_ASSESSED, "Critical", "High", "Medium", "Low"],
      default: () => NOT_ASSESSED,
      hint: "Critical: system down. High: key feature broken. Medium: workaround exists. Low: question or minor issue.",
    },
    { name: "description", label: "Description", type: "textarea", wide: true, required: true },
    { name: "steps", label: "Steps to reproduce (one per line, in order)", type: "textarea", wide: true },
    { name: "expected", label: "Expected result", type: "textarea", wide: true },
    { name: "actual", label: "Actual result", type: "textarea", wide: true },
    {
      name: "attachments",
      label: "Attachments received (one per line)",
      type: "textarea",
      wide: true,
      hint: "Screenshots, logs or files the client sent, and where they are kept.",
    },
    { name: "assignedTo", label: "Assigned to", type: "text" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["New", "In progress", "Waiting on client", "Resolved", "Closed"],
      default: () => "New",
    },
  ],
  build(values) {
    const contactDetails = optional(values, "contactDetails");
    const attachments = lines(values, "attachments");
    return {
      title: "Support Request",
      subtitle: text(values, "system", "System"),
      reference: text(values, "requestId", "Request ID"),
      date: date(values, "date", "Date received"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Request ID", text(values, "requestId", "Request ID")],
            ["Client", text(values, "clientName", "Client")],
            ["Contact", text(values, "contactName", "Contact person")],
            ...(contactDetails ? ([["Phone / email", contactDetails]] as const) : []),
            ["System", text(values, "system", "System")],
            ["Priority", level(values, "priority", "Priority")],
            ["Received", `${date(values, "date", "Date received")} by ${text(values, "receivedBy", "Received by")}`],
            ["Assigned to", text(values, "assignedTo", "Assigned to")],
            ["Status", text(values, "status", "Status")],
          ],
        },
        ...prose(values, "Description", "description"),
        ...bullets(values, "Steps to reproduce", "steps", true),
        {
          kind: "table",
          columns: ["Expected", "Actual"],
          rows: [[text(values, "expected", "Expected result"), text(values, "actual", "Actual result")]],
        },
        ...(attachments.length > 0
          ? ([
              { kind: "heading", text: "Attachments" },
              { kind: "list", items: attachments },
            ] as const)
          : []),
      ],
    };
  },
};

export const SUPPORT_TEMPLATES: readonly DocumentTemplate[] = [incidentReport, maintenanceReport, supportRequest];
