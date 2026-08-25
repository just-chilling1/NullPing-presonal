"use client";

import { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { support } from "@/config/support.config";

export function SupportPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Help" title={support.pageTitle} subtitle={support.pageSubtitle} />
      {children}
    </div>
  );
}
