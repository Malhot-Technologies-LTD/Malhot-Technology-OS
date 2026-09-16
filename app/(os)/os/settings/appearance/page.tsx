import type { Metadata } from "next";

import { ThemeToggle } from "@/components/os/theme-toggle.client";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearanceSettingsPage() {
  return (
    <section aria-labelledby="appearance-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="appearance-heading" className="text-lg font-semibold tracking-tight">
          Appearance
        </h2>
        <p className="text-sm text-fg-muted">Theme applies to Malhot OS on this device.</p>
      </div>
      <ThemeToggle />
    </section>
  );
}
