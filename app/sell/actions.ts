'use server';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const { error: insertError } = await supabase.from("business_listings").insert({
    user_id: user.id,
    business_name: businessName,
    category,
    location,
    year_established: yearEstablished,
    annual_revenue: annualRevenue,
    asking_price: askingPrice,
    summary,
    status: 'draft',
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  redirect("/dashboard?success=draft-saved");
}
