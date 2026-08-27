"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { PageMotion } from "@/components/motion/PageMotion";
import { SupportCtaBanner } from "@/components/support/SupportCtaBanner";
import { hasEnabledPromoOrchestrator } from "@/config/promos.config";

const PromoOrchestrator = dynamic(
  () => import("./PromoOrchestrator").then((m) => ({ default: m.PromoOrchestrator })),
  { ssr: false }
);

const SpecialistWelcomePopupHost = dynamic(
  () =>
    import("@/components/specialist-welcome-popup-host").then((m) => ({
      default: m.SpecialistWelcomePopupHost,
    })),
  { ssr: false }
);

/** Route prefixes that render without the app shell (public hosted pages). */
const PUBLIC_SHELL_BYPASS_PREFIXES = ["/sites/", "/s/", "/m/", "/article/", "/review/"];

/** Clean member URLs: /{handle}/sites/{slug} — must not render inside the logged-in shell. */
function isMemberPublicSitePath(pathname: string): boolean {
  return /^\/[^/]+\/sites(\/|$)/.test(pathname);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname.startsWith("/auth/");

  const isPublicPage =
    PUBLIC_SHELL_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    isMemberPublicSitePath(pathname);

  const hideSupportBanner =
    pathname === "/support" ||
    pathname.startsWith("/support/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-bg flex min-h-dvh min-w-0 overflow-x-clip">
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <main className="app-main-canvas relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto scroll-smooth px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] transition-[padding] duration-300 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="app-content-layer flex min-h-full w-full min-w-0 flex-col gap-6">
            <PageMotion>{children}</PageMotion>
            {!hideSupportBanner ? <SupportCtaBanner className="mt-2" /> : null}
          </div>
        </main>
      </div>

      <SpecialistWelcomePopupHost />
      {hasEnabledPromoOrchestrator() ? <PromoOrchestrator /> : null}
    </div>
  );
}
