import { cn } from "@/lib/utils";

/**
 * The Malhot mark as vector geometry, traced from public/logo.png so it can be
 * recoloured and placed on a dark surface (the PNG carries a white background).
 *
 * Three shapes on a 102x82 field: two blue blades that form the outer M, and a
 * navy arrow — a notched chevron over a stem with a pointed nib — between them.
 * The logo's blue gradient is dropped: it is invisible at the sizes the mark is
 * used at, and a per-instance <defs> id is a hydration hazard.
 */

const BLADE_LEFT = "M0 0 L40 31 L40 47 L18 31 L18 65 L0 79 Z";
const BLADE_RIGHT = "M102 0 L62 31 L62 47 L84 31 L84 65 L102 79 Z";
const ARROW = "M22 8 L51 20 L78 8 L56 30 L58 38 L58 72 L51 81 L42 72 L42 38 L46 30 Z";

/** Blades take the brand blue; the arrow takes `currentColor`, so one class flips it. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 102 82" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={BLADE_LEFT} fill="var(--site-blue)" />
      <path d={BLADE_RIGHT} fill="var(--site-blue)" />
      <path d={ARROW} fill="currentColor" />
    </svg>
  );
}

/** List marker taken from the blade angle. Sized by the caller. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("size-3 shrink-0", className)}>
      <path d="M2 1 L9 6 L2 11 L2 8.4 L5.4 6 L2 3.6 Z" fill="currentColor" />
    </svg>
  );
}
