-- 1. Align column names with standard naming
ALTER TABLE public.documents 
  RENAME COLUMN name TO filename;

ALTER TABLE public.documents 
  RENAME COLUMN file_path TO storage_path;

ALTER TABLE public.documents 
  RENAME COLUMN file_size TO filesize;

ALTER TABLE public.documents 
  RENAME COLUMN file_type TO filetype;

-- 2. Add public_url column if it's missing
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS public_url TEXT;

-- 3. Make folder optional/nullable if needed
ALTER TABLE public.documents 
  ALTER COLUMN folder DROP NOT NULL;

-- 4. Consolidate RLS policies into a single manager policy
DROP POLICY IF EXISTS "Users can view their own document metadata" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own document metadata" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own document metadata" ON public.documents;

CREATE POLICY "Users can manage their own documents"
    ON public.documents
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);