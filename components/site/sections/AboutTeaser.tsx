"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { ButtonLink } from "@/components/site/ui/Button";
import { Reveal, TextReveal } from "@/components/site/ui/Reveal";
import { media } from "@/content/site";

const pillars = [
  { title: "Senior by default", copy: "You work directly with the people building your product." },
  { title: "Design + engineering", copy: "One team, one standard — nothing gets lost in handover." },
  { title: "Shipped, not slideware", copy: "Weekly releases you can click, test and show your board." },
];

export function AboutTeaser() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const yA = useTransform(scrollYProgress, [0, 1], ["6%", "-12%"]);
  const yB = useTransform(scrollYProgress, [0, 1], ["-8%", "10%"]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="relative order-2 lg:order-1">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <motion.div
              style={reduced ? undefined : { y: yA }}
              className="relative aspect-[3/4] overflow-hidden rounded-[1.4rem] border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={media.studio}
                alt="MALHOT team collaborating"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(43,108,255,0.12),rgba(4,7,15,0.7))]" />
            </motion.div>
            <motion.div
              style={reduced ? undefined : { y: yB }}
              className="relative mt-10 aspect-[3/4] overflow-hidden rounded-[1.4rem] border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={media.pair}
                alt="Engineers pairing on a build"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(4,7,15,0.55),rgba(43,108,255,0.14))]" />
            </motion.div>
          </div>

          <Reveal delay={0.15}>
            <div className="glass absolute -bottom-6 left-1/2 flex w-[min(20rem,88%)] -translate-x-1/2 items-center gap-4 rounded-[36px] px-5 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[28px] bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <Icon name="spark" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.82rem] font-medium text-white">Innovation. Creativity. Impact.</p>
                <p className="mt-0.5 text-[0.72rem] text-white/60">The MALHOT operating principles</p>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal>
            <span className="eyebrow">
              <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
              Who we are
            </span>
          </Reveal>
          <TextReveal
            text="A studio of builders, designers and problem solvers."
            highlight={["problem", "solvers."]}
            className="display mt-6 text-[clamp(1.9rem,4.2vw,3.2rem)] text-white"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-[0.98rem] leading-relaxed text-white/55">
              MALHOT exists to turn complicated ideas into products people actually enjoy using. We combine strategy,
              design and engineering into one focused team so momentum never gets lost between disciplines.
            </p>
          </Reveal>

          <ul className="mt-10 space-y-5">
            {pillars.map((pillar, index) => (
              <Reveal
                key={pillar.title}
                as="li"
                delay={0.1 + index * 0.08}
                className="group flex gap-4 border-b border-white/8 pb-5"
              >
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand-400/40 bg-brand-500/12 text-brand-200 transition-all duration-500 group-hover:bg-brand-500/25">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-[0.95rem] font-medium text-white">{pillar.title}</p>
                  <p className="mt-1 text-[0.86rem] text-white/60">{pillar.copy}</p>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.25} className="mt-10">
            <ButtonLink href="/about" variant="outline" icon="arrow">
              More about MALHOT
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
