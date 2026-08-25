-- Persist product-pin image identity for debugging and cross-batch uniqueness.
ALTER TABLE IF EXISTS public.site_pins
  ADD COLUMN IF NOT EXISTS source_image_normalized_url text,
  ADD COLUMN IF NOT EXISTS source_image_hash text,
  ADD COLUMN IF NOT EXISTS image_source text,
  ADD COLUMN IF NOT EXISTS image_relevance_score numeric,
  ADD COLUMN IF NOT EXISTS image_match_reason text;

COMMENT ON COLUMN public.site_pins.source_image_normalized_url IS 'CDN-stable URL key (host+path, size suffixes stripped)';
COMMENT ON COLUMN public.site_pins.source_image_hash IS 'SHA-256 of downloaded image bytes';
COMMENT ON COLUMN public.site_pins.image_source IS 'product_page | pixabay | null';
COMMENT ON COLUMN public.site_pins.image_relevance_score IS 'Product relevance score at assignment time';
COMMENT ON COLUMN public.site_pins.image_match_reason IS 'Human-readable why this image was accepted';
