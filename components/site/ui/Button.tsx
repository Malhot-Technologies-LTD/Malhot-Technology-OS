"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { Icon, type IconName } from "@/components/site/brand/Icon";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const MotionLink = motion.create(Link);

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 text-white shadow-[0_18px_44px_-18px_rgba(43,108,255,0.9)] hover:shadow-[0_26px_60px_-18px_rgba(43,108,255,1)]",
  secondary: "glass text-white hover:border-brand-400/60 hover:bg-brand-500/12",
  outline: "border border-white/15 bg-transparent text-white hover:border-brand-400/70 hover:bg-white/5",
  ghost: "text-white/70 hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.78rem]",
  md: "h-11 px-6 text-[0.86rem]",
  lg: "h-[3.35rem] px-8 text-[0.94rem]",
};

type SharedProps = {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: "left" | "right";
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
};

function Inner({
  children,
  icon,
  iconPosition = "right",
  loading,
  variant = "primary",
}: {
  children: ReactNode;
  icon?: IconName;
  iconPosition?: "left" | "right";
  loading?: boolean;
  variant?: Variant;
}) {
  return (
    <>
      {variant === "primary" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.45),transparent)] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-full"
        />
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 scale-y-0 bg-gradient-to-r from-brand-600/25 to-brand-400/15 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:scale-y-100 group-hover/btn:opacity-100"
        />
      )}

      {loading ? (
        <span
          aria-hidden
          className="relative h-4 w-4 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white"
        />
      ) : icon && iconPosition === "left" ? (
        <Icon
          name={icon}
          className="relative h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:-translate-x-0.5"
        />
      ) : null}

      <span className="relative whitespace-nowrap">{children}</span>

      {!loading && icon && iconPosition === "right" ? (
        <Icon
          name={icon}
          className="relative h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-1"
        />
      ) : null}
    </>
  );
}

function useMagnetic(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.35 });

  const active = enabled && !reduced;

  const onMove = (event: React.PointerEvent) => {
    if (!active || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    x.set(relX * 0.22);
    y.set(relY * 0.3);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return [ref, { x: sx, y: sy }, onMove, onLeave] as const;
}

type ButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    loading?: boolean;
  };

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  magnetic = true,
  className,
  children,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const [magnetRef, magnetStyle, handleMove, handleLeave] = useMagnetic(magnetic);

  return (
    <motion.button
      ref={magnetRef as React.Ref<HTMLButtonElement>}
      style={magnetStyle}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      data-cursor="link"
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      <Inner icon={icon} iconPosition={iconPosition} loading={loading} variant={variant}>
        {children}
      </Inner>
    </motion.button>
  );
}

type ButtonLinkProps = SharedProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  magnetic = true,
  className,
  children,
  target,
  rel,
  onClick,
}: ButtonLinkProps) {
  const [magnetRef, magnetStyle, handleMove, handleLeave] = useMagnetic(magnetic);

  return (
    <MotionLink
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      ref={magnetRef as React.Ref<HTMLAnchorElement>}
      style={magnetStyle}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn(base, variants[variant], sizes[size], className)}
      data-cursor="link"
    >
      <Inner icon={icon} iconPosition={iconPosition} variant={variant}>
        {children}
      </Inner>
    </MotionLink>
  );
}
