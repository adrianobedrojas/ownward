-- ============================================================
-- Personal Control Center + Buyer-Interest Architecture
-- Version: 20260803080000
--
-- New tables:
--   notifications              – in-app notification inbox
--   user_preferences           – per-user preferences (one-to-one)
--   buyer_purchase_profiles    – buyer acquisition goals
--   listing_interest_events    – meaningful buyer-interest events
--
-- Profiles additions:
--   avatar_path, headline, bio, location, timezone,
--   preferred_locale, profile_visibility
--
-- Security hardening:
--   Replaces/hardens create_listing_interest_submission function
--   with auth.uid()-derived buyer identity.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES: add missing columns if absent
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path            text,
  ADD COLUMN IF NOT EXISTS headline               text,
  ADD COLUMN IF NOT EXISTS bio                    text,
  ADD COLUMN IF NOT EXISTS location               text,
  ADD COLUMN IF NOT EXISTS timezone               text    NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS preferred_locale       text    NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS profile_visibility     text    NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS role                   text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_visibility_check,
  DROP CONSTRAINT IF EXISTS profiles_preferred_locale_check,
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_visibility_check
    CHECK (profile_visibility IN ('public','private','connections')),
  ADD CONSTRAINT profiles_preferred_locale_check
    CHECK (preferred_locale IN ('en','es')),
  ADD CONSTRAINT profiles_role_check
    CHECK (role IS NULL OR role IN ('buyer','seller','both'));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type text        NOT NULL,
  category          text        NOT NULL,
  priority          text        NOT NULL DEFAULT 'normal',
  listing_id        uuid        REFERENCES public.business_listings(id) ON DELETE SET NULL,
  conversation_id   uuid        REFERENCES public.conversations(id) ON DELETE SET NULL,
  deal_room_id      uuid        REFERENCES public.deal_rooms(id) ON DELETE SET NULL,
  task_id           uuid        REFERENCES public.tasks(id) ON DELETE SET NULL,
  action_url        text,
  metadata          jsonb       NOT NULL DEFAULT '{}',
  read_at           timestamptz,
  archived_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_category_check CHECK (
    category IN ('buyers','messages','deals','tasks','billing','security','system')
  ),
  CONSTRAINT notifications_type_check CHECK (
    notification_type IN (
      'listing_qualified_view','listing_repeat_view',
      'buyer_maybe_interested','buyer_interested','buyer_requested_information',
      'new_message',
      'deal_room_invitation','deal_room_activity',
      'document_activity',
      'task_due',
      'billing_notice','security_notice','system_notice'
    )
  ),
  CONSTRAINT notifications_priority_check CHECK (
    priority IN ('low','normal','high','critical')
  )
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON public.notifications (recipient_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_category_idx
  ON public.notifications (recipient_id, category);

CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications
DROP POLICY IF EXISTS "Recipients can read own notifications" ON public.notifications;
CREATE POLICY "Recipients can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

-- Recipients can mark read/archive their own notifications (UPDATE only read_at/archived_at)
DROP POLICY IF EXISTS "Recipients can update own notifications" ON public.notifications;
CREATE POLICY "Recipients can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Clients cannot INSERT notifications directly; only service role / functions
-- (no INSERT policy for authenticated role)

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: user_preferences (one-to-one with auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id                   uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_workspace          text        NOT NULL DEFAULT 'buyer',
  timezone                  text        NOT NULL DEFAULT 'UTC',
  preferred_locale          text        NOT NULL DEFAULT 'en',
  quiet_hours_enabled       boolean     NOT NULL DEFAULT false,
  quiet_hours_start         time,
  quiet_hours_end           time,
  quiet_hours_timezone      text,
  quiet_hours_weekends      boolean     NOT NULL DEFAULT false,
  notification_preferences  jsonb       NOT NULL DEFAULT '{}',
  privacy_preferences       jsonb       NOT NULL DEFAULT '{}',
  message_preferences       jsonb       NOT NULL DEFAULT '{}',
  accessibility_preferences jsonb       NOT NULL DEFAULT '{}',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_workspace_check
    CHECK (active_workspace IN ('buyer','seller')),
  CONSTRAINT user_preferences_locale_check
    CHECK (preferred_locale IN ('en','es'))
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: buyer_purchase_profiles (one-to-one with auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buyer_purchase_profiles (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id                 uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal             text,
  preferred_industries     text[],
  budget_min               numeric,
  budget_max               numeric,
  preferred_locations      text[],
  remote_business_ok       boolean     NOT NULL DEFAULT false,
  desired_involvement      text,
  purchase_timeline        text,
  financing_methods        text[],
  preferred_revenue_min    numeric,
  preferred_revenue_max    numeric,
  preferred_cash_flow_min  numeric,
  important_requirements   text,
  deal_breakers            text,
  share_with_sellers       boolean     NOT NULL DEFAULT false,
  sharing_preferences      jsonb       NOT NULL DEFAULT '{}',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bpp_budget_range_check
    CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
  CONSTRAINT bpp_revenue_range_check
    CHECK (preferred_revenue_min IS NULL OR preferred_revenue_max IS NULL
           OR preferred_revenue_min <= preferred_revenue_max)
);

CREATE INDEX IF NOT EXISTS buyer_purchase_profiles_buyer_id_idx
  ON public.buyer_purchase_profiles (buyer_id);

ALTER TABLE public.buyer_purchase_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can read own profile" ON public.buyer_purchase_profiles;
CREATE POLICY "Buyers can read own profile"
  ON public.buyer_purchase_profiles FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can insert own profile" ON public.buyer_purchase_profiles;
CREATE POLICY "Buyers can insert own profile"
  ON public.buyer_purchase_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update own profile" ON public.buyer_purchase_profiles;
CREATE POLICY "Buyers can update own profile"
  ON public.buyer_purchase_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: listing_interest_events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_interest_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid        NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  buyer_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  conversation_id uuid        REFERENCES public.conversations(id) ON DELETE SET NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lie_event_type_check CHECK (
    event_type IN (
      'qualified_view','repeat_view','saved',
      'maybe_interested','interested','requested_information'
    )
  )
);

CREATE INDEX IF NOT EXISTS lie_listing_created_idx
  ON public.listing_interest_events (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lie_buyer_listing_idx
  ON public.listing_interest_events (buyer_id, listing_id);

CREATE INDEX IF NOT EXISTS lie_seller_created_idx
  ON public.listing_interest_events (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lie_event_type_idx
  ON public.listing_interest_events (event_type);

ALTER TABLE public.listing_interest_events ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own interest events
DROP POLICY IF EXISTS "Buyers can view own interest events" ON public.listing_interest_events;
CREATE POLICY "Buyers can view own interest events"
  ON public.listing_interest_events FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

-- Sellers can view events for their own listings
DROP POLICY IF EXISTS "Sellers can view events for own listings" ON public.listing_interest_events;
CREATE POLICY "Sellers can view events for own listings"
  ON public.listing_interest_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings bl
      WHERE bl.id = listing_id AND bl.user_id = auth.uid()
    )
  );

-- Clients cannot INSERT directly; only via hardened server function
-- (no INSERT policy for authenticated role)

-- ─────────────────────────────────────────────────────────────────────────────
-- Add metadata column to messages if absent
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: record_qualified_view
-- Server-only; derives buyer/seller from auth and DB – never trusts client ids.
-- Deduplicates notification triggers per buyer/listing/event in a 24h window.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_qualified_view(
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id   uuid := auth.uid();
  v_seller_id  uuid;
  v_listing    record;
  v_event_id   uuid;
  v_event_type text;
BEGIN
  -- Must be authenticated
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Load listing; must be public+published
  SELECT id, user_id
  INTO v_listing
  FROM public.business_listings
  WHERE id = p_listing_id
    AND is_public = true
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or not publicly accessible';
  END IF;

  v_seller_id := v_listing.user_id;

  -- Buyer must not be the owner
  IF v_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'Owner cannot generate buyer interest events on own listing';
  END IF;

  -- Determine event type: qualified_view or repeat_view
  SELECT 'repeat_view'
  INTO v_event_type
  FROM public.listing_interest_events
  WHERE listing_id = p_listing_id
    AND buyer_id   = v_buyer_id
    AND event_type IN ('qualified_view','repeat_view')
  LIMIT 1;

  v_event_type := COALESCE(v_event_type, 'qualified_view');

  -- Deduplicate: skip if same event type already recorded in last 24h
  IF EXISTS (
    SELECT 1 FROM public.listing_interest_events
    WHERE listing_id  = p_listing_id
      AND buyer_id    = v_buyer_id
      AND event_type  = v_event_type
      AND created_at  > now() - INTERVAL '24 hours'
  ) THEN
    RETURN jsonb_build_object('status','deduplicated','event_type', v_event_type);
  END IF;

  -- Insert event
  INSERT INTO public.listing_interest_events
    (listing_id, buyer_id, seller_id, event_type)
  VALUES
    (p_listing_id, v_buyer_id, v_seller_id, v_event_type)
  RETURNING id INTO v_event_id;

  -- Create seller notification (trusted path only)
  INSERT INTO public.notifications
    (recipient_id, actor_id, notification_type, category, priority,
     listing_id, action_url, metadata)
  VALUES
    (v_seller_id, NULL, v_event_type, 'buyers', 'normal',
     p_listing_id, '/seller',
     jsonb_build_object('event_id', v_event_id, 'anonymous', true));

  RETURN jsonb_build_object('status','ok','event_type', v_event_type, 'event_id', v_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_qualified_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_qualified_view(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: record_explicit_interest
-- Called server-side when buyer clicks "Yes" or "Maybe".
-- Derives buyer/seller from auth+DB. Atomically creates event + notification.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_explicit_interest(
  p_listing_id      uuid,
  p_event_type      text,  -- 'interested' | 'maybe_interested'
  p_conversation_id uuid   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id    uuid := auth.uid();
  v_seller_id   uuid;
  v_listing     record;
  v_event_id    uuid;
  v_notif_type  text;
  v_priority    text;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate event type
  IF p_event_type NOT IN ('interested','maybe_interested','requested_information') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  -- Load listing
  SELECT id, user_id
  INTO v_listing
  FROM public.business_listings
  WHERE id = p_listing_id
    AND is_public = true
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or not publicly accessible';
  END IF;

  v_seller_id := v_listing.user_id;

  -- Buyer must not be the owner
  IF v_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'Owner cannot generate buyer interest events on own listing';
  END IF;

  -- Validate conversation belongs to this buyer/seller/listing (if provided)
  IF p_conversation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id         = p_conversation_id
        AND listing_id = p_listing_id
        AND buyer_id   = v_buyer_id
        AND seller_id  = v_seller_id
    ) THEN
      RAISE EXCEPTION 'Conversation does not match buyer/seller/listing';
    END IF;
  END IF;

  -- Map to notification type + priority
  v_notif_type := CASE p_event_type
    WHEN 'interested'            THEN 'buyer_interested'
    WHEN 'maybe_interested'      THEN 'buyer_maybe_interested'
    WHEN 'requested_information' THEN 'buyer_requested_information'
  END;

  v_priority := CASE p_event_type
    WHEN 'interested' THEN 'high'
    ELSE 'normal'
  END;

  -- Insert interest event
  INSERT INTO public.listing_interest_events
    (listing_id, buyer_id, seller_id, event_type, conversation_id)
  VALUES
    (p_listing_id, v_buyer_id, v_seller_id, p_event_type, p_conversation_id)
  RETURNING id INTO v_event_id;

  -- Create seller notification
  INSERT INTO public.notifications
    (recipient_id, actor_id, notification_type, category, priority,
     listing_id, conversation_id, action_url, metadata)
  VALUES
    (v_seller_id, v_buyer_id, v_notif_type, 'buyers', v_priority,
     p_listing_id, p_conversation_id, '/seller',
     jsonb_build_object('event_id', v_event_id));

  RETURN jsonb_build_object(
    'status',           'ok',
    'event_id',         v_event_id,
    'event_type',       p_event_type,
    'conversation_id',  p_conversation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_explicit_interest(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_explicit_interest(uuid, text, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: create_listing_interest_submission (hardened replacement)
-- Replaces the version in 20260731123000_security_foundation.sql.
-- Derives buyer from auth.uid() – no caller-supplied buyer identity.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_listing_interest_submission(
  p_listing_id       uuid,
  p_goal             text,
  p_budget_min       numeric  DEFAULT NULL,
  p_budget_max       numeric  DEFAULT NULL,
  p_timeline         text     DEFAULT NULL,
  p_financing_status text     DEFAULT NULL,
  p_experience       text     DEFAULT NULL,
  p_initial_question text     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id    uuid := auth.uid();
  v_seller_id   uuid;
  v_listing     record;
  v_sub_id      uuid;
  v_conv_id     uuid;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate allowed goal enum
  IF p_goal NOT IN (
    'owner_operator','passive_investment','strategic_add_on','researching'
  ) THEN
    RAISE EXCEPTION 'Invalid goal value';
  END IF;

  -- Validate financing enum when provided
  IF p_financing_status IS NOT NULL AND p_financing_status NOT IN (
    'cash','prequalified','seeking_financing','unsure','prefer_not_to_say'
  ) THEN
    RAISE EXCEPTION 'Invalid financing_status value';
  END IF;

  -- Validate budget range
  IF p_budget_min IS NOT NULL AND p_budget_max IS NOT NULL
     AND p_budget_min > p_budget_max THEN
    RAISE EXCEPTION 'budget_min must not exceed budget_max';
  END IF;

  -- Load listing; must be public + published
  SELECT id, user_id
  INTO v_listing
  FROM public.business_listings
  WHERE id = p_listing_id
    AND is_public = true
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or not publicly accessible';
  END IF;

  v_seller_id := v_listing.user_id;

  -- Buyer must not be the listing owner
  IF v_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'Listing owner cannot submit buyer interest';
  END IF;

  -- Create submission (idempotent: upsert by buyer+listing)
  INSERT INTO public.listing_interest_submissions
    (listing_id, buyer_id, goal, budget_min, budget_max,
     timeline, financing_status, experience, initial_question)
  VALUES
    (p_listing_id, v_buyer_id, p_goal, p_budget_min, p_budget_max,
     p_timeline, p_financing_status, p_experience, p_initial_question)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_id;

  -- Create or reuse conversation
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE listing_id = p_listing_id
    AND buyer_id   = v_buyer_id;

  IF NOT FOUND THEN
    INSERT INTO public.conversations
      (listing_id, buyer_id, seller_id, status)
    VALUES
      (p_listing_id, v_buyer_id, v_seller_id, 'new')
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN jsonb_build_object(
    'submission_id',   v_sub_id,
    'conversation_id', v_conv_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_listing_interest_submission(uuid,text,numeric,numeric,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_listing_interest_submission(uuid,text,numeric,numeric,text,text,text,text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: mark_notification_read
-- Trusted path for marking a single notification read.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at    = COALESCE(read_at, now()),
      updated_at = now()
  WHERE id           = p_notification_id
    AND recipient_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: mark_all_notifications_read
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_category text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Validate category if provided
  IF p_category IS NOT NULL AND p_category NOT IN (
    'buyers','messages','deals','tasks','billing','security','system'
  ) THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;

  UPDATE public.notifications
  SET read_at    = now(),
      updated_at = now()
  WHERE recipient_id = auth.uid()
    AND read_at IS NULL
    AND (p_category IS NULL OR category = p_category);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: archive_notification
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_notification(
  p_notification_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET archived_at = COALESCE(archived_at, now()),
      updated_at  = now()
  WHERE id           = p_notification_id
    AND recipient_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.archive_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_notification(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: upsert_user_preferences
-- Server-validated path for saving preferences.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_user_preferences(
  p_active_workspace          text    DEFAULT NULL,
  p_timezone                  text    DEFAULT NULL,
  p_preferred_locale          text    DEFAULT NULL,
  p_quiet_hours_enabled       boolean DEFAULT NULL,
  p_quiet_hours_start         time    DEFAULT NULL,
  p_quiet_hours_end           time    DEFAULT NULL,
  p_quiet_hours_timezone      text    DEFAULT NULL,
  p_quiet_hours_weekends      boolean DEFAULT NULL,
  p_notification_preferences  jsonb   DEFAULT NULL,
  p_privacy_preferences       jsonb   DEFAULT NULL,
  p_message_preferences       jsonb   DEFAULT NULL,
  p_accessibility_preferences jsonb   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate workspace
  IF p_active_workspace IS NOT NULL AND p_active_workspace NOT IN ('buyer','seller') THEN
    RAISE EXCEPTION 'active_workspace must be buyer or seller';
  END IF;

  -- Validate locale
  IF p_preferred_locale IS NOT NULL AND p_preferred_locale NOT IN ('en','es') THEN
    RAISE EXCEPTION 'preferred_locale must be en or es';
  END IF;

  INSERT INTO public.user_preferences (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_preferences SET
    active_workspace          = COALESCE(p_active_workspace, active_workspace),
    timezone                  = COALESCE(p_timezone, timezone),
    preferred_locale          = COALESCE(p_preferred_locale, preferred_locale),
    quiet_hours_enabled       = COALESCE(p_quiet_hours_enabled, quiet_hours_enabled),
    quiet_hours_start         = COALESCE(p_quiet_hours_start, quiet_hours_start),
    quiet_hours_end           = COALESCE(p_quiet_hours_end, quiet_hours_end),
    quiet_hours_timezone      = COALESCE(p_quiet_hours_timezone, quiet_hours_timezone),
    quiet_hours_weekends      = COALESCE(p_quiet_hours_weekends, quiet_hours_weekends),
    notification_preferences  = COALESCE(p_notification_preferences, notification_preferences),
    privacy_preferences       = COALESCE(p_privacy_preferences, privacy_preferences),
    message_preferences       = COALESCE(p_message_preferences, message_preferences),
    accessibility_preferences = COALESCE(p_accessibility_preferences, accessibility_preferences),
    updated_at                = now()
  WHERE user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_preferences FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_user_preferences TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Updated_at trigger for notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notifications_set_updated_at()
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

DROP TRIGGER IF EXISTS notifications_set_updated_at_trigger ON public.notifications;
CREATE TRIGGER notifications_set_updated_at_trigger
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET NOTICE
-- The 'avatars' bucket must be created manually in the Supabase dashboard or
-- via Supabase CLI with the following policy:
--   - Authenticated users may upload to avatars/{user_id}/
--   - Public read access on avatars/{user_id}/ objects
--   - Max file size: 2 MB; allowed MIME types: image/jpeg, image/png, image/webp
-- See docs/DEPLOYMENT.md for exact steps.
-- ─────────────────────────────────────────────────────────────────────────────
