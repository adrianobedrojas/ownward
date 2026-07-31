-- Migration: growth_goals and valuation_estimates tables
-- Created: 2026-07-31

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- Table: growth_goals
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.growth_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id  uuid,
  title        text NOT NULL,
  category     text NOT NULL DEFAULT 'other',
  metric_name  text,
  metric_unit  text,
  start_value  numeric(18, 4),
  current_value numeric(18, 4),
  target_value  numeric(18, 4),
  deadline     date,
  status       text NOT NULL DEFAULT 'active',
  notes        text,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'growth_goals_category_check'
      AND conrelid = 'public.growth_goals'::regclass
  ) THEN
    ALTER TABLE public.growth_goals
      ADD CONSTRAINT growth_goals_category_check
      CHECK (category IN (
        'revenue', 'customers', 'profitability', 'recurring_revenue',
        'operations', 'owner_independence', 'sale_readiness',
        'marketing', 'customer_retention', 'other'
      ));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'growth_goals_status_check'
      AND conrelid = 'public.growth_goals'::regclass
  ) THEN
    ALTER TABLE public.growth_goals
      ADD CONSTRAINT growth_goals_status_check
      CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));
  END IF;
END
$$;

ALTER TABLE public.growth_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own growth goals" ON public.growth_goals;
DROP POLICY IF EXISTS "Users can insert own growth goals" ON public.growth_goals;
DROP POLICY IF EXISTS "Users can update own growth goals" ON public.growth_goals;
DROP POLICY IF EXISTS "Users can delete own growth goals" ON public.growth_goals;

CREATE POLICY "Users can view own growth goals"
  ON public.growth_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own growth goals"
  ON public.growth_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own growth goals"
  ON public.growth_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own growth goals"
  ON public.growth_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS growth_goals_user_id_idx  ON public.growth_goals (user_id);
CREATE INDEX IF NOT EXISTS growth_goals_status_idx   ON public.growth_goals (status);
CREATE INDEX IF NOT EXISTS growth_goals_deadline_idx ON public.growth_goals (deadline);

-- ─────────────────────────────────────────────
-- Table: valuation_estimates
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.valuation_estimates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL DEFAULT 'Untitled estimate',
  annual_revenue        numeric(18, 2),
  base_earnings         numeric(18, 2),
  owner_compensation    numeric(18, 2) NOT NULL DEFAULT 0,
  interest_addback      numeric(18, 2) NOT NULL DEFAULT 0,
  depreciation_addback  numeric(18, 2) NOT NULL DEFAULT 0,
  amortization_addback  numeric(18, 2) NOT NULL DEFAULT 0,
  onetime_expenses      numeric(18, 2) NOT NULL DEFAULT 0,
  nonoperating_income   numeric(18, 2) NOT NULL DEFAULT 0,
  normalized_earnings   numeric(18, 2),
  low_multiple          numeric(6, 2) NOT NULL DEFAULT 2.0,
  base_multiple         numeric(6, 2) NOT NULL DEFAULT 3.0,
  high_multiple         numeric(6, 2) NOT NULL DEFAULT 4.0,
  low_estimate          numeric(18, 2),
  base_estimate         numeric(18, 2),
  high_estimate         numeric(18, 2),
  created_at            timestamp with time zone NOT NULL DEFAULT now(),
  updated_at            timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.valuation_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own valuation estimates" ON public.valuation_estimates;
DROP POLICY IF EXISTS "Users can insert own valuation estimates" ON public.valuation_estimates;
DROP POLICY IF EXISTS "Users can update own valuation estimates" ON public.valuation_estimates;
DROP POLICY IF EXISTS "Users can delete own valuation estimates" ON public.valuation_estimates;

CREATE POLICY "Users can view own valuation estimates"
  ON public.valuation_estimates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own valuation estimates"
  ON public.valuation_estimates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own valuation estimates"
  ON public.valuation_estimates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own valuation estimates"
  ON public.valuation_estimates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS valuation_estimates_user_id_idx ON public.valuation_estimates (user_id);
