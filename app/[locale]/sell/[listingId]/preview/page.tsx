import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/require-user";
import { Link } from "@/i18n/navigation";
import PublicListingPresentation from "@/components/listing-studio/PublicListingPresentation";

interface Props {
  params: Promise<{ locale: string; listingId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ListingStudio" });
  return {
    title: t("preview.title"),
    robots: { index: false, follow: false },
  };
}

export default async function ListingPreviewPage({ params }: Props) {
  const { locale, listingId } = await params;
  const { supabase, user } = await requireUser();
  const t = await getTranslations({ locale, namespace: "ListingStudio" });

  // Fetch listing — owner only
  const { data: listing, error } = await supabase
    .from("business_listings")
    .select(
      "id, user_id, status, is_public, slug, business_name, is_confidential, teaser_title, category, location, headline_en, headline_es, summary, summary_en, summary_es, highlights_en, highlights_es, growth_opportunities_en, growth_opportunities_es, reason_for_selling_en, reason_for_selling_es, asking_price, annual_revenue, cash_flow, year_established, currency, seller_financing, inventory_included, real_estate_included, owner_involvement_hours, number_of_employees, featured_until, published_at"
    )
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  if (listing.user_id !== user.id) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch media with signed URLs (owner can see their own images for preview)
  const { data: rawMedia } = await supabase
    .from("listing_media")
    .select("id, storage_path, alt_text_en, alt_text_es, caption_en, caption_es, sort_order, is_cover")
    .eq("listing_id", listingId)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  const media = await Promise.all(
    (rawMedia ?? []).map(async (m) => {
      const { data: signed } = await supabase.storage
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
    })
  );

  // Build public listing data — never expose private fields
  const publicTitle = listing.is_confidential
    ? (listing.teaser_title ?? "")
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
    <div className="min-h-screen bg-slate-950">
      {/* Owner toolbar */}
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-sm text-slate-400">{t("preview.ownerNote")}</p>
          <Link
            href={`/${locale}/sell/${listingId}/edit`}
            className="shrink-0 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            {t("preview.editCta")}
          </Link>
        </div>
      </div>

      <PublicListingPresentation
        listing={listingData}
        media={media}
        locale={locale}
        isOwner={true}
        isOwnerPreview={true}
        isSignedIn={true}
      />
    </div>
  );
}
