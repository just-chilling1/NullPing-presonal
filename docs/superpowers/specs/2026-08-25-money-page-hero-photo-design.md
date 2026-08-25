# Money Page Hero Photo — Design Spec

**Date:** 2026-08-25  
**Feature IDs:** `money-page` (UI + APIs), `asset-activator` (unchanged activate auto-pick)  
**Route:** `/money-page/[assetId]`  
**Tier:** CORE

## Goal

On the money page editor, let the user set the sales page hero photo by either:

1. Uploading their own photo, or  
2. Choosing one of up to 5 niche stock images  

Either action applies immediately (preview + persist), matching color theme behavior.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Image source for the 5 options | Niche stock (Pixabay via existing image helpers) |
| Where UI lives | Money page editor after activation — not the Activate form |
| Apply timing | Immediate on pick/upload |
| Approach | Editor panel + reuse existing PATCH save path; thin upload endpoint under money-page guard |

## Architecture

No new database tables. Hero URL continues to live on `sites.sales_page_json.heroImage` and is rendered by `buildMoneyPageHtml`.

### Components

| Unit | Responsibility |
|------|----------------|
| Money page editor panel | Upload control + 5-image grid + current thumbnail; optimistic UI; busy/error |
| `GET /api/assets/[assetId]/hero-options` | Auth + ownership; return up to 5 distinct niche stock URLs for the asset |
| `POST /api/assets/upload-image` | Auth; money-page feature guard; multipart upload via shared `uploadUserImage` helper |
| Existing `PATCH /api/assets/[assetId]` | Persist `copy` with updated `heroImage` and rebuild `sales_page_html` |
| Niche options helper | Fetch up to 5 distinct Pixabay URLs for product/niche (exclude duplicates) |

### Data flow

```
Editor loads asset
  → GET hero-options (product_name / hobby / niche)
  → Show current heroImage + upload + grid

User picks stock thumbnail
  → Optimistic select + PATCH with full editor payload
    (copy including heroImage, affiliateUrl, colorTheme, variationId)
  → Refresh site/preview from response; revert on failure

User uploads file
  → POST /api/assets/upload-image → { url }
  → Same PATCH apply path as pick
```

Activate Asset remains unchanged: still auto-assigns one hero (scrape, else niche stock). The editor is where users replace it.

The 5 options are freshly fetched niche stock URLs for the visit. The current hero may be a scraped product image or an older stock URL and **need not appear** in the grid; a grid cell is selected only when its URL equals current `heroImage`.

## UI

New **Sales page photo** GlassPanel in the customize area (alongside Color theme / Page design):

- Current photo thumbnail (or empty state)
- **Upload a photo** file input (PNG, JPG, WebP, GIF, AVIF; max 8MB — same rules as blog upload)
- **Or choose one of these** — up to 5 niche stock thumbnails; selected state when URL matches current `heroImage`
- Disable upload + grid while a photo apply is in flight
- Errors use the existing editor error banner

## APIs

### `GET /api/assets/[assetId]/hero-options`

- Guard: `featureApiGuard("money-page")`
- Owner-only asset load
- Response: `{ images: string[] }` (0–5 public image URLs)
- Uses niche/product fields from the site; excludes duplicates via existing exclude helpers

### `POST /api/assets/upload-image`

- Guard: `featureApiGuard("money-page")`
- Multipart `file`; reuse `isSupportedImageType` + `uploadUserImage`
- Response: `{ url: string }`
- Does not depend on `blog-builder` being enabled

### Apply

Reuse `PATCH /api/assets/[assetId]` with full `copy` including `heroImage`. No dedicated hero PATCH in v1.

## Error handling

- Upload type/size/network failure → banner; keep current hero
- Fewer than 5 stock hits → show available; if zero, upload-only + short “No stock photos found” note
- PATCH failure after pick/upload → revert selection to previous `heroImage`
- Unauthorized / wrong owner → 401 / 404 as with other asset routes

## Testing

- Unit: niche options helper returns distinct URLs and handles short lists
- Manual: pick stock → preview updates; upload → preview updates; failure → previous image restored

## Out of scope

- Changing Activate Asset form UI
- Scraped product-image picker (stock only for the 5)
- Draft-then-save photo flow
- Regenerating the 5 options on demand (v1 loads once per editor visit)
- New storage buckets (reuse `blog-images` via `uploadUserImage`)
