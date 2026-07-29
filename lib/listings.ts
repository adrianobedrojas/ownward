export const MAX_SLUG_GENERATION_ATTEMPTS = 5;

export function createListingSlug(input: string) {
  const normalizedSlug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return normalizedSlug || "business";
}

export function createUniqueListingSlug(businessName: string) {
  const baseSlug = createListingSlug(businessName);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${baseSlug}-${suffix}`;
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
