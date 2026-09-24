import type { MetadataRoute } from "next";

import { projects } from "@/content/site";
import { siteUrl } from "@/lib/env";

/**
 * Public routes only.
 *
 * /start is deliberately absent, and carries `robots: noindex` of its own: it
 * is a six-step form at the end of a funnel, not a page anyone should arrive at
 * cold from a search result. The OS and the auth screens are excluded by
 * app/robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["/", "/about", "/services", "/projects", "/contact", "/privacy"];
  return [
    ...pages.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...projects.map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
