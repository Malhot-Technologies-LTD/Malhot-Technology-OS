"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { ButtonLink } from "@/components/site/ui/Button";
import { ProjectCard } from "@/components/site/cards/ProjectCard";
import { projects } from "@/content/site";
import { EASE } from "@/lib/motion";

/**
 * Vertical scroll drives a horizontal sequence of work on desktop: the section
 * pins, the track travels left until the last project clears, and only then
 * does the page carry on downwards.
 *
 * Two things here are deliberate:
 *
 * 1. **Both layouts are always rendered, and the viewport choice is made in
 *    CSS.** This component used to `return` the mobile markup when a state flag
 *    was false, which it always is on the first render — so `ref` never
 *    attached and `useScroll` threw "Target ref is defined but not hydrated",
 *    leaving the horizontal track dead. Keeping the ref mounted unconditionally
 *    fixes that and removes a hydration mismatch at the same time.
 * 2. **The section is exactly as tall as the track is wide**, so one pixel of
 *    vertical scroll moves the track one pixel sideways. A fixed height would
 *    make the sequence race or crawl as projects are added or removed.
 */
export function WorkShowcase() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      // Only the desktop track is laid out; below lg it is display:none and
      // reports no width, which correctly yields a distance of 0.
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth + 80));
    };

    measure();
    window.addEventListener("resize", measure);

    // Card widths depend on fonts and images settling, so re-measure when the
    // track actually changes size rather than only on resize.
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const x = useSpring(rawX, { stiffness: 140, damping: 26, mass: 0.35 });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0.03, 1]);

  const heading = (
    <>
      Real solutions. <span className="text-gradient">Real impact.</span>
    </>
  );

  return (
    <section ref={ref} className="relative">
      {/* Mobile and tablet: the same work as an ordinary stack. */}
      <div className="py-24 lg:hidden">
        <div className="shell">
          <div className="flex flex-col gap-6">
            <span className="eyebrow">
              <span className="h-[5px] w-[5px] rounded-full bg-brand-400" />
              Selected work
            </span>
            <h2 className="display text-[clamp(2rem,8vw,2.8rem)] text-white">{heading}</h2>
            <p className="max-w-md text-[0.95rem] leading-relaxed text-white/50">
              Products we designed, engineered and launched.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {projects.slice(0, 4).map((project, index) => (
              <ProjectCard key={project.slug} project={project} index={index} compact />
            ))}
          </div>
          <div className="mt-10">
            <ButtonLink href="/projects" variant="outline" icon="arrow">
              View all projects
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Desktop: pinned, with the track travelling the full width of the row. */}
      <div className="hidden lg:block" style={{ height: `calc(100svh + ${distance}px)` }}>
        <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_20%_20%,rgba(43,108,255,0.12),transparent_70%)]"
          />

          <div className="shell relative flex items-end justify-between pb-10">
            <div>
              <span className="eyebrow">
                <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
                Selected work
              </span>
              <h2 className="display mt-5 text-[clamp(2.2rem,4.4vw,3.6rem)] text-white">{heading}</h2>
            </div>
            <div className="flex items-center gap-6">
              <span className="hidden items-center gap-2 text-[0.72rem] tracking-[0.24em] text-white/55 uppercase xl:flex">
                Scroll to explore
                <Icon name="arrow" className="h-4 w-4 text-brand-300" />
              </span>
              <ButtonLink href="/projects" variant="outline" size="sm" icon="arrowUpRight">
                All projects
              </ButtonLink>
            </div>
          </div>

          <motion.div ref={trackRef} style={{ x }} className="flex w-max gap-7 pr-24 pl-[var(--shell-x)]">
            {projects.map((project, index) => (
              <motion.article
                key={project.slug}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE.soft, delay: index * 0.04 }}
                className="group relative w-[min(30rem,72vw)] shrink-0"
              >
                <Link
                  href={`/projects/${project.slug}`}
                  className="block overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#070d1d] transition-all duration-700 hover:border-brand-400/45 hover:shadow-[0_50px_100px_-60px_rgba(43,108,255,0.9)]"
                >
                  <div className="relative aspect-[16/11] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      loading="lazy"
                      decoding="async"
                      src={project.cover || project.image}
                      alt={project.title}
                      className="h-full w-full object-cover opacity-80 transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,15,0.1),rgba(4,7,15,0.9))]" />
                    <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
                      <div>
                        <p className="font-mono text-[0.68rem] text-brand-300">
                          {project.category} · {project.year}
                        </p>
                        <h3 className="display mt-2 text-[1.6rem] text-white">{project.title}</h3>
                      </div>
                      <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-all duration-500 group-hover:border-brand-400/60 group-hover:bg-brand-500/25">
                        <Icon name="arrowUpRight" className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-6 px-6 py-5">
                    <p className="max-w-sm text-[0.85rem] leading-relaxed text-white/60">{project.summary}</p>
                    <div className="hidden shrink-0 gap-4 text-right xl:flex">
                      {project.results.slice(0, 1).map((result) => (
                        <div key={result.label}>
                          <p className="display text-[1.3rem] text-white">{result.value}</p>
                          <p className="text-[0.66rem] tracking-[0.16em] text-white/55 uppercase">{result.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>

          <div className="shell mt-10">
            <div className="h-px w-full bg-white/8">
              <motion.div
                style={{ scaleX: progressScale }}
                className="h-px origin-left bg-gradient-to-r from-brand-500 to-brand-200"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
