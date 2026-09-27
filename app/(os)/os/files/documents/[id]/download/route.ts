import { NextResponse, type NextRequest } from "next/server";

import { getCompanyFile } from "@/features/files/queries";
import { COMPANY_FILES_BUCKET } from "@/features/files/tree";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opens an uploaded company file through a signed URL that lasts one minute,
 * created on the viewer's own session: the bucket's SELECT policy reads the
 * file's row, so a file in a folder the viewer cannot see is a 404.
 * `?download=1` asks for a download rather than opening it in the browser.
 */
export async function GET(request: NextRequest, context: RouteContext<"/os/files/documents/[id]/download">) {
  const { id } = await context.params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const viewer = await requireViewer();
  const file = await getCompanyFile(viewer.organizationId, id);
  if (!file.data) return new NextResponse("Not found", { status: 404 });
  if (file.data.source !== "upload" || !file.data.storage_path) {
    return NextResponse.redirect(new URL(`/os/files/documents/${id}`, request.url));
  }

  const supabase = await createClient();
  const download = request.nextUrl.searchParams.get("download") === "1";
  const signed = await supabase.storage
    .from(COMPANY_FILES_BUCKET)
    .createSignedUrl(file.data.storage_path, 60, download ? { download: file.data.file_name ?? true } : undefined);
  if (signed.error || !signed.data) {
    logger.warn("files.sign_failed", { message: signed.error?.message });
    return new NextResponse("This file could not be opened. It may have been removed.", { status: 404 });
  }
  return NextResponse.redirect(signed.data.signedUrl);
}
