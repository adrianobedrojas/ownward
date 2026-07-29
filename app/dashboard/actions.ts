'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  const { error } = await supabase
    .from("business_listings")
    .update({
      is_public: true,
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/buy");
}
