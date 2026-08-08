import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProduct,
  getPurchasableProduct,
  getStripePriceId,
  isProductConfigured,
  type ProductDefinition,
} from "@/lib/commerce/products";
import { canPurchaseBusinessConfiguration } from "@/lib/business-access";
import {
  getBusinessInABoxTemplate,
  type BusinessInABoxTemplateDefinition,
} from "@/lib/commerce/business-in-a-box-templates";
import { getSiteUrl } from "@/lib/config";
import { getUserBillingState, isObsoleteStripeCustomer } from "@/lib/billing";
import Stripe from "stripe";

const SUPPORTED_LOCALES = ["en", "es"] as const;
const DEFAULT_LOCALE = "en";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getLocalePrefix(locale: string): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

type TargetValidationResult =
  | {
      ok: true;
      targetType: string;
      targetId: string | null;
      targetSnapshot: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      error: string;
      route?: string;
    };

type DuplicateGuardResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      route?: string;
    };

type TemplateValidationResult =
  | {
      ok: true;
      template: BusinessInABoxTemplateDefinition | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function validateTemplateSelection(
  product: ProductDefinition,
  templateKey: string,
): TemplateValidationResult {
  if (product.key !== "business_in_a_box") {
    return { ok: true, template: null };
  }

  if (!templateKey) {
    return {
      ok: false,
      status: 400,
      error: "templateKey is required for this product",
    };
  }

  if (!/^[a-z0-9_]+$/.test(templateKey)) {
    return {
      ok: false,
      status: 400,
      error: "templateKey format is invalid",
    };
  }

  const template = getBusinessInABoxTemplate(templateKey);
  if (!template) {
    return {
      ok: false,
      status: 400,
      error: "templateKey is not supported",
    };
  }

  if (!template.active) {
    return {
      ok: false,
      status: 409,
      error: "templateKey is currently unavailable",
    };
  }

  return {
    ok: true,
    template,
  };
}

async function validateTargetEligibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  product: ProductDefinition,
  targetId: string | null,
): Promise<TargetValidationResult> {
  if (product.requiredTargetType === "none") {
    return {
      ok: true,
      targetType: "none",
      targetId: null,
      targetSnapshot: {
        productKey: product.key,
        targetType: "none",
      },
    };
  }

  if (!targetId || !UUID_REGEX.test(targetId)) {
    return {
      ok: false,
      status: 400,
      error: "A valid targetId is required for this product",
    };
  }

  if (product.requiredTargetType === "listing") {
    const { data: listing, error: listingError } = await supabase
      .from("business_listings")
      .select(
        "id, user_id, status, is_public, is_confidential, teaser_title, business_name, featured_until",
      )
      .eq("id", targetId)
      .maybeSingle();

    if (listingError) {
      console.error(
        "Commerce checkout — listing lookup failed:",
        listingError.message,
      );

      return {
        ok: false,
        status: 500,
        error: "Unable to verify this listing. Please try again.",
      };
    }

    if (!listing) {
      return {
        ok: false,
        status: 404,
        error: "Target listing not found",
      };
    }

    if (listing.user_id !== userId) {
      return {
        ok: false,
        status: 403,
        error: "You do not own this listing",
      };
    }

    if (listing.status !== "published" || !listing.is_public) {
      return {
        ok: false,
        status: 422,
        error: "Listing must be public and published for this product",
      };
    }

    if (product.key === "confidential_sale_launch" && listing.is_confidential) {
      return {
        ok: false,
        status: 409,
        error: "This listing already has confidential launch state.",
        route: `/sell/${listing.id}/edit`,
      };
    }

    if (product.key === "confidential_sale_launch") {
      const teaser = String(listing.teaser_title ?? "").trim();

      if (!teaser) {
        return {
          ok: false,
          status: 422,
          error:
            "Complete this listing with a public teaser title before checkout",
          route: `/sell/${listing.id}/edit`,
        };
      }
    }

    if (product.fulfillmentBehavior === "apply_listing_promotion") {
      const featuredUntil = listing.featured_until
        ? new Date(listing.featured_until as string)
        : null;

      if (featuredUntil && featuredUntil > new Date()) {
        return {
          ok: false,
          status: 409,
          error: "This listing already has an active promotion",
        };
      }
    }

    return {
      ok: true,
      targetType: "listing",
      targetId: listing.id,
      targetSnapshot: {
        productKey: product.key,
        targetType: "listing",
        listingId: listing.id,
        displayName:
          listing.is_confidential && listing.teaser_title
            ? listing.teaser_title
            : listing.business_name,
        listingStatus: listing.status,
        validatedOwner: true,
      },
    };
  }
  if (product.requiredTargetType === "business") {
    const { data: business } = await supabase
      .from("businesses")
      .select("id, owner_id, deleted_at, name, profile_completion")
      .eq("id", targetId)
      .maybeSingle();

    if (!business || business.deleted_at !== null) {
      return { ok: false, status: 404, error: "Target business not found" };
    }

    const canPurchase = await canPurchaseBusinessConfiguration(
      userId,
      business.id,
    );
    if (!canPurchase) {
      return {
        ok: false,
        status: 403,
        error: "You do not have access to this business",
      };
    }

    return {
      ok: true,
      targetType: "business",
      targetId: business.id,
      targetSnapshot: {
        productKey: product.key,
        targetType: "business",
        businessId: business.id,
        displayName: business.name,
        accessRole: business.owner_id === userId ? "owner" : "manager",
        profileCompletion: business.profile_completion,
      },
    };
  }

  if (
    product.requiredTargetType === "transaction" &&
    product.key === "deal_room_90"
  ) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, status")
      .eq("id", targetId)
      .maybeSingle();

    if (!conversation) {
      return { ok: false, status: 404, error: "Target conversation not found" };
    }

    if (conversation.seller_id !== userId) {
      return {
        ok: false,
        status: 403,
        error:
          "Only the seller can purchase Deal Room 90 for this conversation",
      };
    }

    if (
      !["active", "qualified", "nda_requested"].includes(conversation.status)
    ) {
      return {
        ok: false,
        status: 422,
        error: "Conversation is not eligible for Deal Room creation",
      };
    }

    const { data: existingDealRoom } = await supabase
      .from("deal_rooms")
      .select("id")
      .eq("conversation_id", conversation.id)
      .maybeSingle();

    if (existingDealRoom) {
      return {
        ok: false,
        status: 409,
        error: "A Deal Room already exists for this conversation",
        route: `/deals/${existingDealRoom.id}`,
      };
    }

    return {
      ok: true,
      targetType: "transaction",
      targetId: conversation.id,
      targetSnapshot: {
        productKey: product.key,
        targetType: "transaction",
        conversationId: conversation.id,
        listingId: conversation.listing_id,
        validatedSeller: true,
        conversationStatus: conversation.status,
      },
    };
  }

  return {
    ok: false,
    status: 422,
    error: "Target validation is not available for this product",
  };
}

async function guardAgainstDuplicatePurchase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  product: ProductDefinition,
  targetType: string,
  targetId: string | null,
  selectedTemplate: BusinessInABoxTemplateDefinition | null,
): Promise<DuplicateGuardResult> {
  if (!targetId || targetType === "none") {
    return { ok: true };
  }

  // Listing promotions are temporary and can be purchased again after
  // the previous promotion expires. Active promotion eligibility is
  // validated separately using business_listings.featured_until.
  if (product.fulfillmentBehavior === "apply_listing_promotion") {
    const { data: pendingPromotionPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .in("product_key", ["quick_boost", "featured_listing"])
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .in("payment_status", ["pending", "paid"])
      .eq("fulfillment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingPromotionPurchase) {
      return {
        ok: false,
        status: 409,
        error: "A purchase for this promotion is already pending",
        route: "/account/products",
      };
    }

    return { ok: true };
  }
  
  const { data: openPurchase } = await supabase
    .from("purchases")
    .select(
      "id, payment_status, fulfillment_status, fulfilled_resource_type, fulfilled_resource_id, template_key",
    )
    .eq("user_id", userId)
    .eq("product_key", product.key)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("payment_status", ["pending", "paid"])
    .in("fulfillment_status", ["pending", "fulfilled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openPurchase) {
    if (
      product.key === "business_in_a_box" &&
      selectedTemplate &&
      openPurchase.template_key !== selectedTemplate.key
    ) {
      // Different template keys can proceed for now; precise template collisions
      // are guarded below for Business-in-a-Box.
    } else {
      const existingRoute =
        openPurchase.fulfilled_resource_type === "deal_room" &&
        openPurchase.fulfilled_resource_id
          ? `/deals/${openPurchase.fulfilled_resource_id}`
          : openPurchase.fulfilled_resource_type === "valuation_report"
            ? `/account/products/${openPurchase.id}/report`
            : openPurchase.fulfilled_resource_type === "listing"
              ? `/sell/${openPurchase.fulfilled_resource_id}/edit`
              : `/account/products`;
      return {
        ok: false,
        status: 409,
        error: "A purchase for this target is already pending or active",
        route: existingRoute,
      };
    }
  }

  const { data: activeGrant } = await supabase
    .from("entitlement_grants")
    .select("id")
    .eq("user_id", userId)
    .eq("product_key", product.key)
    .eq("status", "active")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (activeGrant) {
    return {
      ok: false,
      status: 409,
      error: "You already have active access for this target",
      route: `/account/products`,
    };
  }

  if (product.key === "business_in_a_box" && selectedTemplate) {
    const { data: existingSetup } = await supabase
      .from("business_in_a_box_setups")
      .select("id, status")
      .eq("business_id", targetId)
      .eq("template_key", selectedTemplate.key)
      .in("status", ["pending", "processing", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSetup) {
      return {
        ok: false,
        status: 409,
        error:
          "A Business-in-a-Box setup already exists for this business and template",
        route: "/account/products",
      };
    }

    const { data: existingTemplatePurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("product_key", "business_in_a_box")
      .eq("target_type", "business")
      .eq("target_id", targetId)
      .eq("template_key", selectedTemplate.key)
      .in("payment_status", ["pending", "paid"])
      .in("fulfillment_status", ["pending", "fulfilled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTemplatePurchase) {
      return {
        ok: false,
        status: 409,
        error:
          "A pending or completed purchase already exists for this business and template",
        route: "/account/products",
      };
    }

    const { data: existingTemplateGrant } = await supabase
      .from("entitlement_grants")
      .select("id")
      .eq("product_key", "business_in_a_box")
      .eq("target_type", "business")
      .eq("target_id", targetId)
      .eq("template_key", selectedTemplate.key)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existingTemplateGrant) {
      return {
        ok: false,
        status: 409,
        error:
          "An active entitlement already exists for this business and template",
        route: "/account/products",
      };
    }
  }

  if (product.key === "deal_room_90") {
    const { data: existingRoom } = await supabase
      .from("deal_rooms")
      .select("id")
      .eq("conversation_id", targetId)
      .maybeSingle();

    if (existingRoom) {
      return {
        ok: false,
        status: 409,
        error: "A Deal Room already exists for this conversation",
        route: `/deals/${existingRoom.id}`,
      };
    }
  }

  if (product.key === "enhanced_valuation_report") {
    const { data: existingDelivery } = await supabase
      .from("paid_valuation_report_deliveries")
      .select("id")
      .eq("user_id", userId)
      .eq("business_id", targetId)
      .in("status", ["pending", "processing", "input_required", "ready"])
      .maybeSingle();

    if (existingDelivery) {
      return {
        ok: false,
        status: 409,
        error:
          "You already have a valuation delivery in progress for this business",
        route: `/account/products`,
      };
    }
  }

  if (product.key === "confidential_sale_launch") {
    const { data: launch } = await supabase
      .from("confidential_sale_launches")
      .select("id")
      .eq("user_id", userId)
      .eq("listing_id", targetId)
      .eq("status", "active")
      .maybeSingle();

    if (launch) {
      return {
        ok: false,
        status: 409,
        error: "A confidential launch is already active for this listing",
        route: `/sell/${targetId}/edit`,
      };
    }
  }

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 },
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-06-24.dahlia",
    });

    const supabase = await createClient();

    // 1. Require authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", redirectTo: "/login" },
        { status: 401 },
      );
    }

    // 2. Parse body. The client may provide productKey, locale, targetId, and templateKey only.
    //    All sensitive billing and fulfillment inputs stay server-controlled
    //    (price ID, amount, currency, user ID, fulfillment behavior, and redirect URLs).
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const productKey =
      body && typeof body === "object" && "productKey" in body
        ? String((body as Record<string, unknown>).productKey ?? "").trim()
        : "";
    const requestedLocale =
      body && typeof body === "object" && "locale" in body
        ? String((body as Record<string, unknown>).locale ?? "")
            .trim()
            .toLowerCase()
        : "";
    const locale = SUPPORTED_LOCALES.includes(requestedLocale as "en" | "es")
      ? requestedLocale
      : DEFAULT_LOCALE;
    const localePrefix = getLocalePrefix(locale);
    const targetId =
      body && typeof body === "object" && "targetId" in body
        ? String((body as Record<string, unknown>).targetId ?? "").trim()
        : "";
    const selectedTemplateKey =
      body && typeof body === "object" && "templateKey" in body
        ? String((body as Record<string, unknown>).templateKey ?? "")
            .trim()
            .toLowerCase()
        : "";

    if (!productKey) {
      return NextResponse.json(
        { error: "productKey is required" },
        { status: 400 },
      );
    }

    // 3. Resolve product — rejects unknown, planned, and unavailable keys
    const requestedProduct = getProduct(productKey);
    if (
      requestedProduct &&
      requestedProduct.status === "active" &&
      requestedProduct.ctaBehavior === "open" &&
      requestedProduct.accessRoute
    ) {
      return NextResponse.json(
        {
          error: "This solution is included with your account. Open it directly.",
          route: `${localePrefix}${requestedProduct.accessRoute}`,
        },
        { status: 409 },
      );
    }

    const product = getPurchasableProduct(productKey);
    if (!product) {
      return NextResponse.json(
        { error: "Invalid or unavailable product" },
        { status: 400 },
      );
    }

    if (!isProductConfigured(product)) {
      return NextResponse.json(
        { error: "Product is not configured" },
        { status: 500 },
      );
    }

    const targetCheck = await validateTargetEligibility(
      supabase,
      user.id,
      product,
      targetId || null,
    );
    if (!targetCheck.ok) {
      return NextResponse.json(
        { error: targetCheck.error, route: targetCheck.route },
        { status: targetCheck.status },
      );
    }

    const templateCheck = validateTemplateSelection(
      product,
      selectedTemplateKey,
    );
    if (!templateCheck.ok) {
      return NextResponse.json(
        { error: templateCheck.error },
        { status: templateCheck.status },
      );
    }

    const billing = await getUserBillingState(supabase, user.id);

    if (product.key === "deal_room_90" && billing.entitlements.dealRooms) {
      const { count: activeRoomCount } = await supabase
        .from("deal_rooms")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "active");

      if ((activeRoomCount ?? 0) < billing.entitlements.activeDealRoomLimit) {
        return NextResponse.json(
          {
            error:
              "Included in your Pro plan. Use your included Deal Room capacity.",
            route: `${localePrefix}/deals`,
          },
          { status: 409 },
        );
      }
    }

    const duplicateGuard = await guardAgainstDuplicatePurchase(
      supabase,
      user.id,
      product,
      targetCheck.targetType,
      targetCheck.targetId,
      templateCheck.template,
    );

    if (!duplicateGuard.ok) {
      return NextResponse.json(
        { error: duplicateGuard.error, route: duplicateGuard.route },
        { status: duplicateGuard.status },
      );
    }

    // 4. Resolve Stripe Price ID server-side from environment variables only
    let priceId: string;
    try {
      priceId = getStripePriceId(product);
    } catch (err) {
      console.error("Commerce checkout — price config error:", err);
      return NextResponse.json(
        { error: "Product is not configured" },
        { status: 500 },
      );
    }

    // 5. Build site URL for redirects
    let siteUrl: string;
    try {
      siteUrl = getSiteUrl();
    } catch (err) {
      console.error("Commerce checkout — site URL config error:", err);
      return NextResponse.json(
        { error: "Application URL is not configured" },
        { status: 500 },
      );
    }

    // 6. Resolve or create a Stripe customer (reuse profile's customer ID when present)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let stripeCustomerId = profile?.stripe_customer_id ?? null;
    let obsoleteStripeCustomerId: string | null = null;

    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (isObsoleteStripeCustomer(customer)) {
          obsoleteStripeCustomerId = stripeCustomerId;
          stripeCustomerId = null;
        }
      } catch (error: unknown) {
        if (!isObsoleteStripeCustomer(error)) {
          throw error;
        }
        obsoleteStripeCustomerId = stripeCustomerId;
        stripeCustomerId = null;
      }
    }

    if (!stripeCustomerId) {
      if (obsoleteStripeCustomerId) {
        const { data: clearedProfiles, error: clearProfileError } =
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: null })
            .eq("id", user.id)
            .eq("stripe_customer_id", obsoleteStripeCustomerId)
            .select("stripe_customer_id");

        if (clearProfileError) {
          return NextResponse.json(
            { error: "Unable to update billing profile. Please try again." },
            { status: 500 },
          );
        }

        if ((clearedProfiles?.length ?? 0) === 0) {
          const { data: latestProfile, error: latestProfileError } =
            await supabase
              .from("profiles")
              .select("stripe_customer_id")
              .eq("id", user.id)
              .maybeSingle();

          if (latestProfileError) {
            return NextResponse.json(
              { error: "Unable to update billing profile. Please try again." },
              { status: 500 },
            );
          }

          const latestId = latestProfile?.stripe_customer_id ?? null;
          if (latestId && latestId !== obsoleteStripeCustomerId) {
            stripeCustomerId = latestId;
          } else {
            return NextResponse.json(
              { error: "Your billing profile changed. Please try again." },
              { status: 409 },
            );
          }
        }
      }

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: user.id, stripe_customer_id: stripeCustomerId });

        if (profileError) {
          return NextResponse.json(
            { error: "Unable to update billing profile. Please try again." },
            { status: 500 },
          );
        }
      }
    }

    const checkoutTargetSnapshot = {
      ...targetCheck.targetSnapshot,
      templateKey: templateCheck.template?.key ?? null,
      templateVersion: templateCheck.template?.version ?? null,
    };
    const serializedTargetSnapshot = JSON.stringify(
      checkoutTargetSnapshot,
    ).slice(0, 490);

    // 7. Create Stripe Checkout Session (mode: payment — one-time purchase)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      success_url: `${siteUrl}${localePrefix}/account/products?success=purchased`,
      cancel_url: `${siteUrl}${localePrefix}${product.cancelPath}`,
      metadata: {
        purchaseType: "one_time_product",
        userId: user.id,
        productKey: product.key,
        targetType: targetCheck.targetType,
        targetId: targetCheck.targetId || "",
        templateKey: templateCheck.template?.key ?? "",
        templateVersion: templateCheck.template?.version ?? "",
        targetSnapshot: serializedTargetSnapshot,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Commerce checkout error:", message);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 },
    );
  }
}
