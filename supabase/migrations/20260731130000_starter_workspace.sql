-- ============================================================
-- Starter workspace migration
-- Adds: business workspace extension, active_business_id,
--       business_milestones, business_health_assessments,
--       support_requests
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend public.businesses with workspace fields (backward-compatible)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS industry           text,
  ADD COLUMN IF NOT EXISTS location           text,
  ADD COLUMN IF NOT EXISTS website            text,
  ADD COLUMN IF NOT EXISTS year_established   integer,
  ADD COLUMN IF NOT EXISTS business_stage     text,
  ADD COLUMN IF NOT EXISTS business_model     text,
  ADD COLUMN IF NOT EXISTS primary_customer   text,
  ADD COLUMN IF NOT EXISTS employee_count     integer,
  ADD COLUMN IF NOT EXISTS annual_revenue     numeric(18, 2),
  ADD COLUMN IF NOT EXISTS owner_role         text,
  ADD COLUMN IF NOT EXISTS profile_completion integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at         timestamptz;

-- business_stage allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'businesses_business_stage_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_business_stage_check CHECK (
        business_stage IS NULL OR business_stage IN (
          'idea', 'pre_revenue', 'early', 'growth', 'established', 'mature', 'exit_ready'
        )
      );
  END IF;
END
$$;

-- indexes for workspace queries (use owner_id — the correct ownership column)
CREATE INDEX IF NOT EXISTS businesses_owner_id_idx
  ON public.businesses (owner_id);

CREATE INDEX IF NOT EXISTS businesses_owner_deleted_idx
  ON public.businesses (owner_id, deleted_at)
  WHERE deleted_at IS NULL;

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.businesses_set_updated_at()
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

DROP TRIGGER IF EXISTS businesses_set_updated_at_trigger ON public.businesses;
CREATE TRIGGER businesses_set_updated_at_trigger
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Active-business selector in profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_business_id uuid
    REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_active_business_idx
  ON public.profiles (active_business_id)
  WHERE active_business_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Business Milestones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_milestones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  category     text NOT NULL DEFAULT 'custom',
  status       text NOT NULL DEFAULT 'planned',
  milestone_date date,
  target_date  date,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT bm_category_check CHECK (
    category IN (
      'formation', 'finance', 'customer', 'operations',
      'marketing', 'team', 'growth', 'sale_readiness', 'custom'
    )
  ),
  CONSTRAINT bm_status_check CHECK (
    status IN ('planned', 'in_progress', 'completed', 'paused')
  )
);

-- indexes for quota queries (must include soft-deleted for monthly count)
CREATE INDEX IF NOT EXISTS bm_user_business_idx
  ON public.business_milestones (user_id, business_id);

-- monthly milestone count includes soft-deleted rows (per spec)
CREATE INDEX IF NOT EXISTS bm_user_created_idx
  ON public.business_milestones (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bm_status_idx
  ON public.business_milestones (user_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.business_milestones ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own milestones
DROP POLICY IF EXISTS "Users manage own milestones" ON public.business_milestones;
CREATE POLICY "Users manage own milestones"
  ON public.business_milestones
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.business_milestones_set_updated_at()
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

DROP TRIGGER IF EXISTS bm_set_updated_at_trigger ON public.business_milestones;
CREATE TRIGGER bm_set_updated_at_trigger
  BEFORE UPDATE ON public.business_milestones
  FOR EACH ROW EXECUTE FUNCTION public.business_milestones_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Business Health Assessments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_health_assessments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id         uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  assessment_version  text NOT NULL DEFAULT '1',
  answers             jsonb NOT NULL DEFAULT '{}',
  category_scores     jsonb,
  overall_score       integer,
  recommendations     jsonb,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bha_user_business_idx
  ON public.business_health_assessments (user_id, business_id, created_at DESC);

ALTER TABLE public.business_health_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own health assessments" ON public.business_health_assessments;
CREATE POLICY "Users manage own health assessments"
  ON public.business_health_assessments
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Support Requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category          text,
  subject           text NOT NULL,
  message           text NOT NULL,
  plan_at_submission text,
  status            text NOT NULL DEFAULT 'submitted',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sr_status_check CHECK (
    status IN ('submitted', 'reviewing', 'awaiting_user', 'resolved')
  )
);

CREATE INDEX IF NOT EXISTS sr_user_created_idx
  ON public.support_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sr_status_idx
  ON public.support_requests (status, created_at DESC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own requests only
-- (admin access is handled server-side with service role)
DROP POLICY IF EXISTS "Users create own support requests" ON public.support_requests;
CREATE POLICY "Users create own support requests"
  ON public.support_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own support requests" ON public.support_requests;
CREATE POLICY "Users view own support requests"
  ON public.support_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.support_requests_set_updated_at()
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

DROP TRIGGER IF EXISTS sr_set_updated_at_trigger ON public.support_requests;
CREATE TRIGGER sr_set_updated_at_trigger
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.support_requests_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Add report_level to valuation_reports for tier enforcement
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.valuation_reports
  ADD COLUMN IF NOT EXISTS report_level text NOT NULL DEFAULT 'basic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valuation_reports_report_level_check'
      AND conrelid = 'public.valuation_reports'::regclass
  ) THEN
    ALTER TABLE public.valuation_reports
      ADD CONSTRAINT valuation_reports_report_level_check CHECK (
        report_level IN ('preview', 'basic', 'detailed', 'enhanced')
      );
  END IF;
END
$$;

-- Existing rows default to 'basic' which is the safe conservative default
