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
- `STRIPE_PRICE_FEATURED_LISTING` — Stripe Price ID for the one-time featured-listing product (required to enable featured listing checkout)
- `FEATURED_LISTING_DURATION_DAYS` — Number of days a paid featured promotion lasts (default: `30`; must be a positive integer)
- `ALLOWED_DEV_ORIGINS` — Comma-separated dev origins allowed for Next.js server actions (example: `localhost:3000,example.github.dev`)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 measurement ID (`G-XXXXXXXXXX` placeholder for local/dev)

## Supabase setup notes

1. Run SQL migrations in `supabase/migrations/`.
2. Create a Storage bucket named `vault`.
3. Configure Storage policies on `storage.objects` so authenticated users can manage files under their own path.

## Stripe setup notes

1. Checkout endpoint: `POST /api/checkout` (subscription plans)
2. Featured-listing checkout endpoint: `POST /api/featured-listings/checkout` (one-time payment)
3. Canonical webhook endpoint: `POST /api/webhooks/stripe`
4. Configure Stripe products so the env price IDs above map to Starter, Builder, Pro, and the featured-listing one-time product.
5. Add `charge.refunded` to your Stripe webhook event subscriptions so refunded featured promotions are automatically cleared.

## GA4 setup notes (privacy-first)

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-L1236BGPDD` in **Vercel Production only**.
2. Keep GA4 disabled in Preview unless you create a separate testing property.
3. In GA4 Enhanced Measurement → Page views → advanced settings, turn off **“Page changes based on browser history events”** to avoid duplicate page views (Ownward sends sanitized manual page views).
4. Validate Accept, Reject, Customize, and consent withdrawal with Google Tag Assistant.
5. Verify GA4 Realtime only with sanitized paths/query allowlist (no private IDs, tokens, emails, or account identifiers).

## Reproducible local verification

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
```

If Supabase CLI is installed, verify migrations on a clean database:

```bash
supabase db reset
supabase db lint
supabase gen types typescript --linked > types/database.generated.ts
```
