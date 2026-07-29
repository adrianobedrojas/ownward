import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("id,storage_path,user_id")
    .eq("id", id)
    .single();

  if (documentError || !document || document.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("vault")
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Unable to generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signedUrlData.signedUrl);
}
