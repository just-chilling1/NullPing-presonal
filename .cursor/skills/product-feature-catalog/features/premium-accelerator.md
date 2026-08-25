# Premium Accelerator (Unlimited)

**Feature ID:** `premium-accelerator`  
**Route:** `/accelerator`

## Description

200 pre-made sales pages across all niches. Templates are **generated once** and stored in Supabase (`sites` with `is_template=true`, `template_key=accelerator-{id}`). Members clone with their affiliate link — nothing regenerates on access when the vault is seeded.

Images rules when seeding:

- Money pages are **text-only** (no hero / sales-page photos)
- Pin images: never AI-generated; product/niche-related stock only (no fruit/lifestyle fillers)
- No duplicate pin URLs across the full 200-page vault

## User flow

```
/accelerator → Filter by niche → Enter affiliate link → "Use this template"
  → Cloned product site + 10 Pinterest pins
```

## One-time seed (admin / your PC)

Set in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TEMPLATE_OWNER_ID` (real Supabase auth user id)
- Optional: `PIXABAY_API_KEY` (better niche stock photos)
- Optional API path: `ACCELERATOR_SEED_SECRET`

### Recommended: run on your PC

```bash
npm run seed:accelerator
```

Batches / force:

```bash
npx tsx scripts/seed-accelerator-vault.ts --offset=0 --limit=25
npx tsx scripts/seed-accelerator-vault.ts --force
```

### Alternative: HTTP batches

```bash
curl -X POST "http://localhost:3000/api/premium/accelerator/seed?offset=0&limit=25" \
  -H "x-accelerator-seed-secret: YOUR_SECRET"
```

Repeat with `offset=25`, `50`, … until `complete: true`.

## APIs

| Route | Purpose |
|-------|---------|
| `GET /api/premium/accelerator/templates` | List catalog + seed status |
| `POST /api/premium/accelerator/install` | Install / clone template with affiliate URL |
| `GET /api/premium/accelerator/preview` | Preview HTML + pins (uses seed when available) |
| `POST /api/premium/accelerator/seed` | Admin batch seed |

## Enable

```typescript
enabledFeatures: [..., "premium-accelerator"]
```
