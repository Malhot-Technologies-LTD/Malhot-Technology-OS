/** Public view of docs/product/project-lifecycle.md: what a client experiences and receives at each stage. */
export type Stage = { key: string; name: string; summary: string; weDo: readonly string[]; youGet: readonly string[] };

export const stages: readonly Stage[] = [
  {
    key: "discover",
    name: "Discover",
    summary: "We learn the problem before proposing a solution.",
    weDo: [
      "Interviews with the people who will use the system",
      "Review of existing tools and data",
      "Constraints: budget, timeline, platform",
    ],
    youGet: ["Project brief"],
  },
  {
    key: "define",
    name: "Define",
    summary: "Goals and an MVP scope that everyone signs.",
    weDo: ["Measurable goals", "MVP items linked to each goal", "Success criteria"],
    youGet: ["Requirements and MVP specification"],
  },
  {
    key: "plan",
    name: "Plan",
    summary: "Milestones, a timeline and the team.",
    weDo: ["Milestones with dates", "Task breakdown", "Risk review"],
    youGet: ["Project plan"],
  },
  {
    key: "build",
    name: "Build",
    summary: "Thin vertical slices you can try every week.",
    weDo: ["Working increments on a preview environment", "Code review on every change", "Weekly written progress"],
    youGet: ["Preview access", "Progress reports"],
  },
  {
    key: "verify",
    name: "Verify",
    summary: "Dedicated testing with a bug loop that closes.",
    weDo: ["Test cases per feature", "Test runs and bug triage", "Accessibility and performance checks"],
    youGet: ["Testing report"],
  },
  {
    key: "ship",
    name: "Ship",
    summary: "Deployed, monitored, documented.",
    weDo: ["Production deployment with a rollback plan", "Monitoring and alerts", "Handover session"],
    youGet: ["Deployment report", "Final project report"],
  },
  {
    key: "support",
    name: "Support",
    summary: "We stay on for what comes next.",
    weDo: ["Bug fixes and small improvements", "Dependency and security updates", "Roadmap conversations"],
    youGet: ["Support agreement"],
  },
] as const;
