# NullPing Cash — Product Brief & Upgrades

Source of truth for marketing copy, sales pages, and AI product-description prompts.  
Keep this aligned with `brand.config.ts`, `navigation.config.ts`, and the Premium Features FAQ.

---

## 1. App brief

### One-liner

**NullPing Cash** helps affiliates turn any product into a live money page, drive Pinterest traffic to it, and track real visitors and clicks — without writing copy or building a site from scratch.

### Tagline

> Activate. Publish. Get traffic.

### What it is

A beginner-focused affiliate software product. Members pick something to promote (a product URL or name), NullPing builds a hosted review-style **money page**, generates **Pinterest pin** assets that point at that page, and shows **Results** from real activity — not simulated earnings.

### Who it’s for

- New affiliates who want a simple path: pick a product → publish → promote
- Side-hustlers who prefer guided tools over DIY websites
- Members who already have affiliate links and need pages + traffic assets fast

### Core promise

You choose the product. NullPing builds the page, prepares the pins, and tracks visits and clicks. You review, publish, and share.

### Core workflow (Generate)

| Step | Name | What happens |
|------|------|----------------|
| 1 | **Activate Asset** | Paste a product URL or name (optional affiliate link). NullPing scrapes the offer and builds a full money page. |
| 2 | **Publish** | Preview, pick a theme/style, edit if you want, then publish. Live pages live at `/m/{slug}`. |
| 3 | **Generate Traffic** | Create Pinterest pin packs (image + title + description + tracking link) aimed at the money page. |
| 4 | **Results** | See real visitors, affiliate CTA clicks, CTR, and per-asset activity. |

Supporting tools: **Links Library** (save/reuse affiliate URLs), **Academy** (tutorials + FAQ), **Support**.

### What members do *not* get inside the app

- Automatic Pinterest posting (pins are download + paste for MVP)
- Displayed commissions or “earnings” from merchant networks
- A full analytics suite (bot-filtered visits/clicks, not enterprise tracking)

### Short product description (ready to reuse)

NullPing Cash is affiliate software that turns a product URL or name into a hosted money page, generates Pinterest traffic assets that send visitors to that page, and tracks real visits and clicks. Paste an offer, publish your page, promote with pins, then check Results — no site-building or copywriting required.

### Longer product description (sales / SEO)

NullPing Cash is built for people who want to promote affiliate offers without learning web design or writing long reviews by hand. Activate an asset from a product URL or name, optionally add your affiliate link, and NullPing assembles a review-style money page with headlines, benefits, pros and cons, FAQs, and call-to-action buttons. Publish to a live hosted URL, then generate Pinterest pin packs — each with an image, title, description, and tracking link — so traffic lands on your page. Results show real visitors and affiliate clicks so you can see which assets are working. Premium upgrades add ready-made page libraries, one-click offer packs, Facebook post variants, curated traffic checklists, authority content, account health checks, and optional reseller license activation.

---

## 2. Premium upgrades

Use the **upgrade name** exactly as shown in the product UI. The **brief** is the capability summary to feed into product descriptions, ads, and training copy.

| # | Upgrade name (UI) | Feature ID | Brief (for product descriptions) |
|---|-------------------|------------|----------------------------------|
| 1 | **Unlimited** | `premium-accelerator` | Access ~200 ready-made money pages across popular niches. Preview a template, apply your affiliate link, install — each install includes 10 Pinterest pins. Then continue in Traffic → Results. |
| 2 | **Done-For-You Profit** | `premium-dfy-profit` | One run from affiliate link + niche → live sales page, 3 Pinterest pins, an authority article, and 3 Facebook posts. Retry a failed stage without starting over. |
| 3 | **Instant Income** | `premium-social` | Bulk-generate ~10 Facebook post variants from a live money page — different hooks and angles. Save post sets, copy/paste to Facebook; visits track with `?src=facebook`. |
| 4 | **Automated Profits** | `premium-autopilot` | Curated checklist of ~180 traffic sources across 9 niches (not auto-posting). Pick a live money page, follow each source, copy the ready-made description + tracking link, mark complete. |
| 5 | **Guaranteed High-Ticket Payouts** | `premium-recurring` | Add long-form authority article sections to a money page from 100+ niche guides. Primary action: add to money page; optional copy for Medium/LinkedIn/blog. CTAs use `/m` tracking with `?src=article`. |
| 6 | **Cyber Protection** | `protector` | Real account health check — email confirmation, session, HTTPS, and recent money-page activity. Not antivirus; honest status + links to Account / license. |
| 7 | **Reseller & License Rights** | `premium-license-rights` | Request turnkey reseller activation (sell under your own brand after the team activates). Form → “Awaiting team activation” until deliverables unlock (typically hours, up to ~48h busy). |

### Upgrade blurbs (1–2 sentences each)

**Unlimited**  
Skip blank-page activation when you want speed. Browse a vault of pre-built money pages, install with your affiliate link, and walk away with pins ready for Pinterest.

**Done-For-You Profit**  
The full launch pack in one flow: page, pins, article, and Facebook posts from your link and niche — so you can promote the same offer across channels without assembling each asset by hand.

**Instant Income**  
Turn one live money page into a set of Facebook-ready posts with varied hooks. Built for copy-and-paste promotion, with tracking so Results can show Facebook-sourced visits.

**Automated Profits**  
A guided map of where to promote — forums, groups, directories, and more — with niche filters and ready-made descriptions. You still post manually; the checklist keeps progress and links organized.

**Guaranteed High-Ticket Payouts**  
Strengthen a money page with long-form authority content that keeps visitors reading and clicking your tracked CTAs. Use sections on-page or export copy for external publishing.

**Cyber Protection**  
A clear status panel for the account that runs your pages — confirmation, session, and recent activity — so members know the basics are healthy before they scale promotion.

**Reseller & License Rights**  
The business-layer upgrade: request activation to resell NullPing Cash under your own brand with turnkey assets, after the team reviews and unlocks the edition.

### Naming notes (avoid mix-ups)

| Say this (NullPing Cash) | Don’t confuse with |
|--------------------------|--------------------|
| Unlimited | “Accelerator” (internal/feature folder name) |
| Instant Income | “Social Payouts” (route slug only) |
| Guaranteed High-Ticket Payouts | “Recurring Wealth” (route slug only) |
| Automated Profits | True autoposting / set-and-forget bots |

---

## 3. Prompt snippet (for AI product descriptions)

Paste when generating sales copy, pin captions, or upgrade blurbs:

```text
Product: NullPing Cash
Tagline: Activate. Publish. Get traffic.
Core: Affiliate software — product URL/name → hosted money page → Pinterest pins → real visits/clicks in Results.
Tone: Clear, beginner-friendly, benefit-led. No fake earnings numbers from inside the app.
Premium upgrade names (use exactly):
1. Unlimited — 200 ready-made money pages + 10 pins per install
2. Done-For-You Profit — link + niche → page, 3 pins, article, 3 Facebook posts
3. Instant Income — bulk Facebook post variants from a live money page
4. Automated Profits — curated traffic-source checklist (manual posting)
5. Guaranteed High-Ticket Payouts — authority sections on a money page
6. Cyber Protection — account/session/activity health check
7. Reseller & License Rights — request turnkey reseller activation
```

---

## Related files

- Brand: `src/config/brand.config.ts`
- Premium nav labels: `src/config/navigation.config.ts` → `premiumNav`
- Widget one-liners: `src/lib/premium-features.ts`
- Member FAQ: `src/config/faq.config.ts` → “Premium Features”
- Launch notes: `docs/nullping/LAUNCH.md`
