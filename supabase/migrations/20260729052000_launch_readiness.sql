-- Profiles: onboarding state
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'start',
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS business_name text;

-- Ensure new auth users have a profile row (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (
    id,
    account_type,
    full_name,
    business_name,
    current_stage,
    onboarding_complete,
    updated_at
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'account_type', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'business_name', ''),
    'start',
    false,
    now()
  )
  on conflict (id) do update
  set account_type = coalesce(excluded.account_type, public.profiles.account_type),
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      business_name = coalesce(excluded.business_name, public.profiles.business_name),
      updated_at = now();

  return new;
end;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND c.relkind = 'r'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Listings: publish fields and canonical public slug
ALTER TABLE IF EXISTS public.business_listings
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

UPDATE public.business_listings
SET slug = lower(regexp_replace(slug, '^\s+|\s+$', '', 'g'))
WHERE slug IS NOT NULL
  AND slug <> lower(regexp_replace(slug, '^\s+|\s+$', '', 'g'));

UPDATE public.business_listings
SET slug = lower(regexp_replace(coalesce(business_name, 'business'), '[^a-zA-Z0-9]+', '-', 'g'))
          || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR btrim(slug) = '';

WITH ranked AS (
  SELECT id, slug,
         row_number() OVER (PARTITION BY lower(slug) ORDER BY created_at, id) AS rn
  FROM public.business_listings
  WHERE slug IS NOT NULL AND btrim(slug) <> ''
)
UPDATE public.business_listings bl
SET slug = lower(bl.slug) || '-' || substr(bl.id::text, 1, 8)
FROM ranked
WHERE ranked.id = bl.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS public.business_listings_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS business_listings_slug_lower_key
  ON public.business_listings (lower(slug))
  WHERE slug IS NOT NULL AND btrim(slug) <> '';

-- Listings owner and public policies
DROP POLICY IF EXISTS "Users can insert their own listings" ON public.business_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.business_listings;
DROP POLICY IF EXISTS "Users can view their own listings" ON public.business_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.business_listings;
DROP POLICY IF EXISTS "Users can manage their own listings" ON public.business_listings;
DROP POLICY IF EXISTS "Public can view published business listings" ON public.business_listings;

CREATE POLICY "Users can manage their own listings"
  ON public.business_listings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view published business listings"
  ON public.business_listings
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND status = 'published');

-- Documents owner policy (idempotent)
DROP POLICY IF EXISTS "Users can view their own document metadata" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own document metadata" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own document metadata" ON public.documents;
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;

CREATE POLICY "Users can manage their own documents"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create/lock down private vault bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false;

-- Users can CRUD only their own files in vault
DROP POLICY IF EXISTS "Users can upload to own vault folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vault files" ON storage.objects;

CREATE POLICY "Users can upload to own vault folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own vault files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vault'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own vault files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vault'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vault'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own vault files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vault'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
