import type { Transition, Variants } from "motion/react";

/**
 * MALHOT motion language.
 * Confident, cinematic, controlled. Transform + opacity only.
 */
export const EASE = {
  swift: [0.22, 1, 0.36, 1],
  cinematic: [0.65, 0, 0.35, 1],
  soft: [0.16, 1, 0.3, 1],
} as const;

export const DURATION = {
  xs: 0.24,
  sm: 0.4,
  md: 0.7,
  lg: 1.05,
  xl: 1.4,
} as const;

export const transition = {
  swift: { duration: DURATION.sm, ease: EASE.swift } as Transition,
  base: { duration: DURATION.md, ease: EASE.swift } as Transition,
  slow: { duration: DURATION.lg, ease: EASE.soft } as Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.md, ease: EASE.swift },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.lg, ease: EASE.soft } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.md, ease: EASE.swift },
  },
};

export const maskReveal: Variants = {
  hidden: { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 },
  show: {
    clipPath: "inset(0% 0% 0% 0%)",
    opacity: 1,
    transition: { duration: DURATION.xl, ease: EASE.soft },
  },
};

export function stagger(amount = 0.08, delay = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: amount, delayChildren: delay },
    },
  };
}

export const wordVariants: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.9, ease: EASE.soft },
  },
};

export const viewportOnce = { once: true, amount: 0.25 } as const;
