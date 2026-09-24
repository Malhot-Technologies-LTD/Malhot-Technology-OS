"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Logo } from "@/components/site/brand/Logo";
import { Icon } from "@/components/site/brand/Icon";
import { ButtonLink } from "@/components/site/ui/Button";
import { Reveal, TextReveal } from "@/components/site/ui/Reveal";
import { navLinks, services, site } from "@/content/site";

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const glow = useTransform(scrollYProgress, [0, 1], [0.15, 0.75]);
  const lift = useTransform(scrollYProgress, [0, 1], [70, 0]);

  return (
    <footer ref={ref} className="relative isolate overflow-hidden border-t border-white/8 bg-[#04070f] pt-24">
      <motion.div
        aria-hidden
        style={{ opacity: glow }}
        className="pointer-events-none absolute top-0 left-1/2 h-[34rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(43,108,255,0.38),transparent_68%)]" />
      </motion.div>
      <div aria-hidden className="grid-noise pointer-events-none absolute inset-0 opacity-30" />

      <div className="shell relative">
        <motion.div style={{ y: lift }} className="flex flex-col items-center text-center">
          <Reveal>
            <span className="eyebrow">
              <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
              Let&apos;s build
            </span>
          </Reveal>
          <TextReveal
            text="Let's create something amazing together."
            highlight={["amazing"]}
            className="display mt-6 max-w-4xl justify-center text-[clamp(2.2rem,6vw,4.6rem)] text-white"
          />
          <Reveal delay={0.12} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/start" size="lg" icon="arrowUpRight">
              Start a Project
            </ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="secondary" icon="mail" iconPosition="left">
              Talk to us
            </ButtonLink>
          </Reveal>
        </motion.div>

        <div className="mt-24 grid gap-12 border-t border-white/8 pt-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo withTagline />
            <p className="mt-6 max-w-xs text-[0.88rem] leading-relaxed text-white/60">
              A digital product studio turning ambitious ideas into fast, beautiful and reliable software.
            </p>
            <div className="mt-6 flex gap-2.5">
              {site.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 transition-all duration-500 hover:-translate-y-0.5 hover:border-brand-400/60 hover:bg-brand-500/12 hover:text-white"
                >
                  <Icon name={social.icon} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[0.72rem] font-semibold tracking-[0.24em] text-white/55 uppercase">Quick links</h3>
            <ul className="mt-5 space-y-3">
              {[...navLinks, { label: "Start a Project", href: "/start" }].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-2 text-[0.88rem] text-white/55 transition-colors hover:text-white"
                  >
                    <span className="h-px w-0 bg-brand-400 transition-all duration-500 group-hover:w-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.72rem] font-semibold tracking-[0.24em] text-white/55 uppercase">Services</h3>
            <ul className="mt-5 space-y-3">
              {services.slice(0, 5).map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services#${service.slug}`}
                    className="group inline-flex items-center gap-2 text-[0.88rem] text-white/55 transition-colors hover:text-white"
                  >
                    <span className="h-px w-0 bg-brand-400 transition-all duration-500 group-hover:w-4" />
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.72rem] font-semibold tracking-[0.24em] text-white/55 uppercase">Contact</h3>
            <ul className="mt-5 space-y-4 text-[0.88rem] text-white/55">
              <li className="flex items-center gap-3">
                <Icon name="mail" className="h-4 w-4 text-brand-300" />
                <a href={`mailto:${site.email}`} className="transition hover:text-white">
                  {site.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Icon name="phone" className="h-4 w-4 text-brand-300" />
                <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="transition hover:text-white">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Icon name="pin" className="h-4 w-4 text-brand-300" />
                {site.location}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/8 py-8 text-[0.76rem] text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} MALHOT. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="transition hover:text-white/70">
              Privacy Policy
            </Link>
            <Link href="/contact" className="transition hover:text-white/70">
              Terms
            </Link>
            <span className="hidden sm:inline">{site.timezone}</span>
          </div>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none relative -mb-6 overflow-hidden mask-fade-b select-none">
        <p className="display text-center text-[clamp(4rem,19vw,17rem)] leading-[0.8] whitespace-nowrap text-white/[0.045]">
          MALHOT
        </p>
      </div>
    </footer>
  );
}
