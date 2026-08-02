-- ============================================================
-- Pro workspace migration
-- 20260731150000_pro_workspace.sql
--
-- Adds all Pro-plan tables and extends existing tables.
-- All changes are additive/backward-compatible.
-- Existing rows and columns are preserved.
--
-- Tables added:
--   sale_readiness_assessments
--   sale_readiness_evidence
--   customer_revenue_records
--   customer_concentration_snapshots
--   valuation_refreshes
--   seller_pipeline_opportunities
--   seller_offers
--   deal_room_checklist_items
--   deal_room_document_versions
--   deal_room_access_events
--   business_activity_events
--   storage_usage_ledger
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Sale-Readiness Assessments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_readiness_assessments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Overall score (0–100)
  overall_score         integer NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  stage                 text NOT NULL CHECK (
    stage IN ('early_preparation', 'building_readiness', 'approaching_market', 'buyer_ready')
  ),

  -- Raw input snapshot (immutable)
  input_snapshot        jsonb NOT NULL DEFAULT '{}',

  -- Category results
  category_results      jsonb NOT NULL DEFAULT '[]',

  -- Strongest/weakest categories
  strongest_category    text,
  weakest_category      text,

  -- Delta from previous snapshot
  delta_from_previous   integer,

  -- Metadata
  scored_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- Soft delete (assessments are immutable; not truly deleted)
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS sra_user_business_idx
  ON public.sale_readiness_assessments (user_id, business_id, scored_at DESC);

CREATE INDEX IF NOT EXISTS sra_business_idx
  ON public.sale_readiness_assessments (business_id, scored_at DESC);

ALTER TABLE public.sale_readiness_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own assessments" ON public.sale_readiness_assessments;
CREATE POLICY "Users manage own assessments"
  ON public.sale_readiness_assessments
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Sale-Readiness Evidence
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_readiness_evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  assessment_id   uuid REFERENCES public.sale_readiness_assessments(id) ON DELETE SET NULL,

  category        text NOT NULL,
  evidence_key    text NOT NULL, -- e.g. 'hasThreeYearFinancials'
  source_type     text NOT NULL CHECK (
    source_type IN ('derived', 'user_entered', 'document', 'unverified')
  ),
  value_bool      boolean,
  value_numeric   numeric(18, 4),
  value_text      text,
  document_id     uuid, -- optional link to documents table
  notes           text,

  collected_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS sre_business_category_idx
  ON public.sale_readiness_evidence (business_id, category, collected_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS sre_user_idx
  ON public.sale_readiness_evidence (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.sale_readiness_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own evidence" ON public.sale_readiness_evidence;
CREATE POLICY "Users manage own evidence"
  ON public.sale_readiness_evidence
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sre_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS sre_set_updated_at_trigger ON public.sale_readiness_evidence;
CREATE TRIGGER sre_set_updated_at_trigger
  BEFORE UPDATE ON public.sale_readiness_evidence
  FOR EACH ROW EXECUTE FUNCTION public.sre_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Customer Revenue Records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_revenue_records (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id             uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  customer_name           text NOT NULL,
  customer_alias          text, -- anonymized alias e.g. 'Customer A'
  period_year             integer NOT NULL,
  period_type             text NOT NULL DEFAULT 'annual' CHECK (
    period_type IN ('annual', 'quarterly', 'monthly')
  ),
  period_index            integer, -- e.g. Q1=1, January=1

  annual_revenue          numeric(18, 2) NOT NULL CHECK (annual_revenue >= 0),
  is_recurring            boolean NOT NULL DEFAULT false,
  has_active_contract     boolean NOT NULL DEFAULT false,
  contract_expiry_months  integer CHECK (contract_expiry_months IS NULL OR contract_expiry_months >= 0),
  is_at_risk              boolean NOT NULL DEFAULT false,
  notes                   text,

  source                  text NOT NULL DEFAULT 'manual' CHECK (
    source IN ('manual', 'csv_import', 'derived')
  ),
  import_batch_id         uuid,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS crr_business_period_idx
  ON public.customer_revenue_records (business_id, period_year, period_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crr_user_idx
  ON public.customer_revenue_records (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.customer_revenue_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own revenue records" ON public.customer_revenue_records;
CREATE POLICY "Users manage own revenue records"
  ON public.customer_revenue_records
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.crr_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS crr_set_updated_at_trigger ON public.customer_revenue_records;
CREATE TRIGGER crr_set_updated_at_trigger
  BEFORE UPDATE ON public.customer_revenue_records
  FOR EACH ROW EXECUTE FUNCTION public.crr_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Customer Concentration Snapshots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_concentration_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id             uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  period_year             integer NOT NULL,
  period_type             text NOT NULL DEFAULT 'annual',

  total_revenue           numeric(18, 2) NOT NULL DEFAULT 0,
  customer_count          integer NOT NULL DEFAULT 0,

  -- HHI metrics
  hhi_raw                 numeric(10, 4) NOT NULL DEFAULT 0,
  hhi_normalized          numeric(6, 4) NOT NULL DEFAULT 0,

  -- Concentration metrics
  largest_customer_pct    numeric(6, 2),
  top5_pct                numeric(6, 2),
  top10_pct               numeric(6, 2),
  at_risk_revenue_pct     numeric(6, 2),
  recurring_revenue_pct   numeric(6, 2),
  expiring_contracts_pct  numeric(6, 2),

  concentration_risk_level text CHECK (
    concentration_risk_level IN ('low', 'moderate', 'high', 'critical')
  ),

  -- Full ranked customer list
  ranked_customers        jsonb NOT NULL DEFAULT '[]',

  snapshotted_at          timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS ccs_business_period_idx
  ON public.customer_concentration_snapshots (business_id, period_year DESC, snapshotted_at DESC);

ALTER TABLE public.customer_concentration_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own concentration snapshots" ON public.customer_concentration_snapshots;
CREATE POLICY "Users manage own concentration snapshots"
  ON public.customer_concentration_snapshots
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Valuation Refreshes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuation_refreshes (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id               uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Source report
  report_id                 uuid REFERENCES public.valuation_reports(id) ON DELETE SET NULL,
  refreshed_from_report_id  uuid REFERENCES public.valuation_reports(id) ON DELETE SET NULL,

  -- Refresh window
  refresh_period_start      date NOT NULL,
  next_refresh_at           timestamptz NOT NULL,

  -- Valuation change
  previous_valuation_low    numeric(18, 2),
  previous_valuation_high   numeric(18, 2),
  current_valuation_low     numeric(18, 2),
  current_valuation_high    numeric(18, 2),
  valuation_change_amount   numeric(18, 2),
  valuation_change_percent  numeric(8, 4),

  -- Change drivers (jsonb array of ValuationChangeDriver)
  change_drivers            jsonb NOT NULL DEFAULT '[]',

  refresh_type              text NOT NULL DEFAULT 'official' CHECK (
    refresh_type IN ('official', 'draft')
  ),

  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vr_user_business_idx
  ON public.valuation_refreshes (user_id, business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vr_business_official_idx
  ON public.valuation_refreshes (business_id, refresh_type, created_at DESC)
  WHERE refresh_type = 'official';

ALTER TABLE public.valuation_refreshes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own valuation refreshes" ON public.valuation_refreshes;
CREATE POLICY "Users manage own valuation refreshes"
  ON public.valuation_refreshes
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Seller Pipeline Opportunities
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_pipeline_opportunities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  stage           text NOT NULL DEFAULT 'preparing' CHECK (
    stage IN (
      'preparing', 'listed', 'inquiry_received', 'buyer_qualification',
      'nda_review', 'due_diligence', 'offer_received', 'negotiation',
      'closing_preparation', 'completed', 'withdrawn'
    )
  ),

  buyer_name          text,
  asking_price        numeric(18, 2),
  offered_price       numeric(18, 2),
  deal_room_id        uuid,
  notes               text,

  -- Stage history
  stage_history       jsonb NOT NULL DEFAULT '[]',

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS spo_business_idx
  ON public.seller_pipeline_opportunities (business_id, stage)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS spo_user_idx
  ON public.seller_pipeline_opportunities (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.seller_pipeline_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pipeline opportunities" ON public.seller_pipeline_opportunities;
CREATE POLICY "Users manage own pipeline opportunities"
  ON public.seller_pipeline_opportunities
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.spo_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS spo_set_updated_at_trigger ON public.seller_pipeline_opportunities;
CREATE TRIGGER spo_set_updated_at_trigger
  BEFORE UPDATE ON public.seller_pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.spo_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Seller Offers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_offers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id         uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  opportunity_id      uuid REFERENCES public.seller_pipeline_opportunities(id) ON DELETE SET NULL,
  deal_room_id        uuid,

  buyer_name          text NOT NULL,
  offered_price       numeric(18, 2) NOT NULL CHECK (offered_price >= 0),
  offer_terms         text,
  offer_date          date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date         date,

  status              text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')
  ),

  counter_price       numeric(18, 2),
  counter_terms       text,
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS so_business_status_idx
  ON public.seller_offers (business_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.seller_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own seller offers" ON public.seller_offers;
CREATE POLICY "Users manage own seller offers"
  ON public.seller_offers
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.so_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS so_set_updated_at_trigger ON public.seller_offers;
CREATE TRIGGER so_set_updated_at_trigger
  BEFORE UPDATE ON public.seller_offers
  FOR EACH ROW EXECUTE FUNCTION public.so_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Deal Room Checklist Items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_checklist_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id    uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title           text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'general' CHECK (
    category IN (
      'general', 'legal', 'financial', 'operational', 'diligence',
      'closing', 'nda', 'confidentiality'
    )
  ),
  is_required     boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'waived')
  ),
  completed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at    timestamptz,
  sort_order      integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS drci_deal_room_idx
  ON public.deal_room_checklist_items (deal_room_id, sort_order)
  WHERE deleted_at IS NULL;

ALTER TABLE public.deal_room_checklist_items ENABLE ROW LEVEL SECURITY;

-- Deal room owner can manage checklist
DROP POLICY IF EXISTS "Deal room participants can view checklist" ON public.deal_room_checklist_items;
CREATE POLICY "Deal room participants can view checklist"
  ON public.deal_room_checklist_items
  FOR SELECT TO authenticated
  USING (public.is_active_deal_room_member(deal_room_id));

DROP POLICY IF EXISTS "Deal room owner manages checklist" ON public.deal_room_checklist_items;
CREATE POLICY "Deal room owner manages checklist"
  ON public.deal_room_checklist_items
  FOR ALL TO authenticated
  USING (public.is_deal_room_seller(deal_room_id))
  WITH CHECK (public.is_deal_room_seller(deal_room_id));

CREATE OR REPLACE FUNCTION public.drci_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS drci_set_updated_at_trigger ON public.deal_room_checklist_items;
CREATE TRIGGER drci_set_updated_at_trigger
  BEFORE UPDATE ON public.deal_room_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.drci_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Deal Room Document Versions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_document_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id        uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  uploaded_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  document_name       text NOT NULL,
  document_category   text NOT NULL DEFAULT 'general' CHECK (
    document_category IN (
      'general', 'financial', 'legal', 'operational', 'nda',
      'diligence', 'closing', 'template'
    )
  ),
  version_number      integer NOT NULL DEFAULT 1,
  storage_path        text NOT NULL,
  file_size_bytes     bigint NOT NULL DEFAULT 0,
  mime_type           text,
  checksum            text,

  status              text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'superseded', 'archived')
  ),
  superseded_by       uuid REFERENCES public.deal_room_document_versions(id),

  -- Confidentiality
  is_sensitive        boolean NOT NULL DEFAULT false,
  sensitivity_note    text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS drdv_deal_room_idx
  ON public.deal_room_document_versions (deal_room_id, document_category, version_number DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.deal_room_document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deal room owner manages document versions" ON public.deal_room_document_versions;
CREATE POLICY "Deal room owner manages document versions"
  ON public.deal_room_document_versions
  FOR ALL TO authenticated
  USING (public.is_deal_room_seller(deal_room_id))
  WITH CHECK (public.is_deal_room_seller(deal_room_id));

DROP POLICY IF EXISTS "Deal room participants view document versions" ON public.deal_room_document_versions;
CREATE POLICY "Deal room participants view document versions"
  ON public.deal_room_document_versions
  FOR SELECT TO authenticated
  USING (public.is_active_deal_room_member(deal_room_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Deal Room Access Events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_access_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id    uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  event_type      text NOT NULL CHECK (
    event_type IN (
      'view', 'download', 'upload', 'invite', 'stage_change',
      'request_created', 'request_fulfilled', 'nda_confirmed',
      'checklist_updated', 'participant_joined', 'participant_removed'
    )
  ),
  document_id     uuid,
  metadata        jsonb NOT NULL DEFAULT '{}',

  occurred_at     timestamptz NOT NULL DEFAULT now(),
  ip_address      inet,
  user_agent      text
);

CREATE INDEX IF NOT EXISTS drae_deal_room_idx
  ON public.deal_room_access_events (deal_room_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS drae_user_idx
  ON public.deal_room_access_events (user_id, occurred_at DESC);

ALTER TABLE public.deal_room_access_events ENABLE ROW LEVEL SECURITY;

-- Only deal room owner can see full access log
DROP POLICY IF EXISTS "Deal room owner views access events" ON public.deal_room_access_events;
CREATE POLICY "Deal room owner views access events"
  ON public.deal_room_access_events
  FOR SELECT TO authenticated
  USING (public.is_deal_room_seller(deal_room_id));

-- Users can insert their own events
DROP POLICY IF EXISTS "Users insert own access events" ON public.deal_room_access_events;
CREATE POLICY "Users insert own access events"
  ON public.deal_room_access_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_active_deal_room_member(deal_room_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Business Activity Events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_activity_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  event_type      text NOT NULL,
  event_subtype   text,
  source_id       uuid,  -- optional FK to source record
  source_table    text,  -- table name of source record
  metadata        jsonb NOT NULL DEFAULT '{}',
  summary         text,

  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bae_business_idx
  ON public.business_activity_events (business_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS bae_user_idx
  ON public.business_activity_events (user_id, occurred_at DESC);

ALTER TABLE public.business_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own activity events" ON public.business_activity_events;
CREATE POLICY "Users manage own activity events"
  ON public.business_activity_events
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Business team members can view activity for their assigned businesses
DROP POLICY IF EXISTS "Team members view business activity" ON public.business_activity_events;
CREATE POLICY "Team members view business activity"
  ON public.business_activity_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.business_id = business_activity_events.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Storage Usage Ledger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storage_usage_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid REFERENCES public.businesses(id) ON DELETE SET NULL,

  source_type     text NOT NULL CHECK (
    source_type IN ('vault', 'deal_room', 'template', 'other')
  ),
  source_id       uuid,       -- FK to the originating row
  source_table    text,       -- table name

  file_name       text NOT NULL,
  storage_path    text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  mime_type       text,

  -- Soft-deleted files are excluded from quota
  deleted_at      timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sul_user_active_idx
  ON public.storage_usage_ledger (user_id, source_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS sul_business_idx
  ON public.storage_usage_ledger (business_id)
  WHERE deleted_at IS NULL AND business_id IS NOT NULL;

ALTER TABLE public.storage_usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own storage ledger" ON public.storage_usage_ledger;
CREATE POLICY "Users manage own storage ledger"
  ON public.storage_usage_ledger
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sul_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS sul_set_updated_at_trigger ON public.storage_usage_ledger;
CREATE TRIGGER sul_set_updated_at_trigger
  BEFORE UPDATE ON public.storage_usage_ledger
  FOR EACH ROW EXECUTE FUNCTION public.sul_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Extend deal_rooms with active-room count support
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.deal_rooms
  ADD COLUMN IF NOT EXISTS nda_status         text DEFAULT 'none' CHECK (
    nda_status IN ('none', 'uploaded', 'user_confirmed', 'external_link')
  ),
  ADD COLUMN IF NOT EXISTS nda_document_id    uuid,
  ADD COLUMN IF NOT EXISTS nda_external_link  text,
  ADD COLUMN IF NOT EXISTS last_activity_at   timestamptz DEFAULT now();

-- Index for active room count enforcement
CREATE INDEX IF NOT EXISTS deal_rooms_seller_active_idx
  ON public.deal_rooms (seller_id, status)
  WHERE status NOT IN ('closed', 'withdrawn');

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Extend valuation_reports for refresh metadata
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.valuation_reports
  ADD COLUMN IF NOT EXISTS refresh_type       text DEFAULT 'standard' CHECK (
    refresh_type IN ('standard', 'official_weekly', 'draft')
  ),
  ADD COLUMN IF NOT EXISTS refresh_period_start date,
  ADD COLUMN IF NOT EXISTS next_refresh_at    timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. Atomic active-deal-room limit enforcement function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_active_deal_rooms(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.deal_rooms
  WHERE seller_id = p_user_id
    AND status NOT IN ('closed', 'withdrawn');
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. Atomic active-lead count enforcement function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_active_leads(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.crm_contacts
  WHERE owner_user_id = p_user_id
    AND record_type = 'lead'
    AND deleted_at IS NULL;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. Atomic seat count enforcement function
--     Counts active members + pending invitations (owner excluded)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_invited_collaborators(p_owner_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Active members (excluding owner)
    SELECT COUNT(*)::integer
    FROM public.business_members bm
    JOIN public.businesses b ON b.id = bm.business_id
    WHERE b.owner_id = p_owner_user_id
      AND bm.user_id != p_owner_user_id
      AND bm.status = 'active'
  ) + (
    -- Pending invitations
    SELECT COUNT(*)::integer
    FROM public.business_member_invitations bmi
    JOIN public.businesses b ON b.id = bmi.business_id
    WHERE b.owner_id = p_owner_user_id
      AND bmi.status = 'pending'
  );
$$;
