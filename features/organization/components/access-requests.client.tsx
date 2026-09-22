"use client";

import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/os/data-display";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { approveAccessRequest, rejectAccess } from "@/features/organization/actions";
import type { AccessRequest } from "@/lib/supabase/elevated/access-requests";

/**
 * People who signed up and are waiting to be let in.
 *
 * Approving is the moment someone gains access to company data, so the role is
 * chosen deliberately at that point rather than defaulted silently.
 */
export function AccessRequests({ requests }: { requests: readonly AccessRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
        Nobody is waiting for access. New sign-ups appear here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {requests.map((request) => (
        <RequestRow key={request.userId} request={request} />
      ))}
    </ul>
  );
}

function RequestRow({ request }: { request: AccessRequest }) {
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const result = await approveAccessRequest({ userId: request.userId, role });
      if (result.ok) toast.success(`${request.fullName || request.email} can now sign in`);
      else toast.error(result.error.message);
    });
  }

  function decline() {
    startTransition(async () => {
      const result = await rejectAccess(request.userId);
      if (result.ok) toast.success("Sign-up declined and the account deleted");
      else toast.error(result.error.message);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{request.fullName || "No name given"}</span>
        <span className="truncate text-sm text-fg-muted">{request.email}</span>
      </div>

      {!request.emailConfirmed ? (
        <StatusPill tone="warning">Email not confirmed</StatusPill>
      ) : (
        <StatusPill tone="neutral">Waiting since {formatDate(request.requestedAt)}</StatusPill>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor={`role-${request.userId}`} className="sr-only">
          Role for {request.email}
        </label>
        <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
          <SelectTrigger id={`role-${request.userId}`} size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={approve} disabled={pending}>
          <UserPlus aria-hidden="true" />
          Approve
        </Button>
        <Button size="sm" variant="ghost" onClick={decline} disabled={pending}>
          Decline
        </Button>
      </div>
    </li>
  );
}
