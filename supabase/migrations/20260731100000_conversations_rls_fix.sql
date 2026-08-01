-- ─────────────────────────────────────────────────────────────────────────────
-- Corrective migration: fix conversations UPDATE RLS policy.
--
-- The previous policy in 20260731090000_messaging_phase1.sql used:
--   WITH CHECK (listing_id = listing_id AND buyer_id = buyer_id AND seller_id = seller_id)
-- which compares each column to itself (always evaluates to TRUE) and does not
-- actually prevent those values from being changed.
--
-- This migration:
--   1. Drops the broken policy.
--   2. Adds a BEFORE UPDATE trigger that rejects any attempt to change
--      listing_id, buyer_id, or seller_id, and prevents buyers from changing
--      the conversation status.
--   3. Replaces the single combined policy with two tighter policies so that
--      each participant can update only the columns they are authorised to
--      change.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: drop the broken policy from the phase-1 migration.
DROP POLICY IF EXISTS "Sellers can update conversation status" ON public.conversations;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: BEFORE UPDATE trigger – column-level immutability + role enforcement
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.conversations_enforce_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- listing_id, buyer_id, seller_id are immutable after INSERT
  IF NEW.listing_id IS DISTINCT FROM OLD.listing_id THEN
    RAISE EXCEPTION 'listing_id cannot be changed after a conversation is created.';
  END IF;
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
    RAISE EXCEPTION 'buyer_id cannot be changed after a conversation is created.';
  END IF;
  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    RAISE EXCEPTION 'seller_id cannot be changed after a conversation is created.';
  END IF;

  -- Buyers are not authorised to change conversation status
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() = OLD.buyer_id THEN
    RAISE EXCEPTION 'Buyers are not permitted to change conversation status.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_enforce_update ON public.conversations;
CREATE TRIGGER conversations_enforce_update
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.conversations_enforce_update_rules();

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: tighter replacement UPDATE policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Seller may update status, updated_at, and seller_last_read_at.
-- The trigger prevents them from touching listing_id / buyer_id / seller_id.
CREATE POLICY "Seller can update conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING  (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Buyer may update buyer_last_read_at only.
-- The trigger prevents them from changing status or immutable columns.
CREATE POLICY "Buyer can update conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING  (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);
