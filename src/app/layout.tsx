import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { brand } from "@/config/brand.config";
import { getBrandCssVars } from "@/lib/brand-vars";
import { storageKeys } from "@/lib/storage-keys";
import { AppProviders } from "@/components/layout/AppProviders";

const brandStyle = getBrandCssVars();

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.metadata.title,
  description: brand.metadata.description,
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/logo-icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/logo-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand.productName,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: brand.colors.sidebar,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${spaceGrotesk.variable}`}
      style={{ ...brandStyle, colorScheme: "dark" }}
    >
      <head>
        <Script
          id="sidebar-collapse-restore"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k=${JSON.stringify(storageKeys.sidebarCollapsed)};if(localStorage.getItem(k)==='1'){document.documentElement.dataset.sidebar='collapsed';document.documentElement.style.setProperty('--sidebar-w','76px');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="text-text-primary selection:bg-pulse-200 antialiased"
        style={{ backgroundColor: brand.colors.page }}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
