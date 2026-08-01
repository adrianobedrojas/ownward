import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFeaturedListingConfig } from "@/lib/billing";
import { getSiteUrl } from "@/lib/config";
import Stripe from "stripe";

export async function POST(req: Request) {
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

  // 1. Require authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body — only listingId is accepted from the client
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const listingId =
    body && typeof body === "object" && "listingId" in body
      ? String((body as Record<string, unknown>).listingId ?? "").trim()
      : "";

  if (!listingId) {
    return NextResponse.json(
      { error: "listingId is required" },
      { status: 400 }
    );
  }

  // 3. Retrieve listing and verify ownership
  const { data: listing, error: listingError } = await supabase
    .from("business_listings")
    .select(
      "id, user_id, status, is_public, business_name, featured_until"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  if (listing.user_id !== user.id) {
    return NextResponse.json(
      { error: "You do not own this listing" },
      { status: 403 }
    );
  }

  if (listing.status !== "published") {
    return NextResponse.json(
      { error: "Only published listings can be featured" },
      { status: 422 }
    );
  }

  if (!listing.is_public) {
    return NextResponse.json(
      { error: "Listing must be public to be featured" },
      { status: 422 }
    );
  }

  // 4. Reject if an active promotion already exists
  if (
    listing.featured_until &&
    new Date(listing.featured_until) > new Date()
  ) {
    return NextResponse.json(
      { error: "This listing is already actively featured" },
      { status: 422 }
    );
  }

  // 5. Retrieve price from server env only — never from the client
  let priceId: string;
  try {
    ({ priceId } = getFeaturedListingConfig());
  } catch (err) {
    console.error("Featured listing config error:", err);
    return NextResponse.json(
      { error: "Featured listing is not configured" },
      { status: 500 }
    );
  }

  // 6. Build safe site URL for redirects
  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (error) {
    console.error("Invalid site URL configuration:", error);
    return NextResponse.json(
      { error: "Application URL is not configured" },
      { status: 500 }
    );
  }

  // 7. Create Stripe Checkout Session (mode: payment — one-time)
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${siteUrl}/dashboard?featured=processing`,
      cancel_url: `${siteUrl}/dashboard?featured=canceled`,
      metadata: {
        purchaseType: "featured_listing",
        userId: user.id,
        listingId: listing.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }
}
