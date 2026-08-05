-- ============================================================
-- Business-in-a-Box setup tracking and provenance
-- Version: 20260805100000
--
-- Adds:
--   - purchases.template_key/template_version
--   - entitlement_grants.template_key/template_version
--   - business_in_a_box_setups
--   - business_in_a_box_generated_resources
--
-- Notes:
--   - Authenticated clients get read-only access to their own setup rows.
--   - Webhook/service role performs all writes.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- purchases and entitlement_grants template metadata
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_version text;

ALTER TABLE public.entitlement_grants
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_version text;

CREATE INDEX IF NOT EXISTS purchases_template_lookup_idx
  ON public.purchases (product_key, target_id, template_key, payment_status, fulfillment_status);

CREATE INDEX IF NOT EXISTS entitlement_grants_template_lookup_idx
  ON public.entitlement_grants (product_key, target_id, template_key, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- business_in_a_box_setups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_in_a_box_setups (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id           uuid NOT NULL UNIQUE REFERENCES public.purchases(id) ON DELETE CASCADE,
  purchase_item_id      uuid REFERENCES public.purchase_items(id) ON DELETE SET NULL,
  entitlement_grant_id  uuid REFERENCES public.entitlement_grants(id) ON DELETE SET NULL,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_key          text NOT NULL,
  template_version      text NOT NULL,
  status                text NOT NULL DEFAULT 'pending',
  fulfillment_attempts  integer NOT NULL DEFAULT 0,
  failure_code          text,
  failure_message_safe  text,
  started_at            timestamptz,
  completed_at          timestamptz,
  refunded_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_in_a_box_setups_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_reversed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS biab_active_setup_unique_idx
  ON public.business_in_a_box_setups (business_id, template_key)
  WHERE status IN ('pending', 'processing', 'completed');

CREATE INDEX IF NOT EXISTS biab_setups_purchase_id_idx
  ON public.business_in_a_box_setups (purchase_id);

CREATE INDEX IF NOT EXISTS biab_setups_user_id_idx
  ON public.business_in_a_box_setups (user_id);

CREATE INDEX IF NOT EXISTS biab_setups_business_id_idx
  ON public.business_in_a_box_setups (business_id);

CREATE INDEX IF NOT EXISTS biab_setups_template_key_idx
  ON public.business_in_a_box_setups (template_key);

CREATE INDEX IF NOT EXISTS biab_setups_status_idx
  ON public.business_in_a_box_setups (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- business_in_a_box_generated_resources
-- Tracks created placeholder resources and provenance for safe refund reversal.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_in_a_box_generated_resources (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id              uuid NOT NULL REFERENCES public.business_in_a_box_setups(id) ON DELETE CASCADE,
  purchase_id           uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_key          text NOT NULL,
  template_version      text NOT NULL,
  resource_type         text NOT NULL,
  template_item_key     text NOT NULL,
  source_table          text,
  source_record_id      uuid,
  resource_label        text,
  generation_source     text NOT NULL DEFAULT 'apply_business_in_a_box_template',
  provenance            jsonb NOT NULL DEFAULT '{}'::jsonb,
  detached_on_refund    boolean NOT NULL DEFAULT false,
  modified_by_user      boolean NOT NULL DEFAULT false,
  archived_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT biab_generated_resources_unique_item UNIQUE (setup_id, resource_type, template_item_key)
);

CREATE INDEX IF NOT EXISTS biab_resources_setup_idx
  ON public.business_in_a_box_generated_resources (setup_id);

CREATE INDEX IF NOT EXISTS biab_resources_purchase_idx
  ON public.business_in_a_box_generated_resources (purchase_id);

CREATE INDEX IF NOT EXISTS biab_resources_user_idx
  ON public.business_in_a_box_generated_resources (user_id);

CREATE INDEX IF NOT EXISTS biab_resources_business_idx
  ON public.business_in_a_box_generated_resources (business_id);

CREATE INDEX IF NOT EXISTS biab_resources_template_idx
  ON public.business_in_a_box_generated_resources (template_key, template_item_key);

CREATE INDEX IF NOT EXISTS biab_resources_status_idx
  ON public.business_in_a_box_generated_resources (detached_on_refund, archived_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS and grants
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.business_in_a_box_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_in_a_box_generated_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Business-in-a-Box setups" ON public.business_in_a_box_setups;
CREATE POLICY "Users can view own Business-in-a-Box setups"
  ON public.business_in_a_box_setups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own Business-in-a-Box resources" ON public.business_in_a_box_generated_resources;
CREATE POLICY "Users can view own Business-in-a-Box resources"
  ON public.business_in_a_box_generated_resources
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.business_in_a_box_setups TO authenticated;
GRANT SELECT ON public.business_in_a_box_generated_resources TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_in_a_box_setups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_in_a_box_generated_resources TO service_role;
