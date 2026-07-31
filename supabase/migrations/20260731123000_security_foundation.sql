-- Security foundation hardening migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Documents hardening
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS sha256_checksum text,
  ADD COLUMN IF NOT EXISTS retention_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS malware_scan_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS previous_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replaced_by_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_retention_status_check,
  DROP CONSTRAINT IF EXISTS documents_malware_scan_status_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_retention_status_check CHECK (
    retention_status IN ('active', 'soft_deleted', 'retained', 'purged')
  ),
  ADD CONSTRAINT documents_malware_scan_status_check CHECK (
    malware_scan_status IN ('pending', 'clean', 'flagged', 'failed')
  );

CREATE UNIQUE INDEX IF NOT EXISTS documents_active_checksum_unique
  ON public.documents (user_id, sha256_checksum)
  WHERE sha256_checksum IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS documents_user_created_idx
  ON public.documents (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.documents_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_set_updated_at_trigger ON public.documents;
CREATE TRIGGER documents_set_updated_at_trigger
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Missing app tables: posts and contact_messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  content text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_lower_unique
  ON public.posts (lower(slug));

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON public.posts;
CREATE POLICY "Public can view published posts"
  ON public.posts FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_messages_status_check CHECK (status IN ('new', 'reviewed', 'resolved')),
  CONSTRAINT contact_messages_email_check CHECK (position('@' in email) > 1)
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can view own contact messages" ON public.contact_messages;

CREATE POLICY "Public can create contact messages"
  ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(name)) > 0
    AND length(trim(message)) > 0
    AND (auth.uid() IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Users can view own contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Safe public listing projection
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.marketplace_public_listings AS
SELECT
  id,
  slug,
  business_name,
  category,
  location,
  summary,
  asking_price,
  annual_revenue,
  year_established,
  featured_until,
  published_at,
  created_at
FROM public.business_listings
WHERE is_public = true
  AND status = 'published';

GRANT SELECT ON public.marketplace_public_listings TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'lis_unique_buyer_listing'
  ) THEN
    CREATE UNIQUE INDEX lis_unique_buyer_listing
      ON public.listing_interest_submissions (listing_id, buyer_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.create_listing_interest_submission(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_goal text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_timeline text,
  p_financing_status text,
  p_experience text,
  p_initial_question text,
  p_conversation_id uuid,
  p_message_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.listing_interest_submissions (
    listing_id,
    buyer_id,
    goal,
    budget_min,
    budget_max,
    timeline,
    financing_status,
    experience,
    initial_question
  )
  VALUES (
    p_listing_id,
    p_buyer_id,
    p_goal,
    p_budget_min,
    p_budget_max,
    p_timeline,
    p_financing_status,
    p_experience,
    p_initial_question
  );

  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    message_type,
    body
  )
  VALUES (
    p_conversation_id,
    p_buyer_id,
    'interest_summary',
    p_message_body
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saved_listings_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_is_public boolean;
  v_status text;
BEGIN
  SELECT user_id, is_public, status
  INTO v_owner_id, v_is_public, v_status
  FROM public.business_listings
  WHERE id = NEW.listing_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;

  IF v_owner_id = NEW.user_id THEN
    RAISE EXCEPTION 'Cannot save your own listing.';
  END IF;

  IF v_is_public IS DISTINCT FROM true OR v_status <> 'published' THEN
    RAISE EXCEPTION 'Listing is not eligible to be saved.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_listings_validate_insert_trigger ON public.saved_listings;
CREATE TRIGGER saved_listings_validate_insert_trigger
  BEFORE INSERT ON public.saved_listings
  FOR EACH ROW EXECUTE FUNCTION public.saved_listings_validate_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- Deal-room invitation lifecycle and NDA gating
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.deal_room_members
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invitation_token_hash text,
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS nda_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nda_version text,
  ADD COLUMN IF NOT EXISTS nda_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS nda_accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nda_acceptance_metadata jsonb;

UPDATE public.deal_room_members
SET membership_status = 'pending'
WHERE membership_status = 'invited';

ALTER TABLE public.deal_room_members
  DROP CONSTRAINT IF EXISTS drm_membership_status_check;

ALTER TABLE public.deal_room_members
  ADD CONSTRAINT drm_membership_status_check CHECK (
    membership_status IN ('pending', 'opened', 'accepted', 'active', 'declined', 'expired', 'revoked', 'removed')
  );

CREATE INDEX IF NOT EXISTS drm_invitation_hash_idx
  ON public.deal_room_members (invitation_token_hash);

CREATE INDEX IF NOT EXISTS drm_invitation_expiry_idx
  ON public.deal_room_members (invitation_expires_at);

CREATE OR REPLACE FUNCTION public.deal_room_members_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_room_members_set_updated_at_trigger ON public.deal_room_members;
CREATE TRIGGER deal_room_members_set_updated_at_trigger
  BEFORE UPDATE ON public.deal_room_members
  FOR EACH ROW EXECUTE FUNCTION public.deal_room_members_set_updated_at();

CREATE OR REPLACE FUNCTION public.deal_room_members_enforce_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role <> 'seller' AND NEW.membership_status = 'active' THEN
      RAISE EXCEPTION 'Only seller membership may start as active.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.membership_status IS DISTINCT FROM OLD.membership_status THEN
    IF NOT (
      (OLD.membership_status = 'pending' AND NEW.membership_status IN ('opened', 'accepted', 'declined', 'expired', 'revoked', 'removed')) OR
      (OLD.membership_status = 'opened' AND NEW.membership_status IN ('accepted', 'declined', 'expired', 'revoked', 'removed')) OR
      (OLD.membership_status = 'accepted' AND NEW.membership_status IN ('active', 'revoked', 'removed')) OR
      (OLD.membership_status = 'active' AND NEW.membership_status IN ('revoked', 'removed'))
    ) THEN
      RAISE EXCEPTION 'Invalid deal room membership transition: % -> %', OLD.membership_status, NEW.membership_status;
    END IF;
  END IF;

  IF NEW.membership_status = 'active' THEN
    IF NEW.nda_required AND NEW.nda_accepted_at IS NULL THEN
      RAISE EXCEPTION 'NDA acceptance is required before activating membership.';
    END IF;
    NEW.joined_at = COALESCE(NEW.joined_at, now());
  END IF;

  IF NEW.membership_status = 'opened' AND NEW.invitation_opened_at IS NULL THEN
    NEW.invitation_opened_at = now();
  END IF;

  IF NEW.membership_status = 'accepted' AND NEW.invitation_accepted_at IS NULL THEN
    NEW.invitation_accepted_at = now();
  END IF;

  IF NEW.membership_status = 'declined' AND NEW.invitation_declined_at IS NULL THEN
    NEW.invitation_declined_at = now();
  END IF;

  IF NEW.membership_status = 'revoked' AND NEW.invitation_revoked_at IS NULL THEN
    NEW.invitation_revoked_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_room_members_enforce_transitions_trigger ON public.deal_room_members;
CREATE TRIGGER deal_room_members_enforce_transitions_trigger
  BEFORE INSERT OR UPDATE ON public.deal_room_members
  FOR EACH ROW EXECUTE FUNCTION public.deal_room_members_enforce_transitions();

ALTER TABLE public.deal_room_documents
  ADD COLUMN IF NOT EXISTS sha256_checksum text,
  ADD COLUMN IF NOT EXISTS retention_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS malware_scan_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quarantine_storage_path text;

ALTER TABLE public.deal_room_documents
  DROP CONSTRAINT IF EXISTS deal_room_documents_retention_status_check,
  DROP CONSTRAINT IF EXISTS deal_room_documents_malware_scan_status_check;

ALTER TABLE public.deal_room_documents
  ADD CONSTRAINT deal_room_documents_retention_status_check CHECK (
    retention_status IN ('active', 'soft_deleted', 'retained', 'purged')
  ),
  ADD CONSTRAINT deal_room_documents_malware_scan_status_check CHECK (
    malware_scan_status IN ('pending', 'clean', 'flagged', 'failed')
  );

CREATE INDEX IF NOT EXISTS drd_checksum_idx
  ON public.deal_room_documents (deal_room_id, sha256_checksum)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Stripe webhook durability and ordering
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  stripe_created bigint NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_events_processed_idx
  ON public.stripe_events (processed_at, stripe_created DESC);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to stripe_events" ON public.stripe_events;
CREATE POLICY "No client access to stripe_events"
  ON public.stripe_events FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_stripe_event_created bigint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
  ON public.subscriptions (user_id, status, updated_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure private storage bucket exists for deal-room files
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-room-files', 'deal-room-files', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false;
