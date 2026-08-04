import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPurchasableProduct,
  getStripePriceId,
  isProductConfigured,
  type ProductDefinition,
} from "@/lib/commerce/products";
import { getSiteUrl } from "@/lib/config";
import { isObsoleteStripeCustomer } from "@/lib/billing";
import Stripe from "stripe";

const SUPPORTED_LOCALES = ["en", "es"] as const;
const DEFAULT_LOCALE = "en";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getLocalePrefix(locale: string): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

async function validateTargetEligibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  product: ProductDefinition,
  targetId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (product.requiredTargetType === "none") {
    return { ok: true };
  }

  if (!targetId || !UUID_REGEX.test(targetId)) {
    return {
      ok: false,
      status: 400,
      error: "A valid targetId is required for this product",
    };
  }

  if (product.requiredTargetType === "listing") {
    const { data: listing } = await supabase
      .from("business_listings")
      .select("id, user_id, status, is_public")
      .eq("id", targetId)
      .maybeSingle();

    if (!listing) {
      return { ok: false, status: 404, error: "Target listing not found" };
    }
    if (listing.user_id !== userId) {
      return { ok: false, status: 403, error: "You do not own this listing" };
    }
    if (listing.status !== "published" || !listing.is_public) {
      return {
        ok: false,
        status: 422,
        error: "Listing must be public and published for this product",
      };
    }
    return { ok: true };
  }

  if (product.requiredTargetType === "business") {
    const { data: business } = await supabase
      .from("businesses")
      .select("id, owner_id, deleted_at")
      .eq("id", targetId)
      .maybeSingle();

    if (!business || business.deleted_at !== null) {
      return { ok: false, status: 404, error: "Target business not found" };
    }
    if (business.owner_id !== userId) {
      return { ok: false, status: 403, error: "You do not own this business" };
    }
    return { ok: true };
  }

  return {
    ok: false,
    status: 422,
    error: "Target validation is not available for this product",
  };
}

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

    if (!productKey) {
      return NextResponse.json({ error: "productKey is required" }, { status: 400 });
    }

    // 3. Resolve product — rejects unknown, planned, and unavailable keys
    const product = getPurchasableProduct(productKey);
    if (!product) {
      return NextResponse.json({ error: "Invalid or unavailable product" }, { status: 400 });
    }

    if (!isProductConfigured(product)) {
      return NextResponse.json({ error: "Product is not configured" }, { status: 500 });
    }

    const targetCheck = await validateTargetEligibility(
      supabase,
      user.id,
      product,
      targetId || null
    );
    if (!targetCheck.ok) {
      return NextResponse.json({ error: targetCheck.error }, { status: targetCheck.status });
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
      success_url: `${siteUrl}${localePrefix}/account/products?success=purchased`,
      cancel_url: `${siteUrl}${localePrefix}${product.cancelPath}`,
      metadata: {
        purchaseType: "one_time_product",
        userId: user.id,
        productKey: product.key,
        targetId: targetId || "",
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
