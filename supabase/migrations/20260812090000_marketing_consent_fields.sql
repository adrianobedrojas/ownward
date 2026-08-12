ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_source text,
  ADD COLUMN IF NOT EXISTS third_party_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS third_party_marketing_opt_in_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS third_party_marketing_opt_in_source text,
  ADD COLUMN IF NOT EXISTS marketing_consent_version text;

COMMENT ON COLUMN public.profiles.marketing_opt_in IS 'User consent for Ownward first-party marketing emails.';
COMMENT ON COLUMN public.profiles.third_party_marketing_opt_in IS 'User consent for partner/third-party marketing communications.';