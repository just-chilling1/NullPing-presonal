import { brand } from "./brand.config";
import { trainingContent } from "./training.config";

export const dashboardContent = {
  eyebrow: "Home",
  get title() {
    return `Welcome to ${brand.productName}`;
  },
  subtitle:
    "Watch the three videos below — then activate your first asset. NullPing builds the money page. You just pick the product.",
  startHereTitle: "Start Here",
  /** Dashboard video track — set Vimeo ids here or in training.config.ts videos[] */
  videos: [
    {
      id: "",
      title: "Watch This First",
      description:
        "Before you touch a single tool — watch this. It clears the night-one doubt and shows you exactly what you bought.",
      duration: "",
    },
    {
      id: "",
      title: "How The Money Flows",
      description:
        "Where the money comes from, who pays you, and what every tool inside the app actually means — in plain language.",
      duration: "",
    },
    {
      id: "",
      title: "Your 5-Minute Tour",
      description:
        "A quick walkthrough of where everything lives — so you never feel lost when you start working.",
      duration: "",
    },
  ],
  bonusAd: {
    paragraphs: [
      "Imagine rolling out of bed, checking your phone, and seeing an extra $1,000, $3,000, or even $5,000 deposited into your account — without grinding away at a 9-to-5 job, begging for overtime, or stressing over side hustles that barely pay the bills.",
      "This isn't some wild fantasy — it's a real, proven system that countless everyday people are using to generate consistent, life-changing income on autopilot. No experience? No problem. No tech skills? Doesn't matter. This works for anyone willing to follow a simple, step-by-step process.",
      "The best part? It runs 24/7, even while you sleep.",
    ],
    highlight:
      "Ready to break free from financial stress and start living life on your terms?",
    closing:
      "Click the button below and discover how you can wake up to an extra $1,000–$5,000 in your bank account every single day!",
    ctaLabel: "Yes! Show Me How To Earn $1,000–$5,000 A Day",
    ctaUrl: trainingContent.externalTrainingUrl,
  },
} as const;
