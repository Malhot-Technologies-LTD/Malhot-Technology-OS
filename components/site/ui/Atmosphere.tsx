"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  animate,
} from "motion/react";
import { cn } from "@/lib/utils";

/* ----------------------------- Animated number ---------------------------- */

export function Counter({
  value,
  suffix = "",
  className,
  duration = 1.8,
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, motionValue, value, duration, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {reduced ? value : display}
      {suffix}
    </span>
  );
}

/* ------------------------------ Video canvas ------------------------------ */

export function VideoBackground({
  src,
  poster,
  className,
  overlayClassName,
  parallax = false,
  opacity = 0.55,
  priority = false,
}: {
  src: string;
  poster: string;
  className?: string;
  overlayClassName?: string;
  parallax?: boolean;
  opacity?: number;
  /**
   * This poster is the page's largest contentful paint.
   *
   * Set it on the one above the fold and leave it off everywhere else. The
   * poster is a full-bleed 1920x1080 still, so loading every one of them
   * eagerly would put several hundred kilobytes in front of the hero — but
   * lazy-loading the hero's own is worse, because the browser will not even
   * start fetching it until layout has run.
   */
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.05 });
  const [canPlay, setCanPlay] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "12%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1.26]);

  useEffect(() => {
    if (!inView || canPlay) return;

    // Cinematic video is a desktop/tablet enhancement only: small screens and
    // constrained connections keep the (much lighter) poster frame.
    const wideEnough = window.matchMedia("(min-width: 768px)").matches;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const frugal = Boolean(connection?.saveData) || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");

    if (!wideEnough || frugal) return;

    const timeout = window.setTimeout(() => setCanPlay(true), 260);
    return () => window.clearTimeout(timeout);
  }, [inView, canPlay]);

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      <motion.div className="absolute inset-0" style={parallax && !reduced ? { y, scale } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          src={poster}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
            loaded ? "opacity-0" : "opacity-100",
          )}
          style={{ opacity: loaded ? 0 : opacity }}
        />
        {canPlay && !reduced ? (
          <video
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            onLoadedData={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms]"
            style={{ opacity: loaded ? opacity : 0 }}
          />
        ) : null}
      </motion.div>
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(4,7,15,0.25),rgba(4,7,15,0.82)_70%,#04070f_100%)]",
          overlayClassName,
        )}
      />
    </div>
  );
}

/* --------------------------------- Aurora -------------------------------- */

export function Aurora({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute top-[-20%] -left-[10%] h-[38rem] w-[38rem] animate-aurora rounded-full blur-[120px]"
        style={{
          background: `radial-gradient(circle, rgba(43,108,255,${0.22 * intensity}) 0%, transparent 68%)`,
        }}
      />
      <div
        className="absolute top-[22%] right-[-12%] h-[32rem] w-[32rem] animate-aurora rounded-full blur-[130px]"
        style={{
          background: `radial-gradient(circle, rgba(94,160,255,${0.16 * intensity}) 0%, transparent 70%)`,
          animationDelay: "-6s",
        }}
      />
    </div>
  );
}

/* --------------------------- Scroll progress bar -------------------------- */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 28, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[95] h-[2px] origin-left bg-gradient-to-r from-brand-700 via-brand-400 to-white/80"
    />
  );
}

/* ------------------------------- Tilt card -------------------------------- */

export function TiltCard({
  children,
  className,
  strength = 8,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 20 });
  const sry = useSpring(ry, { stiffness: 180, damping: 20 });

  const handleMove = (event: React.PointerEvent) => {
    if (reduced || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * strength);
    rx.set(-py * strength);
  };

  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1100 }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
