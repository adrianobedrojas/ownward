import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState, checkListingImageLimit } from "@/lib/billing";
import { validateListingImage } from "@/lib/listings";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── POST: upload a listing image ─────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership check
    const { data: listing } = await supabase
      .from("business_listings")
      .select("id, user_id, status")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found or you do not have permission." },
        { status: 404 }
      );
    }

    // Enforce image count limit
    const billing = await getUserBillingState(supabase, user.id);
    const { count: currentImageCount } = await supabase
      .from("listing_media")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("user_id", user.id);

    const imageLimit = checkListingImageLimit(
      billing.entitlements,
      currentImageCount ?? 0
    );
    if (imageLimit) {
      return NextResponse.json({ error: imageLimit.message, code: "IMAGE_LIMIT" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sortOrderStr = (formData.get("sortOrder") as string) ?? "0";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // MIME type check
    const declaredMime = file.type.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed.", code: "TYPE_NOT_ALLOWED" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB limit.", code: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    // Storage quota enforcement (listing images count against storageBytes)
    const { data: storageDocs } = await supabase
      .from("documents")
      .select("filesize")
      .eq("user_id", user.id)
      .is("deleted_at", null);
    const { data: existingMedia } = await supabase
      .from("listing_media")
      .select("file_size")
      .eq("user_id", user.id);

    const usedBytes =
      (storageDocs ?? []).reduce((s, d) => s + Number(d.filesize ?? 0), 0) +
      (existingMedia ?? []).reduce((s, m) => s + Number(m.file_size ?? 0), 0);

    if (billing.entitlements.storageBytes > 0 && usedBytes + file.size > billing.entitlements.storageBytes) {
      return NextResponse.json(
        { error: "Storage quota exceeded.", code: "STORAGE_LIMIT" },
        { status: 403 }
      );
    }

    // Read buffer for magic-byte validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const validation = validateListingImage(buffer, declaredMime, file.size);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason, code: "INVALID_FILE" },
        { status: 400 }
      );
    }

    // Storage path: userId/listingId/randomId.ext
    const ext = declaredMime === "image/webp" ? "webp" : declaredMime === "image/png" ? "png" : "jpg";
    const randomId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const storagePath = `${user.id}/${listingId}/${randomId}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(storagePath, buffer, {
        contentType: declaredMime,
        upsert: false,
      });

    if (uploadError) {
      console.error("Listing image upload error:", uploadError);
      return NextResponse.json(
        { error: "Upload failed. Please try again.", code: "UPLOAD_FAILED" },
        { status: 500 }
      );
    }

    // Insert metadata record
    const sortOrder = parseInt(sortOrderStr, 10) || 0;
    const { data: mediaRecord, error: insertError } = await supabase
      .from("listing_media")
      .insert({
        listing_id: listingId,
        user_id: user.id,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: declaredMime,
        sort_order: sortOrder,
        is_cover: (currentImageCount ?? 0) === 0, // first image becomes cover
      })
      .select("id, storage_path, sort_order, is_cover, file_size, mime_type")
      .single();

    if (insertError || !mediaRecord) {
      // Clean up orphaned file
      await supabase.storage.from("listing-images").remove([storagePath]);
      return NextResponse.json(
        { error: "Could not save image record.", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Return a short-lived signed URL (never a public permanent URL)
    const { data: signedData } = await supabase.storage
      .from("listing-images")
      .createSignedUrl(storagePath, 3600); // 1 hour

    return NextResponse.json({
      success: true,
      media: {
        id: mediaRecord.id,
        storagePath: mediaRecord.storage_path,
        sortOrder: mediaRecord.sort_order,
        isCover: mediaRecord.is_cover,
        fileSize: mediaRecord.file_size,
        mimeType: mediaRecord.mime_type,
        signedUrl: signedData?.signedUrl ?? null,
      },
    });
  } catch (err) {
    console.error("Listing media upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE: remove a listing image ────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const mediaId = body.mediaId as string | undefined;
    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required." }, { status: 400 });
    }

    // Fetch media record with ownership via listing
    const { data: media } = await supabase
      .from("listing_media")
      .select("id, storage_path, user_id, listing_id")
      .eq("id", mediaId)
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!media) {
      return NextResponse.json(
        { error: "Media not found or you do not have permission." },
        { status: 404 }
      );
    }

    // Delete from storage
    await supabase.storage.from("listing-images").remove([media.storage_path]);

    // Delete DB record
    await supabase
      .from("listing_media")
      .delete()
      .eq("id", mediaId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Listing media delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH: update sort order or cover ────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Handle sort order update: body.order = [{id, sortOrder}, …]
    if (Array.isArray(body.order)) {
      for (const item of body.order as Array<{ id: string; sortOrder: number }>) {
        await supabase
          .from("listing_media")
          .update({ sort_order: item.sortOrder })
          .eq("id", item.id)
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
      }
      return NextResponse.json({ success: true });
    }

    // Handle cover selection: body.coverId = mediaId
    if (body.coverId) {
      // Clear existing cover
      await supabase
        .from("listing_media")
        .update({ is_cover: false })
        .eq("listing_id", listingId)
        .eq("user_id", user.id);

      // Set new cover
      await supabase
        .from("listing_media")
        .update({ is_cover: true })
        .eq("id", body.coverId)
        .eq("listing_id", listingId)
        .eq("user_id", user.id);

      return NextResponse.json({ success: true });
    }

    // Handle caption/alt text update
    if (body.mediaId) {
      const { error } = await supabase
        .from("listing_media")
        .update({
          caption_en: body.captionEn ?? undefined,
          caption_es: body.captionEs ?? undefined,
          alt_text_en: body.altTextEn ?? undefined,
          alt_text_es: body.altTextEs ?? undefined,
        })
        .eq("id", body.mediaId)
        .eq("listing_id", listingId)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  } catch (err) {
    console.error("Listing media patch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET: list media for a listing (owner only, returns signed URLs) ─────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: media, error } = await supabase
      .from("listing_media")
      .select("id, storage_path, file_size, mime_type, width, height, caption_en, caption_es, alt_text_en, alt_text_es, sort_order, is_cover, created_at")
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for all media
    const withUrls = await Promise.all(
      (media ?? []).map(async (m) => {
        const { data: signed } = await supabase.storage
          .from("listing-images")
          .createSignedUrl(m.storage_path, 3600);
        return { ...m, signedUrl: signed?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ media: withUrls });
  } catch (err) {
    console.error("Listing media GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
