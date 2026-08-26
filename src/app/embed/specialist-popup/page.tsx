"use client";

import { Suspense, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SpecialistWelcomePopup } from "@/components/ui/specialist-welcome-popup";

function EmbedInner() {
  const searchParams = useSearchParams();
  const previewParam = searchParams.get("preview");
  const preview = process.env.NODE_ENV === "development" && previewParam === "1";

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  const notifyParent = useCallback((open: boolean) => {
    try {
      window.parent?.postMessage({ type: "bb-specialist-popup", open }, "*");
    } catch {
      // host page may block messaging
    }
  }, []);

  // Production embed: no forceOpen — popup calls /api/eligibility/specialist-popup
  // (US/CA GeoIP + Mon–Fri 08:30–17:30 PT) before posting open:true to the parent.
  // Local QA: /embed/specialist-popup?preview=1 or /dev/specialist-popup.
  if (preview) {
    return <SpecialistWelcomePopup forceOpen onOpenChange={notifyParent} />;
  }

  return <SpecialistWelcomePopup onOpenChange={notifyParent} />;
}

export default function SpecialistPopupEmbedPage() {
  return (
    <Suspense fallback={null}>
      <EmbedInner />
    </Suspense>
  );
}
