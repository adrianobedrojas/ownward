ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_marketing_consent boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_marketing_consent_at timestamp with time zone;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_marketing_consent_version text;