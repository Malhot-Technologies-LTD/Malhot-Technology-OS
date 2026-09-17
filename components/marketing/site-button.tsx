import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Website buttons: square corners, solid fills, no lift or glow. The OS keeps
 * shadcn's Button; this never leaves app/(marketing) and app/(auth).
 */
const siteButtonVariants = cva(
  [
    "group/btn relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[3px] font-semibold whitespace-nowrap",
    "transition-colors duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary call to action. Works on both surfaces. */
        primary: "bg-brand text-white ring-offset-white hover:bg-site-blue-deep focus-visible:ring-brand",
        /* Secondary on the light surface. */
        outline:
          "border border-border-strong bg-white text-fg ring-offset-white hover:border-fg hover:bg-bg-subtle focus-visible:ring-brand",
        /* High-emphasis on the navy bands. */
        white: "bg-white text-site-ink ring-offset-site-ink hover:bg-white/90 focus-visible:ring-site-blue-bright",
        link: "h-auto px-0 text-brand underline-offset-4 ring-offset-white hover:underline focus-visible:ring-brand",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = ComponentProps<"button"> & VariantProps<typeof siteButtonVariants> & { asChild?: boolean };

export function SiteButton({ className, variant, size, asChild = false, ...props }: Props) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(siteButtonVariants({ variant, size }), className)} {...props} />;
}

/**
 * Text link with an arrow that steps right on hover. Used instead of a second
 * button so a section never shows two competing calls to action. Pass `asChild`
 * with a next/link child to keep client-side navigation.
 */
export function ArrowLink({
  className,
  children,
  tone = "light",
  asChild = false,
  ...props
}: ComponentProps<"a"> & { tone?: "light" | "ink"; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      className={cn(
        "group/arrow inline-flex items-center gap-2 text-[15px] font-semibold transition-colors duration-200",
        tone === "ink" ? "text-white hover:text-site-blue-bright" : "text-fg hover:text-brand",
        className,
      )}
      {...props}
    >
      {/* Slottable lets the arrow sit beside a next/link child under asChild. */}
      <Slot.Slottable>{children}</Slot.Slottable>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5 transition-transform duration-200 group-hover/arrow:translate-x-1"
      >
        <path
          d="M1 8h12M9 4l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </Comp>
  );
}
