-- ============================================================
-- API Grants Reconciliation
-- Version: 20260731160000
--
-- Principle of least privilege:
--   anon       – only explicitly public read/write operations
--   authenticated – operations supported by RLS policies
--   service_role  – server-side access for Stripe webhooks and admin routes
--
-- Revokes TRUNCATE, TRIGGER, REFERENCES, and MAINTAIN from
-- anon and authenticated on every public table.
--
-- Grants sequence USAGE where INSERT uses an identity sequence.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Schema usage (baseline already grants this; kept here for safety)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Revoke over-broad privileges from anon and authenticated
--    (production default privileges granted REFERENCES/TRIGGER/TRUNCATE/MAINTAIN)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON public.%I FROM anon, authenticated',
      tbl
    );
  END LOOP;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. anon – only public operations
-- ─────────────────────────────────────────────────────────────────────────────

-- Public marketplace browsing
GRANT SELECT ON public.business_listings  TO anon;
GRANT SELECT ON public.businesses         TO anon;
GRANT SELECT ON public.listings           TO anon;
GRANT SELECT ON public.posts              TO anon;

-- Public visitor interactions (INSERT only; RLS restricts to is_public=true)
GRANT INSERT ON public.business_visits          TO anon;
GRANT INSERT ON public.community_actions        TO anon;
GRANT INSERT ON public.community_pulse_responses TO anon;

-- Public contact form
GRANT INSERT ON public.contact_messages TO anon;

-- Identity sequences for INSERT-only anon tables
GRANT USAGE ON SEQUENCE public.business_visits_id_seq   TO anon;
GRANT USAGE ON SEQUENCE public.community_actions_id_seq TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. authenticated – operations supported by RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- business_listings: SELECT own + published; INSERT + UPDATE own
GRANT SELECT, INSERT, UPDATE ON public.business_listings TO authenticated;

-- business_visits: SELECT own (owner analytics) + INSERT (public businesses)
GRANT SELECT, INSERT ON public.business_visits TO authenticated;

-- businesses: full CRUD (owner_id = auth.uid())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;

-- community tables: SELECT (owner) + INSERT (public businesses)
GRANT SELECT, INSERT ON public.community_actions          TO authenticated;
GRANT SELECT, INSERT ON public.community_pulse_responses  TO authenticated;

-- documents: full CRUD (own)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- invoices: full CRUD (own)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;

-- listings: public read only
GRANT SELECT ON public.listings TO authenticated;

-- profiles: SELECT + INSERT (on signup) + UPDATE (own)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- subscriptions: SELECT own only (write is service-role / Stripe webhook)
GRANT SELECT ON public.subscriptions TO authenticated;

-- transactions: full CRUD (own) — UPDATE added by bookkeeping migration
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

-- tasks
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

-- growth goals + valuation estimates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_goals         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_estimates  TO authenticated;

-- saved listings (no UPDATE policy)
GRANT SELECT, INSERT, DELETE ON public.saved_listings TO authenticated;

-- listing interest submissions (SELECT + INSERT; no UPDATE/DELETE policy)
GRANT SELECT, INSERT ON public.listing_interest_submissions TO authenticated;

-- messaging: conversations, messages, blocked_users, message_reports
GRANT SELECT, INSERT, UPDATE ON public.conversations   TO authenticated;
GRANT SELECT, INSERT         ON public.messages        TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocked_users   TO authenticated;
GRANT SELECT, INSERT         ON public.message_reports TO authenticated;

-- valuation reports and sub-tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_reports         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_financial_years TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_adjustments     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_scenarios       TO authenticated;

-- deal rooms
GRANT SELECT, INSERT, UPDATE ON public.deal_rooms          TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deal_room_members   TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deal_room_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deal_room_requests  TO authenticated;
GRANT SELECT, INSERT         ON public.deal_room_activity  TO authenticated;

-- bookkeeping
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookkeeping_periods TO authenticated;

-- content and contact
GRANT SELECT         ON public.posts           TO authenticated;
GRANT SELECT, INSERT ON public.contact_messages TO authenticated;

-- listing promotions: SELECT own only (INSERT/UPDATE via Stripe webhook)
GRANT SELECT ON public.listing_promotions TO authenticated;

-- support requests: INSERT and SELECT own (no UPDATE/DELETE policy)
GRANT SELECT, INSERT ON public.support_requests TO authenticated;

-- workspace tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_milestones          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_health_assessments  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_progress_updates        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_member_invitations  TO authenticated;

-- pro tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_readiness_assessments       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_readiness_evidence          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_revenue_records         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_concentration_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_refreshes              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_pipeline_opportunities    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_offers                    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_checklist_items        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_document_versions      TO authenticated;
GRANT SELECT, INSERT                 ON public.deal_room_access_events          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_activity_events         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_usage_ledger             TO authenticated;

-- stripe_events: no client access (blocked by RLS; no DML grant needed)
-- (service_role handles this below)

-- Identity sequences
GRANT USAGE ON SEQUENCE public.business_visits_id_seq   TO authenticated;
GRANT USAGE ON SEQUENCE public.community_actions_id_seq TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. service_role – server-side access for Stripe webhooks and admin routes
--    service_role bypasses RLS, so grants here control schema-level access.
-- ─────────────────────────────────────────────────────────────────────────────

-- Core webhook tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_events     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_promotions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles          TO service_role;

-- Full access to all public tables for admin/server routes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_listings             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_visits               TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses                    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_actions             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_pulse_responses     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents                     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices                      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings                      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions                  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks                         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_goals                  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_estimates           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_listings                TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_interest_submissions  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations                 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages                      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users                 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reports               TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_reports             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_financial_years     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_adjustments         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_scenarios           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_rooms                    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_members             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_documents           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_requests            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_activity            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookkeeping_periods           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts                         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_requests              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_milestones           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_health_assessments   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_progress_updates         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts                  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities                TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_member_invitations   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_readiness_assessments    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_readiness_evidence       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_revenue_records      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_concentration_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuation_refreshes           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_pipeline_opportunities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_offers                 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_checklist_items     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_document_versions   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_room_access_events       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_activity_events      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_usage_ledger          TO service_role;

-- Sequences
GRANT USAGE ON SEQUENCE public.business_visits_id_seq   TO service_role;
GRANT USAGE ON SEQUENCE public.community_actions_id_seq TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verify RLS is enabled on every public application table
--    (safety net — migrations should have done this already)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END
$$;
