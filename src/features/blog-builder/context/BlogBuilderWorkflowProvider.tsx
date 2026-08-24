"use client";

import { isFeatureEnabled } from "@/config/features.config";
import { WorkflowNavProvider } from "@/context/WorkflowNavContext";
import { BlogBuilderProvider, useBlogBuilder } from "./BlogBuilderContext";

function WorkflowNavBridgeInner({ children }: { children: React.ReactNode }) {
  const { blogProgress, resetWizard } = useBlogBuilder();

  return (
    <WorkflowNavProvider value={{ progress: blogProgress, resetSession: resetWizard }}>
      {children}
    </WorkflowNavProvider>
  );
}

export function BlogBuilderWorkflowProvider({ children }: { children: React.ReactNode }) {
  const blogEnabled = isFeatureEnabled("blog-builder");
  const linkVaultEnabled = isFeatureEnabled("money-links-vault");

  if (!blogEnabled && !linkVaultEnabled) {
    return <>{children}</>;
  }

  if (blogEnabled) {
    return (
      <BlogBuilderProvider>
        <WorkflowNavBridgeInner>{children}</WorkflowNavBridgeInner>
      </BlogBuilderProvider>
    );
  }

  return <BlogBuilderProvider>{children}</BlogBuilderProvider>;
}
