/**
 * Phase 1 live UI audit — delete after run.
 * Usage: node scripts/phase1-ui-audit.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:3000";
const OUT = join(process.cwd(), "training-video-system", "nullping-cash", "_audit");
/** Wait after load so animations, fonts, and client hydration finish before screenshots. */
const PAGE_SETTLE_MS = Number(process.env.AUDIT_SETTLE_MS || 5000);
const GOTO_OPTS = { waitUntil: "load", timeout: 120000 };
mkdirSync(OUT, { recursive: true });

const routes = [
  ["/dashboard", "dashboard"],
  ["/activate", "activate"],
  ["/traffic", "traffic"],
  ["/results", "results"],
  ["/link-vault", "link-vault"],
  ["/training", "training"],
  ["/accelerator", "unlimited"],
  ["/dfy-profit", "dfy-profit"],
  ["/social-payouts", "instant-income"],
  ["/autopilot", "automated-profits"],
  ["/recurring-wealth", "high-ticket"],
  ["/protector", "cyber"],
  ["/account", "account"],
  ["/support", "support"],
];

function hasCI(hay, needle) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

const failures = [];
const notes = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
  else notes.push(`OK: ${msg}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [path, slug] of routes) {
  const url = `${BASE}${path}`;
  try {
    await page.goto(url, GOTO_OPTS);
    await page.waitForTimeout(PAGE_SETTLE_MS);
    await page.screenshot({ path: join(OUT, `${slug}.png`), fullPage: true });
    const body = await page.locator("body").innerText();
    writeFileSync(join(OUT, `${slug}.txt`), body, "utf8");
    notes.push(`LOADED ${path} (${body.length} chars)`);
  } catch (e) {
    failures.push(`FAIL load ${path}: ${e.message}`);
  }
}

// Sidebar dump from dashboard
await page.goto(`${BASE}/dashboard`, GOTO_OPTS);
await page.waitForTimeout(PAGE_SETTLE_MS);
const sidebar =
  (await page.locator("aside, nav, [data-sidebar], .sidebar").first().innerText().catch(() => "")) ||
  (await page.locator("body").innerText());
writeFileSync(join(OUT, "sidebar.txt"), sidebar, "utf8");

const dash = await page.locator("body").innerText();
assert(hasCI(dash, "Welcome to NullPing Cash") || hasCI(dash, "Watch This First"), "Home welcome / Watch This First");
assert(hasCI(dash, "Watch This First"), "Video 1 title");
assert(hasCI(dash, "How The Money Flows"), "Video 2 title");
assert(hasCI(dash, "Your 5-Minute Tour"), "Video 3 title");
assert(hasCI(dash, "Free member training") || hasCI(dash, "Click Here To Learn How"), "Gold free training CTA");
assert(hasCI(dash, "Contact Support"), "Contact Support on Home");
assert(hasCI(dash, "Premium Features"), "Premium Features widget/section");

// Geometry: right rail Contact Support should be rightish
try {
  const support = page.getByText("Contact Support", { exact: false }).first();
  const box = await support.boundingBox();
  if (box) {
    assert(box.x > 700, `Contact Support appears right-rail-ish (x=${Math.round(box.x)})`);
  } else {
    failures.push("Contact Support bounding box missing");
  }
} catch (e) {
  failures.push(`Contact Support geometry: ${e.message}`);
}

// Start Here order by Y
const titles = ["Watch This First", "How The Money Flows", "Your 5-Minute Tour"];
const ys = [];
for (const t of titles) {
  const el = page.getByText(t, { exact: false }).first();
  const b = await el.boundingBox().catch(() => null);
  ys.push({ t, y: b?.y ?? -1 });
}
if (ys.every((x) => x.y >= 0)) {
  assert(ys[0].y < ys[1].y && ys[1].y < ys[2].y, `Start Here Y order: ${ys.map((x) => `${x.t}@${Math.round(x.y)}`).join(" < ")}`);
} else {
  failures.push(`Could not measure Start Here Y: ${JSON.stringify(ys)}`);
}

const mustInSidebar = [
  "Dashboard",
  "Activate Asset",
  "Generate Traffic",
  "Results",
  "Links Library",
  "Academy",
  "Unlimited",
  "Done-For-You Profit",
  "Instant Income",
  "Automated Profits",
  "Guaranteed High-Ticket Payouts",
  "Cyber Protection",
  "Reseller & License Rights",
  "Exclusive Offers",
  "Support",
];
for (const label of mustInSidebar) {
  assert(hasCI(sidebar, label), `Sidebar has "${label}"`);
}

// Core pages spot checks
const activate = await page.goto(`${BASE}/activate`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(activate, "What do you want to promote"), "Activate H1");
assert(hasCI(activate, "Activate asset"), "Activate CTA");

const traffic = await page.goto(`${BASE}/traffic`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(traffic, "Generate Traffic"), "Traffic title");
assert(hasCI(traffic, "5") || hasCI(traffic, "pin"), "Traffic pins/quota language");

const results = await page.goto(`${BASE}/results`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(results, "Your results") || hasCI(results, "Results"), "Results title");
assert(hasCI(results, "Visitors") || hasCI(results, "Affiliate"), "Results stats");

const unlimited = await page.goto(`${BASE}/accelerator`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(unlimited, "Unlimited"), "Unlimited title");
assert(hasCI(unlimited, "10") || hasCI(unlimited, "pin"), "Unlimited 10 pins language");

const instant = await page.goto(`${BASE}/social-payouts`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(instant, "Instant Income"), "Instant Income title");
assert(hasCI(instant, "25") || hasCI(instant, "50") || hasCI(instant, "Best Practices"), "Instant Income best practices");

const auto = await page.goto(`${BASE}/autopilot`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(auto, "Automated Profits"), "Automated Profits title");

const cyber = await page.goto(`${BASE}/protector`, { waitUntil: "load", timeout: 120000 }).then(async () => {
  await page.waitForTimeout(PAGE_SETTLE_MS);
  return page.locator("body").innerText();
});
assert(hasCI(cyber, "Cyber Protection"), "Cyber Protection title");

await browser.close();

const report = {
  failures,
  okCount: notes.filter((n) => n.startsWith("OK:")).length,
  notes,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ failureCount: failures.length, failures, okCount: report.okCount }, null, 2));
process.exit(failures.length ? 1 : 0);
