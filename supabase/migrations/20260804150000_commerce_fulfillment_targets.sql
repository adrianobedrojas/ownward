-- ============================================================
-- Commerce Fulfillment Targets and Operational Workflows
-- Version: 20260804150000
--
-- Adds typed purchase targets and product-specific fulfillment tracking:
--   - purchases target + fulfilled resource metadata
--   - entitlement target scoping
--   - paid_valuation_report_deliveries
--   - deal_room_paid_access
--   - confidential_sale_launches
--
-- Notes:
--   - Historical metadata on purchases is preserved.
--   - Client writes remain blocked; webhook/service role performs writes.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- purchases: typed targets + fulfilled resources
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS target_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS fulfilled_resource_type text,
  ADD COLUMN IF NOT EXISTS fulfilled_resource_id uuid,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_message_safe text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchases_target_type_check'
      AND conrelid = 'public.purchases'::regclass
  ) THEN
    ALTER TABLE public.purchases
      ADD CONSTRAINT purchases_target_type_check
      CHECK (
        target_type IS NULL OR target_type IN (
          'none',
          'listing',
          'business',
          'deal_room',
          'transaction',
          'acquisition_target'
        )
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS purchases_target_lookup_idx
  ON public.purchases (user_id, product_key, target_type, target_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS purchases_open_target_unique_idx
  ON public.purchases (user_id, product_key, target_type, target_id)
  WHERE target_id IS NOT NULL
    AND payment_status IN ('pending', 'paid')
    AND fulfillment_status IN ('pending', 'fulfilled');

-- ─────────────────────────────────────────────────────────────────────────────
-- entitlement_grants: scoped to target/resource
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.entitlement_grants
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_id uuid,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoke_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'entitlement_grants_target_type_check'
      AND conrelid = 'public.entitlement_grants'::regclass
  ) THEN
    ALTER TABLE public.entitlement_grants
      ADD CONSTRAINT entitlement_grants_target_type_check
      CHECK (
        target_type IS NULL OR target_type IN (
          'none',
          'listing',
          'business',
          'deal_room',
          'transaction',
          'acquisition_target'
        )
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS entitlement_grants_target_idx
  ON public.entitlement_grants (user_id, product_key, target_type, target_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS entitlement_grants_active_target_unique_idx
  ON public.entitlement_grants (user_id, product_key, target_type, target_id)
  WHERE target_id IS NOT NULL
    AND status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- paid_valuation_report_deliveries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paid_valuation_report_deliveries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id           uuid NOT NULL UNIQUE REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  valuation_report_id   uuid REFERENCES public.valuation_reports(id) ON DELETE SET NULL,
  product_key           text NOT NULL,
  status                text NOT NULL DEFAULT 'pending',
  failure_code          text,
  failure_message_safe  text,
  started_at            timestamptz,
  completed_at          timestamptz,
  refunded_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paid_valuation_report_deliveries_status_check CHECK (
    status IN ('pending', 'processing', 'input_required', 'ready', 'failed', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS pvrd_user_id_idx
  ON public.paid_valuation_report_deliveries (user_id);

CREATE INDEX IF NOT EXISTS pvrd_business_id_idx
  ON public.paid_valuation_report_deliveries (business_id);

CREATE INDEX IF NOT EXISTS pvrd_status_idx
  ON public.paid_valuation_report_deliveries (status);

ALTER TABLE public.paid_valuation_report_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paid valuation deliveries" ON public.paid_valuation_report_deliveries;
CREATE POLICY "Users can view own paid valuation deliveries"
  ON public.paid_valuation_report_deliveries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.paid_valuation_report_deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_valuation_report_deliveries TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- deal_room_paid_access
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_paid_access (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id           uuid NOT NULL UNIQUE REFERENCES public.purchases(id) ON DELETE CASCADE,
  entitlement_grant_id  uuid REFERENCES public.entitlement_grants(id) ON DELETE SET NULL,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id       uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  deal_room_id          uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  product_key           text NOT NULL,
  access_starts_at      timestamptz NOT NULL,
  access_expires_at     timestamptz NOT NULL,
  access_status         text NOT NULL DEFAULT 'active',
  refunded_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_room_paid_access_status_check CHECK (
    access_status IN ('active', 'expired', 'refunded')
  ),
  CONSTRAINT deal_room_paid_access_window_check CHECK (access_expires_at > access_starts_at)
);

CREATE INDEX IF NOT EXISTS drpa_user_id_idx
  ON public.deal_room_paid_access (user_id);

CREATE INDEX IF NOT EXISTS drpa_conversation_id_idx
  ON public.deal_room_paid_access (conversation_id);

CREATE INDEX IF NOT EXISTS drpa_deal_room_id_idx
  ON public.deal_room_paid_access (deal_room_id);

CREATE INDEX IF NOT EXISTS drpa_status_expiry_idx
  ON public.deal_room_paid_access (access_status, access_expires_at);

ALTER TABLE public.deal_room_paid_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paid deal room access" ON public.deal_room_paid_access;
CREATE POLICY "Users can view own paid deal room access"
  ON public.deal_room_paid_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.deal_room_paid_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_paid_access TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- confidential_sale_launches
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.confidential_sale_launches (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id           uuid NOT NULL UNIQUE REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id            uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  product_key           text NOT NULL,
  status                text NOT NULL DEFAULT 'pending',
  launched_at           timestamptz,
  refunded_at           timestamptz,
  failure_code          text,
  failure_message_safe  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT confidential_sale_launches_status_check CHECK (
    status IN ('pending', 'active', 'failed', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS csl_user_id_idx
  ON public.confidential_sale_launches (user_id);

CREATE INDEX IF NOT EXISTS csl_listing_id_idx
  ON public.confidential_sale_launches (listing_id);

CREATE INDEX IF NOT EXISTS csl_status_idx
  ON public.confidential_sale_launches (status);

CREATE UNIQUE INDEX IF NOT EXISTS csl_listing_active_unique_idx
  ON public.confidential_sale_launches (listing_id)
  WHERE status = 'active';

ALTER TABLE public.confidential_sale_launches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own confidential sale launches" ON public.confidential_sale_launches;
CREATE POLICY "Users can view own confidential sale launches"
  ON public.confidential_sale_launches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.confidential_sale_launches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.confidential_sale_launches TO service_role;
