import type { SupabaseClient } from "@supabase/supabase-js";

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
 * - "starter" : $5/mo Stripe subscription
 * - "builder" : $10/mo Stripe subscription
 * - "pro"     : $20/mo Stripe subscription
 */
export type BillingPlan = "free" | "starter" | "builder" | "pro";

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
  /** Raw storage cap in bytes. */
  storageBytes: number;
  leadLimit: number;
  teamMemberLimit: number;
  healthLevel: HealthLevel;
  valuationLevel: ValuationLevel;
  supportLevel: SupportLevel;
  bookkeeping: boolean;
  dealRooms: boolean;
};

/** 500 MB expressed in bytes. */
const MB = 1024 * 1024;
const GB = 1024 * MB;

const FREE_ENTITLEMENTS: PlanEntitlements = {
  businessLimit: 0,
  listingLimit: 0,
  milestoneMonthlyLimit: 0,
  documentLimit: 0,
  storageBytes: 0,
  leadLimit: 0,
  teamMemberLimit: 0,
  healthLevel: "none",
  valuationLevel: "preview",
  supportLevel: "general",
  bookkeeping: false,
  dealRooms: false,
};

const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  starter: {
    businessLimit: 1,
    listingLimit: 1,
    milestoneMonthlyLimit: 10,
    documentLimit: 10,
    storageBytes: 500 * MB,
    leadLimit: 10,
    teamMemberLimit: 1,
    healthLevel: "basic",
    valuationLevel: "basic",
    supportLevel: "standard",
    bookkeeping: true,
    dealRooms: false,
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

export function getAllowedPriceIds() {
  const prices = Object.values(getPlanPriceMap()).filter(
    (value): value is string => Boolean(value)
  );
  return new Set(prices);
}

export function getPriceIdForPlan(plan: string) {
  const normalizedPlan = plan.toLowerCase() as PlanKey;
  if (!PLAN_KEYS.includes(normalizedPlan)) {
    return null;
  }

  return getPlanPriceMap()[normalizedPlan] ?? null;
}

export function getPlanByPriceId(priceId: string): PlanKey | null {
  const planPriceMap = getPlanPriceMap();

  for (const plan of PLAN_KEYS) {
    if (planPriceMap[plan] === priceId) {
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
  | "MILESTONE_MONTHLY_LIMIT"
  | "DOCUMENT_LIMIT"
  | "STORAGE_LIMIT"
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

