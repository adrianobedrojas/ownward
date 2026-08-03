import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { calculateListingCompleteness } from "@/lib/listings";
import ListingStudioEditor from "@/components/listing-studio/ListingStudioEditor";

interface Props {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<{ step?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ListingStudio" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    robots: { index: false, follow: false },
  };
}

export default async function EditListingPage({ params, searchParams }: Props) {
  const { locale, listingId } = await params;
  const { step: stepParam } = await searchParams;
  const initialStep = Math.max(1, parseInt(stepParam ?? "1", 10) || 1);

  const { supabase, user } = await requireUser();

  // Fetch the listing — ownership enforced by RLS + explicit user_id check
  const { data: listing, error } = await supabase
    .from("business_listings")
    .select(
      "id, user_id, status, is_public, last_step_completed, business_name, category, location, year_established, is_confidential, teaser_title, headline_en, headline_es, summary, summary_en, summary_es, highlights_en, highlights_es, growth_opportunities_en, growth_opportunities_es, reason_for_selling_en, reason_for_selling_es, currency, asking_price, annual_revenue, cash_flow, financial_year, seller_financing, inventory_included, real_estate_included, owner_involvement_hours, number_of_employees, established_online"
    )
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  // Ownership gate
  if (listing.user_id !== user.id) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch media with signed URLs
  const { data: rawMedia } = await supabase
    .from("listing_media")
    .select("id, storage_path, file_size, mime_type, width, height, caption_en, caption_es, alt_text_en, alt_text_es, sort_order, is_cover")
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
        storagePath: m.storage_path,
        sortOrder: m.sort_order,
        isCover: m.is_cover,
        fileSize: m.file_size,
        mimeType: m.mime_type,
        signedUrl: signed?.signedUrl ?? null,
        captionEn: m.caption_en ?? undefined,
        captionEs: m.caption_es ?? undefined,
        altTextEn: m.alt_text_en ?? undefined,
        altTextEs: m.alt_text_es ?? undefined,
      };
    })
  );

  // Billing for image limit
  const billing = await getUserBillingState(supabase, user.id);
  const imageLimit = billing.entitlements.listingImageLimit;

  // Completeness
  const completeness = calculateListingCompleteness({
    ...listing,
    imageCount: media.length,
    hasCoverPhoto: media.some((m) => m.isCover),
    hasEnglishContent: !!(listing.summary_en || listing.headline_en || listing.summary),
    hasSpanishContent: !!(listing.summary_es || listing.headline_es),
  });

  // Flatten translations for the client component
  const t = await getTranslations({ locale, namespace: "ListingStudio" });

  const tFlat: Record<string, string | string[] | Record<string, string>> = {
    // Steps
    "steps.identity": t("steps.identity"),
    "steps.story": t("steps.story"),
    "steps.photos": t("steps.photos"),
    "steps.financial": t("steps.financial"),
    "steps.operations": t("steps.operations"),
    "steps.review": t("steps.review"),
    // Nav
    "nav.back": t("nav.back"),
    "nav.saveExit": t("nav.saveExit"),
    "nav.saveContinue": t("nav.saveContinue"),
    "nav.preview": t("nav.preview"),
    "nav.publish": t("nav.publish"),
    "nav.saving": t("nav.saving"),
    "nav.saved": t("nav.saved"),
    "nav.saveFailed": t("nav.saveFailed"),
    // Status
    "status.draft": t("status.draft"),
    "status.published": t("status.published"),
    // Identity
    "identity.title": t("identity.title"),
    "identity.description": t("identity.description"),
    "identity.businessNameLabel": t("identity.businessNameLabel"),
    "identity.businessNameHint": t("identity.businessNameHint"),
    "identity.businessNamePlaceholder": t("identity.businessNamePlaceholder"),
    "identity.isConfidentialLabel": t("identity.isConfidentialLabel"),
    "identity.isConfidentialHint": t("identity.isConfidentialHint"),
    "identity.teaserTitleLabel": t("identity.teaserTitleLabel"),
    "identity.teaserTitleHint": t("identity.teaserTitleHint"),
    "identity.teaserTitlePlaceholder": t("identity.teaserTitlePlaceholder"),
    "identity.categoryLabel": t("identity.categoryLabel"),
    "identity.categoryHint": t("identity.categoryHint"),
    "identity.selectCategory": t("identity.selectCategory"),
    "identity.locationLabel": t("identity.locationLabel"),
    "identity.locationHint": t("identity.locationHint"),
    "identity.locationPlaceholder": t("identity.locationPlaceholder"),
    "identity.yearEstablishedLabel": t("identity.yearEstablishedLabel"),
    "identity.yearEstablishedHint": t("identity.yearEstablishedHint"),
    "identity.visibilityPublic": t("identity.visibilityPublic"),
    "identity.visibilityPrivate": t("identity.visibilityPrivate"),
    "identity.visibilityDealRoom": t("identity.visibilityDealRoom"),
    // Story
    "story.title": t("story.title"),
    "story.description": t("story.description"),
    "story.headlineEnLabel": t("story.headlineEnLabel"),
    "story.headlineEnPlaceholder": t("story.headlineEnPlaceholder"),
    "story.headlineEsLabel": t("story.headlineEsLabel"),
    "story.headlineEsPlaceholder": t("story.headlineEsPlaceholder"),
    "story.summaryEnLabel": t("story.summaryEnLabel"),
    "story.summaryEnPlaceholder": t("story.summaryEnPlaceholder"),
    "story.summaryEsLabel": t("story.summaryEsLabel"),
    "story.summaryEsPlaceholder": t("story.summaryEsPlaceholder"),
    "story.highlightsEnLabel": t("story.highlightsEnLabel"),
    "story.highlightsEnPlaceholder": t("story.highlightsEnPlaceholder"),
    "story.highlightsEsLabel": t("story.highlightsEsLabel"),
    "story.highlightsEsPlaceholder": t("story.highlightsEsPlaceholder"),
    "story.growthEnLabel": t("story.growthEnLabel"),
    "story.growthEnPlaceholder": t("story.growthEnPlaceholder"),
    "story.growthEsLabel": t("story.growthEsLabel"),
    "story.growthEsPlaceholder": t("story.growthEsPlaceholder"),
    "story.reasonEnLabel": t("story.reasonEnLabel"),
    "story.reasonEnPlaceholder": t("story.reasonEnPlaceholder"),
    "story.reasonEsLabel": t("story.reasonEsLabel"),
    "story.reasonEsPlaceholder": t("story.reasonEsPlaceholder"),
    "story.bilingualNote": t("story.bilingualNote"),
    "story.coachTitle": t("story.coachTitle"),
    "story.coachPrompts": t.raw("story.coachPrompts") as string[],
    "story.checklist": t.raw("story.checklist") as string[],
    "story.charCount": t("story.charCount", { count: 0, max: 0 }),
    "story.disclaimer": t("story.disclaimer"),
    // Photos
    "photos.title": t("photos.title"),
    "photos.description": t("photos.description"),
    "photos.uploadCta": t("photos.uploadCta"),
    "photos.uploadDrop": t("photos.uploadDrop"),
    "photos.uploadHint": t("photos.uploadHint"),
    "photos.uploading": t("photos.uploading"),
    "photos.uploadError": t("photos.uploadError"),
    "photos.setCover": t("photos.setCover"),
    "photos.coverLabel": t("photos.coverLabel"),
    "photos.editCaption": t("photos.editCaption"),
    "photos.captionEnLabel": t("photos.captionEnLabel"),
    "photos.captionEsLabel": t("photos.captionEsLabel"),
    "photos.altTextEnLabel": t("photos.altTextEnLabel"),
    "photos.altTextEsLabel": t("photos.altTextEsLabel"),
    "photos.deletePhoto": t("photos.deletePhoto"),
    "photos.deleteConfirm": t("photos.deleteConfirm"),
    "photos.reorderHint": t("photos.reorderHint"),
    "photos.noPhotos": t("photos.noPhotos"),
    "photos.noPhotosHint": t("photos.noPhotosHint"),
    "photos.limitReached": t("photos.limitReached"),
    "photos.typeError": t("photos.typeError"),
    "photos.sizeError": t("photos.sizeError"),
    "photos.exifNote": t("photos.exifNote"),
    // Financial
    "financial.title": t("financial.title"),
    "financial.description": t("financial.description"),
    "financial.currencyLabel": t("financial.currencyLabel"),
    "financial.askingPriceLabel": t("financial.askingPriceLabel"),
    "financial.askingPriceHint": t("financial.askingPriceHint"),
    "financial.annualRevenueLabel": t("financial.annualRevenueLabel"),
    "financial.annualRevenueHint": t("financial.annualRevenueHint"),
    "financial.cashFlowLabel": t("financial.cashFlowLabel"),
    "financial.cashFlowHint": t("financial.cashFlowHint"),
    "financial.financialYearLabel": t("financial.financialYearLabel"),
    "financial.financialYearPlaceholder": t("financial.financialYearPlaceholder"),
    "financial.sellerFinancingLabel": t("financial.sellerFinancingLabel"),
    "financial.inventoryLabel": t("financial.inventoryLabel"),
    "financial.realEstateLabel": t("financial.realEstateLabel"),
    "financial.multiplesTitle": t("financial.multiplesTitle"),
    "financial.multiplesDisclaimer": t("financial.multiplesDisclaimer"),
    "financial.priceRevenueMultiple": t("financial.priceRevenueMultiple", { multiple: "0" }),
    "financial.priceCashFlowMultiple": t("financial.priceCashFlowMultiple", { multiple: "0" }),
    "financial.unsureCta": t("financial.unsureCta"),
    "financial.valuationToolCta": t("financial.valuationToolCta"),
    // Operations
    "operations.title": t("operations.title"),
    "operations.description": t("operations.description"),
    "operations.ownerHoursLabel": t("operations.ownerHoursLabel"),
    "operations.ownerHoursPlaceholder": t("operations.ownerHoursPlaceholder"),
    "operations.employeesLabel": t("operations.employeesLabel"),
    "operations.employeesPlaceholder": t("operations.employeesPlaceholder"),
    "operations.onlineLabel": t("operations.onlineLabel"),
    // Review
    "review.title": t("review.title"),
    "review.description": t("review.description"),
    "review.completenessTitle": t("review.completenessTitle"),
    "review.completenessNote": t("review.completenessNote"),
    "review.missingRequired": t("review.missingRequired"),
    "review.recommended": t("review.recommended"),
    "review.visibilityTitle": t("review.visibilityTitle"),
    "review.visibilityItems": t.raw("review.visibilityItems") as string[],
    "review.notShared": t("review.notShared"),
    "review.notSharedItems": t.raw("review.notSharedItems") as string[],
    "review.authorizationLabel": t("review.authorizationLabel"),
    "review.noCustomerData": t("review.noCustomerData"),
    "review.publishCta": t("review.publishCta"),
    "review.publishConfirm": t("review.publishConfirm"),
    "review.publishSuccess": t("review.publishSuccess"),
    "review.publishError": t("review.publishError"),
    "review.missingFields": t("review.missingFields"),
    "review.unpublishCta": t("review.unpublishCta"),
    "review.unpublishConfirm": t("review.unpublishConfirm"),
    // Completeness
    "completeness.title": t("completeness.title"),
    "completeness.overallPercent": t("completeness.overallPercent", { percent: 0 }),
    "completeness.sectionComplete": t("completeness.sectionComplete"),
    "completeness.sectionIncomplete": t("completeness.sectionIncomplete"),
    "completeness.missingEnglish": t("completeness.missingEnglish"),
    "completeness.missingSpanish": t("completeness.missingSpanish"),
    // Categories
    categories: t.raw("categories") as Record<string, string>,
    // Accessibility
    "accessibility.stepNavLabel": t("accessibility.stepNavLabel"),
    "accessibility.photoGridLabel": t("accessibility.photoGridLabel"),
    "accessibility.dragHandleLabel": t("accessibility.dragHandleLabel"),
    "accessibility.setCoverLabel": t("accessibility.setCoverLabel"),
    "accessibility.deletePhotoLabel": t("accessibility.deletePhotoLabel"),
    "accessibility.previewLabel": t("accessibility.previewLabel"),
  };

  const listingData = {
    id: listing.id,
    status: listing.status,
    is_public: listing.is_public,
    last_step_completed: listing.last_step_completed ?? 0,
    business_name: listing.business_name,
    category: listing.category ?? null,
    location: listing.location ?? null,
    year_established: listing.year_established ?? null,
    is_confidential: listing.is_confidential ?? false,
    teaser_title: listing.teaser_title ?? null,
    headline_en: listing.headline_en ?? null,
    headline_es: listing.headline_es ?? null,
    summary: listing.summary ?? null,
    summary_en: listing.summary_en ?? null,
    summary_es: listing.summary_es ?? null,
    highlights_en: listing.highlights_en ?? null,
    highlights_es: listing.highlights_es ?? null,
    growth_opportunities_en: listing.growth_opportunities_en ?? null,
    growth_opportunities_es: listing.growth_opportunities_es ?? null,
    reason_for_selling_en: listing.reason_for_selling_en ?? null,
    reason_for_selling_es: listing.reason_for_selling_es ?? null,
    currency: listing.currency ?? "USD",
    asking_price: listing.asking_price ?? null,
    annual_revenue: listing.annual_revenue ?? null,
    cash_flow: listing.cash_flow ?? null,
    financial_year: listing.financial_year ?? null,
    seller_financing: listing.seller_financing ?? false,
    inventory_included: listing.inventory_included ?? false,
    real_estate_included: listing.real_estate_included ?? false,
    owner_involvement_hours: listing.owner_involvement_hours ?? null,
    number_of_employees: listing.number_of_employees ?? null,
    established_online: listing.established_online ?? false,
  };

  return (
    <ListingStudioEditor
      listingId={listingId}
      initialData={listingData}
      initialMedia={media}
      initialStep={initialStep}
      imageLimit={imageLimit}
      locale={locale}
      completeness={completeness}
      t={tFlat}
    />
  );
}
