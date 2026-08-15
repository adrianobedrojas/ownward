-- Value Action Sprint trial support

ALTER TABLE public.value_action_sprint_workspaces
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'paid';

ALTER TABLE public.value_action_sprint_workspaces
  DROP CONSTRAINT IF EXISTS value_action_sprint_workspaces_access_mode_check;

ALTER TABLE public.value_action_sprint_workspaces
  ADD CONSTRAINT value_action_sprint_workspaces_access_mode_check
  CHECK (access_mode IN ('trial', 'paid', 'expired'));

CREATE INDEX IF NOT EXISTS value_action_sprint_workspaces_trial_ends_at_idx
  ON public.value_action_sprint_workspaces (trial_ends_at);
