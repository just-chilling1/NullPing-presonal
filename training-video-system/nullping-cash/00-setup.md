# NullPing Cash — Phase 1 Setup

**Repo:** `c:\Users\Admin\Desktop\nullping`  
**Branch:** `main` @ `4dc97ea` (ff-only pull: already up to date; working tree clean)  
**Framework:** Next.js (App Router) + Supabase auth  
**Auth bypass:** `DEV_BYPASS_AUTH=true` in `.env.local` (middleware skips auth + onboarding)  
**Funnel HTML:** none provided — money claims mined from dashboard bonus ad, EarningsBanner defaults, support refund policy, and `docs/nullping/PRODUCT-BRIEF.md`  
**Output root:** `training-video-system/nullping-cash/`

---

## 1.1 Product Fact Sheet

| Field | Value |
|---|---|
| **Product name** | NullPing Cash |
| **Tagline** | Activate. Publish. Get traffic. |
| **Promise** | Turn any product into a hosted money page, generate Pinterest pin assets that send traffic to it, and track real visitors and affiliate clicks — without writing copy or building a site from scratch. |
| **Price** | Not in repo (no funnel HTML). Do not invent. |
| **Dream customer** | Beginner affiliate / side-hustler who has (or can get) an affiliate link and wants pages + traffic assets fast, without DIY web design. |
| **Point A → Point B** | A: “I have a product/affiliate link but no page and no traffic assets.” → B: live hosted money page at `/m/{slug}` + Pinterest pins aiming at it + Results showing real visits/clicks. |
| **Vehicle** | Affiliate marketing via hosted review-style money pages + Pinterest (and optional Facebook) promotion. |
| **Mechanism** | AI builds a review money page from a product URL or name; AI builds pin packs (image + title + description + tracking link); Results show bot-filtered real visits and CTA clicks. |
| **Unfair advantage** | Weakest link automated: writing the review page + packaging pin creatives. Member still publishes, downloads, and posts by hand. |
| **Core loop** | Activate Asset → edit/publish money page → Generate Traffic (pins) → share pins on Pinterest → visitor lands on money page → clicks affiliate CTA → commission from merchant (outside the app) → check Results. |
| **First win** | Activate one asset (product URL or name → money page ready), open **View my asset**, then hit **Publish** so a live `/m/` URL exists. |
| **Proof** | No member testimonials in repo. Founder/system framing only; do not invent results. |
| **Guarantee** | 30-Day Guarantee (Support refund policy): full refund within 30 days of purchase. No questions asked. |
| **Effort truth** | Member pastes product/affiliate link, reviews/publishes the page, downloads pins, and posts manually on Pinterest/Facebook. First quiet days while traffic builds are normal. App does **not** auto-post to Pinterest or display merchant commissions. |

---

## 1.2 Branding map (old / internal → current UI)

| Old / internal / route-only | Current user-facing name |
|---|---|
| NullPing (logo alt alone) | **NullPing Cash** (product) |
| premium-accelerator / `/accelerator` / “Accelerator” | **Unlimited** |
| premium-dfy-profit / `/dfy-profit` | **Done-For-You Profit** |
| premium-social / Social Payouts / `/social-payouts` | **Instant Income** |
| premium-autopilot / `/autopilot` (as “autoposting”) | **Automated Profits** (checklist — manual posting) |
| premium-recurring / Recurring Wealth / `/recurring-wealth` | **Guaranteed High-Ticket Payouts** |
| protector / `/protector` | **Cyber Protection** |
| premium-license-rights / `/account#license` | **Reseller & License Rights** |
| link vault / money-links-vault / `/link-vault` | **Links Library** |
| blog-builder / sales offer generator (legacy) | **Activate Asset** + money page editor |
| Training (as nav item) | Section **Training** · item **Academy** |
| Home (eyebrow) vs Dashboard (nav) | Eyebrow **Home** · nav item **Dashboard** |

Scripts use ONLY the current user-facing column.

---

## 1.3 UI inventory (exact labels)

### Sidebar (top → bottom)
- **Home:** Dashboard
- **Generate:** Activate Asset · Generate Traffic · Results
- **Libraries:** Links Library
- **Training:** Academy
- **Premium Features:** Unlimited · Done-For-You Profit · Instant Income · Automated Profits · Guaranteed High-Ticket Payouts · Cyber Protection · Reseller & License Rights
- **Exclusive Offers:** Earn $400/Day Testing New Apps · Get Paid To Copy & Paste · Fast Cash Training (each subtitle: Claim Now)
- Footer: Support · Active Member · Sign Out

### Dashboard (Home)
- Eyebrow: **Home** · Title: **Welcome to NullPing Cash** (+ optional first name)
- Subtitle: *Watch the three videos below — then activate your first asset. NullPing builds the money page. You just pick the product.*
- **Start Here** — 3 videos interleaved with gold Free member training cards:
  1. Watch This First
  2. *(gold Free member training ad)*
  3. How The Money Flows
  4. *(gold Free member training ad)*
  5. Your 5-Minute Tour
- Bottom CTAs: **Activate your first asset** · **Know More from the Academy**
- **Right rail:** Contact Support → Tip → Premium Features (*Unlock the tools that drive the biggest results.*)

### Core pages — key CTAs

| Page | Key labels |
|---|---|
| Activate Asset | Step 1 · What do you want to promote? · Product URL / Product name / Affiliate link (Optional) · **Activate asset** · loading: Activating your asset… · stages (Analyzing product → … → Finalizing sales page) · **View my asset** |
| Money page editor | Money page · themes/variations · **Publish** / Publishing... / **Update live page** · Preview |
| Generate Traffic (hub) | Step 2 · Generate Traffic · Daily pin generations `{n} / 5` · Resets at midnight UTC · **Generate traffic** / Open pin workspace |
| Pin workspace | Generate Pinterest traffic · **Generate Traffic Assets** · Generating your pins · 10 pins · Download image · Copy / Copy all · Save & continue to Results · Regenerate traffic assets |
| Results | Step 3 · Your results · Money pages live · Traffic assets created · Visitors generated · Affiliate clicks · Edit / Preview / Generate |
| Links Library | Saved promotion links · Create New Link · Create Your First Link |
| Academy | Academy · Training Videos / FAQ · Platform Tutorials titles below |

### Academy platform tutorial titles (in-app)
1. Activate Your First Asset  
2. Publish Your Money Page  
3. Pinterest Traffic & Results  

### On-screen numbers that scripts must not contradict
- **5** pin generations per day (midnight UTC reset)
- **10** pins per Generate Traffic run (and per Unlimited install)
- **~200** Unlimited templates; **10** pins per install
- Done-For-You Profit: **3** pins · authority article · **3** Facebook posts
- Instant Income: **10** Facebook variants; best practices: **70/30** value/promo · **25–50 groups/day** · **1–2 minutes** between posts · Tue–Thu **8–10 AM** / **12–1 PM** · link in first comment with `?src=facebook`
- Automated Profits: **~180** sources · **9** niches (~20 each)
- Guaranteed High-Ticket Payouts: **100+** authority guides; tracking `?src=article`

### Loading states (generation / build waits)

| Surface | Wait? | Free-training banner on wait? |
|---|---|---|
| Activate Asset | Yes (stage list + AiLoadingBar) | **No** |
| Generate Traffic pins | Yes | **No** |
| Unlimited install | Yes (`GenerationProgress`) | **Yes** — banner **below** progress |
| Done-For-You Profit Generate kit | Yes | **Yes** |
| Instant Income Generate posts | Yes | **Yes** |
| Guaranteed High-Ticket Payouts (GenerationProgress actions) | Yes when progress used | **Yes** |
| Automated Profits | Checklist only | **No** |
| Cyber Protection / Links Library / Results | No gen wait | **No** |

---

## 1.4 Free-training offer surfaces

| # | Component | Verbatim copy (key) | Destination | Where |
|---|---|---|---|---|
| A | DashboardBonusAdCard | Badge **Free member training** · body with $1,000 / $3,000 / $5,000 · CTA from promo settings default **Click Here To Learn How** (fallback in config: Yes! Show Me How To Earn $1,000–$5,000 A Day) · urgency **Limited access — register while it's still available** | `https://perpetualincome365.convertri.com/7figure-everwebinar-registration#aff=DigitalAvalon&cam=membersarea` | Home, between videos (×2) |
| B | EarningsBanner prominent (GenerationTrainingAd) | Badge **Free Training** · title default **Multiply Your Earnings To $1,000 – $5,000 A Day** · CTA **Click Here To Learn How** · **Warning: This Will Be Taken Down Soon** | same perpetualincome URL | Below progress during Unlimited / DFY Profit / Instant Income / High-Ticket GenerationProgress |
| C | Exclusive Offers → Fast Cash Training | **Fast Cash Training** · Claim Now | Explodely `5SRWJGZ` (sister offer — **not** the same webinar as A/B) | Sidebar Exclusive Offers |
| D | Exclusive Offers 1–2 | Earn $400/Day Testing New Apps · Get Paid To Copy & Paste | Partner URLs in `offers.config.ts` | Sidebar |
| E | Contact Support success | free training upsell + **Watch The Free Training >>** | perpetualincome | After support send |
| F | Scale Training page | Feature **off** — do not narrate as live | breakoutai URL | N/A |

**Spoken pitch (match CURRENT banner language):** wake up to / multiply to one thousand — even five thousand dollars a day.  
**Scarcity:** “Warning: This Will Be Taken Down Soon” / “Limited access — register while it's still available”.  
**Video 01 CTA path:** On Home **Start Here**, scroll to the gold **Free member training** card between the videos → click **Click Here To Learn How**. Do **not** invent a yellow “Step 2: Bonus training” button. Do **not** say the banner sits uniquely under video 1 only — ads sit between the three videos.

---

## 1.5 Free-training mention map

| Video | Moment | Ad? |
|---|---|---|
| 01 Buyer's Remorse | Dashboard gold Free member training card | Yes (mapped Home CTA) |
| 02 Disconnect | Once when narrating a generation wait / gold Free Training banner (prefer describing Unlimited or Instant Income progress, or Home gold card) | Yes, once, fluid |
| 03 Quick Overview | Once — gold Free member training card on Home | Yes, once |
| 04 Activate Your First Asset | Activate wait has **no** banner | **NONE** |
| 05 Publish Your Money Page | No gen banner | **NONE** |
| 06 Pinterest Traffic & Results | Pin gen has **no** banner | **NONE** |
| 07 Unlimited | During install `GenerationProgress` | Yes |
| 08 Done-For-You Profit | During Generate kit | Yes |
| 09 Instant Income | During Generate posts | Yes |
| 10 Automated Profits | Checklist only | **NONE** |
| 11 Guaranteed High-Ticket Payouts | During GenerationProgress wait | Yes |
| 12 Cyber Protection | Static health check | **NONE** |
| 13 Reseller & License Rights | Form / unlock (FINAL) | **NONE** |

---

## 1.6 Video roster

**Consumption order:** Dashboard 01→02→03, then Academy 04→13.

| # | Track | File | Feature(s) | Target | Ad? |
|---|---|---|---|---|---|
| 1 | Dashboard | `01-buyers-remorse.md` | — | 10+ min (≥1600w) | Home gold CTA |
| 2 | Dashboard | `02-disconnect.md` | — | 10+ min (≥1600w) | Once, fluid |
| 3 | Dashboard | `03-quick-overview.md` | whole app shallow | 3–5 min | Once (Home gold) |
| 4 | Academy | `04-activate-first-asset.md` | Activate Asset | 5+ min (≥900w) | No |
| 5 | Academy | `05-publish-money-page.md` | Money page editor / Publish | 5+ min | No |
| 6 | Academy | `06-pinterest-traffic-results.md` | Generate Traffic + Results | 5+ min | No |
| 7 | Academy | `07-unlimited.md` | Unlimited (1st premium) | 5+ min | Yes |
| 8 | Academy | `08-done-for-you-profit.md` | Done-For-You Profit (2nd) | 5+ min | Yes |
| 9 | Academy | `09-instant-income.md` | Instant Income (3rd) | 5+ min | Yes |
| 10 | Academy | `10-automated-profits.md` | Automated Profits (4th) | 5+ min | No |
| 11 | Academy | `11-guaranteed-high-ticket-payouts.md` | Guaranteed High-Ticket Payouts (5th) | 5+ min | Yes |
| 12 | Academy | `12-cyber-protection.md` | Cyber Protection (6th) | 5+ min | No |
| 13 | Academy | `13-reseller-license-rights.md` | Reseller & License Rights (7th, FINAL) | 5+ min | No |

---

## 1.7 Jargon Ledger (Disconnect Beat 5 — top terms)

| Term | Plain definition (≤15 words) | Everyday analogy | Why you care |
|---|---|---|---|
| Affiliate / affiliate link | A special URL that credits you when someone buys through it. | Your referral code at a store — sales under your name. | Without it, the merchant can't pay you. |
| Money page | Your hosted review page that sends visitors to the product. | A storefront window pointing shoppers to the checkout. | This is the page pins and posts send people to. |
| Activate Asset | The step that builds your money page from a product URL or name. | Ordering a custom storefront from a blueprint. | First button that turns “idea” into a page. |
| Publish | Making the money page live on the internet at a `/m/` URL. | Flipping the Open sign on the door. | Unpublished pages get zero visitors. |
| Pin / Pinterest pin | An image + title + description + link you post on Pinterest. | A flyer on a giant community board. | Pins are how most NullPing traffic starts. |
| Tracking link | The pin/post URL that records the visit back to Results. | A stamped ticket that counts who came through. | Results stay empty without it. |
| Niche | The product category aisle you promote in. | One aisle of a supermarket you decide to own. | Matching niche → better pins, sources, and guides. |
| Commission | Money the merchant pays you after a referred sale. | A finder's fee for sending a paying customer. | Lives on the merchant network — not inside Results. |
| Results | In-app dashboard of real visits and affiliate CTA clicks. | Your store's foot-traffic counter. | Proof of activity — not fake earnings numbers. |
| Premium Features | Paid upgrades that add vaults, kits, posts, checklists, etc. | Extra tools in the back room after the basics work. | Use after one live money page exists. |

---

## 1.8 Money Map

1. Merchants pay affiliates a **commission** when a buyer purchases through an **affiliate link**.  
2. Strangers discover products while browsing **Pinterest** (and optionally Facebook groups).  
3. Your **pin** (or Facebook post) uses a **tracking link** aimed at your **money page**.  
4. Visitor lands on the money page, reads the review, clicks the CTA → merchant site via your affiliate link.  
5. If they buy, the merchant network pays you (outside NullPing).  
6. **Results** shows visits and CTA clicks so you know which assets move.  

**Software's role:** automates the weak link — building the money page and pin creatives. Member still publishes and posts by hand.  

**Weakest link buyers doubt:** “Will anyone actually click / can I get traffic?” — answer: pins + consistent posting; Results shows real activity, not simulated earnings.

**First Win (Artifact 4):** Activate Asset → View my asset → Publish → copy the live `/m/` link.

---

## Live audit checklist

- [ ] Dev server + `DEV_BYPASS_AUTH`
- [ ] Sidebar dump + Home geometry (right rail, Start Here order, gold ads)
- [ ] Activate / Publish / Traffic / Results / Links / Academy
- [ ] Each Premium Features page + wait banners where claimed
- [ ] Revert nothing (env-only bypass); delete audit scripts
