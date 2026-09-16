import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { NoAccess } from "@/components/os/no-access";
import { OsShell, SIDEBAR_COOKIE } from "@/components/os/os-shell.client";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAuthState } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: { default: "Malhot OS", template: "%s · Malhot OS" },
  robots: { index: false, follow: false },
};

/**
 * Layer 2 of route protection (docs/architecture/authentication-architecture.md#route-protection-three-layers):
 * resolves session + profile + membership once; pages reuse it through the cached helpers.
 */
export default async function OsLayout({ children }: LayoutProps<"/">) {
  const state = await getAuthState();
  if (state.kind === "anonymous") redirect("/login?next=%2Fos");
  if (state.kind === "no_access") {
    return (
      <ThemeProvider>
        <NoAccess email={state.email} />
        <Toaster position="bottom-right" />
      </ThemeProvider>
    );
  }

  const { viewer } = state;
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <ThemeProvider>
      <OsShell
        defaultCollapsed={defaultCollapsed}
        user={{
          fullName: viewer.profile.fullName,
          email: viewer.email,
          avatarUrl: viewer.profile.avatarUrl,
          organizationName: viewer.organization.name,
        }}
      >
        {children}
      </OsShell>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
