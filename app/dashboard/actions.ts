'use server';

import { createClient } from "@/lib/supabase/server";
import { createUniqueListingSlug, isSlugConflictError } from "@/lib/listings";
import { revalidatePath } from "next/cache";

function getMissingPublishFields(listing: {
  business_name: string | null;
  category: string | null;
  location: string | null;
  summary: string | null;
  asking_price: number | null;
}) {
  const missing: string[] = [];

  if (!listing.business_name?.trim()) {
    missing.push("business name");
  }

  if (!listing.category?.trim()) {
    missing.push("category");
  }

  if (!listing.location?.trim()) {
    missing.push("location");
  }

  if (!listing.summary?.trim()) {
    missing.push("summary");
  }

  if (!listing.asking_price || listing.asking_price <= 0) {
    missing.push("asking price");
  }

  return missing;
}

export async function deleteListingDraft(formData: FormData) {
  const supabase = await createClient();
  const listingId = formData.get("listingId") as string;

  if (!listingId) {
    throw new Error("Listing ID is required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("business_listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function publishListing(formData: FormData) {
  const supabase = await createClient();
  const listingId = formData.get("listingId") as string;

  if (!listingId) {
    throw new Error("Listing ID is required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: listing, error: listingError } = await supabase
    .from("business_listings")
    .select("id, slug, business_name, category, location, summary, asking_price")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (listingError) {
    throw new Error(listingError.message);
  }

  if (!listing) {
    throw new Error("Listing not found.");
  }

  const missingFields = getMissingPublishFields(listing);
  if (missingFields.length > 0) {
    throw new Error(
      `Listing cannot be published until all required fields are complete: ${missingFields.join(", ")}.`,
    );
  }

  const businessName = listing.business_name?.trim();
  if (!businessName) {
    throw new Error("Listing cannot be published until business name is set.");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = listing.slug ?? await createUniqueListingSlug(supabase, businessName);
    const { error } = await supabase
      .from("business_listings")
      .update({
        slug,
        is_public: true,
        status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (!error) {
      revalidatePath("/dashboard");
      revalidatePath("/buy");
      revalidatePath(`/b/${slug}`);
      return;
    }

    if (!isSlugConflictError(error) || listing.slug) {
      throw new Error(error.message);
    }
  }

  throw new Error("Could not publish listing due to slug conflicts. Please try again.");
}

export async function unpublishListing(formData: FormData) {
  const supabase = await createClient();
  const listingId = formData.get("listingId") as string;

  if (!listingId) {
    throw new Error("Listing ID is required.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: listing, error: lookupError } = await supabase
    .from("business_listings")
    .select("slug")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (!listing) {
    throw new Error("Listing not found.");
  }

  const { error } = await supabase
    .from("business_listings")
    .update({
      is_public: false,
      status: "draft",
      published_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/buy");
  if (listing.slug) {
    revalidatePath(`/b/${listing.slug}`);
  }
}
