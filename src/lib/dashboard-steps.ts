import type { LucideIcon } from "lucide-react";
import { Link2, Megaphone, Rocket, Search, Brain, Radar, MessageSquare, Image } from "lucide-react";
import { isFeatureEnabled } from "@/config/features.config";
import type { HowItWorksStep } from "@/components/ui/how-it-works";

export interface QuickAction {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText: string;
  accent: "gold" | "ink" | "pulse";
}

function blogBuilderSteps(): HowItWorksStep[] {
  return [
    {
      number: 1,
      title: "Add your link",
      description: "Save your affiliate or promotional link in the Links Library.",
      minutes: "~2 min",
      href: "/link-vault",
      icon: Link2,
      cta: "Open Links Library",
    },
    {
      number: 2,
      title: "Build your offer",
      description: "Run the Sales Offer Generator — pick a niche, template, and publish.",
      minutes: "~5 min",
      href: "/sales-offer-generator",
      icon: Rocket,
      cta: "Start Generator",
    },
    {
      number: 3,
      title: "Promote everywhere",
      description: "Create X-Power promotion threads and share your offer across channels.",
      minutes: "~3 min",
      href: "/promote",
      icon: Megaphone,
      cta: "Create Promotions",
    },
  ];
}

function coreWorkflowSteps(): HowItWorksStep[] {
  return [
    {
      number: 1,
      title: "Enter a topic",
      description: "Type one niche or product angle to discover related keywords.",
      minutes: "~2 min",
      href: "/search",
      icon: Search,
      cta: "Go to Step 1",
    },
    {
      number: 2,
      title: "Find high-demand ads",
      description: "Check demand, pick active posts, and select the best places to reply.",
      minutes: "~5 min",
      href: "/radar",
      icon: Radar,
      cta: "Go to Step 3",
    },
    {
      number: 3,
      title: "Copy AI replies",
      description: "Generate replies with your link baked in and paste under the ad.",
      minutes: "~3 min",
      href: "/replies",
      icon: MessageSquare,
      cta: "Go to Step 4",
    },
  ];
}

function defaultSteps(): HowItWorksStep[] {
  return [
    {
      number: 1,
      title: "Watch the intro",
      description: "Start with the training video to understand the full workflow.",
      minutes: "~3 min",
      href: "/training",
      icon: Rocket,
      cta: "Open Academy",
    },
    {
      number: 2,
      title: "Configure your product",
      description: "Set branding, links, and enabled features in the config files.",
      minutes: "~10 min",
      href: "/support",
      icon: Brain,
      cta: "Get Help",
    },
    {
      number: 3,
      title: "Launch your workflow",
      description: "Enable your product modules and start with the first sidebar step.",
      minutes: "~5 min",
      href: "/dashboard",
      icon: Megaphone,
      cta: "Review Steps",
    },
  ];
}

function nullPingSteps(): HowItWorksStep[] {
  return [
    {
      number: 1,
      title: "Activate an asset",
      description: "Paste a product URL. NullPing builds the money page.",
      minutes: "~2 min",
      href: "/activate",
      icon: Rocket,
      cta: "Activate Asset",
    },
    {
      number: 2,
      title: "Publish the page",
      description: "Preview, then publish. NullPing hosts it for you.",
      minutes: "~1 min",
      href: "/activate",
      icon: Link2,
      cta: "Open Activator",
    },
    {
      number: 3,
      title: "Generate Pinterest pins",
      description: "Download 10 ready-to-post pins that send visitors to your page.",
      minutes: "~3 min",
      href: "/traffic",
      icon: Image,
      cta: "Generate traffic",
    },
  ];
}

export function getDashboardHowItWorksSteps(): HowItWorksStep[] {
  if (isFeatureEnabled("asset-activator") || isFeatureEnabled("money-page")) return nullPingSteps();
  if (isFeatureEnabled("blog-builder")) return blogBuilderSteps();
  if (isFeatureEnabled("core-workflow")) return coreWorkflowSteps();
  return defaultSteps();
}

export type DashboardStepStatus = "completed" | "current" | "upcoming";

function statusesFromCompleted(completed: boolean[]): DashboardStepStatus[] {
  const firstIncomplete = completed.findIndex((done) => !done);
  return completed.map((done, index) => {
    if (done) return "completed";
    if (index === firstIncomplete) return "current";
    return "upcoming";
  });
}

function blogBuilderStepStatuses(progress: number): DashboardStepStatus[] {
  return statusesFromCompleted([progress >= 1, progress >= 4, false]);
}

function coreWorkflowStepStatuses(progress: number): DashboardStepStatus[] {
  return statusesFromCompleted([progress >= 1, progress >= 3, progress >= 4]);
}

/** Maps workflow progress to per-card completed / current / upcoming states. */
export function getDashboardStepStatuses(progress: number): DashboardStepStatus[] {
  if (isFeatureEnabled("asset-activator") || isFeatureEnabled("money-page")) {
    return statusesFromCompleted([false, false, false]);
  }
  if (isFeatureEnabled("blog-builder")) return blogBuilderStepStatuses(progress);
  if (isFeatureEnabled("core-workflow")) return coreWorkflowStepStatuses(progress);
  return statusesFromCompleted([false, false, false]);
}

export function getDashboardQuickActions(): QuickAction[] {
  if (isFeatureEnabled("asset-activator")) {
    const actions: QuickAction[] = [
      {
        href: "/activate",
        title: "Activate Asset",
        description: "Paste a product URL and let NullPing build the money page",
        icon: Rocket,
        buttonText: "Activate now",
        accent: "gold",
      },
    ];

    if (isFeatureEnabled("money-links-vault")) {
      actions.push({
        href: "/link-vault",
        title: "Links Library",
        description: "Save affiliate URLs once and reuse them across assets",
        icon: Link2,
        buttonText: "Open library",
        accent: "pulse",
      });
    }

    if (isFeatureEnabled("traffic-pins")) {
      actions.push({
        href: "/traffic",
        title: "Generate Traffic",
        description: "Create Pinterest pins that send visitors to your money page",
        icon: Image,
        buttonText: "Generate pins",
        accent: "pulse",
      });
    }

    actions.push(
      {
        href: "/results",
        title: "Your Results",
        description: "Visitors, affiliate clicks, and live money pages",
        icon: Megaphone,
        buttonText: "Open results",
        accent: "ink",
      },
      {
        href: "/training",
        title: "Training Academy",
        description: "Video tutorials and step-by-step guides",
        icon: Brain,
        buttonText: "Watch training",
        accent: "pulse",
      }
    );

    return actions;
  }

  if (isFeatureEnabled("core-workflow")) {
    return [
      {
        href: "/search",
        title: "Step 1: Enter Topic",
        description: "Start with one niche or product angle",
        icon: Search,
        buttonText: "Start Search",
        accent: "gold",
      },
      {
        href: "/analysis",
        title: "Step 2: Check Demand",
        description: "See which keywords win in your niche",
        icon: Brain,
        buttonText: "Analyze",
        accent: "ink",
      },
      {
        href: "/radar",
        title: "Step 3: Find Ads",
        description: "Pick posts to reply to with your link",
        icon: Radar,
        buttonText: "Find Ads",
        accent: "pulse",
      },
    ];
  }

  return [
    {
      href: "/training",
      title: "Training Academy",
      description: "Learn the platform with video walkthroughs",
      icon: Rocket,
      buttonText: "Open Academy",
      accent: "gold",
    },
    {
      href: "/support",
      title: "Contact Support",
      description: "Get help from the support team",
      icon: MessageSquare,
      buttonText: "Get Help",
      accent: "ink",
    },
    {
      href: "/accelerator",
      title: "Premium Upgrades",
      description: "Unlock advanced tools and pre-made assets",
      icon: Megaphone,
      buttonText: "Explore",
      accent: "pulse",
    },
  ];
}
