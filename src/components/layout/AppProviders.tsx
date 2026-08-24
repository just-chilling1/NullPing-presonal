"use client";

import { usePathname } from "next/navigation";
import { isFeatureEnabled } from "@/config/features.config";
import { CoreWorkflowProvider } from "@/features/core-workflow/CoreWorkflowProvider";
import { BlogBuilderWorkflowProvider } from "@/features/blog-builder/context/BlogBuilderWorkflowProvider";
import { BlogWorkflowNavProvider } from "@/features/blog-builder/context/BlogWorkflowNavProvider";
import { needsBlogBuilderContext } from "@/lib/blog-builder-routes";
import { AuthHashRecoveryRedirect } from "@/components/auth/AuthHashRecoveryRedirect";
import { BrandStyleProvider } from "./BrandStyleProvider";
import { Shell } from "./Shell";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const content = (
    <BrandStyleProvider>
      <Shell>{children}</Shell>
    </BrandStyleProvider>
  );

  let tree = content;

  const linkVaultEnabled = isFeatureEnabled("money-links-vault");
  const blogEnabled = isFeatureEnabled("blog-builder");

  if (blogEnabled || linkVaultEnabled) {
    tree = needsBlogBuilderContext(pathname) ? (
      <BlogBuilderWorkflowProvider>{content}</BlogBuilderWorkflowProvider>
    ) : (
      content
    );
    if (blogEnabled) {
      tree = <BlogWorkflowNavProvider>{tree}</BlogWorkflowNavProvider>;
    }
  } else if (isFeatureEnabled("core-workflow")) {
    tree = <CoreWorkflowProvider>{content}</CoreWorkflowProvider>;
  }

  return (
    <>
      <AuthHashRecoveryRedirect />
      {tree}
    </>
  );
}
