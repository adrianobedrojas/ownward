-- ─────────────────────────────────────────────────────────────────────────────
-- Bilingual Listing Studio
-- Adds bilingual fields, confidentiality, and listing_media to business_listings
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── New columns on business_listings ────────────────────────────────────────
ALTER TABLE public.business_listings
  -- Confidentiality
  ADD COLUMN IF NOT EXISTS is_confidential        boolean             NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teaser_title           text,               -- safe public title when confidential

  -- Bilingual headline / summary
  ADD COLUMN IF NOT EXISTS headline_en            text,
  ADD COLUMN IF NOT EXISTS headline_es            text,
  ADD COLUMN IF NOT EXISTS summary_en             text,
  ADD COLUMN IF NOT EXISTS summary_es             text,

  -- Rich description fields (bilingual)
  ADD COLUMN IF NOT EXISTS highlights_en          text,
  ADD COLUMN IF NOT EXISTS highlights_es          text,
  ADD COLUMN IF NOT EXISTS growth_opportunities_en text,
  ADD COLUMN IF NOT EXISTS growth_opportunities_es text,
  ADD COLUMN IF NOT EXISTS reason_for_selling_en  text,
  ADD COLUMN IF NOT EXISTS reason_for_selling_es  text,

  -- Financial snapshot
  ADD COLUMN IF NOT EXISTS currency               text                NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS cash_flow              numeric,
  ADD COLUMN IF NOT EXISTS financial_year         text,
  ADD COLUMN IF NOT EXISTS seller_financing       boolean             NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_included     boolean             NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS real_estate_included   boolean             NOT NULL DEFAULT false,

  -- Operations
  ADD COLUMN IF NOT EXISTS owner_involvement_hours integer,
  ADD COLUMN IF NOT EXISTS number_of_employees    integer,
  ADD COLUMN IF NOT EXISTS established_online     boolean             NOT NULL DEFAULT false,

  -- Timestamps
  ADD COLUMN IF NOT EXISTS last_step_completed    integer             NOT NULL DEFAULT 0;

-- ─── TABLE: listing_media ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_media (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid        NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  text        NOT NULL,
  file_size     bigint      NOT NULL DEFAULT 0,
  mime_type     text        NOT NULL DEFAULT 'image/webp',
  width         integer,
  height        integer,
  caption_en    text,
  caption_es    text,
  alt_text_en   text,
  alt_text_es   text,
  sort_order    integer     NOT NULL DEFAULT 0,
  is_cover      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_media_listing_id_idx ON public.listing_media (listing_id);
CREATE INDEX IF NOT EXISTS listing_media_user_id_idx    ON public.listing_media (user_id);
CREATE INDEX IF NOT EXISTS listing_media_sort_order_idx ON public.listing_media (listing_id, sort_order);

-- ─── RLS: listing_media ───────────────────────────────────────────────────────
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;

-- Owners can manage media for their own listings
DROP POLICY IF EXISTS "Owners manage their own listing media" ON public.listing_media;
CREATE POLICY "Owners manage their own listing media"
  ON public.listing_media
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anonymous and authenticated viewers can read media for published public listings
DROP POLICY IF EXISTS "Public can view published listing media" ON public.listing_media;
CREATE POLICY "Public can view published listing media"
  ON public.listing_media
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.business_listings bl
      WHERE  bl.id        = listing_id
        AND  bl.is_public = true
        AND  bl.status    = 'published'
    )
  );

-- ─── Storage: listing-images bucket ──────────────────────────────────────────
-- Private bucket — URLs are always signed server-side
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  false,
  10485760,                             -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public               = false,
      file_size_limit      = EXCLUDED.file_size_limit,
      allowed_mime_types   = EXCLUDED.allowed_mime_types;

-- Bucket RLS: owners can manage their own paths (userId/listingId/*)
DROP POLICY IF EXISTS "listing-images: owner INSERT"  ON storage.objects;
DROP POLICY IF EXISTS "listing-images: owner SELECT"  ON storage.objects;
DROP POLICY IF EXISTS "listing-images: owner UPDATE"  ON storage.objects;
DROP POLICY IF EXISTS "listing-images: owner DELETE"  ON storage.objects;

CREATE POLICY "listing-images: owner INSERT"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing-images: owner SELECT"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing-images: owner UPDATE"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing-images: owner DELETE"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── marketplace_public_listings view: expose headline for bilingual fallback ─
-- The view already exists; recreate to add new columns.
DROP VIEW IF EXISTS public.marketplace_public_listings;
CREATE VIEW public.marketplace_public_listings AS
SELECT
  bl.id,
  bl.slug,
  CASE
    WHEN bl.is_confidential AND bl.teaser_title IS NOT NULL AND bl.teaser_title <> ''
      THEN bl.teaser_title
    ELSE bl.business_name
  END                         AS business_name,
  bl.category,
  bl.location,
  bl.summary,
  bl.headline_en,
  bl.headline_es,
  bl.summary_en,
  bl.summary_es,
  bl.asking_price,
  bl.annual_revenue,
  bl.cash_flow,
  bl.year_established,
  bl.featured_until,
  bl.published_at,
  bl.created_at
FROM public.business_listings bl
WHERE bl.is_public = true
  AND bl.status    = 'published';
