import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveProduct, getStripePriceId } from "@/lib/commerce/products";
import { getSiteUrl } from "@/lib/config";
import { isObsoleteStripeCustomer } from "@/lib/billing";
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

    // 1. Require authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    // 2. Parse body — only productKey is accepted from the client.
    //    Amount, currency, and price ID are never sourced from the request.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const productKey =
      body && typeof body === "object" && "productKey" in body
        ? String((body as Record<string, unknown>).productKey ?? "").trim()
        : "";

    if (!productKey) {
      return NextResponse.json({ error: "productKey is required" }, { status: 400 });
    }

    // 3. Resolve product — rejects unknown or inactive keys
    const product = getActiveProduct(productKey);
    if (!product) {
      return NextResponse.json({ error: "Invalid or unavailable product" }, { status: 400 });
    }

    // 4. Resolve Stripe Price ID server-side from environment variables only
    let priceId: string;
    try {
      priceId = getStripePriceId(product);
    } catch (err) {
      console.error("Commerce checkout — price config error:", err);
      return NextResponse.json({ error: "Product is not configured" }, { status: 500 });
    }

    // 5. Build site URL for redirects
    let siteUrl: string;
    try {
      siteUrl = getSiteUrl();
    } catch (err) {
      console.error("Commerce checkout — site URL config error:", err);
      return NextResponse.json({ error: "Application URL is not configured" }, { status: 500 });
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
        const { data: clearedProfiles, error: clearProfileError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: null })
          .eq("id", user.id)
          .eq("stripe_customer_id", obsoleteStripeCustomerId)
          .select("stripe_customer_id");

        if (clearProfileError) {
          return NextResponse.json(
            { error: "Unable to update billing profile. Please try again." },
            { status: 500 }
          );
        }

        if ((clearedProfiles?.length ?? 0) === 0) {
          const { data: latestProfile, error: latestProfileError } = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .maybeSingle();

          if (latestProfileError) {
            return NextResponse.json(
              { error: "Unable to update billing profile. Please try again." },
              { status: 500 }
            );
          }

          const latestId = latestProfile?.stripe_customer_id ?? null;
          if (latestId && latestId !== obsoleteStripeCustomerId) {
            stripeCustomerId = latestId;
          } else {
            return NextResponse.json(
              { error: "Your billing profile changed. Please try again." },
              { status: 409 }
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
            { status: 500 }
          );
        }
      }
    }

    // 7. Create Stripe Checkout Session (mode: payment — one-time purchase)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      success_url: `${siteUrl}/account/products?success=purchased`,
      cancel_url: `${siteUrl}/products/value-action-sprint`,
      metadata: {
        purchaseType: "one_time_product",
        userId: user.id,
        productKey: product.key,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Commerce checkout error:", message);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
