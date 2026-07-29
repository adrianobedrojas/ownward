'use server';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function createListingSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function createUniqueListingSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessName: string,
) {
  const baseSlug = createListingSlug(businessName) || "business";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const slug = `${baseSlug}-${suffix}`;

    const { data, error } = await supabase
      .from("business_listings")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return slug;
    }
  }

  throw new Error("Could not generate a unique listing slug. Please try again.");
}

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
  const slug = await createUniqueListingSlug(supabase, businessName);

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
    status: 'draft',
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  redirect("/dashboard?success=draft-saved");
}
