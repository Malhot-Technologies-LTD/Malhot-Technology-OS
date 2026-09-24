import { cn } from "@/lib/utils";

/**
 * The real MALHOT mark, traced as vector geometry off the logo artwork rather
 * than redrawn as a generic "M".
 *
 * Three shapes on a 102x82 field: two blades that form the outer M, and an
 * arrow — a notched chevron over a stem with a pointed nib — between them. The
 * blades carry the brand blue; the arrow is navy in the source artwork, which
 * would vanish on this surface, so it renders white here.
 *
 * The gradient id is namespaced per instance: two marks on one page sharing an
 * id makes the second one inherit the first one's fill.
 */
/**
 * The mark's three pieces, exported so the intro can assemble them one by one
 * rather than fading in a flat logo. Keep them here: two copies of this
 * geometry would drift apart.
 */
export const MARK_VIEWBOX = "0 0 102 82";
export const BLADE_LEFT = "M0 0 L40 31 L40 47 L18 31 L18 65 L0 79 Z";
export const BLADE_RIGHT = "M102 0 L62 31 L62 47 L84 31 L84 65 L102 79 Z";
export const ARROW = "M22 8 L51 20 L78 8 L56 30 L58 38 L58 72 L51 81 L42 72 L42 38 L46 30 Z";

type MarkProps = {
  className?: string;
  glow?: boolean;
  id?: string;
  /** Render the whole mark in `currentColor` instead of the brand gradient. */
  mono?: boolean;
  /**
   * Draw the arrow in the artwork's navy instead of white.
   *
   * The comment above explains why white is the default: on the near-black
   * site the source navy disappears. On a light surface — the login and
   * invitation screens — the opposite is true, and a white arrow leaves a
   * blade-shaped hole in the middle of the mark. Keeps the brand gradient,
   * unlike `mono`, which flattens the whole thing to one colour.
   */
  onLight?: boolean;
};

export function LogoMark({ className, glow = false, id = "malhot", mono = false, onLight = false }: MarkProps) {
  const gradId = `${id}-grad`;

  return (
    <svg viewBox="0 0 102 82" className={cn("h-8 w-[38px]", className)} role="img" aria-label="MALHOT logo" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="79" x2="102" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1652e6" />
          <stop offset="55%" stopColor="#2b6cff" />
          <stop offset="100%" stopColor="#78a7ff" />
        </linearGradient>
      </defs>

      {glow ? (
        <g opacity="0.6" style={{ filter: "blur(12px)" }}>
          <path d={BLADE_LEFT} fill="#2b6cff" />
          <path d={BLADE_RIGHT} fill="#2b6cff" />
        </g>
      ) : null}

      <path d={BLADE_LEFT} fill={mono ? "currentColor" : `url(#${gradId})`} />
      <path d={BLADE_RIGHT} fill={mono ? "currentColor" : `url(#${gradId})`} />
      <path d={ARROW} fill={mono ? "currentColor" : onLight ? "#081f5c" : "#ffffff"} opacity={mono ? 0.5 : 0.92} />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  withTagline?: boolean;
  glow?: boolean;
  id?: string;
  mono?: boolean;
  onLight?: boolean;
};

export function Logo({ className, markClassName, withTagline = false, glow, id, mono, onLight }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark
        className={cn("h-[26px] w-[32px] shrink-0", markClassName)}
        glow={glow}
        id={id}
        mono={mono}
        onLight={onLight}
      />
      <span className="flex flex-col leading-none">
        {/*
          The wordmark sits optically level with the mark: the trailing letter
          space of a 0.26em track would otherwise push it left of centre, so it
          is pulled back by the same amount.
        */}
        <span className="-mr-[0.26em] font-display text-[0.95rem] font-semibold tracking-[0.26em]">MALHOT</span>
        {withTagline ? (
          <span className="mt-1.5 -mr-[0.34em] text-[0.56rem] font-medium tracking-[0.34em] text-brand-200/70 uppercase">
            Build · Innovate · Grow
          </span>
        ) : null}
      </span>
    </span>
  );
}
