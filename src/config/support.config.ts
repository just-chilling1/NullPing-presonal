import { brand } from "./brand.config";

export const supportRoutes = {
  home: "/support",
  contact: "/support/contact",
  /** FAQ lives on the main support page */
  faq: "/support#faq",
} as const;

const SUPPORT_EMAIL = "NullPingProfit@neoai.freshdesk.com";

export const support = {
  email: SUPPORT_EMAIL,
  /** Dedicated in-app contact form page */
  contactUrl: "/support/contact",
  /** Freshdesk help portal — browse articles and track tickets */
  helpCenterUrl: "https://neoaifreshdesk.freshdesk.com",
  headline: "Need Help?",
  pageTitle: "Support",
  pageSubtitle: `Help with ${brand.productName} — money pages, Pinterest traffic, premium tools, and your account`,
  contactPageTitle: "Contact Support",
  contactPageSubtitle: "Send us a message — we usually reply within about 2 hours",
  subcopy: "Our support team is here for you 24/7",
  ctaLabel: "Contact Support",
  floatingWidget: {
    label: "Need help?",
    panelTitle: "Need help?",
    panelSubtitle: "Send us a message — we typically reply within 2 hours",
    ariaLabel: "Need help? Contact support",
  },
  stats: [
    { icon: "clock", label: "Avg response", highlight: "under 2 hours", highlightClass: "text-success" },
    { icon: "star", label: "4.9/5 support rating" },
    { icon: "shield", label: "98% satisfaction rate" },
  ],
  refundPolicy: {
    title: "Refund Policy",
    subtitle: `Satisfaction guarantee for ${brand.productName}`,
    items: [
      {
        title: "30-Day Guarantee",
        body: "Full refund available within 30 days of purchase. No questions asked.",
      },
      {
        title: "Request Procedure",
        body: `Email our support team at ${SUPPORT_EMAIL} with your account email and purchase date. We will confirm receipt and begin processing.`,
      },
      {
        title: "Processing Timeline",
        body: "Refunds are typically processed within 5–7 business days. You will receive confirmation once complete.",
      },
    ],
  },
} as const;
