"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Link2,
  LogOut,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { brand } from "@/config/brand.config";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  getVisibleWorkflowSteps,
  getCoreResourceNav,
  getVisibleResourceNav,
  getVisibleLibrariesNav,
  isNavItemLocked,
} from "@/lib/features";
import { PREMIUM_FEATURES } from "@/lib/premium-features";
import { PremiumFeatureNavList } from "@/components/dashboard/PremiumFeatureNavList";
import { ExclusiveOffersNavSection } from "@/components/layout/ExclusiveOffersNavSection";
import { getNavIcon } from "@/lib/nav-icons";
import { isNavPathActive } from "@/lib/nav-active";
import { isFeatureEnabled } from "@/config/features.config";
import { useWorkflowNav } from "@/context/WorkflowNavContext";
import { BlogBuilderNav } from "@/features/blog-builder/components/BlogBuilderNav";
import { storageKeys } from "@/lib/storage-keys";
import { homeNav, homeSectionLabel, generateSectionLabel, trainingSectionLabel, blogBuilderLibrariesSectionLabel, type NavItem } from "@/config/navigation.config";
import { usePromoLinks } from "@/context/PromoLinksContext";
import { getVisibleExclusiveOffers } from "@/lib/promo-links";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { getCachedClientUser } from "@/lib/auth-client-cache";
import { WarmNavLink } from "@/components/layout/WarmNavLink";
import {
  sidebarNavIconClass,
  sidebarNavItemClass,
  sidebarNavLabelClass,
  sidebarSectionLabelClass,
} from "./sidebar-nav-styles";

interface SidebarContentProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}

function SidebarContent({ collapsed, onToggle, onMobileClose }: SidebarContentProps) {
  const pathname = usePathname();
  const workflowSteps = getVisibleWorkflowSteps();
  const coreResourceNav = getCoreResourceNav();
  const resourceNav = getVisibleResourceNav();
  const workflow = useWorkflowNav();
  const workflowProgress = workflow?.progress ?? 0;
  const blogEnabled = isFeatureEnabled("blog-builder");
  const showHomeNav = !workflowSteps.some((step) => step.path === homeNav.path);
  const { settings: promoSettings } = usePromoLinks();
  const exclusiveOffers = getVisibleExclusiveOffers(promoSettings);

  const [displayName, setDisplayName] = useState("Member");
  const [userInitials, setUserInitials] = useState("NP");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void getCachedClientUser().then((user) => {
      if (!user) return;
      const handle = user.email?.split("@")[0] || "Member";
      const name =
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        handle.charAt(0).toUpperCase() + handle.slice(1);
      setDisplayName(name);
      setUserInitials(name.substring(0, 2).toUpperCase());
      setIsAdmin(isAdminUser(user));
    });
  }, []);

  const handleLogout = async () => {
    onMobileClose?.();
    try {
      await workflow.resetSession();
    } catch (err) {
      console.error("[logout] session reset failed", err);
    }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleNavClick = () => onMobileClose?.();

  const renderSectionLabel = (label: string) =>
    collapsed ? null : (
      <p className={sidebarSectionLabelClass} suppressHydrationWarning>
        {label}
      </p>
    );

  const renderNavLink = (item: NavItem) => {
    const isActive = isNavPathActive(pathname, item.path);
    const Icon = getNavIcon(item.icon);
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
        onClick={handleNavClick}
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

  const trainingItems = [...coreResourceNav, ...resourceNav];
  const librariesItems = getVisibleLibrariesNav();
  const showGenerateFromBlog =
    blogEnabled &&
    !workflowSteps.some((step) => step.path === "/activate" || step.path === "/traffic" || step.path === "/results");

  return (
    <div className="sidebar-panel flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className={clsx("sidebar-header shrink-0", collapsed ? "p-3" : "px-3 py-3.5")}>
        <div className={clsx("flex w-full items-center", collapsed ? "flex-col gap-3" : "gap-1.5")}>
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className={clsx(
              "rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--np-pulse-500)]",
              collapsed ? "flex w-full justify-center" : "min-w-0 flex-1 overflow-hidden"
            )}
            title={brand.productName}
          >
            <BrandLogo size="sidebar" showTagline={false} compact={collapsed} className="w-full" />
          </Link>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            suppressHydrationWarning
            className={clsx("sidebar-collapse-btn", !collapsed && "ml-auto")}
          >
            {collapsed ? <PanelLeftOpen size={15} strokeWidth={1.75} /> : <PanelLeftClose size={15} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <nav aria-label="Main navigation" className="px-3 py-3">
          <div className="space-y-1">
            {showHomeNav ? (
              <>
                {renderSectionLabel(homeSectionLabel)}
                {renderNavLink(homeNav)}
              </>
            ) : null}

            {workflowSteps.length > 0 ? (
              <>
                {renderSectionLabel(generateSectionLabel)}
                {workflowSteps.map((step) => renderNavLink(step))}
              </>
            ) : null}

            {showGenerateFromBlog ? (
              <BlogBuilderNav
                pathname={pathname}
                onNavClick={handleNavClick}
                collapsed={collapsed}
                sections={["workflow", "generate"]}
              />
            ) : null}

            {librariesItems.length > 0 ? (
              <>
                {renderSectionLabel(blogBuilderLibrariesSectionLabel)}
                {librariesItems.map((step) => renderNavLink(step))}
              </>
            ) : blogEnabled && librariesItems.length === 0 ? (
              <BlogBuilderNav
                pathname={pathname}
                onNavClick={handleNavClick}
                collapsed={collapsed}
                sections={["libraries"]}
              />
            ) : null}

            {trainingItems.length > 0 ? (
              <>
                {renderSectionLabel(trainingSectionLabel)}
                {trainingItems.map((step) => renderNavLink(step))}
              </>
            ) : null}
          </div>

          {PREMIUM_FEATURES.length > 0 ? (
            <PremiumFeatureNavList collapsed={collapsed} onNavigate={handleNavClick} highlighted />
          ) : null}

          <ExclusiveOffersNavSection offers={exclusiveOffers} collapsed={collapsed} />
        </nav>
      </div>

      <div className={clsx("sidebar-footer shrink-0 space-y-2 p-3", collapsed && "px-2")}>
        {isAdmin ? (
          <WarmNavLink
            href="/admin"
            onClick={handleNavClick}
            className={sidebarNavItemClass(isNavPathActive(pathname, "/admin"), collapsed)}
            title="Promo Links"
          >
            <Link2
              className={sidebarNavIconClass(isNavPathActive(pathname, "/admin"))}
              strokeWidth={1.75}
              aria-hidden
            />
            {!collapsed && (
              <span className={sidebarNavLabelClass(isNavPathActive(pathname, "/admin"))}>
                Promo Links
              </span>
            )}
          </WarmNavLink>
        ) : null}

        <div className={clsx("sidebar-user-card", collapsed && "flex-col justify-center gap-2 px-1.5 py-2")}>
          <Link
            href="/account"
            onClick={handleNavClick}
            className={clsx(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-pulse-700",
              collapsed && "justify-center"
            )}
            title="Account"
          >
            <div className="sidebar-user-avatar" aria-hidden>
              {userInitials}
            </div>
            {!collapsed && (
              <div className="sidebar-user-meta">
                <div className="sidebar-user-name">{displayName}</div>
                <div className="sidebar-user-status">
                  <span className="sidebar-user-status-dot" aria-hidden />
                  Active Member
                </div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="sidebar-sign-out"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(storageKeys.sidebarCollapsed) === "1";
}

function applySidebarLayout(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  document.documentElement.style.setProperty("--sidebar-w", collapsed ? "76px" : "280px");
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = readSidebarCollapsed();
    setCollapsed(stored);
    applySidebarLayout(stored);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKeys.sidebarCollapsed, next ? "1" : "0");
      applySidebarLayout(next);
      return next;
    });
  };

  return (
    <aside
      className="sidebar-shell fixed left-0 top-0 z-50 hidden h-dvh transition-[width] duration-300 lg:flex"
      style={{ width: "var(--sidebar-w)" }}
    >
      <SidebarContent collapsed={collapsed} onToggle={toggleCollapse} />
    </aside>
  );
}
