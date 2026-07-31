import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllowedPriceIds, getPriceIdForPlan } from "@/lib/billing";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const requestedPlan = String(body?.plan ?? "").toLowerCase();
    const requestedPriceId = String(body?.priceId ?? "");

    const resolvedPriceId =
      (requestedPlan ? getPriceIdForPlan(requestedPlan) : null) ??
      requestedPriceId;

    if (!resolvedPriceId) {
      return NextResponse.json({ error: "Missing plan selection" }, { status: 400 });
    }

    const allowedPriceIds = getAllowedPriceIds();
    if (!allowedPriceIds.has(resolvedPriceId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const siteUrl = getSiteUrl();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let stripeCustomerId = profile?.stripe_customer_id ?? null;
    if (stripeCustomerId) {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if ("deleted" in customer && customer.deleted) {
        stripeCustomerId = null;
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
          { error: "Unable to initialize billing profile" },
          { status: 500 }
        );
      }
    }

    // 2. Create Stripe Checkout Session
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
      success_url: `${siteUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
