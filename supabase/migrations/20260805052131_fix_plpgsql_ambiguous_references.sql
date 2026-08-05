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
		SELECT
			t.id,
			t.pairwise_rating,
			t.pairwise_comparison_count,
			t.pairwise_win_count
		FROM public.tasks AS t
		WHERE t.id IN (p_winner_task_id, p_loser_task_id)
			AND t.user_id = v_user_id
			AND t.status = 'todo'
		ORDER BY t.id
		FOR UPDATE
	)
	SELECT
		count(*)::integer,
		max(CASE WHEN lt.id = p_winner_task_id THEN lt.pairwise_rating END),
		max(CASE WHEN lt.id = p_loser_task_id THEN lt.pairwise_rating END),
		max(CASE WHEN lt.id = p_winner_task_id THEN lt.pairwise_comparison_count END),
		max(CASE WHEN lt.id = p_loser_task_id THEN lt.pairwise_comparison_count END),
		max(CASE WHEN lt.id = p_winner_task_id THEN lt.pairwise_win_count END)
	INTO
		v_locked_task_count,
		v_winner_rating_before,
		v_loser_rating_before,
		v_winner_comparison_before,
		v_loser_comparison_before,
		v_winner_win_before
	FROM locked_tasks AS lt;

	IF v_locked_task_count <> 2 THEN
		RAISE EXCEPTION 'Tasks must belong to the authenticated user and remain unfinished.'
			USING ERRCODE = 'P0001';
	END IF;

	v_expected_winner := 1 / (1 + power(10, (v_loser_rating_before - v_winner_rating_before) / 400.0));
	v_expected_loser := 1 / (1 + power(10, (v_winner_rating_before - v_loser_rating_before) / 400.0));

	v_winner_rating_after := round(v_winner_rating_before + 32 * (1 - v_expected_winner));
	v_loser_rating_after := round(v_loser_rating_before + 32 * (0 - v_expected_loser));

	UPDATE public.tasks AS t
	SET
		pairwise_rating = v_winner_rating_after,
		pairwise_comparison_count = t.pairwise_comparison_count + 1,
		pairwise_win_count = t.pairwise_win_count + 1,
		updated_at = now()
	WHERE t.id = p_winner_task_id
		AND t.user_id = v_user_id;

	UPDATE public.tasks AS t
	SET
		pairwise_rating = v_loser_rating_after,
		pairwise_comparison_count = t.pairwise_comparison_count + 1,
		updated_at = now()
	WHERE t.id = p_loser_task_id
		AND t.user_id = v_user_id;

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

CREATE OR REPLACE FUNCTION public.accept_business_invitation_atomic(
	p_token_hash text,
	p_seat_limit integer
)
RETURNS TABLE(ok boolean, business_id uuid, invitation_id uuid, role text, error_code text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
	v_actor uuid := auth.uid();
	v_inv public.business_member_invitations%ROWTYPE;
	v_owner_id uuid;
	v_user_email text;
	v_used integer;
BEGIN
	IF v_actor IS NULL THEN
		RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text, 'unauthorized', 'Unauthorized';
		RETURN;
	END IF;

	SELECT *
	INTO v_inv
	FROM public.business_member_invitations AS bmi
	WHERE bmi.token_hash = p_token_hash
	FOR UPDATE;

	IF NOT FOUND THEN
		RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text, 'invalid', 'Invitation not found';
		RETURN;
	END IF;

	IF v_inv.status = 'revoked' THEN
		RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'revoked', 'Invitation revoked';
		RETURN;
	END IF;

	IF v_inv.status IN ('accepted', 'declined') THEN
		RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'already_used', 'Invitation already used';
		RETURN;
	END IF;

	IF v_inv.status <> 'pending' THEN
		RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'invalid_status', 'Invitation is not pending';
		RETURN;
	END IF;

	IF v_inv.expires_at <= now() THEN
		UPDATE public.business_member_invitations AS bmi
		SET status = 'expired', updated_at = now()
		WHERE bmi.id = v_inv.id;

		RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'expired', 'Invitation expired';
		RETURN;
	END IF;

	v_user_email := public.normalize_email(coalesce(auth.jwt() ->> 'email', ''));

	IF coalesce(v_user_email, '') = '' THEN
		SELECT public.normalize_email(coalesce(au.email::text, ''))
		INTO v_user_email
		FROM auth.users AS au
		WHERE au.id = v_actor;
	END IF;

	IF public.normalize_email(v_inv.email) <> v_user_email THEN
		RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'wrong_email', 'Invitation email does not match';
		RETURN;
	END IF;

	SELECT b.owner_id
	INTO v_owner_id
	FROM public.businesses AS b
	WHERE b.id = v_inv.business_id
		AND b.deleted_at IS NULL
	FOR UPDATE;

	IF v_owner_id IS NULL THEN
		RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'business_not_found', 'Business not found';
		RETURN;
	END IF;

	PERFORM public.lock_owner_collaborator_quota(v_owner_id);

	IF NOT EXISTS (
		SELECT 1
		FROM public.business_members AS bm
		WHERE bm.business_id = v_inv.business_id
			AND bm.user_id = v_actor
			AND bm.status = 'active'
	) THEN
		v_used := public.count_owner_collaborator_usage(v_owner_id);
		IF p_seat_limit <= 0 OR v_used >= p_seat_limit THEN
			RETURN QUERY SELECT false, v_inv.business_id, v_inv.id, v_inv.role, 'no_seat', 'Collaborator seat limit reached';
			RETURN;
		END IF;
	END IF;

	INSERT INTO public.business_members AS bm (
		business_id,
		user_id,
		role,
		status,
		invited_by,
		joined_at,
		updated_at
	) VALUES (
		v_inv.business_id,
		v_actor,
		v_inv.role,
		'active',
		v_inv.invited_by,
		now(),
		now()
	)
	ON CONFLICT ON CONSTRAINT business_members_business_id_user_id_key
	DO UPDATE
		SET role = EXCLUDED.role,
				status = 'active',
				invited_by = EXCLUDED.invited_by,
				joined_at = coalesce(bm.joined_at, EXCLUDED.joined_at),
				updated_at = now();

	UPDATE public.business_member_invitations AS bmi
	SET status = 'accepted',
			accepted_at = now(),
			updated_at = now()
	WHERE bmi.id = v_inv.id;

	INSERT INTO public.business_activity_events (
		user_id,
		business_id,
		event_type,
		source_id,
		source_table,
		metadata,
		occurred_at
	) VALUES (
		v_actor,
		v_inv.business_id,
		'invitation_accepted',
		v_inv.id,
		'business_member_invitations',
		jsonb_build_object('role', v_inv.role),
		now()
	);

	RETURN QUERY SELECT true, v_inv.business_id, v_inv.id, v_inv.role, NULL::text, NULL::text;
END;
$$;
