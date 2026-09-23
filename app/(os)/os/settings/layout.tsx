import { PageBody, PageHeader } from "@/components/os/page-header";
import { SettingsNav } from "@/components/os/settings-nav.client";
import { requireViewer } from "@/lib/auth/context";

export default async function SettingsLayout({ children }: LayoutProps<"/os/settings">) {
  const viewer = await requireViewer();
  return (
    <PageBody width="reading">
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        <SettingsNav isAdmin={viewer.orgRole !== "member"} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageBody>
  );
}
