import { createClient } from "@/lib/supabase/server";
import { getUserBillingState, type BillingPlan } from "@/lib/billing";
import {
  getProduct,
  getPurchasableProduct,
  toPublicSolution,
  type ProductDefinition,
  type ProductKey,
  type RequiredTargetType,
} from "@/lib/commerce/products";
import { PLACEMENT_CONFIG, type SolutionPlacement } from "@/lib/commerce/solution-placements";

export type RecommendationCandidate = {
  productKey: ProductKey;
  score: number;
  reasonKey: string;
  targetId?: string;
};

export type RecommendationState =
  | "purchase"
  | "open"
  | "continue"
  | "view_report"
  | "manage_promotion"
  | "already_purchased"
  | "processing"
  | "available_again"
  | "refunded"
  | "included"
  | "planned"
  | "coming_soon"
  | "contact"
  | "select_target"
  | "blocked";

export type TargetOption = {
  id: string;
  label: string;
  description?: string;
};

export type ContextualRecommendation = {
  productKey: ProductKey;
  slug: string;
  name: string;
  description: string;
  outcome: string;
  displayPrice: number;
  billingModel: string;
  billingContext: string;
  status: string;
  reasonKey: string;
  ctaState: RecommendationState;
  ctaHref: string | null;
  detailRoute: string;
  includedInPlan: boolean;
  targetRequired: boolean;
  targetType: RequiredTargetType;
  targetId: string | null;
  targetOptions: TargetOption[];
  dismissible: boolean;
  analytics: {
    placement: SolutionPlacement;
    product_key: ProductKey;
    status: string;
    billing_model: string;
    price_band: string;
    recommendation_reason_key: string;
  };
};

export type ContextualRecommendationInput = {
  placement: SolutionPlacement;
  locale: "en" | "es";
  userId?: string | null;
  currentPlan?: BillingPlan | null;
  businessId?: string | null;
  listingId?: string | null;
  dealRoomId?: string | null;
  transactionId?: string | null;
  acquisitionTargetId?: string | null;
  publicListingOwnerId?: string | null;
  isOwnListingView?: boolean;
  limit?: number;
};

type PurchaseSignal = {
  product_key: string;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
};

type RecSignalContext = {
  role: string | null;
  valuationCount: number;
  saleReadinessCount: number;
  latestSaleReadinessScore: number | null;
  customerConcentrationCount: number;
  latestCustomerRiskLevel: string | null;
  savedListingCount: number;
  publishedListingCount: number;
  featuredActiveCount: number;
  activeDealRoomCount: number;
  hasDealRoomForContext: boolean;
  dealRoomStage: string | null;
  dealRoomStatus: string | null;
  dealRoomHasExpiration: boolean;
  hasPaidPurchaseByProduct: Map<string, PurchaseSignal>;
  hasRefundByProduct: Set<string>;
  hasPendingPurchaseByProduct: Set<string>;
  activePromotionListingIds: Set<string>;
};

const INCLUDED_RULES: Partial<Record<ProductKey, { plans: BillingPlan[]; route: string }>> = {
  buyer_lens_memo: { plans: ["pro"], route: "/valuation" },
  value_dna_snapshot: { plans: ["pro"], route: "/valuation" },
  sale_readiness_blueprint: { plans: ["pro"], route: "/sale-readiness" },
  customer_risk_scan: { plans: ["pro"], route: "/customer-concentration" },
};

function localePrefix(locale: "en" | "es"): string {
  return locale === "es" ? "/es" : "";
}

function getPriceBand(price: number): string {
  if (price <= 0) return "free";
  if (price <= 5) return "5";
  if (price <= 10) return "10";
  return "20";
}

function targetIdFromContext(product: ProductDefinition, input: ContextualRecommendationInput): string | null {
  switch (product.requiredTargetType) {
    case "listing":
      return input.listingId ?? null;
    case "business":
      return input.businessId ?? null;
    case "deal_room":
      return input.dealRoomId ?? null;
    case "transaction":
      return input.transactionId ?? null;
    case "acquisition_target":
      return input.acquisitionTargetId ?? null;
    default:
      return null;
  }
}

async function loadTargetOptions(
  requiredTargetType: RequiredTargetType,
  userId: string,
  locale: "en" | "es",
): Promise<TargetOption[]> {
  const supabase = await createClient();

  if (requiredTargetType === "listing") {
    const { data } = await supabase
      .from("business_listings")
      .select("id, business_name, status, is_public")
      .eq("user_id", userId)
      .eq("status", "published")
      .eq("is_public", true)
      .limit(5);

    return (data ?? []).map((row) => ({
      id: row.id,
      label: row.business_name ?? (locale === "es" ? "Listado" : "Listing"),
      description: locale === "es" ? "Publicado y elegible" : "Published and eligible",
    }));
  }

  if (requiredTargetType === "business") {
    const { data } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .limit(5);

    return (data ?? []).map((row) => ({
      id: row.id,
      label: row.name ?? (locale === "es" ? "Negocio" : "Business"),
    }));
  }

  return [];
}

async function getSignals(
  userId: string,
  input: ContextualRecommendationInput,
): Promise<RecSignalContext> {
  const supabase = await createClient();

  const [
    profileRes,
    valuationsRes,
    readinessRes,
    concentrationRes,
    savedRes,
    listingsRes,
    promotionsRes,
    dealRoomsRes,
    contextDealRoomRes,
    purchasesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase.from("valuation_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("sale_readiness_assessments")
      .select("overall_score, scored_at")
      .eq("user_id", userId)
      .order("scored_at", { ascending: false })
      .limit(1),
    supabase
      .from("customer_concentration_snapshots")
      .select("id, concentration_risk_level, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("saved_listings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("business_listings")
      .select("id, status, is_public, featured_until")
      .eq("user_id", userId)
      .limit(100),
    supabase
      .from("listing_promotions")
      .select("listing_id, status, ends_at")
      .eq("user_id", userId)
      .in("status", ["active", "pending"])
      .limit(100),
    supabase
      .from("deal_rooms")
      .select("id", { count: "exact", head: true })
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .in("status", ["active", "paused"]),
    input.dealRoomId
      ? supabase
          .from("deal_rooms")
          .select("id, stage, status")
          .eq("id", input.dealRoomId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("purchases")
      .select("product_key, payment_status, fulfillment_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const listingRows = listingsRes.data ?? [];
  const now = Date.now();
  const publishedListingCount = listingRows.filter((row) => row.status === "published").length;
  const featuredActiveCount = listingRows.filter((row) => {
    if (!row.featured_until) return false;
    const t = new Date(row.featured_until).getTime();
    return Number.isFinite(t) && t > now;
  }).length;

  const activePromotionListingIds = new Set(
    (promotionsRes.data ?? [])
      .filter((row) => row.status === "active" || row.status === "pending")
      .map((row) => row.listing_id),
  );

  const purchaseRows = (purchasesRes.data ?? []) as PurchaseSignal[];
  const hasPaidPurchaseByProduct = new Map<string, PurchaseSignal>();
  const hasRefundByProduct = new Set<string>();
  const hasPendingPurchaseByProduct = new Set<string>();

  for (const row of purchaseRows) {
    if (!hasPaidPurchaseByProduct.has(row.product_key) && row.payment_status === "paid") {
      hasPaidPurchaseByProduct.set(row.product_key, row);
    }
    if (row.payment_status === "refunded" || row.fulfillment_status === "refunded") {
      hasRefundByProduct.add(row.product_key);
    }
    if (row.payment_status === "pending") {
      hasPendingPurchaseByProduct.add(row.product_key);
    }
  }

  const latestReadiness = readinessRes.data?.[0] ?? null;
  const latestConcentration = concentrationRes.data?.[0] ?? null;

  return {
    role: (profileRes.data?.role as string | null) ?? null,
    valuationCount: valuationsRes.count ?? 0,
    saleReadinessCount: readinessRes.data?.length ?? 0,
    latestSaleReadinessScore: latestReadiness?.overall_score ?? null,
    customerConcentrationCount: concentrationRes.count ?? 0,
    latestCustomerRiskLevel: latestConcentration?.concentration_risk_level ?? null,
    savedListingCount: savedRes.count ?? 0,
    publishedListingCount,
    featuredActiveCount,
    activeDealRoomCount: dealRoomsRes.count ?? 0,
    hasDealRoomForContext: Boolean(contextDealRoomRes.data?.id),
    dealRoomStage: contextDealRoomRes.data?.stage ?? null,
    dealRoomStatus: contextDealRoomRes.data?.status ?? null,
    dealRoomHasExpiration: false,
    hasPaidPurchaseByProduct,
    hasRefundByProduct,
    hasPendingPurchaseByProduct,
    activePromotionListingIds,
  };
}

function scoreAdjustment(
  productKey: ProductKey,
  placement: SolutionPlacement,
  signals: RecSignalContext,
): number {
  let boost = 0;

  if (placement === "dashboard") {
    if (productKey === "value_action_sprint" && signals.valuationCount > 0) boost += 12;
    if (productKey === "featured_listing" && signals.publishedListingCount > 0 && signals.featuredActiveCount === 0) boost += 14;
    if (productKey === "business_comparison_pack" && signals.savedListingCount >= 2) boost += 10;
    if (productKey === "sale_readiness_blueprint" && signals.latestSaleReadinessScore !== null && signals.latestSaleReadinessScore < 75) boost += 8;
    if (signals.activeDealRoomCount > 0 && productKey === "value_action_sprint") boost -= 15;
  }

  if (placement === "saved_listings") {
    if (productKey === "business_comparison_pack" && signals.savedListingCount >= 2) boost += 25;
    if (productKey === "business_comparison_pack" && signals.savedListingCount < 2) boost -= 50;
    if (productKey === "buyer_diligence_pass" && signals.savedListingCount === 1) boost += 10;
  }

  if (placement === "sale_readiness") {
    if (productKey === "owner_dependence_scan" && signals.latestSaleReadinessScore !== null && signals.latestSaleReadinessScore < 70) boost += 10;
    if (productKey === "customer_risk_scan" && signals.latestCustomerRiskLevel && ["high", "critical"].includes(signals.latestCustomerRiskLevel)) boost += 15;
  }

  if (placement === "customer_concentration") {
    if (productKey === "customer_risk_scan") boost += 15;
  }

  if (placement === "deal_room") {
    if (productKey === "deal_room_extension" && !signals.dealRoomHasExpiration) boost -= 100;
    if (productKey === "closing_archive" && (signals.dealRoomStage === "closing" || signals.dealRoomStage === "completed")) boost += 15;
    if (productKey === "transaction_workspace" && (signals.dealRoomStage === "due_diligence" || signals.dealRoomStage === "offer_review")) boost += 10;
  }

  if (placement === "public_listing") {
    if (signals.role === "seller") {
      if (productKey === "featured_listing") boost += 18;
      if (productKey === "business_comparison_pack") boost -= 100;
    } else {
      if (productKey === "featured_listing") boost -= 100;
    }
  }

  if (placement === "buy_marketplace" || placement === "buyer_preferences") {
    if (signals.role === "seller") boost -= 80;
  }

  if (placement === "seller_command_center" || placement === "listing_studio" || placement === "listing_management") {
    if (signals.role === "buyer") boost -= 80;
  }

  return boost;
}

function resolveCtaState(
  product: ProductDefinition,
  currentPlan: BillingPlan,
  targetId: string | null,
  targetOptions: TargetOption[],
  signals: RecSignalContext,
): { state: RecommendationState; href: string | null; includedInPlan: boolean } {
  const inclusion = INCLUDED_RULES[product.key];
  const includedInPlan = Boolean(inclusion?.plans.includes(currentPlan));

  if (includedInPlan && inclusion) {
    return { state: "included", href: inclusion.route, includedInPlan: true };
  }

  if (signals.hasPendingPurchaseByProduct.has(product.key)) {
    return { state: "processing", href: null, includedInPlan: false };
  }

  if (signals.hasRefundByProduct.has(product.key)) {
    return { state: "available_again", href: null, includedInPlan: false };
  }

  if (signals.hasPaidPurchaseByProduct.has(product.key)) {
    if (product.key === "featured_listing") {
      return { state: "manage_promotion", href: "/seller", includedInPlan: false };
    }
    if (product.key === "value_action_sprint") {
      return { state: "continue", href: "/account/products", includedInPlan: false };
    }
    return { state: "already_purchased", href: "/account/products", includedInPlan: false };
  }

  if (product.status !== "active") {
    if (product.status === "planned" || product.ctaBehavior === "coming_soon") {
      return { state: "planned", href: product.detailRoute, includedInPlan: false };
    }
    if (product.ctaBehavior === "contact") {
      return { state: "contact", href: "/contact", includedInPlan: false };
    }
    return { state: "coming_soon", href: product.detailRoute, includedInPlan: false };
  }

  if (product.requiredTargetType !== "none" && !targetId && targetOptions.length === 0) {
    return { state: "blocked", href: null, includedInPlan: false };
  }

  if (product.requiredTargetType !== "none" && !targetId) {
    return { state: "select_target", href: null, includedInPlan: false };
  }

  if (!getPurchasableProduct(product.key)) {
    return { state: "planned", href: product.detailRoute, includedInPlan: false };
  }

  return { state: "purchase", href: null, includedInPlan: false };
}

export async function getContextualSolutions(
  input: ContextualRecommendationInput,
): Promise<ContextualRecommendation[]> {
  const placementConfig = PLACEMENT_CONFIG[input.placement];
  if (!placementConfig) return [];

  const requestedLimit = input.limit ?? placementConfig.maxItems;
  const limit = Math.max(1, Math.min(requestedLimit, placementConfig.maxItems, 3));

  const supabase = await createClient();
  let currentPlan = input.currentPlan ?? "free";

  if (!input.userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      input = { ...input, userId: user.id };
      const billing = await getUserBillingState(supabase, user.id);
      currentPlan = billing.plan;
    }
  }

  const hasUser = Boolean(input.userId);
  const signals: RecSignalContext = hasUser
    ? await getSignals(input.userId as string, input)
    : {
        role: null,
        valuationCount: 0,
        saleReadinessCount: 0,
        latestSaleReadinessScore: null,
        customerConcentrationCount: 0,
        latestCustomerRiskLevel: null,
        savedListingCount: 0,
        publishedListingCount: 0,
        featuredActiveCount: 0,
        activeDealRoomCount: 0,
        hasDealRoomForContext: false,
        dealRoomStage: null,
        dealRoomStatus: null,
        dealRoomHasExpiration: false,
        hasPaidPurchaseByProduct: new Map(),
        hasRefundByProduct: new Set(),
        hasPendingPurchaseByProduct: new Set(),
        activePromotionListingIds: new Set(),
      };

  const scored: RecommendationCandidate[] = [];

  for (const candidate of placementConfig.candidates) {
    const product = getProduct(candidate.productKey);
    if (!product || !product.isPublic || product.category === "legacy") continue;

    let score = candidate.baseScore + scoreAdjustment(candidate.productKey, input.placement, signals);

    if (product.status !== "active") score -= 8;
    if (product.audience.includes("buyer") && signals.role === "seller") score -= 20;
    if (product.audience.includes("seller") && signals.role === "buyer") score -= 20;

    if (score > 0) {
      scored.push({
        productKey: candidate.productKey,
        score,
        reasonKey: candidate.reasonKey,
        targetId: targetIdFromContext(product, input) ?? undefined,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.productKey.localeCompare(b.productKey);
  });

  const seen = new Set<string>();
  const localePrefixValue = localePrefix(input.locale);
  const output: ContextualRecommendation[] = [];

  for (const candidate of scored) {
    if (output.length >= limit) break;
    if (seen.has(candidate.productKey)) continue;

    const product = getProduct(candidate.productKey);
    if (!product) continue;

    const safe = toPublicSolution(product, input.locale);
    const targetId = candidate.targetId ?? null;
    const targetOptions = input.userId
      ? await loadTargetOptions(product.requiredTargetType, input.userId, input.locale)
      : [];

    const cta = resolveCtaState(product, currentPlan, targetId, targetOptions, signals);

    output.push({
      productKey: product.key,
      slug: product.slug,
      name: safe.name,
      description: safe.description,
      outcome: safe.outcome,
      displayPrice: safe.displayPrice,
      billingModel: safe.billingModel,
      billingContext: safe.billingContext,
      status: safe.status,
      reasonKey: candidate.reasonKey,
      ctaState: cta.state,
      ctaHref: cta.href ? `${localePrefixValue}${cta.href}` : null,
      detailRoute: `${localePrefixValue}${safe.detailRoute}`,
      includedInPlan: cta.includedInPlan,
      targetRequired: product.requiredTargetType !== "none",
      targetType: product.requiredTargetType,
      targetId,
      targetOptions,
      dismissible: placementConfig.dismissible,
      analytics: {
        placement: input.placement,
        product_key: product.key,
        status: safe.status,
        billing_model: safe.billingModel,
        price_band: getPriceBand(safe.displayPrice),
        recommendation_reason_key: candidate.reasonKey,
      },
    });

    seen.add(candidate.productKey);
  }

  return output;
}
