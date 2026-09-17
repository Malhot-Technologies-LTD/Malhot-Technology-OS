import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder photography on the website (content/images.ts). Remove once real assets live in /public.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
