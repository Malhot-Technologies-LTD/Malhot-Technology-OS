import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { siteUrl } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Malhot Technologies",
    template: "%s · Malhot Technologies",
  },
  description: "Malhot Technologies designs, builds and ships software systems, websites and digital products.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full`} suppressHydrationWarning>
      {/* Theme is owned per surface: the OS layout mounts next-themes (html[data-theme]); the website and auth
          layouts pin their own register on a wrapper. suppressHydrationWarning covers the OS theme script. */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
