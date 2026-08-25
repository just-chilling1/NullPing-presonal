/**
 * Builds a Google Docs–ready .docx of the product brief.
 * Fonts match NullPing brand (Google Fonts → add in Docs if needed):
 *   Headings: Space Grotesk
 *   Body: Plus Jakarta Sans
 *
 * Upload the .docx to Drive → Open with Google Docs → File → Save as Google Docs.
 * Then: Format → Font → More fonts → enable Space Grotesk + Plus Jakarta Sans.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "NullPing-Cash-Product-Brief.docx");

const HEADING = "Space Grotesk";
const BODY = "Plus Jakarta Sans";
const INK = "0F172A";
const MUTED = "64748B";
const ACCENT = "0E7490";
const RULE = "E2E8F0";
const SOFT = "F8FAFC";

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [
      new TextRun({
        text,
        font: HEADING,
        size: 32,
        bold: true,
        color: INK,
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        font: HEADING,
        size: 24,
        bold: true,
        color: ACCENT,
      }),
    ],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 312 },
    ...opts,
    children: [
      new TextRun({
        text,
        font: BODY,
        size: 22,
        color: INK,
      }),
    ],
  });
}

function muted(text) {
  return new Paragraph({
    spacing: { after: 200, line: 300 },
    children: [
      new TextRun({
        text,
        font: BODY,
        size: 20,
        italics: true,
        color: MUTED,
      }),
    ],
  });
}

function boldLead(lead, rest) {
  return new Paragraph({
    spacing: { after: 140, line: 312 },
    children: [
      new TextRun({ text: lead, font: BODY, size: 22, bold: true, color: INK }),
      new TextRun({ text: rest, font: BODY, size: 22, color: INK }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80, line: 300 },
    children: [new TextRun({ text, font: BODY, size: 22, color: INK })],
  });
}

function quote(text) {
  return new Paragraph({
    spacing: { before: 120, after: 200, line: 320 },
    indent: { left: 240 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: "00B8C8", space: 12 },
    },
    children: [
      new TextRun({
        text,
        font: HEADING,
        size: 26,
        bold: true,
        italics: true,
        color: ACCENT,
      }),
    ],
  });
}

function cell(text, opts = {}) {
  const { bold = false, width = 2340, fill = null, header = false } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        spacing: { line: 276 },
        children: [
          new TextRun({
            text,
            font: header ? HEADING : BODY,
            size: header ? 18 : 18,
            bold: bold || header,
            color: header ? MUTED : INK,
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) =>
          cell(h, { header: true, bold: true, width: widths[i], fill: SOFT })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((value, i) =>
              cell(String(value), {
                bold: i === 1 && headers[1]?.includes("name"),
                width: widths[i],
              })
            ),
          })
      ),
    ],
  });
}

function codeBlock(lines) {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 40, line: 276 },
        shading: { type: ShadingType.CLEAR, fill: SOFT },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: "00B8C8", space: 8 },
        },
        indent: { left: 120 },
        children: [
          new TextRun({
            text: line || " ",
            font: "Consolas",
            size: 17,
            color: INK,
          }),
        ],
      })
  );
}

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [
          {
            id: "Normal",
            name: "Normal",
            run: { font: BODY, size: 22, color: INK },
            paragraph: { spacing: { line: 312, after: 120 } },
          },
        ],
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 420, hanging: 240 } },
            },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 864, bottom: 864, left: 936, right: 936 },
        },
      },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "NULLPING CASH",
              font: HEADING,
              size: 18,
              bold: true,
              color: ACCENT,
              characterSpacing: 80,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "Product Brief & Upgrades",
              font: HEADING,
              size: 48,
              bold: true,
              color: INK,
            }),
          ],
        }),
        muted(
          "Source of truth for marketing copy, sales pages, and AI product-description prompts. Keep aligned with brand.config.ts, navigation.config.ts, and the Premium Features FAQ."
        ),
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: RULE, space: 1 },
          },
          spacing: { after: 280 },
          children: [],
        }),

        h1("1. App brief"),
        h2("One-liner"),
        boldLead(
          "NullPing Cash",
          " helps affiliates turn any product into a live money page, drive Pinterest traffic to it, and track real visitors and clicks — without writing copy or building a site from scratch."
        ),

        h2("Tagline"),
        quote("Activate. Publish. Get traffic."),

        h2("What it is"),
        body(
          "A beginner-focused affiliate software product. Members pick something to promote (a product URL or name), NullPing builds a hosted review-style money page, generates Pinterest pin assets that point at that page, and shows Results from real activity — not simulated earnings."
        ),

        h2("Who it’s for"),
        bullet("New affiliates who want a simple path: pick a product → publish → promote"),
        bullet("Side-hustlers who prefer guided tools over DIY websites"),
        bullet(
          "Members who already have affiliate links and need pages + traffic assets fast"
        ),

        h2("Core promise"),
        body(
          "You choose the product. NullPing builds the page, prepares the pins, and tracks visits and clicks. You review, publish, and share."
        ),

        h2("Core workflow (Generate)"),
        makeTable(
          ["Step", "Name", "What happens"],
          [
            [
              "1",
              "Activate Asset",
              "Paste a product URL or name (optional affiliate link). NullPing scrapes the offer and builds a full money page.",
            ],
            [
              "2",
              "Publish",
              "Preview, pick a theme/style, edit if you want, then publish. Live pages live at /m/{slug}.",
            ],
            [
              "3",
              "Generate Traffic",
              "Create Pinterest pin packs (image + title + description + tracking link) aimed at the money page.",
            ],
            [
              "4",
              "Results",
              "See real visitors, affiliate CTA clicks, CTR, and per-asset activity.",
            ],
          ],
          [900, 2200, 6260]
        ),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
        body(
          "Supporting tools: Links Library (save/reuse affiliate URLs), Academy (tutorials + FAQ), Support."
        ),

        h2("What members do not get inside the app"),
        bullet("Automatic Pinterest posting (pins are download + paste for MVP)"),
        bullet("Displayed commissions or “earnings” from merchant networks"),
        bullet(
          "A full analytics suite (bot-filtered visits/clicks, not enterprise tracking)"
        ),

        h2("Short product description (ready to reuse)"),
        body(
          "NullPing Cash is affiliate software that turns a product URL or name into a hosted money page, generates Pinterest traffic assets that send visitors to that page, and tracks real visits and clicks. Paste an offer, publish your page, promote with pins, then check Results — no site-building or copywriting required."
        ),

        h2("Longer product description (sales / SEO)"),
        body(
          "NullPing Cash is built for people who want to promote affiliate offers without learning web design or writing long reviews by hand. Activate an asset from a product URL or name, optionally add your affiliate link, and NullPing assembles a review-style money page with headlines, benefits, pros and cons, FAQs, and call-to-action buttons. Publish to a live hosted URL, then generate Pinterest pin packs — each with an image, title, description, and tracking link — so traffic lands on your page. Results show real visitors and affiliate clicks so you can see which assets are working. Premium upgrades add ready-made page libraries, one-click offer packs, Facebook post variants, curated traffic checklists, authority content, account health checks, and optional reseller license activation."
        ),

        h1("2. Premium upgrades"),
        body(
          "Use the upgrade name exactly as shown in the product UI. The brief is the capability summary to feed into product descriptions, ads, and training copy."
        ),
        makeTable(
          ["#", "Upgrade name (UI)", "Feature ID", "Brief"],
          [
            [
              "1",
              "Unlimited",
              "premium-accelerator",
              "Access ~200 ready-made money pages across popular niches. Preview a template, apply your affiliate link, install — each install includes 10 Pinterest pins. Then continue in Traffic → Results.",
            ],
            [
              "2",
              "Done-For-You Profit",
              "premium-dfy-profit",
              "One run from affiliate link + niche → live sales page, 3 Pinterest pins, an authority article, and 3 Facebook posts. Retry a failed stage without starting over.",
            ],
            [
              "3",
              "Instant Income",
              "premium-social",
              "Bulk-generate ~10 Facebook post variants from a live money page — different hooks and angles. Save post sets, copy/paste to Facebook; visits track with ?src=facebook.",
            ],
            [
              "4",
              "Automated Profits",
              "premium-autopilot",
              "Curated checklist of ~180 traffic sources across 9 niches (not auto-posting). Pick a live money page, follow each source, copy the ready-made description + tracking link, mark complete.",
            ],
            [
              "5",
              "Guaranteed High-Ticket Payouts",
              "premium-recurring",
              "Add long-form authority article sections to a money page from 100+ niche guides. Primary action: add to money page; optional copy for Medium/LinkedIn/blog. CTAs use /m tracking with ?src=article.",
            ],
            [
              "6",
              "Cyber Protection",
              "protector",
              "Real account health check — email confirmation, session, HTTPS, and recent money-page activity. Not antivirus; honest status + links to Account / license.",
            ],
            [
              "7",
              "Reseller & License Rights",
              "premium-license-rights",
              "Request turnkey reseller activation (sell under your own brand after the team activates). Form → “Awaiting team activation” until deliverables unlock (typically hours, up to ~48h busy).",
            ],
          ],
          [600, 2400, 2400, 3960]
        ),

        h2("Upgrade blurbs (1–2 sentences each)"),
        boldLead(
          "Unlimited — ",
          "Skip blank-page activation when you want speed. Browse a vault of pre-built money pages, install with your affiliate link, and walk away with pins ready for Pinterest."
        ),
        boldLead(
          "Done-For-You Profit — ",
          "The full launch pack in one flow: page, pins, article, and Facebook posts from your link and niche — so you can promote the same offer across channels without assembling each asset by hand."
        ),
        boldLead(
          "Instant Income — ",
          "Turn one live money page into a set of Facebook-ready posts with varied hooks. Built for copy-and-paste promotion, with tracking so Results can show Facebook-sourced visits."
        ),
        boldLead(
          "Automated Profits — ",
          "A guided map of where to promote — forums, groups, directories, and more — with niche filters and ready-made descriptions. You still post manually; the checklist keeps progress and links organized."
        ),
        boldLead(
          "Guaranteed High-Ticket Payouts — ",
          "Strengthen a money page with long-form authority content that keeps visitors reading and clicking your tracked CTAs. Use sections on-page or export copy for external publishing."
        ),
        boldLead(
          "Cyber Protection — ",
          "A clear status panel for the account that runs your pages — confirmation, session, and recent activity — so members know the basics are healthy before they scale promotion."
        ),
        boldLead(
          "Reseller & License Rights — ",
          "The business-layer upgrade: request activation to resell NullPing Cash under your own brand with turnkey assets, after the team reviews and unlocks the edition."
        ),

        h2("Naming notes (avoid mix-ups)"),
        makeTable(
          ["Say this (NullPing Cash)", "Don’t confuse with"],
          [
            ["Unlimited", "“Accelerator” (internal/feature folder name)"],
            ["Instant Income", "“Social Payouts” (route slug only)"],
            ["Guaranteed High-Ticket Payouts", "“Recurring Wealth” (route slug only)"],
            ["Automated Profits", "True autoposting / set-and-forget bots"],
          ],
          [4200, 5160]
        ),

        h1("3. Prompt snippet (for AI product descriptions)"),
        body("Paste when generating sales copy, pin captions, or upgrade blurbs:"),
        ...codeBlock([
          "Product: NullPing Cash",
          "Tagline: Activate. Publish. Get traffic.",
          "Core: Affiliate software — product URL/name → hosted money page → Pinterest pins → real visits/clicks in Results.",
          "Tone: Clear, beginner-friendly, benefit-led. No fake earnings numbers from inside the app.",
          "Premium upgrade names (use exactly):",
          "1. Unlimited — 200 ready-made money pages + 10 pins per install",
          "2. Done-For-You Profit — link + niche → page, 3 pins, article, 3 Facebook posts",
          "3. Instant Income — bulk Facebook post variants from a live money page",
          "4. Automated Profits — curated traffic-source checklist (manual posting)",
          "5. Guaranteed High-Ticket Payouts — authority sections on a money page",
          "6. Cyber Protection — account/session/activity health check",
          "7. Reseller & License Rights — request turnkey reseller activation",
        ]),

        h1("Related files"),
        bullet("Brand: src/config/brand.config.ts"),
        bullet("Premium nav labels: src/config/navigation.config.ts → premiumNav"),
        bullet("Widget one-liners: src/lib/premium-features.ts"),
        bullet("Member FAQ: src/config/faq.config.ts → Premium Features"),
        bullet("Launch notes: docs/nullping/LAUNCH.md"),

        new Paragraph({
          spacing: { before: 400 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 12 },
          },
          children: [
            new TextRun({
              text: "Typography: Space Grotesk (headings) · Plus Jakarta Sans (body) — match NullPing brand. In Google Docs: Format → Font → More fonts → add both, then apply to Heading 1/2 and Normal.",
              font: BODY,
              size: 16,
              color: MUTED,
              italics: true,
            }),
          ],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
