import type { MetadataRoute } from "next";

import { caseStudies } from "@/content/work";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["/", "/about", "/services", "/work", "/process", "/contact", "/privacy"];
  return [
    ...pages.map((path) => ({ url: `${siteUrl}${path}`, lastModified: now, changeFrequency: "monthly" as const })),
    ...caseStudies.map((study) => ({
      url: `${siteUrl}/work/${study.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
    })),
  ];
}
