"use client";

import { ChevronsUpDown, LogOut, Palette, UserRound } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import type { SidebarUser } from "@/components/os/app-sidebar.client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export function UserMenu({ user, collapsed }: { user: SidebarUser; collapsed: boolean }) {
  const [pending, startTransition] = useTransition();
  const displayName = user.fullName || user.email || "Your account";

  function handleSignOut() {
    startTransition(async () => {
      const result = await signOut();
      if (!result.ok) toast.error(result.error.message);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors duration-[120ms] hover:bg-surface",
          collapsed && "justify-center px-0",
        )}
        aria-label={`Account menu for ${displayName}`}
      >
        <UserAvatar name={displayName} avatarUrl={user.avatarUrl} />
        {!collapsed ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {user.email ? <span className="truncate text-xs text-fg-muted">{user.email}</span> : null}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/os/settings/profile">
            <UserRound aria-hidden="true" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/os/settings/appearance">
            <Palette aria-hidden="true" /> Appearance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} disabled={pending}>
          <LogOut aria-hidden="true" /> {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
