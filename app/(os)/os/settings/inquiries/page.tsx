import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InquiryList } from "@/features/inquiries/components/inquiry-list";
import { listInquiries } from "@/features/inquiries/queries";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Enquiries" };

/** W8 step 3: admins review website enquiries. Members get a 404 rather than a hint that the page exists. */
export default async function InquiriesSettingsPage() {
  const viewer = await requireViewer();
  if (viewer.orgRole === "member") notFound();

  const { data, error } = await listInquiries(viewer.organizationId);
  if (error) throw new Error(`Could not load enquiries: ${error.message}`);

  const open = data.filter((i) => !i.handled_at).length;

  return (
    <section aria-labelledby="inquiries-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="inquiries-heading" className="text-lg font-semibold tracking-tight">
          Enquiries
        </h2>
        <p className="text-sm text-fg-muted">
          Messages from the website contact form. {open === 0 ? "Nothing waiting." : `${open} waiting for a reply.`}
        </p>
      </div>
      <InquiryList inquiries={data} />
    </section>
  );
}
