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

// ─── Subscription plans ───────────────────────────────────────────────────────

export const PLAN_KEYS = ["starter", "builder", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/**
 * Valuation feature levels.
 * - basic: single-year SDE estimate, limited report sections
 * - detailed: 3-year weighted average, full report sections
 * - enhanced: full report + Value DNA, Buyer Lens, Value Bridge, and refresh entitlement
 *
 * A future one-time Enhanced Valuation purchase can be added safely by
 * checking `hasOneTimeEnhanced` alongside the plan-based level here.
 */
export type ValuationLevel = "basic" | "detailed" | "enhanced";

type PlanEntitlements = {
  documentLimit: number;
  listingLimit: number;
  dealRooms: boolean;
  // ── Valuation entitlements ──────────────────
  basicValuation: boolean;
  detailedValuation: boolean;
  enhancedValuation: boolean;
  /**
   * Minimum days between full valuation refreshes (null = no limit).
   * Used by the enhanced interactive valuation feature to manage usage.
   * A future one-time purchase can override this to null for the purchased period.
   */
  valuationRefreshDays: number | null;
};

const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  starter: {
    documentLimit: 10,
    listingLimit: 1,
    dealRooms: false,
    basicValuation: true,
    detailedValuation: false,
    enhancedValuation: false,
    valuationRefreshDays: null,
  },
  builder: {
    documentLimit: 100,
    listingLimit: 2,
    dealRooms: false,
    basicValuation: true,
    detailedValuation: true,
    enhancedValuation: false,
    valuationRefreshDays: null,
  },
  pro: {
    documentLimit: 1000,
    listingLimit: 5,
    dealRooms: true,
    basicValuation: true,
    detailedValuation: true,
    enhancedValuation: true,
    valuationRefreshDays: 7,
  },
};

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

export function getPlanByPriceId(priceId: string) {
  const planPriceMap = getPlanPriceMap();

  for (const plan of PLAN_KEYS) {
    if (planPriceMap[plan] === priceId) {
      return plan;
    }
  }

  return null;
}

export function getEntitlementsByPlan(plan: PlanKey | null) {
  if (!plan) {
    return PLAN_ENTITLEMENTS.starter;
  }

  return PLAN_ENTITLEMENTS[plan];
}

export function isActiveSubscription(status?: string | null) {
  return status === "active" || status === "trialing";
}

export async function getUserBillingState(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, price_id, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = subscription?.price_id
    ? getPlanByPriceId(subscription.price_id)
    : null;
  const isSubscribed = isActiveSubscription(subscription?.status);

  return {
    isSubscribed,
    plan,
    entitlements: getEntitlementsByPlan(isSubscribed ? plan : null),
  };
}
