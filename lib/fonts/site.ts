import { Inter, Sora } from "next/font/google";

/**
 * Website typefaces, deliberately distinct from the OS (Geist).
 *
 * Sora sets headlines — a geometric grotesk with enough weight at display sizes
 * to carry a full-bleed hero — and Inter sets everything else. Both are loaded
 * only by the website and auth layouts and exposed to Tailwind as `font-display`
 * and `font-site` (app/globals.css), so no OS route pays for them.
 *
 * Weights are enumerated rather than taking the variable axis whole: the site
 * uses four of Sora's and four of Inter's, and shipping the rest is bytes on
 * the critical path for nothing.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
