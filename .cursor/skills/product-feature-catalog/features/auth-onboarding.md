# auth-onboarding

**Feature ID:** _(built-in — not a feature flag)_  
**Tier:** CORE

## Description

Sign up, login, forgot password, email verification, and first-run onboarding slides. Ships with the skeleton shell.

Onboarding completion is stored in:
1. Auth `user_metadata.onboarding_completed` (primary gate flag)
2. `public.users.onboarding_completed_at` (durable profile row)
3. Short-lived onboarding cookie after `/api/onboarding/complete`

## User flow

1. User visits `/login` or `/signup`
2. After signup → optional email verify → `/onboarding` or `/dashboard`
3. Onboarding slides from `onboarding-content.ts`
4. Complete → `POST /api/onboarding/complete` upserts profile + auth metadata
5. Forgot password → email → `/reset-password`

## Skeleton locations

| Route | Path |
|-------|------|
| Login | `src/app/login/page.tsx` |
| Signup | `src/app/signup/page.tsx` |
| Onboarding | `src/app/onboarding/page.tsx` |
| Auth callback | `src/app/auth/callback/route.ts` |
| Complete API | `src/app/api/onboarding/complete/route.ts` |
| Gate helper | `src/lib/onboarding-gate.ts` |

## Supabase

- `public.users` — `id` (PK → auth.users), `onboarding_completed_at`, `created_at`, `updated_at`
- Migration: `supabase/migrations/20260826120000_users_onboarding_profile.sql`
- RLS: members can select/insert/update their own row

## Config

- `src/config/onboarding-content.ts` — slide copy, partner CTA URL
- `src/config/brand.config.ts` — product name, colors
- `NEXT_PUBLIC_APP_URL` — redirect URLs

## Env vars

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`

## Implementation

Customize onboarding copy and branding only. See [SUPABASE_AUTH_SETUP.md](../../../../SUPABASE_AUTH_SETUP.md).
Apply the users profile migration so `/api/onboarding/complete` can persist `onboarding_completed_at`.