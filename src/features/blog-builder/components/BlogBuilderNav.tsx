"use client";

import { clsx } from "clsx";
import { Lock } from "lucide-react";
import { WarmNavLink } from "@/components/layout/WarmNavLink";
import {
  getBlogBuilderWorkflowSteps,
  getBlogBuilderGenerateNav,
  getBlogBuilderLibrariesNav,
  isNavItemLocked,
} from "@/lib/features";
import {
  blogBuilderGenerateSectionLabel,
  blogBuilderLibrariesSectionLabel,
} from "@/config/navigation.config";
import { getNavIcon } from "@/lib/nav-icons";
import { isNavPathActive } from "@/lib/nav-active";
import { isFeatureEnabled } from "@/config/features.config";
import { useWorkflowNav } from "@/context/WorkflowNavContext";
import {
  sidebarNavIconClass,
  sidebarNavItemClass,
  sidebarNavLabelClass,
  sidebarSectionLabelClass,
} from "@/components/layout/sidebar-nav-styles";

interface BlogBuilderNavProps {
  pathname: string;
  onNavClick?: () => void;
  collapsed?: boolean;
  /** Which sidebar blocks to render — default all */
  sections?: Array<"workflow" | "generate" | "libraries">;
}

export function BlogBuilderNav({
  pathname,
  onNavClick,
  collapsed = false,
  sections = ["workflow", "generate", "libraries"],
}: BlogBuilderNavProps) {
  if (!isFeatureEnabled("blog-builder") && !isFeatureEnabled("money-links-vault")) return null;

  const steps = getBlogBuilderWorkflowSteps();
  const generateNav = getBlogBuilderGenerateNav();
  const librariesNav = getBlogBuilderLibrariesNav();
  const workflow = useWorkflowNav();
  const workflowProgress = workflow?.progress ?? 0;

  const renderStep = (item: (typeof steps)[0]) => {
    const Icon = getNavIcon(item.icon);
    const isActive = isNavPathActive(pathname, item.path);
    const locked = isNavItemLocked(item, workflowProgress);

    if (locked) {
      return (
        <div
          key={item.path}
          className={clsx(
            "sidebar-nav-item is-locked flex items-center gap-3 px-3 py-2.5 cursor-not-allowed",
            collapsed && "justify-center px-2"
          )}
          title="Complete the previous step first"
          aria-disabled="true"
        >
          <Lock size={16} className="text-ink-5 shrink-0" strokeWidth={1.75} />
          {!collapsed && (
            <span className="sidebar-nav-label text-ink-5">
              {item.label}
            </span>
          )}
        </div>
      );
    }

    return (
      <WarmNavLink
        key={item.path}
        href={item.path}
        onClick={onNavClick}
        title={collapsed ? item.label : undefined}
        className="block group"
      >
        <div className={sidebarNavItemClass(isActive, collapsed)}>
          <Icon className={sidebarNavIconClass(isActive)} size={18} strokeWidth={1.75} />
          {!collapsed && <span className={sidebarNavLabelClass(isActive)}>{item.label}</span>}
        </div>
      </WarmNavLink>
    );
  };

  const renderCoreLink = (item: (typeof generateNav)[0]) => {
    const Icon = getNavIcon(item.icon);
    const isActive = isNavPathActive(pathname, item.path);

    return (
      <WarmNavLink
        key={item.path}
        href={item.path}
        onClick={onNavClick}
        title={collapsed ? item.label : undefined}
        className="block group"
      >
        <div className={sidebarNavItemClass(isActive, collapsed)}>
          <Icon className={sidebarNavIconClass(isActive)} size={18} strokeWidth={1.75} />
          {!collapsed && <span className={sidebarNavLabelClass(isActive)}>{item.label}</span>}
        </div>
      </WarmNavLink>
    );
  };

  const sectionLabelClass = sidebarSectionLabelClass;
  const showWorkflow = sections.includes("workflow");
  const showGenerate = sections.includes("generate");
  const showLibraries = sections.includes("libraries");

  return (
    <>
      {((showWorkflow && steps.length > 0) || (showGenerate && generateNav.length > 0)) && (
        <>
          {!collapsed && (
            <p className={sectionLabelClass} suppressHydrationWarning>
              {blogBuilderGenerateSectionLabel}
            </p>
          )}
          {showWorkflow ? steps.map(renderStep) : null}
          {showGenerate ? generateNav.map(renderCoreLink) : null}
        </>
      )}
      {showLibraries && librariesNav.length > 0 && (
        <>
          {!collapsed && (
            <p className={sectionLabelClass} suppressHydrationWarning>
              {blogBuilderLibrariesSectionLabel}
            </p>
          )}
          {librariesNav.map(renderCoreLink)}
        </>
      )}
    </>
  );
}
