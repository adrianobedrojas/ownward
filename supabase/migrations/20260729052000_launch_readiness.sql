-- Profiles: onboarding state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'start',
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS business_name text;

-- Listings: publish fields and canonical public slug
ALTER TABLE public.business_listings
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

UPDATE public.business_listings
SET slug = lower(regexp_replace(coalesce(business_name, 'business'), '[^a-zA-Z0-9]+', '-', 'g'))
          || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS business_listings_slug_key
  ON public.business_listings(slug);

DROP POLICY IF EXISTS "Public can view published business listings" ON public.business_listings;
CREATE POLICY "Public can view published business listings"
  ON public.business_listings
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);
