import type { FeatureId } from "./features.config";

export type NavIconName =
  | "LayoutGrid"
  | "Search"
  | "Brain"
  | "Radar"
  | "MessageSquare"
  | "GraduationCap"
  | "TrendingUp"
  | "Scan"
  | "Sparkles"
  | "Rocket"
  | "Headphones"
  | "Wifi"
  | "Activity"
  | "Wallet"
  | "Globe"
  | "Link2"
  | "FileText"
  | "MapPin"
  | "ShieldCheck"
  | "Repeat"
  | "Megaphone"
  | "Image"
  | "PenLine"
  | "FolderOpen"
  | "Send"
  | "Calculator"
  | "Users"
  | "Zap"
  | "Infinity";

export interface NavItem {
  path: string;
  label: string;
  icon: NavIconName;
  feature?: FeatureId;
  /** Workflow step index for progress bar; omit for non-workflow items */
  workflowStep?: number;
  /** Requires prior workflow steps to be complete */
  requiresWorkflowStep?: number;
}

export const homeNav: NavItem = {
  path: "/dashboard",
  label: "Dashboard",
  icon: "LayoutGrid",
};

export const workflowSteps: NavItem[] = [
  { path: "/activate", label: "Activate Asset", icon: "Zap", feature: "asset-activator", workflowStep: 1 },
  { path: "/traffic", label: "Generate Traffic", icon: "Image", feature: "traffic-pins", workflowStep: 2 },
  { path: "/results", label: "Results", icon: "Activity", feature: "results", workflowStep: 3 },
];

/** Extraction workflow home (connect → scan dashboard) */
export const extractionWorkflowSteps: NavItem[] = [
  { path: "/dashboard", label: "Home", icon: "LayoutGrid", feature: "extraction-workflow", workflowStep: 1 },
];

/** Single-page sales offer generator (all wizard steps) */
export const blogBuilderWorkflowSteps: NavItem[] = [
  { path: "/activate", label: "Activate Asset", icon: "Zap", feature: "asset-activator" },
];

/** Generate tools */
export const blogBuilderGenerateNav: NavItem[] = [
  { path: "/activate", label: "Activate Asset", icon: "Zap", feature: "asset-activator" },
  { path: "/traffic", label: "Generate Traffic", icon: "Image", feature: "traffic-pins" },
  { path: "/results", label: "Results", icon: "Activity", feature: "results" },
];

export const blogBuilderLibrariesNav: NavItem[] = [
  { path: "/link-vault", label: "Links Library", icon: "Link2", feature: "money-links-vault" },
];

/** Standalone libraries section (NullPing + blog-builder). */
export const librariesNav: NavItem[] = blogBuilderLibrariesNav;

/** @deprecated Use blogBuilderGenerateNav and blogBuilderLibrariesNav */
export const blogBuilderCoreNav: NavItem[] = [
  ...blogBuilderGenerateNav,
  ...blogBuilderLibrariesNav,
];

/** @deprecated Use blogBuilderGenerateNav and blogBuilderLibrariesNav */
export const blogBuilderResourceNav: NavItem[] = blogBuilderCoreNav;

export const blogBuilderGenerateSectionLabel = "Generate";
export const blogBuilderLibrariesSectionLabel = "Libraries";

/** Primary sidebar section labels (NullPing layout) */
export const homeSectionLabel = "Home";
export const generateSectionLabel = "Generate";
export const trainingSectionLabel = "Training";

/** Footer support link — rendered above account in the sidebar */
export const supportNav: NavItem = {
  path: "/support",
  label: "Support",
  icon: "Headphones",
};

/** Core sidebar resources — academy is feature-gated */
export const coreResourceNav: NavItem[] = [
  { path: "/training", label: "Academy", icon: "GraduationCap", feature: "training" },
];

export const resourceNav: NavItem[] = [
  { path: "/scale-training", label: "Scale Training", icon: "TrendingUp", feature: "scale-upsell" },
];

/** Legacy upgrade nav — prefer premiumNav for new products */
export const upgradeNav: NavItem[] = [
  { path: "/dfy", label: "Done-For-You", icon: "Scan", feature: "premium-dfy" },
  { path: "/instant", label: "Instant Income", icon: "Sparkles", feature: "premium-instant" },
  { path: "/autopilot", label: "Automated Profits", icon: "Rocket", feature: "premium-autopilot" },
];

/** Premium section — single source for sidebar, bottom nav, dashboard widget */
export const premiumNav: NavItem[] = [
  { path: "/accelerator", label: "Unlimited", icon: "Infinity", feature: "premium-accelerator" },
  { path: "/dfy-profit", label: "Done-For-You Profit", icon: "Wallet", feature: "premium-dfy-profit" },
  { path: "/social-payouts", label: "Instant Income", icon: "Megaphone", feature: "premium-social" },
  { path: "/autopilot", label: "Automated Profits", icon: "Rocket", feature: "premium-autopilot" },
  { path: "/recurring-wealth", label: "Guaranteed High-Ticket Payouts", icon: "Repeat", feature: "premium-recurring" },
  { path: "/protector", label: "Cyber Protection", icon: "ShieldCheck", feature: "protector" },
  { path: "/account#license", label: "Reseller & License Rights", icon: "FileText", feature: "premium-license-rights" },
];

export const premiumSectionLabel = "Premium Features";

/** Primary mobile bottom tabs — first 4 visible tabs + "More" */
export const bottomNavTabs: NavItem[] = [
  homeNav,
  { path: "/activate", label: "Activate", icon: "Zap", feature: "asset-activator" },
  { path: "/traffic", label: "Traffic", icon: "Image", feature: "traffic-pins" },
  { path: "/results", label: "Results", icon: "Activity", feature: "results" },
];

/** Extra links for mobile "More" sheet — workflow, generate, libraries, and resources are merged in getBottomNavMoreLinks() */
export const bottomNavMoreLinks: NavItem[] = [];
