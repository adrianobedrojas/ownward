/**
 * Buyer–Listing Compatibility Scoring Module
 *
 * Pure, testable scoring logic.
 * Does NOT label scores as financial advice, investment guidance,
 * valuations, or guarantees.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BuyerProfile {
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_industries?: string[] | null;
  preferred_locations?: string[] | null;
  remote_business_ok?: boolean | null;
  desired_involvement?: string | null;
  purchase_timeline?: string | null;
  financing_methods?: string[] | null;
  preferred_revenue_min?: number | null;
  preferred_revenue_max?: number | null;
  preferred_cash_flow_min?: number | null;
}

export interface ListingProfile {
  asking_price?: number | null;
  category?: string | null;
  location?: string | null;
  annual_revenue?: number | null;
  annual_cash_flow?: number | null;
  involvement_level?: string | null;
  is_remote?: boolean | null;
}

export type CompatibilityClassification =
  | 'strong_match'
  | 'possible_match'
  | 'low_match'
  | 'missing_information';

export interface CompatibilityResult {
  score: number; // 0–100
  classification: CompatibilityClassification;
  /** Human-readable label (e.g. "Strong match") */
  label: string;
  /** Percentage string (e.g. "83%") */
  percentLabel: string;
  /** Dimension breakdown for optional display */
  dimensions: DimensionScore[];
  /** True when essential data is missing from buyer or listing */
  missingData: boolean;
}

export interface DimensionScore {
  key: string;
  weight: number;
  earned: number; // 0–weight
  available: boolean; // false = dimension skipped due to missing data
}

// ─────────────────────────────────────────────────────────────────────────────
// Weights (must sum to 100)
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  budget:      25,
  industry:    20,
  location:    15,
  revenue:     15,
  involvement: 10,
  timeline:    10,
  financing:    5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function scoreBudget(buyer: BuyerProfile, listing: ListingProfile): DimensionScore {
  const key = 'budget';
  const weight = WEIGHTS.budget;

  if (!hasValue(listing.asking_price)) {
    return { key, weight, earned: 0, available: false };
  }
  if (!hasValue(buyer.budget_min) && !hasValue(buyer.budget_max)) {
    return { key, weight, earned: 0, available: false };
  }

  const price = listing.asking_price as number;
  const min = buyer.budget_min ?? 0;
  const max = buyer.budget_max ?? Infinity;

  if (price >= min && price <= max) {
    return { key, weight, earned: weight, available: true };
  }

  // Partial credit: within 20% over max only
  if (max < Infinity && price / max <= 1.2) {
    return { key, weight, earned: Math.round(weight * 0.5), available: true };
  }

  return { key, weight, earned: 0, available: true };
}

function scoreIndustry(buyer: BuyerProfile, listing: ListingProfile): DimensionScore {
  const key = 'industry';
  const weight = WEIGHTS.industry;

  if (!hasValue(buyer.preferred_industries) || !hasValue(listing.category)) {
    return { key, weight, earned: 0, available: false };
  }

  const industries = (buyer.preferred_industries as string[]).map((i) =>
    i.toLowerCase()
  );
  const category = (listing.category as string).toLowerCase();

  const match = industries.some(
    (ind) => category.includes(ind) || ind.includes(category)
  );

  return { key, weight, earned: match ? weight : 0, available: true };
}

function scoreLocation(buyer: BuyerProfile, listing: ListingProfile): DimensionScore {
  const key = 'location';
  const weight = WEIGHTS.location;

  // Remote business: full score if buyer is OK with remote and listing is remote
  if (listing.is_remote && buyer.remote_business_ok) {
    return { key, weight, earned: weight, available: true };
  }

  if (!hasValue(buyer.preferred_locations) || !hasValue(listing.location)) {
    return { key, weight, earned: 0, available: false };
  }

  const locations = (buyer.preferred_locations as string[]).map((l) =>
    l.toLowerCase()
  );
  const listingLocation = (listing.location as string).toLowerCase();

  const match = locations.some(
    (loc) => listingLocation.includes(loc) || loc.includes(listingLocation)
  );

  return { key, weight, earned: match ? weight : 0, available: true };
}

function scoreRevenue(buyer: BuyerProfile, listing: ListingProfile): DimensionScore {
  const key = 'revenue';
  const weight = WEIGHTS.revenue;

  const revenue = listing.annual_revenue;

  if (!hasValue(revenue)) {
    return { key, weight, earned: 0, available: false };
  }

  if (!hasValue(buyer.preferred_revenue_min) && !hasValue(buyer.preferred_revenue_max)) {
    return { key, weight, earned: 0, available: false };
  }

  const rev = revenue as number;
  const min = buyer.preferred_revenue_min ?? 0;
  const max = buyer.preferred_revenue_max ?? Infinity;

  if (rev >= min && rev <= max) {
    return { key, weight, earned: weight, available: true };
  }

  return { key, weight, earned: 0, available: true };
}

function scoreInvolvement(buyer: BuyerProfile, listing: ListingProfile): DimensionScore {
  const key = 'involvement';
  const weight = WEIGHTS.involvement;

  if (!hasValue(buyer.desired_involvement) || !hasValue(listing.involvement_level)) {
    return { key, weight, earned: 0, available: false };
  }

  const match =
    (buyer.desired_involvement as string).toLowerCase() ===
    (listing.involvement_level as string).toLowerCase();

  return { key, weight, earned: match ? weight : 0, available: true };
}

function scoreTimeline(buyer: BuyerProfile): DimensionScore {
  const key = 'timeline';
  const weight = WEIGHTS.timeline;

  // Timeline signals readiness; presence means active buyer
  if (!hasValue(buyer.purchase_timeline)) {
    return { key, weight, earned: 0, available: false };
  }

  const t = (buyer.purchase_timeline as string).toLowerCase();

  if (t.includes('immediately') || t.includes('0') || t.includes('now')) {
    return { key, weight, earned: weight, available: true };
  }
  if (t.includes('3') || t.includes('6') || t.includes('short')) {
    return { key, weight, earned: Math.round(weight * 0.8), available: true };
  }

  return { key, weight, earned: Math.round(weight * 0.5), available: true };
}

function scoreFinancing(buyer: BuyerProfile): DimensionScore {
  const key = 'financing';
  const weight = WEIGHTS.financing;

  if (!hasValue(buyer.financing_methods)) {
    return { key, weight, earned: 0, available: false };
  }

  const methods = (buyer.financing_methods as string[]).map((m) =>
    m.toLowerCase()
  );

  const strong = methods.some((m) =>
    ['cash', 'prequalified', 'sba'].some((s) => m.includes(s))
  );

  return { key, weight, earned: strong ? weight : Math.round(weight * 0.5), available: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function computeCompatibilityScore(
  buyer: BuyerProfile,
  listing: ListingProfile
): CompatibilityResult {
  const dimensions: DimensionScore[] = [
    scoreBudget(buyer, listing),
    scoreIndustry(buyer, listing),
    scoreLocation(buyer, listing),
    scoreRevenue(buyer, listing),
    scoreInvolvement(buyer, listing),
    scoreTimeline(buyer),
    scoreFinancing(buyer),
  ];

  const availableDimensions = dimensions.filter((d) => d.available);
  const availableWeight = availableDimensions.reduce((s, d) => s + d.weight, 0);

  // If no dimension has available data, return missing_information
  if (availableWeight === 0) {
    return {
      score: 0,
      classification: 'missing_information',
      label: 'Missing information',
      percentLabel: '–',
      dimensions,
      missingData: true,
    };
  }

  const earnedWeight = availableDimensions.reduce((s, d) => s + d.earned, 0);
  const score = Math.round((earnedWeight / availableWeight) * 100);

  let classification: CompatibilityClassification;
  let label: string;

  if (score >= 80) {
    classification = 'strong_match';
    label = 'Strong match';
  } else if (score >= 60) {
    classification = 'possible_match';
    label = 'Possible match';
  } else {
    classification = 'low_match';
    label = 'Low match';
  }

  return {
    score,
    classification,
    label,
    percentLabel: `${score}%`,
    dimensions,
    missingData: availableDimensions.length < dimensions.length,
  };
}
