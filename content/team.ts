/** Team roles for /about. Names and bios are placeholders until supplied (OD-7). */
export type TeamMember = { name: string; role: string; discipline: string; bio: string; placeholder?: boolean };

export const team: readonly TeamMember[] = [
  {
    name: "Team member",
    role: "Project management",
    discipline: "Delivery",
    bio: "Placeholder bio.",
    placeholder: true,
  },
  {
    name: "Team member",
    role: "Frontend engineering",
    discipline: "Engineering",
    bio: "Placeholder bio.",
    placeholder: true,
  },
  {
    name: "Team member",
    role: "Backend engineering",
    discipline: "Engineering",
    bio: "Placeholder bio.",
    placeholder: true,
  },
  { name: "Team member", role: "Quality assurance", discipline: "Testing", bio: "Placeholder bio.", placeholder: true },
  { name: "Team member", role: "Marketing", discipline: "Growth", bio: "Placeholder bio.", placeholder: true },
] as const;

export const values = [
  {
    title: "Ship, then improve",
    body: "Working software in verifiable increments beats a perfect plan that never launches.",
  },
  {
    title: "Boring technology",
    body: "We choose tools that will still be maintained in five years and that a new engineer can read.",
  },
  { title: "Correctness first", body: "Security and data integrity are part of correctness, not optional extras." },
  {
    title: "Honest reporting",
    body: "Progress is counted, not felt. If something is late or broken, you hear it from us first.",
  },
] as const;

export const capabilities = [
  { area: "Frontend", items: ["Next.js and React", "TypeScript", "Tailwind CSS", "Accessibility (WCAG 2.2 AA)"] },
  { area: "Backend", items: ["Postgres", "Supabase", "Node.js", "REST and webhooks"] },
  { area: "Data and AI", items: ["Data modelling", "Reporting", "Language-model integration with evaluation"] },
  { area: "Infrastructure", items: ["Vercel", "CI/CD", "Monitoring and alerting", "Backups and recovery"] },
  { area: "Quality", items: ["Test planning", "Automated end-to-end tests", "Bug lifecycle", "Performance budgets"] },
] as const;
