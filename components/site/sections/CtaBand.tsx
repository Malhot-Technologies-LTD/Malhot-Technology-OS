import { ButtonLink } from "@/components/site/ui/Button";
import { site } from "@/content/site";

/** The closing call to action, shared by every page that ends in "talk to us". */
export function CtaBand({
  title = "Have a project in mind?",
  lead = "Tell us what you are trying to build. We will reply within one business day with honest next steps, including whether we are the right team for it.",
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section aria-labelledby="cta-title" className="bg-bg py-16 sm:py-20">
      <div className="shell">
        <div className="on-ink flex flex-col gap-8 rounded-[var(--radius-l)] bg-brand px-6 py-10 text-white sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="cta-title" className="text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-semibold">
              {title}
            </h2>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-white/90">{lead}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <ButtonLink href="/start" variant="inverse" size="lg" icon="arrow">
              Start a project
            </ButtonLink>
            <ButtonLink href={`mailto:${site.email}`} variant="inverse-outline" size="lg">
              {site.email}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
