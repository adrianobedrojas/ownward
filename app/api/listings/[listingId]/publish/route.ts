import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  canPublishListing,
  getPublishingRequirements,
  type ListingForCompleteness,
} from "@/lib/listings";
import { revalidatePath } from "next/cache";

// ─── POST: publish a listing ───────────────────────────────────────────────
export async function POST(
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

    const { data: listing } = await supabase
      .from("business_listings")
      .select(
        "id, user_id, business_name, category, location, summary, summary_en, summary_es, headline_en, headline_es, highlights_en, highlights_es, growth_opportunities_en, growth_opportunities_es, reason_for_selling_en, reason_for_selling_es, asking_price, annual_revenue, cash_flow, year_established, is_confidential, teaser_title, owner_involvement_hours, number_of_employees"
      )
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found or unauthorized." }, { status: 404 });
    }

    const { count: imageCount } = await supabase
      .from("listing_media")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("user_id", user.id);

    const { data: coverPhoto } = await supabase
      .from("listing_media")
      .select("id")
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .eq("is_cover", true)
      .maybeSingle();

    const listingForCheck: ListingForCompleteness = {
      ...listing,
      imageCount: imageCount ?? 0,
      hasCoverPhoto: !!coverPhoto,
    };

    const missing = getPublishingRequirements(listingForCheck);
    if (!canPublishListing(listingForCheck)) {
      return NextResponse.json(
        { error: `Cannot publish. Missing: ${missing.join(", ")}`, missing },
        { status: 422 }
      );
    }

    const { error: updateError } = await supabase
      .from("business_listings")
      .update({
        status: "published",
        is_public: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    revalidatePath("/buy");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Listing publish error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE: unpublish a listing ───────────────────────────────────────────
export async function DELETE(
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

    const { error } = await supabase
      .from("business_listings")
      .update({ status: "draft", is_public: false })
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/buy");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Listing unpublish error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
