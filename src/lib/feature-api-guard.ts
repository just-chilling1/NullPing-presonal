import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/config/features.config";

export function featureApiGuard(feature: Parameters<typeof isFeatureEnabled>[0]) {
  if (!isFeatureEnabled(feature)) {
    return NextResponse.json({ error: "Feature not enabled" }, { status: 404 });
  }
  return null;
}

/** Link vault is shared by blog-builder and the standalone Links Library module. */
export function linkVaultApiGuard() {
  if (isFeatureEnabled("blog-builder") || isFeatureEnabled("money-links-vault")) {
    return null;
  }
  return NextResponse.json({ error: "Feature not enabled" }, { status: 404 });
}
