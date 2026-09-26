import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon, type IconName } from "@/components/site/brand/Icon";
import { cn } from "@/lib/utils";

/**
 * Website buttons.
 *
 * Solid, square-cornered and quiet: a colour change on hover and nothing
 * else. `primary` is the one call to action in a view. `secondary` sits beside
 * it on a light section, and the two `inverse` variants do the same jobs on a
 * navy band, where the brand blue has too little contrast to carry a label.
 */
type Variant = "primary" | "secondary" | "inverse" | "inverse-outline" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-m)] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-site-blue-deep",
  secondary: "border border-border-strong bg-white text-fg hover:border-fg hover:bg-bg-subtle",
  inverse: "bg-white text-site-ink hover:bg-brand-subtle",
  "inverse-outline": "border border-white/50 text-white hover:border-white hover:bg-white/10",
  ghost: "text-fg-muted hover:bg-bg-subtle hover:text-fg",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-[0.875rem]",
  lg: "h-12 px-6 text-[0.95rem]",
};

type SharedProps = {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: "left" | "right";
  className?: string;
  children: ReactNode;
};

function Content({
  children,
  icon,
  iconPosition = "right",
  loading = false,
}: Pick<SharedProps, "children" | "icon" | "iconPosition"> & { loading?: boolean }) {
  return (
    <>
      {loading ? (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon && iconPosition === "left" ? (
        <Icon name={icon} className="h-4 w-4" />
      ) : null}
      <span className="whitespace-nowrap">{children}</span>
      {!loading && icon && iconPosition === "right" ? <Icon name={icon} className="h-4 w-4" /> : null}
    </>
  );
}

type ButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { loading?: boolean };

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition,
  className,
  children,
  loading = false,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={icon} iconPosition={iconPosition} loading={loading}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = SharedProps & {
  href: string;
  target?: string;
  rel?: string;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconPosition,
  className,
  children,
  target,
  rel,
}: ButtonLinkProps) {
  return (
    <Link href={href} target={target} rel={rel} className={cn(base, variants[variant], sizes[size], className)}>
      <Content icon={icon} iconPosition={iconPosition}>
        {children}
      </Content>
    </Link>
  );
}
