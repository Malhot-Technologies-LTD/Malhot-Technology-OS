import { FileSignature, Handshake } from "lucide-react";
import Link from "next/link";

import { CLIENT_JOURNEY } from "../client-journey";

/**
 * The client templates as numbered stages, first contact to support. Each
 * template links to `${basePath}?template=<key>` plus `query` (e.g. the folder
 * to save into), so the generator opens on it wherever this is shown.
 */
export function ClientJourney({ basePath, query = "" }: { basePath: string; query?: string }) {
  return (
    <section aria-labelledby="client-work-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2
          id="client-work-heading"
          className="flex items-center gap-2 text-sm font-semibold tracking-[0.04em] text-fg-muted uppercase"
        >
          <Handshake className="size-4" aria-hidden="true" /> Client work
        </h2>
        <p className="text-sm text-fg-subtle">Everything you send a client, in the order you need it.</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CLIENT_JOURNEY.map((stage, index) => (
          <li key={stage.stage} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col">
                <p className="font-semibold">{stage.stage}</p>
                <p className="text-[13px] text-fg-subtle">{stage.summary}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-0.5">
              {stage.templates.map((template) => (
                <li key={template.key}>
                  <Link
                    href={`${basePath}?template=${template.key}${query}`}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-bg-subtle hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <FileSignature className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                    {template.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
