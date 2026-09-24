import type { Metadata } from "next";

import { StartFlow } from "@/components/site/start/StartFlow";
import { getAuthState } from "@/lib/auth/context";

/**
 * The only page on the website that reads the request.
 *
 * Everything else under (marketing) is prerendered; this one looks up the
 * viewer so somebody already signed in does not retype their own name and
 * email into the brief. That is worth a render per visit here — it is a form,
 * not a landing page, and it is not one of the routes the performance budget
 * in lighthouserc.json measures.
 *
 * The session is a convenience only. Signed out is the normal case and the
 * wizard works identically without it.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start a Project",
  description: "Tell MALHOT about your project in six guided steps and get a response within one business day.",
  // A form behind a funnel, not a page anyone should reach from a search result.
  robots: { index: false, follow: true },
};

export default async function StartProjectPage() {
  const state = await getAuthState();
  const viewer = state.kind === "member" ? state.viewer : null;

  return (
    <StartFlow
      defaults={{
        contactName: viewer?.profile.fullName ?? "",
        contactEmail: viewer?.email ?? "",
        company: viewer?.organization.name ?? "",
      }}
      signedIn={Boolean(viewer)}
    />
  );
}
