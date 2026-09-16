import { SettingsNav } from "@/components/os/settings-nav.client";
import { PageBody, PageHeader } from "@/components/os/page-header";

export default function SettingsLayout({ children }: LayoutProps<"/os/settings">) {
  return (
    <PageBody>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageBody>
  );
}
