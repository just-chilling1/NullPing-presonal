# Money Page Hero Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the money page editor, let users immediately set the sales page hero via upload or one of up to 5 niche stock photos.

**Architecture:** Add a niche multi-image helper, a money-page-scoped upload route, a hero-options GET route, and a Sales page photo panel on `MoneyPageEditor` that PATCHes the existing asset API (same path as color theme).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase Storage (`blog-images` via `uploadUserImage`), Pixabay helpers in `images.ts`, Tailwind/globals.css design tokens.

## Global Constraints

- Hero URL remains `sites.sales_page_json.heroImage`; rebuild HTML via existing `PATCH /api/assets/[assetId]`.
- Stock options are niche Pixabay only (not scraped product images).
- Upload must work with `featureApiGuard("money-page")` — do not rely on `blog-builder`.
- Immediate apply on pick/upload; revert on failure.
- Activate Asset auto-pick stays unchanged.
- No new DB tables or storage buckets.
- Use `brand` / existing copy tone; no hardcoded product API keys in client code.
- Prefer `npx tsx --test <file>` for unit tests (node:test), matching existing `*.test.ts` files.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/features/money-page/lib/hero-options.ts` | Pure + async helper: fetch up to N distinct niche stock URLs (injectable single-fetch for tests). |
| `src/features/money-page/lib/hero-options.test.ts` | Unit tests for distinctness, short lists, empty results. |
| `src/app/api/assets/[assetId]/hero-options/route.ts` | GET up to 5 niche stock URLs for the owned asset. |
| `src/app/api/assets/upload-image/route.ts` | POST multipart upload under money-page guard; reuses `uploadUserImage`. |
| `src/features/money-page/lib/upload-client.ts` | Client helper `uploadMoneyPageImage(file)`. |
| `src/features/money-page/pages/MoneyPageEditor.tsx` | Sales page photo panel: current thumb, upload, 5-grid, immediate apply. |
| `src/app/globals.css` | Styles for photo grid / upload control matching money-theme cards. |

---

### Task 1: Niche hero options helper + unit tests

**Files:**
- Create: `src/features/money-page/lib/hero-options.ts`
- Create: `src/features/money-page/lib/hero-options.test.ts`

**Interfaces:**
- Consumes: `fetchNicheRelatedImage` from `@/features/blog-builder/lib/images` (default).
- Produces:
  ```ts
  export type NicheImageFetcher = (params: {
    niche?: string | null;
    productName?: string;
    seedOffset?: number;
    excludeUrls?: string[];
    excludeStockIds?: string[];
  }) => Promise<string | null>;

  export async function fetchMoneyPageHeroOptions(params: {
    niche?: string | null;
    productName?: string;
    count?: number;
    excludeUrls?: string[];
    fetchOne?: NicheImageFetcher;
  }): Promise<string[]>;
  ```

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Write minimal implementation**
- [x] **Step 4: Run tests and make sure they pass**
- [ ] **Step 5: Commit** (skipped — user requested no commits)

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchMoneyPageHeroOptions } from "./hero-options";

describe("fetchMoneyPageHeroOptions", () => {
  it("returns up to count distinct URLs from the fetcher", async () => {
    const calls: string[][] = [];
    const urls = [
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/c.jpg",
      "https://cdn.example.com/d.jpg",
      "https://cdn.example.com/e.jpg",
      "https://cdn.example.com/f.jpg",
    ];
    let i = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Sleep Aid",
      niche: "health",
      count: 5,
      fetchOne: async (params) => {
        calls.push([...(params.excludeUrls ?? [])]);
        return urls[i++] ?? null;
      },
    });
    assert.deepEqual(result, urls.slice(0, 5));
    assert.equal(calls.length, 5);
    assert.deepEqual(calls[2], urls.slice(0, 2));
  });

  it("stops early when fetcher returns null", async () => {
    let n = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Widget",
      count: 5,
      fetchOne: async () => (n++ < 2 ? `https://cdn.example.com/${n}.jpg` : null),
    });
    assert.equal(result.length, 2);
  });

  it("skips duplicate URLs from the fetcher", async () => {
    const dup = "https://cdn.example.com/same.jpg";
    const sequence = [dup, dup, "https://cdn.example.com/other.jpg", null];
    let i = 0;
    const result = await fetchMoneyPageHeroOptions({
      productName: "Widget",
      count: 5,
      fetchOne: async () => sequence[i++] ?? null,
    });
    assert.deepEqual(result, [dup, "https://cdn.example.com/other.jpg"]);
  });

  it("respects initial excludeUrls", async () => {
    const excluded = "https://cdn.example.com/already.jpg";
    const result = await fetchMoneyPageHeroOptions({
      productName: "Widget",
      count: 3,
      excludeUrls: [excluded],
      fetchOne: async (params) => {
        assert.ok(params.excludeUrls?.includes(excluded));
        return "https://cdn.example.com/new.jpg";
      },
    });
    assert.deepEqual(result, ["https://cdn.example.com/new.jpg"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/features/money-page/lib/hero-options.test.ts`

Expected: FAIL (module not found / `fetchMoneyPageHeroOptions` not defined)

- [ ] **Step 3: Write minimal implementation**

Create `src/features/money-page/lib/hero-options.ts`:

```ts
import { fetchNicheRelatedImage } from "@/features/blog-builder/lib/images";

export type NicheImageFetcher = (params: {
  niche?: string | null;
  productName?: string;
  seedOffset?: number;
  excludeUrls?: string[];
  excludeStockIds?: string[];
}) => Promise<string | null>;

const DEFAULT_COUNT = 5;
const MAX_ATTEMPTS_FACTOR = 3;

export async function fetchMoneyPageHeroOptions(params: {
  niche?: string | null;
  productName?: string;
  count?: number;
  excludeUrls?: string[];
  fetchOne?: NicheImageFetcher;
}): Promise<string[]> {
  const count = Math.max(0, Math.min(params.count ?? DEFAULT_COUNT, 10));
  if (count === 0) return [];

  const fetchOne = params.fetchOne ?? fetchNicheRelatedImage;
  const excludeUrls = [...(params.excludeUrls ?? [])];
  const out: string[] = [];
  const maxAttempts = count * MAX_ATTEMPTS_FACTOR;

  for (let attempt = 0; attempt < maxAttempts && out.length < count; attempt++) {
    const url = await fetchOne({
      niche: params.niche,
      productName: params.productName,
      seedOffset: attempt,
      excludeUrls,
    });
    if (!url) break;
    if (out.includes(url) || excludeUrls.includes(url)) continue;
    out.push(url);
    excludeUrls.push(url);
  }

  return out;
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx tsx --test src/features/money-page/lib/hero-options.test.ts`

Expected: PASS (4 tests)

- [ ] **Step 5: Commit** (only if the user asked for commits)

```bash
git add src/features/money-page/lib/hero-options.ts src/features/money-page/lib/hero-options.test.ts
git commit -m "feat(money-page): add niche hero options helper"
```

---

### Task 2: Hero-options and upload API routes

**Files:**
- Create: `src/app/api/assets/[assetId]/hero-options/route.ts`
- Create: `src/app/api/assets/upload-image/route.ts`
- Create: `src/features/money-page/lib/upload-client.ts`

**Interfaces:**
- Consumes: `fetchMoneyPageHeroOptions`, `getApiUser`, `featureApiGuard("money-page")`, `isSupportedImageType`, `uploadUserImage`
- Produces:
  - `GET /api/assets/[assetId]/hero-options` → `{ images: string[] }`
  - `POST /api/assets/upload-image` → `{ url: string }`
  - `uploadMoneyPageImage(file: File): Promise<string>`

- [ ] **Step 1: Create hero-options route**

Create `src/app/api/assets/[assetId]/hero-options/route.ts`:

```ts
import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { fetchMoneyPageHeroOptions } from "@/features/money-page/lib/hero-options";
import { isMoneyPageCopy } from "@/features/money-page/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const guard = featureApiGuard("money-page");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { assetId } = await context.params;
  const { data: site, error } = await supabase
    .from("sites")
    .select("id, product_name, title, hobby, sales_page_json")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !site) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const productName =
    (typeof site.product_name === "string" && site.product_name.trim()) ||
    (typeof site.title === "string" && site.title.trim()) ||
    "product";
  const niche = typeof site.hobby === "string" ? site.hobby : "";
  const copy = isMoneyPageCopy(site.sales_page_json) ? site.sales_page_json : null;
  const excludeUrls = copy?.heroImage ? [copy.heroImage] : [];

  const images = await fetchMoneyPageHeroOptions({
    niche,
    productName,
    count: 5,
    excludeUrls,
  });

  return NextResponse.json({ images }, { headers: NO_STORE_HEADERS });
}
```

- [ ] **Step 2: Create upload route (money-page guard)**

Create `src/app/api/assets/upload-image/route.ts` mirroring `src/app/api/blog/upload-image/route.ts` but with `featureApiGuard("money-page")`:

```ts
import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { isSupportedImageType, uploadUserImage } from "@/features/blog-builder/lib/images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const guard = featureApiGuard("money-page");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const contentType = file.type || "image/jpeg";
  if (!isSupportedImageType(contentType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPG, WebP, GIF or AVIF." },
      { status: 415, headers: NO_STORE_HEADERS }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (max 8MB)." },
      { status: 413, headers: NO_STORE_HEADERS }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadUserImage({ supabase, userId: user.id, buffer, contentType });
  if (!url) {
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ url }, { headers: NO_STORE_HEADERS });
}
```

- [ ] **Step 3: Create client upload helper**

Create `src/features/money-page/lib/upload-client.ts`:

```ts
/** Upload an image for the money page hero and return its public URL. */
export async function uploadMoneyPageImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/assets/upload-image", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
  return data.url as string;
}
```

- [ ] **Step 4: Smoke-check TypeScript on new files**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head -n 40`  
(or PowerShell: `npx tsc --noEmit -p tsconfig.json` and scan for errors in the new paths)

Expected: no errors in the new route/helper files.

- [ ] **Step 5: Commit** (only if the user asked for commits)

```bash
git add src/app/api/assets/[assetId]/hero-options/route.ts src/app/api/assets/upload-image/route.ts src/features/money-page/lib/upload-client.ts
git commit -m "feat(money-page): add hero-options and image upload APIs"
```

---

### Task 3: Money page editor UI + styles

**Files:**
- Modify: `src/features/money-page/pages/MoneyPageEditor.tsx`
- Modify: `src/app/globals.css` (near `.money-page-customize-grid` ~3978)

**Interfaces:**
- Consumes: `uploadMoneyPageImage`, `GET /api/assets/${assetId}/hero-options`, existing `save()` / PATCH payload shape `{ copy, affiliateUrl, colorTheme, variationId }`
- Produces: Sales page photo panel with immediate apply

- [ ] **Step 1: Add state, load options, applyHero helper in MoneyPageEditor**

Near other `useState` declarations, add:

```ts
const [heroOptions, setHeroOptions] = useState<string[]>([]);
const [heroOptionsLoading, setHeroOptionsLoading] = useState(false);
const [heroOptionsEmpty, setHeroOptionsEmpty] = useState(false);
```

After asset load succeeds (inside `load()`, once `pageCopy` / site are set), fetch options:

```ts
setHeroOptionsLoading(true);
try {
  const optRes = await fetch(`/api/assets/${assetId}/hero-options`);
  const optData = await optRes.json().catch(() => ({}));
  const images = Array.isArray(optData.images)
    ? optData.images.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
    : [];
  setHeroOptions(images);
  setHeroOptionsEmpty(images.length === 0);
} catch {
  setHeroOptions([]);
  setHeroOptionsEmpty(true);
} finally {
  setHeroOptionsLoading(false);
}
```

Add apply helper (mirror `changeTheme` optimistic pattern):

```ts
async function applyHeroImage(nextUrl: string) {
  if (!copy || busy || nextUrl === (copy.heroImage ?? "")) return;
  const previous = copy.heroImage;
  const nextCopy = { ...copy, heroImage: nextUrl };
  setCopy(nextCopy);
  setBusy("hero");
  setError("");
  try {
    const res = await fetch(`/api/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copy: nextCopy,
        affiliateUrl,
        colorTheme,
        variationId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCopy({ ...nextCopy, heroImage: previous });
      setError(typeof data.error === "string" ? data.error : "Could not update photo");
      return;
    }
    setSite(data.site);
    if (isMoneyPageCopy(data.site.sales_page_json)) setCopy(data.site.sales_page_json);
    applyThemeFromPayload(data);
  } catch {
    setCopy({ ...nextCopy, heroImage: previous });
    setError("Could not update photo");
  } finally {
    setBusy("");
  }
}

async function onUploadHero(file: File | null) {
  if (!file || busy) return;
  setBusy("hero");
  setError("");
  try {
    const { uploadMoneyPageImage } = await import("@/features/money-page/lib/upload-client");
    const url = await uploadMoneyPageImage(file);
    setBusy("");
    await applyHeroImage(url);
  } catch (err) {
    setBusy("");
    setError(err instanceof Error ? err.message : "Upload failed");
  }
}
```

Prefer a static import of `uploadMoneyPageImage` at the top of the file instead of dynamic import if the bundle already pulls money-page libs.

- [ ] **Step 2: Render Sales page photo panel**

Place a full-width GlassPanel **above** or spanning the customize grid (before `.money-page-customize-grid`), so photo controls are visible with theme/design:

```tsx
{copy ? (
  <GlassPanel className="space-y-5 p-6 sm:p-7">
    <div>
      <h2 className="ds-h3">Sales page photo</h2>
      <p className="mt-1 text-sm text-ink-2">
        Upload your own photo or pick a niche stock image. Changes apply right away.
      </p>
    </div>

    <div className="money-hero-current">
      {copy.heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={copy.heroImage} alt="Current sales page photo" className="money-hero-current-img" />
      ) : (
        <div className="money-hero-current-empty">No photo yet</div>
      )}
    </div>

    <label className="money-hero-upload">
      <span className="field-label">Upload a photo</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        disabled={busy === "hero" || busy === "theme" || busy === "design" || busy === "regen"}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void onUploadHero(file);
        }}
      />
    </label>

    <div>
      <p className="field-label">Or choose one of these</p>
      {heroOptionsLoading ? (
        <p className="text-xs text-ink-3">Loading photos…</p>
      ) : heroOptionsEmpty ? (
        <p className="text-xs text-ink-3">No stock photos found. Upload your own instead.</p>
      ) : (
        <div className="money-hero-grid" role="radiogroup" aria-label="Sales page stock photos">
          {heroOptions.map((url) => {
            const selected = copy.heroImage === url;
            return (
              <button
                key={url}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy === "hero" || busy === "theme" || busy === "design" || busy === "regen"}
                className={`money-hero-thumb ${selected ? "is-selected" : ""}`}
                onClick={() => void applyHeroImage(url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="money-hero-thumb-img" />
                {selected ? (
                  <span className="money-hero-thumb-check" aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
    {busy === "hero" ? <p className="text-xs text-ink-3">Updating photo…</p> : null}
  </GlassPanel>
) : null}
```

Also disable theme/design cards when `busy === "hero"` (extend existing `disabled={...}` conditions).

- [ ] **Step 3: Add CSS**

In `src/app/globals.css` near money-page customize styles:

```css
.money-hero-current {
  width: 100%;
  max-width: 20rem;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid var(--np-line);
  background: var(--np-surface-field);
}

.money-hero-current-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.money-hero-current-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  color: var(--np-ink-3);
}

.money-hero-upload input[type="file"] {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  font-size: 0.875rem;
  color: var(--np-ink-2);
}

.money-hero-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

@media (min-width: 640px) {
  .money-hero-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.money-hero-thumb {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 0.65rem;
  border: 1px solid var(--np-line);
  padding: 0;
  background: var(--np-surface-field);
  cursor: pointer;
}

.money-hero-thumb:hover:not(:disabled):not(.is-selected) {
  border-color: color-mix(in srgb, var(--np-pulse-500) 40%, var(--np-line));
}

.money-hero-thumb.is-selected {
  border-color: color-mix(in srgb, var(--np-pulse-500) 58%, var(--np-line));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--np-pulse-500) 28%, transparent);
}

.money-hero-thumb:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.money-hero-thumb:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--np-pulse-500) 55%, white);
  outline-offset: 2px;
}

.money-hero-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.money-hero-thumb-check {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: var(--np-pulse-500);
  color: #fff;
}
```

- [ ] **Step 4: Manual verification checklist**

1. Activate (or open) an asset → Money page editor.
2. Confirm Sales page photo panel loads; up to 5 stock thumbs appear (or empty note if Pixabay unavailable).
3. Click a stock image → “Updating photo…” → live preview hero updates; thumb shows selected.
4. Upload a small JPG/PNG → preview updates to uploaded URL.
5. Force a failure (optional: offline) → previous hero restored + error banner.
6. Confirm Color theme / Page design still work; Activate form unchanged.

- [ ] **Step 5: Commit** (only if the user asked for commits)

```bash
git add src/features/money-page/pages/MoneyPageEditor.tsx src/app/globals.css
git commit -m "feat(money-page): add sales page photo upload and stock picker"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Upload photo on money page editor | Task 2 upload API + Task 3 UI |
| Choose from up to 5 niche stock | Task 1 helper + Task 2 GET + Task 3 grid |
| Immediate apply via PATCH | Task 3 `applyHeroImage` |
| money-page feature guard for upload | Task 2 |
| Activate unchanged | No activate file changes |
| Error / empty / busy handling | Task 3 |
| Unit test for options helper | Task 1 |
| Reuse `blog-images` / `uploadUserImage` | Task 2 |

No placeholders remaining. Types: `fetchMoneyPageHeroOptions` / `uploadMoneyPageImage` names consistent across tasks.
