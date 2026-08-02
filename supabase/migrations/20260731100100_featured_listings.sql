-- Featured Listings: paid promotional placement
-- Adds featured_started_at / featured_until to business_listings
-- Creates listing_promotions to track Stripe payments

-- ─────────────────────────────────────────────
-- COLUMNS: business_listings
-- ─────────────────────────────────────────────
ALTER TABLE public.business_listings
  ADD COLUMN IF NOT EXISTS featured_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_until       timestamptz;

-- Index for fast marketplace ordering on featured listings
CREATE INDEX IF NOT EXISTS business_listings_featured_until_idx
  ON public.business_listings (featured_until DESC NULLS LAST)
  WHERE featured_until IS NOT NULL;

-- ─────────────────────────────────────────────
-- TABLE: listing_promotions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_promotions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                  uuid        NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id  text        NOT NULL UNIQUE,
  stripe_payment_intent_id    text,
  stripe_price_id             text        NOT NULL,
  status                      text        NOT NULL,
  starts_at                   timestamptz,
  ends_at                     timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_promotions_status_check CHECK (
    status IN ('pending', 'active', 'expired', 'refunded', 'canceled')
  )
);

CREATE INDEX IF NOT EXISTS listing_promotions_listing_id_idx ON public.listing_promotions (listing_id);
CREATE INDEX IF NOT EXISTS listing_promotions_user_id_idx    ON public.listing_promotions (user_id);
CREATE INDEX IF NOT EXISTS listing_promotions_status_idx     ON public.listing_promotions (status);
CREATE INDEX IF NOT EXISTS listing_promotions_ends_at_idx    ON public.listing_promotions (ends_at DESC NULLS LAST);

-- ─────────────────────────────────────────────
-- RLS: listing_promotions
-- Only the owning user may SELECT their own records.
-- Insert/update/delete are performed only by the service-role client
-- inside the Stripe webhook — never by authenticated clients.
-- ─────────────────────────────────────────────
ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own promotions" ON public.listing_promotions;

CREATE POLICY "Users can view own promotions"
  ON public.listing_promotions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
