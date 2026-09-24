"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { ButtonLink } from "@/components/site/ui/Button";
import { Counter, VideoBackground } from "@/components/site/ui/Atmosphere";
import { EASE } from "@/lib/motion";
import { media, site, stats } from "@/content/site";

const headline = [
  { text: "Turning", accent: false },
  { text: "Ideas", accent: false },
  { text: "Into", accent: false },
  { text: "Powerful", accent: true },
  { text: "Digital", accent: false },
  { text: "Solutions", accent: false },
];

export function Hero() {
  const [vh, setVh] = useState(900);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();

  useEffect(() => {
    const set = () => setVh(window.innerHeight || 900);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const contentY = useTransform(scrollY, [0, vh], [0, 150]);
  const contentOpacity = useTransform(scrollY, [0, vh * 0.68], [1, 0]);
  const mediaScale = useTransform(scrollY, [0, vh], [1, 1.16]);
  const shellOpacity = useTransform(scrollY, [vh * 0.85, vh * 1.05], [1, 0]);

  const style = reduced ? undefined : { y: contentY, opacity: contentOpacity };

  return (
    <motion.section
      style={reduced ? undefined : { opacity: shellOpacity }}
      className="sticky top-0 z-0 flex h-[100svh] min-h-[38rem] w-full items-center overflow-hidden"
    >
      <motion.div className="absolute inset-0" style={reduced ? undefined : { scale: mediaScale }}>
        <VideoBackground
          src={media.heroVideo}
          poster={media.heroPoster}
          opacity={0.62}
          priority
          overlayClassName="bg-[linear-gradient(100deg,rgba(4,7,15,0.95)_6%,rgba(4,7,15,0.72)_42%,rgba(4,7,15,0.35)_68%,rgba(4,7,15,0.9)_100%)]"
        />
      </motion.div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-site-ink-deep via-site-ink-deep/70 to-transparent"
      />
      <div aria-hidden className="grid-noise pointer-events-none absolute inset-0 opacity-25" />

      <motion.div style={style} className="shell relative z-10 w-full pt-24">
        <div className="max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE.soft, delay: 0.25 }}
            className="eyebrow glass inline-flex rounded-full px-4 py-2"
          >
            <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-brand-400 shadow-[0_0_14px_3px_rgba(43,108,255,0.85)]" />
            Digital product studio · {site.location}
          </motion.span>

          <h1 className="display mt-7 flex flex-wrap text-[clamp(2.6rem,7.4vw,6rem)] text-white">
            {/* See the note in PageHero: the split reveal eats the spaces. */}
            <span className="sr-only">{headline.map((word) => word.text).join(" ")}</span>
            {headline.map((word, index) => (
              <span aria-hidden key={word.text} className="overflow-hidden pr-[0.28em] pb-[0.06em]">
                <motion.span
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{
                    duration: 1.05,
                    ease: EASE.soft,
                    delay: 0.35 + index * 0.075,
                  }}
                  className={`inline-block ${word.accent ? "text-gradient" : ""}`}
                >
                  {word.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE.soft, delay: 0.85 }}
            className="mt-7 max-w-xl text-[1.02rem] leading-relaxed text-white/60"
          >
            We build modern websites, powerful applications and smart digital solutions that help ambitious businesses
            grow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE.soft, delay: 1 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <ButtonLink href="/start" size="lg" icon="arrowUpRight">
              Start a Project
            </ButtonLink>
            <ButtonLink href="/projects" size="lg" variant="secondary" icon="play" iconPosition="left">
              See our work
            </ButtonLink>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE.soft, delay: 1.15 }}
            className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8"
          >
            {stats.slice(0, 3).map((stat) => (
              <div key={stat.label}>
                <dt className="display text-[clamp(1.6rem,3.4vw,2.4rem)] text-white">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </dt>
                <dd className="mt-1.5 text-[0.72rem] tracking-[0.18em] text-white/55 uppercase">{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        style={reduced ? undefined : { opacity: contentOpacity }}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-[0.6rem] tracking-[0.34em] text-white/55 uppercase">
          Scroll
          <span className="relative h-12 w-px overflow-hidden bg-white/12">
            <span className="absolute inset-x-0 top-0 h-5 animate-scan bg-gradient-to-b from-transparent via-brand-300 to-transparent" />
          </span>
        </div>
      </motion.div>

      <div className="absolute right-[var(--shell-x)] bottom-8 z-10 hidden items-center gap-3 text-[0.72rem] text-white/55 lg:flex">
        <Icon name="spark" className="h-4 w-4 text-brand-300" />
        <span>{site.tagline}</span>
      </div>
    </motion.section>
  );
}
