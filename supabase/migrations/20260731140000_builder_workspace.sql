-- ============================================================
-- Builder workspace migration
-- Adds: CRM (crm_contacts, crm_activities), team collaboration
--       (business_members, business_member_invitations), task
--       extensions, goal progress history, and repairs the
--       businesses owner_id/user_id index mismatch.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Repair businesses ownership indexes
--    The starter migration created indexes on user_id; app code
--    consistently uses owner_id as the owner column.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop incorrect user_id indexes if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'businesses'
      AND indexname  = 'businesses_user_id_idx'
  ) THEN
    DROP INDEX public.businesses_user_id_idx;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'businesses'
      AND indexname  = 'businesses_deleted_idx'
  ) THEN
    DROP INDEX public.businesses_deleted_idx;
  END IF;
END
$$;

-- Create correct owner_id indexes
CREATE INDEX IF NOT EXISTS businesses_owner_id_idx
  ON public.businesses (owner_id);

CREATE INDEX IF NOT EXISTS businesses_owner_deleted_idx
  ON public.businesses (owner_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Ensure RLS policy on businesses uses owner_id (idempotent drop/create)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own businesses" ON public.businesses;
CREATE POLICY "Users manage own businesses"
  ON public.businesses
  FOR ALL TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend tasks table (backward-compatible)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS business_id          uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_member_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_goal_id      uuid,
  ADD COLUMN IF NOT EXISTS related_contact_id   uuid,
  ADD COLUMN IF NOT EXISTS related_milestone_id uuid,
  ADD COLUMN IF NOT EXISTS completed_at         timestamptz;

-- Widen status check to include new statuses (drop old, add new)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_status_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
  END IF;
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_status_check CHECK (
      status IN ('todo', 'in_progress', 'blocked', 'completed')
    );
END
$$;

CREATE INDEX IF NOT EXISTS tasks_business_idx
  ON public.tasks (business_id)
  WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_user_business_idx
  ON public.tasks (user_id, business_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Goal progress history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goal_progress_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES public.growth_goals(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress    integer NOT NULL CHECK (progress BETWEEN 0 AND 100),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gpu_goal_created_idx
  ON public.goal_progress_updates (goal_id, created_at DESC);

ALTER TABLE public.goal_progress_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goal progress" ON public.goal_progress_updates;
CREATE POLICY "Users manage own goal progress"
  ON public.goal_progress_updates
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CRM contacts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id         uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  record_type         text NOT NULL DEFAULT 'lead',
  name                text NOT NULL,
  company             text,
  email               text,
  phone               text,
  source              text,
  stage               text NOT NULL DEFAULT 'new',
  estimated_value     numeric(18, 2),
  probability         integer,
  next_follow_up_at   timestamptz,
  last_contacted_at   timestamptz,
  assigned_member_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,

  CONSTRAINT crm_contacts_record_type_check CHECK (
    record_type IN ('lead', 'customer')
  ),
  CONSTRAINT crm_contacts_stage_check CHECK (
    stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')
  ),
  CONSTRAINT crm_contacts_probability_check CHECK (
    probability IS NULL OR probability BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS crm_contacts_owner_idx
  ON public.crm_contacts (owner_user_id);

CREATE INDEX IF NOT EXISTS crm_contacts_business_idx
  ON public.crm_contacts (business_id)
  WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_stage_idx
  ON public.crm_contacts (owner_user_id, stage)
  WHERE deleted_at IS NULL;

-- Active leads count index (for quota enforcement)
CREATE INDEX IF NOT EXISTS crm_contacts_active_leads_idx
  ON public.crm_contacts (owner_user_id, record_type, deleted_at)
  WHERE record_type = 'lead' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_follow_up_idx
  ON public.crm_contacts (owner_user_id, next_follow_up_at)
  WHERE deleted_at IS NULL AND next_follow_up_at IS NOT NULL;

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own CRM contacts" ON public.crm_contacts;
CREATE POLICY "Users manage own CRM contacts"
  ON public.crm_contacts
  FOR ALL TO authenticated
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.crm_contacts_set_updated_at()
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

DROP TRIGGER IF EXISTS crm_contacts_set_updated_at_trigger ON public.crm_contacts;
CREATE TRIGGER crm_contacts_set_updated_at_trigger
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CRM activities
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  business_id   uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  subject       text,
  notes         text,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crm_activities_type_check CHECK (
    activity_type IN ('note', 'call', 'email', 'meeting', 'task', 'stage_change', 'conversion')
  )
);

CREATE INDEX IF NOT EXISTS crm_activities_contact_idx
  ON public.crm_activities (contact_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS crm_activities_actor_idx
  ON public.crm_activities (actor_user_id);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Activities visible to the contact owner
DROP POLICY IF EXISTS "Contact owner manages activities" ON public.crm_activities;
CREATE POLICY "Contact owner manages activities"
  ON public.crm_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_contacts c
      WHERE c.id = crm_activities.contact_id
        AND c.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_contacts c
      WHERE c.id = crm_activities.contact_id
        AND c.owner_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Business team members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer',
  status      text NOT NULL DEFAULT 'active',
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (business_id, user_id),

  CONSTRAINT bm_role_check CHECK (
    role IN ('owner', 'manager', 'finance', 'operations', 'viewer')
  ),
  CONSTRAINT bm_status_check CHECK (
    status IN ('active', 'suspended')
  )
);

CREATE INDEX IF NOT EXISTS business_members_business_idx
  ON public.business_members (business_id);

CREATE INDEX IF NOT EXISTS business_members_user_idx
  ON public.business_members (user_id);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Business owner and active members can see membership
DROP POLICY IF EXISTS "Business members visible to owner and members" ON public.business_members;
CREATE POLICY "Business members visible to owner and members"
  ON public.business_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Only business owner can manage membership
DROP POLICY IF EXISTS "Business owner manages members" ON public.business_members;
CREATE POLICY "Business owner manages members"
  ON public.business_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owner updates members" ON public.business_members;
CREATE POLICY "Business owner updates members"
  ON public.business_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owner deletes members" ON public.business_members;
CREATE POLICY "Business owner deletes members"
  ON public.business_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Business member invitations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_member_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'viewer',
  token_hash      text NOT NULL UNIQUE,
  status          text NOT NULL DEFAULT 'pending',
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     timestamptz,
  declined_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bmi_role_check CHECK (
    role IN ('manager', 'finance', 'operations', 'viewer')
  ),
  CONSTRAINT bmi_status_check CHECK (
    status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')
  )
);

CREATE INDEX IF NOT EXISTS bmi_business_idx
  ON public.business_member_invitations (business_id, status);

CREATE INDEX IF NOT EXISTS bmi_email_idx
  ON public.business_member_invitations (email, status);

-- Active invitations count for seat limit enforcement
CREATE INDEX IF NOT EXISTS bmi_active_idx
  ON public.business_member_invitations (business_id)
  WHERE status = 'pending';

ALTER TABLE public.business_member_invitations ENABLE ROW LEVEL SECURITY;

-- Business owner can manage invitations
DROP POLICY IF EXISTS "Business owner manages invitations" ON public.business_member_invitations;
CREATE POLICY "Business owner manages invitations"
  ON public.business_member_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_member_invitations.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_member_invitations.business_id
        AND b.owner_id = auth.uid()
    )
  );
