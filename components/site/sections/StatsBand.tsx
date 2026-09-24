"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { Counter, VideoBackground } from "@/components/site/ui/Atmosphere";
import { Reveal, TextReveal } from "@/components/site/ui/Reveal";
import { media, stats } from "@/content/site";

export function StatsBand() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const clip = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(18% 12% 18% 12% round 2.5rem)", "inset(0% 0% 0% 0% round 2rem)"],
  );

  return (
    <section ref={ref} className="relative py-24 sm:py-28">
      <div className="shell">
        <motion.div
          style={reduced ? undefined : { clipPath: clip }}
          className="relative isolate overflow-hidden rounded-[2rem] border border-white/10"
        >
          <VideoBackground
            src={media.flowVideo}
            poster={media.flowPoster}
            opacity={0.5}
            parallax
            overlayClassName="bg-[linear-gradient(180deg,rgba(4,7,15,0.82),rgba(5,10,22,0.92))]"
          />
          <div className="relative px-6 py-20 sm:px-12 lg:px-16">
            <div className="max-w-2xl">
              <Reveal>
                <span className="eyebrow">
                  <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
                  Proof, not promises
                </span>
              </Reveal>
              <TextReveal
                text="Numbers that reflect the work."
                highlight={["work."]}
                className="display mt-6 text-[clamp(1.9rem,4.2vw,3.2rem)] text-white"
              />
              <Reveal delay={0.1}>
                <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-white/55">
                  We measure our studio the same way we measure the products we ship — by outcomes, reliability and the
                  clients who stay with us.
                </p>
              </Reveal>
            </div>

            {/*
              One element between the dl and its terms, not two: the animation
              wrapper *is* the grouping div. Nesting a second one inside it is
              what axe reports as a broken definition list.
            */}
            <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <Reveal key={stat.label} delay={index * 0.08} className="border-l border-white/12 pl-5">
                  <dt className="display text-[clamp(2.2rem,5vw,3.6rem)] text-white">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </dt>
                  <dd className="mt-2 text-[0.72rem] tracking-[0.2em] text-white/60 uppercase">{stat.label}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
