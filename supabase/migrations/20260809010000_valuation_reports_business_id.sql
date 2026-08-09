-- Migration: add business_id to valuation_reports
-- Additive only — does not modify or delete existing rows.

ALTER TABLE public.valuation_reports
  ADD COLUMN IF NOT EXISTS business_id uuid NULL
    REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS valuation_reports_business_id_idx
  ON public.valuation_reports (business_id);
