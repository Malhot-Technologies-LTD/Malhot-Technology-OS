"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { EASE } from "@/lib/motion";

/**
 * Route transition for the public site.
 *
 * Every navigation lifts a navy curtain away from the incoming page while the
 * content settles in from a soft blur.
 *
 * A template rather than part of the layout, because Next remounts a template
 * on every navigation and keeps a layout alive — the remount is what replays
 * the curtain. It sits under `(marketing)` rather than at the app root so the
 * OS, which has its own motion language and no business being cinematic, never
 * pays for it.
 *
 * Reduced motion gets the children and nothing else: no curtain, no blur, no
 * delay before the page is readable.
 */
export default function MarketingTemplate({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <>
      <motion.div
        aria-hidden
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.85, ease: EASE.cinematic }}
        style={{ transformOrigin: "top" }}
        className="pointer-events-none fixed inset-0 z-[100] bg-[linear-gradient(180deg,#04070f_0%,#071230_55%,#0b2d85_100%)]"
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: EASE.soft, delay: 0.14 }}
      >
        {children}
      </motion.div>
    </>
  );
}
