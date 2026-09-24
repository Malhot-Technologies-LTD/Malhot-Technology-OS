import type { Metadata } from "next";
import { PageHero } from "@/components/site/layout/PageHero";
import { StatsBand } from "@/components/site/sections/StatsBand";
import { Testimonials } from "@/components/site/sections/Testimonials";
import { ButtonLink } from "@/components/site/ui/Button";
import { Reveal, SectionHeading, TextReveal } from "@/components/site/ui/Reveal";
import { Icon } from "@/components/site/brand/Icon";
import { LogoMark } from "@/components/site/brand/Logo";
import { media, timeline } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "MALHOT is a team of passionate developers, designers and problem solvers creating digital experiences that make a real difference.",
};

const values = [
  {
    title: "Clarity over noise",
    copy: "We remove everything that does not serve the user or the business. Simple is harder — and worth it.",
    icon: "layers" as const,
  },
  {
    title: "Craft as a standard",
    copy: "Pixel accuracy, typographic rhythm and performance budgets are not extras. They are the baseline.",
    icon: "spark" as const,
  },
  {
    title: "Partnership, not tickets",
    copy: "We push back, propose alternatives and take ownership of outcomes, not just deliverables.",
    icon: "message" as const,
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About MALHOT"
        title="Innovation. Creativity. Impact."
        highlight="Impact."
        copy="We are a team of passionate developers, designers and problem solvers. Our mission is to create digital experiences that make a real difference for the businesses and people who use them."
        video={media.gridVideo}
        poster={media.gridPoster}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/start" icon="arrowUpRight" size="lg">
            Work with us
          </ButtonLink>
          <ButtonLink href="/projects" variant="secondary" size="lg" icon="arrow">
            See the work
          </ButtonLink>
        </div>
      </PageHero>

      {/* Vision — pinned editorial block */}
      <section className="relative overflow-x-clip py-24 sm:py-32">
        <div className="shell grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <span className="eyebrow">
                <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
                Our vision
              </span>
            </Reveal>
            <TextReveal
              text="To be a leading digital brand empowering businesses with innovative technology."
              highlight={["innovative", "technology."]}
              className="display mt-6 text-[clamp(1.85rem,3.9vw,3rem)] text-white"
            />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-lg text-[0.98rem] leading-relaxed text-white/55">
                MALHOT started in Kigali with three engineers and one rule: only ship work we would put our name on.
                That rule still decides everything — who we work with, how we design and when something is ready.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-10 flex items-center gap-4 rounded-[36px] border border-white/10 bg-white/[0.03] p-5">
                <LogoMark className="h-11 w-11 shrink-0" />
                <p className="text-[0.86rem] leading-relaxed text-white/55">
                  <span className="text-white">Build · Innovate · Grow.</span> Three words on the wall of our studio,
                  and the order we do everything in.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={media.team}
                alt="The MALHOT team in the studio"
                className="aspect-[4/3] w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,15,0.1),rgba(4,7,15,0.8))]" />
            </div>

            <ol className="mt-12 space-y-0">
              {timeline.map((item, index) => (
                <Reveal
                  key={item.year}
                  as="li"
                  delay={index * 0.06}
                  className="group relative grid grid-cols-[4.5rem_1fr] gap-5 border-t border-white/8 py-7"
                >
                  <span className="font-mono text-[0.78rem] text-brand-300">{item.year}</span>
                  <div>
                    <h3 className="display text-[1.3rem] text-white transition-transform duration-500 group-hover:translate-x-1">
                      {item.title}
                    </h3>
                    <p className="mt-2 max-w-md text-[0.9rem] leading-relaxed text-white/60">{item.copy}</p>
                  </div>
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 h-px w-0 bg-gradient-to-r from-brand-400 to-transparent transition-all duration-700 group-hover:w-full"
                  />
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative py-8 sm:py-14">
        <div className="shell">
          <SectionHeading
            eyebrow="How we think"
            title="Principles we refuse to compromise."
            highlight={["compromise."]}
            align="center"
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 0.08}>
                <article className="group relative h-full overflow-hidden rounded-[1.4rem] border border-white/8 bg-[#070d1d] p-7 transition-all duration-700 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-[0_40px_80px_-50px_rgba(43,108,255,0.8)]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                    style={{
                      background: "radial-gradient(80% 60% at 50% 0%, rgba(43,108,255,0.18), transparent 70%)",
                    }}
                  />
                  <span className="relative grid h-12 w-12 place-items-center rounded-[28px] border border-brand-400/30 bg-brand-500/12 text-brand-200">
                    <Icon name={value.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="display relative mt-6 text-[1.25rem] text-white">{value.title}</h3>
                  <p className="relative mt-3 text-[0.9rem] leading-relaxed text-white/50">{value.copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <StatsBand />
      <Testimonials />
    </>
  );
}
