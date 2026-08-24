import { brand } from "@/config/brand.config";

/** CSS custom properties derived from brand.config — inject via BrandStyleProvider */
export function getBrandCssVars(): Record<string, string> {
  return {
    "--np-canvas": brand.colors.page,
    "--np-surface": brand.colors.panel,
    "--np-surface-sub": brand.colors.sidebar,
    "--bg-page": brand.colors.page,
    "--bg-sidebar": brand.colors.sidebar,
    "--bg-panel": brand.colors.panel,
    "--bg-panel-glass": brand.colors.panelGlass,
    "--bg-border": brand.colors.border,
    "--bg-border-glow": brand.colors.borderGlow,
    "--bg-border-teal": brand.colors.borderTeal,
    "--bg-glass": brand.colors.panelGlass,
    "--brand-primary": brand.colors.primary,
    "--brand-primary-readable": brand.colors.secondary,
    "--brand-secondary": brand.colors.secondary,
    "--brand-tint": "#0A1020",
    "--promo-accent": brand.colors.promoAccent,
    "--promo-cta": brand.colors.promoCta,
    "--text-heading": brand.colors.textHeading,
    "--text-primary": brand.colors.textPrimary,
    "--text-muted": brand.colors.textMuted,
    "--sidebar-gap": "2rem",
    "--mobile-header-h": "3.5rem",
  };
}

export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    // Prefer the live browser origin so password-reset emails match the site the user is on.
    return window.location.origin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}
