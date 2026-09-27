/**
 * What changes between roles in the company's offers and employment
 * agreements. The structure of the document stays the same for everyone (the
 * company's own agreement format); the duties, what is kept confidential, what
 * the company owns and what access comes with the job depend on the work.
 *
 * A person can hold more than one role (a developer who also runs the
 * servers, an office manager who also keeps the books): the clauses of every
 * role chosen are combined, each item once, by `combineRoles`.
 *
 * Every clause here is a default: the generator lets the author replace the
 * duties and the confidentiality list for a single document.
 */

export type RoleProfile = {
  /** Shown in the role picker and stored on the document. Never rename one: saved documents refer to it. */
  name: string;
  /** Printed under the title, before "Role", as in "Developer / Technical Role". */
  subtitle: string;
  /** Completes "…with responsibilities including ___"; "other duties as assigned" is added once at the end. */
  duties: readonly string[];
  /** "Any proprietary information" is added once at the end. */
  confidential: readonly string[];
  /** Section heading for the ownership clause when this is the only role. */
  ipHeading: string;
  /** The kinds of work product the company owns, as in "including ___". */
  workProduct: readonly string[];
  /** What access the role receives, as in "receives access to ___"; "credentials" is added once at the end. */
  access: readonly string[];
  /** A sentence of its own after the access clause, for access with strings attached. */
  accessTerms?: string;
};

const SOURCE_CODE_HEADING = "Source code & IP ownership";
const GENERIC_HEADING = "Work product & IP ownership";

export const ROLE_PROFILES: readonly RoleProfile[] = [
  // Technical ---------------------------------------------------------------
  {
    name: "Developer / Technical",
    subtitle: "Developer / Technical",
    duties: [
      "software development",
      "coding",
      "technical architecture",
      "quality assurance",
      "testing",
      "documentation",
    ],
    confidential: [
      "Source code and technical systems",
      "Client information and contracts",
      "Business plans and strategies",
      "Financial information",
    ],
    ipHeading: SOURCE_CODE_HEADING,
    workProduct: ["source code", "designs", "documentation"],
    access: ["company systems", "repositories"],
  },
  {
    name: "Hardware Engineer",
    subtitle: "Hardware Engineering / Technical",
    duties: [
      "designing and developing electronic hardware",
      "circuit and PCB design",
      "embedded firmware development",
      "building, testing and debugging prototypes",
      "selecting components and working with suppliers and manufacturers",
      "installing, maintaining and repairing devices and equipment",
      "preparing technical documentation and test reports",
    ],
    confidential: [
      "Schematics, PCB layouts, firmware and hardware designs",
      "Prototypes, test results and unreleased products",
      "Bills of materials, supplier terms and component pricing",
      "Client information and contracts",
      "Business plans and strategies",
    ],
    ipHeading: "Hardware designs & IP ownership",
    workProduct: [
      "schematics",
      "circuit and PCB designs",
      "firmware",
      "prototypes",
      "test results",
      "technical documentation",
    ],
    access: ["the company's lab, tools and test equipment", "component stock", "design software", "company systems"],
    accessTerms:
      "Tools, equipment, components and prototypes remain the property of the company and must be returned on request or when the employment ends.",
  },
  {
    name: "QA / Software Tester",
    subtitle: "Quality Assurance / Technical",
    duties: [
      "planning and writing test cases",
      "manual and automated testing of software",
      "reporting, tracking and verifying bugs",
      "regression and user acceptance testing",
      "checking releases before they reach clients",
      "documenting test results",
    ],
    confidential: [
      "Source code, test environments and test data",
      "Unreleased features and known defects",
      "Client information and contracts",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["test plans", "test cases", "automated tests", "bug reports", "documentation"],
    access: ["company systems", "repositories", "test and staging environments"],
  },
  {
    name: "IT Support & Infrastructure",
    subtitle: "IT Support & Infrastructure / Technical",
    duties: [
      "setting up and maintaining servers, cloud services and networks",
      "deploying and monitoring the company's and clients' systems",
      "backups and recovery",
      "security updates and access management",
      "supporting staff with computers, accounts and devices",
      "keeping the IT asset register",
    ],
    confidential: [
      "Passwords, keys, credentials and access details",
      "Network, server and security configurations",
      "Client systems and data",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["configurations", "scripts", "infrastructure code", "runbooks", "documentation"],
    access: [
      "company and client servers, cloud accounts and networks with administrative privileges",
      "company devices",
    ],
    accessTerms:
      "Administrative access is granted for authorised work only, is logged, and must be handed back in full, with every credential rotated, when the employment ends.",
  },
  {
    name: "Data & AI",
    subtitle: "Data & AI / Technical",
    duties: [
      "collecting, cleaning and analysing data",
      "building reports and dashboards",
      "developing and evaluating machine learning and AI features",
      "maintaining data pipelines",
      "protecting personal data in line with the law and company policy",
    ],
    confidential: [
      "Company and client datasets, including personal data",
      "Models, prompts, analyses and results",
      "Client information and contracts",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["models", "datasets", "analyses", "reports", "source code", "documentation"],
    access: ["company and client data as authorised", "analytics and AI tools", "company systems"],
  },

  // Creative ----------------------------------------------------------------
  {
    name: "Designer / Creative",
    subtitle: "Designer / Creative",
    duties: [
      "user interface and user experience design",
      "visual and brand design",
      "prototyping",
      "maintaining design systems",
      "supporting user research",
      "preparing assets for development",
    ],
    confidential: [
      "Design files, prototypes and unreleased work",
      "Client brand assets, briefs and contracts",
      "Business plans and strategies",
      "Financial information",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["designs", "artwork", "prototypes", "design files", "brand assets"],
    access: ["design tools", "shared design files", "client brand assets"],
  },
  {
    name: "Social Media Manager",
    subtitle: "Social Media Manager / Marketing",
    duties: [
      "planning the social media content calendar",
      "writing and preparing posts",
      "managing the company's accounts on all platforms",
      "publishing and scheduling content",
      "engaging with followers and responding to messages and comments",
      "tracking performance and reporting on growth",
    ],
    confidential: [
      "Login details and access to company social media accounts",
      "Unpublished posts, campaigns and content plans",
      "Client information, work and assets not yet approved for publication",
      "Audience data, messages and analytics",
    ],
    ipHeading: "Content & account ownership",
    workProduct: [
      "posts",
      "captions",
      "graphics",
      "videos",
      "content calendars",
      "the company's social media accounts and their followers",
    ],
    access: ["the company's social media accounts on every platform", "scheduling and design tools"],
    accessTerms:
      "Social media accounts and their login details remain the property of the company and must be handed over on request.",
  },

  // Management --------------------------------------------------------------
  {
    name: "Executive / Director",
    subtitle: "Executive / Management",
    duties: [
      "leading the company or a department",
      "setting strategy, goals and budgets",
      "managing and developing staff",
      "representing the company to clients, partners and authorities",
      "approving contracts and spending within delegated authority",
      "reporting to the board or owners",
    ],
    confidential: [
      "Business plans, strategies and board matters",
      "Financial information, budgets and forecasts",
      "Employee, payroll and personal records",
      "Client and partner contracts and negotiations",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["strategies", "plans", "reports", "presentations", "business relationships built for the company"],
    access: ["company systems", "financial and banking platforms as authorised", "company records"],
  },
  {
    name: "Project Manager / Delivery",
    subtitle: "Project Management / Delivery",
    duties: [
      "planning and delivering client projects",
      "coordinating the project team",
      "managing scope, timelines and budgets",
      "client communication",
      "progress reporting",
      "risk management",
    ],
    confidential: [
      "Client information, contracts and pricing",
      "Project plans, budgets and timelines",
      "Business plans and strategies",
      "Financial information",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["project plans", "reports", "documentation", "deliverables"],
    access: ["project management tools", "client communication channels", "project documentation"],
  },
  {
    name: "Product Manager",
    subtitle: "Product Management",
    duties: [
      "defining the product vision and roadmap",
      "gathering and prioritising requirements from clients and users",
      "writing specifications and acceptance criteria",
      "working with design and engineering to ship features",
      "measuring product performance and user feedback",
    ],
    confidential: [
      "Product roadmaps and unreleased features",
      "User research, feedback and analytics",
      "Client information and contracts",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["roadmaps", "specifications", "research", "reports", "documentation"],
    access: ["product and analytics tools", "project management tools", "company systems"],
  },

  // Business ----------------------------------------------------------------
  {
    name: "Sales & Marketing",
    subtitle: "Sales & Marketing / Business",
    duties: [
      "business development",
      "finding and following up new clients",
      "preparing proposals",
      "planning and running marketing campaigns",
      "managing the company's social media and brand communication",
      "market research",
    ],
    confidential: [
      "Client lists, leads and sales pipeline",
      "Pricing, proposals and contract terms",
      "Marketing plans and strategies",
      "Financial information",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["marketing materials", "content", "proposals", "client lists"],
    access: ["the company's CRM", "email", "social media accounts", "marketing tools"],
  },
  {
    name: "Customer Support / Client Success",
    subtitle: "Customer Support / Client Success",
    duties: [
      "answering client questions and support requests",
      "logging, prioritising and following up issues",
      "onboarding and training client users",
      "keeping clients informed about fixes and releases",
      "gathering feedback and reporting recurring problems",
    ],
    confidential: [
      "Client information, accounts and data",
      "Support tickets and incident details",
      "Client contracts and pricing",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["help articles", "training material", "support records", "reports"],
    access: ["the support desk", "client accounts and systems as authorised", "communication channels"],
  },

  // Administrative ----------------------------------------------------------
  {
    name: "Operations / Administration",
    subtitle: "Operations / Administrative",
    duties: [
      "office administration",
      "finance and bookkeeping support",
      "human resources support",
      "procurement",
      "record keeping",
      "coordinating suppliers",
    ],
    confidential: [
      "Employee, payroll and personal records",
      "Financial, banking and payment information",
      "Client and supplier contracts",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["records", "reports", "templates", "documents"],
    access: ["company systems", "financial and payment platforms as authorised", "records"],
  },
  {
    name: "Administrative Assistant / Office Manager",
    subtitle: "Administrative / Office Management",
    duties: [
      "running the office day to day",
      "managing calendars, meetings and travel",
      "receiving visitors and handling calls and correspondence",
      "filing and keeping company records",
      "ordering supplies and looking after office equipment",
      "supporting management with documents and reports",
    ],
    confidential: [
      "Correspondence, calendars and meeting matters",
      "Employee and personal records",
      "Client and supplier information",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["records", "correspondence", "reports", "documents"],
    access: ["company email and calendars", "office systems and records", "the office and its equipment"],
    accessTerms: "Office keys, cards and equipment remain the property of the company and must be returned on request.",
  },
  {
    name: "Human Resources",
    subtitle: "Human Resources / Administrative",
    duties: [
      "recruitment and onboarding",
      "employment contracts and staff records",
      "leave, attendance and payroll inputs",
      "performance reviews and staff development",
      "employee relations and discipline in line with company policy and labour law",
      "offboarding",
    ],
    confidential: [
      "Employee, candidate and payroll records",
      "Salaries, contracts and disciplinary matters",
      "Personal data, including identity and health information",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["policies", "contracts", "records", "reports", "templates"],
    access: ["HR and payroll systems", "personnel files", "company systems"],
    accessTerms:
      "Personal data is handled only for HR purposes and in line with Rwanda's law on the protection of personal data and privacy.",
  },
  {
    name: "Finance & Accounting",
    subtitle: "Finance & Accounting / Administrative",
    duties: [
      "bookkeeping and keeping accounts",
      "invoicing clients and following up payments",
      "paying suppliers and staff",
      "tax and statutory filings",
      "budgets, forecasts and financial reports",
      "reconciling bank accounts",
    ],
    confidential: [
      "Financial, banking and payment information",
      "Payroll and salary records",
      "Tax filings and accounts",
      "Client and supplier contracts and pricing",
      "Business plans and strategies",
    ],
    ipHeading: GENERIC_HEADING,
    workProduct: ["accounts", "financial reports", "budgets", "records"],
    access: ["accounting software", "banking and payment platforms as authorised", "financial records"],
    accessTerms:
      "Payments are made only within the approval limits set by management, and every transaction must be recorded.",
  },
];

export const ROLE_NAMES = ROLE_PROFILES.map((profile) => profile.name);

/** The profile for a stored role name; unknown or empty falls back to the first (technical) role. */
export function roleProfile(name: string | null | undefined): RoleProfile {
  return ROLE_PROFILES.find((profile) => profile.name === name) ?? ROLE_PROFILES[0]!;
}

/**
 * The roles in a stored value: one name per line (older documents hold a
 * single name). Unknown names are dropped, repeats kept once, and an empty
 * result falls back to the first role so a document always has clauses.
 */
export function roleNamesFrom(value: string | null | undefined): string[] {
  const known = new Set(ROLE_NAMES);
  const names = [...new Set((value ?? "").split("\n").map((name) => name.trim()))].filter((name) => known.has(name));
  return names.length > 0 ? names : [ROLE_NAMES[0]!];
}

/** "a", "a and b", "a, b, and c" — the house style of the company's contracts. */
export function listText(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/** The clauses of one or more roles, ready for the document. */
export type RoleClauses = {
  subtitle: string;
  responsibilities: string;
  confidential: readonly string[];
  ipHeading: string;
  workProduct: string;
  access: string;
  accessTerms: readonly string[];
};

const unique = (items: readonly string[]) => [...new Set(items)];

export function combineRoles(names: readonly string[]): RoleClauses {
  const profiles = roleNamesFrom(names.join("\n")).map(roleProfile);
  const subtitles = profiles.map((profile) => profile.subtitle);
  const headings = unique(profiles.map((profile) => profile.ipHeading));
  return {
    subtitle: `${subtitles.length > 2 ? `${subtitles.slice(0, -1).join(", ")} & ${subtitles.at(-1)}` : subtitles.join(" & ")} Role`,
    responsibilities: listText([
      ...unique(profiles.flatMap((profile) => profile.duties)),
      "other duties as assigned by management",
    ]),
    confidential: [...unique(profiles.flatMap((profile) => profile.confidential)), "Any proprietary information"],
    // One role keeps its own heading; several share one, naming source code when any of them writes it.
    ipHeading:
      headings.length === 1
        ? headings[0]!
        : headings.includes(SOURCE_CODE_HEADING)
          ? SOURCE_CODE_HEADING
          : GENERIC_HEADING,
    workProduct: listText(unique(profiles.flatMap((profile) => profile.workProduct))),
    access: listText([...unique(profiles.flatMap((profile) => profile.access)), "credentials"]),
    accessTerms: unique(profiles.flatMap((profile) => (profile.accessTerms ? [profile.accessTerms] : []))),
  };
}
