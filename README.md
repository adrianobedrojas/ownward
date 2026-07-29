# Ownward

Ownward is a Next.js + Supabase app for running, growing, buying, and selling small businesses.

## Required environment variables

Create `.env.local` with:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_BUILDER`
- `STRIPE_PRICE_PRO`

## Supabase setup notes

1. Run SQL migrations in `supabase/migrations/`.
2. Create a Storage bucket named `vault`.
3. Configure Storage policies on `storage.objects` so authenticated users can manage files under their own path.

## Stripe setup notes

1. Checkout endpoint: `POST /api/checkout`
2. Canonical webhook endpoint: `POST /api/webhooks/stripe`
3. Configure Stripe products so the env price IDs above map to Starter, Builder, and Pro.
