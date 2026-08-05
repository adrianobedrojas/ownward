-- Admin Support and Contact Command Center
-- Forward migration: safe additive changes + lifecycle expansion

-- 1) Contact messages: add subject and stronger validation
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_support_request_id uuid,
  ADD COLUMN IF NOT EXISTS signed_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_ip_hash text,
  ADD COLUMN IF NOT EXISTS user_agent text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_subject_len_check'
      AND conrelid = 'public.contact_messages'::regclass
  ) THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_subject_len_check
      CHECK (subject IS NULL OR char_length(subject) <= 300);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_name_len_check'
      AND conrelid = 'public.contact_messages'::regclass
  ) THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_name_len_check
      CHECK (char_length(name) > 0 AND char_length(name) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_email_len_check'
      AND conrelid = 'public.contact_messages'::regclass
  ) THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_email_len_check
      CHECK (char_length(email) > 3 AND char_length(email) <= 254);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_message_len_check'
      AND conrelid = 'public.contact_messages'::regclass
  ) THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_message_len_check
      CHECK (char_length(message) > 0 AND char_length(message) <= 5000);
  END IF;
END
$$;

ALTER TABLE public.contact_messages DROP CONSTRAINT IF EXISTS contact_messages_status_check;
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_status_check
  CHECK (status IN ('new', 'reviewed', 'resolved', 'archived', 'converted_to_support'));

CREATE INDEX IF NOT EXISTS contact_messages_status_created_idx
  ON public.contact_messages (status, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_messages_email_created_idx
  ON public.contact_messages (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS contact_messages_admin_status_idx
  ON public.contact_messages (assigned_admin_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_messages_ip_created_idx
  ON public.contact_messages (submission_ip_hash, created_at DESC);

-- 2) Dedicated platform admin model
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_admins_role_check
    CHECK (admin_role IN ('owner', 'support_admin', 'moderator', 'read_only'))
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own platform admin row" ON public.platform_admins;
CREATE POLICY "Users view own platform admin row"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.platform_admins TO authenticated;

-- 3) Support request lifecycle expansion
ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolution_code text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.support_requests
SET status = CASE status
  WHEN 'submitted' THEN 'open'
  WHEN 'reviewing' THEN 'in_progress'
  WHEN 'awaiting_user' THEN 'waiting_on_user'
  WHEN 'resolved' THEN 'resolved'
  ELSE status
END
WHERE status IN ('submitted', 'reviewing', 'awaiting_user', 'resolved');

ALTER TABLE public.support_requests DROP CONSTRAINT IF EXISTS sr_status_check;
ALTER TABLE public.support_requests
  ADD CONSTRAINT sr_status_check
  CHECK (status IN (
    'open',
    'in_progress',
    'waiting_on_user',
    'waiting_on_internal',
    'resolved',
    'closed',
    'archived'
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sr_priority_check'
      AND conrelid = 'public.support_requests'::regclass
  ) THEN
    ALTER TABLE public.support_requests
      ADD CONSTRAINT sr_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sr_subject_len_check'
      AND conrelid = 'public.support_requests'::regclass
  ) THEN
    ALTER TABLE public.support_requests
      ADD CONSTRAINT sr_subject_len_check
      CHECK (char_length(subject) > 0 AND char_length(subject) <= 300);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sr_message_len_check'
      AND conrelid = 'public.support_requests'::regclass
  ) THEN
    ALTER TABLE public.support_requests
      ADD CONSTRAINT sr_message_len_check
      CHECK (char_length(message) > 0 AND char_length(message) <= 5000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sr_category_allowlist_check'
      AND conrelid = 'public.support_requests'::regclass
  ) THEN
    ALTER TABLE public.support_requests
      ADD CONSTRAINT sr_category_allowlist_check
      CHECK (
        category IS NULL
        OR category IN (
          'billing',
          'technical',
          'feature',
          'account',
          'security',
          'sales',
          'compliance',
          'other'
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS sr_priority_status_idx
  ON public.support_requests (priority, status, created_at DESC);

CREATE INDEX IF NOT EXISTS sr_assigned_status_idx
  ON public.support_requests (assigned_admin_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS sr_last_activity_idx
  ON public.support_requests (last_activity_at DESC);

CREATE INDEX IF NOT EXISTS sr_subject_search_idx
  ON public.support_requests (lower(subject));

-- 4) Threaded support communication
CREATE TABLE IF NOT EXISTS public.support_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message_type text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT srm_message_type_check
    CHECK (message_type IN ('customer_reply', 'admin_reply', 'internal_note')),
  CONSTRAINT srm_body_len_check
    CHECK (char_length(body) > 0 AND char_length(body) <= 5000),
  CONSTRAINT srm_author_exactly_one_check
    CHECK (num_nonnulls(author_user_id, author_admin_id) = 1),
  CONSTRAINT srm_internal_note_visibility_check
    CHECK ((message_type = 'internal_note') = is_internal)
);

CREATE INDEX IF NOT EXISTS srm_request_created_idx
  ON public.support_request_messages (request_id, created_at ASC);

CREATE INDEX IF NOT EXISTS srm_user_created_idx
  ON public.support_request_messages (author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS srm_admin_created_idx
  ON public.support_request_messages (author_admin_id, created_at DESC);

ALTER TABLE public.support_request_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own support request messages" ON public.support_request_messages;
CREATE POLICY "Users view own support request messages"
  ON public.support_request_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_requests sr
      WHERE sr.id = support_request_messages.request_id
        AND sr.user_id = auth.uid()
    )
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Users insert own support request messages" ON public.support_request_messages;
CREATE POLICY "Users insert own support request messages"
  ON public.support_request_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND author_admin_id IS NULL
    AND message_type = 'customer_reply'
    AND is_internal = false
    AND EXISTS (
      SELECT 1
      FROM public.support_requests sr
      WHERE sr.id = support_request_messages.request_id
        AND sr.user_id = auth.uid()
        AND sr.status = 'waiting_on_user'
    )
  );

GRANT SELECT, INSERT ON public.support_request_messages TO authenticated;

-- 5) Support/contact audit history
CREATE TABLE IF NOT EXISTS public.support_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sre_event_type_check
    CHECK (event_type IN (
      'request_created',
      'status_changed',
      'priority_changed',
      'administrator_assigned',
      'public_reply_sent',
      'internal_note_added',
      'request_resolved',
      'request_reopened',
      'request_archived'
    )),
  CONSTRAINT sre_actor_at_least_one_check
    CHECK (num_nonnulls(actor_user_id, actor_admin_id) >= 1)
);

CREATE INDEX IF NOT EXISTS sre_request_created_idx
  ON public.support_request_events (request_id, created_at DESC);

ALTER TABLE public.support_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own support request events" ON public.support_request_events;
CREATE POLICY "Users view own support request events"
  ON public.support_request_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_requests sr
      WHERE sr.id = support_request_events.request_id
        AND sr.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.support_request_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.contact_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_message_id uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  actor_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cme_event_type_check
    CHECK (event_type IN (
      'marked_reviewed',
      'converted_to_support',
      'assigned',
      'internal_note_added',
      'resolved',
      'archived',
      'linked_account'
    )),
  CONSTRAINT cme_note_len_check CHECK (note IS NULL OR char_length(note) <= 2000)
);

CREATE INDEX IF NOT EXISTS cme_contact_created_idx
  ON public.contact_message_events (contact_message_id, created_at DESC);

ALTER TABLE public.contact_message_events ENABLE ROW LEVEL SECURITY;

-- No direct user policies; operations are server-side with service role.

-- 6) Lightweight abuse/rate-limit signal log
CREATE TABLE IF NOT EXISTS public.request_security_events (
  id bigserial PRIMARY KEY,
  channel text NOT NULL,
  event_type text NOT NULL,
  email_hash text,
  ip_hash text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rse_channel_check CHECK (channel IN ('contact', 'support')),
  CONSTRAINT rse_event_type_check CHECK (
    event_type IN ('rate_limited', 'duplicate_submission', 'turnstile_required')
  )
);

CREATE INDEX IF NOT EXISTS rse_channel_created_idx
  ON public.request_security_events (channel, created_at DESC);

CREATE INDEX IF NOT EXISTS rse_email_created_idx
  ON public.request_security_events (email_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS rse_ip_created_idx
  ON public.request_security_events (ip_hash, created_at DESC);

ALTER TABLE public.request_security_events ENABLE ROW LEVEL SECURITY;
