-- Platform Admin Security Foundation (Phase 1)
-- Hardens platform_admins with sole-owner guardrails, append-only audits,
-- strict RLS, and secure authorization RPCs.

-- Normalize role naming for clarity.
UPDATE public.platform_admins
SET admin_role = 'platform_owner'
WHERE admin_role = 'owner';

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_role_check;

ALTER TABLE public.platform_admins
  ADD CONSTRAINT platform_admins_role_check
  CHECK (admin_role IN ('platform_owner', 'support_admin', 'moderator', 'read_only'));

-- Enforce at most one active platform owner.
CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_single_active_owner_idx
  ON public.platform_admins (active)
  WHERE active = true AND admin_role = 'platform_owner';

-- Enforce ownership guardrails and "exactly one active owner" on all writes.
CREATE OR REPLACE FUNCTION public.platform_admins_enforce_owner_guardrails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT pa.user_id
  INTO v_owner_id
  FROM public.platform_admins pa
  WHERE pa.active = true
    AND pa.admin_role = 'platform_owner'
  LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    IF OLD.active = true AND OLD.admin_role = 'platform_owner' THEN
      RAISE EXCEPTION 'cannot delete active platform owner';
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT / UPDATE guardrails
  IF TG_OP = 'INSERT' THEN
    IF NEW.admin_role = 'platform_owner' AND NEW.active = true THEN
      IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.user_id THEN
        RAISE EXCEPTION 'cannot create or promote another active platform owner';
      END IF;
    ELSIF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'the first platform admin must be an active platform_owner';
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- UPDATE guardrails
  IF OLD.active = true
     AND OLD.admin_role = 'platform_owner'
     AND (NEW.active <> true OR NEW.admin_role <> 'platform_owner' OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'cannot deactivate, demote, or replace the active platform owner';
  END IF;

  IF NEW.admin_role = 'platform_owner' AND NEW.active = true THEN
    IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.user_id THEN
      RAISE EXCEPTION 'cannot create or promote another active platform owner';
    END IF;
  ELSIF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'the first platform admin must be an active platform_owner';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_admins_owner_guardrails_trg ON public.platform_admins;
CREATE TRIGGER platform_admins_owner_guardrails_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.platform_admins
FOR EACH ROW
EXECUTE FUNCTION public.platform_admins_enforce_owner_guardrails();

CREATE OR REPLACE FUNCTION public.platform_admins_assert_exactly_one_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_count integer;
BEGIN
  SELECT count(*)::integer
  INTO v_owner_count
  FROM public.platform_admins pa
  WHERE pa.active = true
    AND pa.admin_role = 'platform_owner';

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION 'exactly one active platform_owner is required (current=%)', v_owner_count;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS platform_admins_exactly_one_owner_trg ON public.platform_admins;
CREATE CONSTRAINT TRIGGER platform_admins_exactly_one_owner_trg
AFTER INSERT OR UPDATE OR DELETE ON public.platform_admins
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION public.platform_admins_assert_exactly_one_owner();

-- Append-only audit trail for platform admin table mutations.
CREATE TABLE IF NOT EXISTS public.platform_admin_audit_events (
  id bigserial PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  old_row jsonb,
  new_row jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_admin_audit_events_event_type_check
    CHECK (event_type IN ('admin_created', 'admin_updated', 'admin_deleted'))
);

CREATE INDEX IF NOT EXISTS platform_admin_audit_events_admin_created_idx
  ON public.platform_admin_audit_events (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_admin_audit_events_actor_created_idx
  ON public.platform_admin_audit_events (actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.platform_admins_write_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.platform_admin_audit_events (
      admin_user_id,
      actor_user_id,
      event_type,
      new_row
    )
    VALUES (
      NEW.user_id,
      v_actor,
      'admin_created',
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.platform_admin_audit_events (
      admin_user_id,
      actor_user_id,
      event_type,
      old_row,
      new_row
    )
    VALUES (
      NEW.user_id,
      v_actor,
      'admin_updated',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.platform_admin_audit_events (
    admin_user_id,
    actor_user_id,
    event_type,
    old_row
  )
  VALUES (
    OLD.user_id,
    v_actor,
    'admin_deleted',
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS platform_admins_audit_trg ON public.platform_admins;
CREATE TRIGGER platform_admins_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON public.platform_admins
FOR EACH ROW
EXECUTE FUNCTION public.platform_admins_write_audit_event();

CREATE OR REPLACE FUNCTION public.platform_admin_audit_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'platform_admin_audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS platform_admin_audit_events_append_only_trg ON public.platform_admin_audit_events;
CREATE TRIGGER platform_admin_audit_events_append_only_trg
BEFORE UPDATE OR DELETE ON public.platform_admin_audit_events
FOR EACH ROW
EXECUTE FUNCTION public.platform_admin_audit_events_append_only();

-- Secure authorization RPCs.
CREATE OR REPLACE FUNCTION public.get_platform_admin_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_active boolean;
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
  v_next_aal text := coalesce(auth.jwt() ->> 'next_aal', v_aal);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'is_admin', false,
      'active', false,
      'admin_role', null,
      'aal', v_aal,
      'next_aal', v_next_aal,
      'is_aal2', false
    );
  END IF;

  SELECT pa.admin_role, pa.active
  INTO v_role, v_active
  FROM public.platform_admins pa
  WHERE pa.user_id = v_uid
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'is_admin', false,
      'active', false,
      'admin_role', null,
      'aal', v_aal,
      'next_aal', v_next_aal,
      'is_aal2', v_aal = 'aal2'
    );
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'is_admin', true,
    'active', coalesce(v_active, false),
    'admin_role', v_role,
    'aal', v_aal,
    'next_aal', v_next_aal,
    'is_aal2', v_aal = 'aal2'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_require_aal2 boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_active boolean;
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT pa.admin_role, pa.active
  INTO v_role, v_active
  FROM public.platform_admins pa
  WHERE pa.user_id = v_uid
  LIMIT 1;

  IF v_role IS NULL OR coalesce(v_active, false) = false THEN
    RETURN false;
  END IF;

  IF p_require_aal2 AND v_aal <> 'aal2' THEN
    RETURN false;
  END IF;

  RETURN v_role IN ('platform_owner', 'support_admin', 'moderator', 'read_only');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(boolean) TO authenticated;

-- Strict RLS and grants for admin tables.
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_admins FROM anon, authenticated;
REVOKE ALL ON TABLE public.platform_admin_audit_events FROM anon, authenticated;

GRANT SELECT ON TABLE public.platform_admins TO authenticated;
GRANT SELECT ON TABLE public.platform_admin_audit_events TO authenticated;

DROP POLICY IF EXISTS "Users view own platform admin row" ON public.platform_admins;
DROP POLICY IF EXISTS "platform_admins_self_read" ON public.platform_admins;
CREATE POLICY "platform_admins_self_read"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "platform_admins_admin_read" ON public.platform_admins;
CREATE POLICY "platform_admins_admin_read"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(true));

DROP POLICY IF EXISTS "platform_admin_audit_events_admin_read" ON public.platform_admin_audit_events;
CREATE POLICY "platform_admin_audit_events_admin_read"
  ON public.platform_admin_audit_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(true));
