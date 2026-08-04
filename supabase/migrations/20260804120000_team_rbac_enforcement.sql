-- ============================================================
-- Team RBAC Enforcement
-- 20260804120000_team_rbac_enforcement.sql
--
-- Forward-only migration that:
--   1) Adds strict RBAC helper functions (fail-closed)
--   2) Adds atomic invitation and seat-enforcement RPCs
--   3) Replaces broad FOR ALL policies with explicit per-operation policies
-- ============================================================

SET search_path = public, pg_catalog;

-- Keep member status model aligned with soft-removal semantics.
DO $$
BEGIN
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
  ADD CONSTRAINT bm_status_check CHECK (status IN ('active', 'suspended', 'removed'));

-- --------------------------------------------------------------------------
-- RBAC helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_email, '')));
$$;

CREATE OR REPLACE FUNCTION public.get_business_role_for_user(
  p_user_id uuid,
  p_business_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_user_id IS NULL OR p_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT 'owner'
  INTO v_role
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.owner_id = p_user_id
    AND b.deleted_at IS NULL
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  SELECT bm.role
  INTO v_role
  FROM public.business_members bm
  WHERE bm.business_id = p_business_id
    AND bm.user_id = p_user_id
    AND bm.status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_business_domain(
  p_user_id uuid,
  p_business_id uuid,
  p_domain text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_business_role_for_user(p_user_id, p_business_id);
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  IF p_domain IN ('workspace', 'crm', 'operations', 'documents', 'listings', 'deal_room', 'health') THEN
    RETURN v_role IN ('manager', 'finance', 'operations', 'viewer');
  END IF;

  IF p_domain IN ('finance', 'valuation', 'sale_readiness') THEN
    RETURN v_role IN ('manager', 'finance', 'viewer');
  END IF;

  IF p_domain = 'team' THEN
    RETURN v_role IN ('manager', 'finance', 'operations', 'viewer');
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_business_domain(
  p_user_id uuid,
  p_business_id uuid,
  p_domain text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_business_role_for_user(p_user_id, p_business_id);
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  IF p_domain = 'workspace' THEN
    RETURN v_role = 'manager';
  END IF;

  IF p_domain IN ('crm', 'operations') THEN
    RETURN v_role IN ('manager', 'operations');
  END IF;

  IF p_domain IN ('finance', 'valuation', 'sale_readiness') THEN
    RETURN v_role IN ('manager', 'finance');
  END IF;

  IF p_domain = 'documents_financial' THEN
    RETURN v_role IN ('manager', 'finance');
  END IF;

  IF p_domain = 'documents_operational' THEN
    RETURN v_role IN ('manager', 'operations');
  END IF;

  IF p_domain = 'documents_general' THEN
    RETURN v_role = 'manager';
  END IF;

  IF p_domain = 'listings' THEN
    RETURN v_role IN ('manager', 'operations');
  END IF;

  IF p_domain = 'deal_room' THEN
    RETURN v_role IN ('manager', 'operations');
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_owner_collaborator_usage(p_owner_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_total integer := 0;
BEGIN
  WITH owner_businesses AS (
    SELECT b.id
    FROM public.businesses b
    WHERE b.owner_id = p_owner_user_id
      AND b.deleted_at IS NULL
  ),
  active_collaborator_users AS (
    SELECT DISTINCT bm.user_id
    FROM public.business_members bm
    JOIN owner_businesses ob ON ob.id = bm.business_id
    WHERE bm.status = 'active'
      AND bm.user_id <> p_owner_user_id
  ),
  active_collaborator_emails AS (
    SELECT DISTINCT public.normalize_email(p.email) AS email
    FROM public.profiles p
    JOIN active_collaborator_users acu ON acu.user_id = p.id
    WHERE p.email IS NOT NULL
      AND public.normalize_email(p.email) <> ''
  ),
  pending_unique_emails AS (
    SELECT DISTINCT public.normalize_email(bmi.email) AS email
    FROM public.business_member_invitations bmi
    JOIN owner_businesses ob ON ob.id = bmi.business_id
    WHERE bmi.status = 'pending'
      AND bmi.expires_at > now()
      AND public.normalize_email(bmi.email) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM active_collaborator_emails ace
        WHERE ace.email = public.normalize_email(bmi.email)
      )
  )
  SELECT
    (SELECT count(*) FROM active_collaborator_users)
    + (SELECT count(*) FROM pending_unique_emails)
  INTO v_total;

  RETURN coalesce(v_total, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_owner_collaborator_quota(p_owner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('team-seat:' || p_owner_user_id::text));
END;
$$;

-- --------------------------------------------------------------------------
-- Transactional invitation + seat enforcement
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_business_invitation_atomic(
  p_business_id uuid,
  p_email text,
  p_role text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_seat_limit integer
)
RETURNS TABLE(ok boolean, invitation_id uuid, error_code text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_used integer;
  v_existing_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'unauthorized', 'Unauthorized';
    RETURN;
  END IF;

  SELECT b.owner_id
  INTO v_owner_id
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.deleted_at IS NULL
  FOR UPDATE;

  IF v_owner_id IS NULL OR v_owner_id <> v_actor THEN
    RETURN QUERY SELECT false, NULL::uuid, 'forbidden', 'Only owners can invite collaborators';
    RETURN;
  END IF;

  PERFORM public.lock_owner_collaborator_quota(v_owner_id);

  SELECT bmi.id
  INTO v_existing_id
  FROM public.business_member_invitations bmi
  WHERE bmi.business_id = p_business_id
    AND public.normalize_email(bmi.email) = public.normalize_email(p_email)
    AND bmi.status = 'pending'
    AND bmi.expires_at > now()
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'duplicate_invite', 'An active invitation already exists for this email';
    RETURN;
  END IF;

  v_used := public.count_owner_collaborator_usage(v_owner_id);
  IF p_seat_limit <= 0 OR v_used >= p_seat_limit THEN
    RETURN QUERY SELECT false, NULL::uuid, 'no_seat', 'Collaborator seat limit reached';
    RETURN;
  END IF;

  INSERT INTO public.business_member_invitations (
    business_id,
    invited_by,
    email,
    role,
    token_hash,
    status,
    expires_at
  ) VALUES (
    p_business_id,
    v_actor,
    public.normalize_email(p_email),
    p_role,
    p_token_hash,
    'pending',
    p_expires_at
  )
  RETURNING id INTO invitation_id;

  RETURN QUERY SELECT true, invitation_id, NULL::text, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_business_member_atomic(
  p_member_id uuid,
  p_business_id uuid,
  p_seat_limit integer
)
RETURNS TABLE(ok boolean, target_user_id uuid, error_code text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_target_user_id uuid;
  v_used integer;
BEGIN
  IF v_actor IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'unauthorized', 'Unauthorized';
    RETURN;
  END IF;

  SELECT b.owner_id
  INTO v_owner_id
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.deleted_at IS NULL
  FOR UPDATE;

  IF v_owner_id IS NULL OR v_owner_id <> v_actor THEN
    RETURN QUERY SELECT false, NULL::uuid, 'forbidden', 'Only owners can reactivate members';
    RETURN;
  END IF;

  SELECT bm.user_id
  INTO v_target_user_id
  FROM public.business_members bm
  WHERE bm.id = p_member_id
    AND bm.business_id = p_business_id
    AND bm.status IN ('suspended', 'removed')
  FOR UPDATE;

  IF v_target_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'not_found', 'Member not found';
    RETURN;
  END IF;

  PERFORM public.lock_owner_collaborator_quota(v_owner_id);

  v_used := public.count_owner_collaborator_usage(v_owner_id);
  IF p_seat_limit <= 0 OR v_used >= p_seat_limit THEN
    RETURN QUERY SELECT false, NULL::uuid, 'no_seat', 'Collaborator seat limit reached';
    RETURN;
  END IF;

  UPDATE public.business_members
  SET status = 'active',
      updated_at = now()
  WHERE id = p_member_id;

  RETURN QUERY SELECT true, v_target_user_id, NULL::text, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_business_invitation_atomic(
  p_token_hash text,
  p_seat_limit integer
)
RETURNS TABLE(ok boolean, business_id uuid, invitation_id uuid, role text, error_code text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_inv public.business_member_invitations%ROWTYPE;
  v_owner_id uuid;
  v_user_email text;
  v_used integer;
BEGIN
  IF v_actor IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text, 'unauthorized', 'Unauthorized';
    RETURN;
  END IF;

  SELECT *
  INTO v_inv
  FROM public.business_member_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text, 'invalid', 'Invitation not found';
    RETURN;
  END IF;

  IF v_inv.status = 'revoked' THEN
    RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'revoked', 'Invitation revoked';
    RETURN;
  END IF;

  IF v_inv.status IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'already_used', 'Invitation already used';
    RETURN;
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'invalid_status', 'Invitation is not pending';
    RETURN;
  END IF;

  IF v_inv.expires_at <= now() THEN
    UPDATE public.business_member_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_inv.id;

    RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'expired', 'Invitation expired';
    RETURN;
  END IF;

  SELECT public.normalize_email(coalesce(p.email, ''))
  INTO v_user_email
  FROM public.profiles p
  WHERE p.id = v_actor
  LIMIT 1;

  IF coalesce(v_user_email, '') = '' THEN
    SELECT public.normalize_email(coalesce(au.email::text, ''))
    INTO v_user_email
    FROM auth.users au
    WHERE au.id = v_actor;
  END IF;

  IF public.normalize_email(v_inv.email) <> v_user_email THEN
    RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'wrong_email', 'Invitation email does not match';
    RETURN;
  END IF;

  SELECT b.owner_id
  INTO v_owner_id
  FROM public.businesses b
  WHERE b.id = v_inv.business_id
    AND b.deleted_at IS NULL
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'business_not_found', 'Business not found';
    RETURN;
  END IF;

  PERFORM public.lock_owner_collaborator_quota(v_owner_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = v_inv.business_id
      AND bm.user_id = v_actor
      AND bm.status = 'active'
  ) THEN
    v_used := public.count_owner_collaborator_usage(v_owner_id);
    IF p_seat_limit <= 0 OR v_used >= p_seat_limit THEN
      RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'no_seat', 'Collaborator seat limit reached';
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.business_members (
    business_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at,
    updated_at
  ) VALUES (
    v_inv.business_id,
    v_actor,
    v_inv.role,
    'active',
    v_inv.invited_by,
    now(),
    now()
  )
  ON CONFLICT (business_id, user_id)
  DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        invited_by = EXCLUDED.invited_by,
        joined_at = coalesce(public.business_members.joined_at, EXCLUDED.joined_at),
        updated_at = now();

  UPDATE public.business_member_invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = v_inv.id;

  INSERT INTO public.business_activity_events (
    user_id,
    business_id,
    event_type,
    source_id,
    source_table,
    metadata,
    occurred_at
  ) VALUES (
    v_actor,
    v_inv.business_id,
    'invitation_accepted',
    v_inv.id,
    'business_member_invitations',
    jsonb_build_object('role', v_inv.role),
    now()
  );

  RETURN QUERY SELECT true, v_inv.business_id, v_inv.id, v_inv.role, NULL::text, NULL::text;
END;
$$;

-- Function permissions
REVOKE ALL ON FUNCTION public.get_business_role_for_user(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_business_domain(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_business_domain(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_owner_collaborator_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_owner_collaborator_quota(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_business_invitation_atomic(uuid, text, text, text, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reactivate_business_member_atomic(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_business_invitation_atomic(text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_business_role_for_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_business_domain(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_business_domain(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_owner_collaborator_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_owner_collaborator_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_invitation_atomic(uuid, text, text, text, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_business_member_atomic(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_business_invitation_atomic(text, integer) TO authenticated;

-- --------------------------------------------------------------------------
-- RLS policies: businesses / membership / invitations
-- --------------------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Active members can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_select" ON public.businesses;
DROP POLICY IF EXISTS "businesses_collaborator_select" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_insert" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_update" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_delete" ON public.businesses;
DROP POLICY IF EXISTS "businesses_manager_update" ON public.businesses;

CREATE POLICY "businesses_owner_select"
  ON public.businesses FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "businesses_collaborator_select"
  ON public.businesses FOR SELECT TO authenticated
  USING (public.can_read_business_domain(auth.uid(), id, 'workspace'));

CREATE POLICY "businesses_owner_insert"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_owner_update"
  ON public.businesses FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_manager_update"
  ON public.businesses FOR UPDATE TO authenticated
  USING (public.can_write_business_domain(auth.uid(), id, 'workspace'))
  WITH CHECK (public.can_write_business_domain(auth.uid(), id, 'workspace'));

CREATE POLICY "businesses_owner_delete"
  ON public.businesses FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages business_members" ON public.business_members;
DROP POLICY IF EXISTS "Members can view business_members" ON public.business_members;
DROP POLICY IF EXISTS "business_members_owner_select" ON public.business_members;
DROP POLICY IF EXISTS "business_members_member_select" ON public.business_members;
DROP POLICY IF EXISTS "business_members_owner_insert" ON public.business_members;
DROP POLICY IF EXISTS "business_members_owner_update" ON public.business_members;
DROP POLICY IF EXISTS "business_members_owner_delete" ON public.business_members;

CREATE POLICY "business_members_owner_select"
  ON public.business_members FOR SELECT TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "business_members_member_select"
  ON public.business_members FOR SELECT TO authenticated
  USING (public.can_read_business_domain(auth.uid(), business_id, 'team'));

CREATE POLICY "business_members_owner_insert"
  ON public.business_members FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "business_members_owner_update"
  ON public.business_members FOR UPDATE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "business_members_owner_delete"
  ON public.business_members FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

ALTER TABLE public.business_member_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages invitations" ON public.business_member_invitations;
DROP POLICY IF EXISTS "Invited user can read own invitation" ON public.business_member_invitations;
DROP POLICY IF EXISTS "Invited user can update own invitation" ON public.business_member_invitations;
DROP POLICY IF EXISTS "business_inv_owner_select" ON public.business_member_invitations;
DROP POLICY IF EXISTS "business_inv_invited_select" ON public.business_member_invitations;
DROP POLICY IF EXISTS "business_inv_owner_insert" ON public.business_member_invitations;
DROP POLICY IF EXISTS "business_inv_owner_update" ON public.business_member_invitations;
DROP POLICY IF EXISTS "business_inv_invited_update" ON public.business_member_invitations;
DROP POLICY IF EXISTS "business_inv_owner_delete" ON public.business_member_invitations;

CREATE POLICY "business_inv_owner_select"
  ON public.business_member_invitations FOR SELECT TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "business_inv_invited_select"
  ON public.business_member_invitations FOR SELECT TO authenticated
  USING (
    public.normalize_email(email) = public.normalize_email(
      coalesce(auth.jwt() ->> 'email', '')
    )
  );

CREATE POLICY "business_inv_owner_insert"
  ON public.business_member_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "business_inv_owner_update"
  ON public.business_member_invitations FOR UPDATE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "business_inv_invited_update"
  ON public.business_member_invitations FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND expires_at > now()
    AND public.normalize_email(email) = public.normalize_email(
      coalesce(auth.jwt() ->> 'email', '')
    )
  )
  WITH CHECK (
    public.normalize_email(email) = public.normalize_email(
      coalesce(auth.jwt() ->> 'email', '')
    )
  );

CREATE POLICY "business_inv_owner_delete"
  ON public.business_member_invitations FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- --------------------------------------------------------------------------
-- RLS policies for business-scoped modules
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_contacts' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "crm_contacts_business_select" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_business_insert" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_business_update" ON public.crm_contacts;
    DROP POLICY IF EXISTS "crm_contacts_business_delete" ON public.crm_contacts;

    CREATE POLICY "crm_contacts_business_select"
      ON public.crm_contacts FOR SELECT TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_read_business_domain(auth.uid(), business_id, 'crm'))
        OR (business_id IS NULL AND owner_user_id = auth.uid())
      );

    CREATE POLICY "crm_contacts_business_insert"
      ON public.crm_contacts FOR INSERT TO authenticated
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'crm'))
        OR (business_id IS NULL AND owner_user_id = auth.uid())
      );

    CREATE POLICY "crm_contacts_business_update"
      ON public.crm_contacts FOR UPDATE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'crm'))
        OR (business_id IS NULL AND owner_user_id = auth.uid())
      )
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'crm'))
        OR (business_id IS NULL AND owner_user_id = auth.uid())
      );

    CREATE POLICY "crm_contacts_business_delete"
      ON public.crm_contacts FOR DELETE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'crm'))
        OR (business_id IS NULL AND owner_user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_milestones' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.business_milestones ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own milestones" ON public.business_milestones;
    DROP POLICY IF EXISTS "milestones_select" ON public.business_milestones;
    DROP POLICY IF EXISTS "milestones_insert" ON public.business_milestones;
    DROP POLICY IF EXISTS "milestones_update" ON public.business_milestones;
    DROP POLICY IF EXISTS "milestones_delete" ON public.business_milestones;

    CREATE POLICY "milestones_select"
      ON public.business_milestones FOR SELECT TO authenticated
      USING (public.can_read_business_domain(auth.uid(), business_id, 'operations'));

    CREATE POLICY "milestones_insert"
      ON public.business_milestones FOR INSERT TO authenticated
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'operations'));

    CREATE POLICY "milestones_update"
      ON public.business_milestones FOR UPDATE TO authenticated
      USING (public.can_write_business_domain(auth.uid(), business_id, 'operations'))
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'operations'));

    CREATE POLICY "milestones_delete"
      ON public.business_milestones FOR DELETE TO authenticated
      USING (public.can_write_business_domain(auth.uid(), business_id, 'operations'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_health_assessments' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.business_health_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own health assessments" ON public.business_health_assessments;
    DROP POLICY IF EXISTS "bha_select" ON public.business_health_assessments;
    DROP POLICY IF EXISTS "bha_insert" ON public.business_health_assessments;
    DROP POLICY IF EXISTS "bha_update" ON public.business_health_assessments;
    DROP POLICY IF EXISTS "bha_delete" ON public.business_health_assessments;

    CREATE POLICY "bha_select"
      ON public.business_health_assessments FOR SELECT TO authenticated
      USING (public.can_read_business_domain(auth.uid(), business_id, 'health'));

    CREATE POLICY "bha_insert"
      ON public.business_health_assessments FOR INSERT TO authenticated
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'workspace'));

    CREATE POLICY "bha_update"
      ON public.business_health_assessments FOR UPDATE TO authenticated
      USING (public.can_write_business_domain(auth.uid(), business_id, 'workspace'))
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'workspace'));

    CREATE POLICY "bha_delete"
      ON public.business_health_assessments FOR DELETE TO authenticated
      USING (public.is_business_owner(auth.uid(), business_id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sale_readiness_assessments' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.sale_readiness_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own sale readiness" ON public.sale_readiness_assessments;
    DROP POLICY IF EXISTS "sra_select" ON public.sale_readiness_assessments;
    DROP POLICY IF EXISTS "sra_insert" ON public.sale_readiness_assessments;
    DROP POLICY IF EXISTS "sra_update" ON public.sale_readiness_assessments;
    DROP POLICY IF EXISTS "sra_delete" ON public.sale_readiness_assessments;

    CREATE POLICY "sra_select"
      ON public.sale_readiness_assessments FOR SELECT TO authenticated
      USING (public.can_read_business_domain(auth.uid(), business_id, 'sale_readiness'));

    CREATE POLICY "sra_insert"
      ON public.sale_readiness_assessments FOR INSERT TO authenticated
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'sale_readiness'));

    CREATE POLICY "sra_update"
      ON public.sale_readiness_assessments FOR UPDATE TO authenticated
      USING (public.can_write_business_domain(auth.uid(), business_id, 'sale_readiness'))
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'sale_readiness'));

    CREATE POLICY "sra_delete"
      ON public.sale_readiness_assessments FOR DELETE TO authenticated
      USING (public.is_business_owner(auth.uid(), business_id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'valuation_reports' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.valuation_reports ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own valuation reports" ON public.valuation_reports;
    DROP POLICY IF EXISTS "valuation_select" ON public.valuation_reports;
    DROP POLICY IF EXISTS "valuation_insert" ON public.valuation_reports;
    DROP POLICY IF EXISTS "valuation_update" ON public.valuation_reports;
    DROP POLICY IF EXISTS "valuation_delete" ON public.valuation_reports;

    CREATE POLICY "valuation_select"
      ON public.valuation_reports FOR SELECT TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_read_business_domain(auth.uid(), business_id, 'valuation'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "valuation_insert"
      ON public.valuation_reports FOR INSERT TO authenticated
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'valuation'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "valuation_update"
      ON public.valuation_reports FOR UPDATE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'valuation'))
        OR (business_id IS NULL AND user_id = auth.uid())
      )
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'valuation'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "valuation_delete"
      ON public.valuation_reports FOR DELETE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.is_business_owner(auth.uid(), business_id))
        OR (business_id IS NULL AND user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
    DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
    DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
    DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;

    CREATE POLICY "transactions_select"
      ON public.transactions FOR SELECT TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_read_business_domain(auth.uid(), business_id, 'finance'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "transactions_insert"
      ON public.transactions FOR INSERT TO authenticated
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'finance'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "transactions_update"
      ON public.transactions FOR UPDATE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'finance'))
        OR (business_id IS NULL AND user_id = auth.uid())
      )
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'finance'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "transactions_delete"
      ON public.transactions FOR DELETE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'finance'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own documents" ON public.documents;
    DROP POLICY IF EXISTS "documents_select" ON public.documents;
    DROP POLICY IF EXISTS "documents_insert" ON public.documents;
    DROP POLICY IF EXISTS "documents_update" ON public.documents;
    DROP POLICY IF EXISTS "documents_delete" ON public.documents;

    CREATE POLICY "documents_select"
      ON public.documents FOR SELECT TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_read_business_domain(auth.uid(), business_id, 'documents'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "documents_insert"
      ON public.documents FOR INSERT TO authenticated
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'documents_general'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "documents_update"
      ON public.documents FOR UPDATE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'documents_general'))
        OR (business_id IS NULL AND user_id = auth.uid())
      )
      WITH CHECK (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'documents_general'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "documents_delete"
      ON public.documents FOR DELETE TO authenticated
      USING (
        (business_id IS NOT NULL AND public.can_write_business_domain(auth.uid(), business_id, 'documents_general'))
        OR (business_id IS NULL AND user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
    DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
    DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
    DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
    DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

    CREATE POLICY "tasks_select"
      ON public.tasks FOR SELECT TO authenticated
      USING (public.can_read_business_domain(auth.uid(), business_id, 'operations'));

    CREATE POLICY "tasks_insert"
      ON public.tasks FOR INSERT TO authenticated
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'operations'));

    CREATE POLICY "tasks_update"
      ON public.tasks FOR UPDATE TO authenticated
      USING (public.can_write_business_domain(auth.uid(), business_id, 'operations'))
      WITH CHECK (public.can_write_business_domain(auth.uid(), business_id, 'operations'));

    CREATE POLICY "tasks_delete"
      ON public.tasks FOR DELETE TO authenticated
      USING (public.can_write_business_domain(auth.uid(), business_id, 'operations'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_activity_events' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.business_activity_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own activity events" ON public.business_activity_events;
    DROP POLICY IF EXISTS "Team members view business activity" ON public.business_activity_events;
    DROP POLICY IF EXISTS "Business access read activity" ON public.business_activity_events;
    DROP POLICY IF EXISTS "Business access insert activity" ON public.business_activity_events;
    DROP POLICY IF EXISTS "activity_select" ON public.business_activity_events;
    DROP POLICY IF EXISTS "activity_insert" ON public.business_activity_events;

    CREATE POLICY "activity_select"
      ON public.business_activity_events FOR SELECT TO authenticated
      USING (public.can_read_business_domain(auth.uid(), business_id, 'workspace'));

    CREATE POLICY "activity_insert"
      ON public.business_activity_events FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND public.can_read_business_domain(auth.uid(), business_id, 'workspace')
      );
  END IF;
END;
$$;

DO $$
DECLARE
  v_has_user_id boolean;
  v_has_is_public boolean;
  v_has_status boolean;
BEGIN
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

    EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own listings" ON public.business_listings';
    EXECUTE 'DROP POLICY IF EXISTS "Collaborator read listings" ON public.business_listings';
    EXECUTE 'DROP POLICY IF EXISTS "Owner and public read listings" ON public.business_listings';
    EXECUTE 'DROP POLICY IF EXISTS "listing_owner_select" ON public.business_listings';
    EXECUTE 'DROP POLICY IF EXISTS "listing_owner_insert" ON public.business_listings';
    EXECUTE 'DROP POLICY IF EXISTS "listing_owner_update" ON public.business_listings';
    EXECUTE 'DROP POLICY IF EXISTS "listing_owner_delete" ON public.business_listings';

    EXECUTE $sql$
      CREATE POLICY "listing_owner_select"
        ON public.business_listings FOR SELECT TO authenticated
        USING (
          user_id = auth.uid()
          OR (is_public = true AND status = 'published')
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "listing_owner_insert"
        ON public.business_listings FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "listing_owner_update"
        ON public.business_listings FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "listing_owner_delete"
        ON public.business_listings FOR DELETE TO authenticated
        USING (user_id = auth.uid())
    $sql$;
  END IF;
END;
$$;
