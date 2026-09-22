import { notFound } from "next/navigation";

import { PreviewSurface } from "./preview-surface.client";

/**
 * Component gallery for the OS register — the real components, the real fonts,
 * the real tokens, with fixture data.
 *
 * It exists because the OS itself is behind authentication, which makes the
 * design impossible to review without signing in. This route needs no session,
 * so a screenshot of it is a faithful answer to "what does the OS look like".
 *
 * Never reachable in production: it would expose internal UI to the public web.
 */
export const dynamic = "force-dynamic";

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewSurface />;
}
