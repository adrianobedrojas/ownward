-- ============================================================
-- Marketplace Security Remediation
-- Version: 20260803090000
--
-- Changes:
--  1. Revoke broad anon SELECT on public.business_listings
--  2. Drop and recreate safe public view marketplace_public_listings
--     - status = published AND is_public = true
--     - masks confidential names → 'Confidential Business Opportunity'
--     - never exposes user_id
--  3. Drop and recreate safe view business_listing_public_detail
--     - same row filter; used by /b/[slug] page
--  4. Restore GRANT SELECT on both views to anon and authenticated
--  5. Grants for tables created in later migrations:
--       listing_media, notifications, user_preferences,
--       buyer_purchase_profiles, listing_interest_events
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Revoke broad anon access to the raw business_listings table.
--    Owners keep their access through the existing "Users can manage their own
--    listings" RLS policy (requires authenticated role).
--    Published-listing reads by the public go through the safe views below.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON public.business_listings FROM anon;

-- Drop the now-redundant public-select RLS policy so anon cannot use
-- the table even if a future migration accidentally re-grants SELECT.
DROP POLICY IF EXISTS "Public can view published business listings" ON public.business_listings;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Safe marketplace view – used by /buy (marketplace page)
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.marketplace_public_listings;

CREATE VIEW public.marketplace_public_listings
WITH (security_invoker = true)
AS
SELECT
  bl.id,
  bl.slug,
  -- Mask actual business name for confidential listings at the DB level
  CASE
    WHEN bl.is_confidential THEN 'Confidential Business Opportunity'
    ELSE bl.business_name
  END                        AS business_name,
  bl.category,
  bl.location,
  -- Prefer bilingual summary fields; fall back to legacy summary column
  COALESCE(bl.summary_en, bl.summary)  AS summary_en,
  COALESCE(bl.summary_es, bl.summary)  AS summary_es,
  bl.asking_price,
  bl.annual_revenue,
  bl.year_established,
  bl.featured_until,
  bl.published_at,
  bl.created_at
FROM public.business_listings bl
WHERE bl.is_public = true
  AND bl.status    = 'published';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Safe detail view – used by /b/[slug] (public listing page)
--    Includes the extra fields needed for the full listing presentation.
--    Does NOT include user_id or raw business_name for confidential listings.
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.business_listing_public_detail;

CREATE VIEW public.business_listing_public_detail
WITH (security_invoker = true)
AS
SELECT
  bl.id,
  bl.slug,
  CASE
    WHEN bl.is_confidential THEN 'Confidential Business Opportunity'
    ELSE bl.business_name
  END                                  AS business_name,
  bl.is_confidential,
  bl.teaser_title,
  bl.category,
  bl.location,
  bl.headline_en,
  bl.headline_es,
  bl.summary_en,
  bl.summary_es,
  bl.summary,
  bl.highlights_en,
  bl.highlights_es,
  bl.growth_opportunities_en,
  bl.growth_opportunities_es,
  bl.reason_for_selling_en,
  bl.reason_for_selling_es,
  bl.asking_price,
  bl.annual_revenue,
  bl.cash_flow,
  bl.year_established,
  bl.currency,
  bl.seller_financing,
  bl.inventory_included,
  bl.real_estate_included,
  bl.owner_involvement_hours,
  bl.number_of_employees,
  bl.featured_until,
  bl.published_at
FROM public.business_listings bl
WHERE bl.is_public = true
  AND bl.status    = 'published';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Restore grants on the safe views
--    Views defined with security_invoker=true evaluate their predicates under
--    the calling role's privileges, so anon sees only published rows.
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.marketplace_public_listings    TO anon, authenticated;
GRANT SELECT ON public.business_listing_public_detail TO anon, authenticated;

-- Service role needs SELECT to render listings server-side
GRANT SELECT ON public.marketplace_public_listings    TO service_role;
GRANT SELECT ON public.business_listing_public_detail TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Grants for tables added in migrations after 20260731160000_api_grants.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- listing_media: authenticated owners manage; public can SELECT via RLS policy
--   (policy "Public can view published listing media" was created in
--    20260803060000_bilingual_listing_studio.sql; no anon grant needed –
--    the policy requires a join to published listings which RLS enforces)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'listing_media'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_media TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_media TO service_role';
  END IF;
END
$$;

-- notifications: private inbox; no anon access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role';
  END IF;
END
$$;

-- user_preferences: private per-user; no anon access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_preferences'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO service_role';
  END IF;
END
$$;

-- buyer_purchase_profiles: private; no anon access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'buyer_purchase_profiles'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_purchase_profiles TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_purchase_profiles TO service_role';
  END IF;
END
$$;

-- listing_interest_events: private; no anon access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'listing_interest_events'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_interest_events TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_interest_events TO service_role';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Normalize contacts_only → connections in profile_visibility
--    Done before the constraint is tightened.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'profiles'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'profile_visibility'
  ) THEN
    UPDATE public.profiles
    SET profile_visibility = 'connections'
    WHERE profile_visibility = 'contacts_only';
  END IF;
END
$$;
