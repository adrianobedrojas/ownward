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

    let stripeCustomerId = profile?.stripe_customer_id ?? null;
    let obsoleteCustomerId: string | null = null;

    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (isObsoleteStripeCustomer(customer)) {
          obsoleteCustomerId = stripeCustomerId;
          stripeCustomerId = null;
        }
      } catch (error: unknown) {
        if (isObsoleteStripeCustomer(error)) {
          obsoleteCustomerId = stripeCustomerId;
          stripeCustomerId = null;
        } else {
          throw error;
        }
      }
    }

    if (!stripeCustomerId && obsoleteCustomerId) {
      const { data: claimRows, error: claimError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: null })
        .eq("id", user.id)
        .eq("stripe_customer_id", obsoleteCustomerId)
        .select("id");

      if (claimError) {
        return NextResponse.json(
          { error: "Unable to initialize billing profile" },
          { status: 500 }
        );
      }

      if (!claimRows || claimRows.length === 0) {
        const { data: latestProfile, error: latestProfileError } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", user.id)
          .maybeSingle();

        if (latestProfileError) {
          return NextResponse.json(
            { error: "Unable to initialize billing profile" },
            { status: 500 }
          );
        }

        stripeCustomerId = latestProfile?.stripe_customer_id ?? null;
        if (!stripeCustomerId) {
          return NextResponse.json(
            { error: "Billing profile updated concurrently. Please retry." },
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

      if (obsoleteCustomerId) {
        const { data: assignRows, error: assignError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", user.id)
          .is("stripe_customer_id", null)
          .select("id");

        if (assignError) {
          return NextResponse.json(
            { error: "Unable to initialize billing profile" },
            { status: 500 }
          );
        }

        if (!assignRows || assignRows.length === 0) {
          const { data: latestProfile, error: latestProfileError } = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .maybeSingle();

          if (latestProfileError) {
            return NextResponse.json(
              { error: "Unable to initialize billing profile" },
              { status: 500 }
            );
          }

          stripeCustomerId = latestProfile?.stripe_customer_id ?? null;
          if (!stripeCustomerId) {
            return NextResponse.json(
              { error: "Billing profile updated concurrently. Please retry." },
              { status: 409 }
            );
          }
        }
      } else {
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
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 400 }
      );
    }

    const siteUrl = getSiteUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    console.error("Billing portal error:", err);
    return NextResponse.json(
      { error: "Unable to open the billing portal. Please try again." },
      { status: 500 }
    );
  }
}
