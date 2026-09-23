import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Headline figures (docs/design/design-system.md#data-display-rules).
 *
 * A number on a dashboard is only useful if you can act on it, so a tile that
 * counts something filterable is a link to that filter, and a tile counting
 * zero says so in words rather than showing a bare 0 with no explanation.
 * Tone is available but deliberately rationed: if every tile is coloured, the
 * one that matters stops standing out.
 */

type Tone = "neutral" | "brand" | "warning" | "danger" | "success";

const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-fg",
  brand: "text-brand",
  warning: "text-status-warning-fg",
  danger: "text-status-danger-fg",
  success: "text-status-success-fg",
};

const TONE_ICON: Record<Tone, string> = {
  neutral: "bg-bg-subtle text-fg-subtle",
  brand: "bg-brand-subtle text-brand",
  warning: "bg-status-warning-bg text-status-warning-fg",
  danger: "bg-status-danger-bg text-status-danger-fg",
  success: "bg-status-success-bg text-status-success-fg",
};

type StatTileProps = {
  label: string;
  value: number | string;
  /** Sits under the value: what the number means, or why it is zero. */
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
};

export function StatTile({ label, value, hint, icon: Icon, tone = "neutral", href }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[15px] text-fg-muted">{label}</span>
        {Icon ? (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE_ICON[tone])}>
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={cn("text-[40px] leading-none font-semibold tabular-nums", TONE_VALUE[tone])}>{value}</span>
        {hint ? <span className="truncate text-sm text-fg-subtle">{hint}</span> : null}
      </div>
    </>
  );

  const className = cn(
    "flex flex-col justify-between gap-7 rounded-lg border border-border bg-surface p-6 transition-[colors,transform,box-shadow] duration-[160ms] ease-standard",
    href && "hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-raised hover:shadow-m",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

type RingProps = {
  done: number;
  total: number;
  /** Named for a screen reader; the ring itself is decorative without it. */
  label: string;
  size?: number;
  className?: string;
};

/**
 * Donut for a single ratio.
 *
 * The counts sit under the ring, never the percentage alone: "100%" of nothing
 * is the most misleading figure a dashboard can show, and the denominator is
 * what makes it honest.
 */
export function ProgressRing({ done, total, label, size = 148, className }: RingProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${label}: ${done} of ${total}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-bg-subtle"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            className="stroke-brand transition-[stroke-dashoffset] duration-[240ms] ease-standard"
          />
        </svg>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-3xl font-semibold tabular-nums"
        >
          {percent}%
        </span>
      </div>
      <p aria-hidden="true" className="text-base text-fg-muted tabular-nums">
        {done} of {total}
      </p>
    </div>
  );
}
