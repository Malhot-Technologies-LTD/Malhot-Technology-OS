import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

/** Marketing pages are indexable; the OS and auth surfaces never are (docs/product/public-website.md#seo-and-metadata). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/os", "/os/", "/login", "/auth/", "/invite/", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
