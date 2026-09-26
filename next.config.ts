import type { NextConfig } from "next";

/**
 * Project photos uploaded in Settings → Website live in the public `site-media`
 * bucket of the Supabase project this build points at. Allowing only that path
 * keeps the image optimiser from being used as an open proxy.
 */
const siteMediaPattern = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/site-media/**`)
  : null;

const nextConfig: NextConfig = {
  images: { remotePatterns: siteMediaPattern ? [siteMediaPattern] : [] },
  /**
   * The previous website's routes.
   *
   * `/work` and `/process` were real, indexed pages before the site was
   * replaced. Permanent redirects rather than letting them 404: a search result
   * or an inbound link pointing at /work should land on the equivalent page,
   * not on an apology, and a 308 tells crawlers to move the ranking across
   * rather than drop it.
   *
   * Case-study slugs are not mapped one to one — the new project set is not the
   * old one — so /work/<anything> lands on the projects index.
   */
  async redirects() {
    return [
      { source: "/work", destination: "/projects", permanent: true },
      { source: "/work/:slug", destination: "/projects", permanent: true },
      { source: "/process", destination: "/services", permanent: true },
    ];
  },
};

export default nextConfig;
