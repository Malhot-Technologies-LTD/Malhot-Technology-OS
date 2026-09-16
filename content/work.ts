/**
 * Case studies (docs/product/public-website.md#work). Structured fields keep every
 * study scannable: problem / solution / outcome. Never invent client names or
 * metrics: `placeholder: true` studies render with a visible marker and must be
 * replaced before launch (OD-7).
 */
export type CaseStudy = {
  slug: string;
  title: string;
  client: string;
  year: string;
  services: readonly string[];
  summary: string;
  problem: readonly string[];
  solution: readonly string[];
  role: string;
  technology: readonly string[];
  outcome: readonly string[];
  placeholder?: boolean;
};

export const caseStudies: readonly CaseStudy[] = [
  {
    slug: "operations-platform",
    title: "An operations platform replacing spreadsheets and chat",
    client: "Confidential client",
    year: "2026",
    services: ["software-systems", "backend-apis", "ui-ux-design"],
    summary:
      "A small services business ran projects across spreadsheets, chat threads and a shared drive. We built one system of record for projects, tasks, testing and documents.",
    problem: [
      "Work lived in five tools with no shared source of truth. Status was reconstructed in meetings, deadlines slipped silently and client documents were rewritten from scratch each time.",
    ],
    solution: [
      "We modelled the delivery lifecycle first: projects, goals, MVP scope, tasks, test runs, documents. It is enforced in the database with row-level security so every role sees exactly what it should.",
      "A desktop-first web application gives each person an actionable view of their day, with client documents generated from real project data.",
    ],
    role: "Product design, architecture, full-stack engineering, deployment.",
    technology: ["Next.js", "TypeScript", "Postgres", "Supabase", "Vercel"],
    outcome: ["Placeholder outcome. Replace with a factual result agreed with the client."],
    placeholder: true,
  },
  {
    slug: "marketing-site-rebuild",
    title: "A marketing site rebuilt for speed and self-service content",
    client: "Confidential client",
    year: "2025",
    services: ["web-development", "ui-ux-design", "deployment-infrastructure"],
    summary:
      "A slow, template-based site was costing leads on mobile. We rebuilt it with a performance budget and a content workflow the marketing team owns.",
    problem: [
      "Pages took several seconds to load on 4G, the design had drifted across templates, and every copy change needed a developer.",
    ],
    solution: [
      "A design system with one accent and strong typography, a static site with edge delivery, and typed content files reviewed like code.",
    ],
    role: "Design, engineering, SEO and analytics setup.",
    technology: ["Next.js", "Tailwind CSS", "Vercel Analytics"],
    outcome: ["Placeholder outcome. Replace with measured Lighthouse and conversion results."],
    placeholder: true,
  },
] as const;

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
