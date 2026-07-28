import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-27.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Use service role client to securely write subscription states bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          await supabaseAdmin.from("subscriptions").upsert({
            id: subscription.id,
            user_id: userId,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity ?? 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity ?? 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err.message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
