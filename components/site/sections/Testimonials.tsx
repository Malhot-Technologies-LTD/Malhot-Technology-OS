"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { Reveal } from "@/components/site/ui/Reveal";
import { testimonials } from "@/content/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % testimonials.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(next, 6500);
    return () => window.clearInterval(timer);
  }, [next, paused]);

  const item = testimonials[index];

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[34rem] w-[54rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]"
        style={{ background: "radial-gradient(circle, rgba(43,108,255,0.14), transparent 70%)" }}
      />
      <div className="shell relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <Reveal className="flex justify-center">
          <span className="eyebrow">
            <span className="h-[5px] w-[5px] rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(43,108,255,0.8)]" />
            Client voices
          </span>
        </Reveal>

        <div className="relative mx-auto mt-10 min-h-[19rem] max-w-4xl sm:min-h-[16rem]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
              transition={{ duration: 0.7, ease: EASE.soft }}
              className="text-center"
            >
              <Icon name="spark" className="mx-auto h-6 w-6 text-brand-400" />
              <blockquote className="display mt-7 text-[clamp(1.3rem,3.1vw,2.2rem)] leading-[1.25] text-balance text-white/90">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-8 text-[0.85rem] text-white/60">
                <span className="font-medium text-white/80">{item.name}</span>
                <span className="mx-2 text-white/55">/</span>
                {item.role}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Show testimonial from ${t.name}`}
              onClick={() => setIndex(i)}
              className="group py-2"
            >
              <span
                className={cn(
                  "block h-[3px] rounded-full transition-all duration-500",
                  i === index
                    ? "w-10 bg-brand-400 shadow-[0_0_14px_1px_rgba(43,108,255,0.7)]"
                    : "w-4 bg-white/18 group-hover:bg-white/35",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
