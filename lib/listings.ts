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

/**
 * For confidential listings the slug is generated from the teaser title, never the
 * private legal business name.  Falls back to "business" when teaserTitle is empty.
 */
export function createConfidentialSlug(teaserTitle: string) {
  return createUniqueListingSlug(teaserTitle || "business");
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

// ─── Listing completeness ─────────────────────────────────────────────────────

/** Minimal shape consumed by the completeness calculator (pure, no DB). */
export type ListingForCompleteness = {
  business_name?: string | null;
  category?: string | null;
  location?: string | null;
  year_established?: number | null;
  asking_price?: number | null;
  annual_revenue?: number | null;
  cash_flow?: number | null;
  summary?: string | null;
  summary_en?: string | null;
  summary_es?: string | null;
  headline_en?: string | null;
  headline_es?: string | null;
  highlights_en?: string | null;
  highlights_es?: string | null;
  growth_opportunities_en?: string | null;
  growth_opportunities_es?: string | null;
  reason_for_selling_en?: string | null;
  reason_for_selling_es?: string | null;
  seller_financing?: boolean | null;
  owner_involvement_hours?: number | null;
  number_of_employees?: number | null;
  is_confidential?: boolean | null;
  teaser_title?: string | null;
  imageCount?: number;
  hasCoverPhoto?: boolean;
  hasEnglishContent?: boolean;
  hasSpanishContent?: boolean;
};

export type CompletenessSection = {
  id: string;
  label: string;
  score: number;          // 0–100 for this section
  maxScore: number;
  completed: boolean;
  missingRequired: string[];
  improvements: string[];
};

export type ListingCompleteness = {
  /** 0–100 overall score. Not a valuation. */
  overallPercent: number;
  sections: CompletenessSection[];
  missingRequiredToPublish: string[];
  recommendations: string[];
  photoCount: number;
  hasCoverPhoto: boolean;
  missingEnglish: boolean;
  missingSpanish: boolean;
};

function hasValue(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Pure function: calculates how complete a listing is.
 * Score is a profile-completeness indicator — NOT a valuation, appraisal,
 * or sale-readiness assessment.
 */
export function calculateListingCompleteness(
  listing: ListingForCompleteness
): ListingCompleteness {
  const sections: CompletenessSection[] = [];

  // ── 1. Identity ──────────────────────────────────────────────────────────
  const identityMissing: string[] = [];
  const identityImprovements: string[] = [];
  let identityScore = 0;
  const identityMax = 20;

  if (hasValue(listing.business_name)) { identityScore += 10; }
  else { identityMissing.push("Business name"); }

  if (listing.is_confidential) {
    if (!hasValue(listing.teaser_title)) {
      identityMissing.push("Public teaser title (required for confidential listings)");
    } else {
      identityScore += 5;
    }
  } else if (hasValue(listing.business_name)) {
    // Non-confidential listings use the business name as public title — award points for having it
    identityScore += 5;
  }

  if (hasValue(listing.location)) { identityScore += 5; }
  else { identityImprovements.push("Add a city or region"); }

  sections.push({
    id: "identity",
    label: "Identity & Privacy",
    score: identityScore,
    maxScore: identityMax,
    completed: identityScore >= identityMax,
    missingRequired: identityMissing,
    improvements: identityImprovements,
  });

  // ── 2. Business story ────────────────────────────────────────────────────
  const storyMissing: string[] = [];
  const storyImprovements: string[] = [];
  let storyScore = 0;
  const storyMax = 25;

  const hasSummary = hasValue(listing.summary) || hasValue(listing.summary_en) || hasValue(listing.summary_es);
  if (hasSummary) { storyScore += 10; }
  else { storyMissing.push("Business summary"); }

  if (hasValue(listing.category)) { storyScore += 5; }
  else { storyMissing.push("Category"); }

  if (listing.year_established) { storyScore += 5; }
  else { storyImprovements.push("Add the year established"); }

  if (hasValue(listing.highlights_en) || hasValue(listing.highlights_es)) { storyScore += 5; }
  else { storyImprovements.push("Add operational highlights"); }

  sections.push({
    id: "story",
    label: "Business Story",
    score: storyScore,
    maxScore: storyMax,
    completed: storyScore >= storyMax,
    missingRequired: storyMissing,
    improvements: storyImprovements,
  });

  // ── 3. Photos ────────────────────────────────────────────────────────────
  const photoCount = listing.imageCount ?? 0;
  const photoScore = Math.min(15, photoCount * 5);
  sections.push({
    id: "photos",
    label: "Photos",
    score: photoScore,
    maxScore: 15,
    completed: photoCount > 0,
    missingRequired: [],
    improvements: photoCount === 0
      ? ["Add at least one listing photo"]
      : photoCount < 3
      ? ["Add more photos to improve buyer confidence"]
      : [],
  });

  // ── 4. Financial snapshot ────────────────────────────────────────────────
  const finMissing: string[] = [];
  const finImprovements: string[] = [];
  let finScore = 0;
  const finMax = 25;

  if (listing.asking_price && listing.asking_price > 0) { finScore += 10; }
  else { finMissing.push("Asking price"); }

  if (listing.annual_revenue && listing.annual_revenue > 0) { finScore += 8; }
  else { finImprovements.push("Add annual revenue"); }

  if (listing.cash_flow && listing.cash_flow > 0) { finScore += 7; }
  else { finImprovements.push("Add cash flow / SDE"); }

  sections.push({
    id: "financial",
    label: "Financial Snapshot",
    score: finScore,
    maxScore: finMax,
    completed: finScore >= finMax,
    missingRequired: finMissing,
    improvements: finImprovements,
  });

  // ── 5. Operations ────────────────────────────────────────────────────────
  const opsImprovements: string[] = [];
  let opsScore = 0;
  const opsMax = 15;

  if (typeof listing.owner_involvement_hours === "number") { opsScore += 5; }
  else { opsImprovements.push("Add weekly owner involvement hours"); }

  if (typeof listing.number_of_employees === "number") { opsScore += 5; }
  else { opsImprovements.push("Add number of employees"); }

  if (hasValue(listing.reason_for_selling_en) || hasValue(listing.reason_for_selling_es)) {
    opsScore += 5;
  } else {
    opsImprovements.push("Add reason for selling");
  }

  sections.push({
    id: "operations",
    label: "Operations & Transfer",
    score: opsScore,
    maxScore: opsMax,
    completed: opsScore >= opsMax,
    missingRequired: [],
    improvements: opsImprovements,
  });

  // ── Overall ──────────────────────────────────────────────────────────────
  const totalMax = sections.reduce((s, sec) => s + sec.maxScore, 0);
  const totalScore = sections.reduce((s, sec) => s + sec.score, 0);
  const overallPercent = Math.round((totalScore / totalMax) * 100);

  const missingRequiredToPublish = sections.flatMap((s) => s.missingRequired);

  const recommendations = sections
    .flatMap((s) => s.improvements)
    .slice(0, 5);

  const hasEnglishContent =
    hasValue(listing.summary_en) || hasValue(listing.headline_en) || hasValue(listing.summary);
  const hasSpanishContent =
    hasValue(listing.summary_es) || hasValue(listing.headline_es);

  return {
    overallPercent,
    sections,
    missingRequiredToPublish,
    recommendations,
    photoCount,
    hasCoverPhoto: listing.hasCoverPhoto ?? false,
    missingEnglish: !hasEnglishContent,
    missingSpanish: !hasSpanishContent,
  };
}

/** Validated requirements before a listing can be published. */
export function getPublishingRequirements(listing: ListingForCompleteness): string[] {
  const completeness = calculateListingCompleteness(listing);
  return completeness.missingRequiredToPublish;
}

/** Returns true when the listing meets the minimum bar for publishing. */
export function canPublishListing(listing: ListingForCompleteness): boolean {
  return getPublishingRequirements(listing).length === 0;
}

// ─── Image validation ──────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FORBIDDEN_MIME_TYPES = new Set([
  "image/gif",
  "image/svg+xml",
  "application/octet-stream",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Magic-byte signatures per MIME type. */
const MIME_MAGIC: Record<string, { bytes: number[]; offset?: number }> = {
  "image/jpeg": { bytes: [0xff, 0xd8, 0xff] },
  "image/png":  { bytes: [0x89, 0x50, 0x4e, 0x47] },
  // WebP is handled separately below (RIFF + WEBP at offset 8)
};

export type ImageValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validates a listing image buffer server-side.
 * Checks MIME type, file signature, and size.
 * Each declared MIME type is validated against its specific magic bytes —
 * a PNG buffer with a JPEG MIME declaration is rejected.
 */
export function validateListingImage(
  buffer: Uint8Array,
  declaredMimeType: string,
  fileSizeBytes: number
): ImageValidationResult {
  if (fileSizeBytes > MAX_IMAGE_BYTES) {
    return { valid: false, reason: `File exceeds the 10 MB limit (${Math.round(fileSizeBytes / 1024 / 1024)} MB).` };
  }

  const mime = declaredMimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return { valid: false, reason: `File type "${mime}" is not allowed. Upload JPEG, PNG, or WebP only.` };
  }
  if (FORBIDDEN_MIME_TYPES.has(mime)) {
    return { valid: false, reason: `File type "${mime}" is not allowed.` };
  }

  // WebP: needs RIFF at 0 and WEBP at 8
  if (mime === "image/webp") {
    const isRiff = [0x52, 0x49, 0x46, 0x46].every((b, i) => buffer[i] === b);
    const isWebp = [0x57, 0x45, 0x42, 0x50].every((b, i) => buffer[8 + i] === b);
    if (!isRiff || !isWebp) {
      return { valid: false, reason: "File does not appear to be a valid WebP image." };
    }
    return { valid: true };
  }

  // JPEG / PNG: check declared MIME's specific magic bytes only
  const magic = MIME_MAGIC[mime];
  if (!magic) {
    return { valid: false, reason: `File type "${mime}" is not supported.` };
  }

  const { bytes, offset = 0 } = magic;
  const signatureMatches = bytes.every((b, i) => buffer[offset + i] === b);
  if (!signatureMatches) {
    return { valid: false, reason: "File signature does not match the declared type." };
  }

  return { valid: true };
}
