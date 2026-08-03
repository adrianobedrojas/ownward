import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicListingPresentation from "@/components/listing-studio/PublicListingPresentation";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function PublicBusinessPage({ params }: Props) {
  const { locale, slug } = await params;

  const supabase = await createClient();

  // Query the safe public-detail view (never exposes user_id or raw confidential names)
  const { data: listing, error } = await supabase
    .from("business_listing_public_detail")
    .select(
      "id, slug, business_name, is_confidential, teaser_title, category, location, headline_en, headline_es, summary, summary_en, summary_es, highlights_en, highlights_es, growth_opportunities_en, growth_opportunities_es, reason_for_selling_en, reason_for_selling_es, asking_price, annual_revenue, cash_flow, year_established, currency, seller_financing, inventory_included, real_estate_included, owner_involvement_hours, number_of_employees, featured_until, published_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  // Check auth for interest panel
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if already saved
  let initialSaved = false;
  if (user) {
    const { data: saved } = await supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle();
    initialSaved = !!saved;
  }

  // isOwner: cannot be determined from the public view (user_id is not exposed).
  // Ownership editing is handled in the seller dashboard; mark false for public pages.
  const isOwner = false;

  // Fetch media records — only those belonging to this listing (prevents cross-listing path injection)
  const { data: rawMedia } = await supabase
    .from("listing_media")
    .select("id, storage_path, alt_text_en, alt_text_es, caption_en, caption_es, sort_order, is_cover")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true });

  // Generate short-lived signed URLs using the server-only admin client.
  // The listing is already verified as published/public by the view query above.
  // Each media row is fetched from the DB so storage paths cannot be browser-supplied.
  const adminClient = createAdminClient();
  const media = await Promise.all(
    (rawMedia ?? []).map(async (m) => {
      try {
        const { data: signed } = await adminClient.storage
          .from("listing-images")
          .createSignedUrl(m.storage_path, 3600);
        return {
          id: m.id,
          signedUrl: signed?.signedUrl ?? null,
          altTextEn: m.alt_text_en ?? undefined,
          altTextEs: m.alt_text_es ?? undefined,
          captionEn: m.caption_en ?? undefined,
          captionEs: m.caption_es ?? undefined,
          isCover: m.is_cover,
          sortOrder: m.sort_order,
        };
      } catch {
        // Gracefully handle inaccessible images – render without a URL
        return {
          id: m.id,
          signedUrl: null,
          altTextEn: m.alt_text_en ?? undefined,
          altTextEs: m.alt_text_es ?? undefined,
          captionEn: m.caption_en ?? undefined,
          captionEs: m.caption_es ?? undefined,
          isCover: m.is_cover,
          sortOrder: m.sort_order,
        };
      }
    })
  );

  // Public title: teaser for confidential listings (business_name is already masked in the view)
  const publicTitle = listing.is_confidential
    ? (listing.teaser_title ?? listing.business_name ?? "")
    : listing.business_name;

  // Locale-aware content fallback
  const headline =
    locale === "es"
      ? (listing.headline_es ?? listing.headline_en ?? null)
      : (listing.headline_en ?? listing.headline_es ?? null);

  const summary =
    locale === "es"
      ? (listing.summary_es ?? listing.summary_en ?? listing.summary ?? null)
      : (listing.summary_en ?? listing.summary_es ?? listing.summary ?? null);

  const highlights =
    locale === "es"
      ? (listing.highlights_es ?? listing.highlights_en ?? null)
      : (listing.highlights_en ?? listing.highlights_es ?? null);

  const growthOpportunities =
    locale === "es"
      ? (listing.growth_opportunities_es ?? listing.growth_opportunities_en ?? null)
      : (listing.growth_opportunities_en ?? listing.growth_opportunities_es ?? null);

  const reasonForSelling =
    locale === "es"
      ? (listing.reason_for_selling_es ?? listing.reason_for_selling_en ?? null)
      : (listing.reason_for_selling_en ?? listing.reason_for_selling_es ?? null);

  const listingData = {
    id: listing.id,
    slug: listing.slug,
    publicTitle,
    category: listing.category,
    location: listing.location,
    summary,
    headline,
    highlights,
    growth_opportunities: growthOpportunities,
    reason_for_selling: reasonForSelling,
    asking_price: listing.asking_price,
    annual_revenue: listing.annual_revenue,
    cash_flow: listing.cash_flow,
    year_established: listing.year_established,
    currency: listing.currency ?? "USD",
    seller_financing: listing.seller_financing ?? false,
    inventory_included: listing.inventory_included ?? false,
    real_estate_included: listing.real_estate_included ?? false,
    owner_involvement_hours: listing.owner_involvement_hours,
    number_of_employees: listing.number_of_employees,
    featured_until: listing.featured_until,
    published_at: listing.published_at,
  };

  return (
    <PublicListingPresentation
      listing={listingData}
      media={media}
      locale={locale}
      isOwner={isOwner}
      isSignedIn={!!user}
      initialSaved={initialSaved}
    />
  );
}
