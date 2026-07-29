import type { SupabaseClient } from "@supabase/supabase-js";

export const PLAN_KEYS = ["starter", "builder", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

type PlanEntitlements = {
  documentLimit: number;
  listingLimit: number;
  dealRooms: boolean;
};

const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  starter: {
    documentLimit: 10,
    listingLimit: 1,
    dealRooms: false,
  },
  builder: {
    documentLimit: 100,
    listingLimit: 2,
    dealRooms: false,
  },
  pro: {
    documentLimit: 1000,
    listingLimit: 5,
    dealRooms: true,
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
