import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

type StripeMissingCustomerError = {
  type: "StripeInvalidRequestError";
  code: "resource_missing";
  param: "id" | "customer";
  message: string;
};

export function isObsoleteStripeCustomer(
  value: Stripe.Customer | Stripe.DeletedCustomer | unknown
): value is Stripe.DeletedCustomer | StripeMissingCustomerError {
  if (
    typeof value === "object" &&
    value !== null &&
    "deleted" in value &&
    value.deleted === true
  ) {
    return true;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "code" in value &&
    "param" in value &&
    "message" in value &&
    value.type === "StripeInvalidRequestError" &&
    value.code === "resource_missing" &&
    (value.param === "id" || value.param === "customer") &&
    typeof value.message === "string" &&
    value.message.includes("No such customer")
  ) {
    return true;
  }

  return false;
}

// ─── Featured-listing one-time product ───────────────────────────────────────

/**
 * Server-only helper: returns the Stripe Price ID and duration for featured
 * listings.  Both values come exclusively from environment variables so the
 * client can never supply or override them.
 *
 * @throws if either variable is missing or the duration is not a positive integer.
 */
export function getFeaturedListingConfig(): {
  priceId: string;
  durationDays: number;
} {
  const priceId = process.env.STRIPE_PRICE_FEATURED_LISTING;
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_FEATURED_LISTING is not configured on the server."
    );
  }

  const rawDuration = process.env.FEATURED_LISTING_DURATION_DAYS ?? "30";
  const durationDays = parseInt(rawDuration, 10);
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error(
      `FEATURED_LISTING_DURATION_DAYS must be a positive integer, got: "${rawDuration}".`
    );
  }

  return { priceId, durationDays };
}

// ─── Plan types ───────────────────────────────────────────────────────────────

/**
 * All billing plans.
 * - "free"    : internal (no Stripe sub required)
 * - "starter" : $5/mo or $50/yr Stripe subscription
 * - "builder" : $10/mo or $100/yr Stripe subscription
 * - "pro"     : $20/mo or $200/yr Stripe subscription
 */
export type BillingPlan = "free" | "starter" | "builder" | "pro";

/** Billing recurrence interval. Monthly is the default. */
export type BillingInterval = "monthly" | "annual";

/** Stripe-billed plans only (no internal "free"). */
export const PLAN_KEYS = ["starter", "builder", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export type HealthLevel = "none" | "basic" | "advanced";

/**
 * Valuation feature levels.
 * - preview  : single line estimate, no saved report (free)
 * - basic    : basic range + simplified earnings, up to 3 actions (starter)
 * - detailed : 3-year weighted average, full sections (builder)
 * - enhanced : full report + Value DNA, Buyer Lens, Value Bridge (pro)
 */
export type ValuationLevel = "preview" | "basic" | "detailed" | "enhanced";

export type SupportLevel = "general" | "standard" | "priority";

// ─── Entitlements ─────────────────────────────────────────────────────────────

export type PlanEntitlements = {
  businessLimit: number;
  listingLimit: number;
  /** Maximum milestones creatable per calendar month (0 = none). */
  milestoneMonthlyLimit: number;
  documentLimit: number;
  /** Raw storage cap in bytes (combined Vault + Deal Room). */
  storageBytes: number;
  leadLimit: number;
  /** Unique invited collaborators across owner account; owner excluded; deal room participants excluded. */
  teamMemberLimit: number;
  healthLevel: HealthLevel;
  valuationLevel: ValuationLevel;
  supportLevel: SupportLevel;
  bookkeeping: boolean;
  dealRooms: boolean;
  /** Maximum concurrent active deal rooms (0 = none; closed/withdrawn excluded). */
  activeDealRoomLimit: number;
  // ── Pro-exclusive capabilities ────────────────────────────────────────────
  /** Sale-Readiness Assessment engine (10-category 0–100 score). */
  saleReadiness: boolean;
  /** Customer Concentration Lab (HHI analysis + scenarios). */
  customerConcentration: boolean;
  /** Weekly Valuation Pulse (one official refresh per rolling 7 days). */
  weeklyValuationRefresh: boolean;
  /** Seller Command Center with pipeline, offers, and NBA widgets. */
  sellerCommandCenter: boolean;
  /** Maximum listing photos per listing (0 = none). */
  listingImageLimit: number;
  /** Maximum listings a buyer/explorer can save across the marketplace. */
  savedListingLimit: number;
  /** Maximum number of listings a user can compare at once. */
  listingComparisonLimit: number;
  /** Whether the user can create or view confidential listings. */
  confidentialListings: boolean;
};

/** 1 MB expressed in bytes. */
const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * Explorer (free) plan entitlements.
 * Internal key remains "free"; public-facing label is "Explorer".
 */
const FREE_ENTITLEMENTS: PlanEntitlements = {
  businessLimit: 1,
  listingLimit: 1,
  milestoneMonthlyLimit: 3,
  documentLimit: 3,
  storageBytes: 100 * MB,
  leadLimit: 5,
  teamMemberLimit: 0,
  healthLevel: "basic",
  valuationLevel: "preview",
  supportLevel: "general",
  bookkeeping: false,
  dealRooms: false,
  activeDealRoomLimit: 0,
  saleReadiness: false,
  customerConcentration: false,
  weeklyValuationRefresh: false,
  sellerCommandCenter: false,
  listingImageLimit: 3,
  savedListingLimit: 5,
  listingComparisonLimit: 2,
  confidentialListings: false,
};

const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  starter: {
    businessLimit: 1,
    listingLimit: 1,
    milestoneMonthlyLimit: 10,
    documentLimit: 10,
    storageBytes: 500 * MB,
    leadLimit: 25,
    teamMemberLimit: 1,
    healthLevel: "basic",
    valuationLevel: "basic",
    supportLevel: "standard",
    bookkeeping: true,
    dealRooms: false,
    activeDealRoomLimit: 0,
    saleReadiness: false,
    customerConcentration: false,
    weeklyValuationRefresh: false,
    sellerCommandCenter: false,
    listingImageLimit: 10,
    savedListingLimit: 25,
    listingComparisonLimit: 3,
    confidentialListings: true,
  },
  builder: {
    businessLimit: 2,
    listingLimit: 2,
    milestoneMonthlyLimit: 100,
    documentLimit: 100,
    storageBytes: 5 * GB,
    leadLimit: 100,
    teamMemberLimit: 2,
    healthLevel: "advanced",
    valuationLevel: "detailed",
    supportLevel: "standard",
    bookkeeping: true,
    dealRooms: false,
    activeDealRoomLimit: 0,
    saleReadiness: false,
    customerConcentration: false,
    weeklyValuationRefresh: false,
    sellerCommandCenter: false,
    listingImageLimit: 20,
    savedListingLimit: 100,
    listingComparisonLimit: 5,
    confidentialListings: true,
  },
  pro: {
    businessLimit: 5,
    listingLimit: 5,
    milestoneMonthlyLimit: 1000,
    documentLimit: 1000,
    storageBytes: 50 * GB,
    leadLimit: 1000,
    teamMemberLimit: 5,
    healthLevel: "advanced",
    valuationLevel: "enhanced",
    supportLevel: "priority",
    bookkeeping: true,
    dealRooms: true,
    activeDealRoomLimit: 3,
    saleReadiness: true,
    customerConcentration: true,
    weeklyValuationRefresh: true,
    sellerCommandCenter: true,
    listingImageLimit: 40,
    savedListingLimit: 1000,
    listingComparisonLimit: 10,
    confidentialListings: true,
  },
};

// ─── Price-map helpers ────────────────────────────────────────────────────────

export function getPlanPriceMap() {
  return {
    starter: process.env.STRIPE_PRICE_STARTER,
    builder: process.env.STRIPE_PRICE_BUILDER,
    pro: process.env.STRIPE_PRICE_PRO,
  };
}

export function getPlanPriceMapAnnual() {
  return {
    starter: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    builder: process.env.STRIPE_PRICE_BUILDER_ANNUAL,
    pro: process.env.STRIPE_PRICE_PRO_ANNUAL,
  };
}

export function getAllowedPriceIds() {
  const prices = [
    ...Object.values(getPlanPriceMap()),
    ...Object.values(getPlanPriceMapAnnual()),
  ].filter((value): value is string => Boolean(value));
  return new Set(prices);
}

export function getPriceIdForPlan(plan: string, interval: BillingInterval = "monthly") {
  const normalizedPlan = plan.toLowerCase() as PlanKey;
  if (!PLAN_KEYS.includes(normalizedPlan)) {
    return null;
  }

  if (interval === "annual") {
    return getPlanPriceMapAnnual()[normalizedPlan] ?? null;
  }
  return getPlanPriceMap()[normalizedPlan] ?? null;
}

export function getPlanByPriceId(priceId: string): PlanKey | null {
  const monthlyMap = getPlanPriceMap();
  const annualMap = getPlanPriceMapAnnual();

  for (const plan of PLAN_KEYS) {
    if (monthlyMap[plan] === priceId || annualMap[plan] === priceId) {
      return plan;
    }
  }

  return null;
}

export function getEntitlementsByPlan(plan: BillingPlan): PlanEntitlements {
  if (plan === "free") return FREE_ENTITLEMENTS;
  return PLAN_ENTITLEMENTS[plan];
}

/** @deprecated Use getEntitlementsByPlan(plan) directly. */
export function getPlanEntitlements() {
  return PLAN_ENTITLEMENTS;
}

export function isActiveSubscription(status?: string | null): boolean {
  return status === "active" || status === "trialing";
}

// ─── Billing state ────────────────────────────────────────────────────────────

export type BillingState = {
  plan: BillingPlan;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: PlanEntitlements;
};

/**
 * Returns the billing state for a user.
 *
 * - Returns **free** entitlements when there is no active/trialing subscription,
 *   when the price_id is unrecognised, or when a DB error occurs.
 * - Never grants paid access on error, missing/unknown price, or missing row.
 */
export async function getUserBillingState(
  supabase: SupabaseClient,
  userId: string
): Promise<BillingState> {
  const FREE_STATE: BillingState = {
    plan: "free",
    status: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    entitlements: FREE_ENTITLEMENTS,
  };

  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select(
        "status, price_id, current_period_end, cancel_at_period_end, updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // DB error → fail closed (free)
    if (error) return FREE_STATE;

    // No subscription row → free
    if (!subscription) return FREE_STATE;

    // Not active or trialing → free
    if (!isActiveSubscription(subscription.status)) return FREE_STATE;

    // Unrecognised price_id → free
    const plan = subscription.price_id
      ? getPlanByPriceId(subscription.price_id)
      : null;
    if (!plan) return FREE_STATE;

    return {
      plan,
      status: subscription.status ?? null,
      currentPeriodEnd: subscription.current_period_end ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      entitlements: PLAN_ENTITLEMENTS[plan],
    };
  } catch {
    // Any unexpected error → fail closed
    return FREE_STATE;
  }
}

// ─── Typed upgrade errors ─────────────────────────────────────────────────────

export type UpgradeErrorCode =
  | "BUSINESS_LIMIT"
  | "LISTING_LIMIT"
  | "IMAGE_LIMIT"
  | "MILESTONE_MONTHLY_LIMIT"
  | "DOCUMENT_LIMIT"
  | "STORAGE_LIMIT"
  | "SAVED_LISTING_LIMIT"
  | "COMPARISON_LIMIT"
  | "CONFIDENTIAL_LISTING_GATED"
  | "READ_ONLY_OVER_LIMIT"
  | "FEATURE_GATED"
  | "PLAN_REQUIRED";

export class EntitlementError extends Error {
  constructor(
    public readonly code: UpgradeErrorCode,
    message: string
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

/** Returns an EntitlementError if the user cannot create a new business, else null. */
export function checkBusinessLimit(
  entitlements: PlanEntitlements,
  currentCount: number
): EntitlementError | null {
  if (entitlements.businessLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to create a business workspace."
    );
  }
  if (currentCount >= entitlements.businessLimit) {
    return new EntitlementError(
      "BUSINESS_LIMIT",
      `Your plan allows up to ${entitlements.businessLimit} business workspace${entitlements.businessLimit === 1 ? "" : "s"}. Upgrade to add more.`
    );
  }
  return null;
}

/** Returns an EntitlementError if the user cannot create a new listing, else null. */
export function checkListingLimit(
  entitlements: PlanEntitlements,
  currentCount: number
): EntitlementError | null {
  if (entitlements.listingLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to create a listing."
    );
  }
  if (currentCount >= entitlements.listingLimit) {
    return new EntitlementError(
      "LISTING_LIMIT",
      `Your plan allows up to ${entitlements.listingLimit} listing${entitlements.listingLimit === 1 ? "" : "s"}. Upgrade to add more.`
    );
  }
  return null;
}

/** Returns an EntitlementError if the user has hit their monthly milestone limit. */
export function checkMilestoneMonthlyLimit(
  entitlements: PlanEntitlements,
  countThisMonth: number
): EntitlementError | null {
  if (entitlements.milestoneMonthlyLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to create milestones."
    );
  }
  if (countThisMonth >= entitlements.milestoneMonthlyLimit) {
    return new EntitlementError(
      "MILESTONE_MONTHLY_LIMIT",
      `You have used all ${entitlements.milestoneMonthlyLimit} milestone${entitlements.milestoneMonthlyLimit === 1 ? "" : "s"} for this month. Upgrade your plan or wait until next month.`
    );
  }
  return null;
}

/** Returns an EntitlementError if the listing has reached its image limit. */
export function checkListingImageLimit(
  entitlements: PlanEntitlements,
  currentImageCount: number
): EntitlementError | null {
  if (entitlements.listingImageLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to upload listing images."
    );
  }
  if (currentImageCount >= entitlements.listingImageLimit) {
    return new EntitlementError(
      "IMAGE_LIMIT",
      `Your plan allows up to ${entitlements.listingImageLimit} image${entitlements.listingImageLimit === 1 ? "" : "s"} per listing. Upgrade to add more.`
    );
  }
  return null;
}

/** Returns an EntitlementError if the user cannot upload another document. */
export function checkDocumentLimits(
  entitlements: PlanEntitlements,
  currentDocCount: number,
  currentStorageBytes: number,
  newFileSizeBytes: number
): EntitlementError | null {
  if (entitlements.documentLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to upload documents."
    );
  }
  if (currentDocCount >= entitlements.documentLimit) {
    return new EntitlementError(
      "DOCUMENT_LIMIT",
      `Your plan allows up to ${entitlements.documentLimit} active document${entitlements.documentLimit === 1 ? "" : "s"}. Delete some or upgrade your plan.`
    );
  }
  if (currentStorageBytes + newFileSizeBytes > entitlements.storageBytes) {
    const usedMB = Math.round(currentStorageBytes / (1024 * 1024));
    const limitMB = Math.round(entitlements.storageBytes / (1024 * 1024));
    return new EntitlementError(
      "STORAGE_LIMIT",
      `Uploading this file would exceed your ${limitMB} MB storage limit (currently using ${usedMB} MB). Delete files or upgrade your plan.`
    );
  }
  return null;
}

/**
 * Returns an EntitlementError if the user has hit their active lead limit.
 * "Active leads" are non-deleted rows with record_type = 'lead'.
 */
export function checkLeadLimit(
  entitlements: PlanEntitlements,
  currentActiveLeadCount: number
): EntitlementError | null {
  if (entitlements.leadLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to track leads."
    );
  }
  if (currentActiveLeadCount >= entitlements.leadLimit) {
    return new EntitlementError(
      "FEATURE_GATED",
      `Your plan allows up to ${entitlements.leadLimit} active lead${entitlements.leadLimit === 1 ? "" : "s"}. Archive some or upgrade your plan.`
    );
  }
  return null;
}

/**
 * Returns an EntitlementError if the business has hit its invited-collaborator
 * limit.  The owner is excluded from this count; only invited members/pending
 * invitations count toward the limit.
 */
export function checkTeamMemberLimit(
  entitlements: PlanEntitlements,
  currentInvitedCount: number
): EntitlementError | null {
  if (entitlements.teamMemberLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "A paid plan is required to invite team members."
    );
  }
  if (currentInvitedCount >= entitlements.teamMemberLimit) {
    return new EntitlementError(
      "FEATURE_GATED",
      `Your plan allows up to ${entitlements.teamMemberLimit} invited collaborator${entitlements.teamMemberLimit === 1 ? "" : "s"} per business. Upgrade to invite more.`
    );
  }
  return null;
}

// ─── Bookkeeping access ───────────────────────────────────────────────────────

export type BookkeepingAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      code: UpgradeErrorCode;
      message: string;
      /** true when user has the feature on their plan */
      featureEnabled: boolean;
    };

/**
 * Checks whether a user's current billing state permits bookkeeping write
 * operations (create/edit transactions, close months, reconcile, etc.).
 *
 * - Builder and Pro plans: write access allowed.
 * - Starter: write access allowed (bookkeeping: true entitlement).
 * - Free / downgraded: read/export/delete only, no writes.
 *
 * Returns a structured result — never throws.
 */
export function checkBookkeepingAccess(
  entitlements: PlanEntitlements
): BookkeepingAccessResult {
  if (!entitlements.bookkeeping) {
    return {
      allowed: false,
      code: "PLAN_REQUIRED",
      message:
        "Revenue and expense tracking requires a Builder or higher plan. " +
        "You can still view, export, or delete your existing records.",
      featureEnabled: false,
    };
  }
  return { allowed: true };
}

// ─── Deal Room limit ──────────────────────────────────────────────────────────

/**
 * Returns an EntitlementError if the user cannot create another active deal room.
 * Closed and withdrawn rooms are excluded from the count.
 */
export function checkDealRoomLimit(
  entitlements: PlanEntitlements,
  currentActiveCount: number
): EntitlementError | null {
  if (!entitlements.dealRooms || entitlements.activeDealRoomLimit === 0) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      "Deal Rooms require a Pro plan."
    );
  }
  if (currentActiveCount >= entitlements.activeDealRoomLimit) {
    return new EntitlementError(
      "FEATURE_GATED",
      `Your plan allows up to ${entitlements.activeDealRoomLimit} active Deal Room${entitlements.activeDealRoomLimit === 1 ? "" : "s"}. Close or withdraw existing rooms to create a new one.`
    );
  }
  return null;
}

// ─── Pro feature gate ─────────────────────────────────────────────────────────

export type ProFeatureKey =
  | "saleReadiness"
  | "customerConcentration"
  | "weeklyValuationRefresh"
  | "sellerCommandCenter";

const PRO_FEATURE_LABELS: Record<ProFeatureKey, string> = {
  saleReadiness: "Sale-Readiness Assessment",
  customerConcentration: "Customer Concentration Lab",
  weeklyValuationRefresh: "Weekly Valuation Pulse",
  sellerCommandCenter: "Seller Command Center",
};

/**
 * Returns an EntitlementError if the user does not have access to a Pro-only
 * feature, else null.
 */
export function checkProFeature(
  entitlements: PlanEntitlements,
  feature: ProFeatureKey
): EntitlementError | null {
  if (!entitlements[feature]) {
    return new EntitlementError(
      "PLAN_REQUIRED",
      `${PRO_FEATURE_LABELS[feature]} is available on the Pro plan only. Upgrade to unlock this feature.`
    );
  }
  return null;
}

// ─── Saved listing limit ──────────────────────────────────────────────────────

/**
 * Returns an EntitlementError if the user cannot save another listing.
 * Duplicate saves do not consume additional capacity (checked before calling).
 */
export function checkSavedListingLimit(
  entitlements: PlanEntitlements,
  currentSavedCount: number
): EntitlementError | null {
  if (currentSavedCount >= entitlements.savedListingLimit) {
    return new EntitlementError(
      "SAVED_LISTING_LIMIT",
      `Your plan allows up to ${entitlements.savedListingLimit} saved listing${entitlements.savedListingLimit === 1 ? "" : "s"}. Remove some or upgrade to save more.`
    );
  }
  return null;
}

// ─── Listing comparison limit ─────────────────────────────────────────────────

/**
 * Returns an EntitlementError if the user cannot compare this many listings.
 */
export function checkListingComparisonLimit(
  entitlements: PlanEntitlements,
  requestedCount: number
): EntitlementError | null {
  if (requestedCount > entitlements.listingComparisonLimit) {
    return new EntitlementError(
      "COMPARISON_LIMIT",
      `Your plan allows comparing up to ${entitlements.listingComparisonLimit} listing${entitlements.listingComparisonLimit === 1 ? "" : "s"} at a time. Upgrade to compare more.`
    );
  }
  return null;
}

// ─── Confidential listing access ──────────────────────────────────────────────

/**
 * Returns an EntitlementError if the user's plan does not permit confidential listings.
 */
export function checkConfidentialListingAccess(
  entitlements: PlanEntitlements
): EntitlementError | null {
  if (!entitlements.confidentialListings) {
    return new EntitlementError(
      "CONFIDENTIAL_LISTING_GATED",
      "Confidential listings are available on Starter and higher plans. Upgrade to create or view private listings."
    );
  }
  return null;
}

// ─── Plan catalog (public-facing) ─────────────────────────────────────────────

/**
 * Authoritative plan catalog entry — single source of truth for both the
 * pricing page and billing enforcement.
 */
export type PlanCatalogEntry = {
  key: BillingPlan;
  name: string;
  monthlyPrice: number;
  /** Full price billed once per year. 0 for free. */
  annualPrice: number;
  tagline: string;
  publicFeatures: string[];
  upgradeOrder: number;
  entitlements: PlanEntitlements;
  supportLevel: SupportLevel;
  storageDescription: string;
  teamSeatDescription: string;
  dealRoomDescription: string;
  valuationRefreshDescription: string;
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    key: "free",
    name: "Explorer",
    monthlyPrice: 0,
    annualPrice: 0,
    tagline: "Your first meaningful step — free forever",
    publicFeatures: [
      "1 Business Workspace",
      "3 Milestones / month",
      "Basic Health Snapshot",
      "Valuation Preview",
      "Up to 3 Documents (100 MB)",
      "5 Active Leads",
      "Save up to 5 listings",
      "Compare up to 2 businesses",
      "1 Public Listing (3 photos)",
    ],
    upgradeOrder: 0,
    entitlements: FREE_ENTITLEMENTS,
    supportLevel: "general",
    storageDescription: "100 MB",
    teamSeatDescription: "No team seats",
    dealRoomDescription: "Not included",
    valuationRefreshDescription: "Preview only",
  },
  {
    key: "starter",
    name: "Starter",
    monthlyPrice: 5,
    annualPrice: 50,
    tagline: "Build operations and reach buyers",
    publicFeatures: [
      "1 Business Workspace",
      "10 Milestones / month",
      "Basic Health Checklist",
      "Basic Valuation Range",
      "Up to 10 Documents (500 MB)",
      "25 Active Leads",
      "Save up to 25 listings",
      "Compare up to 3 businesses",
      "1 Public or Confidential Listing (10 photos)",
      "Bookkeeping",
      "1 Invited Collaborator",
      "Standard Support",
    ],
    upgradeOrder: 1,
    entitlements: PLAN_ENTITLEMENTS.starter,
    supportLevel: "standard",
    storageDescription: "500 MB (Vault)",
    teamSeatDescription: "1 invited collaborator (owner excluded)",
    dealRoomDescription: "Not included",
    valuationRefreshDescription: "Basic range (on demand)",
  },
  {
    key: "builder",
    name: "Builder",
    monthlyPrice: 10,
    annualPrice: 100,
    tagline: "Scale with advanced analytics and collaboration",
    publicFeatures: [
      "Up to 2 Businesses",
      "Revenue & Expense Tracking",
      "100 Milestones / month",
      "Advanced Health Report",
      "Detailed Valuation Estimate",
      "Up to 100 Documents (5 GB)",
      "100 Active Leads",
      "Save up to 100 listings",
      "Compare up to 5 businesses",
      "Up to 2 Listings (20 photos each)",
      "Confidential Listings",
      "2 Invited Collaborators",
      "Standard Support",
    ],
    upgradeOrder: 2,
    entitlements: PLAN_ENTITLEMENTS.builder,
    supportLevel: "standard",
    storageDescription: "5 GB (Vault)",
    teamSeatDescription: "2 invited collaborators (owner excluded)",
    dealRoomDescription: "Not included",
    valuationRefreshDescription: "Detailed estimate (on demand)",
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 20,
    annualPrice: 200,
    tagline: "Serious owners preparing to grow or sell",
    publicFeatures: [
      "Up to 5 Businesses",
      "Sale-Readiness Score (10 categories)",
      "Full Valuation Report + Weekly Refresh",
      "Customer Concentration Lab",
      "Seller Command Center & Pipeline",
      "Up to 3 Active Deal Rooms",
      "1,000 Milestones / month",
      "1,000 Active Leads",
      "Up to 50 GB storage (Vault + Deal Rooms)",
      "Save up to 1,000 listings",
      "Compare up to 10 businesses",
      "Up to 5 Listings (40 photos each)",
      "5 Invited Collaborators",
      "Priority Support",
    ],
    upgradeOrder: 3,
    entitlements: PLAN_ENTITLEMENTS.pro,
    supportLevel: "priority",
    storageDescription: "50 GB combined (Vault + Deal Room files)",
    teamSeatDescription:
      "5 unique invited collaborators (owner excluded; deal room participants excluded)",
    dealRoomDescription: "Up to 3 active Deal Rooms (closed/withdrawn excluded)",
    valuationRefreshDescription:
      "Enhanced report + 1 official refresh per rolling 7 days",
  },
];

/** Returns the catalog entry for a given plan key. */
export function getPlanCatalogEntry(plan: BillingPlan): PlanCatalogEntry {
  const entry = PLAN_CATALOG.find((p) => p.key === plan);
  if (!entry) {
    // Should never happen; return free as safety fallback
    return PLAN_CATALOG[0];
  }
  return entry;
}
