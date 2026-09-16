import type { Metadata } from "next";

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
    </section>
  );
}
