import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS } from "@/lib/documents";

const POSTGREST_NO_ROWS_ERROR_CODE = "PGRST116";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,storage_path,user_id,deleted_at,retention_status")
    .eq("id", id)
    .single();

  if (documentError) {
    if (documentError.code === POSTGREST_NO_ROWS_ERROR_CODE) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to retrieve document" }, { status: 500 });
  }

  if (document.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (document.deleted_at || (document.retention_status && document.retention_status !== "active")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("vault")
    .createSignedUrl(document.storage_path, DOCUMENT_DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Unable to generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signedUrlData.signedUrl);
}
