CREATE TABLE IF NOT EXISTS public.value_action_sprint_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.value_action_sprint_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  business_type text,
  annual_revenue numeric,
  revenue_trend text,
  customer_count integer,
  recurring_revenue_percentage numeric,
  largest_customer_percentage numeric,
  owner_dependency text,
  documented_processes text,
  primary_growth_channel text,
  major_bottleneck text,
  biggest_risk text,

  score numeric,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(workspace_id)
);

CREATE TABLE IF NOT EXISTS public.value_action_sprint_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.value_action_sprint_workspaces(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  why_it_matters text,

  priority integer NOT NULL,
  impact_score numeric,
  effort_score numeric,

  status text NOT NULL DEFAULT 'locked',

  due_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT value_action_sprint_actions_status_check
    CHECK (
      status IN (
        'locked',
        'available',
        'in_progress',
        'completed',
        'skipped'
      )
    )
);

CREATE TABLE IF NOT EXISTS public.value_action_sprint_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.value_action_sprint_actions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.value_action_sprint_workspaces(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  file_url text,

  created_at timestamptz NOT NULL DEFAULT now()
);
