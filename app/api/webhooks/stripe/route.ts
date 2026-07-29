import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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

  // Use service role client to securely write subscription states bypassing RLS
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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const { error: upsertError } = await supabaseAdmin
            .from("subscriptions")
            .upsert({
            id: subscription.id,
            user_id: userId,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity ?? 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
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

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity ?? 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        if (updateError) {
          throw updateError;
        }

        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown webhook error";
    console.error("Webhook handler error:", message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
