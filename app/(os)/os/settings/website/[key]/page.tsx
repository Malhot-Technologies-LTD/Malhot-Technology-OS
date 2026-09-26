import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShowcaseForm } from "@/features/showcase/components/showcase-form.client";
import { ShowcasePhotos } from "@/features/showcase/components/showcase-photos.client";
import { getShowcaseEditor } from "@/features/showcase/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Website project" };

/**
 * One project's website page: the copy first, then photos. Photos hang off the
 * saved entry, so they appear once the details have been saved once.
 */
export default async function WebsiteProjectPage({ params }: PageProps<"/os/settings/website/[key]">) {
  const viewer = await requireViewer();
  if (!can(viewer, "org.website")) notFound();

  const { key } = await params;
  const { data, error } = await getShowcaseEditor(viewer.organizationId, key);
  if (error) throw new Error(`Could not load this project: ${error.message}`);
  if (!data) notFound();

  const { project, showcase, images } = data;

  return (
    <section aria-labelledby="showcase-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/os/settings/website"
          className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          <ChevronLeft aria-hidden className="size-4" /> Website
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="showcase-heading" className="text-lg font-semibold tracking-tight">
            {project.name} <span className="font-mono text-sm font-normal text-fg-subtle">{project.key}</span>
          </h2>
          {showcase?.published ? (
            <a
              href={`/projects/${showcase.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand underline-offset-4 hover:underline"
            >
              View on the website <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
        </div>
        <p className="text-sm text-fg-muted">
          {showcase
            ? "What visitors see for this project. Changes go live as soon as you save."
            : "Write what visitors will see. Nothing is shown until you switch on “Show on the website” and save."}
        </p>
      </div>

      <ShowcaseForm project={project} showcase={showcase} />

      <hr className="border-border" />

      {showcase ? (
        <ShowcasePhotos
          organizationId={viewer.organizationId}
          projectId={project.id}
          projectTitle={showcase.title}
          photos={images}
        />
      ) : (
        <section aria-labelledby="photos-heading" className="flex flex-col gap-1">
          <h3 id="photos-heading" className="text-base font-semibold tracking-tight">
            Photos
          </h3>
          <p className="text-sm text-fg-muted">Save the details above first, then add photos here.</p>
        </section>
      )}
    </section>
  );
}
