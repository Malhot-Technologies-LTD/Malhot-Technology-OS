import type { Block } from "../content";
import {
  common,
  date,
  lines,
  optional,
  paragraphs,
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
 * Software & Technical templates. The originals in this category live in
 * ../templates.ts. Every section a template names is printed: what the author
 * wrote, or a visible [gap] — so a missing rollback plan is obvious on paper
 * instead of silently absent. Fields say to write "None" where that is a real
 * answer.
 */

// Local helpers ----------------------------------------------------------------

const projectName = (context: TemplateContext) => context.project?.name ?? "";
const managerName = (context: TemplateContext) => context.project?.managerName ?? "";

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

/** A heading and a table from a "|"-separated textarea, or a gap row. */
function grid(values: Values, title: string, name: string, columns: readonly string[]): Block[] {
  return [{ kind: "heading", text: title }, table(columns, tableRows(values, name, columns.length), title)];
}

const NONE_HINT = "Write “None” if there are none.";

// Technical specification ------------------------------------------------------

const technicalSpecification: DocumentTemplate = {
  key: "technical_specification",
  name: "Technical specification",
  category: "Software & Technical",
  documentType: "requirements",
  summary: "How a system is built: architecture, components, APIs, data, hosting, access and security.",
  fields: [
    common.reference("MAL/TEC"),
    common.date,
    { name: "projectName", label: "Project / system", type: "text", required: true, default: projectName },
    {
      name: "clientName",
      label: "Client",
      type: "text",
      default: (context) => context.project?.clientName ?? "",
    },
    { name: "version", label: "Document version", type: "text", default: () => "1.0" },
    { name: "preparedBy", label: "Prepared by", type: "text", required: true, default: managerName },
    {
      name: "overview",
      label: "Architecture overview",
      type: "textarea",
      wide: true,
      required: true,
      hint: "How the parts fit together. Leave a blank line between paragraphs.",
    },
    {
      name: "components",
      label: "Components (one per line: Component | Technology | Responsibility)",
      type: "textarea",
      wide: true,
      placeholder: "Web app | Next.js | Staff dashboard\nAPI | Node.js | Business logic and data access",
    },
    {
      name: "apis",
      label: "APIs (one per line: Endpoint | Method | Purpose)",
      type: "textarea",
      wide: true,
      placeholder: "/api/attendance | POST | Record a check-in\n/api/reports/:id | GET | Download a report",
    },
    { name: "database", label: "Database", type: "textarea", wide: true, hint: "Engine, main tables, retention." },
    {
      name: "infrastructure",
      label: "Infrastructure",
      type: "textarea",
      wide: true,
      hint: "Hosting, regions, storage.",
    },
    { name: "authentication", label: "Authentication", type: "textarea", wide: true, hint: "How users sign in." },
    {
      name: "authorization",
      label: "Authorization",
      type: "textarea",
      wide: true,
      hint: "Roles and what each may do.",
    },
    {
      name: "integrations",
      label: "Integrations (one per line)",
      type: "textarea",
      wide: true,
      hint: `Payment, SMS, email and other third-party services. ${NONE_HINT}`,
    },
    { name: "deployment", label: "Deployment", type: "textarea", wide: true, hint: "Environments and how code ships." },
    { name: "security", label: "Security", type: "textarea", wide: true, hint: "Encryption, secrets, audit, backups." },
  ],
  build(values) {
    const client = optional(values, "clientName");
    return {
      title: "Technical Specification",
      subtitle: text(values, "projectName", "Project / system"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Project / system", text(values, "projectName", "Project / system")],
            ...(client ? ([["Client", client]] as const) : []),
            ["Version", text(values, "version", "Document version")],
            ["Prepared by", text(values, "preparedBy", "Prepared by")],
          ],
        },
        ...prose(values, "Architecture overview", "overview"),
        ...grid(values, "Components", "components", ["Component", "Technology", "Responsibility"]),
        ...grid(values, "APIs", "apis", ["Endpoint", "Method", "Purpose"]),
        ...prose(values, "Database", "database"),
        ...prose(values, "Infrastructure", "infrastructure"),
        ...prose(values, "Authentication", "authentication"),
        ...prose(values, "Authorization", "authorization"),
        ...bullets(values, "Integrations", "integrations"),
        ...prose(values, "Deployment", "deployment"),
        ...prose(values, "Security", "security"),
      ],
    };
  },
};

// Release notes ----------------------------------------------------------------

const releaseNotes: DocumentTemplate = {
  key: "release_notes",
  name: "Release notes",
  category: "Software & Technical",
  documentType: "deployment_report",
  summary: "What changed in a version: features, improvements, fixes, breaking changes and how to upgrade.",
  fields: [
    { name: "productName", label: "Product / project", type: "text", required: true, default: projectName },
    { name: "version", label: "Version", type: "text", required: true, placeholder: "e.g. 1.4.0" },
    { name: "releaseDate", label: "Release date", type: "date", default: today },
    { name: "newFeatures", label: "New features (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    { name: "improvements", label: "Improvements (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    { name: "bugFixes", label: "Bug fixes (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    {
      name: "breakingChanges",
      label: "Breaking changes (one per line)",
      type: "textarea",
      wide: true,
      hint: `Anything that stops old data, integrations or habits working. ${NONE_HINT}`,
    },
    { name: "knownIssues", label: "Known issues (one per line)", type: "textarea", wide: true, hint: NONE_HINT },
    {
      name: "upgradeNotes",
      label: "Upgrade notes",
      type: "textarea",
      wide: true,
      hint: "What users or administrators must do. Write “None required” if nothing.",
    },
    { name: "preparedBy", label: "Prepared by", type: "text" },
  ],
  build(values) {
    const product = text(values, "productName", "Product / project");
    const version = text(values, "version", "Version");
    const preparedBy = optional(values, "preparedBy");
    return {
      title: "Release Notes",
      subtitle: `${product} — version ${version}`,
      date: date(values, "releaseDate", "Release date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Product", product],
            ["Version", version],
            ["Release date", date(values, "releaseDate", "Release date")],
            ...(preparedBy ? ([["Prepared by", preparedBy]] as const) : []),
          ],
        },
        ...bullets(values, "New features", "newFeatures"),
        ...bullets(values, "Improvements", "improvements"),
        ...bullets(values, "Bug fixes", "bugFixes"),
        ...bullets(values, "Breaking changes", "breakingChanges"),
        ...bullets(values, "Known issues", "knownIssues"),
        ...prose(values, "Upgrade notes", "upgradeNotes"),
      ],
    };
  },
};

// Security checklist -----------------------------------------------------------

export const SECURITY_STATUSES = ["Not checked", "Pass", "Fail", "N/A"] as const;

/** Each area with the check a reviewer confirms — criteria, not findings. */
export const SECURITY_CHECKS: readonly { id: string; area: string; check: string }[] = [
  {
    id: "authentication",
    area: "Authentication",
    check: "Every non-public page and API requires sign-in; sessions expire; admin accounts use two-factor sign-in.",
  },
  {
    id: "authorization",
    area: "Authorization",
    check: "Every action checks the user's role on the server; no user can read or change another client's data.",
  },
  {
    id: "passwords",
    area: "Password handling",
    check:
      "Passwords hashed with bcrypt/argon2 or left to the auth provider; never logged, emailed or stored in plain text.",
  },
  {
    id: "encryptionTransit",
    area: "Encryption in transit",
    check: "HTTPS everywhere with valid certificates; plain HTTP redirects to HTTPS.",
  },
  {
    id: "encryptionRest",
    area: "Encryption at rest",
    check: "Database, backups and file storage are encrypted at rest.",
  },
  {
    id: "secrets",
    area: "Secrets management",
    check:
      "No keys or passwords in the repository or browser code; kept in the host's secret store; rotated when people leave.",
  },
  {
    id: "logging",
    area: "Logging",
    check:
      "Sign-ins, failures and permission changes are logged; logs hold no passwords, tokens or unneeded personal data.",
  },
  {
    id: "backups",
    area: "Backups",
    check: "Automatic backups run, are kept separately from production, and a restore has been tested.",
  },
  {
    id: "dependencies",
    area: "Dependencies",
    check: "Libraries are current; no unresolved critical or high advisories (npm audit or equivalent).",
  },
  {
    id: "vulnerabilities",
    area: "Vulnerability checks",
    check: "Input is validated; tested for injection, XSS, CSRF, file-upload and open-redirect issues.",
  },
  {
    id: "accessControl",
    area: "Access control",
    check: "Production, hosting and repository access limited to people who need it; leavers removed.",
  },
];

function checkStatus(values: Values, id: string): string {
  const status = optional(values, `${id}Status`);
  return status && status !== "Not checked" ? status : "[Not checked]";
}

const securityChecklist: DocumentTemplate = {
  key: "security_checklist",
  name: "Security checklist",
  category: "Software & Technical",
  documentType: "testing_report",
  summary: "A signed review of a system's security basics, each check marked Pass, Fail or N/A with notes.",
  fields: [
    common.reference("MAL/SEC"),
    common.date,
    { name: "systemName", label: "System / project", type: "text", required: true, default: projectName },
    { name: "environment", label: "Environment reviewed", type: "text", placeholder: "Production" },
    { name: "reviewer", label: "Reviewed by", type: "text", required: true },
    ...SECURITY_CHECKS.flatMap((item): FieldDef[] => [
      {
        name: `${item.id}Status`,
        label: item.area,
        type: "select",
        options: SECURITY_STATUSES,
        default: () => "Not checked",
        hint: item.check,
      },
      { name: `${item.id}Notes`, label: `${item.area} — notes`, type: "text" },
    ]),
    {
      name: "actions",
      label: "Actions for failed checks (one per line: what — who — by when)",
      type: "textarea",
      wide: true,
    },
    { name: "approver", label: "Approved by", type: "text" },
  ],
  build(values) {
    const statuses = SECURITY_CHECKS.map((item) => checkStatus(values, item.id));
    const count = (status: string) => statuses.filter((candidate) => candidate === status).length;
    const failed = count("Fail");
    const unchecked = count("[Not checked]");
    const actions = lines(values, "actions");
    return {
      title: "Security Checklist",
      subtitle: text(values, "systemName", "System / project"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["System", text(values, "systemName", "System / project")],
            ["Environment", text(values, "environment", "Environment reviewed")],
            ["Reviewed by", text(values, "reviewer", "Reviewed by")],
            ["Date", date(values, "date", "Date")],
            [
              "Result",
              `${count("Pass")} passed · ${failed} failed · ${count("N/A")} not applicable · ${unchecked} not checked`,
            ],
          ],
        },
        {
          kind: "table",
          columns: ["Area", "Check", "Status", "Notes"],
          rows: SECURITY_CHECKS.map((item, index) => [
            item.area,
            item.check,
            statuses[index],
            optional(values, `${item.id}Notes`) ?? "",
          ]),
        },
        ...(failed > 0 || actions.length > 0
          ? [
              { kind: "heading", text: "Actions" } as const,
              {
                kind: "list",
                items: actions.length > 0 ? actions : ["[Action, owner and date for each failed check]"],
                ordered: true,
              } as const,
            ]
          : []),
        ...(failed > 0 || unchecked > 0
          ? [
              {
                kind: "note",
                text: "Sign-off confirms the review took place. Failed or unchecked items must be resolved before the system is treated as secure.",
              } as const,
            ]
          : []),
        {
          kind: "signatures",
          parties: [
            { role: "Reviewed by", name: text(values, "reviewer", "Reviewed by") },
            { role: "Approved by", name: optional(values, "approver") ?? "" },
          ],
        },
      ],
    };
  },
};

// Deployment / operations runbook ----------------------------------------------

/**
 * "DATABASE_URL = postgres://…" keeps only the name: the runbook is printed and
 * shared, so a value pasted by mistake must never reach the page.
 */
export function variableName(cell: string): string {
  return cell.split("=")[0].trim();
}

const runbook: DocumentTemplate = {
  key: "operations_runbook",
  name: "Deployment & operations runbook",
  category: "Software & Technical",
  documentType: "deployment_report",
  summary: "How to deploy, roll back, monitor and recover a system, and who to call when it breaks.",
  fields: [
    common.reference("MAL/OPS"),
    common.date,
    { name: "systemName", label: "System / project", type: "text", required: true, default: projectName },
    { name: "owner", label: "System owner", type: "text", default: managerName },
    { name: "overview", label: "System overview", type: "textarea", wide: true, hint: "What it does and for whom." },
    {
      name: "environments",
      label: "Environments (one per line: Environment | URL | Notes)",
      type: "textarea",
      wide: true,
      placeholder:
        "Production | https://app.example.rw | Client-facing\nStaging | https://staging.example.rw | Testing",
    },
    {
      name: "deploymentSteps",
      label: "Deployment steps (one per line, in order)",
      type: "textarea",
      wide: true,
      required: true,
    },
    {
      name: "rollback",
      label: "Rollback steps (one per line, in order)",
      type: "textarea",
      wide: true,
      required: true,
    },
    {
      name: "envVars",
      label: "Environment variables (one per line: NAME | Purpose)",
      type: "textarea",
      wide: true,
      placeholder: "DATABASE_URL | Connection to the production database",
      hint: "Names only — never values or secrets. Anything after “=” is dropped.",
    },
    {
      name: "services",
      label: "Services (one per line: Service | Provider | Purpose)",
      type: "textarea",
      wide: true,
      placeholder: "Database | Supabase | Application data\nEmail | Resend | Password reset emails",
    },
    {
      name: "monitoring",
      label: "Monitoring",
      type: "textarea",
      wide: true,
      hint: "Dashboards, alerts, who is notified.",
    },
    { name: "backups", label: "Backups", type: "textarea", wide: true, hint: "What, how often, where, how long kept." },
    { name: "recovery", label: "Recovery steps (one per line, in order)", type: "textarea", wide: true },
    {
      name: "problems",
      label: "Common problems (one per line: Symptom | Cause | Fix)",
      type: "textarea",
      wide: true,
      placeholder: "Site returns 502 | App container stopped | Restart the service from the hosting dashboard",
    },
    {
      name: "contacts",
      label: "Emergency contacts (one per line: Name | Role | Phone / email)",
      type: "textarea",
      wide: true,
      required: true,
    },
  ],
  build(values) {
    const variables = tableRows(values, "envVars", 2)
      .map(([name, purpose]) => [variableName(name), purpose])
      .filter(([name]) => name !== "");
    const owner = optional(values, "owner");
    return {
      title: "Deployment & Operations Runbook",
      subtitle: text(values, "systemName", "System / project"),
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      classification: "Internal — restricted",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["System", text(values, "systemName", "System / project")],
            ...(owner ? ([["Owner", owner]] as const) : []),
            ["Last updated", date(values, "date", "Date")],
          ],
        },
        ...prose(values, "System overview", "overview"),
        ...grid(values, "Environments", "environments", ["Environment", "URL", "Notes"]),
        ...bullets(values, "Deployment steps", "deploymentSteps", true),
        ...bullets(values, "Rollback", "rollback", true),
        { kind: "heading", text: "Environment variables" },
        {
          kind: "note",
          text: "Names only. Values, passwords, keys and tokens must never be written in this document; they live in the hosting platform's secret store.",
        },
        table(["Variable", "Purpose"], variables, "Environment variables"),
        ...grid(values, "Services", "services", ["Service", "Provider", "Purpose"]),
        ...prose(values, "Monitoring", "monitoring"),
        ...prose(values, "Backups", "backups"),
        ...bullets(values, "Recovery", "recovery", true),
        ...grid(values, "Common problems", "problems", ["Symptom", "Cause", "Fix"]),
        ...grid(values, "Emergency contacts", "contacts", ["Name", "Role", "Phone / email"]),
      ],
    };
  },
};

export const TECHNICAL_TEMPLATES: readonly DocumentTemplate[] = [
  technicalSpecification,
  releaseNotes,
  securityChecklist,
  runbook,
];
