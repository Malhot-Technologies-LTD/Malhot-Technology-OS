"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * OS-only: writes <html data-theme="light|dark">, which tokens.css and the `dark:`
 * variant react to. The website and auth pages pin their register with a
 * data-theme wrapper instead, so they never mount this.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
