import type { Metadata } from "next";

import { Panel } from "@/components/os/panel";
import { AccountForm } from "@/features/social/components/account-form.client";

export const metadata: Metadata = { title: "Add account" };

export default function NewSocialAccountPage() {
  return (
    <Panel title="Add an account" description="One of the company's profiles on a platform.">
      <AccountForm />
    </Panel>
  );
}
