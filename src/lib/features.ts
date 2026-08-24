import { isFeatureEnabled } from "@/config/features.config";
import {
  homeNav,
  workflowSteps,
  extractionWorkflowSteps,
  blogBuilderWorkflowSteps,
  blogBuilderGenerateNav,
  blogBuilderLibrariesNav,
  librariesNav,
  coreResourceNav,
  resourceNav,
  premiumNav,
  bottomNavTabs,
  bottomNavMoreLinks,
  type NavItem,
} from "@/config/navigation.config";

function filterNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.feature || isFeatureEnabled(item.feature));
}

export function getVisibleWorkflowSteps(): NavItem[] {
  if (isFeatureEnabled("asset-activator") || isFeatureEnabled("money-page")) {
    return filterNav(workflowSteps);
  }
  if (isFeatureEnabled("extraction-workflow")) {
    return filterNav(extractionWorkflowSteps);
  }
  if (isFeatureEnabled("core-workflow")) {
    return filterNav(workflowSteps);
  }
  return [];
}

export function getBlogBuilderWorkflowSteps(): NavItem[] {
  return filterNav(blogBuilderWorkflowSteps);
}

export function getBlogBuilderGenerateNav(): NavItem[] {
  return filterNav(blogBuilderGenerateNav);
}

export function getBlogBuilderLibrariesNav(): NavItem[] {
  return filterNav(blogBuilderLibrariesNav);
}

export function getVisibleLibrariesNav(): NavItem[] {
  return filterNav(librariesNav);
}

export function getCoreResourceNav(): NavItem[] {
  return filterNav(coreResourceNav);
}

export function getVisibleResourceNav(): NavItem[] {
  return filterNav(resourceNav);
}

export function getVisiblePremiumNav(): NavItem[] {
  return filterNav(premiumNav);
}

export function getBottomNavTabs(): NavItem[] {
  const tabs = filterNav(bottomNavTabs);
  if (tabs.length >= 2) return tabs.slice(0, 4);
  return [homeNav, ...filterNav(coreResourceNav)].slice(0, 4);
}

export function getBottomNavMoreLinks(): NavItem[] {
  const tabPaths = new Set(getBottomNavTabs().map((t) => t.path));
  const premiumPaths = new Set(getVisiblePremiumNav().map((t) => t.path));

  const candidates: NavItem[] = [
    ...workflowSteps,
    ...blogBuilderGenerateNav,
    ...blogBuilderLibrariesNav,
    ...librariesNav,
    ...coreResourceNav,
    ...resourceNav,
    ...bottomNavMoreLinks,
  ];

  const seen = new Set<string>();
  return filterNav(candidates).filter((item) => {
    if (tabPaths.has(item.path) || premiumPaths.has(item.path)) return false;
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

export function isNavItemLocked(
  item: NavItem,
  workflowProgress: number
): boolean {
  if (!item.requiresWorkflowStep) return false;
  return workflowProgress < item.requiresWorkflowStep;
}

export function getWorkflowProgress(
  pathname: string,
  hasVariations: boolean,
  hasAnalysis: boolean,
  hasSelectedAds: boolean
): number {
  if (pathname === "/replies" && hasSelectedAds) return 4;
  if (pathname === "/radar" || hasSelectedAds) return 3;
  if (pathname === "/analysis" || hasAnalysis) return 2;
  if (pathname === "/search" || hasVariations) return 1;
  return 0;
}
