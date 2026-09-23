"use client";

import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/os/data-display";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { approveAccessRequest, rejectAccess } from "@/features/organization/actions";
import {
  AssignFirstProject,
  type ApprovedPerson,
  type AssignableProject,
} from "@/features/organization/components/assign-first-project.client";
import type { AccessRequest } from "@/lib/supabase/elevated/access-requests";

/**
 * People who signed up and are waiting to be let in.
 *
 * Approving is the moment someone gains access to company data, so the role is
 * chosen deliberately at that point rather than defaulted silently. Approval
 * alone only grants an account, so it hands straight over to putting them on a
 * project — otherwise they sign in to an empty workspace and reasonably
 * conclude they were never let in.
 */
export function AccessRequests({
  requests,
  projects,
}: {
  requests: readonly AccessRequest[];
  projects: readonly AssignableProject[];
}) {
  /*
   * The dialog is owned here, not by the row that triggered it. Approving
   * revalidates this page, so the row is already gone from `requests` by the
   * time the prompt should appear; state living inside it would unmount
   * mid-flow and the prompt would never be seen.
   */
  const [approved, setApproved] = useState<ApprovedPerson | null>(null);

  return (
    <>
      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          Nobody is waiting for access. New sign-ups appear here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {requests.map((request) => (
            <RequestRow key={request.userId} request={request} onApproved={setApproved} />
          ))}
        </ul>
      )}

      <AssignFirstProject person={approved} projects={projects} onClose={() => setApproved(null)} />
    </>
  );
}

function RequestRow({ request, onApproved }: { request: AccessRequest; onApproved: (person: ApprovedPerson) => void }) {
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const result = await approveAccessRequest({ userId: request.userId, role });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const name = request.fullName || request.email;
      toast.success(`${name} can now sign in`);
      // Straight on to the thing that actually gives them something to see.
      onApproved({ userId: request.userId, name });
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
