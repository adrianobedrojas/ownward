-- ============================================================
-- Commerce Foundation
-- Version: 20260803070000
--
-- Adds an extensible one-time-purchase model:
--   purchases            – one record per Stripe Checkout Session
--   purchase_items       – line items for future cart/bundle support
--   entitlement_grants   – what a user is entitled to after payment
--   value_action_sprint_workspaces – workspace created on fulfillment
--
-- Idempotency guarantees
--   purchases            UNIQUE (stripe_checkout_session_id)
--   entitlement_grants   UNIQUE (purchase_id, product_key)
--   workspaces           UNIQUE (purchase_id)
--
-- RLS: authenticated users may SELECT their own rows only.
--      INSERT/UPDATE/DELETE is performed by the service-role client
--      inside the Stripe webhook handler, never by authenticated clients.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: purchases
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key                 text        NOT NULL,
  stripe_checkout_session_id  text        NOT NULL,
  stripe_payment_intent_id    text,
  stripe_customer_id          text,
  amount_total                integer,
  currency                    text,
  payment_status              text        NOT NULL DEFAULT 'pending',
  fulfillment_status          text        NOT NULL DEFAULT 'pending',
  metadata                    jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_stripe_checkout_session_id_key
    UNIQUE (stripe_checkout_session_id),
  CONSTRAINT purchases_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  CONSTRAINT purchases_fulfillment_status_check
    CHECK (fulfillment_status IN ('pending', 'fulfilled', 'failed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS purchases_user_id_idx
  ON public.purchases (user_id);

CREATE INDEX IF NOT EXISTS purchases_product_key_idx
  ON public.purchases (product_key);

CREATE INDEX IF NOT EXISTS purchases_payment_status_idx
  ON public.purchases (payment_status);

CREATE INDEX IF NOT EXISTS purchases_created_at_idx
  ON public.purchases (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: purchase_items
-- One row per line item within a purchase.
-- Supports future cart/bundle scenarios without schema changes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id   uuid        NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_key   text        NOT NULL,
  stripe_price_id text,
  quantity      integer     NOT NULL DEFAULT 1,
  unit_amount   integer,
  currency      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx
  ON public.purchase_items (purchase_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: entitlement_grants
-- Records what the user has been granted as a result of a purchase.
-- UNIQUE (purchase_id, product_key) prevents duplicate grants on replay.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entitlement_grants (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id       uuid        NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key       text        NOT NULL,
  entitlement_type  text        NOT NULL,
  status            text        NOT NULL DEFAULT 'active',
  granted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_grants_purchase_product_key
    UNIQUE (purchase_id, product_key),
  CONSTRAINT entitlement_grants_status_check
    CHECK (status IN ('active', 'revoked', 'expired'))
);

CREATE INDEX IF NOT EXISTS entitlement_grants_user_id_idx
  ON public.entitlement_grants (user_id);

CREATE INDEX IF NOT EXISTS entitlement_grants_product_key_idx
  ON public.entitlement_grants (product_key);

CREATE INDEX IF NOT EXISTS entitlement_grants_status_idx
  ON public.entitlement_grants (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: value_action_sprint_workspaces
-- Created by the webhook when fulfillment_behavior = 'create_workspace'.
-- UNIQUE (purchase_id) prevents duplicate workspace creation on replay.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.value_action_sprint_workspaces (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id uuid        NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'not_started',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT value_action_sprint_workspaces_purchase_id_key
    UNIQUE (purchase_id),
  CONSTRAINT value_action_sprint_workspaces_status_check
    CHECK (status IN ('not_started', 'in_progress', 'completed'))
);

CREATE INDEX IF NOT EXISTS value_action_sprint_workspaces_user_id_idx
  ON public.value_action_sprint_workspaces (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Row-level security
-- Authenticated users may SELECT their own rows.
-- All writes come from the service-role webhook — never from clients.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.purchases                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_grants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.value_action_sprint_workspaces   ENABLE ROW LEVEL SECURITY;

-- purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- purchase_items — accessible through ownership of the parent purchase
DROP POLICY IF EXISTS "Users can view own purchase items" ON public.purchase_items;
CREATE POLICY "Users can view own purchase items"
  ON public.purchase_items FOR SELECT TO authenticated
  USING (
    purchase_id IN (
      SELECT id FROM public.purchases WHERE user_id = auth.uid()
    )
  );

-- entitlement_grants
DROP POLICY IF EXISTS "Users can view own entitlement grants" ON public.entitlement_grants;
CREATE POLICY "Users can view own entitlement grants"
  ON public.entitlement_grants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- value_action_sprint_workspaces
DROP POLICY IF EXISTS "Users can view own value action sprint workspaces" ON public.value_action_sprint_workspaces;
CREATE POLICY "Users can view own value action sprint workspaces"
  ON public.value_action_sprint_workspaces FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants
-- authenticated: SELECT only (no client writes)
-- service_role:  full DML for webhook handler
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.purchases                        TO authenticated;
GRANT SELECT ON public.purchase_items                   TO authenticated;
GRANT SELECT ON public.entitlement_grants               TO authenticated;
GRANT SELECT ON public.value_action_sprint_workspaces   TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases                        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items                   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entitlement_grants               TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.value_action_sprint_workspaces   TO service_role;
