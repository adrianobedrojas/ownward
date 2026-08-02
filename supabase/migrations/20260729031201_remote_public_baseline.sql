-- ============================================================
-- Remote Public Baseline
-- Version: 20260729031201
--
-- This migration recreates the exact public schema that existed in
-- production before any forward migrations were applied locally.
-- It is sourced from the snapshot captured on 2026-08-01:
--   database/reconciliation/20260801_remote_public_schema_before_reconciliation.sql
--
-- Production recorded this version as already applied, so a future
-- `supabase db push` will skip this file automatically.
--
-- Rules applied:
--   - No OWNER TO statements (environment-specific)
--   - No event trigger DDL (Supabase-managed)
--   - No customer data
--   - No broad default privilege grants (TRUNCATE / TRIGGER / REFERENCES / MAINTAIN)
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Minimal bootstrap version; 20260729052000 replaces this with a full upsert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_listings (
    id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
    user_id         uuid                     NOT NULL,
    business_name   text                     NOT NULL,
    category        text                     NOT NULL,
    location        text,
    year_established integer,
    annual_revenue  numeric,
    asking_price    numeric,
    summary         text,
    status          text                     DEFAULT 'draft' NOT NULL,
    created_at      timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    updated_at      timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT business_listings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.businesses (
    id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
    owner_id    uuid                     NOT NULL,
    slug        text                     NOT NULL,
    name        text                     NOT NULL,
    description text,
    is_public   boolean                  DEFAULT false NOT NULL,
    created_at  timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT businesses_pkey        PRIMARY KEY (id),
    CONSTRAINT businesses_slug_key    UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.business_visits (
    id            bigint                   NOT NULL GENERATED ALWAYS AS IDENTITY
                    (SEQUENCE NAME public.business_visits_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1),
    business_id   uuid                     NOT NULL,
    visitor_token uuid                     NOT NULL,
    created_at    timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_visits_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.community_actions (
    id            bigint NOT NULL GENERATED ALWAYS AS IDENTITY
                    (SEQUENCE NAME public.community_actions_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1),
    business_id   uuid   NOT NULL,
    visitor_token uuid   NOT NULL,
    action_type   text   NOT NULL,
    created_at    timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_actions_pkey                               PRIMARY KEY (id),
    CONSTRAINT community_actions_business_id_visitor_token_action_type_key UNIQUE (business_id, visitor_token, action_type),
    CONSTRAINT community_actions_action_type_check                  CHECK (action_type = ANY (ARRAY['follow', 'support', 'share']))
);

CREATE TABLE IF NOT EXISTS public.community_pulse_responses (
    id               uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id      uuid NOT NULL,
    visitor_token    uuid NOT NULL,
    relationship     text NOT NULL,
    support_intent   text NOT NULL,
    reveal_identity  boolean DEFAULT false NOT NULL,
    visitor_name     text,
    visitor_email    text,
    created_at       timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_pulse_responses_pkey                          PRIMARY KEY (id),
    CONSTRAINT community_pulse_responses_business_id_visitor_token_key UNIQUE (business_id, visitor_token),
    CONSTRAINT community_pulse_responses_relationship_check CHECK (
        relationship = ANY (ARRAY['do_not_know','know_about','customer','community','friend_family','business_connection'])
    ),
    CONSTRAINT community_pulse_responses_support_intent_check CHECK (
        support_intent = ANY (ARRAY['follow','share','become_customer','collaborate','offer_advice','invest_or_buy','just_browsing'])
    ),
    CONSTRAINT identity_only_when_revealed CHECK (
        reveal_identity OR (visitor_name IS NULL AND visitor_email IS NULL)
    )
);

-- documents: columns reflect the post-rename state already in production
CREATE TABLE IF NOT EXISTS public.documents (
    id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
    user_id      uuid                     NOT NULL,
    filename     text                     NOT NULL,
    storage_path text                     NOT NULL,
    folder       text,
    filesize     bigint                   NOT NULL,
    filetype     text                     NOT NULL,
    notes        text,
    created_at   timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    public_url   text,
    CONSTRAINT documents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id            uuid                     DEFAULT gen_random_uuid() NOT NULL,
    user_id       uuid                     NOT NULL,
    customer_name text                     NOT NULL,
    amount        numeric(10,2)            DEFAULT 0.00 NOT NULL,
    status        text                     DEFAULT 'draft' NOT NULL,
    due_date      date,
    created_at    timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT invoices_pkey         PRIMARY KEY (id),
    CONSTRAINT invoices_status_check CHECK (status = ANY (ARRAY['draft','unpaid','paid']))
);

CREATE TABLE IF NOT EXISTS public.listings (
    id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
    name           text                     NOT NULL,
    category       text,
    location       text,
    description    text,
    asking_price   text,
    annual_revenue text,
    owner_earnings text,
    is_demo        boolean                  DEFAULT false,
    created_at     timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT listings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id                  uuid NOT NULL,
    updated_at          timestamp with time zone,
    stripe_customer_id  text,
    subscription_status text DEFAULT 'inactive',
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                   text                     NOT NULL,
    user_id              uuid                     NOT NULL,
    status               text                     NOT NULL,
    price_id             text                     NOT NULL,
    quantity             integer                  NOT NULL,
    cancel_at_period_end boolean                  DEFAULT false NOT NULL,
    created_at           timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    updated_at           timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
    user_id          uuid                     NOT NULL,
    title            text                     NOT NULL,
    amount           numeric                  NOT NULL,
    type             text                     NOT NULL,
    status           text                     DEFAULT 'paid' NOT NULL,
    category         text                     NOT NULL,
    transaction_date date                     DEFAULT CURRENT_DATE NOT NULL,
    created_at       timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT transactions_pkey         PRIMARY KEY (id),
    CONSTRAINT transactions_status_check CHECK (status = ANY (ARRAY['paid','pending'])),
    CONSTRAINT transactions_type_check   CHECK (type   = ANY (ARRAY['revenue','expense','invoice']))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS business_visits_business_date_index
    ON public.business_visits (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS community_actions_business_date_index
    ON public.community_actions (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pulse_responses_business_date_index
    ON public.community_pulse_responses (business_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Foreign keys
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.business_listings
    ADD CONSTRAINT business_listings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.business_visits
    ADD CONSTRAINT business_visits_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.community_actions
    ADD CONSTRAINT community_actions_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.community_pulse_responses
    ADD CONSTRAINT community_pulse_responses_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.documents
    ADD CONSTRAINT documents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.business_listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_visits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_actions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pulse_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions             ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – business_listings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can insert their own listings"
    ON public.business_listings FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
    ON public.business_listings FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own listings"
    ON public.business_listings FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – business_visits
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Visitors can record public business visits"
    ON public.business_visits FOR INSERT TO authenticated, anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE businesses.id = business_visits.business_id
              AND businesses.is_public = true
        )
    );

CREATE POLICY "Owners can view their visit analytics"
    ON public.business_visits FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE businesses.id = business_visits.business_id
              AND businesses.owner_id = (SELECT auth.uid())
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – businesses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Owners can manage their businesses"
    ON public.businesses TO authenticated
    USING ((SELECT auth.uid()) = owner_id)
    WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Public can view public businesses"
    ON public.businesses FOR SELECT TO authenticated, anon
    USING (is_public = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – community_actions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Visitors can record public business actions"
    ON public.community_actions FOR INSERT TO authenticated, anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE businesses.id = community_actions.business_id
              AND businesses.is_public = true
        )
    );

CREATE POLICY "Owners can view their community actions"
    ON public.community_actions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE businesses.id = community_actions.business_id
              AND businesses.owner_id = (SELECT auth.uid())
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – community_pulse_responses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Visitors can answer public business surveys"
    ON public.community_pulse_responses FOR INSERT TO authenticated, anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE businesses.id = community_pulse_responses.business_id
              AND businesses.is_public = true
        )
    );

CREATE POLICY "Owners can view their pulse responses"
    ON public.community_pulse_responses FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE businesses.id = community_pulse_responses.business_id
              AND businesses.owner_id = (SELECT auth.uid())
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can manage their own documents"
    ON public.documents TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – invoices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
    ON public.invoices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
    ON public.invoices FOR DELETE
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – listings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Allow public read access"
    ON public.listings FOR SELECT
    USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies – transactions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Schema-level grants (minimal; table-level grants in 20260731160000_api_grants.sql)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
