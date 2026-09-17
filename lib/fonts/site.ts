import { Schibsted_Grotesk } from "next/font/google";

/**
 * Website typeface. A newspaper grotesk with a confident editorial voice,
 * deliberately distinct from the OS (Geist). Loaded only by the website and
 * auth layouts; exposed to Tailwind as `font-site` (app/globals.css).
 */
export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});
