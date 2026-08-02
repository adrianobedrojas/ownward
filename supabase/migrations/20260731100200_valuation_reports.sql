-- ─────────────────────────────────────────────
-- Valuation Reports Phase 1
-- Tables: valuation_reports, valuation_financial_years,
--         valuation_adjustments, valuation_scenarios
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- TABLE: valuation_reports
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuation_reports (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_listing_id       uuid        REFERENCES public.business_listings(id) ON DELETE SET NULL,
  status                    text        NOT NULL DEFAULT 'draft',
  version                   integer     NOT NULL DEFAULT 1,
  methodology_version       text        NOT NULL,
  currency                  text        NOT NULL DEFAULT 'USD',
  business_name             text,
  industry                  text,

  -- Valuation results (NULL until status = 'calculated')
  defensive_value           numeric,
  expected_value            numeric,
  strategic_value           numeric,
  confidence_score          integer,     -- 0-100

  -- Immutable snapshots
  input_snapshot            jsonb,
  result_snapshot           jsonb,

  created_at                timestamp with time zone NOT NULL DEFAULT now(),
  updated_at                timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT valuation_reports_status_check CHECK (
    status IN ('draft', 'calculated', 'archived')
  ),
  CONSTRAINT valuation_reports_confidence_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT valuation_reports_version_positive CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS valuation_reports_user_id_idx
  ON public.valuation_reports (user_id);
CREATE INDEX IF NOT EXISTS valuation_reports_user_updated_idx
  ON public.valuation_reports (user_id, updated_at DESC);

ALTER TABLE public.valuation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own valuation reports" ON public.valuation_reports;
DROP POLICY IF EXISTS "Users can insert own valuation reports" ON public.valuation_reports;
DROP POLICY IF EXISTS "Users can update own valuation reports" ON public.valuation_reports;
DROP POLICY IF EXISTS "Users can delete own valuation reports" ON public.valuation_reports;

CREATE POLICY "Users can select own valuation reports"
  ON public.valuation_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own valuation reports"
  ON public.valuation_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own valuation reports"
  ON public.valuation_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own valuation reports"
  ON public.valuation_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TABLE: valuation_financial_years
-- One row per calendar year per report (up to 3 years).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuation_financial_years (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             uuid    NOT NULL REFERENCES public.valuation_reports(id) ON DELETE CASCADE,
  fiscal_year           integer NOT NULL,   -- e.g. 2023, 2024, 2025
  revenue               numeric NOT NULL DEFAULT 0,
  cogs                  numeric NOT NULL DEFAULT 0,
  operating_expenses    numeric NOT NULL DEFAULT 0,
  owner_salary          numeric NOT NULL DEFAULT 0,
  owner_benefits        numeric NOT NULL DEFAULT 0,
  depreciation          numeric NOT NULL DEFAULT 0,
  amortization          numeric NOT NULL DEFAULT 0,
  interest              numeric NOT NULL DEFAULT 0,
  one_time_expenses     numeric NOT NULL DEFAULT 0,
  one_time_revenue      numeric NOT NULL DEFAULT 0,
  created_at            timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT vfy_unique_report_year UNIQUE (report_id, fiscal_year),
  CONSTRAINT vfy_revenue_nonneg    CHECK (revenue            >= 0),
  CONSTRAINT vfy_cogs_nonneg       CHECK (cogs               >= 0),
  CONSTRAINT vfy_opex_nonneg       CHECK (operating_expenses >= 0)
);

CREATE INDEX IF NOT EXISTS vfy_report_id_idx
  ON public.valuation_financial_years (report_id);

ALTER TABLE public.valuation_financial_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own financial years" ON public.valuation_financial_years;
DROP POLICY IF EXISTS "Users can insert own financial years" ON public.valuation_financial_years;
DROP POLICY IF EXISTS "Users can update own financial years" ON public.valuation_financial_years;
DROP POLICY IF EXISTS "Users can delete own financial years" ON public.valuation_financial_years;

CREATE POLICY "Users can select own financial years"
  ON public.valuation_financial_years FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own financial years"
  ON public.valuation_financial_years FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own financial years"
  ON public.valuation_financial_years FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own financial years"
  ON public.valuation_financial_years FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- TABLE: valuation_adjustments
-- Stores each add-back or deduction applied to owner earnings.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuation_adjustments (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid    NOT NULL REFERENCES public.valuation_reports(id) ON DELETE CASCADE,
  label         text    NOT NULL,
  amount        numeric NOT NULL,
  direction     text    NOT NULL DEFAULT 'add',   -- 'add' or 'deduct'
  explanation   text,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT va_direction_check CHECK (direction IN ('add', 'deduct'))
);

CREATE INDEX IF NOT EXISTS va_report_id_idx
  ON public.valuation_adjustments (report_id);

ALTER TABLE public.valuation_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own adjustments" ON public.valuation_adjustments;
DROP POLICY IF EXISTS "Users can insert own adjustments" ON public.valuation_adjustments;
DROP POLICY IF EXISTS "Users can update own adjustments" ON public.valuation_adjustments;
DROP POLICY IF EXISTS "Users can delete own adjustments" ON public.valuation_adjustments;

CREATE POLICY "Users can select own adjustments"
  ON public.valuation_adjustments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own adjustments"
  ON public.valuation_adjustments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own adjustments"
  ON public.valuation_adjustments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own adjustments"
  ON public.valuation_adjustments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- TABLE: valuation_scenarios
-- What-if improvement scenarios modeled from a calculated report.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuation_scenarios (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid    NOT NULL REFERENCES public.valuation_reports(id) ON DELETE CASCADE,
  label           text    NOT NULL,
  description     text,
  modeled_value   numeric,
  driver          text,   -- which input lever was adjusted
  delta_amount    numeric,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vs_report_id_idx
  ON public.valuation_scenarios (report_id);

ALTER TABLE public.valuation_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own scenarios" ON public.valuation_scenarios;
DROP POLICY IF EXISTS "Users can insert own scenarios" ON public.valuation_scenarios;
DROP POLICY IF EXISTS "Users can update own scenarios" ON public.valuation_scenarios;
DROP POLICY IF EXISTS "Users can delete own scenarios" ON public.valuation_scenarios;

CREATE POLICY "Users can select own scenarios"
  ON public.valuation_scenarios FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scenarios"
  ON public.valuation_scenarios FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scenarios"
  ON public.valuation_scenarios FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scenarios"
  ON public.valuation_scenarios FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.valuation_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- TRIGGER: update valuation_reports.updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.valuation_reports_set_updated_at()
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

DROP TRIGGER IF EXISTS valuation_reports_updated_at ON public.valuation_reports;
CREATE TRIGGER valuation_reports_updated_at
  BEFORE UPDATE ON public.valuation_reports
  FOR EACH ROW EXECUTE FUNCTION public.valuation_reports_set_updated_at();
