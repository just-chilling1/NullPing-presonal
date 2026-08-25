import { loadFeaturePage } from "@/lib/load-feature-page";

const SupportContactPage = loadFeaturePage(
  () => import("@/features/support/pages/SupportContactPage"),
  "Loading Contact..."
);

export default function Page() {
  return <SupportContactPage />;
}
