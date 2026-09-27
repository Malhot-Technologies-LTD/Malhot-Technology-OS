import { NextResponse, type NextRequest } from "next/server";

import { PROJECT_FILES_BUCKET } from "@/features/documents/files";
import { getProjectDocument } from "@/features/documents/queries";
import { getProjectByKey } from "@/features/projects/queries";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opens an uploaded document through a signed URL that lasts one minute.
 *
 * The URL is created on the viewer's own session, so the bucket's SELECT policy
 * decides — someone who is not on the project gets a 404, the same as for a
 * document that does not exist. `?download=1` asks for a download rather than
 * opening the file in the browser.
 */
export async function GET(request: NextRequest, context: RouteContext<"/os/projects/[key]/documents/[id]/download">) {
  const { key, id } = await context.params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const viewer = await requireViewer();
  const project = await getProjectByKey(viewer.organizationId, key);
  if (!project.data) return new NextResponse("Not found", { status: 404 });

  const document = await getProjectDocument(project.data.id, id);
  if (!document.data) return new NextResponse("Not found", { status: 404 });

  if (document.data.source !== "upload" || !document.data.storage_path) {
    return NextResponse.redirect(new URL(`/os/projects/${project.data.key}/documents/${id}`, request.url));
  }

  const supabase = await createClient();
  const download = request.nextUrl.searchParams.get("download") === "1";
  const signed = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .createSignedUrl(
      document.data.storage_path,
      60,
      download ? { download: document.data.file_name ?? true } : undefined,
    );
  if (signed.error || !signed.data) {
    logger.warn("documents.sign_failed", { message: signed.error?.message });
    return new NextResponse("This file could not be opened. It may have been removed.", { status: 404 });
  }

  return NextResponse.redirect(signed.data.signedUrl);
}
