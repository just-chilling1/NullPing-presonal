import { brand } from "./brand.config";
import { support } from "./support.config";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  title: string;
  items: FaqItem[];
}

const productName = brand.productName;

export const faqSections: FaqSection[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: `What is ${productName}?`,
        a: `${productName} helps you turn a product into a live affiliate money page, then drive Pinterest traffic to it. You pick what to promote — ${productName} builds the page, prepares pins, and tracks visits and clicks.`,
      },
      {
        q: "What is the core workflow?",
        a: "Three steps in the sidebar under Generate: Activate Asset (choose a product and build a money page), Generate Traffic (create Pinterest pins that link to your page), then Results (see real visitors and affiliate clicks). Publish your money page between Activate and Traffic so pins point at a live URL.",
      },
      {
        q: "What should I do first on the Dashboard?",
        a: "Watch the three Start Here videos on the Dashboard — Watch This First, How The Money Flows, and Your 5-Minute Tour. Then open Activate Asset and create your first money page. Academy in the sidebar has the same tutorials plus premium walkthroughs.",
      },
      {
        q: "Do I need tech or writing skills?",
        a: "No. Paste a product URL or type a product name. NullPing scrapes the offer, writes the review page, and prepares promotion assets. You review, publish, and share.",
      },
      {
        q: "Do I need my own affiliate link?",
        a: "Recommended. Add it when you activate an asset, or later on the money page editor. CTA buttons use that link so commissions can track correctly when someone buys.",
      },
      {
        q: "Where do I learn the click-by-click process?",
        a: "Open Academy in the sidebar for training videos, a quick-reference workflow, pro tips, and a launch checklist. The FAQ is also available at Support and at Academy → FAQ.",
      },
    ],
  },
  {
    title: "Activate & Money Pages",
    items: [
      {
        q: "How do I activate my first asset?",
        a: "Go to Activate Asset, paste a product URL or enter a product name (you only need one), optionally add your affiliate link, then click Activate asset. NullPing builds a full money page and opens the editor so you can preview and publish.",
      },
      {
        q: "Should I use a product URL or product name?",
        a: "Use a URL when you have a sales page or marketplace listing — NullPing scrapes it for details. Use a product name when you know what you want to promote but do not have a link handy. Either way, add your affiliate link so CTAs pay you.",
      },
      {
        q: "What is a money page?",
        a: "A hosted affiliate review page with headline, benefits, pros and cons, FAQs, and call-to-action buttons. After activation, open the money page editor to change the color theme, pick a page style, edit copy, regenerate content, and publish.",
      },
      {
        q: "What are the color themes and page styles?",
        a: "Color themes: Ocean, Forest, Sunset, and Slate — change the look without rewriting copy. Page styles: Honest review, Beginner breakdown, and Smart buyer — each reframes the same product with a different angle and section layout.",
      },
      {
        q: "What is the difference between Draft and Live?",
        a: "Draft means the page is saved but not public yet. Live means you have published and visitors can open your page at its shareable URL. Generate Traffic works best after publish so pins send people to a live destination.",
      },
      {
        q: "Can I edit the page after it is created?",
        a: "Yes. Open the money page for that asset to edit copy, switch themes or styles, regenerate content, update your affiliate link, upload a hero image, or republish. Changes apply to your live page when you publish or update.",
      },
      {
        q: "What link do I share when promoting?",
        a: "After you publish, copy the live page URL from the money page screen (Copy link). That is the link visitors should open — and the destination your Pinterest pins and other promotions should point to.",
      },
    ],
  },
  {
    title: "Traffic & Results",
    items: [
      {
        q: "How do I get traffic to my money page?",
        a: "After publishing, open Generate Traffic. Pick your money page, then Generate Traffic Assets to create 10 Pinterest pins — each with an image, title, description, and tracking link. Download the images, copy the text, and post them on Pinterest.",
      },
      {
        q: "How many pins do I get, and can I regenerate them?",
        a: "Each generation creates 10 pins aimed at your money page. You can regenerate pins anytime from the pin workspace if you want fresh images or copy. Unlimited installs also include 10 pins when you install a template.",
      },
      {
        q: "What is Results?",
        a: "Results shows tracked visitors, affiliate clicks, and performance per asset from real activity — not simulated numbers. You will see money pages live, traffic assets created, visitors, clicks, CTR, and a recent activity feed.",
      },
      {
        q: "How does traffic tracking work?",
        a: "NullPing records visits to your published money pages and clicks on affiliate CTAs. Premium tools append source tags (for example ?src=facebook or ?src=article) so you can see which channel drove the visit in Results.",
      },
      {
        q: "Why am I not seeing clicks yet?",
        a: "Results only update after real visits and clicks. Publish the money page first, send traffic (Pinterest pins, Facebook posts, or checklist sources), then check Results again. Allow time for people to find and click through.",
      },
    ],
  },
  {
    title: "Links Library",
    items: [
      {
        q: "What is the Links Library?",
        a: "Links Library (sidebar under Libraries) is where you save affiliate and promo URLs with labels, tags, and network type (Digistore24, Amazon, or Other). Copy links anytime without hunting through old tabs.",
      },
      {
        q: "Does activating an asset automatically use my saved links?",
        a: "Not automatically — you still paste or select a link when you activate or edit a money page. The vault is for organizing links you reuse across multiple offers and seeing which money pages already use each URL.",
      },
      {
        q: "Can I reuse one affiliate link on multiple money pages?",
        a: "Yes. Save the link once in Links Library, then apply it when you activate assets or edit money pages. The vault shows Used in when a link is attached to a live or draft page.",
      },
    ],
  },
  {
    title: "Academy",
    items: [
      {
        q: "What is in the Academy?",
        a: "Academy has core platform tutorials (Activate, Publish, Pinterest Traffic & Results), a quick-reference workflow, pro tips, a launch checklist, and premium feature walkthrough videos that match the tools in your sidebar.",
      },
      {
        q: "Where is the FAQ?",
        a: "The same FAQ appears on Support (scroll to the FAQ section) and at Academy → FAQ. Support also has the refund policy and a contact form if your question is not answered here.",
      },
      {
        q: "What order should I watch the videos?",
        a: "Start with the three Dashboard Start Here videos, then follow the Academy core tutorials in order: Activate Your First Asset → Publish Your Money Page → Pinterest Traffic & Results. Open premium tutorials when you are ready to use those tools.",
      },
    ],
  },
  {
    title: "Premium Features",
    items: [
      {
        q: "What is Unlimited?",
        a: "Unlimited gives you access to 200 ready-made money pages across popular niches. Preview a template, apply your affiliate link, and install — each install includes 10 Pinterest pins. Optionally regenerate AI pins, then continue to Generate Traffic and Results.",
      },
      {
        q: "What is Done-For-You Profit?",
        a: "Done-For-You Profit builds a live sales page from your affiliate link and niche in one run, then generates 3 Pinterest pins, an authority article, and 3 Facebook posts. If a stage fails, retry that stage without starting over.",
      },
      {
        q: "What is Instant Income?",
        a: "Instant Income bulk-generates 10 Facebook post variants from a live money page. Every generation is saved as a post set you can copy from later. Built-in Facebook posting best practices help you share without breaking group rules. Visits show up in Results with ?src=facebook.",
      },
      {
        q: "What is Automated Profits?",
        a: "Automated Profits is a curated checklist of 180 traffic sources across 9 niches — not auto-posting. Pick your live money page, filter by niche, follow each source's steps, copy the ready-made description with your tracking link, and mark sources complete. Progress is saved as you go.",
      },
      {
        q: "What are Guaranteed High-Ticket Payouts?",
        a: "Guaranteed High-Ticket Payouts add long-form authority sections to your money page. Pick a live page, browse 100+ guides by niche, preview an article, then Add to money page (primary) or copy plain text/HTML for Medium, LinkedIn, or your blog. CTAs use your /m page tracking URL with ?src=article. Review and publish after adding a section.",
      },
      {
        q: "What is Cyber Protection?",
        a: "Cyber Protection shows real account status — email confirmation, active session, HTTPS, and recent money-page activity (last publish, pin, and visit). It is not antivirus software; it is an honest health check. Resend confirmation email from here, or open Account for profile and license.",
      },
      {
        q: "What is Reseller & License Rights?",
        a: "Open Account → Reseller & License Rights to request turnkey reseller activation. Submit the form and our team reviews the request — you will see Awaiting team activation until complete (typically within 2 hours, allow up to 48 hours on busy days). Edition deliverables unlock after activation.",
      },
    ],
  },
  {
    title: "Account & Security",
    items: [
      {
        q: "How do I manage my account?",
        a: "Open Account from the sidebar footer. View your email, confirmation status, and last sign-in. Reset your password from Account, or use Forgot Password on the login screen if you are signed out.",
      },
      {
        q: "Why do I need to confirm my email?",
        a: "Email confirmation protects your account and unlocks full access. Check your inbox after signup. If you did not receive it, open Cyber Protection and click Resend confirmation, or contact support.",
      },
      {
        q: "How do I reset my password?",
        a: "Use Forgot Password on the login screen. If you are already signed in, sign out first, then request a reset link to the email on your account. Reset links expire — request a new one if yours has expired.",
      },
      {
        q: "Is my data secure?",
        a: `${productName} uses secure authentication and encrypted connections. Never share your password, and contact support immediately if you notice unusual account activity.`,
      },
    ],
  },
  {
    title: "Support & Billing",
    items: [
      {
        q: "How do I contact support?",
        a: `Open Support from the sidebar or use the floating Need help? widget anywhere in the app. For a detailed message, go to Support → Contact Support. You can also email ${support.email}.`,
      },
      {
        q: "How quickly does support respond?",
        a: "Our support team typically replies within two hours. Allow up to 48 hours on busy days. Open Support if your question is not answered in this FAQ.",
      },
      {
        q: "What is the refund policy?",
        a: `${productName} includes a 30-day satisfaction guarantee. Email ${support.email} with your account email and purchase date to request a refund. Refunds are typically processed within 5–7 business days.`,
      },
      {
        q: "Is there a help center outside the app?",
        a: `Yes. Visit ${support.helpCenterUrl} to browse articles and track support tickets alongside the in-app Support page.`,
      },
    ],
  },
];

export const faqPageCopy = {
  title: "Frequently Asked Questions",
  subtitle: `Quick answers about ${productName} — workflow, money pages, traffic, libraries, premium tools, and your account`,
} as const;
