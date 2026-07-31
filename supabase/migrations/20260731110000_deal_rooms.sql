-- ─────────────────────────────────────────────────────────────────────────────
-- Deal Room tables, RLS policies, and Supabase Storage bucket policies.
--
-- Depends on: 20260731090000_messaging_phase1.sql
--             (conversations, business_listings, auth.users must exist)
--
-- Storage bucket 'deal-room-files' must be created manually in the Supabase
-- dashboard (Storage → New bucket → name: deal-room-files, private: true).
-- The RLS policies on storage.objects are defined at the bottom of this file.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: deal_rooms
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  listing_id      uuid NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text,
  stage           text NOT NULL DEFAULT 'information_review',
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),
  closed_at       timestamp with time zone,
  CONSTRAINT deal_rooms_stage_check CHECK (
    stage IN ('information_review','due_diligence','offer_review','closing','completed')
  ),
  CONSTRAINT deal_rooms_status_check CHECK (
    status IN ('active','paused','closed','withdrawn')
  )
);

CREATE INDEX IF NOT EXISTS deal_rooms_conversation_id_idx ON public.deal_rooms (conversation_id);
CREATE INDEX IF NOT EXISTS deal_rooms_listing_id_idx      ON public.deal_rooms (listing_id);
CREATE INDEX IF NOT EXISTS deal_rooms_buyer_id_idx        ON public.deal_rooms (buyer_id);
CREATE INDEX IF NOT EXISTS deal_rooms_seller_id_idx       ON public.deal_rooms (seller_id);
CREATE INDEX IF NOT EXISTS deal_rooms_status_idx          ON public.deal_rooms (status);

ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: deal_room_members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id      uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email     text,
  role              text NOT NULL,
  membership_status text NOT NULL DEFAULT 'invited',
  invited_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at         timestamp with time zone,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT drm_role_check CHECK (
    role IN ('seller','buyer','advisor','accountant','attorney')
  ),
  CONSTRAINT drm_membership_status_check CHECK (
    membership_status IN ('invited','active','declined','removed')
  ),
  CONSTRAINT drm_user_or_email CHECK (
    user_id IS NOT NULL OR invited_email IS NOT NULL
  )
);

-- Prevent duplicate active memberships for the same Ownward user in a room
CREATE UNIQUE INDEX IF NOT EXISTS deal_room_members_unique_user
  ON public.deal_room_members (deal_room_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS drm_deal_room_id_idx      ON public.deal_room_members (deal_room_id);
CREATE INDEX IF NOT EXISTS drm_user_id_idx           ON public.deal_room_members (user_id);
CREATE INDEX IF NOT EXISTS drm_membership_status_idx ON public.deal_room_members (membership_status);

ALTER TABLE public.deal_room_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: deal_room_documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id  uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  uploaded_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  filename      text NOT NULL,
  filetype      text NOT NULL,
  filesize      bigint NOT NULL,
  category      text,
  description   text,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at    timestamp with time zone
);

CREATE INDEX IF NOT EXISTS drd_deal_room_id_idx  ON public.deal_room_documents (deal_room_id);
CREATE INDEX IF NOT EXISTS drd_uploaded_by_idx   ON public.deal_room_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS drd_deleted_at_idx    ON public.deal_room_documents (deleted_at);

ALTER TABLE public.deal_room_documents ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: deal_room_requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id         uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  created_by           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title                text NOT NULL,
  description          text,
  category             text,
  priority             text NOT NULL DEFAULT 'normal',
  status               text NOT NULL DEFAULT 'open',
  due_date             timestamp with time zone,
  linked_document_id   uuid REFERENCES public.deal_room_documents(id) ON DELETE SET NULL,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  updated_at           timestamp with time zone NOT NULL DEFAULT now(),
  completed_at         timestamp with time zone,
  CONSTRAINT drr_priority_check CHECK (
    priority IN ('low','normal','high','urgent')
  ),
  CONSTRAINT drr_status_check CHECK (
    status IN ('open','in_progress','completed','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS drr_deal_room_id_idx ON public.deal_room_requests (deal_room_id);
CREATE INDEX IF NOT EXISTS drr_status_idx       ON public.deal_room_requests (status);
CREATE INDEX IF NOT EXISTS drr_assigned_to_idx  ON public.deal_room_requests (assigned_to);

ALTER TABLE public.deal_room_requests ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: deal_room_activity
-- Activity records are append-only: no UPDATE or DELETE policies are defined.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_room_activity (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  actor_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  metadata     jsonb,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dra_event_type_check CHECK (
    event_type IN (
      'deal_room_created',
      'stage_changed',
      'status_changed',
      'member_invited',
      'member_removed',
      'document_uploaded',
      'document_deleted',
      'request_created',
      'request_updated',
      'request_completed'
    )
  )
);

CREATE INDEX IF NOT EXISTS dra_deal_room_id_idx ON public.deal_room_activity (deal_room_id);
CREATE INDEX IF NOT EXISTS dra_created_at_idx   ON public.deal_room_activity (created_at DESC);

ALTER TABLE public.deal_room_activity ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: is the calling user an active member of a deal room?
-- Used across multiple RLS policies.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_active_deal_room_member(p_deal_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deal_room_members
    WHERE deal_room_id = p_deal_room_id
      AND user_id = auth.uid()
      AND membership_status = 'active'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: is the calling user the seller (active member with
-- role = 'seller') of a deal room?
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_deal_room_seller(p_deal_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deal_room_members
    WHERE deal_room_id = p_deal_room_id
      AND user_id = auth.uid()
      AND role = 'seller'
      AND membership_status = 'active'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES: deal_rooms
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active members can view deal room" ON public.deal_rooms;
DROP POLICY IF EXISTS "Seller can create deal room" ON public.deal_rooms;
DROP POLICY IF EXISTS "Seller can update deal room" ON public.deal_rooms;

CREATE POLICY "Active members can view deal room"
  ON public.deal_rooms FOR SELECT TO authenticated
  USING (public.is_active_deal_room_member(id));

-- Only the seller of the conversation may create the deal room.
-- Pro entitlement is enforced in the server action; this policy adds DB-level
-- assurance that the creator is the conversation's actual seller.
CREATE POLICY "Seller can create deal room"
  ON public.deal_rooms FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.seller_id = auth.uid()
        AND c.listing_id = deal_rooms.listing_id
        AND c.buyer_id = deal_rooms.buyer_id
    )
  );

CREATE POLICY "Seller can update deal room"
  ON public.deal_rooms FOR UPDATE TO authenticated
  USING  (public.is_deal_room_seller(id))
  WITH CHECK (public.is_deal_room_seller(id));

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES: deal_room_members
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active members can view deal room members" ON public.deal_room_members;
DROP POLICY IF EXISTS "Seller can manage deal room members" ON public.deal_room_members;

CREATE POLICY "Active members can view deal room members"
  ON public.deal_room_members FOR SELECT TO authenticated
  USING (public.is_active_deal_room_member(deal_room_id));

-- Seller manages invites: INSERT and UPDATE membership records.
-- Server action also accepts/declines on behalf of the invited user.
CREATE POLICY "Seller can manage deal room members"
  ON public.deal_room_members FOR INSERT TO authenticated
  WITH CHECK (public.is_deal_room_seller(deal_room_id));

CREATE POLICY "Seller can update deal room members"
  ON public.deal_room_members FOR UPDATE TO authenticated
  USING  (public.is_deal_room_seller(deal_room_id))
  WITH CHECK (public.is_deal_room_seller(deal_room_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES: deal_room_documents
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active members can view deal room documents" ON public.deal_room_documents;
DROP POLICY IF EXISTS "Active members can upload deal room documents" ON public.deal_room_documents;
DROP POLICY IF EXISTS "Seller can soft-delete deal room documents" ON public.deal_room_documents;

CREATE POLICY "Active members can view deal room documents"
  ON public.deal_room_documents FOR SELECT TO authenticated
  USING (
    public.is_active_deal_room_member(deal_room_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "Active members can upload deal room documents"
  ON public.deal_room_documents FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND public.is_active_deal_room_member(deal_room_id)
  );

-- Only the seller (or the uploader themselves) may soft-delete documents.
CREATE POLICY "Seller can soft-delete deal room documents"
  ON public.deal_room_documents FOR UPDATE TO authenticated
  USING (
    public.is_active_deal_room_member(deal_room_id)
    AND (public.is_deal_room_seller(deal_room_id) OR uploaded_by = auth.uid())
  )
  WITH CHECK (
    public.is_active_deal_room_member(deal_room_id)
    AND (public.is_deal_room_seller(deal_room_id) OR uploaded_by = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES: deal_room_requests
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active members can view deal room requests" ON public.deal_room_requests;
DROP POLICY IF EXISTS "Active members can create deal room requests" ON public.deal_room_requests;
DROP POLICY IF EXISTS "Active members can update deal room requests" ON public.deal_room_requests;

CREATE POLICY "Active members can view deal room requests"
  ON public.deal_room_requests FOR SELECT TO authenticated
  USING (public.is_active_deal_room_member(deal_room_id));

CREATE POLICY "Active members can create deal room requests"
  ON public.deal_room_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_active_deal_room_member(deal_room_id)
  );

CREATE POLICY "Active members can update deal room requests"
  ON public.deal_room_requests FOR UPDATE TO authenticated
  USING  (public.is_active_deal_room_member(deal_room_id))
  WITH CHECK (public.is_active_deal_room_member(deal_room_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES: deal_room_activity
-- INSERT only; no UPDATE or DELETE — activity records are immutable.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active members can view deal room activity" ON public.deal_room_activity;
DROP POLICY IF EXISTS "Active members can insert deal room activity" ON public.deal_room_activity;

CREATE POLICY "Active members can view deal room activity"
  ON public.deal_room_activity FOR SELECT TO authenticated
  USING (public.is_active_deal_room_member(deal_room_id));

CREATE POLICY "Active members can insert deal room activity"
  ON public.deal_room_activity FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND public.is_active_deal_room_member(deal_room_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-update deal_rooms.updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deal_rooms_update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_rooms_updated_at ON public.deal_rooms;
CREATE TRIGGER deal_rooms_updated_at
  BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW EXECUTE FUNCTION public.deal_rooms_update_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Storage: deal-room-files bucket
--
-- The bucket itself must be created manually:
--   Supabase dashboard → Storage → New bucket
--   Name: deal-room-files   |   Public: OFF
--
-- The policies below control which authenticated users may read/write objects.
-- File paths are expected to begin with the Deal Room UUID:
--   {deal_room_id}/{random_object_name}
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Active members can upload deal room files" ON storage.objects;
DROP POLICY IF EXISTS "Active members can read deal room files"   ON storage.objects;
DROP POLICY IF EXISTS "Active members can delete deal room files" ON storage.objects;

CREATE POLICY "Active members can upload deal room files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-room-files'
    AND public.is_active_deal_room_member(
      (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "Active members can read deal room files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-room-files'
    AND public.is_active_deal_room_member(
      (string_to_array(name, '/'))[1]::uuid
    )
  );

-- Only the seller may delete storage objects (documents are soft-deleted at
-- the DB level; hard deletion of storage objects is a separate privilege).
CREATE POLICY "Seller can delete deal room files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'deal-room-files'
    AND public.is_deal_room_seller(
      (string_to_array(name, '/'))[1]::uuid
    )
  );
