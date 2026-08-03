'use server';

import { createClient } from "@/lib/supabase/server";
import {
  createUniqueListingSlug,
  createConfidentialSlug,
  isSlugConflictError,
  MAX_SLUG_GENERATION_ATTEMPTS,
  canPublishListing,
  getPublishingRequirements,
  type ListingForCompleteness,
} from "@/lib/listings";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUserBillingState, checkListingLimit } from "@/lib/billing";
import { getLocale } from "next-intl/server";

// ─── Create initial draft and redirect to editor ───────────────────────────

export async function saveListingDraft(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

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

    const { data: listing, error: insertError } = await supabase.from("business_listings").insert({
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
      last_step_completed: 0,
    }).select("id").single();

    if (!insertError && listing) {
      redirect(`/${locale}/sell/${listing.id}/edit`);
    }

    if (!isSlugConflictError(insertError)) {
      throw new Error(insertError!.message);
    }
  }

  throw new Error("Could not save listing draft due to slug conflicts. Please try again.");
}

// ─── Create new draft from /sell/new ──────────────────────────────────────

export async function createListingDraft(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  const businessName = formData.get("businessName") as string;
  const isConfidential = formData.get("isConfidential") === "true";
  const teaserTitle = (formData.get("teaserTitle") as string) ?? "";

  if (!businessName?.trim()) {
    throw new Error("Business name is required.");
  }
  if (isConfidential && !teaserTitle.trim()) {
    throw new Error("A public teaser title is required for confidential listings.");
  }

  // Listing limit enforcement
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
    // Confidential listings use teaser title for slug — never the private name
    const slug = isConfidential
      ? createConfidentialSlug(teaserTitle)
      : createUniqueListingSlug(businessName);

    const { data: listing, error: insertError } = await supabase
      .from("business_listings")
      .insert({
        user_id: user.id,
        business_name: businessName,
        is_confidential: isConfidential,
        teaser_title: isConfidential ? teaserTitle : null,
        slug,
        is_public: false,
        status: "draft",
        last_step_completed: 1,
      })
      .select("id")
      .single();

    if (!insertError && listing) {
      redirect(`/${locale}/sell/${listing.id}/edit?step=2`);
    }

    if (!isSlugConflictError(insertError)) {
      throw new Error(insertError!.message);
    }
  }

  throw new Error("Could not create listing due to slug conflicts. Please try again.");
}

// ─── Update a specific editor step ────────────────────────────────────────

export async function updateListingStep(listingId: string, step: number, data: Record<string, unknown>) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Ownership check
  const { data: existing, error: fetchError } = await supabase
    .from("business_listings")
    .select("id, user_id, last_step_completed")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error("Listing not found or you do not have permission to edit it.");
  }

  const updatePayload = {
    ...data,
    last_step_completed: Math.max(existing.last_step_completed ?? 0, step),
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("business_listings")
    .update(updatePayload)
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/${locale}/sell/${listingId}/edit`);
  return { success: true };
}

// ─── Publish listing ───────────────────────────────────────────────────────

export async function publishListingFromEditor(listingId: string) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  const { data: listing, error: fetchError } = await supabase
    .from("business_listings")
    .select(
      "id, user_id, business_name, category, location, summary, summary_en, summary_es, headline_en, headline_es, highlights_en, highlights_es, growth_opportunities_en, growth_opportunities_es, reason_for_selling_en, reason_for_selling_es, asking_price, annual_revenue, cash_flow, year_established, is_confidential, teaser_title, owner_involvement_hours, number_of_employees"
    )
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !listing) {
    throw new Error("Listing not found or you do not have permission.");
  }

  // Get photo count for completeness
  const { count: imageCount } = await supabase
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("user_id", user.id);

  const listingForCheck: ListingForCompleteness = {
    ...listing,
    imageCount: imageCount ?? 0,
  };

  const missing = getPublishingRequirements(listingForCheck);
  if (!canPublishListing(listingForCheck)) {
    throw new Error(`Cannot publish: ${missing.join(", ")}`);
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
    throw new Error(updateError.message);
  }

  revalidatePath(`/${locale}/sell/${listingId}/edit`);
  revalidatePath(`/${locale}/sell/${listingId}/preview`);
  revalidatePath("/dashboard");
  revalidatePath("/buy");
  revalidatePath("/");

  return { success: true };
}

// ─── Unpublish listing ─────────────────────────────────────────────────────

export async function unpublishListingFromEditor(listingId: string) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  const { error } = await supabase
    .from("business_listings")
    .update({ status: "draft", is_public: false })
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${locale}/sell/${listingId}/edit`);
  revalidatePath("/dashboard");
  revalidatePath("/buy");
  revalidatePath("/");

  return { success: true };
}
