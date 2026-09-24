"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { Reveal, SectionHeading } from "@/components/site/ui/Reveal";
import { ButtonLink } from "@/components/site/ui/Button";
import { services } from "@/content/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ServicesShowcase() {
  const [active, setActive] = useState(0);
  const activeService = services[active];

  return (
    <section className="relative overflow-x-clip py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 right-[-15%] h-[30rem] w-[30rem] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(43,108,255,0.16), transparent 70%)" }}
      />

      <div className="shell relative">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="What we do"
            title="Everything you need to build, grow and scale."
            highlight={["scale."]}
            className="max-w-3xl"
          />
          <Reveal delay={0.15}>
            <ButtonLink href="/services" variant="outline" icon="arrow">
              All services
            </ButtonLink>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* interactive list */}
          <div className="order-2 lg:order-1">
            {services.map((service, index) => {
              const isActive = index === active;
              return (
                <motion.div
                  key={service.slug}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.7, ease: EASE.soft, delay: index * 0.05 }}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className="group relative border-b border-white/8"
                >
                  <Link
                    href={`/services#${service.slug}`}
                    className="flex items-center gap-5 py-6 pr-2"
                    onClick={() => setActive(index)}
                  >
                    <span
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-[28px] border transition-all duration-500",
                        isActive
                          ? "border-brand-400/60 bg-brand-500/15 text-brand-200 shadow-[0_0_28px_-8px_rgba(43,108,255,0.9)]"
                          : "border-white/10 bg-white/[0.03] text-white/60",
                      )}
                    >
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "display block text-[clamp(1.15rem,2.4vw,1.6rem)] transition-all duration-500",
                          isActive ? "translate-x-1 text-white" : "text-white/55",
                        )}
                      >
                        {service.title}
                      </span>
                      <span className="mt-1.5 block truncate text-[0.83rem] text-white/55">{service.short}</span>
                    </span>
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-500",
                        isActive
                          ? "translate-x-0 border-brand-400/50 bg-brand-500/15 text-white opacity-100"
                          : "-translate-x-1 border-white/10 text-white/55 opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Icon name="arrowUpRight" className="h-4 w-4" />
                    </span>
                  </Link>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-0 left-0 h-px w-full origin-left bg-gradient-to-r from-brand-400 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* preview */}
          <Reveal className="order-1 lg:order-2" delay={0.1}>
            <div className="sticky top-28 overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#070d1d]">
              <div className="relative aspect-[4/3.1] overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={activeService.slug}
                    initial={{ opacity: 0, scale: 1.08, filter: "blur(14px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
                    transition={{ duration: 0.75, ease: EASE.soft }}
                    className="absolute inset-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      loading="lazy"
                      decoding="async"
                      src={activeService.image}
                      alt={activeService.title}
                      className="h-full w-full object-cover opacity-75"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,15,0.2),rgba(4,7,15,0.92))]" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeService.slug}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.5, ease: EASE.swift }}
                    >
                      <span className="eyebrow text-brand-200">{activeService.metric}</span>
                      <h3 className="display mt-3 text-[1.55rem] text-white">{activeService.title}</h3>
                      <p className="mt-2.5 max-w-md text-[0.88rem] leading-relaxed text-white/55">
                        {activeService.description}
                      </p>
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {activeService.bullets.slice(0, 3).map((bullet) => (
                          <li
                            key={bullet}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.7rem] text-white/60"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
