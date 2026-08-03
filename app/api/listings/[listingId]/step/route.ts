import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── PATCH: save a step's data ─────────────────────────────────────────────
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

    // Ownership check
    const { data: existing } = await supabase
      .from("business_listings")
      .select("id, user_id, last_step_completed")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Listing not found or you do not have permission." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { step, ...fields } = body as { step: number; [key: string]: unknown };

    // Whitelist allowed fields to prevent mass assignment
    const ALLOWED_FIELDS = new Set([
      "business_name", "category", "location", "year_established",
      "is_confidential", "teaser_title",
      "headline_en", "headline_es",
      "summary", "summary_en", "summary_es",
      "highlights_en", "highlights_es",
      "growth_opportunities_en", "growth_opportunities_es",
      "reason_for_selling_en", "reason_for_selling_es",
      "currency", "asking_price", "annual_revenue", "cash_flow",
      "financial_year", "seller_financing", "inventory_included", "real_estate_included",
      "owner_involvement_hours", "number_of_employees", "established_online",
    ]);

    const safeFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_FIELDS.has(key)) {
        safeFields[key] = value;
      }
    }

    safeFields.last_step_completed = Math.max(existing.last_step_completed ?? 0, step ?? 1);
    safeFields.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("business_listings")
      .update(safeFields)
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Listing step save error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
