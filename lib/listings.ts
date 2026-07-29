import { createClient } from "@/lib/supabase/server";

export function createListingSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function createUniqueListingSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessName: string,
) {
  const baseSlug = createListingSlug(businessName) || "business";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
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

export function isSlugConflictError(error: {
  code?: string;
  message?: string;
} | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "23505"
    && (error.message?.includes("business_listings_slug") || error.message?.includes("slug"))
  );
}
