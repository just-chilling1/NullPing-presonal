"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { support } from "@/config/support.config";

export function SupportChannelCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:max-w-md">
      <Link href={support.contactUrl} className="group">
        <div className="card-base flex h-full items-center gap-4 transition-colors hover:border-success/30 hover:bg-success/5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-success/20 bg-success/10 transition-colors group-hover:bg-success/15">
            <Mail className="h-6 w-6 text-success" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="ds-h4 mb-0.5">Send a message</h3>
            <p className="truncate text-sm text-text-muted">
              Open the contact form — no email app needed
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
