/**
 * NullPing Cash Academy content — platform tutorials, premium walkthroughs, and launch helpers.
 * Add Vimeo IDs in training.config.ts (platform) and below (premium) when videos are uploaded.
 */

import type { FeatureId } from "./features.config";
import { brand } from "./brand.config";
import { faqSections } from "./faq.config";

const productName = brand.productName;

export const trainingWorkflowSteps = [
  {
    step: 1,
    title: "Activate Asset",
    page: "/activate",
    description:
      "Paste a product URL or enter a product name. NullPing scrapes the offer and builds your money page.",
    tips: ["Add your affiliate link at activate time so CTAs are ready when you publish."],
    examples: [] as string[],
  },
  {
    step: 2,
    title: "Publish Money Page",
    page: "/activate",
    description:
      "Preview the page, choose a theme, tweak copy if needed, then publish your live shareable link.",
    tips: ["Publish before generating pins — traffic should land on a live money page."],
    examples: [] as string[],
  },
  {
    step: 3,
    title: "Traffic & Results",
    page: "/results",
    description:
      "Generate Pinterest pins aimed at your money page, post them, then check Results for real visits and clicks.",
    tips: ["Results only update after real traffic — give pins time to get impressions."],
    examples: [] as string[],
  },
] as const;

export const trainingFaqSections = faqSections;

export const trainingProTips = [
  {
    title: "Publish before you polish",
    text: "Your first money page does not need perfect copy. Activate, publish, and send traffic — refine themes and wording after you see Results.",
  },
  {
    title: "Pins need a live destination",
    text: "Always publish the money page first, then generate Pinterest pins so every pin points at a working URL.",
  },
  {
    title: "Use your affiliate link",
    text: "Add your affiliate URL on activate or in the money page editor so CTA buttons can credit you when someone buys.",
  },
] as const;

export const trainingQuickStartChecklist = [
  "Watch the three Start Here videos on your Dashboard",
  "Activate your first asset and publish the money page",
  "Generate Pinterest pins and post them to drive traffic",
  "Open Results to confirm real visits and affiliate clicks",
] as const;

/** Premium walkthrough slots — titles match NullPing Cash premium nav labels (roster 07–13) */
export const trainingPremiumVideos: ReadonlyArray<{
  id: string;
  badge: string;
  title: string;
  description: string;
  duration: string;
  feature: FeatureId;
}> = [
  {
    id: "",
    badge: "Unlimited",
    title: "Unlimited",
    description:
      "Install from two hundred ready-made money pages — swap in your affiliate link, get 10 pins, then finish Traffic → Results.",
    duration: "5+ min",
    feature: "premium-accelerator",
  },
  {
    id: "",
    badge: "Done-For-You Profit",
    title: "Done-For-You Profit",
    description:
      "Apply your affiliate link, pick a niche, and generate a live sales page with 3 pins, an authority article, and 3 Facebook posts.",
    duration: "5+ min",
    feature: "premium-dfy-profit",
  },
  {
    id: "",
    badge: "Instant Income",
    title: "Instant Income",
    description:
      "Bulk-generate Facebook post variants from a live money page — different hooks and angles, then copy and paste.",
    duration: "5+ min",
    feature: "premium-social",
  },
  {
    id: "",
    badge: "Automated Profits",
    title: "Automated Profits",
    description:
      "Pick a live money page, filter by niche, and work through ~180 practical traffic sources with ready-made copy and tracking links.",
    duration: "5+ min",
    feature: "premium-autopilot",
  },
  {
    id: "",
    badge: "Guaranteed High-Ticket Payouts",
    title: "Guaranteed High-Ticket Payouts",
    description:
      "Add authority article sections to your money page — CTAs use your /m tracking URL. Copy for external posts is optional.",
    duration: "5+ min",
    feature: "premium-recurring",
  },
  {
    id: "",
    badge: "Cyber Protection",
    title: "Cyber Protection",
    description:
      "Real account status — email confirmation, session, HTTPS, and recent money-page activity. Manage license on Account.",
    duration: "2+ min",
    feature: "protector",
  },
  {
    id: "",
    badge: "Reseller & License Rights",
    title: "Reseller & License Rights",
    description:
      "Request reseller activation from support — your ticket is filed as License Rights and managed from Account.",
    duration: "5+ min",
    feature: "premium-license-rights",
  },
];

export const trainingContentReady = true;

export const trainingCta = {
  headline: `Ready to activate your first ${productName} asset?`,
  subcopy:
    "The Academy covers every step — Activate Asset is where you put it into action. Paste a product URL and let NullPing build your money page tonight.",
  buttonLabel: "Activate your first asset",
  href: "/activate",
} as const;
