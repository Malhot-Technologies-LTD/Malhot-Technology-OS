import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD } from "@/features/documents/files";
import { getMember, getMemberRecord, listMemberDocuments } from "@/features/team/queries";
import { PERSON_TEMPLATES } from "@/features/team/schemas";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Generate a document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The generator, filing the document on one person (offer, contract, certificate…). Admins only. */
export default async function MemberDocumentGeneratorPage({
  params,
  searchParams,
}: PageProps<"/os/team/[userId]/documents/new">) {
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(userId)) notFound();
  const viewer = await requireViewer();
  if (!can(viewer, "member.records")) notFound();

  const [member, record, probe] = await Promise.all([
    getMember(viewer.organizationId, userId),
    getMemberRecord(viewer.organizationId, userId),
    listMemberDocuments(viewer.organizationId, userId),
  ]);
  if (!member.data) notFound();
  const fullName = member.data.profile?.full_name || "Unnamed";

  return (
    <PageBody>
      <Link
        href={`/os/team/${userId}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> {fullName}
      </Link>
      <PageHeader
        title={`A document for ${fullName}`}
        description="Their name and position are filled in. Saved documents are visible only to admins and to them."
      />
      <DocumentGenerator
        projects={[]}
        templateKey={typeof query.template === "string" ? query.template : null}
        today={dayKey(requestTime(), viewer.profile.timezone || "UTC")}
        defaultLetterhead={DEFAULT_LETTERHEAD}
        canSave={!probe.missing}
        person={{
          userId,
          fullName,
          title: record.data?.position ?? member.data.profile?.title ?? null,
          templates: PERSON_TEMPLATES,
        }}
      />
    </PageBody>
  );
}
