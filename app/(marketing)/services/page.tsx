import type { Metadata } from "next";
import { Icon } from "@/components/site/brand/Icon";
import { PageHero } from "@/components/site/layout/PageHero";
import { ProcessStory } from "@/components/site/sections/ProcessStory";
import { ButtonLink } from "@/components/site/ui/Button";
import { Reveal, SectionHeading } from "@/components/site/ui/Reveal";
import { media, services } from "@/content/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web development, mobile apps, UI/UX design, branding, digital marketing and IT consulting — everything you need to build, grow and scale.",
};

const engagements = [
  {
    title: "Product sprint",
    price: "2 weeks",
    copy: "Strategy, prototype and a validated plan before you commit to a full build.",
    items: ["Discovery workshops", "Clickable prototype", "Technical plan", "Cost & timeline"],
  },
  {
    title: "Full build",
    price: "6–16 weeks",
    copy: "Design and engineering working as one team until your product is live.",
    items: ["Design system", "Full-stack build", "QA & launch", "30 days of support"],
    featured: true,
  },
  {
    title: "Growth retainer",
    price: "Monthly",
    copy: "Continuous iteration, experimentation and performance work after launch.",
    items: ["Roadmap ownership", "Weekly releases", "Analytics & CRO", "Priority support"],
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our services"
        title="Everything you need to build, grow and scale."
        highlight="scale."
        copy="Six disciplines, one delivery team. We plug into your business where you need us most and stay accountable for the outcome."
        video={media.flowVideo}
        poster={media.flowPoster}
      >
        <div className="flex flex-wrap gap-2.5">
          {services.map((service) => (
            <a
              key={service.slug}
              href={`#${service.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-[0.78rem] text-white/60 transition-all duration-500 hover:border-brand-400/60 hover:bg-brand-500/12 hover:text-white"
            >
              {service.title}
            </a>
          ))}
        </div>
      </PageHero>

      <section className="relative">
        {services.map((service, index) => (
          <div
            key={service.slug}
            id={service.slug}
            className="relative scroll-mt-28 border-t border-white/8 py-20 sm:py-24"
          >
            <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <Reveal>
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-[28px] border border-brand-400/35 bg-brand-500/12 text-brand-200">
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-[0.72rem] text-white/55">
                      0{index + 1} / {service.metric}
                    </span>
                  </div>
                </Reveal>
                <Reveal delay={0.06}>
                  <h2 className="display mt-6 text-[clamp(1.8rem,3.8vw,2.9rem)] text-white">{service.title}</h2>
                </Reveal>
                <Reveal delay={0.12}>
                  <p className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-white/55">{service.description}</p>
                </Reveal>
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {service.bullets.map((bullet, i) => (
                    <Reveal
                      key={bullet}
                      as="li"
                      delay={0.15 + i * 0.05}
                      className="flex items-start gap-3 rounded-[28px] border border-white/8 bg-white/[0.025] px-4 py-3 text-[0.86rem] text-white/70 transition-colors duration-500 hover:border-brand-400/35 hover:text-white"
                    >
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                      {bullet}
                    </Reveal>
                  ))}
                </ul>
                <Reveal delay={0.3}>
                  <div className="mt-9">
                    <ButtonLink href="/start" variant="outline" icon="arrowUpRight">
                      Start a {service.title.toLowerCase()} project
                    </ButtonLink>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.1} className={index % 2 === 1 ? "lg:order-1" : undefined}>
                <div className="group relative overflow-hidden rounded-[1.8rem] border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    decoding="async"
                    src={service.image}
                    alt={service.title}
                    className="aspect-[4/3] w-full object-cover opacity-75 transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(43,108,255,0.14),rgba(4,7,15,0.82))]" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-6">
                    <p className="text-[0.82rem] text-white/70">{service.short}</p>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-all duration-500 group-hover:border-brand-400/60 group-hover:bg-brand-500/25">
                      <Icon name="arrowUpRight" className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        ))}
      </section>

      <ProcessStory />

      <section className="relative py-24 sm:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Engagements"
            title="Ways to work with MALHOT."
            highlight={["MALHOT."]}
            align="center"
            copy="Pick the shape that matches your stage. Every engagement includes senior design and engineering."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {engagements.map((plan, index) => (
              <Reveal key={plan.title} delay={index * 0.08}>
                <article
                  className={`relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border p-8 transition-all duration-700 hover:-translate-y-1.5 ${
                    plan.featured
                      ? "border-brand-400/45 bg-[linear-gradient(170deg,rgba(43,108,255,0.16),rgba(7,13,29,0.9))] shadow-[0_50px_100px_-60px_rgba(43,108,255,0.95)]"
                      : "border-white/8 bg-[#070d1d] hover:border-brand-400/30"
                  }`}
                >
                  {plan.featured ? (
                    <span className="absolute top-6 right-6 rounded-full border border-brand-300/40 bg-brand-500/20 px-3 py-1 text-[0.62rem] tracking-[0.2em] text-brand-100 uppercase">
                      Most chosen
                    </span>
                  ) : null}
                  <p className="font-mono text-[0.72rem] text-brand-300">{plan.price}</p>
                  <h3 className="display mt-3 text-[1.5rem] text-white">{plan.title}</h3>
                  <p className="mt-3 text-[0.89rem] leading-relaxed text-white/50">{plan.copy}</p>
                  <ul className="mt-7 space-y-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-[0.86rem] text-white/60">
                        <Icon name="check" className="h-4 w-4 text-brand-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 pt-2">
                    <ButtonLink
                      href="/start"
                      variant={plan.featured ? "primary" : "outline"}
                      className="w-full"
                      icon="arrow"
                    >
                      Get started
                    </ButtonLink>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
