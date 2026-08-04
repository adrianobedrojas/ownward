-- ============================================================
-- Fix Team RBAC profile email runtime lookup
-- 20260804130000_fix_team_rbac_profile_email.sql
--
-- Forward-only migration that replaces team RBAC functions which
-- incorrectly depended on a non-existent profile email column.
-- ============================================================

SET search_path = public, pg_catalog;

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
    SELECT DISTINCT public.normalize_email(au.email::text) AS email
    FROM auth.users au
    JOIN active_collaborator_users acu ON acu.user_id = au.id
    WHERE au.email IS NOT NULL
      AND public.normalize_email(au.email::text) <> ''
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

  v_user_email := public.normalize_email(coalesce(auth.jwt() ->> 'email', ''));

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

REVOKE ALL ON FUNCTION public.count_owner_collaborator_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_business_invitation_atomic(text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.count_owner_collaborator_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_business_invitation_atomic(text, integer) TO authenticated;
