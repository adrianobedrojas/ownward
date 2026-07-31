import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_EXPIRY_SECONDS = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Load document record ──────────────────────────────────────────────────
  const { data: doc } = await supabase
    .from("deal_room_documents")
    .select("id, deal_room_id, storage_path, filename, deleted_at")
    .eq("id", docId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Verify active membership ──────────────────────────────────────────────
  const { data: member } = await supabase
    .from("deal_room_members")
    .select("id")
    .eq("deal_room_id", doc.deal_room_id as string)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Generate signed URL ───────────────────────────────────────────────────
  const { data: signedData, error: signError } = await supabase.storage
    .from("deal-room-files")
    .createSignedUrl(doc.storage_path as string, SIGNED_URL_EXPIRY_SECONDS, {
      download: doc.filename as string,
    });

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: "Could not generate download link" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signedData.signedUrl);
}
