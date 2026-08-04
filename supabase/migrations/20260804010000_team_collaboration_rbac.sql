-- ============================================================
-- Team Collaboration + RBAC migration
-- 20260804010000_team_collaboration_rbac.sql
--
-- Forward-only migration:
--   - Adds 'removed' status to business_members
--   - Tightens RLS on business_members and business_member_invitations
--   - Adds least-privilege RLS for collaboration-scoped tables
--   - Adds helper functions with fixed search_path and restricted EXECUTE
--   - Updates business_activity_events to support collaboration audit events
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Ensure search_path is fixed for this migration session
-- ─────────────────────────────────────────────────────────────────────────────
SET search_path = public, pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend business_members status to include 'removed' (soft delete)
--    (backward-compatible: existing 'active'/'suspended' rows unchanged)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop old constraint if it only allowed active/suspended
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bm_status_check'
      AND conrelid = 'public.business_members'::regclass
  ) THEN
    ALTER TABLE public.business_members DROP CONSTRAINT bm_status_check;
  END IF;
END;
$$;

ALTER TABLE public.business_members
  ADD CONSTRAINT bm_status_check CHECK (
    status IN ('active', 'suspended', 'removed')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Helper function: is_business_owner(user_id, business_id)
--    Returns TRUE if the given user is the owner of the business.
--    SECURITY DEFINER to avoid recursive RLS; fixed search_path.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id
      AND owner_id = _user_id
      AND deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Helper function: get_business_member_role(user_id, business_id)
--    Returns the role of a user as an active member of a business,
--    or NULL if not an active member.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_business_member_role(_user_id uuid, _business_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT role FROM public.business_members
  WHERE business_id = _business_id
    AND user_id = _user_id
    AND status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_business_member_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_member_role(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper function: has_business_access(user_id, business_id)
--    Returns TRUE if the user is the owner OR an active member.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_business_access(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    public.is_business_owner(_user_id, _business_id)
    OR EXISTS (
      SELECT 1 FROM public.business_members
      WHERE business_id = _business_id
        AND user_id = _user_id
        AND status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.has_business_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_business_access(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Update RLS on businesses to allow collaborators to SELECT
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners manage own businesses" ON public.businesses;

-- Owners: full CRUD
CREATE POLICY "Owners manage own businesses"
  ON public.businesses
  FOR ALL TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Active members: read only
CREATE POLICY "Active members can view businesses"
  ON public.businesses
  FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Update RLS on business_members
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members visible to owner and members" ON public.business_members;
DROP POLICY IF EXISTS "Business owner manages members" ON public.business_members;
DROP POLICY IF EXISTS "Business owner updates members" ON public.business_members;
DROP POLICY IF EXISTS "Business owner deletes members" ON public.business_members;

-- Owner: full access
CREATE POLICY "Owner manages business_members"
  ON public.business_members
  FOR ALL TO authenticated
  USING  (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

-- Members: read own record and sibling members
CREATE POLICY "Members can view business_members"
  ON public.business_members
  FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Update RLS on business_member_invitations
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.business_member_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owner manages invitations" ON public.business_member_invitations;
DROP POLICY IF EXISTS "Invited user can see own invitation" ON public.business_member_invitations;

-- Owner: full management
CREATE POLICY "Owner manages invitations"
  ON public.business_member_invitations
  FOR ALL TO authenticated
  USING  (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

-- Invited user: can read their own invitation (by email match via profiles)
CREATE POLICY "Invited user can read own invitation"
  ON public.business_member_invitations
  FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Invited user: can update (accept/decline) their own pending invitation
CREATE POLICY "Invited user can update own invitation"
  ON public.business_member_invitations
  FOR UPDATE TO authenticated
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Extend RLS for CRM / customers
--    Assumes table: customers (business_id, user_id/owner fields)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'business_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Business access for customers" ON public.customers';
    EXECUTE $sql$
      CREATE POLICY "Business access for customers"
        ON public.customers
        FOR ALL TO authenticated
        USING (public.has_business_access(auth.uid(), business_id))
        WITH CHECK (public.has_business_access(auth.uid(), business_id))
    $sql$;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Extend RLS for tasks
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Business access for tasks" ON public.tasks;
    CREATE POLICY "Business access for tasks"
      ON public.tasks
      FOR ALL TO authenticated
      USING (
        user_id = auth.uid()
        OR (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id))
      )
      WITH CHECK (
        user_id = auth.uid()
        OR (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id))
      );
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. business_activity_events – allow collaborators to insert audit events
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_activity_events'
  ) THEN
    ALTER TABLE public.business_activity_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Owner reads activity events" ON public.business_activity_events;
    DROP POLICY IF EXISTS "Members insert activity events" ON public.business_activity_events;
    DROP POLICY IF EXISTS "Owner and members read activity" ON public.business_activity_events;

    CREATE POLICY "Business access read activity"
      ON public.business_activity_events
      FOR SELECT TO authenticated
      USING (public.has_business_access(auth.uid(), business_id));

    CREATE POLICY "Business access insert activity"
      ON public.business_activity_events
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND public.has_business_access(auth.uid(), business_id)
      );
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Marketplace listings – owner and published-listing reads
--
-- business_listings is currently user-owned and does not contain business_id.
-- Collaborator access cannot be safely inferred until listings are explicitly
-- associated with a business.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_user_id boolean;
  v_has_is_public boolean;
  v_has_status boolean;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'business_listings'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business_listings' AND column_name = 'user_id'
    ) INTO v_has_user_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business_listings' AND column_name = 'is_public'
    ) INTO v_has_is_public;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business_listings' AND column_name = 'status'
    ) INTO v_has_status;

    IF v_has_user_id AND v_has_is_public AND v_has_status THEN
      EXECUTE 'ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY';
      EXECUTE 'DROP POLICY IF EXISTS "Collaborator read listings" ON public.business_listings';
      EXECUTE 'DROP POLICY IF EXISTS "Owner and public read listings" ON public.business_listings';
      EXECUTE $sql$
        CREATE POLICY "Owner and public read listings"
          ON public.business_listings
          FOR SELECT
          TO authenticated
          USING (
            user_id = auth.uid()
            OR (
              is_public = true
              AND status = 'published'
            )
          )
      $sql$;
    END IF;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Deal rooms – owner and active members
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_seller_id boolean;
  v_has_buyer_id boolean;
  v_has_business_id boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deal_rooms'
  ) THEN
    ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Collaborator access deal_rooms" ON public.deal_rooms;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'deal_rooms' AND column_name = 'seller_id'
    ) INTO v_has_seller_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'deal_rooms' AND column_name = 'buyer_id'
    ) INTO v_has_buyer_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'deal_rooms' AND column_name = 'business_id'
    ) INTO v_has_business_id;

    IF v_has_seller_id AND v_has_buyer_id THEN
      EXECUTE $sql$
        CREATE POLICY "Collaborator access deal_rooms"
          ON public.deal_rooms
          FOR SELECT TO authenticated
          USING (seller_id = auth.uid() OR buyer_id = auth.uid())
      $sql$;
    ELSIF v_has_business_id THEN
      EXECUTE $sql$
        CREATE POLICY "Collaborator access deal_rooms"
          ON public.deal_rooms
          FOR SELECT TO authenticated
          USING (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id))
      $sql$;
    END IF;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
