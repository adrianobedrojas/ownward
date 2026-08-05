-- ============================================================
-- Business-in-a-Box idempotency and retention hardening
-- Version: 20260805110000
--
-- Adds stable source-level idempotency fields to generated source tables
-- and converts audit-sensitive foreign keys away from cascading deletes.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Source-level idempotency and provenance columns
-- Each generated row stores its stable template item key so the webhook can
-- insert once, retry safely, and avoid duplicate source rows even if provenance
-- insertion fails.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS generated_template_key text,
  ADD COLUMN IF NOT EXISTS generated_template_version text,
  ADD COLUMN IF NOT EXISTS generated_template_item_key text,
  ADD COLUMN IF NOT EXISTS generated_purchase_id uuid,
  ADD COLUMN IF NOT EXISTS generated_setup_id uuid,
  ADD COLUMN IF NOT EXISTS generated_generation_source text,
  ADD COLUMN IF NOT EXISTS generated_content_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS generated_content_hash text,
  ADD COLUMN IF NOT EXISTS generated_modified_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generated_user_modified_at timestamptz;

ALTER TABLE public.business_milestones
  ADD COLUMN IF NOT EXISTS generated_template_key text,
  ADD COLUMN IF NOT EXISTS generated_template_version text,
  ADD COLUMN IF NOT EXISTS generated_template_item_key text,
  ADD COLUMN IF NOT EXISTS generated_purchase_id uuid,
  ADD COLUMN IF NOT EXISTS generated_setup_id uuid,
  ADD COLUMN IF NOT EXISTS generated_generation_source text,
  ADD COLUMN IF NOT EXISTS generated_content_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS generated_content_hash text,
  ADD COLUMN IF NOT EXISTS generated_modified_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generated_user_modified_at timestamptz;

ALTER TABLE public.growth_goals
  ADD COLUMN IF NOT EXISTS generated_template_key text,
  ADD COLUMN IF NOT EXISTS generated_template_version text,
  ADD COLUMN IF NOT EXISTS generated_template_item_key text,
  ADD COLUMN IF NOT EXISTS generated_purchase_id uuid,
  ADD COLUMN IF NOT EXISTS generated_setup_id uuid,
  ADD COLUMN IF NOT EXISTS generated_generation_source text,
  ADD COLUMN IF NOT EXISTS generated_content_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS generated_content_hash text,
  ADD COLUMN IF NOT EXISTS generated_modified_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generated_user_modified_at timestamptz;

ALTER TABLE public.sale_readiness_evidence
  ADD COLUMN IF NOT EXISTS generated_template_key text,
  ADD COLUMN IF NOT EXISTS generated_template_version text,
  ADD COLUMN IF NOT EXISTS generated_template_item_key text,
  ADD COLUMN IF NOT EXISTS generated_purchase_id uuid,
  ADD COLUMN IF NOT EXISTS generated_setup_id uuid,
  ADD COLUMN IF NOT EXISTS generated_generation_source text,
  ADD COLUMN IF NOT EXISTS generated_content_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS generated_content_hash text,
  ADD COLUMN IF NOT EXISTS generated_modified_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generated_user_modified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_generated_template_item_key_unique_idx
  ON public.tasks (generated_template_item_key)
  WHERE generated_template_item_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS business_milestones_generated_template_item_key_unique_idx
  ON public.business_milestones (generated_template_item_key)
  WHERE generated_template_item_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS growth_goals_generated_template_item_key_unique_idx
  ON public.growth_goals (generated_template_item_key)
  WHERE generated_template_item_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sale_readiness_evidence_generated_template_item_key_unique_idx
  ON public.sale_readiness_evidence (generated_template_item_key)
  WHERE generated_template_item_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_generated_template_lookup_idx
  ON public.tasks (generated_setup_id, generated_template_item_key)
  WHERE generated_setup_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS business_milestones_generated_template_lookup_idx
  ON public.business_milestones (generated_setup_id, generated_template_item_key)
  WHERE generated_setup_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS growth_goals_generated_template_lookup_idx
  ON public.growth_goals (generated_setup_id, generated_template_item_key)
  WHERE generated_setup_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sale_readiness_evidence_generated_template_lookup_idx
  ON public.sale_readiness_evidence (generated_setup_id, generated_template_item_key)
  WHERE generated_setup_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Retention: replace cascading deletes on audit-sensitive tables
-- Purchases, setups, and generated records should not disappear silently.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.business_in_a_box_setups
  DROP CONSTRAINT IF EXISTS business_in_a_box_setups_purchase_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_setups_purchase_item_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_setups_entitlement_grant_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_setups_user_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_setups_business_id_fkey;

ALTER TABLE public.business_in_a_box_setups
  ADD CONSTRAINT business_in_a_box_setups_purchase_id_fkey
    FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE RESTRICT,
  ADD CONSTRAINT business_in_a_box_setups_purchase_item_id_fkey
    FOREIGN KEY (purchase_item_id) REFERENCES public.purchase_items(id) ON DELETE SET NULL,
  ADD CONSTRAINT business_in_a_box_setups_entitlement_grant_id_fkey
    FOREIGN KEY (entitlement_grant_id) REFERENCES public.entitlement_grants(id) ON DELETE SET NULL,
  ADD CONSTRAINT business_in_a_box_setups_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT business_in_a_box_setups_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;

ALTER TABLE public.business_in_a_box_generated_resources
  DROP CONSTRAINT IF EXISTS business_in_a_box_generated_resources_setup_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_generated_resources_purchase_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_generated_resources_user_id_fkey,
  DROP CONSTRAINT IF EXISTS business_in_a_box_generated_resources_business_id_fkey;

ALTER TABLE public.business_in_a_box_generated_resources
  ADD CONSTRAINT business_in_a_box_generated_resources_setup_id_fkey
    FOREIGN KEY (setup_id) REFERENCES public.business_in_a_box_setups(id) ON DELETE RESTRICT,
  ADD CONSTRAINT business_in_a_box_generated_resources_purchase_id_fkey
    FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE RESTRICT,
  ADD CONSTRAINT business_in_a_box_generated_resources_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT business_in_a_box_generated_resources_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
