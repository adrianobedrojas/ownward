-- ============================================================
-- Bookkeeping Foundation Migration
-- Extends transactions, adds bookkeeping_periods, RLS, indexes,
-- and an atomic mark_invoice_paid function.
-- ============================================================

-- ── 1. Extend public.transactions (backward-compatible) ──────────────────────

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS business_id       uuid         NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor            text,
  ADD COLUMN IF NOT EXISTS payment_method    text,
  ADD COLUMN IF NOT EXISTS tax_category      text,
  ADD COLUMN IF NOT EXISTS is_tax_deductible boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS receipt_document_id uuid       NULL REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status     text         NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS source            text         NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS reconciled_at     timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz  NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invoice_id        uuid         NULL REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Check constraints (add only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_review_status_check' AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_review_status_check
        CHECK (review_status IN ('needs_review', 'reviewed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_source_check' AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_source_check
        CHECK (source IN ('manual', 'invoice', 'import'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_payment_method_check' AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_payment_method_check
        CHECK (
          payment_method IS NULL OR
          payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'ach', 'wire', 'other')
        );
  END IF;
END
$$;

-- Unique partial index: one transaction per invoice
CREATE UNIQUE INDEX IF NOT EXISTS transactions_invoice_id_unique
  ON public.transactions (invoice_id)
  WHERE invoice_id IS NOT NULL;

-- ── 2. Indexes on transactions ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_review_idx
  ON public.transactions (user_id, review_status);

CREATE INDEX IF NOT EXISTS transactions_user_business_idx
  ON public.transactions (user_id, business_id);

CREATE INDEX IF NOT EXISTS transactions_receipt_idx
  ON public.transactions (receipt_document_id)
  WHERE receipt_document_id IS NOT NULL;

-- ── 3. updated_at trigger for transactions ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_set_updated_at ON public.transactions;
CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. RLS: UPDATE policy for transactions (was missing) ─────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND policyname = 'Users can update their own transactions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can update their own transactions"
        ON public.transactions
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END
$$;

-- ── 5. Create public.bookkeeping_periods ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bookkeeping_periods (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid        NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  month_start date        NOT NULL,
  status      text        NOT NULL DEFAULT 'open',
  closed_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookkeeping_periods_status_check
    CHECK (status IN ('open', 'closed')),
  CONSTRAINT bookkeeping_periods_unique_period
    UNIQUE (user_id, business_id, month_start)
);

-- Partial unique for null business_id
CREATE UNIQUE INDEX IF NOT EXISTS bookkeeping_periods_null_business_unique
  ON public.bookkeeping_periods (user_id, month_start)
  WHERE business_id IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS bookkeeping_periods_set_updated_at ON public.bookkeeping_periods;
CREATE TRIGGER bookkeeping_periods_set_updated_at
  BEFORE UPDATE ON public.bookkeeping_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.bookkeeping_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can select their own bookkeeping periods"
  ON public.bookkeeping_periods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookkeeping periods"
  ON public.bookkeeping_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      business_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE businesses.id = bookkeeping_periods.business_id
          AND businesses.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own bookkeeping periods"
  ON public.bookkeeping_periods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      business_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE businesses.id = bookkeeping_periods.business_id
          AND businesses.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own bookkeeping periods"
  ON public.bookkeeping_periods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 6. Atomic mark_invoice_paid function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_invoice_paid(p_invoice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_invoice      public.invoices%ROWTYPE;
  v_tx_id        uuid;
BEGIN
  -- Verify authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Lock and verify ownership
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'invoice_already_paid' USING ERRCODE = 'P0003';
  END IF;

  -- Prevent duplicate revenue transactions
  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE invoice_id = p_invoice_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'transaction_already_exists' USING ERRCODE = 'P0004';
  END IF;

  -- Mark invoice paid
  UPDATE public.invoices
  SET status = 'paid'
  WHERE id = p_invoice_id
    AND user_id = v_user_id;

  -- Create revenue transaction using server-side invoice amount (not client-supplied)
  INSERT INTO public.transactions (
    user_id,
    title,
    amount,
    type,
    status,
    category,
    transaction_date,
    review_status,
    source,
    invoice_id
  )
  VALUES (
    v_user_id,
    'Invoice payment – ' || v_invoice.customer_name,
    v_invoice.amount,
    'revenue',
    'paid',
    'services',
    COALESCE(v_invoice.due_date, CURRENT_DATE),
    'needs_review',
    'invoice',
    p_invoice_id
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;
