/**
 * What changes between roles in the company's offers and employment
 * agreements. The structure of the document stays the same for everyone (the
 * company's own agreement format); the duties, what is kept confidential, what
 * the company owns and what access comes with the job depend on the work.
 *
 * Every clause here is a default: the generator lets the author replace the
 * duties and the confidentiality list for a single document.
 */
export type RoleProfile = {
  /** Shown in the role picker. */
  name: string;
  /** Printed under the title, as in "Developer / Technical Role". */
  subtitle: string;
  /** Completes "…with responsibilities including ___." */
  responsibilities: string;
  confidential: readonly string[];
  /** Section heading for the ownership clause. */
  ipHeading: string;
  /** The kinds of work product the company owns, as in "including ___". */
  workProduct: string;
  /** What access the role receives, as in "receives access to ___". */
  access: string;
};

export const ROLE_PROFILES: readonly RoleProfile[] = [
  {
    name: "Developer / Technical",
    subtitle: "Developer / Technical Role",
    responsibilities:
      "software development, coding, technical architecture, quality assurance, testing, documentation, and other duties as assigned by management",
    confidential: [
      "Source code and technical systems",
      "Client information and contracts",
      "Business plans and strategies",
      "Financial information",
      "Any proprietary information",
    ],
    ipHeading: "Source code & IP ownership",
    workProduct: "source code, designs, and documentation",
    access: "company systems, repositories, and credentials",
  },
  {
    name: "Designer / Creative",
    subtitle: "Designer / Creative Role",
    responsibilities:
      "user interface and user experience design, visual and brand design, prototyping, maintaining design systems, supporting user research, preparing assets for development, and other duties as assigned by management",
    confidential: [
      "Design files, prototypes and unreleased work",
      "Client brand assets, briefs and contracts",
      "Business plans and strategies",
      "Financial information",
      "Any proprietary information",
    ],
    ipHeading: "Work product & IP ownership",
    workProduct: "designs, artwork, prototypes, design files, and brand assets",
    access: "design tools, shared design files, client brand assets, and credentials",
  },
  {
    name: "Project Manager / Delivery",
    subtitle: "Project Management / Delivery Role",
    responsibilities:
      "planning and delivering client projects, coordinating the project team, managing scope, timelines and budgets, client communication, progress reporting, risk management, and other duties as assigned by management",
    confidential: [
      "Client information, contracts and pricing",
      "Project plans, budgets and timelines",
      "Business plans and strategies",
      "Financial information",
      "Any proprietary information",
    ],
    ipHeading: "Work product & IP ownership",
    workProduct: "project plans, reports, documentation, and deliverables",
    access: "project management tools, client communication channels, project documentation, and credentials",
  },
  {
    name: "Sales & Marketing",
    subtitle: "Sales & Marketing / Business Role",
    responsibilities:
      "business development, finding and following up new clients, preparing proposals, planning and running marketing campaigns, managing the company's social media and brand communication, market research, and other duties as assigned by management",
    confidential: [
      "Client lists, leads and sales pipeline",
      "Pricing, proposals and contract terms",
      "Marketing plans and strategies",
      "Financial information",
      "Any proprietary information",
    ],
    ipHeading: "Work product & IP ownership",
    workProduct: "marketing materials, content, proposals, and client lists",
    access: "the company's CRM, email, social media accounts, marketing tools, and credentials",
  },
  {
    name: "Social Media Manager",
    subtitle: "Social Media Manager / Marketing Role",
    responsibilities:
      "planning the social media content calendar, writing and preparing posts, managing the company's accounts on all platforms, publishing and scheduling content, engaging with followers and responding to messages and comments, tracking performance and reporting on growth, and other duties as assigned by management",
    confidential: [
      "Login details and access to company social media accounts",
      "Unpublished posts, campaigns and content plans",
      "Client information, work and assets not yet approved for publication",
      "Audience data, messages and analytics",
      "Any proprietary information",
    ],
    ipHeading: "Content & account ownership",
    workProduct:
      "posts, captions, graphics, videos, content calendars, and the company's social media accounts and their followers",
    access:
      "the company's social media accounts on every platform, scheduling and design tools, and credentials, which remain the property of the company and must be handed over on request",
  },
  {
    name: "Operations / Administration",
    subtitle: "Operations / Administrative Role",
    responsibilities:
      "office administration, finance and bookkeeping support, human resources support, procurement, record keeping, coordinating suppliers, and other duties as assigned by management",
    confidential: [
      "Employee, payroll and personal records",
      "Financial, banking and payment information",
      "Client and supplier contracts",
      "Business plans and strategies",
      "Any proprietary information",
    ],
    ipHeading: "Work product & IP ownership",
    workProduct: "records, reports, templates, and documents",
    access: "company systems, financial and payment platforms as authorised, records, and credentials",
  },
];

export const ROLE_NAMES = ROLE_PROFILES.map((profile) => profile.name);

/** The profile for a stored role name; unknown or empty falls back to the first (technical) role. */
export function roleProfile(name: string | null | undefined): RoleProfile {
  return ROLE_PROFILES.find((profile) => profile.name === name) ?? ROLE_PROFILES[0]!;
}
