import { ROLE_NAMES, combineRoles, listText, type RoleClauses } from "./roles";

/**
 * The job titles the company hires for, grouped by department. Every position
 * names the clause profiles (roles.ts) its contract is worded from: a CTO gets
 * the executive and the technical clauses, an accountant the finance ones.
 *
 * Titles are stored on documents as written here, so never rename one; add a
 * new title instead. A title that is not listed can still be typed; its
 * clauses then come from the "clauses like" choice on the form.
 */

export type Department =
  | "Leadership"
  | "Engineering"
  | "Product & Design"
  | "Projects"
  | "Sales & Marketing"
  | "Customer Success"
  | "Administration & Finance";

export type Position = { title: string; department: Department; roles: readonly string[] };

const EXEC = "Executive / Director";
const DEV = "Developer / Technical";
const HW = "Hardware Engineer";
const QA = "QA / Software Tester";
const IT = "IT Support & Infrastructure";
const DATA = "Data & AI";
const DESIGN = "Designer / Creative";
const SOCIAL = "Social Media Manager";
const PM = "Project Manager / Delivery";
const PRODUCT = "Product Manager";
const SALES = "Sales & Marketing";
const SUPPORT = "Customer Support / Client Success";
const OPS = "Operations / Administration";
const OFFICE = "Administrative Assistant / Office Manager";
const HR = "Human Resources";
const FINANCE = "Finance & Accounting";

export const POSITIONS: readonly Position[] = [
  { title: "Chief Executive Officer (CEO)", department: "Leadership", roles: [EXEC] },
  { title: "Managing Director", department: "Leadership", roles: [EXEC] },
  { title: "Chief Technology Officer (CTO)", department: "Leadership", roles: [EXEC, DEV] },
  { title: "Chief Operating Officer (COO)", department: "Leadership", roles: [EXEC, OPS] },
  { title: "Chief Financial Officer (CFO)", department: "Leadership", roles: [EXEC, FINANCE] },
  { title: "General Manager", department: "Leadership", roles: [EXEC, OPS] },
  { title: "Head of Engineering", department: "Leadership", roles: [EXEC, DEV] },

  { title: "Software Engineer", department: "Engineering", roles: [DEV] },
  { title: "Senior Software Engineer", department: "Engineering", roles: [DEV] },
  { title: "Lead Developer / Tech Lead", department: "Engineering", roles: [DEV] },
  { title: "Frontend Developer", department: "Engineering", roles: [DEV] },
  { title: "Backend Developer", department: "Engineering", roles: [DEV] },
  { title: "Full-Stack Developer", department: "Engineering", roles: [DEV] },
  { title: "Mobile App Developer", department: "Engineering", roles: [DEV] },
  { title: "Hardware Engineer", department: "Engineering", roles: [HW] },
  { title: "Embedded Systems Engineer", department: "Engineering", roles: [HW, DEV] },
  { title: "Electronics Technician", department: "Engineering", roles: [HW] },
  { title: "QA Engineer / Software Tester", department: "Engineering", roles: [QA] },
  { title: "DevOps Engineer", department: "Engineering", roles: [IT, DEV] },
  { title: "Systems & Network Administrator", department: "Engineering", roles: [IT] },
  { title: "IT Support Technician", department: "Engineering", roles: [IT] },
  { title: "Data Analyst", department: "Engineering", roles: [DATA] },
  { title: "Data Scientist / AI Engineer", department: "Engineering", roles: [DATA, DEV] },

  { title: "Product Manager", department: "Product & Design", roles: [PRODUCT] },
  { title: "UI/UX Designer", department: "Product & Design", roles: [DESIGN] },
  { title: "Graphic Designer", department: "Product & Design", roles: [DESIGN] },

  { title: "Project Manager", department: "Projects", roles: [PM] },
  { title: "Project Coordinator", department: "Projects", roles: [PM] },
  { title: "Scrum Master", department: "Projects", roles: [PM] },

  { title: "Business Development Manager", department: "Sales & Marketing", roles: [SALES] },
  { title: "Sales Executive", department: "Sales & Marketing", roles: [SALES] },
  { title: "Marketing Manager", department: "Sales & Marketing", roles: [SALES] },
  { title: "Social Media Manager", department: "Sales & Marketing", roles: [SOCIAL] },
  { title: "Content Creator", department: "Sales & Marketing", roles: [SOCIAL] },

  { title: "Customer Support Specialist", department: "Customer Success", roles: [SUPPORT] },
  { title: "Client Success Manager", department: "Customer Success", roles: [SUPPORT] },

  { title: "Operations Manager", department: "Administration & Finance", roles: [OPS] },
  { title: "Office Manager", department: "Administration & Finance", roles: [OFFICE] },
  { title: "Administrative Assistant", department: "Administration & Finance", roles: [OFFICE] },
  { title: "Executive Assistant", department: "Administration & Finance", roles: [OFFICE] },
  { title: "Receptionist", department: "Administration & Finance", roles: [OFFICE] },
  { title: "Human Resources Manager", department: "Administration & Finance", roles: [HR] },
  { title: "Human Resources Officer", department: "Administration & Finance", roles: [HR] },
  { title: "Accountant", department: "Administration & Finance", roles: [FINANCE] },
  { title: "Finance Officer", department: "Administration & Finance", roles: [FINANCE] },
  { title: "Procurement Officer", department: "Administration & Finance", roles: [OPS] },
];

export const DEPARTMENTS: readonly Department[] = [
  "Leadership",
  "Engineering",
  "Product & Design",
  "Projects",
  "Sales & Marketing",
  "Customer Success",
  "Administration & Finance",
];

export const POSITION_GROUPS: readonly { label: string; options: readonly string[] }[] = DEPARTMENTS.map(
  (department) => ({
    label: department,
    options: POSITIONS.filter((position) => position.department === department).map((position) => position.title),
  }),
);

export function findPosition(title: string): Position | null {
  const wanted = title.trim().toLowerCase();
  return POSITIONS.find((position) => position.title.toLowerCase() === wanted) ?? null;
}

/** The titles in a stored value: one per line, repeats once, blanks dropped. */
export function positionTitles(value: string | null | undefined): string[] {
  return [...new Set((value ?? "").split("\n").map((title) => title.trim()))].filter(Boolean);
}

/** How the titles read in a sentence: "Chief Executive Officer (CEO) and Software Engineer". */
export function positionText(titles: readonly string[]): string {
  return listText(titles);
}

/**
 * The contract clauses for the positions held. Listed titles bring their own
 * profiles; any title that is not listed takes the "clauses like" profile
 * (`fallback`, also where documents saved before positions existed keep their
 * role). With nothing to go on, the technical profile applies.
 */
export function clausesForPositions(titles: readonly string[], fallback: string | null | undefined): RoleClauses {
  const known = titles.map(findPosition);
  const roles = known.flatMap((position) => position?.roles ?? []);
  const unlisted = known.some((position) => position === null) || titles.length === 0;
  if (unlisted && fallback && ROLE_NAMES.includes(fallback)) roles.push(fallback);
  return combineRoles(roles);
}
