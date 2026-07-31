'use server';

import { createClient } from "@/lib/supabase/server";
import {
  createUniqueListingSlug,
  isSlugConflictError,
  MAX_SLUG_GENERATION_ATTEMPTS,
} from "@/lib/listings";
import { redirect } from "next/navigation";
import { getUserBillingState, checkListingLimit } from "@/lib/billing";

export async function saveListingDraft(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to save a draft.");
  }

  const businessName = formData.get("businessName") as string;
  const category = formData.get("category") as string;
  const location = formData.get("location") as string;
  const yearEstablished = formData.get("yearEstablished") ? parseInt(formData.get("yearEstablished") as string) : null;
  const annualRevenue = formData.get("annualRevenue") ? parseFloat(formData.get("annualRevenue") as string) : null;
  const askingPrice = formData.get("askingPrice") ? parseFloat(formData.get("askingPrice") as string) : null;
  const summary = formData.get("summary") as string;

  if (!businessName || !category) {
    throw new Error("Business name and category are required.");
  }

  // Server-side listing limit enforcement
  const billing = await getUserBillingState(supabase, user.id);
  const { count: currentListingCount } = await supabase
    .from("business_listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "deleted");

  const limitError = checkListingLimit(billing.entitlements, currentListingCount ?? 0);
  if (limitError) {
    throw new Error(limitError.message);
  }

  for (let attempt = 0; attempt < MAX_SLUG_GENERATION_ATTEMPTS; attempt += 1) {
    const slug = createUniqueListingSlug(businessName);

    const { error: insertError } = await supabase.from("business_listings").insert({
      user_id: user.id,
      business_name: businessName,
      category,
      location,
      year_established: yearEstablished,
      annual_revenue: annualRevenue,
      asking_price: askingPrice,
      summary,
      slug,
      is_public: false,
      status: "draft",
    });

    if (!insertError) {
      redirect("/dashboard?success=draft-saved");
    }

    if (!isSlugConflictError(insertError)) {
      throw new Error(insertError.message);
    }
  }

  throw new Error("Could not save listing draft due to slug conflicts. Please try again.");
}
