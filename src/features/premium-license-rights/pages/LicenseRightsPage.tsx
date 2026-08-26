"use client";

import { LicenseRightsPanel } from "@/features/premium-license-rights/components/LicenseRightsPanel";
import { PremiumWorkflowShell } from "@/components/premium/PremiumWorkflowShell";
import { brand } from "@/config/brand.config";
import { getPremiumFeatureThumbnail } from "@/lib/video-thumbnails";

/** Standalone page kept for bookmarks; Account is the primary home. */
export default function LicenseRightsPage() {
  return (
    <PremiumWorkflowShell
      title="Reseller & License Rights"
      subtitle={`Request activation from support. Manage this from Account anytime — your ticket is filed as "License Rights".`}
      tip={
        <>
          Tip: Sell {brand.productName} under your own brand after activation — submit one request
          below.
        </>
      }
      training={{
        vimeoId: "",
        title: "Reseller & License Rights Training",
        description:
          "Learn how to request reseller activation, what support needs from you, and how to manage your license from Account.",
        iframeTitle: "Reseller & License Rights training video",
        thumbnailSrc: getPremiumFeatureThumbnail("premium-license-rights"),
      }}
    >
      <LicenseRightsPanel />
    </PremiumWorkflowShell>
  );
}
