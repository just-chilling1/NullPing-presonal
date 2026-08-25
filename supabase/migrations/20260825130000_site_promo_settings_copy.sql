-- Admin-editable headline + CTA labels for training banners and Scale Training
ALTER TABLE public.site_promo_settings
  ADD COLUMN IF NOT EXISTS external_training_title text;

ALTER TABLE public.site_promo_settings
  ADD COLUMN IF NOT EXISTS external_training_cta_label text;

ALTER TABLE public.site_promo_settings
  ADD COLUMN IF NOT EXISTS scale_training_title text;

ALTER TABLE public.site_promo_settings
  ADD COLUMN IF NOT EXISTS scale_training_cta_label text;

UPDATE public.site_promo_settings
SET
  external_training_title = COALESCE(
    NULLIF(trim(external_training_title), ''),
    'Multiply Your Earnings To $1,000 – $5,000 A Day'
  ),
  external_training_cta_label = COALESCE(
    NULLIF(trim(external_training_cta_label), ''),
    'Click Here To Learn How'
  ),
  scale_training_title = COALESCE(
    NULLIF(trim(scale_training_title), ''),
    'Scale Your NullPing Cash To $1,000+ Per Day'
  ),
  scale_training_cta_label = COALESCE(
    NULLIF(trim(scale_training_cta_label), ''),
    'Click Here To Access Training'
  )
WHERE id = 1;

ALTER TABLE public.site_promo_settings
  ALTER COLUMN external_training_title SET DEFAULT 'Multiply Your Earnings To $1,000 – $5,000 A Day',
  ALTER COLUMN external_training_cta_label SET DEFAULT 'Click Here To Learn How',
  ALTER COLUMN scale_training_title SET DEFAULT 'Scale Your NullPing Cash To $1,000+ Per Day',
  ALTER COLUMN scale_training_cta_label SET DEFAULT 'Click Here To Access Training';

ALTER TABLE public.site_promo_settings
  ALTER COLUMN external_training_title SET NOT NULL,
  ALTER COLUMN external_training_cta_label SET NOT NULL,
  ALTER COLUMN scale_training_title SET NOT NULL,
  ALTER COLUMN scale_training_cta_label SET NOT NULL;
