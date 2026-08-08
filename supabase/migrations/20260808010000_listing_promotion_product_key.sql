ALTER TABLE public.listing_promotions
  ADD COLUMN IF NOT EXISTS product_key text;

UPDATE public.listing_promotions
SET product_key = 'featured_listing'
WHERE product_key IS NULL;

ALTER TABLE public.listing_promotions
  ALTER COLUMN product_key SET NOT NULL;

ALTER TABLE public.listing_promotions
  DROP CONSTRAINT IF EXISTS listing_promotions_product_key_check;

ALTER TABLE public.listing_promotions
  ADD CONSTRAINT listing_promotions_product_key_check
  CHECK (product_key IN ('quick_boost', 'featured_listing'));

CREATE INDEX IF NOT EXISTS listing_promotions_product_key_idx
  ON public.listing_promotions (product_key);
