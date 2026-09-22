import type { Metadata } from "next";

import { ORG_ROLE_META, RoleBadge } from "@/components/os/role-badge";
import { ProfileForm } from "@/features/auth/components/profile-form.client";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer();
  return (
    <section aria-labelledby="profile-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="profile-heading" className="text-lg font-semibold tracking-tight">
          Profile
        </h2>
        <p className="text-sm text-fg-muted">How you appear to the rest of the team.</p>
      </div>
      <ProfileForm
        fullName={viewer.profile.fullName}
        title={viewer.profile.title}
        timezone={viewer.profile.timezone}
        email={viewer.email}
      />

      <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Your access</h3>
          <RoleBadge role={viewer.orgRole} />
        </div>
        <p className="text-sm text-fg-muted">
          {ORG_ROLE_META[viewer.orgRole].summary} in {viewer.organization.name}.
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-fg-muted">
          {ORG_ROLE_META[viewer.orgRole].detail.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="text-fg-subtle">
                ·
              </span>
              {line}
            </li>
          ))}
        </ul>
        <p className="text-sm text-fg-subtle">
          {viewer.orgRole === "member"
            ? "Only an organisation admin can change this."
            : "Roles are managed under Settings → Members."}
        </p>
      </div>
    </section>
  );
}
