import { FeatureGuard } from "@/components/layout/FeatureGuard";
import { loadFeaturePage } from "@/lib/load-feature-page";

const LinkVaultPage = loadFeaturePage(
  () => import("@/features/blog-builder/pages/LinkVaultPage"),
  "Loading Links Library..."
);

export default function Page() {
  return (
    <FeatureGuard feature="money-links-vault">
      <LinkVaultPage />
    </FeatureGuard>
  );
}
