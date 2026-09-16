/** Service areas (docs/product/public-website.md#services). Final list pending OD-7. */
export type Service = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  outcomes: readonly string[];
  deliverables: readonly string[];
  placeholder?: boolean;
};

export const services: readonly Service[] = [
  {
    slug: "web-development",
    name: "Web development",
    summary: "Fast, accessible websites and web products built to be maintained.",
    description:
      "From marketing sites to content-heavy platforms, we build on modern frameworks with performance and accessibility budgets set before the first commit.",
    outcomes: [
      "A site that loads fast on real phones",
      "Content you can change without an engineer",
      "Search engines that can read every page",
    ],
    deliverables: [
      "Design system and components",
      "Production site on a global edge network",
      "Analytics and performance reporting",
    ],
  },
  {
    slug: "software-systems",
    name: "Software systems",
    summary: "Web applications and internal tools that run the business.",
    description:
      "Operational software with real users: dashboards, portals, workflow tools. We model the domain carefully first, because schema mistakes outlive everything else.",
    outcomes: [
      "One system of record instead of spreadsheets",
      "Roles and permissions that match how the team works",
      "Audit trails and reporting built in",
    ],
    deliverables: [
      "Requirements and MVP specification",
      "Working software in verifiable increments",
      "Runbooks and handover documentation",
    ],
  },
  {
    slug: "backend-apis",
    name: "Backend and APIs",
    summary: "Data models, services and integrations that other systems can rely on.",
    description:
      "Postgres-first backends with clear contracts, authentication, background jobs and observability. Boring technology, deliberately chosen.",
    outcomes: [
      "APIs with versioned, documented contracts",
      "Security enforced at the database, not only the UI",
      "Predictable performance under load",
    ],
    deliverables: ["Schema and migration plan", "API documentation", "Monitoring, alerting and backups"],
  },
  {
    slug: "ui-ux-design",
    name: "UI and UX design",
    summary: "Interfaces people understand the first time.",
    description:
      "Research-light, prototype-heavy. We design in the same system we build in, so what you approve is what ships.",
    outcomes: [
      "Fewer support questions",
      "Flows that work on a phone",
      "A visual language that scales across products",
    ],
    deliverables: ["User flows and wireframes", "High-fidelity prototypes", "Design tokens and component library"],
  },
  {
    slug: "automation-integrations",
    name: "Automation and integrations",
    summary: "Connect the tools you already use and remove the manual steps between them.",
    description:
      "Webhooks, scheduled jobs, data pipelines and third-party integrations, built idempotent and observable so they keep working when something upstream changes.",
    outcomes: [
      "Hours of manual work removed each week",
      "Data that agrees across systems",
      "Failures you hear about before customers do",
    ],
    deliverables: ["Integration map", "Reliable jobs with retries and logs", "Operational dashboard"],
  },
  {
    slug: "ai-assisted-systems",
    name: "AI-assisted systems",
    summary: "Practical use of language models inside real workflows, only where it earns its place.",
    description:
      "Document understanding, classification, drafting and search, wired into your data with evaluation and human review. No demos that fall over in production.",
    outcomes: [
      "Measured accuracy, not anecdotes",
      "Costs and latency you can predict",
      "Humans stay in control of decisions",
    ],
    deliverables: [
      "Feasibility assessment with evaluation set",
      "Production integration with guardrails",
      "Monitoring for quality drift",
    ],
    placeholder: true,
  },
  {
    slug: "deployment-infrastructure",
    name: "Deployment and infrastructure",
    summary: "We ship and operate what we build.",
    description:
      "Every project includes automated deployment, environments, backups and a rollback plan. Delivery is not done until it is running and observed.",
    outcomes: ["Deploys that take minutes, not evenings", "Recovery you have rehearsed", "Costs that match usage"],
    deliverables: ["CI/CD pipeline", "Environment and secrets management", "Deployment report and handover"],
  },
] as const;

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
