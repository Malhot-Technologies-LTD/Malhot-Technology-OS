import { NextResponse, type NextRequest } from "next/server";

import { canSeeRecords } from "@/features/team/access";
import { getMemberDocument } from "@/features/team/queries";
import { MEMBER_FILES_BUCKET } from "@/features/team/schemas";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opens an uploaded personal document through a one-minute signed URL made on
 * the viewer's own session, so the member-files policies decide: admins and
 * the person get the file, anyone else a 404. `?download=1` downloads it.
 */
export async function GET(request: NextRequest, context: RouteContext<"/os/team/[userId]/documents/[docId]/download">) {
  const { userId, docId } = await context.params;
  if (!UUID.test(userId) || !UUID.test(docId)) return new NextResponse("Not found", { status: 404 });
  const viewer = await requireViewer();
  if (!canSeeRecords(viewer, userId)) return new NextResponse("Not found", { status: 404 });

  const document = await getMemberDocument(viewer.organizationId, userId, docId);
  if (!document.data) return new NextResponse("Not found", { status: 404 });
  if (document.data.source !== "upload" || !document.data.storage_path) {
    return NextResponse.redirect(new URL(`/os/team/${userId}/documents/${docId}`, request.url));
  }

  const supabase = await createClient();
  const download = request.nextUrl.searchParams.get("download") === "1";
  const signed = await supabase.storage
    .from(MEMBER_FILES_BUCKET)
    .createSignedUrl(
      document.data.storage_path,
      60,
      download ? { download: document.data.file_name ?? true } : undefined,
    );
  if (signed.error || !signed.data) {
    logger.warn("team.sign_failed", { message: signed.error?.message });
    return new NextResponse("This file could not be opened. It may have been removed.", { status: 404 });
  }
  return NextResponse.redirect(signed.data.signedUrl);
}
