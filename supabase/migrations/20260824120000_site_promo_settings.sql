-- Singleton row for admin-editable promotional links (Exclusive Offers, training URLs, etc.)
CREATE TABLE IF NOT EXISTS public.site_promo_settings (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    exclusive_offers_enabled boolean NOT NULL DEFAULT true,
    exclusive_offers jsonb NOT NULL DEFAULT '[]'::jsonb,
    external_training_url text NOT NULL,
    video_withdraw_url text NOT NULL,
    scale_training_url text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_promo_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read promo settings" ON public.site_promo_settings;
CREATE POLICY "Authenticated users can read promo settings"
    ON public.site_promo_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Seed defaults matching src/config/offers.config.ts and training.config.ts
INSERT INTO public.site_promo_settings (
    id,
    exclusive_offers_enabled,
    exclusive_offers,
    external_training_url,
    video_withdraw_url,
    scale_training_url
) VALUES (
    1,
    true,
    '[
        {"title": "Earn $400/Day Testing New Apps", "href": "https://getrobinhod.com/fe-e?affid=digitalavalon", "subtitle": "Claim Now"},
        {"title": "Get Paid To Copy & Paste", "href": "https://thedigitalavalon.a.explodely.com/?fid=G7BYO9W&aff=digitalavalon", "subtitle": "Claim Now"},
        {"title": "Fast Cash Training", "href": "https://thedigitalavalon.a.explodely.com/?fid=5SRWJGZ&aff=digitalavalon", "subtitle": "Claim Now"}
    ]'::jsonb,
    'https://perpetualincome365.convertri.com/7figure-everwebinar-registration#aff=DigitalAvalon&cam=membersarea',
    'https://perpetualincome365.convertri.com/7figure-everwebinar-registration#aff=DigitalAvalon&cam=membersarea',
    'https://www.breakoutai.net/5k-passive-9'
)
ON CONFLICT (id) DO NOTHING;
