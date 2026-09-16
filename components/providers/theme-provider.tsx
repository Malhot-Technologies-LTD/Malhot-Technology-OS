"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Theme is written to <html data-theme="light|dark">; tokens.css reacts to it.
 * `forcedTheme` lets the marketing layout pin dark without exposing a toggle.
 */
export function ThemeProvider({ children, forcedTheme }: { children: ReactNode; forcedTheme?: "light" | "dark" }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
