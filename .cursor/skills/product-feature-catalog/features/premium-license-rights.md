# Premium License Rights

**Feature ID:** `premium-license-rights`  
**Route:** `/license-rights`

## Description

Full Turnkey Reseller & License Rights Edition. Members request activation by sending a support ticket titled **License Rights**. The page lists locked deliverables (reseller license, rebrandable assets, sales pages, support docs) until the team activates the account manually.

Pending state is stored server-side in `license_rights_requests`. localStorage is only a fallback if the API is unreachable. There is no admin UI — activation is manual (support team updates status).

## User flow

```
/license-rights → request form (email + message)
  → POST /api/premium/license-rights { email, message }  (persist pending row)
  → POST /api/support { email, message, subject: "License Rights" }
  → Freshdesk ticket "{product} — License Rights" (Resend fallback)
  → Pending panel (server pending preferred; localStorage fallback)
```

Mailto fallback uses subject `License Rights` if the API cannot send.

## APIs

| Route | Purpose |
|-------|---------|
| `GET /api/premium/license-rights` | Latest pending request for the signed-in member |
| `POST /api/premium/license-rights` | Insert pending row (`email`, `message`) |
| `POST /api/support` | Optional `subject` (sanitized, max 80 chars). When present, Freshdesk subject is `{product} — {subject}` and the body includes `Request type:`. |

## Persistence

| Store | Scope |
|-------|--------|
| `license_rights_requests` | Server table: user_id, email, message, status (`pending` / `activated` / `rejected`) |
| `{brand.storagePrefix}_license_rights_request_{userId}` | Client localStorage JSON `{ email, submittedAt }` — fallback only |

Migration: `supabase/migrations/20260821120000_license_rights_requests.sql`

Activation is manual (support team). Clearing the pending panel with "Send another request" only resets the local flag; the server row remains until status changes.

## Module files

```
src/features/premium-license-rights/
  pages/LicenseRightsPage.tsx
  lib/license-rights-request.ts
  lib/edition-contents.ts
src/app/license-rights/page.tsx
```

## Enable

```typescript
enabledFeatures: [..., "premium-license-rights"]
```

Nav: `{ path: "/license-rights", label: "Reseller & License Rights", icon: "FileText", feature: "premium-license-rights" }`

## Env vars

Same as support: `FRESHDESK_API_KEY`, `FRESHDESK_DOMAIN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
