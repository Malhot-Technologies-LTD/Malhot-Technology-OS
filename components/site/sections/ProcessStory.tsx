"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { Reveal, TextReveal } from "@/components/site/ui/Reveal";
import { processSteps } from "@/content/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ProcessStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(processSteps.length - 1, Math.floor(value * processSteps.length + 0.0001));
    setIndex(next < 0 ? 0 : next);
  });

  const lineScale = useTransform(scrollYProgress, [0, 1], [0.04, 1]);
  const active = processSteps[index];

  return (
    <section ref={ref} className="relative h-[260vh] lg:h-[400vh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 left-[-10%] h-[32rem] w-[32rem] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(43,108,255,0.18), transparent 70%)" }}
        />
        <div className="shell grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <span className="eyebrow">
                <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
                How we work
              </span>
            </Reveal>
            <TextReveal
              text="A process built for momentum."
              highlight={["momentum."]}
              className="display mt-6 text-[clamp(2rem,4.6vw,3.6rem)] text-white"
            />

            <div className="relative mt-10 pl-8">
              <span className="absolute top-1 left-0 h-[calc(100%-0.5rem)] w-px bg-white/10" />
              <motion.span
                style={{ scaleY: lineScale }}
                className="absolute top-1 left-0 h-[calc(100%-0.5rem)] w-px origin-top bg-gradient-to-b from-brand-300 to-brand-600"
              />
              <ul className="space-y-6">
                {processSteps.map((step, i) => {
                  const isActive = i === index;
                  return (
                    <li key={step.index}>
                      <button
                        type="button"
                        onClick={() => {
                          const target = ref.current;
                          if (!target) return;
                          const top = target.offsetTop + (target.offsetHeight / processSteps.length) * i + 10;
                          window.scrollTo({ top, behavior: "smooth" });
                        }}
                        className="group block w-full text-left"
                      >
                        <span className="flex items-baseline gap-4">
                          <span
                            className={cn(
                              "font-mono text-[0.72rem] transition-colors duration-500",
                              isActive ? "text-brand-300" : "text-white/55",
                            )}
                          >
                            {step.index}
                          </span>
                          <span
                            className={cn(
                              "display text-[1.4rem] transition-all duration-500 sm:text-[1.7rem]",
                              isActive ? "translate-x-1 text-white" : "text-white/55",
                            )}
                          >
                            {step.title}
                          </span>
                        </span>
                        <AnimatePresence initial={false}>
                          {isActive ? (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.5, ease: EASE.swift }}
                              className="ml-[2.4rem] max-w-md overflow-hidden text-[0.9rem] leading-relaxed text-white/50"
                            >
                              <span className="block pt-2">{step.copy}</span>
                            </motion.p>
                          ) : null}
                        </AnimatePresence>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="relative hidden aspect-[4/3.4] overflow-hidden rounded-[2rem] border border-white/10 lg:block">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={active.index}
                initial={{ clipPath: "inset(0% 0% 100% 0%)", scale: 1.12 }}
                animate={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 1, ease: EASE.soft }}
                className="absolute inset-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  loading="lazy"
                  decoding="async"
                  src={active.image}
                  alt={active.title}
                  className="h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(43,108,255,0.14),rgba(4,7,15,0.85))]" />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-7">
              <div>
                <p className="font-mono text-[0.7rem] text-brand-300">STEP {active.index}</p>
                <p className="display mt-2 text-[2rem] text-white">{active.title}</p>
              </div>
              <div className="flex gap-1.5">
                {processSteps.map((step, i) => (
                  <span
                    key={step.index}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      i === index ? "w-8 bg-brand-400" : "w-3 bg-white/20",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
