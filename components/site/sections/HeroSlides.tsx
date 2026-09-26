"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;

type Slide = { src: string; alt: string };

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The hero's background photos, sliding horizontally on a timer.
 *
 * The photos sit in one track that moves by a full width per slide; the
 * headline and buttons are rendered by the page on top and never move.
 *
 * Accessibility: anything that moves on its own for more than five seconds
 * needs a way to stop it (WCAG 2.2.2), so there is a pause button beside the
 * dots. Autoplay also stops while the pointer or keyboard focus is on the
 * controls, and never starts for anyone who has asked for reduced motion.
 * The photos are decorative (the headline carries the meaning), so they have
 * empty alt text and the controls are labelled by position instead.
 */
export function HeroSlides({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const playing = !paused && !hovering && !reducedMotion && slides.length > 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, slides.length]);

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={slide.src} className="relative h-full w-full shrink-0">
              <Image
                src={slide.src}
                alt=""
                fill
                sizes="100vw"
                preload={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <div
          role="group"
          aria-label="Background photos"
          className="mt-10 flex items-center gap-3"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setHovering(true)}
          onBlur={() => setHovering(false)}
        >
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/50 text-white transition-colors hover:bg-white/10"
          >
            {paused ? (
              <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
                <path d="M8 5.5 18.5 12 8 18.5v-13Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              </svg>
            )}
          </button>
          <ul className="flex items-center gap-1">
            {slides.map((slide, i) => (
              <li key={slide.src}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1} of ${slides.length}`}
                  aria-current={i === index ? "true" : undefined}
                  className="grid h-8 w-8 place-items-center"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      i === index ? "w-6 bg-white" : "w-1.5 bg-white/60",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
