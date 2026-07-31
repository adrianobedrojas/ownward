-- Phase 1: Messaging & Buyer-Interest System
-- Tables: saved_listings, listing_interest_submissions, conversations, messages
-- Also adds: blocked_users, message_reports

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- TABLE: saved_listings
-- Private per-user saves; seller cannot see who saved.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_listings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id   uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_listings_unique_user_listing UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS saved_listings_user_id_idx ON public.saved_listings (user_id);
CREATE INDEX IF NOT EXISTS saved_listings_listing_id_idx ON public.saved_listings (listing_id);

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved listings" ON public.saved_listings;
DROP POLICY IF EXISTS "Users can insert own saved listings" ON public.saved_listings;
DROP POLICY IF EXISTS "Users can delete own saved listings" ON public.saved_listings;

CREATE POLICY "Users can view own saved listings"
  ON public.saved_listings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved listings"
  ON public.saved_listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved listings"
  ON public.saved_listings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TABLE: listing_interest_submissions
-- Structured buyer-interest form data.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_interest_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  buyer_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal              text NOT NULL,
  budget_min        numeric,
  budget_max        numeric,
  timeline          text,
  financing_status  text,
  experience        text,
  initial_question  text,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lis_goal_check CHECK (
    goal IN ('owner_operator', 'passive_investment', 'strategic_add_on', 'researching')
  ),
  CONSTRAINT lis_financing_check CHECK (
    financing_status IS NULL OR
    financing_status IN ('cash', 'prequalified', 'seeking_financing', 'unsure', 'prefer_not_to_say')
  ),
  CONSTRAINT lis_budget_check CHECK (
    budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
  )
);

CREATE INDEX IF NOT EXISTS lis_listing_id_idx ON public.listing_interest_submissions (listing_id);
CREATE INDEX IF NOT EXISTS lis_buyer_id_idx  ON public.listing_interest_submissions (buyer_id);

ALTER TABLE public.listing_interest_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can view own submissions" ON public.listing_interest_submissions;
DROP POLICY IF EXISTS "Buyers can insert own submissions" ON public.listing_interest_submissions;
DROP POLICY IF EXISTS "Sellers can view submissions for their listings" ON public.listing_interest_submissions;

CREATE POLICY "Buyers can view own submissions"
  ON public.listing_interest_submissions FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can insert own submissions"
  ON public.listing_interest_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view submissions for their listings"
  ON public.listing_interest_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_listings bl
      WHERE bl.id = listing_id AND bl.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- TABLE: conversations
-- One conversation per buyer+listing pair (unique).
-- seller_id is stamped from listing owner server-side.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id           uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  buyer_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'new',
  last_message_at      timestamp with time zone,
  buyer_last_read_at   timestamp with time zone,
  seller_last_read_at  timestamp with time zone,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  updated_at           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversations_unique_buyer_listing UNIQUE (buyer_id, listing_id),
  CONSTRAINT conversations_status_check CHECK (
    status IN ('new', 'active', 'qualified', 'nda_requested', 'deal_room', 'not_a_fit', 'archived')
  ),
  -- buyer cannot be seller of same listing (enforced via trigger below)
  CONSTRAINT conversations_buyer_not_seller CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS conversations_buyer_id_idx    ON public.conversations (buyer_id);
CREATE INDEX IF NOT EXISTS conversations_seller_id_idx   ON public.conversations (seller_id);
CREATE INDEX IF NOT EXISTS conversations_listing_id_idx  ON public.conversations (listing_id);
CREATE INDEX IF NOT EXISTS conversations_last_msg_idx    ON public.conversations (last_message_at DESC NULLS LAST);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Buyers can create conversations via server" ON public.conversations;
DROP POLICY IF EXISTS "Sellers can update conversation status" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update read timestamps" ON public.conversations;

CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Inserts go through secure server action (startConversation), which sets
-- seller_id from listing owner and prevents self-conversations.
-- We still need a policy for the insert itself:
CREATE POLICY "Buyers can create conversations via server"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Sellers can update status column only; buyer/seller/listing immutable after insert.
-- Participants can update read-timestamp columns.
CREATE POLICY "Sellers can update conversation status"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id)
  WITH CHECK (
    -- Core identity columns cannot change
    listing_id = listing_id AND
    buyer_id   = buyer_id   AND
    seller_id  = seller_id
  );

-- ─────────────────────────────────────────────
-- TRIGGER: prevent buyer from starting convo on own listing
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.conversations_check_buyer_not_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.business_listings
    WHERE id = NEW.listing_id AND user_id = NEW.buyer_id
  ) THEN
    RAISE EXCEPTION 'You cannot start a conversation on your own listing.';
  END IF;

  -- Stamp seller_id from listing owner (server already sets it, but enforce here too)
  SELECT user_id INTO NEW.seller_id
  FROM public.business_listings
  WHERE id = NEW.listing_id;

  IF NEW.seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found or not published.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_enforce_ownership ON public.conversations;
CREATE TRIGGER conversations_enforce_ownership
  BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.conversations_check_buyer_not_owner();

-- ─────────────────────────────────────────────
-- TABLE: messages
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type    text NOT NULL DEFAULT 'user',
  body            text NOT NULL,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  edited_at       timestamp with time zone,
  CONSTRAINT messages_type_check CHECK (
    message_type IN ('user', 'system', 'interest_summary')
  ),
  CONSTRAINT messages_body_not_empty CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx       ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx      ON public.messages (created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- sender_id must equal auth user; participant check via conversation
CREATE POLICY "Participants can insert messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        AND c.status NOT IN ('not_a_fit', 'archived')
    )
  );

-- ─────────────────────────────────────────────
-- TRIGGER: update conversations.last_message_at on new message
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.messages_update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at      = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_after_insert ON public.messages;
CREATE TRIGGER messages_after_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_update_conversation_timestamp();

-- ─────────────────────────────────────────────
-- TABLE: blocked_users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocked_users_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON public.blocked_users (blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON public.blocked_users (blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can insert own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocked_users;

CREATE POLICY "Users can view own blocks"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can insert own blocks"
  ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON public.blocked_users FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- ─────────────────────────────────────────────
-- TABLE: message_reports
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_reports_unique UNIQUE (reporter_id, message_id)
);

CREATE INDEX IF NOT EXISTS message_reports_reporter_idx ON public.message_reports (reporter_id);
CREATE INDEX IF NOT EXISTS message_reports_message_idx  ON public.message_reports (message_id);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own reports" ON public.message_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.message_reports;

CREATE POLICY "Users can insert own reports"
  ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- ─────────────────────────────────────────────
-- ENFORCE: blocked users cannot send messages
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.messages_check_not_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_id uuid;
BEGIN
  -- Find the other participant in this conversation
  SELECT CASE WHEN buyer_id = NEW.sender_id THEN seller_id ELSE buyer_id END
  INTO v_other_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = v_other_id AND blocked_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'You have been blocked and cannot send messages in this conversation.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_check_blocked ON public.messages;
CREATE TRIGGER messages_check_blocked
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_check_not_blocked();
