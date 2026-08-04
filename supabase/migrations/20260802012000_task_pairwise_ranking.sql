ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS pairwise_rating integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS pairwise_comparison_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pairwise_win_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_pairwise_rating_positive_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_pairwise_rating_positive_check
      CHECK (pairwise_rating > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_pairwise_comparison_count_nonnegative_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_pairwise_comparison_count_nonnegative_check
      CHECK (pairwise_comparison_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_pairwise_win_count_nonnegative_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_pairwise_win_count_nonnegative_check
      CHECK (pairwise_win_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_pairwise_win_count_lte_comparison_count_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_pairwise_win_count_lte_comparison_count_check
      CHECK (pairwise_win_count <= pairwise_comparison_count);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.task_pairwise_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  loser_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  winner_rating_before integer NOT NULL,
  loser_rating_before integer NOT NULL,
  winner_rating_after integer NOT NULL,
  loser_rating_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_pairwise_comparisons_distinct_tasks_check CHECK (winner_task_id <> loser_task_id),
  CONSTRAINT task_pairwise_comparisons_winner_rating_before_positive_check CHECK (winner_rating_before > 0),
  CONSTRAINT task_pairwise_comparisons_loser_rating_before_positive_check CHECK (loser_rating_before > 0),
  CONSTRAINT task_pairwise_comparisons_winner_rating_after_positive_check CHECK (winner_rating_after > 0),
  CONSTRAINT task_pairwise_comparisons_loser_rating_after_positive_check CHECK (loser_rating_after > 0)
);

COMMENT ON TABLE public.task_pairwise_comparisons IS
  'Private history of authenticated users'' pairwise task-priority choices and rating snapshots.';

CREATE INDEX IF NOT EXISTS task_pairwise_comparisons_user_id_idx
  ON public.task_pairwise_comparisons (user_id);

CREATE INDEX IF NOT EXISTS task_pairwise_comparisons_created_at_idx
  ON public.task_pairwise_comparisons (created_at DESC);

CREATE INDEX IF NOT EXISTS task_pairwise_comparisons_winner_task_id_idx
  ON public.task_pairwise_comparisons (winner_task_id);

CREATE INDEX IF NOT EXISTS task_pairwise_comparisons_loser_task_id_idx
  ON public.task_pairwise_comparisons (loser_task_id);

ALTER TABLE public.task_pairwise_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own task pairwise comparisons" ON public.task_pairwise_comparisons;
DROP POLICY IF EXISTS "Users can insert own task pairwise comparisons" ON public.task_pairwise_comparisons;

CREATE POLICY "Users can view own task pairwise comparisons"
  ON public.task_pairwise_comparisons
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task pairwise comparisons"
  ON public.task_pairwise_comparisons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.tasks AS winner_task
      WHERE winner_task.id = winner_task_id
        AND winner_task.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks AS loser_task
      WHERE loser_task.id = loser_task_id
        AND loser_task.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.record_task_pairwise_choice(
  p_winner_task_id uuid,
  p_loser_task_id uuid
)
RETURNS TABLE (
  user_id uuid,
  winner_task_id uuid,
  loser_task_id uuid,
  winner_rating_before integer,
  loser_rating_before integer,
  winner_rating_after integer,
  loser_rating_after integer,
  winner_comparison_count integer,
  loser_comparison_count integer,
  winner_win_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_locked_task_count integer;
  v_winner_rating_before integer;
  v_loser_rating_before integer;
  v_winner_comparison_before integer;
  v_loser_comparison_before integer;
  v_winner_win_before integer;
  v_expected_winner double precision;
  v_expected_loser double precision;
  v_winner_rating_after integer;
  v_loser_rating_after integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to compare tasks.'
      USING ERRCODE = '42501';
  END IF;

  IF p_winner_task_id IS NULL OR p_loser_task_id IS NULL OR p_winner_task_id = p_loser_task_id THEN
    RAISE EXCEPTION 'Choose two different tasks to compare.'
      USING ERRCODE = '22023';
  END IF;

  WITH locked_tasks AS (
    SELECT id, pairwise_rating, pairwise_comparison_count, pairwise_win_count
    FROM public.tasks
    WHERE id IN (p_winner_task_id, p_loser_task_id)
      AND user_id = v_user_id
      AND status = 'todo'
    ORDER BY id
    FOR UPDATE
  )
  SELECT
    count(*)::integer,
    max(CASE WHEN id = p_winner_task_id THEN pairwise_rating END),
    max(CASE WHEN id = p_loser_task_id THEN pairwise_rating END),
    max(CASE WHEN id = p_winner_task_id THEN pairwise_comparison_count END),
    max(CASE WHEN id = p_loser_task_id THEN pairwise_comparison_count END),
    max(CASE WHEN id = p_winner_task_id THEN pairwise_win_count END)
  INTO
    v_locked_task_count,
    v_winner_rating_before,
    v_loser_rating_before,
    v_winner_comparison_before,
    v_loser_comparison_before,
    v_winner_win_before
  FROM locked_tasks;

  IF v_locked_task_count <> 2 THEN
    RAISE EXCEPTION 'Tasks must belong to the authenticated user and remain unfinished.'
      USING ERRCODE = 'P0001';
  END IF;

  v_expected_winner := 1 / (1 + power(10, (v_loser_rating_before - v_winner_rating_before) / 400.0));
  v_expected_loser := 1 / (1 + power(10, (v_winner_rating_before - v_loser_rating_before) / 400.0));

  v_winner_rating_after := round(v_winner_rating_before + 32 * (1 - v_expected_winner));
  v_loser_rating_after := round(v_loser_rating_before + 32 * (0 - v_expected_loser));

  UPDATE public.tasks
  SET
    pairwise_rating = v_winner_rating_after,
    pairwise_comparison_count = pairwise_comparison_count + 1,
    pairwise_win_count = pairwise_win_count + 1,
    updated_at = now()
  WHERE id = p_winner_task_id
    AND user_id = v_user_id;

  UPDATE public.tasks
  SET
    pairwise_rating = v_loser_rating_after,
    pairwise_comparison_count = pairwise_comparison_count + 1,
    updated_at = now()
  WHERE id = p_loser_task_id
    AND user_id = v_user_id;

  INSERT INTO public.task_pairwise_comparisons (
    user_id,
    winner_task_id,
    loser_task_id,
    winner_rating_before,
    loser_rating_before,
    winner_rating_after,
    loser_rating_after
  )
  VALUES (
    v_user_id,
    p_winner_task_id,
    p_loser_task_id,
    v_winner_rating_before,
    v_loser_rating_before,
    v_winner_rating_after,
    v_loser_rating_after
  );

  RETURN QUERY
  SELECT
    v_user_id,
    p_winner_task_id,
    p_loser_task_id,
    v_winner_rating_before,
    v_loser_rating_before,
    v_winner_rating_after,
    v_loser_rating_after,
    v_winner_comparison_before + 1,
    v_loser_comparison_before + 1,
    v_winner_win_before + 1;
END;
$$;

COMMENT ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) IS
  'Records a private task-priority comparison for the authenticated user. SECURITY INVOKER is used intentionally so the caller''s RLS policies and table grants remain in force while the function performs the two task updates and comparison-history insert atomically.';

REVOKE ALL ON TABLE public.task_pairwise_comparisons FROM anon;
REVOKE ALL ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) FROM anon;

GRANT SELECT, INSERT ON public.task_pairwise_comparisons TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_pairwise_comparisons TO service_role;
GRANT EXECUTE ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) TO service_role;
