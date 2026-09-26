import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShowcaseList } from "@/features/showcase/components/showcase-list.client";
import { listShowcaseRows } from "@/features/showcase/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Website" };

/** Settings → Website: which projects the public site shows. Members get a 404, as on Enquiries. */
export default async function WebsiteSettingsPage() {
  const viewer = await requireViewer();
  if (!can(viewer, "org.website")) notFound();

  const { data, error } = await listShowcaseRows(viewer.organizationId);
  if (error) throw new Error(`Could not load the website projects: ${error.message}`);

  const live = data.filter((row) => row.showcase?.published).length;

  return (
    <section aria-labelledby="website-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="website-heading" className="text-lg font-semibold tracking-tight">
          Website
        </h2>
        <p className="text-sm text-fg-muted">
          Choose which projects appear on the public website, in what order, and what their pages say.{" "}
          {live === 0 ? "None are showing yet." : `${live} showing now.`}
        </p>
      </div>
      <ShowcaseList rows={data} />
    </section>
  );
}
