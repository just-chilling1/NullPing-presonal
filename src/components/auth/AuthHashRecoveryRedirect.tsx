"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Supabase may redirect to Site URL root with tokens in the hash — forward to /reset-password. */
export function AuthHashRecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/reset-password") return;

    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const type = hashParams.get("type");
    const hasRecoveryToken =
      hashParams.get("access_token") ||
      (hashParams.get("error") &&
        (hash.includes("otp_expired") ||
          hash.includes("access_denied") ||
          hash.includes("recovery")));

    if (!hasRecoveryToken) return;

    if (type === "recovery" || hash.includes("recovery") || hashParams.get("error")) {
      router.replace(`/reset-password${hash}`);
    }
  }, [pathname, router]);

  return null;
}
