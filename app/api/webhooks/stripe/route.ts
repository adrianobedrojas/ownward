import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getFeaturedListingConfig } from "@/lib/billing";
import { getProduct } from "@/lib/commerce/products";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-06-24.dahlia",
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  // Use service role client to securely write subscription/promotion states bypassing RLS
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown signature verification error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("event_id, processed_at")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent?.processed_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const { error: eventInsertError } = await supabaseAdmin
      .from("stripe_events")
      .upsert(
        {
          event_id: event.id,
          type: event.type,
          stripe_created: event.created,
          payload: JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
          processing_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );

    if (eventInsertError) {
      throw eventInsertError;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;

        // ── Featured-listing one-time payment ──────────────────────────────
        if (session.metadata?.purchaseType === "featured_listing") {
          await handleFeaturedListingCheckout(session, supabaseAdmin);
          break;
        }

        // ── One-time product purchase ───────────────────────────────────────
        if (session.metadata?.purchaseType === "one_time_product") {
          await handleOneTimeProductCheckout(session, supabaseAdmin);
          break;
        }

        // ── Subscription checkout (Starter / Builder / Pro) ────────────────
        const subscriptionId = session.subscription as string;
        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const canceledAt = subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null;

          const currentPeriodEnd = subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null;

          const { error: upsertError } = await supabaseAdmin
            .from("subscriptions")
            .upsert({
              id: subscription.id,
              user_id: userId,
              stripe_customer_id:
                typeof subscription.customer === "string"
                  ? subscription.customer
                  : subscription.customer?.id ?? null,
              status: subscription.status,
              price_id: subscription.items.data[0].price.id,
              quantity: subscription.items.data[0].quantity ?? 1,
              cancel_at_period_end: subscription.cancel_at_period_end,
              canceled_at: canceledAt,
              current_period_end: currentPeriodEnd,
              last_stripe_event_created: event.created,
              updated_at: new Date().toISOString(),
            });

          if (upsertError) {
            throw upsertError;
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: existingSubscription } = await supabaseAdmin
          .from("subscriptions")
          .select("id, last_stripe_event_created")
          .eq("id", subscription.id)
          .maybeSingle();

        if (
          existingSubscription &&
          Number(existingSubscription.last_stripe_event_created ?? 0) > event.created
        ) {
          break;
        }

        const canceledAt = subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null;

        const currentPeriodEndUpd = subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null;

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            stripe_customer_id:
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id ?? null,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity ?? 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: canceledAt,
            current_period_end: currentPeriodEndUpd,
            last_stripe_event_created: event.created,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        if (updateError) {
          throw updateError;
        }
        break;
      }

      // ── Refund: downgrade featured promotion if payment is reversed ──────
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null;

        if (paymentIntentId) {
          const handled = await handleOneTimePurchaseRefund(
            paymentIntentId,
            charge,
            supabaseAdmin
          );

          if (!handled) {
            await handleFeaturedListingRefund(paymentIntentId, supabaseAdmin);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    await supabaseAdmin
      .from("stripe_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown webhook error";
    console.error("Webhook handler error:", message);
    if (event?.id) {
      await supabaseAdmin
        .from("stripe_events")
        .update({
          processing_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", event.id);
    }
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: activate a featured-listing promotion
// Idempotent — repeated delivery of the same event is safe.
// ─────────────────────────────────────────────────────────────────────────────
async function handleFeaturedListingCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    throw new Error(
      `[featured_listing] Session ${session.id} is not a paid one-time checkout.`
    );
  }

  const userId = session.metadata?.userId;
  const listingId = session.metadata?.listingId;

  if (!userId || !listingId) {
    throw new Error(
      `[featured_listing] Missing metadata on session ${session.id}`
    );
  }

  await activateFeaturedListingPromotion(
    session,
    supabaseAdmin,
    userId,
    listingId
  );
}

async function activateFeaturedListingPromotion(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient,
  userId: string,
  listingId: string
): Promise<void> {

  // Idempotency: if a promotion for this checkout session already exists and
  // is active, skip re-processing.
  const { data: existing } = await supabaseAdmin
    .from("listing_promotions")
    .select("id, status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing?.status === "active") {
    return;
  }

  // Verify listing still belongs to the supplied user and is public+published
  const { data: listing, error: listingError } = await supabaseAdmin
    .from("business_listings")
    .select("id, user_id, status, is_public")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    throw new Error(
      `[featured_listing] Listing ${listingId} not found for session ${session.id}`
    );
  }

  if (listing.user_id !== userId) {
    throw new Error(
      `[featured_listing] Listing ${listingId} does not belong to user ${userId}`
    );
  }

  if (listing.status !== "published" || !listing.is_public) {
    throw new Error(
      `[featured_listing] Listing ${listingId} is no longer public/published; skipping promotion`
    );
  }

  // Calculate promotion window
  let durationDays = 30;
  try {
    ({ durationDays } = getFeaturedListingConfig());
  } catch {
    console.warn(
      "[featured_listing] Could not read FEATURED_LISTING_DURATION_DAYS; defaulting to 30"
    );
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + durationDays);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Retrieve the Stripe Price ID from the line items (most reliable source)
  let stripePriceId = "";
  try {
    const config = getFeaturedListingConfig();
    stripePriceId = config.priceId;
  } catch {
    stripePriceId = "";
  }

  // Upsert promotion record (unique on stripe_checkout_session_id)
  const { error: promotionError } = await supabaseAdmin
    .from("listing_promotions")
    .upsert(
      {
        listing_id: listingId,
        user_id: userId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_price_id: stripePriceId,
        status: "active",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" }
    );

  if (promotionError) {
    throw new Error(
      `[featured_listing] Failed to upsert promotion for session ${session.id}:`,
      { cause: promotionError }
    );
  }

  // Update the listing's featured window
  const { error: listingUpdateError } = await supabaseAdmin
    .from("business_listings")
    .update({
      featured_started_at: startsAt.toISOString(),
      featured_until: endsAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (listingUpdateError) {
    throw new Error(
      `[featured_listing] Failed to update listing ${listingId}:`,
      { cause: listingUpdateError }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: handle a refund — remove promotional placement
// ─────────────────────────────────────────────────────────────────────────────
async function handleFeaturedListingRefund(
  paymentIntentId: string,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  const { data: promotion, error } = await supabaseAdmin
    .from("listing_promotions")
    .select("id, listing_id, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error || !promotion) {
    return;
  }

  if (promotion.status === "refunded") {
    return; // already processed
  }

  const { error: promotionUpdateError } = await supabaseAdmin
    .from("listing_promotions")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", promotion.id);

  if (promotionUpdateError) {
    console.error(
      `[featured_listing] Failed to mark promotion ${promotion.id} as refunded:`,
      promotionUpdateError.message
    );
    return;
  }

  // Clear the featured window on the listing
  await supabaseAdmin
    .from("business_listings")
    .update({
      featured_started_at: null,
      featured_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", promotion.listing_id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: fulfill a one-time product purchase
// Idempotent — repeated delivery of the same event is safe.
// Uniqueness is enforced by:
//   purchases            UNIQUE (stripe_checkout_session_id)
//   entitlement_grants   UNIQUE (purchase_id, product_key)
//   workspaces           UNIQUE (purchase_id)
// ─────────────────────────────────────────────────────────────────────────────
async function handleOneTimeProductCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    throw new Error(
      `[one_time_product] Session ${session.id} is not a completed payment checkout.`
    );
  }

  const userId = session.metadata?.userId || session.client_reference_id;
  const productKey = session.metadata?.productKey;

  if (!userId || !productKey) {
    throw new Error(
      `[one_time_product] Missing metadata on session ${session.id}`
    );
  }

  // Validate the product key exists in the registry
  const product = getProduct(productKey);
  if (!product || product.purchaseType !== "one_time") {
    throw new Error(
      `[one_time_product] Unsupported product key "${productKey}" on session ${session.id}`
    );
  }

  // Idempotency check: if a paid purchase already exists for this session, skip
  const { data: existing } = await supabaseAdmin
    .from("purchases")
    .select("id, payment_status, fulfillment_status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing?.payment_status === "paid" && existing?.fulfillment_status === "fulfilled") {
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const now = new Date().toISOString();
  const targetType = String(session.metadata?.targetType ?? "").trim() || null;
  const targetIdRaw = String(session.metadata?.targetId ?? "").trim();
  const targetId = UUID_REGEX.test(targetIdRaw) ? targetIdRaw : null;

  let targetSnapshot: Record<string, unknown> | null = null;
  const rawSnapshot = String(session.metadata?.targetSnapshot ?? "").trim();
  if (rawSnapshot) {
    try {
      const parsed = JSON.parse(rawSnapshot) as Record<string, unknown>;
      targetSnapshot = parsed;
    } catch {
      targetSnapshot = null;
    }
  }

  // Upsert purchase record (UNIQUE on stripe_checkout_session_id)
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .upsert(
      {
        user_id: userId,
        product_key: productKey,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: stripeCustomerId,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: "paid",
        fulfillment_status: "pending",
        target_type: targetType,
        target_id: targetId,
        target_snapshot: targetSnapshot,
        updated_at: now,
      },
      { onConflict: "stripe_checkout_session_id" }
    )
    .select("id, user_id, target_type, target_id, target_snapshot")
    .single();

  if (purchaseError || !purchase) {
    throw new Error(
      `[one_time_product] Failed to upsert purchase for session ${session.id}: ${purchaseError?.message}`
    );
  }

  // Upsert purchase item (one item per checkout in Phase 1)
  const { error: itemError } = await supabaseAdmin
    .from("purchase_items")
    .upsert(
      {
        purchase_id: purchase.id,
        product_key: productKey,
        stripe_price_id: null,
        quantity: 1,
        unit_amount: session.amount_total,
        currency: session.currency,
        updated_at: now,
      },
      { onConflict: "purchase_id,product_key" }
    );

  if (itemError) {
    throw new Error(
      `[one_time_product] Failed to upsert purchase item for purchase ${purchase.id}: ${itemError.message}`
    );
  }

  try {
    const resolvedTarget = await revalidateStoredPurchaseTarget(
      session,
      purchase,
      product,
      userId,
      supabaseAdmin
    );

    const fulfillment = await fulfillProductResource({
      session,
      purchaseId: purchase.id,
      userId,
      now,
      product,
      targetId: resolvedTarget.targetId,
      supabaseAdmin,
    });

    // Entitlement is granted only after successful product-specific fulfillment.
    const { data: grant, error: grantError } = await supabaseAdmin
      .from("entitlement_grants")
      .upsert(
        {
          purchase_id: purchase.id,
          user_id: userId,
          product_key: product.key,
          entitlement_type: product.entitlementType,
          status: "active",
          granted_at: now,
          expires_at: fulfillment.entitlementExpiresAt,
          target_type: resolvedTarget.targetType,
          target_id: resolvedTarget.targetId,
          resource_type: fulfillment.fulfilledResourceType,
          resource_id: fulfillment.fulfilledResourceId,
          revoked_at: null,
          revoke_reason: null,
          updated_at: now,
        },
        { onConflict: "purchase_id,product_key" }
      )
      .select("id")
      .single();

    if (grantError || !grant) {
      throw new Error(
        `[one_time_product] Failed to upsert entitlement grant for purchase ${purchase.id}: ${grantError?.message}`
      );
    }

    if (product.key === "deal_room_90") {
      await supabaseAdmin
        .from("deal_room_paid_access")
        .update({ entitlement_grant_id: grant.id, updated_at: now })
        .eq("purchase_id", purchase.id);
    }

    // Mark purchase as fulfilled only after fulfillment + entitlement succeed.
    const { error: fulfillError } = await supabaseAdmin
      .from("purchases")
      .update({
        fulfillment_status: "fulfilled",
        target_type: resolvedTarget.targetType,
        target_id: resolvedTarget.targetId,
        target_snapshot: resolvedTarget.targetSnapshot,
        fulfilled_resource_type: fulfillment.fulfilledResourceType,
        fulfilled_resource_id: fulfillment.fulfilledResourceId,
        failure_code: null,
        failure_message_safe: null,
        updated_at: now,
      })
      .eq("id", purchase.id);

    if (fulfillError) {
      throw new Error(
        `[one_time_product] Failed to mark purchase ${purchase.id} as fulfilled: ${fulfillError.message}`
      );
    }
  } catch (err: unknown) {
    const safeMessage = err instanceof Error ? err.message : "Fulfillment failed";
    console.error("[one_time_product] Fulfillment error", {
      sessionId: session.id,
      purchaseId: purchase.id,
      productKey: product.key,
      message: safeMessage,
    });

    await supabaseAdmin
      .from("entitlement_grants")
      .update({
        status: "revoked",
        revoked_at: now,
        revoke_reason: "fulfillment_failed",
        updated_at: now,
      })
      .eq("purchase_id", purchase.id)
      .eq("product_key", product.key)
      .eq("status", "active");

    await supabaseAdmin
      .from("purchases")
      .update({
        fulfillment_status: "failed",
        failure_code: "fulfillment_failed",
        failure_message_safe: safeMessage.slice(0, 500),
        updated_at: now,
      })
      .eq("id", purchase.id)
      .neq("fulfillment_status", "refunded");

    throw err;
  }
}

type PurchaseTarget = {
  targetType: string;
  targetId: string | null;
  targetSnapshot: Record<string, unknown> | null;
};

async function revalidateStoredPurchaseTarget(
  session: Stripe.Checkout.Session,
  purchase: {
    id: string;
    user_id: string;
    target_type: string | null;
    target_id: string | null;
    target_snapshot: Record<string, unknown> | null;
  },
  product: NonNullable<ReturnType<typeof getProduct>>,
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<PurchaseTarget> {
  const fallbackTargetId = String(session.metadata?.targetId ?? "").trim();
  const targetId = purchase.target_id || (UUID_REGEX.test(fallbackTargetId) ? fallbackTargetId : null);

  if (product.requiredTargetType === "none") {
    return {
      targetType: "none",
      targetId: null,
      targetSnapshot: purchase.target_snapshot,
    };
  }

  if (!targetId) {
    throw new Error(`[one_time_product] Missing typed target for purchase ${purchase.id}`);
  }

  if (product.key === "enhanced_valuation_report") {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, deleted_at, name")
      .eq("id", targetId)
      .maybeSingle();

    if (!business || business.deleted_at !== null || business.owner_id !== userId) {
      throw new Error(`[one_time_product] Business target is invalid for purchase ${purchase.id}`);
    }

    return {
      targetType: "business",
      targetId,
      targetSnapshot: {
        productKey: product.key,
        targetType: "business",
        businessId: business.id,
        displayName: business.name,
        validatedOwner: true,
      },
    };
  }

  if (product.key === "deal_room_90") {
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, status")
      .eq("id", targetId)
      .maybeSingle();

    if (!conversation || conversation.seller_id !== userId) {
      throw new Error(`[one_time_product] Conversation target is invalid for purchase ${purchase.id}`);
    }

    return {
      targetType: "transaction",
      targetId,
      targetSnapshot: {
        productKey: product.key,
        targetType: "transaction",
        conversationId: conversation.id,
        listingId: conversation.listing_id,
        validatedSeller: true,
      },
    };
  }

  if (product.key === "confidential_sale_launch") {
    const { data: listing } = await supabaseAdmin
      .from("business_listings")
      .select("id, user_id, status, is_public, teaser_title")
      .eq("id", targetId)
      .maybeSingle();

    if (
      !listing ||
      listing.user_id !== userId ||
      listing.status !== "published" ||
      !listing.is_public ||
      !String(listing.teaser_title ?? "").trim()
    ) {
      throw new Error(`[one_time_product] Listing target is invalid for purchase ${purchase.id}`);
    }

    return {
      targetType: "listing",
      targetId,
      targetSnapshot: {
        productKey: product.key,
        targetType: "listing",
        listingId: listing.id,
        validatedOwner: true,
      },
    };
  }

  if (product.requiredTargetType === "listing") {
    const { data: listing } = await supabaseAdmin
      .from("business_listings")
      .select("id, user_id")
      .eq("id", targetId)
      .maybeSingle();

    if (!listing || listing.user_id !== userId) {
      throw new Error(`[one_time_product] Listing target is invalid for purchase ${purchase.id}`);
    }

    return {
      targetType: "listing",
      targetId,
      targetSnapshot: purchase.target_snapshot,
    };
  }

  if (product.requiredTargetType === "business") {
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, deleted_at")
      .eq("id", targetId)
      .maybeSingle();

    if (!business || business.deleted_at !== null || business.owner_id !== userId) {
      throw new Error(`[one_time_product] Business target is invalid for purchase ${purchase.id}`);
    }

    return {
      targetType: "business",
      targetId,
      targetSnapshot: purchase.target_snapshot,
    };
  }

  throw new Error(
    `[one_time_product] Target validation is unavailable for product ${product.key}`
  );
}

type FulfillmentOutcome = {
  fulfilledResourceType: string | null;
  fulfilledResourceId: string | null;
  entitlementExpiresAt: string | null;
};

async function fulfillProductResource(params: {
  session: Stripe.Checkout.Session;
  purchaseId: string;
  userId: string;
  now: string;
  product: NonNullable<ReturnType<typeof getProduct>>;
  targetId: string | null;
  supabaseAdmin: SupabaseClient;
}): Promise<FulfillmentOutcome> {
  const { session, purchaseId, userId, now, product, targetId, supabaseAdmin } = params;

  switch (product.fulfillmentBehavior) {
    case "create_value_action_sprint_workspace": {
      const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from("value_action_sprint_workspaces")
        .upsert(
          {
            user_id: userId,
            purchase_id: purchaseId,
            status: "not_started",
            updated_at: now,
          },
          { onConflict: "purchase_id" }
        )
        .select("id")
        .single();

      if (workspaceError || !workspace) {
        throw new Error(
          `[one_time_product] Failed to upsert workspace for purchase ${purchaseId}: ${workspaceError?.message}`
        );
      }

      return {
        fulfilledResourceType: "workspace",
        fulfilledResourceId: String(workspace.id),
        entitlementExpiresAt: null,
      };
    }

    case "grant_report_access": {
      return {
        fulfilledResourceType: null,
        fulfilledResourceId: null,
        entitlementExpiresAt: null,
      };
    }

    case "grant_enhanced_valuation_report": {
      if (!targetId) {
        throw new Error(`[one_time_product] Missing business target for purchase ${purchaseId}`);
      }

      const { data: existingEnhancedReport } = await supabaseAdmin
        .from("valuation_reports")
        .select("id")
        .eq("user_id", userId)
        .eq("business_id", targetId)
        .eq("status", "calculated")
        .eq("report_level", "enhanced")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const deliveryStatus = existingEnhancedReport ? "ready" : "input_required";
      const deliveryCompletedAt = existingEnhancedReport ? now : null;

      const { data: delivery, error: deliveryError } = await supabaseAdmin
        .from("paid_valuation_report_deliveries")
        .upsert(
          {
            purchase_id: purchaseId,
            user_id: userId,
            business_id: targetId,
            valuation_report_id: existingEnhancedReport?.id ?? null,
            product_key: product.key,
            status: deliveryStatus,
            started_at: now,
            completed_at: deliveryCompletedAt,
            updated_at: now,
          },
          { onConflict: "purchase_id" }
        )
        .select("id, valuation_report_id")
        .single();

      if (deliveryError || !delivery) {
        throw new Error(
          `[one_time_product] Failed to upsert valuation delivery for purchase ${purchaseId}: ${deliveryError?.message}`
        );
      }

      return {
        fulfilledResourceType: delivery.valuation_report_id ? "valuation_report" : "valuation_delivery",
        fulfilledResourceId: String(delivery.valuation_report_id ?? delivery.id),
        entitlementExpiresAt: null,
      };
    }

    case "apply_listing_promotion": {
      if (!targetId) {
        throw new Error(
          `[one_time_product] Missing listing target for product ${product.key} on session ${session.id}`
        );
      }

      await activateFeaturedListingPromotion(session, supabaseAdmin, userId, targetId);
      return {
        fulfilledResourceType: "listing",
        fulfilledResourceId: targetId,
        entitlementExpiresAt: null,
      };
    }

    case "create_timed_deal_room": {
      if (!targetId) {
        throw new Error(`[one_time_product] Missing conversation target for purchase ${purchaseId}`);
      }

      const { data: conversation } = await supabaseAdmin
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, status")
        .eq("id", targetId)
        .maybeSingle();

      if (!conversation || conversation.seller_id !== userId) {
        throw new Error(`[one_time_product] Invalid conversation target for purchase ${purchaseId}`);
      }

      if (!["active", "qualified", "nda_requested"].includes(conversation.status)) {
        throw new Error(`[one_time_product] Conversation is not eligible for deal room creation`);
      }

      const { data: listing } = await supabaseAdmin
        .from("business_listings")
        .select("id, business_name, teaser_title, is_confidential, user_id")
        .eq("id", conversation.listing_id)
        .maybeSingle();

      if (!listing || listing.user_id !== userId) {
        throw new Error(`[one_time_product] Listing validation failed for conversation ${targetId}`);
      }

      let dealRoomId: string;
      const { data: existingRoom } = await supabaseAdmin
        .from("deal_rooms")
        .select("id")
        .eq("conversation_id", targetId)
        .maybeSingle();

      if (existingRoom?.id) {
        dealRoomId = String(existingRoom.id);
      } else {
        const title =
          listing.is_confidential && listing.teaser_title
            ? `Deal Room - ${listing.teaser_title}`
            : `Deal Room - ${listing.business_name}`;

        const { data: createdRoom, error: roomCreateError } = await supabaseAdmin
          .from("deal_rooms")
          .insert({
            conversation_id: conversation.id,
            listing_id: conversation.listing_id,
            buyer_id: conversation.buyer_id,
            seller_id: userId,
            created_by: userId,
            title,
            stage: "information_review",
            status: "active",
          })
          .select("id")
          .maybeSingle();

        if (roomCreateError && roomCreateError.code !== "23505") {
          throw new Error(`[one_time_product] Could not create Deal Room: ${roomCreateError.message}`);
        }

        if (createdRoom?.id) {
          dealRoomId = String(createdRoom.id);
        } else {
          const { data: racedRoom } = await supabaseAdmin
            .from("deal_rooms")
            .select("id")
            .eq("conversation_id", targetId)
            .maybeSingle();

          if (!racedRoom?.id) {
            throw new Error(`[one_time_product] Deal Room creation race could not be resolved`);
          }
          dealRoomId = String(racedRoom.id);
        }
      }

      await supabaseAdmin
        .from("deal_room_members")
        .upsert(
          {
            deal_room_id: dealRoomId,
            user_id: userId,
            role: "seller",
            membership_status: "active",
            invited_by: userId,
            joined_at: now,
            updated_at: now,
          },
          { onConflict: "deal_room_id,user_id" }
        );

      await supabaseAdmin
        .from("deal_room_members")
        .upsert(
          {
            deal_room_id: dealRoomId,
            user_id: conversation.buyer_id,
            role: "buyer",
            membership_status: "accepted",
            invited_by: userId,
            invitation_accepted_at: now,
            updated_at: now,
          },
          { onConflict: "deal_room_id,user_id" }
        );

      await supabaseAdmin
        .from("deal_room_members")
        .update({ membership_status: "active", joined_at: now, updated_at: now })
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", conversation.buyer_id)
        .in("membership_status", ["accepted", "active"]);

      await supabaseAdmin
        .from("conversations")
        .update({ status: "deal_room", updated_at: now })
        .eq("id", conversation.id)
        .in("status", ["active", "qualified", "nda_requested", "deal_room"]);

      const { data: existingActivity } = await supabaseAdmin
        .from("deal_room_activity")
        .select("id")
        .eq("deal_room_id", dealRoomId)
        .eq("actor_id", userId)
        .eq("event_type", "deal_room_created")
        .contains("metadata", { purchase_id: purchaseId })
        .maybeSingle();

      if (!existingActivity) {
        await supabaseAdmin.from("deal_room_activity").insert({
          deal_room_id: dealRoomId,
          actor_id: userId,
          event_type: "deal_room_created",
          metadata: { purchase_id: purchaseId, source: "commerce" },
        });
      }

      const startsAt = new Date(now);
      const expiresAt = new Date(startsAt);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 90);
      const expiresAtIso = expiresAt.toISOString();

      const { error: accessError } = await supabaseAdmin
        .from("deal_room_paid_access")
        .upsert(
          {
            purchase_id: purchaseId,
            user_id: userId,
            conversation_id: conversation.id,
            deal_room_id: dealRoomId,
            product_key: product.key,
            access_starts_at: now,
            access_expires_at: expiresAtIso,
            access_status: "active",
            refunded_at: null,
            updated_at: now,
          },
          { onConflict: "purchase_id" }
        );

      if (accessError) {
        throw new Error(`[one_time_product] Failed to upsert paid access: ${accessError.message}`);
      }

      return {
        fulfilledResourceType: "deal_room",
        fulfilledResourceId: dealRoomId,
        entitlementExpiresAt: expiresAtIso,
      };
    }

    case "launch_confidential_sale_listing": {
      if (!targetId) {
        throw new Error(`[one_time_product] Missing listing target for purchase ${purchaseId}`);
      }

      const { data: listing } = await supabaseAdmin
        .from("business_listings")
        .select("id, user_id, status, is_public, is_confidential, teaser_title")
        .eq("id", targetId)
        .maybeSingle();

      if (!listing || listing.user_id !== userId) {
        throw new Error(`[one_time_product] Invalid listing target for purchase ${purchaseId}`);
      }

      if (listing.status !== "published" || !listing.is_public) {
        throw new Error(`[one_time_product] Listing must be published and public before launch`);
      }

      if (!String(listing.teaser_title ?? "").trim()) {
        throw new Error(`[one_time_product] Listing teaser title is required for confidential launch`);
      }

      const { error: launchError } = await supabaseAdmin
        .from("confidential_sale_launches")
        .upsert(
          {
            purchase_id: purchaseId,
            user_id: userId,
            listing_id: targetId,
            product_key: product.key,
            status: "active",
            launched_at: now,
            refunded_at: null,
            failure_code: null,
            failure_message_safe: null,
            updated_at: now,
          },
          { onConflict: "purchase_id" }
        );

      if (launchError) {
        throw new Error(
          `[one_time_product] Failed to upsert confidential launch record: ${launchError.message}`
        );
      }

      const { error: listingUpdateError } = await supabaseAdmin
        .from("business_listings")
        .update({ is_confidential: true, updated_at: now })
        .eq("id", targetId)
        .eq("user_id", userId);

      if (listingUpdateError) {
        throw new Error(
          `[one_time_product] Failed to enable confidential listing: ${listingUpdateError.message}`
        );
      }

      return {
        fulfilledResourceType: "listing",
        fulfilledResourceId: targetId,
        entitlementExpiresAt: null,
      };
    }

    case "grant_timed_deal_room":
    case "grant_credit_balance":
    case "manual_service":
    case "not_implemented": {
      throw new Error(
        `[one_time_product] Fulfillment behavior not available for ${product.key}: ${product.fulfillmentBehavior}`
      );
    }

    default: {
      const _exhaustive: never = product.fulfillmentBehavior;
      throw new Error(
        `[one_time_product] Unknown fulfillment behavior for ${product.key}: ${String(_exhaustive)}`
      );
    }
  }
}

async function handleOneTimePurchaseRefund(
  paymentIntentId: string,
  charge: Stripe.Charge,
  supabaseAdmin: SupabaseClient
): Promise<boolean> {
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .select("id, user_id, product_key, payment_status, fulfillment_status, target_id, target_type")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (purchaseError || !purchase) {
    return false;
  }

  const product = getProduct(String(purchase.product_key));
  if (!product || product.purchaseType !== "one_time") {
    return false;
  }

  const now = new Date().toISOString();
  const amountCaptured = typeof charge.amount === "number" ? charge.amount : null;
  const amountRefunded = typeof charge.amount_refunded === "number" ? charge.amount_refunded : null;
  const isPartialRefund =
    amountCaptured !== null && amountRefunded !== null && amountRefunded > 0 && amountRefunded < amountCaptured;

  // Partial refunds do not revoke one-time access automatically.
  if (isPartialRefund) {
    await supabaseAdmin
      .from("purchases")
      .update({
        failure_code: "partial_refund_manual_review",
        failure_message_safe: "Partial refund detected; manual review required.",
        updated_at: now,
      })
      .eq("id", purchase.id);
    return true;
  }

  if (
    purchase.payment_status === "refunded" &&
    purchase.fulfillment_status === "refunded"
  ) {
    return true;
  }

  await supabaseAdmin
    .from("entitlement_grants")
    .update({
      status: "revoked",
      revoked_at: now,
      revoke_reason: "payment_refunded",
      updated_at: now,
    })
    .eq("purchase_id", purchase.id)
    .eq("product_key", product.key)
    .eq("status", "active");

  if (product.key === "enhanced_valuation_report") {
    await reverseEnhancedValuationRefund(purchase.id, now, supabaseAdmin);
  } else if (product.key === "deal_room_90") {
    await reverseDealRoom90Refund(purchase.id, now, supabaseAdmin);
  } else if (product.key === "confidential_sale_launch") {
    await reverseConfidentialSaleLaunchRefund(purchase.id, now, supabaseAdmin);
  } else if (product.fulfillmentBehavior === "apply_listing_promotion") {
    await handleFeaturedListingRefund(paymentIntentId, supabaseAdmin);
  }

  const { error: updateError } = await supabaseAdmin
    .from("purchases")
    .update({
      payment_status: "refunded",
      fulfillment_status: "refunded",
      updated_at: now,
    })
    .eq("id", purchase.id);

  if (updateError) {
    throw new Error(
      `[one_time_product] Failed to mark purchase ${purchase.id} as refunded: ${updateError.message}`
    );
  }

  return true;
}

async function reverseEnhancedValuationRefund(
  purchaseId: string,
  now: string,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("paid_valuation_report_deliveries")
    .update({
      status: "refunded",
      refunded_at: now,
      updated_at: now,
    })
    .eq("purchase_id", purchaseId)
    .neq("status", "refunded");

  if (error) {
    throw new Error(
      `[one_time_product] Failed to reverse valuation delivery on purchase ${purchaseId}: ${error.message}`
    );
  }
}

async function reverseDealRoom90Refund(
  purchaseId: string,
  now: string,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("deal_room_paid_access")
    .update({
      access_status: "refunded",
      refunded_at: now,
      access_expires_at: now,
      updated_at: now,
    })
    .eq("purchase_id", purchaseId)
    .neq("access_status", "refunded");

  if (error) {
    throw new Error(
      `[one_time_product] Failed to reverse deal-room paid access on purchase ${purchaseId}: ${error.message}`
    );
  }
}

async function reverseConfidentialSaleLaunchRefund(
  purchaseId: string,
  now: string,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  const { data: launch, error: launchReadError } = await supabaseAdmin
    .from("confidential_sale_launches")
    .select("id, listing_id, status")
    .eq("purchase_id", purchaseId)
    .maybeSingle();

  if (launchReadError) {
    throw new Error(
      `[one_time_product] Failed to load confidential launch for purchase ${purchaseId}: ${launchReadError.message}`
    );
  }

  if (!launch) {
    return;
  }

  const { error: launchUpdateError } = await supabaseAdmin
    .from("confidential_sale_launches")
    .update({
      status: "refunded",
      refunded_at: now,
      updated_at: now,
    })
    .eq("id", launch.id)
    .neq("status", "refunded");

  if (launchUpdateError) {
    throw new Error(
      `[one_time_product] Failed to mark confidential launch refunded on purchase ${purchaseId}: ${launchUpdateError.message}`
    );
  }

  const { data: activeLaunches, error: activeLaunchesError } = await supabaseAdmin
    .from("confidential_sale_launches")
    .select("id")
    .eq("listing_id", launch.listing_id)
    .eq("status", "active")
    .limit(1);

  if (activeLaunchesError) {
    throw new Error(
      `[one_time_product] Failed to validate active confidential launches for listing ${launch.listing_id}: ${activeLaunchesError.message}`
    );
  }

  if ((activeLaunches ?? []).length === 0) {
    const { error: listingUpdateError } = await supabaseAdmin
      .from("business_listings")
      .update({ is_confidential: false, updated_at: now })
      .eq("id", launch.listing_id);

    if (listingUpdateError) {
      throw new Error(
        `[one_time_product] Failed to restore listing visibility on refund for listing ${launch.listing_id}: ${listingUpdateError.message}`
      );
    }
  }
}
