# training-support

**Feature ID:** `training`  
**Tier:** CORE

## Description

Training page with Vimeo modules, step-by-step guide, pro tips, checklist, and FAQ. Support page with contact info and help links.

Academy video progress is stored per member in `user_training_completions` (stable keys like `platform:activate-your-first-asset`, not Vimeo IDs).

## User flow

**Training:** `/training` → videos + workflow guide + FAQ + CTA  
**Support:** `/support` → email, contact link, FAQ (always on, no flag)

Members can **Mark complete** on each Academy card (or complete by closing the player after watch). Progress reloads from the server on next visit.

## Skeleton locations

- `src/features/training/pages/TrainingPage.tsx`
- `src/features/training/pages/TrainingVideosPage.tsx`
- `src/features/training/components/TrainingVideoCard.tsx`
- `src/features/training/lib/training-completions.ts`
- `src/app/api/training/completions/route.ts`
- `src/features/support/pages/SupportPage.tsx`

## APIs

| Route | Purpose |
|-------|---------|
| `GET /api/training/completions` | List completed `video_id` keys for the signed-in member |
| `POST /api/training/completions` | Mark one or more videos complete (`video_id` / `video_ids`) |
| `DELETE /api/training/completions?video_id=` | Clear a completion |

## Supabase

- `user_training_completions` — `(user_id, video_id)` PK, `completed_at`
- Migration: `supabase/migrations/20260701010000_training_completions.sql`

## Config (branding)

| File | Content |
|------|---------|
| `training.config.ts` | Vimeo IDs, page title, external training URL |
| `training-content.config.ts` | FAQ, steps, tips, checklist — set `trainingContentReady = true` at launch |
| `support.config.ts` | Email, contact URL, page copy |

## Env vars

None required. Vimeo IDs in config.

## Implementation steps

1. `"training"` is enabled by default
2. Populate configs with product-specific copy using `brand.productName`
3. Apply `user_training_completions` migration
4. Run DEVELOPER-SETUP.md §7 prompt before launch
5. Support nav item needs no feature flag