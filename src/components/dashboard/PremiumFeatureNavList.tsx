"use client";

import { WarmNavLink } from "@/components/layout/WarmNavLink";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { PREMIUM_FEATURES, PREMIUM_SECTION_LABEL } from "@/lib/premium-features";
import { isNavPathActive } from "@/lib/nav-active";

interface PremiumFeatureNavListProps {
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  className?: string;
  highlighted?: boolean;
}

function sectionClassName(
  collapsed: boolean,
  mobile: boolean,
  highlighted: boolean,
  className?: string
) {
  return clsx(
    "premium-nav-section",
    highlighted && !collapsed && "premium-nav-section--highlighted",
    collapsed && !mobile && "premium-nav-section--collapsed",
    mobile ? "p-2.5" : collapsed ? "mt-4 p-0" : "mt-6 p-3",
    className
  );
}

export function PremiumFeatureNavList({
  collapsed = false,
  mobile = false,
  onNavigate,
  className,
  highlighted = true,
}: PremiumFeatureNavListProps) {
  const pathname = usePathname();

  if (PREMIUM_FEATURES.length === 0) return null;

  const outerClass = sectionClassName(collapsed, mobile, highlighted, className);

  const itemClass = (isActive: boolean) =>
    clsx(
      "premium-sidebar-item group flex items-center gap-3 rounded-md font-normal transition-[background-color,border-color,box-shadow,color] duration-[160ms]",
      mobile
        ? "min-h-[52px] px-4 py-3 text-[15px]"
        : "min-h-[44px] py-2.5 text-[15px]",
      collapsed && !mobile ? "justify-center px-0" : mobile ? "" : "px-2.5",
      isActive && "is-active"
    );

  return (
    <div className={outerClass}>
      {!collapsed && <div className="premium-nav-section-shimmer" aria-hidden />}

      {!collapsed && (
        <p
          className={clsx(
            "premium-nav-section-label relative z-[1] flex items-center gap-2 px-2 pb-2.5 pt-1",
            highlighted && "premium-nav-section-label--animated",
            mobile && "mb-0 px-1.5 pt-0.5"
          )}
        >
          <span className="premium-nav-sparkle-badge">
            <Sparkles className="h-4 w-4 text-pulse-500" strokeWidth={1.75} />
          </span>
          {PREMIUM_SECTION_LABEL}
        </p>
      )}

      <ul className={clsx("relative z-[1]", mobile ? "space-y-2" : "space-y-1.5")}>
        {PREMIUM_FEATURES.map((item) => {
          const isActive = isNavPathActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <WarmNavLink
                href={item.href}
                onClick={onNavigate}
                title={collapsed && !mobile ? item.label : undefined}
                className={itemClass(isActive)}
              >
                <span className="premium-sidebar-icon-chip">
                  <Icon
                    className={mobile ? "h-4 w-4" : "h-[18px] w-[18px]"}
                    strokeWidth={1.75}
                  />
                </span>
                {!collapsed && <span className="tracking-normal">{item.label}</span>}
              </WarmNavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
