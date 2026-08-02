import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isObsoleteStripeCustomer } from "@/lib/billing";
import { getSiteUrl } from "@/lib/config";
import Stripe from "stripe";

export async function POST() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-06-24.dahlia",
    });

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const stripeCustomerId = profile?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 400 }
      );
    }

    let staleCustomer = false;
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      staleCustomer = isObsoleteStripeCustomer(customer);
    } catch (error: unknown) {
      if (!isObsoleteStripeCustomer(error)) {
        throw error;
      }
      staleCustomer = true;
    }

    if (staleCustomer) {
      const { error: clearProfileError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: null })
        .eq("id", user.id)
        .eq("stripe_customer_id", stripeCustomerId);

      if (clearProfileError) {
        return NextResponse.json(
          { error: "Unable to update billing profile. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Your previous billing account is no longer available. Please start a new subscription checkout.",
        },
        { status: 409 }
      );
    }

    const siteUrl = getSiteUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Billing portal error:", message);
    return NextResponse.json(
      { error: "Unable to open billing portal. Please try again." },
      { status: 500 }
    );
  }
}
