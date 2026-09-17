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
    slug: "delivery-tracking-tool",
    title: "A delivery tracking tool for a distribution business",
    client: "Confidential client",
    year: "2026",
    services: ["software-systems", "backend-apis", "ui-ux-design"],
    summary:
      "A distributor tracked deliveries across three depots in spreadsheets and phone calls. We built one internal tool for orders, drivers and proof of delivery.",
    problem: [
      "Dispatchers re-typed orders into three spreadsheets, drivers reported by phone, and nobody could answer a customer's 'where is it?' without a round of calls.",
    ],
    solution: [
      "We modelled orders, routes and depots first, then built a web application dispatchers use on desktop and drivers use on their phones, with photo proof of delivery and a live status per order.",
      "Roles and permissions are enforced in the database, so depot staff see only their depot and customers get a read-only tracking link.",
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
