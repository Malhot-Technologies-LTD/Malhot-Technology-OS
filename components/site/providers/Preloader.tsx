"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ARROW, BLADE_LEFT, BLADE_RIGHT, MARK_VIEWBOX } from "@/components/site/brand/Logo";
import { setScrollLocked } from "@/components/site/providers/SmoothScroll";
import { EASE } from "@/lib/motion";

const STORAGE_KEY = "malhot:intro-seen";

/** Never shorter than this, so it reads as intentional rather than as a flash. */
const MIN_MS = 1400;
/** Never longer than this, whatever the network is doing. */
const MAX_MS = 4000;

/**
 * The entry sequence.
 *
 * The mark is three separate shapes — two blades and an arrow — so it builds
 * itself out of them: the blades arrive from the far left and right and lock
 * into the M, then the arrow rises through the gap and settles between them.
 * The wordmark's letterspacing closes from wide to final as it lands. When the
 * page is ready the panel splits down the middle and the two halves draw back
 * like doors, uncovering the hero already in place behind them.
 *
 * Four things keep it honest:
 *
 * - **The progress is real.** It advances on actual milestones — fonts ready,
 *   then `window.load` — rather than counting a fixed timer to 100 the way the
 *   previous version did. A slow creep fills the gaps so the number never
 *   stalls, and it is capped below 100 until the page genuinely finishes.
 * - **It never captures input.** The overlay is `pointer-events-none` for its
 *   whole life. An intro that swallows clicks is a gate, not a cover.
 * - **It is never the reason you wait**: `MAX_MS` closes it regardless.
 * - **Once per session**, read through `useSyncExternalStore` so the very first
 *   client render already knows, and a returning visitor sees nothing at all.
 */
function useShouldPlay() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(STORAGE_KEY) !== "1";
      } catch {
        // Private window or blocked storage: play it rather than fail closed.
        return true;
      }
    },
    () => true,
  );
}

export function Preloader() {
  const reduced = useReducedMotion();
  const shouldPlay = useShouldPlay();
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const active = shouldPlay && !reduced && !done;

  // Real loading milestones drive a target; the shown number eases toward it.
  const target = useRef(6);
  useEffect(() => {
    if (!active) return;

    const raise = (value: number) => {
      target.current = Math.max(target.current, value);
    };

    document.fonts?.ready.then(() => raise(58)).catch(() => raise(58));

    const onLoad = () => raise(100);
    if (document.readyState === "complete") requestAnimationFrame(onLoad);
    else window.addEventListener("load", onLoad, { once: true });

    // Creep, so the counter always moves even while a milestone is pending.
    const creep = setInterval(() => raise(Math.min(target.current + 1.4, 92)), 110);

    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed > MAX_MS) target.current = 100;

      setProgress((shown) => {
        const next = shown + (target.current - shown) * 0.09;
        return next > 99.4 ? 100 : next;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(creep);
      window.removeEventListener("load", onLoad);
    };
  }, [active]);

  // Close once the bar is full and the floor has elapsed.
  const openedAt = useRef(0);
  useEffect(() => {
    if (!active) return;
    if (openedAt.current === 0) openedAt.current = performance.now();
    if (progress < 99.5) return;

    const wait = Math.max(MIN_MS - (performance.now() - openedAt.current), 0);
    const close = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Nothing to do: the sequence simply plays again next visit.
      }
      setDone(true);
    }, wait);
    return () => clearTimeout(close);
  }, [active, progress]);

  // The page underneath stays still while the panel covers it.
  useEffect(() => {
    if (!active) return;
    setScrollLocked(true);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      setScrollLocked(false);
    };
  }, [active]);

  const shown = Math.round(progress);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div key="preloader" aria-hidden className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
          {/* The two halves that draw back to uncover the page. */}
          <motion.div
            className="absolute inset-y-0 left-0 w-[50.5%] bg-site-ink-deep"
            exit={{ x: "-100%" }}
            transition={{ duration: 0.95, ease: EASE.cinematic }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-[50.5%] bg-site-ink-deep"
            exit={{ x: "100%" }}
            transition={{ duration: 0.95, ease: EASE.cinematic }}
          />

          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center px-8"
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.34, ease: EASE.swift }}
          >
            {/* Light blooming behind the mark as it locks together. */}
            <motion.div
              className="pointer-events-none absolute top-1/2 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(43,108,255,0.32) 0%, rgba(43,108,255,0.08) 40%, transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: EASE.soft, delay: 0.25 }}
            />
            <div className="grid-noise pointer-events-none absolute inset-0 opacity-[0.3]" />

            <div className="relative flex flex-col items-center">
              <AssemblingMark />

              <motion.p
                className="mt-9 font-display text-[1.2rem] font-semibold text-white"
                initial={{ opacity: 0, letterSpacing: "1.1em" }}
                animate={{ opacity: 1, letterSpacing: "0.5em" }}
                transition={{ duration: 1.25, ease: EASE.soft, delay: 0.72 }}
              >
                {/* The track adds space after the final letter; pull it back so
                    the word sits optically centred under the mark. */}
                <span className="-mr-[0.5em] inline-block">MALHOT</span>
              </motion.p>

              <motion.div
                className="mt-10 h-px w-[min(20rem,64vw)] overflow-hidden bg-white/10"
                initial={{ opacity: 0, scaleX: 0.3 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.9, ease: EASE.soft, delay: 0.9 }}
              >
                <div
                  className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-white"
                  style={{ width: `${shown}%`, transition: "width 120ms linear" }}
                />
              </motion.div>

              <motion.div
                className="mt-4 flex w-[min(20rem,64vw)] items-center justify-between text-[0.58rem] tracking-[0.3em] text-white/55 uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 1.05 }}
              >
                <span>Build · Innovate · Grow</span>
                <span className="text-white/70 tabular-nums">{shown}</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * The mark building itself. The blades travel in from outside the frame and
 * decelerate into position; the arrow rises through the gap between them a beat
 * later, which is the moment the logo becomes readable.
 */
function AssemblingMark() {
  return (
    <svg viewBox={MARK_VIEWBOX} className="h-[5.5rem] w-[6.8rem]" fill="none" role="img" aria-label="MALHOT">
      <defs>
        <linearGradient id="intro-blade" x1="0" y1="79" x2="102" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1652e6" />
          <stop offset="55%" stopColor="#2b6cff" />
          <stop offset="100%" stopColor="#78a7ff" />
        </linearGradient>
      </defs>

      <motion.path
        d={BLADE_LEFT}
        fill="url(#intro-blade)"
        initial={{ x: -78, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1.15, ease: EASE.soft, delay: 0.08 }}
      />
      <motion.path
        d={BLADE_RIGHT}
        fill="url(#intro-blade)"
        initial={{ x: 78, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1.15, ease: EASE.soft, delay: 0.08 }}
      />
      <motion.path
        d={ARROW}
        fill="#ffffff"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 0.92 }}
        transition={{ duration: 0.95, ease: EASE.soft, delay: 0.52 }}
      />
    </svg>
  );
}
