import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Pill buttons for the website. The OS keeps shadcn's Button; this never leaves app/(marketing) and app/(auth). */
const siteButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform] duration-[120ms] ease-standard outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-site-blue-deep",
        secondary: "border-2 border-site-navy bg-transparent text-site-navy hover:bg-site-navy hover:text-white",
        white: "bg-white text-fg shadow-m hover:bg-bg-subtle",
        ghost: "text-fg hover:bg-bg-subtle",
        navy: "bg-site-navy text-white hover:brightness-125",
      },
      size: {
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        sm: "h-9 px-4 text-sm",
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
