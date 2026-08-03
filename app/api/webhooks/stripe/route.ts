import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getFeaturedListingConfig } from "@/lib/billing";
import { getProduct } from "@/lib/commerce/products";

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
          await handleFeaturedListingRefund(paymentIntentId, supabaseAdmin);
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
        updated_at: now,
      },
      { onConflict: "stripe_checkout_session_id" }
    )
    .select("id")
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

  // Upsert entitlement grant (UNIQUE on purchase_id, product_key)
  const { error: grantError } = await supabaseAdmin
    .from("entitlement_grants")
    .upsert(
      {
        purchase_id: purchase.id,
        user_id: userId,
        product_key: productKey,
        entitlement_type: product.entitlementType,
        status: "active",
        granted_at: now,
        updated_at: now,
      },
      { onConflict: "purchase_id,product_key" }
    );

  if (grantError) {
    throw new Error(
      `[one_time_product] Failed to upsert entitlement grant for purchase ${purchase.id}: ${grantError.message}`
    );
  }

  // Fulfill based on the product's fulfillment behavior
  if (product.fulfillmentBehavior === "create_workspace") {
    if (productKey === "value_action_sprint") {
      // Upsert workspace (UNIQUE on purchase_id)
      const { error: workspaceError } = await supabaseAdmin
        .from("value_action_sprint_workspaces")
        .upsert(
          {
            user_id: userId,
            purchase_id: purchase.id,
            status: "not_started",
            updated_at: now,
          },
          { onConflict: "purchase_id" }
        );

      if (workspaceError) {
        throw new Error(
          `[one_time_product] Failed to upsert workspace for purchase ${purchase.id}: ${workspaceError.message}`
        );
      }
    }
  }

  // Mark purchase as fulfilled
  const { error: fulfillError } = await supabaseAdmin
    .from("purchases")
    .update({ fulfillment_status: "fulfilled", updated_at: now })
    .eq("id", purchase.id);

  if (fulfillError) {
    throw new Error(
      `[one_time_product] Failed to mark purchase ${purchase.id} as fulfilled: ${fulfillError.message}`
    );
  }
}
