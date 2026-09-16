import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button.client";
import { AcceptInvitationCard } from "@/features/organization/components/accept-invitation-card.client";
import { hashInvitationToken, isWellFormedInvitationToken } from "@/features/organization/lib/invitation-token";
import { getAuthState } from "@/lib/auth/context";
import { findInvitationByHash } from "@/lib/supabase/elevated/invitations";

export const metadata: Metadata = { title: "Join Malhot" };

const ROLE_LABEL = { owner: "an owner", admin: "an admin", member: "a member" } as const;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  if (!isWellFormedInvitationToken(token)) return <Problem title="This invitation link is not valid." />;

  const state = await getAuthState();
  if (state.kind === "anonymous") redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const lookup = await findInvitationByHash(await hashInvitationToken(token));

  switch (lookup.kind) {
    case "not_found":
    case "revoked":
      return (
        <Problem
          title="This invitation is no longer valid."
          detail="It may have been revoked. Ask an admin to send a new one."
        />
      );
    case "expired":
      return (
        <Problem
          title="This invitation has expired."
          detail="Invitations last seven days. Ask an admin to send a new one."
        />
      );
    case "accepted":
      return (
        <Problem title="This invitation was already used.">
          <Button asChild>
            <Link href="/os">Go to Malhot OS</Link>
          </Button>
        </Problem>
      );
    case "pending":
      break;
  }

  const { invitation } = lookup;
  const email = state.kind === "member" ? state.viewer.email : state.email;

  if (!email || email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Problem
        title="This invitation was sent to a different email."
        detail={`It was addressed to ${invitation.email}, but you are signed in as ${email ?? "an account without an email"}. Sign out and sign in with the invited address.`}
      >
        <SignOutButton variant="outline" />
      </Problem>
    );
  }

  // Same person, already in: nothing to accept.
  if (state.kind === "member" && state.viewer.organizationId === invitation.organization.id) redirect("/os");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Join {invitation.organization.name}</h1>
      <AcceptInvitationCard
        token={token}
        organizationName={invitation.organization.name}
        role={ROLE_LABEL[invitation.orgRole]}
      />
    </div>
  );
}

function Problem({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {detail ? <p className="text-sm text-fg-muted">{detail}</p> : null}
      {children ?? (
        <Button asChild variant="outline">
          <Link href="/login">Back to sign in</Link>
        </Button>
      )}
    </div>
  );
}
