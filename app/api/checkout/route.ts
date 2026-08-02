import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAllowedPriceIds,
  getPriceIdForPlan,
  isActiveSubscription,
  isObsoleteStripeCustomer,
  type BillingInterval,
} from "@/lib/billing";
import { getSiteUrl } from "@/lib/config";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-06-24.dahlia",
    });

    const supabase = await createClient();

    // 1. Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Return 401 so the client can redirect to /login
      return NextResponse.json({ error: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    const body = await req.json();
    const requestedPlan = String(body?.plan ?? "").toLowerCase();
    const requestedPriceId = String(body?.priceId ?? "");

    // Validate and default billing interval
    const rawInterval = body?.interval;
    if (rawInterval !== undefined && rawInterval !== "monthly" && rawInterval !== "annual") {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }
    const billingInterval: BillingInterval = rawInterval ?? "monthly";

    const resolvedPriceId =
      (requestedPlan ? getPriceIdForPlan(requestedPlan, billingInterval) : null) ??
      requestedPriceId;

    if (!resolvedPriceId) {
      return NextResponse.json({ error: "Missing plan selection" }, { status: 400 });
    }

    const allowedPriceIds = getAllowedPriceIds();
    if (!allowedPriceIds.has(resolvedPriceId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // 2. Prevent duplicate subscriptions: active/trialing users must use portal
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("id, status, price_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSub && isActiveSubscription(activeSub.status)) {
      const siteUrlForPortal = getSiteUrl();
      // If they're changing plans, send them to the portal
      if (activeSub.price_id !== resolvedPriceId) {
        return NextResponse.json({
          error: "You already have an active subscription. Use the customer portal to change your plan.",
          portalRedirect: true,
          returnUrl: `${siteUrlForPortal}/pricing`,
        }, { status: 409 });
      }
      // Same plan — already subscribed
      return NextResponse.json({
        error: "You are already subscribed to this plan.",
        alreadySubscribed: true,
      }, { status: 409 });
    }

    const siteUrl = getSiteUrl();

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
        const { error: clearProfileError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: null })
          .eq("id", user.id)
          .eq("stripe_customer_id", obsoleteStripeCustomerId);

        if (clearProfileError) {
          return NextResponse.json(
            { error: "Unable to update billing profile. Please try again." },
            { status: 500 }
          );
        }
      }

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
          { status: 500 }
        );
      }
    }

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      success_url: `${siteUrl}/dashboard?success=subscribed`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: {
        userId: user.id,
        plan: requestedPlan,
        interval: billingInterval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
